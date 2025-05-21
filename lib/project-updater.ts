// lib/project-updater.ts
import supabase from './supabase';
import { fetchGitHubRepository, fetchRepositoryLanguages } from './github-api';

/**
 * Rate limit state information
 */
interface RateLimitState {
  remaining: number;    // Remaining API requests
  reset: number;        // Unix timestamp when the rate limit resets
  lastChecked: number;  // When we last checked the rate limit
}

// Global rate limit state
let rateLimitState: RateLimitState = {
  remaining: 60,  // Default to full quota
  reset: 0,       // Not set yet
  lastChecked: 0  // Not checked yet
};

/**
 * Project update queue
 */
interface UpdateQueue {
  isProcessing: boolean;
  lastRun: number;      // Unix timestamp
  currentBatchSize: number;
}

// Global update queue state
const updateQueue: UpdateQueue = {
  isProcessing: false,
  lastRun: 0,
  currentBatchSize: 5
};

/**
 * Processes a batch of project updates while respecting GitHub's rate limit
 * @param batchSize Number of projects to update in one batch
 */
export async function processProjectUpdates(batchSize = 5): Promise<{
  processedCount: number;
  success: boolean;
  rateLimitRemaining: number;
  nextReset: Date | null;
}> {
  // Prevent concurrent processing
  if (updateQueue.isProcessing) {
    return {
      processedCount: 0,
      success: false,
      rateLimitRemaining: rateLimitState.remaining,
      nextReset: rateLimitState.reset ? new Date(rateLimitState.reset * 1000) : null
    };
  }

  updateQueue.isProcessing = true;
  updateQueue.currentBatchSize = batchSize;
  let processedCount = 0;

  try {
    // Check rate limit status
    if (rateLimitState.remaining <= 1) { // Need at least 2 requests (repo + languages)
      const now = Math.floor(Date.now() / 1000);
      
      // If reset time is in the future, we need to wait
      if (rateLimitState.reset > now) {
        console.log(`Rate limit reached. Will reset at ${new Date(rateLimitState.reset * 1000).toISOString()}`);
        updateQueue.isProcessing = false;
        return {
          processedCount: 0,
          success: false,
          rateLimitRemaining: rateLimitState.remaining,
          nextReset: new Date(rateLimitState.reset * 1000)
        };
      }
      
      // Reset time has passed, we can reset our counter
      rateLimitState.remaining = 60;
    }

    // Calculate the cutoff time for projects to update (24 hours ago)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get projects that need updating
    const { data: projectsToUpdate, error } = await supabase
      .from('projects')
      .select('name, url, last_updated')
      .or(`last_updated.is.null,last_updated.lt.${yesterday.toISOString()}`)
      .order('last_updated', { ascending: true, nullsFirst: true })
      .limit(Math.min(batchSize, 10)); // Cap at 10 to prevent too many updates at once

    if (error) {
      console.error("Error fetching projects to update:", error);
      updateQueue.isProcessing = false;
      return {
        processedCount: 0,
        success: false,
        rateLimitRemaining: rateLimitState.remaining,
        nextReset: rateLimitState.reset ? new Date(rateLimitState.reset * 1000) : null
      };
    }

    if (!projectsToUpdate || projectsToUpdate.length === 0) {
      console.log("No projects need updating at this time");
      updateQueue.isProcessing = false;
      return {
        processedCount: 0,
        success: true,
        rateLimitRemaining: rateLimitState.remaining,
        nextReset: rateLimitState.reset ? new Date(rateLimitState.reset * 1000) : null
      };
    }

    console.log(`Processing updates for ${projectsToUpdate.length} projects`);
    
    // Process each project in the batch
    for (const project of projectsToUpdate) {
      // Ensure we have enough API requests left (need at least 2 per project)
      if (rateLimitState.remaining <= 1) {
        console.log("Rate limit nearly exhausted, stopping batch processing");
        break;
      }
      
      try {
        // Track this update attempt
        await supabase
          .from('project_updates')
          .upsert({
            project_name: project.name,
            status: 'in_progress',
            last_attempted: new Date().toISOString()
          }, { 
            onConflict: 'project_name' 
          });
        
        // Fetch repository data from GitHub
        const repoData = await fetchGitHubRepository(project.url);
        
        if (!repoData) {
          // Update status to failed
          await supabase
            .from('project_updates')
            .update({
              status: 'failed',
              error: 'Failed to fetch repository data'
            })
            .eq('project_name', project.name);
            
          continue;
        }
        
        // Update rate limit info if present in response
        if (repoData._rateLimit) {
          rateLimitState.remaining = repoData._rateLimit.remaining;
          rateLimitState.reset = repoData._rateLimit.reset;
          rateLimitState.lastChecked = Math.floor(Date.now() / 1000);
        } else {
          // If not present, decrement manually
          rateLimitState.remaining = Math.max(0, rateLimitState.remaining - 1);
        }
        
        // Fetch languages (another API request)
        let languages = {};
        if (repoData.languages_url) {
          const langData = await fetchRepositoryLanguages(repoData.languages_url);
          languages = langData;
          
          // Update rate limit from languages response if available
          if (langData._rateLimit) {
            rateLimitState.remaining = langData._rateLimit.remaining;
            rateLimitState.reset = langData._rateLimit.reset;
            rateLimitState.lastChecked = Math.floor(Date.now() / 1000);
            
            // Remove the _rateLimit property before storing
            delete langData._rateLimit;
          } else {
            // If not present, decrement manually
            rateLimitState.remaining = Math.max(0, rateLimitState.remaining - 1);
          }
        }
        
        // Update project in database
        const now = new Date().toISOString();
        
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            stars: repoData.stargazers_count.toString(),
            forks: repoData.forks_count.toString(),
            description: repoData.description || "",
            languages,
            last_updated: now
          })
          .eq('name', project.name);
        
        if (updateError) {
          console.error(`Error updating project ${project.name}:`, updateError);
          
          await supabase
            .from('project_updates')
            .update({
              status: 'failed',
              error: `Database update error: ${updateError.message}`
            })
            .eq('project_name', project.name);
        } else {
          // Update status to completed
          await supabase
            .from('project_updates')
            .update({
              status: 'completed',
              last_successful: now,
              error: null
            })
            .eq('project_name', project.name);
            
          console.log(`Successfully updated ${project.name}`);
          processedCount++;
        }
      } catch (error) {
        console.error(`Error processing update for ${project.name}:`, error);
        
        // Update status to failed
        await supabase
          .from('project_updates')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('project_name', project.name);
      }
    }
    
    // Update last run timestamp
    updateQueue.lastRun = Math.floor(Date.now() / 1000);
    
    return {
      processedCount,
      success: true,
      rateLimitRemaining: rateLimitState.remaining,
      nextReset: rateLimitState.reset ? new Date(rateLimitState.reset * 1000) : null
    };
  } catch (error) {
    console.error("Error in process project updates:", error);
    return {
      processedCount: 0,
      success: false,
      rateLimitRemaining: rateLimitState.remaining,
      nextReset: rateLimitState.reset ? new Date(rateLimitState.reset * 1000) : null
    };
  } finally {
    updateQueue.isProcessing = false;
  }
}

/**
 * Get the current status of the rate limit and update queue
 */
export function getUpdateStatus(): {
  queue: UpdateQueue;
  rateLimit: RateLimitState;
} {
  return {
    queue: { ...updateQueue },
    rateLimit: { ...rateLimitState }
  };
}

/**
 * Update the rate limit state manually
 */
export function updateRateLimitState(newState: Partial<RateLimitState>): void {
  rateLimitState = {
    ...rateLimitState,
    ...newState,
    lastChecked: Math.floor(Date.now() / 1000)
  };
}
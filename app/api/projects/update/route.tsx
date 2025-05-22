// app/api/projects/update/route.tsx
import { NextResponse } from 'next/server';
import { processProjectUpdates, getUpdateStatus } from '@/lib/project-updater';
import supabase from '@/lib/supabase';

/**
 * GET: Get the status of the project update system
 */
export async function GET() {
  try {
    // Get the current status
    const status = getUpdateStatus();
    
    // Get update statistics from the database
    const { data: updateCounts, error: countError } = await supabase
      .from('project_updates')
      .select('status')
      .then(res => {
        if (res.error) throw res.error;
        
        // Count by status
        const counts = {
          pending: 0,
          in_progress: 0,
          completed: 0,
          failed: 0,
          total: res.data?.length || 0
        };
        
        if (res.data) {
          res.data.forEach(item => {
            if (item.status && counts.hasOwnProperty(item.status)) {
              counts[item.status as keyof typeof counts] += 1;
            }
          });
        }
        
        return { data: counts, error: null };
      });
    
    if (countError) {
      console.error("Error getting update counts:", countError);
    }
    
    // Count projects that need updating
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { count: needsUpdateCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .or(`last_updated.is.null,last_updated.lt.${yesterday.toISOString()}`);
    
    return NextResponse.json({
      queue: status.queue,
      rateLimit: {
        ...status.rateLimit,
        resetTime: status.rateLimit.reset ? new Date(status.rateLimit.reset * 1000).toISOString() : null,
      },
      statistics: updateCounts || { pending: 0, in_progress: 0, completed: 0, failed: 0, total: 0 },
      projectsNeedingUpdate: needsUpdateCount || 0
    });
  } catch (error) {
    console.error("Error getting update status:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST: Process a batch of updates
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const batchSize = body.batchSize || 5;
    
    // Don't allow batches larger than 10
    const safeBatchSize = Math.min(10, batchSize);
    
    // Process the updates
    const result = await processProjectUpdates(safeBatchSize);
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Successfully processed ${result.processedCount} projects` 
        : "Failed to process updates",
      processedCount: result.processedCount,
      rateLimitRemaining: result.rateLimitRemaining,
      nextReset: result.nextReset?.toISOString()
    });
  } catch (error) {
    console.error("Error processing project updates:", error);
    return NextResponse.json(
      { error: "Failed to process updates" },
      { status: 500 }
    );
  }
}
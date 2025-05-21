"use client";

import { useEffect, useRef } from 'react';

/**
 * Improved background worker component that continuously updates project information
 * This fixes the issue where only 3 projects would update before stopping
 */
export default function ImprovedProjectUpdaterWorker() {
  // Use refs to maintain state between renders
  const isProcessing = useRef<boolean>(false);
  const rateLimitRemaining = useRef<number>(60);
  const rateLimitReset = useRef<number>(0);
  const totalProcessed = useRef<number>(0);
  const lastUpdateCheck = useRef<number>(0);
  const processingTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Main update function that runs continuously
  const runUpdateProcess = async () => {
    // Skip if already processing
    if (isProcessing.current) return;
    
    const now = Date.now();

    try {
      isProcessing.current = true;
      
      // Check current status less frequently (every 5 minutes)
      if (now - lastUpdateCheck.current > 5 * 60 * 1000) {
        console.log("Checking update status...");
        const statusResponse = await fetch('/api/projects/update');
        
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          rateLimitRemaining.current = status.rateLimit.remaining;
          rateLimitReset.current = status.rateLimit.reset;
          lastUpdateCheck.current = now;
          
          // Log current status
          console.log(`Status: ${status.projectsNeedingUpdate} projects need updating, Rate limit: ${rateLimitRemaining.current} remaining`);
          
          // If no projects need updating, wait longer before checking again
          if (status.projectsNeedingUpdate === 0) {
            console.log("No projects need updating, will check again in 15 minutes");
            scheduleNextRun(15 * 60 * 1000); // 15 minutes
            return;
          }
        }
      }
      
      // Check if we have enough rate limit remaining for at least one update (which needs 2 API calls)
      if (rateLimitRemaining.current < 3) {
        // Check if the reset time has passed
        const currentTime = Math.floor(Date.now() / 1000);
        if (rateLimitReset.current > currentTime) {
          // Calculate wait time until reset
          const waitTimeMs = (rateLimitReset.current - currentTime) * 1000 + 5000; // Add 5 seconds buffer
          console.log(`Rate limit low (${rateLimitRemaining.current}), waiting for reset in ${Math.ceil(waitTimeMs/1000)} seconds`);
          scheduleNextRun(waitTimeMs);
          return;
        } else {
          // Reset time has passed, we can assume rate limit is reset
          rateLimitRemaining.current = 60;
        }
      }
      
      // Process a batch of projects
      console.log("Processing project updates...");
      const batchSize = 3; // Start with a small batch
      
      const response = await fetch('/api/projects/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ batchSize })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update rate limit info
        rateLimitRemaining.current = result.rateLimitRemaining || rateLimitRemaining.current - (batchSize * 2);
        if (result.nextReset) {
          rateLimitReset.current = Math.floor(new Date(result.nextReset).getTime() / 1000);
        }
        
        // Count processed projects
        totalProcessed.current += result.processedCount || 0;
        
        console.log(`Updated ${result.processedCount || 0} projects (total: ${totalProcessed.current})`);
        console.log(`Rate limit: ${rateLimitRemaining.current} remaining`);
        
        // If we processed fewer than the batch size, either we're out of projects or hit an error
        if (result.processedCount < batchSize) {
          // Wait a bit longer before the next check
          scheduleNextRun(5 * 60 * 1000); // 5 minutes
          return;
        }
        
        // If we processed the full batch and have rate limit remaining, run again quickly
        if (result.processedCount === batchSize && rateLimitRemaining.current > 10) {
          scheduleNextRun(10 * 1000); // Run again in 10 seconds
          return;
        }
      }
      
      // Default: Wait a minute before the next run
      scheduleNextRun(60 * 1000);
      
    } catch (error) {
      console.error("Error in update process:", error);
      scheduleNextRun(3 * 60 * 1000); // Wait 3 minutes after an error
    } finally {
      isProcessing.current = false;
    }
  };
  
  // Schedule the next update run
  const scheduleNextRun = (delayMs: number) => {
    // Clear any existing timeout
    if (processingTimeout.current) {
      clearTimeout(processingTimeout.current);
    }
    
    // Set new timeout
    processingTimeout.current = setTimeout(() => {
      runUpdateProcess();
    }, delayMs);
    
    console.log(`Next update scheduled in ${Math.round(delayMs/1000)} seconds`);
  };
  
  // Initialize the update process on component mount
  useEffect(() => {
    // Run the initial update after a short delay
    const initialTimeout = setTimeout(() => {
      console.log("Starting project update process...");
      runUpdateProcess();
    }, 5000); // Start after 5 seconds
    
    // Cleanup function
    return () => {
      clearTimeout(initialTimeout);
      if (processingTimeout.current) {
        clearTimeout(processingTimeout.current);
      }
    };
  }, []); // Empty dependency array - only run on mount
  
  // Don't render anything
  return null;
}
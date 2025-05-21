"use client";

import { useEffect, useState, useRef } from 'react';

interface RateLimitInfo {
  remaining: number;
  reset: number;
  lastChecked: number;
  resetTime: string | null;
}

interface QueueInfo {
  isProcessing: boolean;
  lastRun: number;
  currentBatchSize: number;
}

interface UpdaterStatus {
  queue: QueueInfo;
  rateLimit: RateLimitInfo;
  statistics: {
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
    total: number;
  };
  projectsNeedingUpdate: number;
}

/**
 * Background worker component that periodically updates project information
 * This component doesn't render anything visible but works in the background
 */
export default function ProjectUpdaterWorker() {
  const [status, setStatus] = useState<UpdaterStatus | null>(null);
  const lastUpdateAttempt = useRef<number>(0);
  
  // Fetch status periodically
  useEffect(() => {
    // Function to check status
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/projects/update');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error("Error checking updater status:", error);
      }
    };
    
    // Check status immediately
    checkStatus();
    
    // Set up interval to check status every 5 minutes
    const statusInterval = setInterval(checkStatus, 5 * 60 * 1000);
    
    return () => clearInterval(statusInterval);
  }, []);
  
  // Process updates periodically if needed and possible
  useEffect(() => {
    // Only run if we have status data
    if (!status) return;
    
    // Function to process updates
    const processUpdates = async () => {
      // Skip if already processing
      if (status.queue.isProcessing) return;
      
      // Skip if rate limit is exhausted
      if (status.rateLimit.remaining <= 1) {
        const now = Math.floor(Date.now() / 1000);
        if (status.rateLimit.reset > now) {
          console.log(`Rate limit reached (${status.rateLimit.remaining} remaining). Will reset at ${status.rateLimit.resetTime}`);
          return;
        }
      }
      
      // Skip if no projects need updating
      if (status.projectsNeedingUpdate === 0) {
        console.log("No projects need updating at this time");
        return;
      }
      
      // Skip if we've tried recently (last 10 minutes)
      const now = Math.floor(Date.now() / 1000);
      if (now - lastUpdateAttempt.current < 10 * 60) {
        console.log("Update attempted recently, skipping");
        return;
      }
      
      lastUpdateAttempt.current = now;
      
      try {
        // Start with a small batch size to be conservative
        const batchSize = Math.min(3, status.projectsNeedingUpdate);
        
        console.log(`Processing ${batchSize} projects...`);
        const response = await fetch('/api/projects/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ batchSize })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`Update completed: ${result.processedCount} projects processed`);
          
          // Refresh status after update
          const statusResponse = await fetch('/api/projects/update');
          if (statusResponse.ok) {
            const newStatus = await statusResponse.json();
            setStatus(newStatus);
          }
        }
      } catch (error) {
        console.error("Error processing updates:", error);
      }
    };
    
    // Process updates on an interval (every 30 minutes)
    // This ensures we don't hit the API too frequently
    const updateInterval = setInterval(processUpdates, 30 * 60 * 1000);
    
    // Also try processing immediately if we have bandwidth
    if (status.rateLimit.remaining > 5 && status.projectsNeedingUpdate > 0) {
      processUpdates();
    }
    
    return () => clearInterval(updateInterval);
  }, [status]);
  
  // Don't render anything
  return null;
}
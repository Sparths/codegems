// app/api/cron/update-projects/route.tsx
import { NextResponse } from 'next/server';
import { processProjectUpdates, getUpdateStatus } from '@/lib/project-updater';

/**
 * GET: Endpoint for a cron job to update projects
 * This can be called by Vercel Cron or an external service
 */
export async function GET() {
  try {
    // Get current status
    const status = getUpdateStatus();
    
    // Don't run if rate limit is exhausted
    if (status.rateLimit.remaining <= 1) {
      const now = Math.floor(Date.now() / 1000);
      
      if (status.rateLimit.reset > now) {
        // Rate limit not reset yet
        const waitTimeSeconds = status.rateLimit.reset - now;
        const resetTime = new Date(status.rateLimit.reset * 1000).toISOString();
        
        return NextResponse.json({
          success: false,
          message: `Rate limit exhausted. Will reset in ${waitTimeSeconds} seconds at ${resetTime}`,
          rateLimitRemaining: status.rateLimit.remaining,
          rateLimitReset: resetTime
        });
      }
    }
    
    // Don't run if already processing
    if (status.queue.isProcessing) {
      return NextResponse.json({
        success: false,
        message: "Update already in progress",
        rateLimitRemaining: status.rateLimit.remaining
      });
    }
    
    // Process a smaller batch in cron to avoid using all rate limit
    const result = await processProjectUpdates(3);
    
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
    console.error("Error in cron job for updating projects:", error);
    return NextResponse.json(
      { error: "Failed to run cron job" },
      { status: 500 }
    );
  }
}
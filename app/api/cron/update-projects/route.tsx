// app/api/cron/update-projects/route.tsx
import { NextResponse } from 'next/server';
import { processProjectUpdates, getUpdateStatus } from '@/lib/project-updater';
import { rateLimit, createRateLimitHeaders } from "@/lib/security/rate-limiter-config";

// Add IP whitelist for cron jobs (Vercel's IPs or your cron service)
const ALLOWED_CRON_IPS = process.env.ALLOWED_CRON_IPS?.split(',') || [];

function isAllowedCronIP(request: Request): boolean {
  // If no IPs are configured, allow all (not recommended for production)
  if (ALLOWED_CRON_IPS.length === 0) return true;
  
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');
  
  const clientIP = cfIP || realIP || (forwarded && forwarded.split(',')[0].trim());
  
  return clientIP ? ALLOWED_CRON_IPS.includes(clientIP) : false;
}

/**
 * GET: Endpoint for a cron job to update projects
 * This can be called by Vercel Cron or an external service
 */
export async function GET(request: Request) {
  try {
    // Check if request is from allowed IP
    if (!isAllowedCronIP(request)) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Apply rate limiting (less strict for cron jobs)
    const rateLimitResult = await rateLimit(request, 'default');
    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...createRateLimitHeaders(rateLimitResult),
          }
        }
      );
    }

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
        }, {
          headers: createRateLimitHeaders(rateLimitResult)
        });
      }
    }
    
    // Don't run if already processing
    if (status.queue.isProcessing) {
      return NextResponse.json({
        success: false,
        message: "Update already in progress",
        rateLimitRemaining: status.rateLimit.remaining
      }, {
        headers: createRateLimitHeaders(rateLimitResult)
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
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    });
  } catch (error) {
    console.error("Error in cron job for updating projects:", error);
    return NextResponse.json(
      { error: "Failed to run cron job" },
      { status: 500 }
    );
  }
}
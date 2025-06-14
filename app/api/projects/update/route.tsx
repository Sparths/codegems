// =================================
// app/api/projects/update/route.tsx
// =================================

import { NextResponse } from 'next/server';
import { processProjectUpdates, getUpdateStatus } from '@/lib/project-updater';
import supabase from '@/lib/supabase';
import { rateLimit, createRateLimitHeaders } from "@/lib/security/rate-limiter-config";
import { sanitizeInput } from "@/lib/security/sanitization";

/**
 * GET: Get the status of the project update system
 */
export async function GET(request: Request) {
  try {
    // Apply rate limiting
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
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
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
    // Apply rate limiting
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

    const body = await request.json().catch(() => ({}));
    let batchSize = body.batchSize || 5;
    
    // Sanitize batch size
    if (typeof batchSize === 'string') {
      batchSize = parseInt(sanitizeInput(batchSize), 10) || 5;
    }
    
    // Don't allow batches larger than 10
    const safeBatchSize = Math.min(10, Math.max(1, batchSize));
    
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
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    });
  } catch (error) {
    console.error("Error processing project updates:", error);
    return NextResponse.json(
      { error: "Failed to process updates" },
      { status: 500 }
    );
  }
}
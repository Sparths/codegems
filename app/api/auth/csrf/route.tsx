// =================================
// app/api/auth/csrf/route.tsx
// =================================

import { NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/security/csrf-protection';
import { rateLimit, createRateLimitHeaders } from "@/lib/security/rate-limiter-config";

// GET: Get CSRF token
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

    const token = generateCSRFToken();
    
    return NextResponse.json(
      { token },
      { headers: createRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}
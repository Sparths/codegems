// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { securityMiddleware } from './lib/security/security-headers';
import { rateLimit, createRateLimitHeaders } from './lib/security/rate-limiter-config';

export async function middleware(request: NextRequest) {
  // Apply security headers first
  let response = securityMiddleware(request);
  
  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Extract the endpoint name for rate limiting
    const pathname = request.nextUrl.pathname;
    let endpoint = 'default';
    
    // Map API routes to rate limit keys
    if (pathname.includes('/users') && request.method === 'POST') {
      const action = request.nextUrl.searchParams.get('action');
      if (action === 'login') endpoint = 'users_login';
      else if (action === 'check_badges') endpoint = 'default';
      else endpoint = 'users_create';
    } else if (pathname.includes('/users') && request.method === 'GET') {
      endpoint = 'users_get';
    } else if (pathname.includes('/users') && request.method === 'PUT') {
      endpoint = 'users_update';
    } else if (pathname.includes('/project-requests')) {
      endpoint = 'project_requests';
    } else if (pathname.includes('/comments')) {
      endpoint = 'comments';
    } else if (pathname.includes('/ratings')) {
      endpoint = 'ratings';
    } else if (pathname.includes('/admin/verify')) {
      endpoint = 'admin_verify';
    }
    
    const rateLimitResult = await rateLimit(request, endpoint);
    
    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...createRateLimitHeaders(rateLimitResult),
            'Retry-After': rateLimitResult.reset?.toString() || '60'
          }
        }
      );
    }
    
    // Add rate limit headers to successful responses
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png|site.webmanifest).*)',
  ],
};
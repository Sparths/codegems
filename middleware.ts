// middleware.ts - Updated version
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateNonce, applySecurityHeaders } from './lib/security/security-headers';
import { rateLimit, createRateLimitHeaders } from './lib/security/rate-limiter-config';

export async function middleware(request: NextRequest) {
  // Generate a nonce for this request
  const nonce = generateNonce();
  
  // Create response with security headers and nonce
  let response = NextResponse.next();
  response = applySecurityHeaders(response, request, nonce);
  
  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Extract the endpoint name for rate limiting
    const pathname = request.nextUrl.pathname;
    const method = request.method;
    let endpoint = 'default';
    
    // Map API routes to rate limit keys with more granular control
    if (pathname.includes('/users')) {
      const action = request.nextUrl.searchParams.get('action');
      if (method === 'POST') {
        if (action === 'login') endpoint = 'users_login';
        else if (action === 'check_badges') endpoint = 'default';
        else endpoint = 'users_create';
      } else if (method === 'GET') {
        endpoint = 'users_get';
      } else if (method === 'PUT') {
        endpoint = 'users_update';
      }
    } else if (pathname.includes('/project-requests')) {
      endpoint = 'project_requests';
    } else if (pathname.includes('/comments')) {
      endpoint = 'comments';
    } else if (pathname.includes('/ratings')) {
      endpoint = 'ratings';
    } else if (pathname.includes('/admin/verify')) {
      endpoint = 'admin_verify';
    } else if (pathname.includes('/saved-projects')) {
      endpoint = 'default';
    } else if (pathname.includes('/badges')) {
      endpoint = 'default';
    } else if (pathname.includes('/projects')) {
      endpoint = 'default';
    } else if (pathname.includes('/auth/')) {
      if (pathname.includes('/login') || pathname.includes('/session')) {
        endpoint = 'users_login';
      } else {
        endpoint = 'default';
      }
    } else if (pathname.includes('/cron/')) {
      // Special handling for cron jobs - less restrictive
      endpoint = 'default';
    }
    
    const rateLimitResult = await rateLimit(request, endpoint);
    
    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.reset
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...createRateLimitHeaders(rateLimitResult),
            'Retry-After': rateLimitResult.reset?.toString() || '60',
            // Add CORS headers for API routes
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_SITE_URL || '*' : '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
          }
        }
      );
    }
    
    // Add rate limit headers to successful responses
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add CORS headers for API routes
    response.headers.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_SITE_URL || '*' : '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_SITE_URL || '*' : '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Add additional security headers for sensitive routes
  if (request.nextUrl.pathname.startsWith('/admin/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  }

  // Ensure the nonce is available for the layout
  response.headers.set('X-CSP-Nonce', nonce);
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (favicon, icons, manifest, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png|site.webmanifest|robots.txt|sitemap.xml).*)',
  ],
};
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting store (in production, use Redis or a database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration - More reasonable limits
const RATE_LIMIT_CONFIG = {
  '/api/auth': { maxRequests: 10, windowMs: 15 * 60 * 1000 }, // 10 requests per 15 minutes
  '/api/project-requests': { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 requests per hour
  '/api/comments': { maxRequests: 20, windowMs: 5 * 60 * 1000 }, // 20 requests per 5 minutes
  '/api/ratings': { maxRequests: 30, windowMs: 60 * 60 * 1000 }, // 30 requests per hour
  '/api/users': { maxRequests: 15, windowMs: 15 * 60 * 1000 }, // 15 requests per 15 minutes
  'default': { maxRequests: 100, windowMs: 15 * 60 * 1000 } // Default rate limit
};

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');
  
  if (cfIP) return cfIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  
  return request.ip || 'unknown';
}

function getRateLimitKey(request: NextRequest): string {
  const ip = getClientIP(request);
  const pathname = request.nextUrl.pathname;
  
  // Create rate limit key based on IP and endpoint pattern
  const endpoint = Object.keys(RATE_LIMIT_CONFIG).find(pattern => 
    pathname.startsWith(pattern)
  ) || 'default';
  
  return `${ip}:${endpoint}`;
}

function isRateLimited(request: NextRequest): boolean {
  const key = getRateLimitKey(request);
  const now = Date.now();
  const pathname = request.nextUrl.pathname;
  
  // Get rate limit config for this endpoint
  const endpoint = Object.keys(RATE_LIMIT_CONFIG).find(pattern => 
    pathname.startsWith(pattern)
  ) || 'default';
  
  const config = RATE_LIMIT_CONFIG[endpoint as keyof typeof RATE_LIMIT_CONFIG];
  
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // First request or window has reset
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return false;
  }
  
  if (record.count >= config.maxRequests) {
    return true;
  }
  
  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  return false;
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export function middleware(request: NextRequest) {
  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (isRateLimited(request)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '900' // 15 minutes
          }
        }
      );
    }
  }

  const response = NextResponse.next();

  // Add security headers with updated CSP for Vercel Analytics
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Updated CSP to allow Vercel Analytics
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://cdnjs.cloudflare.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.github.com https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "frame-src 'none'",
      "manifest-src 'self'"
    ].join('; ')
  );
  
  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png|site.webmanifest).*)',
  ],
};
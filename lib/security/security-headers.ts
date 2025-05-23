// lib/security-headers.ts
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import React from 'react';

// Generate nonce for CSP
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

// Security headers configuration
export function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  nonce?: string
): NextResponse {
  // Generate CSP nonce if not provided
  const cspNonce = nonce || generateNonce();
  
  // Content Security Policy - Strict
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${cspNonce}' https://cdnjs.cloudflare.com https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'", // Unfortunately needed for Tailwind
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.github.com https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
    "manifest-src 'self'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '0'); // Disabled in favor of CSP
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Permissions Policy (formerly Feature Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()'
  );
  
  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');
  
  // Add CSP nonce to response for use in scripts
  response.headers.set('X-CSP-Nonce', cspNonce);
  
  return response;
}

// Middleware configuration for specific routes
export function getSecurityHeadersForRoute(pathname: string): Record<string, string> {
  const baseHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '0'
  };
  
  // API routes - additional restrictions
  if (pathname.startsWith('/api/')) {
    return {
      ...baseHeaders,
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private'
    };
  }
  
  // Admin routes - extra security
  if (pathname.startsWith('/admin/')) {
    return {
      ...baseHeaders,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'X-Robots-Tag': 'noindex, nofollow'
    };
  }
  
  return baseHeaders;
}

// React component to inject CSP nonce
export function SecurityHeaders({ nonce }: { nonce: string }): React.ReactElement {
  return React.createElement('script', {
    nonce: nonce,
    dangerouslySetInnerHTML: {
      __html: `window.__CSP_NONCE__ = '${nonce}';`
    }
  });
}

// Helper to get nonce in client components
export function getCSPNonce(): string | undefined {
  if (typeof window !== 'undefined') {
    return (window as any).__CSP_NONCE__;
  }
  return undefined;
}

// Enhanced middleware function
export function securityMiddleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  
  // Apply security headers
  const enhancedResponse = applySecurityHeaders(response, request);
  
  // Add route-specific headers
  const routeHeaders = getSecurityHeadersForRoute(request.nextUrl.pathname);
  Object.entries(routeHeaders).forEach(([key, value]) => {
    enhancedResponse.headers.set(key, value);
  });
  
  return enhancedResponse;
}
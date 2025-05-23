// lib/security/api-wrapper.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, createRateLimitHeaders } from './rate-limiter-config';
import { sanitizeInput } from './sanitization';
import { checkCSRF } from './csrf-protection';
import { SECURITY_CONFIG, isSpamLikely, containsBlockedContent } from './config';

export interface SecurityOptions {
  rateLimitKey?: string;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  skipCSRF?: boolean;
  validateBody?: boolean;
  maxBodySize?: number;
}

export interface SecureRequest extends NextRequest {
  user?: {
    id: string;
    username: string;
    isAdmin: boolean;
  };
  sanitizedBody?: Record<string, any>;
  rateLimitInfo?: {
    remaining: number;
    limit: number;
    reset: number;
  };
}

// Security wrapper for API routes
export function withSecurity(
  handler: (req: SecureRequest) => Promise<Response>,
  options: SecurityOptions = {}
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const secureRequest = request as SecureRequest;

      // 1. Rate limiting
      const rateLimitKey = options.rateLimitKey || 'default';
      const rateLimitResult = await rateLimit(request, rateLimitKey);
      
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
            }
          }
        );
      }

      secureRequest.rateLimitInfo = {
        remaining: rateLimitResult.remaining || 0,
        limit: rateLimitResult.limit || 0,
        reset: rateLimitResult.reset || 0,
      };

      // 2. CSRF protection for non-GET requests
      if (!options.skipCSRF && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
          return new NextResponse(
            JSON.stringify({ error: csrfResult.error || 'CSRF validation failed' }),
            {
              status: 403,
              headers: {
                'Content-Type': 'application/json',
                ...createRateLimitHeaders(rateLimitResult),
              }
            }
          );
        }
      }

      // 3. Authentication check
      if (options.requireAuth || options.requireAdmin) {
        const authResult = await verifyAuthentication(request);
        if (!authResult.valid) {
          return new NextResponse(
            JSON.stringify({ error: 'Authentication required' }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                ...createRateLimitHeaders(rateLimitResult),
              }
            }
          );
        }

        secureRequest.user = authResult.user;

        // Admin check
        if (options.requireAdmin && !authResult.user?.isAdmin) {
          return new NextResponse(
            JSON.stringify({ error: 'Admin access required' }),
            {
              status: 403,
              headers: {
                'Content-Type': 'application/json',
                ...createRateLimitHeaders(rateLimitResult),
              }
            }
          );
        }
      }

      // 4. Body validation and sanitization
      if (options.validateBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.json();
          const sanitizedBody = sanitizeRequestBody(body, options.maxBodySize);
          
          if (!sanitizedBody.valid) {
            return new NextResponse(
              JSON.stringify({ error: sanitizedBody.error }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  ...createRateLimitHeaders(rateLimitResult),
                }
              }
            );
          }

          secureRequest.sanitizedBody = sanitizedBody.data;
        } catch (error) {
          return new NextResponse(
            JSON.stringify({ error: 'Invalid JSON body' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...createRateLimitHeaders(rateLimitResult),
              }
            }
          );
        }
      }

      // 5. Call the actual handler
      const response = await handler(secureRequest);

      // 6. Add security headers to response
      const secureResponse = addSecurityHeaders(response, rateLimitResult);
      
      return secureResponse;

    } catch (error) {
      console.error('Security wrapper error:', error);
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
}

// Authentication verification
async function verifyAuthentication(request: NextRequest): Promise<{
  valid: boolean;
  user?: {
    id: string;
    username: string;
    isAdmin: boolean;
  };
}> {
  // Get authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false };
  }

  const token = authHeader.substring(7);
  
  // Here you would verify the token against your auth system
  // This is a simplified implementation
  try {
    // Verify token logic here
    // For now, return a basic structure
    return {
      valid: true,
      user: {
        id: 'user_id',
        username: 'username',
        isAdmin: false
      }
    };
  } catch (error) {
    return { valid: false };
  }
}

// Sanitize request body
function sanitizeRequestBody(body: any, maxSize?: number): {
  valid: boolean;
  data?: Record<string, any>;
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  // Check body size
  const bodySize = JSON.stringify(body).length;
  const maxBodySize = maxSize || 1024 * 1024; // 1MB default
  
  if (bodySize > maxBodySize) {
    return { valid: false, error: 'Request body too large' };
  }

  const sanitizedData: Record<string, any> = {};

  // Recursively sanitize all string values
  function sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      const sanitized = sanitizeInput(value);
      
      // Check for spam content
      if (isSpamLikely(sanitized)) {
        throw new Error('Content flagged as spam');
      }
      
      // Check for blocked content
      if (containsBlockedContent(sanitized)) {
        throw new Error('Content contains blocked words');
      }
      
      return sanitized;
    } else if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    } else if (value && typeof value === 'object') {
      const sanitizedObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitizedObj[sanitizeInput(key)] = sanitizeValue(val);
      }
      return sanitizedObj;
    }
    
    return value;
  }

  try {
    for (const [key, value] of Object.entries(body)) {
      sanitizedData[sanitizeInput(key)] = sanitizeValue(value);
    }
    
    return { valid: true, data: sanitizedData };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Content validation failed' 
    };
  }
}

// Add security headers to response
function addSecurityHeaders(response: Response, rateLimitResult: any): Response {
  const headers = new Headers(response.headers);
  
  // Add rate limit headers
  const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // Add security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add CORS headers if needed
  if (process.env.NODE_ENV === 'development') {
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// Utility function to extract user ID from various sources
export function extractUserId(request: SecureRequest): string | null {
  // Try to get user ID from authenticated user
  if (request.user?.id) {
    return request.user.id;
  }

  // Try to get from request body
  if (request.sanitizedBody?.userId) {
    return request.sanitizedBody.userId;
  }

  // Try to get from query parameters
  const url = new URL(request.url);
  const userIdParam = url.searchParams.get('userId');
  if (userIdParam) {
    return sanitizeInput(userIdParam);
  }

  return null;
}

// Utility function to validate project name
export function validateProjectName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  
  const config = SECURITY_CONFIG.VALIDATION.PROJECT_TITLE;
  if (name.length < config.min || name.length > config.max) return false;
  
  // Allow alphanumeric, dots, hyphens, and underscores
  const projectNameRegex = /^[a-zA-Z0-9._-]+$/;
  return projectNameRegex.test(name);
}

// Utility function to validate GitHub URL
export function validateGitHubUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsedUrl = new URL(url);
    
    // Must be GitHub
    if (parsedUrl.hostname !== 'github.com') return false;
    
    // Must have valid path structure
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) return false;
    
    // Basic validation of username and repo name
    const [username, repo] = pathParts;
    const validNameRegex = /^[a-zA-Z0-9._-]+$/;
    
    return validNameRegex.test(username) && validNameRegex.test(repo);
  } catch {
    return false;
  }
}
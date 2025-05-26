// lib/rate-limiter.ts
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Rate limiting store (in production, use Redis or a database)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Much higher rate limiting configurations
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  'users_create': { maxRequests: 1000, windowMs: 15 * 60 * 1000 }, // 50 registrations per 15 minutes
  'users_login': { maxRequests: 1000, windowMs: 15 * 60 * 1000 }, // 100 login attempts per 15 minutes
  'users_update': { maxRequests: 1000, windowMs: 5 * 60 * 1000 }, // 100 updates per 5 minutes
  'users_get': { maxRequests: 1000, windowMs: 5 * 60 * 1000 }, // 1000 gets per 5 minutes
  'project_requests': { maxRequests: 1000, windowMs: 60 * 60 * 1000 }, // 50 requests per hour
  'comments': { maxRequests: 1000, windowMs: 5 * 60 * 1000 }, // 500 comments per 5 minutes
  'ratings': { maxRequests: 1000, windowMs: 60 * 60 * 1000 }, // 500 ratings per hour
  'default': { maxRequests: 1000, windowMs: 15 * 60 * 1000 } // 2000 requests per 15 minutes
};

function getClientIP(request: Request): string {
  // Try to get the real IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');
  
  if (cfIP) return cfIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  
  return 'unknown';
}

export async function rateLimit(
  request: Request, 
  action: string
): Promise<{ 
  success: boolean; 
  reset?: number; 
  remaining?: number;
  limit?: number;
}> {
  const ip = getClientIP(request);
  const key = `${ip}:${action}`;
  const now = Date.now();
  
  const config = RATE_LIMIT_CONFIGS[action] || RATE_LIMIT_CONFIGS.default;
  const record = rateLimitStore.get(key);
  
  // Clean up expired records periodically
  if (Math.random() < 0.01) { // 1% chance to trigger cleanup
    cleanupExpiredRecords();
  }
  
  if (!record || now > record.resetTime) {
    // First request or window has reset
    const newRecord = {
      count: 1,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(key, newRecord);
    
    return { 
      success: true,
      remaining: config.maxRequests - 1,
      limit: config.maxRequests,
      reset: Math.ceil((newRecord.resetTime - now) / 1000)
    };
  }
  
  if (record.count >= config.maxRequests) {
    return { 
      success: false,
      remaining: 0,
      limit: config.maxRequests,
      reset: Math.ceil((record.resetTime - now) / 1000)
    };
  }
  
  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  
  return { 
    success: true,
    remaining: config.maxRequests - record.count,
    limit: config.maxRequests,
    reset: Math.ceil((record.resetTime - now) / 1000)
  };
}

function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up expired records every 10 minutes
setInterval(cleanupExpiredRecords, 10 * 60 * 1000);

// Helper function to create rate limit headers
export function createRateLimitHeaders(result: { 
  remaining?: number; 
  limit?: number; 
  reset?: number; 
}): Record<string, string> {
  const headers: Record<string, string> = {};
  
  if (result.limit !== undefined) {
    headers['X-RateLimit-Limit'] = result.limit.toString();
  }
  
  if (result.remaining !== undefined) {
    headers['X-RateLimit-Remaining'] = result.remaining.toString();
  }
  
  if (result.reset !== undefined) {
    headers['X-RateLimit-Reset'] = result.reset.toString();
  }
  
  return headers;
}
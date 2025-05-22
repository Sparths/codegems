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

// Rate limiting configurations
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  'users_create': { maxRequests: 3, windowMs: 15 * 60 * 1000 }, // 3 registrations per 15 minutes
  'users_login': { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 login attempts per 15 minutes
  'users_update': { maxRequests: 5, windowMs: 5 * 60 * 1000 }, // 5 updates per 5 minutes
  'users_get': { maxRequests: 50, windowMs: 5 * 60 * 1000 }, // 50 gets per 5 minutes
  'project_requests': { maxRequests: 2, windowMs: 60 * 60 * 1000 }, // 2 requests per hour
  'comments': { maxRequests: 10, windowMs: 5 * 60 * 1000 }, // 10 comments per 5 minutes
  'ratings': { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 ratings per hour
  'default': { maxRequests: 100, windowMs: 15 * 60 * 1000 } // Default rate limit
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
): Promise<{ success: boolean; reset?: number }> {
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
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return { success: true };
  }
  
  if (record.count >= config.maxRequests) {
    return { 
      success: false, 
      reset: Math.ceil((record.resetTime - now) / 1000) 
    };
  }
  
  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  return { success: true };
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
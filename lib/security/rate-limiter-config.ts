// lib/rate-limiter-config.ts
import { LRUCache } from 'lru-cache';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Use LRU cache instead of Map for better memory management
const rateLimitStore = new LRUCache<string, RateLimitRecord>({
  max: 10000, // Maximum number of items in cache
  ttl: 60 * 60 * 1000, // 1 hour TTL
});

// Reasonable rate limiting configurations
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - strict limits
  'users_create': { 
    maxRequests: 3, 
    windowMs: 15 * 60 * 1000 // 3 registrations per 15 minutes per IP
  },
  'users_login': { 
    maxRequests: 5, 
    windowMs: 15 * 60 * 1000, // 5 login attempts per 15 minutes
    skipSuccessfulRequests: true // Don't count successful logins
  },
  'users_update': { 
    maxRequests: 10, 
    windowMs: 5 * 60 * 1000 // 10 updates per 5 minutes
  },
  
  // Read operations - more lenient
  'users_get': { 
    maxRequests: 100, 
    windowMs: 5 * 60 * 1000 // 100 gets per 5 minutes
  },
  
  // Content creation - moderate limits
  'project_requests': { 
    maxRequests: 5, 
    windowMs: 60 * 60 * 1000 // 5 project requests per hour
  },
  'comments': { 
    maxRequests: 20, 
    windowMs: 5 * 60 * 1000 // 20 comments per 5 minutes
  },
  'ratings': { 
    maxRequests: 30, 
    windowMs: 60 * 60 * 1000 // 30 ratings per hour
  },
  
  // Admin endpoints - special handling
  'admin_verify': { 
    maxRequests: 10, 
    windowMs: 60 * 60 * 1000 // 10 verifications per hour
  },
  
  // Default for other endpoints
  'default': { 
    maxRequests: 60, 
    windowMs: 60 * 1000 // 60 requests per minute
  }
};

// Enhanced rate limiting with distributed support
export async function rateLimit(
  request: Request, 
  action: string,
  identifier?: string // Allow custom identifier (e.g., user ID)
): Promise<{ 
  success: boolean; 
  reset?: number; 
  remaining?: number;
  limit?: number;
}> {
  const ip = getClientIP(request);
  const key = identifier ? `${identifier}:${action}` : `${ip}:${action}`;
  const now = Date.now();
  
  const config = RATE_LIMIT_CONFIGS[action] || RATE_LIMIT_CONFIGS.default;
  let record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // First request or window has reset
    record = {
      count: 1,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(key, record);
    
    return { 
      success: true,
      remaining: config.maxRequests - 1,
      limit: config.maxRequests,
      reset: Math.ceil((record.resetTime - now) / 1000)
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

// Get client IP with better detection
function getClientIP(request: Request): string {
  const headers = request.headers;
  
  // Check various headers in order of preference
  const ipHeaders = [
    'cf-connecting-ip', // Cloudflare
    'x-real-ip', // Nginx proxy
    'x-forwarded-for', // Standard proxy header
    'x-client-ip', // Some proxies
    'x-cluster-client-ip', // Some load balancers
    'forwarded', // RFC 7239
  ];
  
  for (const header of ipHeaders) {
    const value = headers.get(header);
    if (value) {
      // Handle x-forwarded-for which may contain multiple IPs
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }
  
  return 'unknown';
}

// Validate IP address
function isValidIP(ip: string): boolean {
  // Basic IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }
  
  // Basic IPv6 validation
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
}

// Helper to create rate limit headers
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
    headers['X-RateLimit-Reset-After'] = result.reset.toString();
  }
  
  return headers;
}
// lib/security/config.ts
export const SECURITY_CONFIG = {
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    SPECIAL_CHARS: '@$!%*?&',
  },
  
  // Session configuration
  SESSION: {
    DURATION: 24 * 60 * 60 * 1000, // 24 hours
    IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    ABSOLUTE_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 days
    SECURE_COOKIES: process.env.NODE_ENV === 'production',
  },
  
  // Rate limiting configuration
  RATE_LIMITS: {
    STRICT: { requests: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
    MODERATE: { requests: 20, window: 5 * 60 * 1000 }, // 20 requests per 5 minutes
    LENIENT: { requests: 100, window: 5 * 60 * 1000 }, // 100 requests per 5 minutes
    DEFAULT: { requests: 60, window: 60 * 1000 }, // 60 requests per minute
  },
  
  // Input validation limits
  VALIDATION: {
    USERNAME: { min: 3, max: 30 },
    EMAIL: { max: 254 },
    DISPLAY_NAME: { min: 1, max: 50 },
    COMMENT: { min: 1, max: 2000 },
    PROJECT_TITLE: { min: 3, max: 100 },
    PROJECT_DESCRIPTION: { min: 10, max: 1000 },
    ADMIN_NOTES: { max: 1000 },
    BADGE_NAME: { min: 3, max: 50 },
    BADGE_DESCRIPTION: { min: 10, max: 200 },
  },
  
  // File upload limits
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    MAX_FILES: 10,
  },
  
  // Security headers configuration
  HEADERS: {
    CSP: {
      DEFAULT_SRC: ["'self'"],
      SCRIPT_SRC: ["'self'", "'nonce-{nonce}'", "https://cdnjs.cloudflare.com", "https://va.vercel-scripts.com"],
      STYLE_SRC: ["'self'", "'unsafe-inline'"], // Unfortunately needed for Tailwind
      IMG_SRC: ["'self'", "data:", "https:", "blob:"],
      FONT_SRC: ["'self'", "data:"],
      CONNECT_SRC: ["'self'", "https://api.github.com", "https://*.supabase.co", "wss://*.supabase.co", "https://vitals.vercel-insights.com"],
      FRAME_SRC: ["'none'"],
      OBJECT_SRC: ["'none'"],
    },
    HSTS: {
      MAX_AGE: 31536000, // 1 year
      INCLUDE_SUBDOMAINS: true,
      PRELOAD: true,
    },
  },
  
  // Admin configuration
  ADMIN: {
    TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  },
  
  // API configuration
  API: {
    MAX_BATCH_SIZE: 10,
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  
  // Content filtering
  CONTENT: {
    BLOCKED_WORDS: [
      // Add blocked words/phrases here
      'spam', 'scam', 'phishing'
    ],
    MAX_LINKS_PER_COMMENT: 3,
    AUTO_MODERATE_THRESHOLD: 0.8, // Confidence threshold for auto-moderation
  },
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
  SECURITY_CONFIG.SESSION.SECURE_COOKIES = false;
  SECURITY_CONFIG.RATE_LIMITS.DEFAULT = { requests: 1000, window: 60 * 1000 };
}

// Validation helpers
export const isValidPassword = (password: string): boolean => {
  const config = SECURITY_CONFIG.PASSWORD;
  
  if (password.length < config.MIN_LENGTH || password.length > config.MAX_LENGTH) {
    return false;
  }
  
  if (config.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return false;
  }
  
  if (config.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return false;
  }
  
  if (config.REQUIRE_NUMBERS && !/\d/.test(password)) {
    return false;
  }
  
  if (config.REQUIRE_SPECIAL_CHARS && !new RegExp(`[${config.SPECIAL_CHARS}]`).test(password)) {
    return false;
  }
  
  return true;
};

export const isValidUsername = (username: string): boolean => {
  const config = SECURITY_CONFIG.VALIDATION.USERNAME;
  
  if (username.length < config.min || username.length > config.max) {
    return false;
  }
  
  // Only allow alphanumeric, underscore, and hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return false;
  }
  
  // Check for common SQL injection patterns
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)|(-{2})|\/\*|\*\/|;/i;
  
  return !sqlPatterns.test(username);
};

export const isValidEmail = (email: string): boolean => {
  const config = SECURITY_CONFIG.VALIDATION.EMAIL;
  
  if (email.length > config.max) {
    return false;
  }
  
  // More comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email);
};

// Content moderation helpers
export const containsBlockedContent = (text: string): boolean => {
  const blockedWords = SECURITY_CONFIG.CONTENT.BLOCKED_WORDS;
  const lowerText = text.toLowerCase();
  
  return blockedWords.some(word => lowerText.includes(word.toLowerCase()));
};

export const countLinks = (text: string): number => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches ? matches.length : 0;
};

export const isSpamLikely = (text: string): boolean => {
  // Basic spam detection heuristics
  const spamIndicators = [
    text.length > 1000 && text.split(' ').length < 50, // Very long with few words
    /(.)\1{10,}/.test(text), // Repeated characters
    /(URGENT|CLICK HERE|FREE|WINNER|CONGRATULATIONS)/gi.test(text), // Spam words
    countLinks(text) > SECURITY_CONFIG.CONTENT.MAX_LINKS_PER_COMMENT, // Too many links
    containsBlockedContent(text), // Contains blocked words
  ];
  
  const score = spamIndicators.filter(Boolean).length / spamIndicators.length;
  return score >= SECURITY_CONFIG.CONTENT.AUTO_MODERATE_THRESHOLD;
};
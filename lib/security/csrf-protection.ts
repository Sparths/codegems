// lib/csrf-protection.ts
import crypto from 'crypto';
import { cookies } from 'next/headers';
import React from 'react';

const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = '__csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate CSRF token
export function generateCSRFToken(): string {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${token}:${timestamp}`)
    .digest('hex');
  
  return Buffer.from(JSON.stringify({
    token,
    timestamp,
    signature
  })).toString('base64');
}

// Verify CSRF token
export function verifyCSRFToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const { token: rawToken, timestamp, signature } = JSON.parse(decoded);
    
    // Check token age (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return false;
    }
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(`${rawToken}:${timestamp}`)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

// Middleware to check CSRF token
export async function checkCSRF(request: Request): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { valid: true };
  }
  
  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) {
    return { valid: false, error: 'Missing CSRF token' };
  }
  
  // Verify token
  if (!verifyCSRFToken(headerToken)) {
    return { valid: false, error: 'Invalid CSRF token' };
  }
  
  return { valid: true };
}

// React hook for CSRF token
export function useCSRFToken(): {
  token: string;
  headers: Record<string, string>;
} {
  const [token, setToken] = React.useState<string>('');
  
  React.useEffect(() => {
    // Get or generate CSRF token
    const existingToken = getCookie(CSRF_COOKIE_NAME);
    if (existingToken && verifyCSRFToken(existingToken)) {
      setToken(existingToken);
    } else {
      const newToken = generateCSRFToken();
      setCookie(CSRF_COOKIE_NAME, newToken, {
        httpOnly: false, // Needs to be accessible by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 // 24 hours
      });
      setToken(newToken);
    }
  }, []);
  
  return {
    token,
    headers: {
      [CSRF_HEADER_NAME]: token
    }
  };
}

// Helper functions for cookies
function getCookie(name: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift();
  }
  return undefined;
}

function setCookie(name: string, value: string, options: {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}) {
  if (typeof window === 'undefined') return;
  
  let cookie = `${name}=${value}`;
  
  if (options.maxAge) {
    cookie += `; max-age=${options.maxAge}`;
  }
  
  if (options.path) {
    cookie += `; path=${options.path}`;
  } else {
    cookie += '; path=/';
  }
  
  if (options.secure) {
    cookie += '; secure';
  }
  
  if (options.sameSite) {
    cookie += `; samesite=${options.sameSite}`;
  }
  
  document.cookie = cookie;
}

// API route wrapper with CSRF protection
export function withCSRFProtection(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const csrfCheck = await checkCSRF(req);
    
    if (!csrfCheck.valid) {
      return new Response(
        JSON.stringify({ error: csrfCheck.error || 'CSRF validation failed' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return handler(req);
  };
}
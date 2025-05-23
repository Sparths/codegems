// lib/session-manager.ts
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { LRUCache } from 'lru-cache';
import React from 'react';

interface Session {
  id: string;
  userId: string;
  data: Record<string, any>;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
}

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_COOKIE_NAME = '__session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_ABSOLUTE_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory session store (use Redis in production)
const sessionStore = new LRUCache<string, Session>({
  max: 10000,
  ttl: SESSION_DURATION,
});

// Create a new session
export async function createSession(userId: string, data: Record<string, any> = {}): Promise<{
  sessionId: string;
  token: string;
}> {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  
  const session: Session = {
    id: sessionId,
    userId,
    data,
    createdAt: now,
    expiresAt: now + SESSION_DURATION,
    lastActivity: now
  };
  
  sessionStore.set(sessionId, session);
  
  // Generate signed session token
  const token = signSessionToken(sessionId);
  
  return { sessionId, token };
}

// Get session by token
export async function getSession(token: string): Promise<Session | null> {
  const sessionId = verifySessionToken(token);
  if (!sessionId) return null;
  
  const session = sessionStore.get(sessionId);
  if (!session) return null;
  
  const now = Date.now();
  
  // Check if session is expired
  if (now > session.expiresAt) {
    sessionStore.delete(sessionId);
    return null;
  }
  
  // Check idle timeout
  if (now - session.lastActivity > SESSION_IDLE_TIMEOUT) {
    sessionStore.delete(sessionId);
    return null;
  }
  
  // Check absolute timeout
  if (now - session.createdAt > SESSION_ABSOLUTE_TIMEOUT) {
    sessionStore.delete(sessionId);
    return null;
  }
  
  // Update last activity
  session.lastActivity = now;
  sessionStore.set(sessionId, session);
  
  return session;
}

// Update session data
export async function updateSession(
  sessionId: string, 
  data: Partial<Session['data']>
): Promise<boolean> {
  const session = sessionStore.get(sessionId);
  if (!session) return false;
  
  session.data = { ...session.data, ...data };
  session.lastActivity = Date.now();
  sessionStore.set(sessionId, session);
  
  return true;
}

// Delete session
export async function deleteSession(sessionId: string): Promise<void> {
  sessionStore.delete(sessionId);
}

// Sign session token
function signSessionToken(sessionId: string): string {
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${sessionId}:${timestamp}`)
    .digest('hex');
  
  return Buffer.from(JSON.stringify({
    sessionId,
    timestamp,
    signature
  })).toString('base64');
}

// Verify session token
function verifySessionToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const { sessionId, timestamp, signature } = JSON.parse(decoded);
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(`${sessionId}:${timestamp}`)
      .digest('hex');
    
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )) {
      return null;
    }
    
    // Check token age (prevent replay attacks)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > SESSION_DURATION) {
      return null;
    }
    
    return sessionId;
  } catch {
    return null;
  }
}

// Cookie helpers for Next.js
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = cookies();
  
  (await cookieStore).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/'
  });
}

export async function getSessionFromCookie(): Promise<Session | null> {
  const cookieStore = cookies();
  const token = (await cookieStore).get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  return getSession(token);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  (await cookieStore).delete(SESSION_COOKIE_NAME);
}

// Session middleware for API routes
export function withSession(
  handler: (req: Request, session: Session) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    // Get session from cookie
    const cookieHeader = req.headers.get('cookie');
    if (!cookieHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse session cookie
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => c.split('='))
    );
    
    const token = cookies[SESSION_COOKIE_NAME];
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const session = await getSession(token);
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return handler(req, session);
  };
}

// React hook for session management
export function useSession() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    // Get session from API
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setSession(data.session || null);
      })
      .catch(() => {
        setSession(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);
  
  const logout = React.useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSession(null);
  }, []);
  
  return { session, loading, logout };
}
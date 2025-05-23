// lib/secure-token.ts
import crypto from 'crypto';

const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'default-secret-change-this';
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

interface TokenPayload {
  userId: string;
  isAdmin: boolean;
  timestamp: number;
}

export function createSecureAdminToken(userId: string): string {
  const payload: TokenPayload = {
    userId,
    isAdmin: true,
    timestamp: Date.now()
  };
  
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payloadString)
    .digest('hex');
  
  const token = Buffer.from(JSON.stringify({
    payload: payloadString,
    signature
  })).toString('base64');
  
  return token;
}

export function verifySecureAdminToken(token: string): { 
  isValid: boolean; 
  userId?: string;
  error?: string;
} {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const { payload: payloadString, signature } = JSON.parse(decoded);
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(payloadString)
      .digest('hex');
    
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )) {
      return { isValid: false, error: 'Invalid signature' };
    }
    
    // Parse and validate payload
    const payload: TokenPayload = JSON.parse(payloadString);
    
    // Check expiry
    const tokenAge = Date.now() - payload.timestamp;
    if (tokenAge > TOKEN_EXPIRY) {
      return { isValid: false, error: 'Token expired' };
    }
    
    // Check admin flag
    if (!payload.isAdmin) {
      return { isValid: false, error: 'Not an admin token' };
    }
    
    return { isValid: true, userId: payload.userId };
  } catch (error) {
    return { isValid: false, error: 'Invalid token format' };
  }
}
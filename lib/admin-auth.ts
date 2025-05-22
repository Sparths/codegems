// lib/admin-auth.ts
import supabase from './supabase';
import { NextRequest } from 'next/server';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  admin_level: number;
}

// Admin verification function
export async function verifyAdminAccess(request: NextRequest): Promise<{
  isValid: boolean;
  user?: AdminUser;
  error?: string;
}> {
  try {
    // Get authentication header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isValid: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
    if (!token) {
      return { isValid: false, error: 'Missing token' };
    }

    // In a real implementation, verify the JWT token
    // For now, we'll use a simple approach with session verification
    
    // Extract user ID from token (this is simplified - use proper JWT verification)
    const userId = extractUserIdFromToken(token);
    if (!userId) {
      return { isValid: false, error: 'Invalid token' };
    }

    // Check if user exists and is admin
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('id, username, email, is_admin, admin_level')
      .eq('id', userId)
      .eq('is_admin', true)
      .single();

    if (error || !user) {
      return { isValid: false, error: 'User not found or not authorized' };
    }

    return { isValid: true, user };
  } catch (error) {
    console.error('Admin verification error:', error);
    return { isValid: false, error: 'Internal server error' };
  }
}

// Extract user ID from token (simplified - implement proper JWT verification)
function extractUserIdFromToken(token: string): string | null {
  try {
    // This is a placeholder - implement proper JWT token verification
    // For now, we'll assume the token is base64 encoded user ID
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return decoded;
  } catch {
    return null;
  }
}

// Check if user has specific admin permissions
export async function hasAdminPermission(
  userId: string, 
  requiredLevel: number = 1
): Promise<boolean> {
  try {
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('admin_level, is_admin')
      .eq('id', userId)
      .eq('is_admin', true)
      .single();

    if (error || !user) {
      return false;
    }

    return user.admin_level >= requiredLevel;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

// Create admin session token
export function createAdminToken(userId: string): string {
  // This is simplified - implement proper JWT token creation
  const payload = {
    userId,
    timestamp: Date.now(),
    isAdmin: true
  };
  
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Verify admin token
export function verifyAdminToken(token: string): { isValid: boolean; userId?: string } {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded);
    
    // Check if token is not expired (1 hour expiry)
    const now = Date.now();
    const tokenAge = now - payload.timestamp;
    const oneHour = 60 * 60 * 1000;
    
    if (tokenAge > oneHour) {
      return { isValid: false };
    }
    
    return { isValid: true, userId: payload.userId };
  } catch {
    return { isValid: false };
  }
}
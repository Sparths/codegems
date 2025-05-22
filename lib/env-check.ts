// lib/env-check.ts
export function validateEnvironment() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'AUTHORIZED_ADMINS'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// For client-side environment validation
export function validateClientEnvironment() {
  if (typeof window !== 'undefined') {
    const requiredClientVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    const missing = requiredClientVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error(`Missing required client environment variables: ${missing.join(', ')}`);
      return false;
    }
  }
  return true;
}
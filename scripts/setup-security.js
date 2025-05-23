#!/usr/bin/env node

// scripts/setup-security.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate secure random secrets
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// Check if environment file exists
function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found!');
    console.log('Creating .env.local from template...\n');
    
    const templatePath = path.join(process.cwd(), '.env.local.example');
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, envPath);
      console.log('✅ Created .env.local from template');
    } else {
      console.log('❌ .env.local.example template not found');
      process.exit(1);
    }
  }
  
  return envPath;
}

// Update environment file with security secrets
function updateEnvFile(envPath) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  const secrets = {
    'ADMIN_TOKEN_SECRET': generateSecret(32),
    'SESSION_SECRET': generateSecret(32), 
    'CSRF_SECRET': generateSecret(32),
  };
  
  let updated = false;
  
  for (const [key, value] of Object.entries(secrets)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const placeholder = `${key}=your_very_secure_`;
    
    if (envContent.includes(placeholder) || !regex.test(envContent)) {
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
      console.log(`✅ Generated ${key}`);
      updated = true;
    } else {
      console.log(`⚠️  ${key} already set, skipping`);
    }
  }
  
  if (updated) {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Environment file updated with security secrets');
  } else {
    console.log('\n✅ All security secrets already configured');
  }
}

// Check required dependencies
function checkDependencies() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json not found!');
    process.exit(1);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = {
    'isomorphic-dompurify': '^2.15.0',
    'lru-cache': '^10.4.3',
  };
  
  const missingDeps = [];
  
  for (const [dep, version] of Object.entries(requiredDeps)) {
    if (!dependencies[dep]) {
      missingDeps.push(`${dep}@${version}`);
    }
  }
  
  if (missingDeps.length > 0) {
    console.log('❌ Missing required security dependencies:');
    missingDeps.forEach(dep => console.log(`   - ${dep}`));
    console.log('\nPlease install them with:');
    console.log(`npm install ${missingDeps.join(' ')}`);
    console.log('or');
    console.log(`yarn add ${missingDeps.join(' ')}`);
    process.exit(1);
  } else {
    console.log('✅ All required dependencies are installed');
  }
}

// Create security tables in Supabase
function createSecurityTablesSQL() {
  const sql = `
-- Security tables for Code Gems

-- Auth migrations table (tracks users who need to migrate)
CREATE TABLE IF NOT EXISTS auth_migrations (
  user_id TEXT PRIMARY KEY,
  migrated BOOLEAN DEFAULT FALSE,
  old_auth BOOLEAN DEFAULT TRUE,
  migrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project updates tracking table
CREATE TABLE IF NOT EXISTS project_updates (
  project_name TEXT PRIMARY KEY,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed
  last_attempted TIMESTAMP WITH TIME ZONE,
  last_successful TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting table (optional - using in-memory cache by default)
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  reset_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security log table
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- login_attempt, rate_limit_exceeded, csrf_failure, etc.
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_migrations_migrated ON auth_migrations(migrated);
CREATE INDEX IF NOT EXISTS idx_project_updates_status ON project_updates(status);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);

-- RLS policies
ALTER TABLE auth_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access these tables
CREATE POLICY "Service role only" ON auth_migrations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role only" ON project_updates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role only" ON rate_limits FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role only" ON security_logs FOR ALL USING (auth.role() = 'service_role');
`;
  
  const sqlFilePath = path.join(process.cwd(), 'setup-security-tables.sql');
  fs.writeFileSync(sqlFilePath, sql);
  
  console.log('✅ Generated SQL file: setup-security-tables.sql');
  console.log('   Run this in your Supabase SQL editor to create security tables');
}

// Check Supabase configuration
function checkSupabaseConfig() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = [];
  
  for (const varName of requiredVars) {
    const regex = new RegExp(`^${varName}=.+$`, 'm');
    if (!regex.test(envContent) || envContent.includes(`${varName}=your_supabase`)) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.log('❌ Missing Supabase configuration:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('\nPlease update your .env.local file with your Supabase credentials');
  } else {
    console.log('✅ Supabase configuration looks good');
  }
}

// Main setup function
function main() {
  console.log('🔒 Setting up security configuration for Code Gems\n');
  
  try {
    // 1. Check and create environment file
    const envPath = checkEnvFile();
    
    // 2. Update with security secrets
    updateEnvFile(envPath);
    
    // 3. Check dependencies
    console.log('\n📦 Checking dependencies...');
    checkDependencies();
    
    // 4. Check Supabase config
    console.log('\n🗄️  Checking Supabase configuration...');
    checkSupabaseConfig();
    
    // 5. Create SQL file for security tables
    console.log('\n📋 Creating security tables SQL...');
    createSecurityTablesSQL();
    
    console.log('\n🎉 Security setup completed!');
    console.log('\nNext steps:');
    console.log('1. Review your .env.local file');
    console.log('2. Update AUTHORIZED_ADMINS with your user ID');
    console.log('3. Run the setup-security-tables.sql in Supabase');
    console.log('4. Test your application');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
main();
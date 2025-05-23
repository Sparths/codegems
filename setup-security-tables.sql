
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

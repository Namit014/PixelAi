-- Add indexes for faster queries on frequently accessed tables

-- Index for projects table - optimize user's project queries sorted by update time
CREATE INDEX IF NOT EXISTS idx_projects_user_updated 
ON projects(user_id, updated_at DESC);

-- Index for projects table - optimize user's project queries sorted by creation time
CREATE INDEX IF NOT EXISTS idx_projects_user_created 
ON projects(user_id, created_at DESC);

-- Index for credits table - optimize user credit lookups
CREATE INDEX IF NOT EXISTS idx_credits_user 
ON credits(user_id);

-- Index for profiles table - optimize user profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user 
ON profiles(id);
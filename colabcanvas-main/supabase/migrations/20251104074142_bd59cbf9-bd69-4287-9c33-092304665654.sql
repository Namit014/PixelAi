-- Add last_accessed_at column to projects table for proper sorting
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_accessed_at timestamp with time zone DEFAULT now();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_last_accessed_at ON projects(last_accessed_at DESC);

-- Update existing projects to have last_accessed_at = updated_at
UPDATE projects SET last_accessed_at = updated_at WHERE last_accessed_at IS NULL;
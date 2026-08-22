-- Phase 1: Add template columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS template_category TEXT,
ADD COLUMN IF NOT EXISTS template_description TEXT,
ADD COLUMN IF NOT EXISTS remix_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS template_tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_is_template ON projects(is_template) WHERE is_template = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_template_category ON projects(template_category) WHERE template_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_remix_count ON projects(remix_count DESC) WHERE is_template = TRUE;

-- Add constraint to ensure template metadata is complete
ALTER TABLE projects 
ADD CONSTRAINT template_metadata_check 
CHECK (
  (is_template = FALSE) OR 
  (is_template = TRUE AND template_category IS NOT NULL)
);

-- Phase 2: Update RLS Policies for Templates
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- New policy: Users can view their own projects OR public templates
CREATE POLICY "Users can view own projects and public templates"
ON projects FOR SELECT
USING (
  user_id = auth.uid() OR 
  (is_template = TRUE)
);

-- Policy: Users can create projects, admins can mark as template
CREATE POLICY "Users can create projects"
ON projects FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

-- Policy: Users can update their projects, admins can manage templates
CREATE POLICY "Users can update own projects, admins can manage templates"
ON projects FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND
  (
    -- If not making it a template, allow
    (is_template = FALSE) OR
    -- If making it a template, must be admin
    (is_template = TRUE AND has_role(auth.uid(), 'admin'))
  )
);

-- Policy: Users can delete their projects, but templates only by admins
CREATE POLICY "Users can delete own projects, admins can delete templates"
ON projects FOR DELETE
USING (
  user_id = auth.uid() AND
  (
    (is_template = FALSE OR is_template IS NULL) OR
    (is_template = TRUE AND has_role(auth.uid(), 'admin'))
  )
);

-- Phase 3: Grant admin access to cohyve.in@gmail.com
INSERT INTO user_roles (user_id, role)
VALUES ('420609a9-d0cf-4ec3-b90c-5ced0247b3aa', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Phase 4: Set unlimited credits
UPDATE credits 
SET 
  balance = 999999,
  subscription_tier = 'enterprise',
  subscription_expires_at = '2099-12-31 23:59:59+00'
WHERE user_id = '420609a9-d0cf-4ec3-b90c-5ced0247b3aa';
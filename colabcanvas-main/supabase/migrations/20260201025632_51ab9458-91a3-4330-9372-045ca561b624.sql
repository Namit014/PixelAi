-- Create workflow_shares table
CREATE TABLE IF NOT EXISTS workflow_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  permission TEXT NOT NULL DEFAULT 'view',
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflow_collaborators table
CREATE TABLE IF NOT EXISTS workflow_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  permission TEXT NOT NULL DEFAULT 'view',
  joined_via_share_id UUID REFERENCES workflow_shares(id),
  cursor_color TEXT DEFAULT '#22c55e',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_online BOOLEAN DEFAULT false,
  UNIQUE(workflow_id, user_id)
);

-- Enable RLS on both tables
ALTER TABLE workflow_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS for workflow_shares: owners can manage, collaborators can view
CREATE POLICY "Workflow owners can manage shares"
ON workflow_shares
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workflows 
    WHERE workflows.id = workflow_shares.workflow_id 
    AND workflows.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflows 
    WHERE workflows.id = workflow_shares.workflow_id 
    AND workflows.user_id = auth.uid()
  )
);

-- RLS for workflow_collaborators: owners and collaborators can read
CREATE POLICY "Workflow members can view collaborators"
ON workflow_collaborators
FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM workflows 
    WHERE workflows.id = workflow_collaborators.workflow_id 
    AND workflows.user_id = auth.uid()
  )
);

-- Owners can insert/update/delete collaborators
CREATE POLICY "Workflow owners can manage collaborators"
ON workflow_collaborators
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workflows 
    WHERE workflows.id = workflow_collaborators.workflow_id 
    AND workflows.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflows 
    WHERE workflows.id = workflow_collaborators.workflow_id 
    AND workflows.user_id = auth.uid()
  )
);

-- Users can update their own online status
CREATE POLICY "Users can update own collaborator status"
ON workflow_collaborators
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Enable realtime for workflow_collaborators
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_collaborators;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_shares_workflow_id ON workflow_shares(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_shares_token ON workflow_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_workflow_collaborators_workflow_id ON workflow_collaborators(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_collaborators_user_id ON workflow_collaborators(user_id);
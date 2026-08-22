-- Create workflow comments table for canvas annotations
CREATE TABLE workflow_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE workflow_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on workflows they own
CREATE POLICY "Users can view comments on own workflows"
ON workflow_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workflows
    WHERE workflows.id = workflow_comments.workflow_id
    AND workflows.user_id = auth.uid()
  )
);

-- Users can create comments on workflows they own
CREATE POLICY "Users can create comments on own workflows"
ON workflow_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflows
    WHERE workflows.id = workflow_comments.workflow_id
    AND workflows.user_id = auth.uid()
  )
  AND auth.uid() = user_id
);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON workflow_comments
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON workflow_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_workflow_comments_workflow_id ON workflow_comments(workflow_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_comments;
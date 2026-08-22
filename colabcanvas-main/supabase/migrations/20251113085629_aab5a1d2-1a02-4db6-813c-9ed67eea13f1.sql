-- Create workflow_comment_replies table for threaded comments
CREATE TABLE workflow_comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES workflow_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE workflow_comment_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view replies on workflows they own"
  ON workflow_comment_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflow_comments wc
      JOIN workflows w ON w.id = wc.workflow_id
      WHERE wc.id = comment_id
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create replies on workflows they own"
  ON workflow_comment_replies FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM workflow_comments wc
      JOIN workflows w ON w.id = wc.workflow_id
      WHERE wc.id = comment_id
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own replies"
  ON workflow_comment_replies FOR DELETE
  USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_comment_replies_comment_id ON workflow_comment_replies(comment_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_comment_replies;
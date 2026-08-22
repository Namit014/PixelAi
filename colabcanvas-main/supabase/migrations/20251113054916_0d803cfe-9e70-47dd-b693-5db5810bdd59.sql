-- Workflows table
CREATE TABLE workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Workflow',
  description text,
  thumbnail_url text,
  is_template boolean DEFAULT false,
  is_public boolean DEFAULT false,
  template_category text,
  tags text[] DEFAULT ARRAY[]::text[],
  view_count integer DEFAULT 0,
  fork_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid
);

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Users can create own workflows
CREATE POLICY "Users can create own workflows" ON workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view own workflows and public templates
CREATE POLICY "Users can view own workflows and public templates" ON workflows
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

-- Users can update own workflows
CREATE POLICY "Users can update own workflows" ON workflows
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own workflows
CREATE POLICY "Users can delete own workflows" ON workflows
  FOR DELETE USING (auth.uid() = user_id);

-- Workflow nodes
CREATE TABLE workflow_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows ON DELETE CASCADE NOT NULL,
  node_id text NOT NULL,
  node_type text NOT NULL,
  position_x float NOT NULL,
  position_y float NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage nodes of own workflows" ON workflow_nodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workflows 
      WHERE workflows.id = workflow_nodes.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

-- Workflow edges
CREATE TABLE workflow_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows ON DELETE CASCADE NOT NULL,
  edge_id text NOT NULL,
  source_node_id text NOT NULL,
  source_handle text,
  target_node_id text NOT NULL,
  target_handle text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage edges of own workflows" ON workflow_edges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workflows 
      WHERE workflows.id = workflow_edges.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

-- Workflow executions
CREATE TABLE workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  status text DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  credits_used integer DEFAULT 0,
  error_message text,
  execution_data jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own executions" ON workflow_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own executions" ON workflow_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Node execution results
CREATE TABLE node_execution_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid REFERENCES workflow_executions ON DELETE CASCADE NOT NULL,
  node_id text NOT NULL,
  node_type text NOT NULL,
  status text DEFAULT 'pending',
  result_data jsonb,
  credits_used integer DEFAULT 0,
  execution_time_ms integer,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE node_execution_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view results of own executions" ON node_execution_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflow_executions 
      WHERE workflow_executions.id = node_execution_results.execution_id 
      AND workflow_executions.user_id = auth.uid()
    )
  );

-- Workflow versions
CREATE TABLE workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows ON DELETE CASCADE NOT NULL,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  change_description text
);

ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of own workflows" ON workflow_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflows 
      WHERE workflows.id = workflow_versions.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

-- Workflow forks
CREATE TABLE workflow_forks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_workflow_id uuid REFERENCES workflows NOT NULL,
  forked_workflow_id uuid REFERENCES workflows NOT NULL,
  forked_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workflow_forks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fork relationships" ON workflow_forks
  FOR SELECT USING (true);

CREATE POLICY "Users can create forks" ON workflow_forks
  FOR INSERT WITH CHECK (auth.uid() = forked_by);

-- Create indexes for performance
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_is_public ON workflows(is_public) WHERE is_public = true;
CREATE INDEX idx_workflow_nodes_workflow_id ON workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_edges_workflow_id ON workflow_edges(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_node_execution_results_execution_id ON node_execution_results(execution_id);

-- Trigger for updated_at
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_node_execution_results_updated_at
  BEFORE UPDATE ON node_execution_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
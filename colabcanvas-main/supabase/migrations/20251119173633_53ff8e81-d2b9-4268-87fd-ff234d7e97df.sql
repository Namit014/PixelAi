-- Design Tool Projects Table
CREATE TABLE design_tool_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Design',
  description TEXT,
  thumbnail_url TEXT,
  canvas_data JSONB DEFAULT '{}'::jsonb,
  template_id UUID,
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Design Tool Objects Table (Layers)
CREATE TABLE design_tool_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES design_tool_projects(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  layer_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, object_id)
);

-- Design Templates Table
CREATE TABLE design_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  thumbnail_url TEXT,
  canvas_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  is_public BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Collaboration Cursors Table (Realtime)
CREATE TABLE design_tool_cursors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES design_tool_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  color TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Design Tool Comments Table
CREATE TABLE design_tool_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES design_tool_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Design Tool Version History Table
CREATE TABLE design_tool_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES design_tool_projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT
);

-- Enable RLS
ALTER TABLE design_tool_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tool_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tool_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tool_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tool_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for design_tool_projects
CREATE POLICY "Users can view own projects"
  ON design_tool_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON design_tool_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON design_tool_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON design_tool_projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for design_tool_objects
CREATE POLICY "Users can view objects of own projects"
  ON design_tool_objects FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM design_tool_projects
    WHERE id = design_tool_objects.project_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can manage objects of own projects"
  ON design_tool_objects FOR ALL
  USING (EXISTS (
    SELECT 1 FROM design_tool_projects
    WHERE id = design_tool_objects.project_id
    AND user_id = auth.uid()
  ));

-- RLS Policies for design_templates
CREATE POLICY "Users can view public templates"
  ON design_templates FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create own templates"
  ON design_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates"
  ON design_templates FOR UPDATE
  USING (auth.uid() = created_by);

-- RLS Policies for design_tool_cursors
CREATE POLICY "Users can view cursors in accessible projects"
  ON design_tool_cursors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM design_tool_projects
    WHERE id = design_tool_cursors.project_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own cursors"
  ON design_tool_cursors FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for design_tool_comments
CREATE POLICY "Users can view comments in own projects"
  ON design_tool_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM design_tool_projects
    WHERE id = design_tool_comments.project_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create comments in accessible projects"
  ON design_tool_comments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM design_tool_projects
    WHERE id = design_tool_comments.project_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update own comments"
  ON design_tool_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for design_tool_versions
CREATE POLICY "Users can view versions of own projects"
  ON design_tool_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM design_tool_projects
    WHERE id = design_tool_versions.project_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "System can create versions"
  ON design_tool_versions FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_design_tool_projects_user_id ON design_tool_projects(user_id);
CREATE INDEX idx_design_tool_objects_project_id ON design_tool_objects(project_id);
CREATE INDEX idx_design_templates_category ON design_templates(category);
CREATE INDEX idx_design_tool_cursors_project_id ON design_tool_cursors(project_id);
CREATE INDEX idx_design_tool_comments_project_id ON design_tool_comments(project_id);
CREATE INDEX idx_design_tool_versions_project_id ON design_tool_versions(project_id);

-- Trigger for updated_at
CREATE TRIGGER update_design_tool_projects_updated_at
  BEFORE UPDATE ON design_tool_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_tool_comments_updated_at
  BEFORE UPDATE ON design_tool_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
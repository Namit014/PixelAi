-- Phase 1: Critical Interconnection Foundation
-- Unified asset storage for Canvas, Cosmo, and Brand Assets

-- Unified asset storage
CREATE TABLE design_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'logo', 'design', 'vector', 'template', 'icon', 'illustration')),
  source TEXT NOT NULL CHECK (source IN ('canvas', 'cosmo', 'brand', 'ai-generation', 'upload')),
  file_path TEXT NOT NULL,
  signed_url TEXT,
  signed_url_expires_at TIMESTAMPTZ,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_design_assets_user ON design_assets(user_id);
CREATE INDEX idx_design_assets_project ON design_assets(project_id);
CREATE INDEX idx_design_assets_type ON design_assets(asset_type);
CREATE INDEX idx_design_assets_source ON design_assets(source);

-- Export tracking
CREATE TABLE asset_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES design_assets(id) ON DELETE CASCADE,
  exported_from TEXT NOT NULL,
  exported_to TEXT NOT NULL,
  export_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_asset_exports_asset ON asset_exports(asset_id);
CREATE INDEX idx_asset_exports_from ON asset_exports(exported_from);
CREATE INDEX idx_asset_exports_to ON asset_exports(exported_to);

-- Cross-references
CREATE TABLE asset_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES design_assets(id) ON DELETE CASCADE,
  referenced_in_type TEXT NOT NULL,
  referenced_in_id UUID NOT NULL,
  usage_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_asset_references_asset ON asset_references(asset_id);
CREATE INDEX idx_asset_references_location ON asset_references(referenced_in_type, referenced_in_id);

-- RLS Policies
ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own design assets" 
ON design_assets FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create asset exports" 
ON asset_exports FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM design_assets WHERE id = asset_exports.asset_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view own asset exports" 
ON asset_exports FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM design_assets WHERE id = asset_exports.asset_id AND user_id = auth.uid())
);

CREATE POLICY "Users can create asset references" 
ON asset_references FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM design_assets WHERE id = asset_references.asset_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view own asset references" 
ON asset_references FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM design_assets WHERE id = asset_references.asset_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete own asset references" 
ON asset_references FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM design_assets WHERE id = asset_references.asset_id AND user_id = auth.uid())
);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_design_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_design_assets_timestamp
BEFORE UPDATE ON design_assets
FOR EACH ROW
EXECUTE FUNCTION update_design_assets_updated_at();
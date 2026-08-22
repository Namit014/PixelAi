-- Webhooks tables
CREATE TABLE brand_mcp_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_config_id UUID REFERENCES brand_mcp_configs(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  events JSONB DEFAULT '["brand.updated", "colors.changed", "typography.changed", "logo.added"]'::jsonb,
  secret TEXT,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE brand_mcp_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES brand_mcp_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  response_code INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version Control tables
CREATE TABLE brand_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, version_number)
);

ALTER TABLE brand_mcp_configs 
ADD COLUMN version_mode TEXT DEFAULT 'latest',
ADD COLUMN pinned_version_id UUID REFERENCES brand_versions(id);

-- Insights table
CREATE TABLE brand_mcp_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  suggestion TEXT,
  evidence JSONB,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace tables
CREATE TABLE brand_mcp_marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  mcp_config_id UUID NOT NULL REFERENCES brand_mcp_configs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  connection_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE brand_mcp_marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_id UUID REFERENCES brand_mcp_marketplace(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collections table
CREATE TABLE brand_mcp_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  brand_ids JSONB NOT NULL,
  default_brand_id UUID REFERENCES brands(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brand_mcp_configs
ADD COLUMN collection_id UUID REFERENCES brand_mcp_collections(id);

-- Indexes for performance
CREATE INDEX idx_webhook_deliveries_webhook ON brand_mcp_webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created ON brand_mcp_webhook_deliveries(created_at DESC);
CREATE INDEX idx_brand_versions_brand ON brand_versions(brand_id, version_number DESC);
CREATE INDEX idx_mcp_insights_brand ON brand_mcp_insights(brand_id, status);
CREATE INDEX idx_marketplace_category ON brand_mcp_marketplace(category, published_at DESC);
CREATE INDEX idx_marketplace_rating ON brand_mcp_marketplace(rating DESC);

-- RLS Policies
ALTER TABLE brand_mcp_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_mcp_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_mcp_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_mcp_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_mcp_marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_mcp_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage webhooks for own brands" ON brand_mcp_webhooks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_mcp_webhooks.brand_id AND brands.user_id = auth.uid())
  );

CREATE POLICY "Users can view webhook deliveries for own brands" ON brand_mcp_webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brand_mcp_webhooks w
      JOIN brands b ON b.id = w.brand_id
      WHERE w.id = brand_mcp_webhook_deliveries.webhook_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view versions for own brands" ON brand_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_versions.brand_id AND brands.user_id = auth.uid())
  );

CREATE POLICY "Users can view insights for own brands" ON brand_mcp_insights
  FOR ALL USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_mcp_insights.brand_id AND brands.user_id = auth.uid())
  );

CREATE POLICY "Users can manage marketplace for own brands" ON brand_mcp_marketplace
  FOR ALL USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_mcp_marketplace.brand_id AND brands.user_id = auth.uid())
  );

CREATE POLICY "Anyone can view published marketplace listings" ON brand_mcp_marketplace
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON brand_mcp_marketplace_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view reviews" ON brand_mcp_marketplace_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own collections" ON brand_mcp_collections
  FOR ALL USING (auth.uid() = user_id);

-- Trigger for auto-versioning
CREATE OR REPLACE FUNCTION create_brand_version_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM brand_versions WHERE brand_id = NEW.id;
  
  INSERT INTO brand_versions (brand_id, version_number, snapshot, changed_by)
  VALUES (
    NEW.id,
    next_version,
    jsonb_build_object(
      'name', NEW.name,
      'description', NEW.description,
      'brand_system_snapshot', NEW.brand_system_snapshot,
      'logo_primary_url', NEW.logo_primary_url,
      'logo_secondary_url', NEW.logo_secondary_url,
      'website_url', NEW.website_url,
      'industry', NEW.industry,
      'target_audience', NEW.target_audience,
      'brand_voice', NEW.brand_voice
    ),
    auth.uid()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_brand_version_on_update
AFTER UPDATE ON brands
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION create_brand_version_snapshot();
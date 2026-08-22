-- Create brand_mcp_configs table for MCP server configuration
CREATE TABLE brand_mcp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  config_name TEXT NOT NULL,
  api_key_hash TEXT UNIQUE,
  share_token TEXT UNIQUE,
  enabled_resources JSONB DEFAULT '["colors", "typography", "logos", "voice", "guidelines"]'::jsonb,
  enabled_tools JSONB DEFAULT '["validate_color", "check_font", "verify_logo"]'::jsonb,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create brand_mcp_usage table for tracking MCP requests
CREATE TABLE brand_mcp_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_config_id UUID REFERENCES brand_mcp_configs(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  resource_uri TEXT,
  client_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE brand_mcp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_mcp_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_mcp_configs
CREATE POLICY "Users can manage MCP configs for own brands"
  ON brand_mcp_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = brand_mcp_configs.brand_id
      AND brands.user_id = auth.uid()
    )
  );

-- RLS Policies for brand_mcp_usage
CREATE POLICY "Users can view MCP usage for own brands"
  ON brand_mcp_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = brand_mcp_usage.brand_id
      AND brands.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_brand_mcp_configs_brand_id ON brand_mcp_configs(brand_id);
CREATE INDEX idx_brand_mcp_configs_api_key ON brand_mcp_configs(api_key_hash);
CREATE INDEX idx_brand_mcp_configs_share_token ON brand_mcp_configs(share_token);
CREATE INDEX idx_brand_mcp_usage_brand_id ON brand_mcp_usage(brand_id);
CREATE INDEX idx_brand_mcp_usage_created_at ON brand_mcp_usage(created_at);
CREATE INDEX idx_brand_mcp_usage_mcp_config_id ON brand_mcp_usage(mcp_config_id);

-- Add trigger for updated_at
CREATE TRIGGER update_brand_mcp_configs_updated_at
  BEFORE UPDATE ON brand_mcp_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
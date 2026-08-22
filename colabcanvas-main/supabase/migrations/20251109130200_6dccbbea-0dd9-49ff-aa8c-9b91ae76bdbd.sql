-- ============================================
-- BRAND ASSET MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ============================================

-- 1. BRANDS TABLE
CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_primary_url text,
  logo_secondary_url text,
  description text,
  industry text,
  brand_voice text,
  target_audience text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_refined_at timestamptz DEFAULT now(),
  total_files_count integer DEFAULT 0,
  deleted_at timestamptz,
  deleted_by uuid,
  brand_system_snapshot jsonb DEFAULT '{
    "colors": {},
    "typography": {},
    "logo_variants": [],
    "imagery_style": {},
    "voice_tone": []
  }'::jsonb,
  CONSTRAINT brands_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_brands_user_id ON brands(user_id);
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_deleted_at ON brands(deleted_at) WHERE deleted_at IS NULL;

-- 2. BRAND SECTIONS TABLE
CREATE TABLE brand_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  section_name text NOT NULL,
  section_type text NOT NULL DEFAULT 'custom',
  icon_name text,
  display_order integer NOT NULL DEFAULT 0,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ai_context jsonb DEFAULT '{
    "purpose": "",
    "guidelines": [],
    "dos": [],
    "donts": []
  }'::jsonb
);

CREATE INDEX idx_brand_sections_brand_id ON brand_sections(brand_id);
CREATE INDEX idx_brand_sections_order ON brand_sections(brand_id, display_order);

-- 3. BRAND CONTENT BLOCKS TABLE
CREATE TABLE brand_content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES brand_sections(id) ON DELETE CASCADE NOT NULL,
  block_type text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_metadata jsonb DEFAULT '{
    "semantic_tags": [],
    "context": "",
    "usage_guidelines": "",
    "restrictions": []
  }'::jsonb
);

CREATE INDEX idx_brand_content_blocks_section_id ON brand_content_blocks(section_id);
CREATE INDEX idx_brand_content_blocks_order ON brand_content_blocks(section_id, display_order);
CREATE INDEX idx_brand_content_blocks_type ON brand_content_blocks(block_type);

-- 4. BRAND ASSETS TABLE
CREATE TABLE brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  section_id uuid REFERENCES brand_sections(id) ON DELETE SET NULL,
  block_id uuid REFERENCES brand_content_blocks(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  storage_url text NOT NULL,
  signed_url text,
  signed_url_expires_at timestamptz,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  asset_type text NOT NULL,
  asset_category text,
  width integer,
  height integer,
  duration integer,
  color_palette jsonb,
  semantic_tags text[] DEFAULT ARRAY[]::text[],
  usage_context text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

CREATE INDEX idx_brand_assets_brand_id ON brand_assets(brand_id);
CREATE INDEX idx_brand_assets_type ON brand_assets(asset_type);
CREATE INDEX idx_brand_assets_semantic_tags ON brand_assets USING GIN(semantic_tags);

-- 5. BRAND SHARES TABLE
CREATE TABLE brand_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  share_token text UNIQUE NOT NULL,
  share_name text,
  password_hash text,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  allowed_sections text[],
  download_enabled boolean DEFAULT true,
  views_count integer DEFAULT 0,
  last_viewed_at timestamptz,
  unique_visitors jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_brand_shares_token ON brand_shares(share_token);
CREATE INDEX idx_brand_shares_brand_id ON brand_shares(brand_id);
CREATE INDEX idx_brand_shares_active ON brand_shares(is_active) WHERE is_active = true;

-- 6. BRAND EXPORT HISTORY TABLE
CREATE TABLE brand_export_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  export_type text NOT NULL,
  export_data jsonb,
  exported_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_brand_export_history_brand_id ON brand_export_history(brand_id);
CREATE INDEX idx_brand_export_history_type ON brand_export_history(export_type);

-- ============================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================

-- BRANDS TABLE
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brands" ON brands
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create own brands" ON brands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brands" ON brands
  FOR UPDATE USING (auth.uid() = user_id);

-- BRAND SECTIONS TABLE
ALTER TABLE brand_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sections of own brands" ON brand_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = brand_sections.brand_id 
      AND brands.user_id = auth.uid()
    )
  );

-- BRAND CONTENT BLOCKS TABLE
ALTER TABLE brand_content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage blocks of own brands" ON brand_content_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brand_sections
      JOIN brands ON brands.id = brand_sections.brand_id
      WHERE brand_sections.id = brand_content_blocks.section_id
      AND brands.user_id = auth.uid()
    )
  );

-- BRAND ASSETS TABLE
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage assets of own brands" ON brand_assets
  FOR ALL USING (auth.uid() = user_id);

-- BRAND SHARES TABLE
ALTER TABLE brand_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own brand shares" ON brand_shares
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = brand_shares.brand_id 
      AND brands.user_id = auth.uid()
    )
  );

-- BRAND EXPORT HISTORY TABLE
ALTER TABLE brand_export_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export history" ON brand_export_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = brand_export_history.brand_id 
      AND brands.user_id = auth.uid()
    )
  );

-- ============================================
-- STORAGE BUCKET AND POLICIES
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload to own brands" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'brand-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own brand assets" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'brand-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own brand assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'brand-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for brands updated_at
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for brand_sections updated_at
CREATE TRIGGER update_brand_sections_updated_at BEFORE UPDATE ON brand_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for brand_content_blocks updated_at
CREATE TRIGGER update_brand_content_blocks_updated_at BEFORE UPDATE ON brand_content_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for brand_assets updated_at
CREATE TRIGGER update_brand_assets_updated_at BEFORE UPDATE ON brand_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for brand_shares updated_at
CREATE TRIGGER update_brand_shares_updated_at BEFORE UPDATE ON brand_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CUSTOM FUNCTIONS
-- ============================================

-- Update brand files count when assets are added/removed
CREATE OR REPLACE FUNCTION update_brand_files_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE brands SET total_files_count = total_files_count + 1 WHERE id = NEW.brand_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE brands SET total_files_count = total_files_count - 1 WHERE id = OLD.brand_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER brand_assets_count_trigger
  AFTER INSERT OR DELETE ON brand_assets
  FOR EACH ROW EXECUTE FUNCTION update_brand_files_count();

-- Update last_refined_at when content changes
CREATE OR REPLACE FUNCTION update_brand_last_refined()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE brands 
  SET last_refined_at = now() 
  WHERE id = (
    SELECT brand_id FROM brand_sections WHERE id = COALESCE(NEW.section_id, OLD.section_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER brand_content_refined_trigger
  AFTER INSERT OR UPDATE OR DELETE ON brand_content_blocks
  FOR EACH ROW EXECUTE FUNCTION update_brand_last_refined();

-- Auto-create default sections when brand is created
CREATE OR REPLACE FUNCTION create_default_brand_sections()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO brand_sections (brand_id, section_name, section_type, icon_name, display_order, is_default)
  VALUES
    (NEW.id, 'Overview', 'default', 'LayoutGrid', 0, true),
    (NEW.id, 'Logo', 'default', 'Image', 1, true),
    (NEW.id, 'Colours', 'default', 'Palette', 2, true),
    (NEW.id, 'Typography', 'default', 'Type', 3, true),
    (NEW.id, 'Photography', 'default', 'Camera', 4, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_brand_sections_trigger
  AFTER INSERT ON brands
  FOR EACH ROW EXECUTE FUNCTION create_default_brand_sections();

-- Generate unique slug from brand name
CREATE OR REPLACE FUNCTION generate_brand_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM brands WHERE slug = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER generate_brand_slug_trigger
  BEFORE INSERT OR UPDATE OF name ON brands
  FOR EACH ROW EXECUTE FUNCTION generate_brand_slug();
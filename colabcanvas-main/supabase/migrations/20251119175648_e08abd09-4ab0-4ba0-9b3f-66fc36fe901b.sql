-- Phase 7: Asset Management System Database Tables

-- Text templates library
CREATE TABLE IF NOT EXISTS design_text_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  text_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Design templates library
CREATE TABLE IF NOT EXISTS design_template_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  section TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  canvas_data JSONB NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  is_public BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Illustrations library
CREATE TABLE IF NOT EXISTS design_illustrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  svg_data TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stock photos
CREATE TABLE IF NOT EXISTS design_stock_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  photographer TEXT,
  source TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  is_trending BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Textures library
CREATE TABLE IF NOT EXISTS design_textures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  seamless BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User uploads folder management
CREATE TABLE IF NOT EXISTS design_user_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User uploaded assets
CREATE TABLE IF NOT EXISTS design_user_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  folder_id UUID REFERENCES design_user_folders(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail_url TEXT,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_text_templates_category ON design_text_templates(category);
CREATE INDEX IF NOT EXISTS idx_template_library_category ON design_template_library(category, section);
CREATE INDEX IF NOT EXISTS idx_illustrations_category ON design_illustrations(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_stock_photos_trending ON design_stock_photos(is_trending);
CREATE INDEX IF NOT EXISTS idx_textures_category ON design_textures(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_user_folders_user ON design_user_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_uploads_user ON design_user_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_uploads_folder ON design_user_uploads(folder_id);

-- Enable RLS
ALTER TABLE design_text_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_template_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_illustrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_stock_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_textures ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_user_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_user_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public assets (readable by all authenticated users)
CREATE POLICY "Public assets readable" ON design_text_templates FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "Public templates readable" ON design_template_library FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "Public illustrations readable" ON design_illustrations FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "Public photos readable" ON design_stock_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public textures readable" ON design_textures FOR SELECT TO authenticated USING (is_public = true);

-- RLS Policies for user folders and uploads
CREATE POLICY "Users manage own folders" ON design_user_folders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own uploads" ON design_user_uploads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Add brand_system column to artboards
ALTER TABLE artboards ADD COLUMN IF NOT EXISTS brand_system jsonb DEFAULT '{}';

-- Add brand_system column to projects (project-wide defaults)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS brand_system jsonb DEFAULT '{}';

-- Create brand_system_presets table
CREATE TABLE IF NOT EXISTS brand_system_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  is_default boolean DEFAULT false,
  brand_system jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_brand_systems table (for user-created presets)
CREATE TABLE IF NOT EXISTS user_brand_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand_system jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create style_guide_exports table
CREATE TABLE IF NOT EXISTS style_guide_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_format text NOT NULL,
  export_data jsonb NOT NULL,
  export_url text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Enable RLS
ALTER TABLE brand_system_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_brand_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_guide_exports ENABLE ROW LEVEL SECURITY;

-- Policies for presets (public read)
CREATE POLICY "Anyone can view default presets" ON brand_system_presets
  FOR SELECT USING (true);

-- Policies for user presets
CREATE POLICY "Users can view own brand systems" ON user_brand_systems
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own brand systems" ON user_brand_systems
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand systems" ON user_brand_systems
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand systems" ON user_brand_systems
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for style guide exports
CREATE POLICY "Users can view own exports" ON style_guide_exports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create exports" ON style_guide_exports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exports" ON style_guide_exports
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public can view exports by URL" ON style_guide_exports
  FOR SELECT USING (export_url IS NOT NULL);

-- Insert default presets
INSERT INTO brand_system_presets (name, category, is_default, brand_system) VALUES
('Tech Startup', 'tech', true, '{
  "colors": {
    "primary": {"hex": "#6366F1", "name": "Indigo"},
    "secondary": {"hex": "#8B5CF6", "name": "Purple"},
    "accent": {"hex": "#EC4899", "name": "Pink"}
  },
  "typography": {
    "primary_font": "Inter",
    "secondary_font": "Roboto Mono",
    "font_weights": [400, 600, 700]
  },
  "style": "modern minimalist tech",
  "logo_type": "wordmark + icon"
}'::jsonb),

('Fashion Brand', 'fashion', true, '{
  "colors": {
    "primary": {"hex": "#0F172A", "name": "Slate Black"},
    "secondary": {"hex": "#F8FAFC", "name": "Off White"},
    "accent": {"hex": "#D4AF37", "name": "Gold"}
  },
  "typography": {
    "primary_font": "Playfair Display",
    "secondary_font": "Montserrat",
    "font_weights": [300, 400, 700]
  },
  "style": "elegant sophisticated luxury",
  "logo_type": "combination mark"
}'::jsonb),

('Restaurant/Cafe', 'food', true, '{
  "colors": {
    "primary": {"hex": "#78350F", "name": "Brown"},
    "secondary": {"hex": "#FEF3C7", "name": "Cream"},
    "accent": {"hex": "#DC2626", "name": "Red"}
  },
  "typography": {
    "primary_font": "Pacifico",
    "secondary_font": "Open Sans",
    "font_weights": [400, 600]
  },
  "style": "warm inviting artisan",
  "logo_type": "emblem"
}'::jsonb),

('Healthcare', 'healthcare', true, '{
  "colors": {
    "primary": {"hex": "#0284C7", "name": "Blue"},
    "secondary": {"hex": "#10B981", "name": "Green"},
    "accent": {"hex": "#06B6D4", "name": "Cyan"}
  },
  "typography": {
    "primary_font": "Nunito Sans",
    "secondary_font": "Source Sans Pro",
    "font_weights": [400, 600, 700]
  },
  "style": "clean professional trustworthy",
  "logo_type": "abstract symbol"
}'::jsonb),

('Creative Agency', 'creative', true, '{
  "colors": {
    "primary": {"hex": "#FF6B6B", "name": "Coral Red"},
    "secondary": {"hex": "#4ECDC4", "name": "Turquoise"},
    "accent": {"hex": "#FFE66D", "name": "Yellow"}
  },
  "typography": {
    "primary_font": "Raleway",
    "secondary_font": "Poppins",
    "font_weights": [400, 600, 800]
  },
  "style": "bold vibrant playful",
  "logo_type": "lettermark"
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
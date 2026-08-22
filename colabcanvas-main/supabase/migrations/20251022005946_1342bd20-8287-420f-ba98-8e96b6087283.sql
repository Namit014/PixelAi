-- Create design template categories table
CREATE TABLE design_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  thumbnail_url TEXT,
  template_images JSONB DEFAULT '[]'::jsonb,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial categories
INSERT INTO design_template_categories (category_name, display_name, display_order) VALUES
  ('poster', 'Poster', 1),
  ('character', 'Character', 2),
  ('mockup', 'Mockup', 3),
  ('illustration', 'Illustration', 4),
  ('branding', 'Branding', 5);

-- Enable RLS
ALTER TABLE design_template_categories ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view active categories"
  ON design_template_categories FOR SELECT
  USING (is_active = true);

-- Admin write access
CREATE POLICY "Admins can manage categories"
  ON design_template_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for template images
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-instructions', 'template-instructions', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for template-instructions bucket
CREATE POLICY "Public read access to template instructions"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-instructions');

CREATE POLICY "Admins can upload template images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'template-instructions' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete template images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'template-instructions' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Add trigger for updated_at
CREATE TRIGGER update_design_template_categories_updated_at
  BEFORE UPDATE ON design_template_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
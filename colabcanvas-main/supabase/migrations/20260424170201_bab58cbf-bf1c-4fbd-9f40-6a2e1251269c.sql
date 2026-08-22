
-- Letterhead contract storage on talent projects
ALTER TABLE public.talent_projects 
  ADD COLUMN IF NOT EXISTS signed_contract_url TEXT,
  ADD COLUMN IF NOT EXISTS contract_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Allow 'contracted' status (current CHECK rejects it -> breaks contract draft)
ALTER TABLE public.talent_projects DROP CONSTRAINT IF EXISTS talent_projects_status_check;
ALTER TABLE public.talent_projects ADD CONSTRAINT talent_projects_status_check 
  CHECK (status IN ('intake','proposal','contracted','locked','paid','active','completed'));

-- Storage bucket for signed contract PDFs
INSERT INTO storage.buckets (id, name, public) 
  VALUES ('talent-contracts','talent-contracts', false) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "talent-contracts owner read" ON storage.objects;
CREATE POLICY "talent-contracts owner read" ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'talent-contracts' 
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

DROP POLICY IF EXISTS "talent-contracts service write" ON storage.objects;
CREATE POLICY "talent-contracts service write" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'talent-contracts');

DROP POLICY IF EXISTS "talent-contracts service update" ON storage.objects;
CREATE POLICY "talent-contracts service update" ON storage.objects FOR UPDATE 
  USING (bucket_id = 'talent-contracts');

-- Promo code scope (so admin can issue coupons that only apply to talent payments)
ALTER TABLE public.promo_codes 
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'all';

ALTER TABLE public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_scope_check;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_scope_check 
  CHECK (scope IN ('talent','ai','plan','all'));

-- Admin write access on promo codes
DROP POLICY IF EXISTS "promo_codes admin all" ON public.promo_codes;
CREATE POLICY "promo_codes admin all" ON public.promo_codes FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

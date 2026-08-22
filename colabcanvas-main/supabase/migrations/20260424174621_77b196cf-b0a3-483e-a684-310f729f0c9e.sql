-- 1. Widen credit_transactions to support real ledger event types
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'addition',
    'deduction',
    'generation',
    'vectorization',
    'collateral',
    'video_generation',
    'image_edit',
    'talent_deduction',
    'talent_payout',
    'escrow_lock',
    'escrow_refund',
    'refund',
    'bonus',
    'subscription'
  ));

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS balance_after integer;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_type
  ON public.credit_transactions(transaction_type);

-- 2. Canvas project version history
CREATE TABLE IF NOT EXISTS public.canvas_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  artboard_id uuid REFERENCES public.artboards(id) ON DELETE SET NULL,
  version_number integer NOT NULL,
  label text,
  source text NOT NULL DEFAULT 'manual',
  snapshot jsonb NOT NULL,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_canvas_versions_project
  ON public.canvas_versions(project_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_canvas_versions_artboard
  ON public.canvas_versions(artboard_id) WHERE artboard_id IS NOT NULL;

ALTER TABLE public.canvas_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canvas_versions owner select" ON public.canvas_versions;
CREATE POLICY "canvas_versions owner select" ON public.canvas_versions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "canvas_versions owner insert" ON public.canvas_versions;
CREATE POLICY "canvas_versions owner insert" ON public.canvas_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "canvas_versions owner delete" ON public.canvas_versions;
CREATE POLICY "canvas_versions owner delete" ON public.canvas_versions
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );
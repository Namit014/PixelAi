ALTER TABLE public.talent_escrow ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS talent_escrow_idem_unique
  ON public.talent_escrow (project_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
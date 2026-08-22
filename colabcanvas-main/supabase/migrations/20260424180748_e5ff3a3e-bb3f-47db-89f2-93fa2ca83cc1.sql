ALTER TABLE public.talent_escrow DROP CONSTRAINT IF EXISTS talent_escrow_amount_check;
ALTER TABLE public.talent_escrow ADD CONSTRAINT talent_escrow_amount_check CHECK (amount >= 0);
-- Create discount_codes table
CREATE TABLE public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  min_purchase_amount NUMERIC DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  applicable_plan_ids UUID[],
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create discount_code_usage table for tracking
CREATE TABLE public.discount_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id UUID,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  original_amount NUMERIC NOT NULL,
  discount_amount NUMERIC NOT NULL,
  final_amount NUMERIC NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);

-- Add discount columns to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES public.discount_codes(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS original_amount NUMERIC;

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_code_usage ENABLE ROW LEVEL SECURITY;

-- Discount codes policies (admins can manage, everyone can read active codes)
CREATE POLICY "Anyone can read active discount codes"
ON public.discount_codes FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage discount codes"
ON public.discount_codes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Discount code usage policies
CREATE POLICY "Users can view their own usage"
ON public.discount_code_usage FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage"
ON public.discount_code_usage FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert usage"
ON public.discount_code_usage FOR INSERT
WITH CHECK (true);

-- Create index for fast code lookup
CREATE INDEX idx_discount_codes_code ON public.discount_codes(code);
CREATE INDEX idx_discount_code_usage_code_user ON public.discount_code_usage(code_id, user_id);

-- Update trigger for discount_codes
CREATE TRIGGER update_discount_codes_updated_at
BEFORE UPDATE ON public.discount_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
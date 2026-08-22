-- Create invite_codes table
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CHECK (code ~ '^[A-Z0-9-]{6,20}$'),
  CHECK (current_uses <= max_uses OR max_uses IS NULL)
);

-- Index for fast lookups
CREATE INDEX idx_invite_codes_code ON public.invite_codes(code) WHERE is_active = true;

-- Table for tracking code usage
CREATE TABLE public.invite_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES public.invite_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  used_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_invite_code_usage_code_id ON public.invite_code_usage(code_id);
CREATE INDEX idx_invite_code_usage_user_id ON public.invite_code_usage(user_id);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_code_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invite_codes
CREATE POLICY "Admins can manage invite codes"
ON public.invite_codes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for invite_code_usage
CREATE POLICY "Admins can view invite code usage"
ON public.invite_code_usage
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own code usage"
ON public.invite_code_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Seed initial codes
INSERT INTO public.invite_codes (code, description, max_uses) VALUES
('COLAB-BETA-2024', 'Launch codes for early testers', NULL),
('FOUNDER-PASS', 'Unlimited founder access', NULL),
('TEAM-ALPHA', 'Team alpha testing', 50);
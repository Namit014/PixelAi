
CREATE TABLE public.social_oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state_token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  redirect_origin TEXT NOT NULL,
  code_verifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE public.social_oauth_states ENABLE ROW LEVEL SECURITY;

-- No public RLS policies — only service role accesses this table
CREATE INDEX idx_social_oauth_states_token ON public.social_oauth_states (state_token);
CREATE INDEX idx_social_oauth_states_expires ON public.social_oauth_states (expires_at);

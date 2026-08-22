-- Create table to store user-specific Pinterest OAuth tokens
CREATE TABLE public.pinterest_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.pinterest_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/update their own tokens
CREATE POLICY "Users manage own tokens"
  ON public.pinterest_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_pinterest_tokens_updated_at
  BEFORE UPDATE ON public.pinterest_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
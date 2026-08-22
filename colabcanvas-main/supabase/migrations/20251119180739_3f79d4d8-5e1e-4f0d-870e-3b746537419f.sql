-- Create design_tool_early_access table for early access signups
CREATE TABLE design_tool_early_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notified BOOLEAN DEFAULT false
);

-- Add check constraint for email format
ALTER TABLE design_tool_early_access 
ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add check constraint for full_name
ALTER TABLE design_tool_early_access 
ADD CONSTRAINT valid_full_name CHECK (length(trim(full_name)) >= 2);

-- Create indexes for performance
CREATE INDEX idx_early_access_email ON design_tool_early_access(email);
CREATE INDEX idx_early_access_submitted ON design_tool_early_access(submitted_at DESC);

-- Enable RLS
ALTER TABLE design_tool_early_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can insert (sign up)
CREATE POLICY "Anyone can sign up for early access"
ON design_tool_early_access
FOR INSERT
TO public
WITH CHECK (true);

-- Admins can view all signups
CREATE POLICY "Admins can view early access signups"
ON design_tool_early_access
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
-- Create credit_transactions table for tracking all credit additions and deductions
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('addition', 'deduction')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own credit transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);

-- Update deduct_credits function to log transactions
CREATE OR REPLACE FUNCTION public.deduct_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Credit deduction')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_balance integer;
BEGIN
  -- Get current balance with row lock
  SELECT balance INTO current_balance
  FROM credits
  WHERE user_id = _user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User credit record not found';
  END IF;
  
  -- Check if sufficient balance
  IF current_balance < _amount THEN
    RETURN false;
  END IF;
  
  -- Deduct credits
  UPDATE credits
  SET balance = balance - _amount,
      updated_at = NOW()
  WHERE user_id = _user_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (_user_id, _amount, 'deduction', _description);
  
  RETURN true;
END;
$$;

-- Update add_credits function to log transactions
CREATE OR REPLACE FUNCTION public.add_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Credit addition')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE credits
  SET balance = balance + _amount,
      updated_at = NOW()
  WHERE user_id = _user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User credit record not found';
  END IF;
  
  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (_user_id, _amount, 'addition', _description);
END;
$$;
-- Drop the vulnerable UPDATE policy that allows users to modify their own credits
DROP POLICY IF EXISTS "Users can update their own credits" ON public.credits;

-- Add explicit DENY policies for INSERT and DELETE
CREATE POLICY "Deny direct credit insertion"
  ON public.credits FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Deny credit deletion"
  ON public.credits FOR DELETE
  TO authenticated
  USING (false);

-- Create SECURITY DEFINER function for safe credit deduction
CREATE OR REPLACE FUNCTION public.deduct_credits(_user_id uuid, _amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  RETURN true;
END;
$$;

-- Create SECURITY DEFINER function for adding credits (used by payment verification)
CREATE OR REPLACE FUNCTION public.add_credits(_user_id uuid, _amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE credits
  SET balance = balance + _amount,
      updated_at = NOW()
  WHERE user_id = _user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User credit record not found';
  END IF;
END;
$$;
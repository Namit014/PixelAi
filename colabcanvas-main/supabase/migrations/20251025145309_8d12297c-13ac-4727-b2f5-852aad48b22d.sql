-- Fix credit manipulation vulnerability by adding authorization checks
-- This prevents unauthorized credit manipulation even if Edge Functions have vulnerabilities

-- Drop existing functions
DROP FUNCTION IF EXISTS public.add_credits(uuid, integer, text);
DROP FUNCTION IF EXISTS public.deduct_credits(uuid, integer, text);

-- Recreate add_credits with authorization checks
CREATE OR REPLACE FUNCTION public.add_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Credit addition'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate input amount
  IF _amount IS NULL OR _amount <= 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  -- Authorization check: Only admins can add credits to other users
  -- Users cannot add credits to themselves
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;
  
  -- Update credits
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
$function$;

-- Recreate deduct_credits with authorization checks
CREATE OR REPLACE FUNCTION public.deduct_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Credit deduction'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance integer;
  is_admin boolean;
BEGIN
  -- Validate input amount
  IF _amount IS NULL OR _amount <= 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  -- Authorization check: Users can only deduct their own credits
  -- Admins can deduct any user's credits
  IF NOT is_admin AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only deduct own credits';
  END IF;
  
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
$function$;
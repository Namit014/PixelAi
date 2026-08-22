-- Update deduct_credits and add_credits to populate balance_after.
-- Also add a helper to enrich the most recent ledger row for a user with metadata + custom event type.

CREATE OR REPLACE FUNCTION public.deduct_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Credit deduction'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_balance integer;
  new_balance integer;
  is_admin boolean;
BEGIN
  IF _amount IS NULL OR _amount <= 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only deduct own credits';
  END IF;

  SELECT balance INTO current_balance FROM credits WHERE user_id = _user_id FOR UPDATE;
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User credit record not found';
  END IF;
  IF current_balance < _amount THEN
    RETURN false;
  END IF;

  new_balance := current_balance - _amount;
  UPDATE credits SET balance = new_balance, updated_at = NOW() WHERE user_id = _user_id;

  INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
  VALUES (_user_id, _amount, 'deduction', _description, new_balance);

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_credits(_user_id uuid, _amount integer, _description text DEFAULT 'Credit addition'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_balance integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin privileges required';
  END IF;

  UPDATE credits SET balance = balance + _amount, updated_at = NOW() WHERE user_id = _user_id
  RETURNING balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'User credit record not found';
  END IF;

  INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
  VALUES (_user_id, _amount, 'addition', _description, new_balance);
END;
$function$;

-- Two-arg overload kept for back-compat (used by refund flow). Now also writes balance_after.
CREATE OR REPLACE FUNCTION public.add_credits(_user_id uuid, _amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_balance integer;
BEGIN
  UPDATE credits SET balance = balance + _amount, updated_at = NOW() WHERE user_id = _user_id
  RETURNING balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'User credit record not found';
  END IF;

  INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
  VALUES (_user_id, _amount, 'refund', 'Automatic refund', new_balance);
END;
$function$;

-- Helper: enrich most recent ledger entry for the user (within last 60 seconds)
-- with a domain-specific event type and metadata. Safe to call from any edge function
-- after a deduct_credits call.
CREATE OR REPLACE FUNCTION public.tag_last_credit_transaction(
  _user_id uuid,
  _event_type text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tx_id uuid;
BEGIN
  IF auth.uid() != _user_id AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id INTO tx_id FROM credit_transactions
  WHERE user_id = _user_id AND created_at > now() - interval '60 seconds'
  ORDER BY created_at DESC LIMIT 1;

  IF tx_id IS NULL THEN RETURN NULL; END IF;

  UPDATE credit_transactions
  SET transaction_type = _event_type,
      metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(_metadata, '{}'::jsonb)
  WHERE id = tx_id;

  RETURN tx_id;
END;
$function$;
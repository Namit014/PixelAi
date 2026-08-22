-- Add applicable_billing_periods column to discount_codes table
-- NULL = applies to all billing periods
-- ['monthly'] = monthly only
-- ['yearly'] = yearly only
-- ['monthly', 'yearly'] = both (same as NULL)
ALTER TABLE public.discount_codes 
ADD COLUMN IF NOT EXISTS applicable_billing_periods text[] DEFAULT NULL;
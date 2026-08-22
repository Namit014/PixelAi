-- Drop the old 2-parameter version of deduct_credits to resolve function overloading conflict
-- This leaves only the 3-parameter version which handles 2-param calls via default value
DROP FUNCTION IF EXISTS public.deduct_credits(uuid, integer);
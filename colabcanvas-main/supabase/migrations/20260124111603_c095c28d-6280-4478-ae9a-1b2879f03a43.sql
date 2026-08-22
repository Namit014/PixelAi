-- Update Starter plan price to ₹249/month
UPDATE subscription_plans 
SET price_inr = 249 
WHERE name = 'Starter';

-- Update handle_new_user function to give 10 credits instead of 100
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Changed from 100 to 10 credits for new users
  INSERT INTO public.credits (user_id, balance, subscription_tier)
  VALUES (NEW.id, 10, 'free');
  
  RETURN NEW;
END;
$function$;
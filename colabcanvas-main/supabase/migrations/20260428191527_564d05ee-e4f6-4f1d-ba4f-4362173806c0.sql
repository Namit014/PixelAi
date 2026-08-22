-- 1) Add fixed search_path to email queue helper functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- 2) Add deny-all RLS policy on social_oauth_states (only service role uses this table)
DROP POLICY IF EXISTS "Deny all client access to oauth states" ON public.social_oauth_states;
CREATE POLICY "Deny all client access to oauth states"
ON public.social_oauth_states
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 3) Remove broad public SELECT (listing) policies on public buckets.
--    Public buckets remain readable by direct URL; only listing/enumeration is blocked.
DROP POLICY IF EXISTS "Anyone can view reference images" ON storage.objects;
DROP POLICY IF EXISTS "Proposal images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view email assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view notification images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to template instructions" ON storage.objects;
DROP POLICY IF EXISTS "Tour assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "notif sounds public read" ON storage.objects;

-- 4) Revoke EXECUTE on internal SECURITY DEFINER functions from anon and authenticated.
--    Triggers and service-role edge functions still execute these as the postgres owner.
REVOKE EXECUTE ON FUNCTION public.create_brand_version_snapshot() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_brand_sections() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_brand_slug() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_brand_files_count() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_brand_last_refined() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_design_assets_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_reference_images_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_rumi_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_proposal_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_landing_slug() FROM anon, authenticated;

-- Email queue helpers (service-role only)
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;

-- Admin/service-role only privileged operations
REVOKE EXECUTE ON FUNCTION public.mark_payout_paid(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer, text) FROM anon, authenticated;
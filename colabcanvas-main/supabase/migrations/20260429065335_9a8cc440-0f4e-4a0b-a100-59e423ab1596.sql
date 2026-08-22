-- Revoke EXECUTE from internal trigger functions (never called from client)
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

-- Revoke EXECUTE from internal helper functions never invoked from client/edge code
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_project_payouts_total(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_verification_status(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_project_owner(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lookup_active_referral_code(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_escrow_credits(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_escrow_credits(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_talent_credits(uuid, integer, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer) FROM anon, authenticated; -- legacy 2-arg, only called internally

-- Tighten design-assets bucket SELECT policy to authenticated only
DROP POLICY IF EXISTS "Authenticated users can view own design assets" ON storage.objects;
CREATE POLICY "Authenticated users can view own design assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'design-assets'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
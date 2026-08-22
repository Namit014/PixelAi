DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'admin_actions',
    'brand_assets',
    'brands',
    'credit_transactions',
    'discount_code_usage',
    'discount_codes',
    'payments',
    'profiles',
    'projects',
    'revenue_metrics',
    'subscription_plans',
    'support_tickets',
    'uploaded_assets',
    'user_subscriptions',
    'workflows'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = table_name
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;

      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', table_name);
    END IF;
  END LOOP;
END $$;
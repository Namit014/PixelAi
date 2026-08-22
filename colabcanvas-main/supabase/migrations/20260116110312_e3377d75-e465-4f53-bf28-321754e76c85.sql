-- Add RLS policy for users to view their own payment status (for polling)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payments' 
    AND policyname = 'Users can view own payments'
  ) THEN
    CREATE POLICY "Users can view own payments" ON public.payments
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
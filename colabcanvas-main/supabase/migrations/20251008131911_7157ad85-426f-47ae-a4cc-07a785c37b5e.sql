-- Fix MISSING_RLS: Restrict design_generations INSERT to authenticated users only
DROP POLICY IF EXISTS "System can insert generations" ON public.design_generations;

CREATE POLICY "Users can insert their own generations"
ON public.design_generations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
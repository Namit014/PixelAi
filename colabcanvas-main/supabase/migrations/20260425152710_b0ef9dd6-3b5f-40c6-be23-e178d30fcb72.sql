CREATE OR REPLACE FUNCTION public.generate_landing_slug()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i int;
  candidate text;
  exists_already boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    candidate := result;
    SELECT EXISTS (SELECT 1 FROM public.published_landing_pages WHERE slug = candidate) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN candidate;
END;
$$;
import { createClient } from 'npm:@supabase/supabase-js@2';

export interface AuthResult {
  user: { id: string } | null;
  error?: string;
}

/**
 * Validate JWT using local getClaims() instead of remote getUser().
 * This is ~100x faster and doesn't depend on network calls to Auth API.
 */
export async function validateAuth(req: Request): Promise<AuthResult & { supabaseClient: any }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'No authorization header', supabaseClient: null };
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabaseClient.auth.getClaims(token);

  if (error || !data?.claims?.sub) {
    return { user: null, error: 'Invalid token', supabaseClient };
  }

  return { user: { id: data.claims.sub as string }, error: undefined, supabaseClient };
}

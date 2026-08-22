export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Credentials': 'true',
};

// Backward compatibility: getCorsHeaders now returns the same universal headers
export function getCorsHeaders(_origin?: string | null): Record<string, string> {
  return corsHeaders;
}

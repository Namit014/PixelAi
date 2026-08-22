// Server-side admin-only user directory
// Returns minimal profile fields for admin UI (including email), without granting broad client table access.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { error: 'Unauthorized' })
    }

    const token = authHeader.slice('Bearer '.length)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceKey) {
      console.error('Missing backend env vars')
      return json(500, { error: 'Server misconfigured' })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    // Cryptographically validate JWT and obtain user id
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      console.error('JWT validation failed', userError?.message)
      return json(401, { error: 'Invalid token' })
    }

    const userId = userData.user.id

    // Server-side authorization: must be admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    if (rolesError) {
      console.error('Role fetch failed', rolesError)
      return json(500, { error: 'Authorization failed' })
    }

    const isAdmin = (roles ?? []).some((r) => r.role === 'admin')
    if (!isAdmin) {
      return json(403, { error: 'Forbidden' })
    }

    // Minimal payload for admin user management UI
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, created_at, onboarding_completed, industry, company_size')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Failed to fetch users', usersError)
      return json(500, { error: 'Failed to fetch users' })
    }

    return json(200, { users: users ?? [] })
  } catch (err) {
    console.error('admin-list-users error', err)
    return json(500, { error: 'Unexpected error' })
  }
})

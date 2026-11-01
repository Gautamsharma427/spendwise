import { createClient } from '@supabase/supabase-js'
import { HttpError } from './errors.js'

export function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
}

export function createUserClient(accessToken) {
  if (!hasSupabaseConfig()) throw new HttpError(503, 'Supabase is not configured. Configure an authenticated workspace to use the persistent API.')
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

export async function cleanupMonitoringRetention() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(503, 'Supabase service credentials are not configured for monitoring retention cleanup.')
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  })
  const { error } = await supabase.rpc('cleanup_monitoring_retention')
  if (error) throw new HttpError(500, 'Monitoring retention cleanup failed. Apply the latest Supabase migration and retry.')
}

export async function resolveAuthenticatedUser(request) {
  const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new HttpError(401, 'A valid bearer token is required.')
  const supabase = createUserClient(token)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new HttpError(401, 'The bearer token is invalid or expired.')
  return { supabase, user }
}

export async function resolveUser(request) {
  const { supabase, user } = await resolveAuthenticatedUser(request)
  const { data: profile, error: profileError } = await supabase.from('users')
    .select('id, organization_id, name, email, role')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) throw new HttpError(403, 'The authenticated user is not associated with an organization.')
  const organizationId = profile?.organization_id
  if (!organizationId) throw new HttpError(403, 'The authenticated user is not associated with an organization.')
  return { supabase, user, profile, organizationId }
}

export async function getWorkspaceData(request) {
  const { supabase, organizationId } = request.workspace
  const results = await Promise.all([
    supabase.from('subscriptions').select('*').eq('organization_id', organizationId),
    supabase.from('licenses').select('*').eq('organization_id', organizationId),
    supabase.from('recommendations').select('*').eq('organization_id', organizationId),
  ])
  for (const { error } of results) if (error) throw new HttpError(500, 'Workspace data could not be loaded.')
  return results.map(({ data }) => data ?? [])
}

export async function requireWorkspace(request) {
  if (!request.workspace) request.workspace = await resolveUser(request)
  return request.workspace
}

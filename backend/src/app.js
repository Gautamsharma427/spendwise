import cors from 'cors'
import express from 'express'
import { createHash, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { asyncRoute, errorHandler, HttpError } from './errors.js'
import { generateWorkspaceRecommendations } from './recommendationEngine.js'
import {
  licenseInput,
  licensePatch,
  activityImportInput,
  monitoringEnrollmentInput,
  monitoringEnrollmentConsumeInput,
  monitoringAppMappingInput,
  monitoringIngestionInput,
  onboardingInput,
  recommendationAnalysisInput,
  parseInput,
  recommendationInput,
  recommendationPatch,
  subscriptionInput,
  toApiRow,
  toDatabaseRow,
  workspacePatch,
} from './validation.js'
import { getWorkspaceData, hasSupabaseConfig, requireWorkspace, resolveAuthenticatedUser } from './supabase.js'

function requireSupabaseConfig() {
  if (!hasSupabaseConfig()) throw new HttpError(503, 'Configure Supabase URL and anon key to enable authenticated persistent API storage.')
}

async function getRows(request, table) {
  const { supabase, organizationId } = await requireWorkspace(request)
  const { data, error } = await supabase.from(table).select('*').eq('organization_id', organizationId)
  if (error) throw new HttpError(500, `Could not load ${table}.`)
  return data.map(toApiRow)
}

function csvEscape(value) {
  const text = String(value ?? '')
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

function hashSecret(value) {
  return createHash('sha256').update(value).digest('hex')
}

function createAnonymousClient() {
  if (!hasSupabaseConfig()) throw new HttpError(503, 'Supabase is not configured.')
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  })
}

function requireDeviceToken(request) {
  const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token || token.length < 32 || token.length > 128) throw new HttpError(401, 'A valid monitoring device token is required.')
  return token
}

export function createApp() {
  const app = express()
  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (process.env.NODE_ENV === 'production' && !allowedOrigins.length) {
    throw new Error('CORS_ORIGIN must contain the production frontend origin.')
  }
  if (!allowedOrigins.length) allowedOrigins.push('http://localhost:5173')
  app.disable('x-powered-by')
  app.use(cors({ origin: allowedOrigins }))
  app.use(express.json({ limit: '1mb' }))
  app.use((request, response, next) => {
    const started = Date.now()
    response.on('finish', () => console.info(`${request.method} ${request.path} ${response.statusCode} ${Date.now() - started}ms`))
    next()
  })

  app.get('/api/v1/health', (_request, response) => response.json({
    data: {
      status: 'ok',
      storage: hasSupabaseConfig() ? 'supabase' : 'not_configured',
    },
  }))

  app.get('/api/v1/onboarding/status', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const { supabase, user } = await resolveAuthenticatedUser(request)
    const { data, error } = await supabase.rpc('current_user_workspace')
    if (error) throw new HttpError(500, 'Workspace onboarding status could not be loaded. Apply the latest Supabase migrations and try again.')
    response.json({
      data: {
        needsOrganization: !data,
        workspace: data,
        email: user.email,
        suggestedName: user.user_metadata?.name || '',
      },
    })
  }))

  app.post('/api/v1/onboarding/organization', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const input = parseInput(onboardingInput, request.body)
    const { supabase } = await resolveAuthenticatedUser(request)
    const { data, error } = await supabase.rpc('create_organization_for_current_user', {
      organization_name: input.organizationName,
      user_name: input.userName,
      organization_currency: input.currency,
    })
    if (error) {
      const alreadyProvisioned = error.code === '23505'
      throw new HttpError(alreadyProvisioned ? 409 : error.code === '42501' ? 403 : 400,
        alreadyProvisioned ? 'This account already has an organization. Refresh the page to continue.' : 'The organization could not be created. Check your details and confirm the latest Supabase migrations are applied.')
    }
    response.status(201).json({ data })
  }))

  app.get('/api/v1/workspace', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const { supabase, organizationId, profile } = await requireWorkspace(request)
    const { data: organization, error } = await supabase.from('organizations')
      .select('id, name, currency')
      .eq('id', organizationId)
      .single()
    if (error) throw new HttpError(500, 'Workspace profile could not be loaded.')
    response.json({
      data: {
        organization,
        user: { id: profile.id, name: profile.name, email: profile.email, role: profile.role },
      },
    })
  }))

  app.patch('/api/v1/workspace', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const input = parseInput(workspacePatch, request.body)
    const { supabase, organizationId, profile } = await requireWorkspace(request)
    if (profile.role !== 'admin') throw new HttpError(403, 'Only organization admins can update workspace profile settings.')

    let organization = null
    let user = { id: profile.id, name: profile.name, email: profile.email, role: profile.role }
    if (input.organization) {
      const { data, error } = await supabase.from('organizations')
        .update(input.organization)
        .eq('id', organizationId)
        .select('id, name, currency')
        .single()
      if (error) throw new HttpError(400, 'Organization settings could not be saved.')
      organization = data
    }
    if (input.user) {
      const { data, error } = await supabase.from('users')
        .update({ name: input.user.name })
        .eq('id', profile.id)
        .select('id, name, email, role')
        .single()
      if (error) throw new HttpError(400, 'User profile could not be saved.')
      user = data
    }
    if (!organization) {
      const { data, error } = await supabase.from('organizations')
        .select('id, name, currency')
        .eq('id', organizationId)
        .single()
      if (error) throw new HttpError(500, 'Workspace profile could not be loaded.')
      organization = data
    }
    response.json({ data: { organization, user } })
  }))

  app.delete('/api/v1/workspace/data', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const { supabase, organizationId, profile } = await requireWorkspace(request)
    if (profile.role !== 'admin') throw new HttpError(403, 'Only organization admins can clear workspace data.')
    const { error: recommendationError } = await supabase.from('recommendations')
      .delete()
      .eq('organization_id', organizationId)
    if (recommendationError) throw new HttpError(400, 'Workspace recommendations could not be cleared.')
    const { error: subscriptionError } = await supabase.from('subscriptions')
      .delete()
      .eq('organization_id', organizationId)
    if (subscriptionError) throw new HttpError(400, 'Workspace subscriptions and licenses could not be cleared.')
    response.status(204).end()
  }))

  app.get('/api/v1/dashboard/overview', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const [subscriptions, licenses, recommendations] = await getWorkspaceData(request)
    const monthlySpend = subscriptions.reduce((sum, item) => sum + Number(item.monthly_cost || 0), 0)
    const verifiedMonthlySavings = recommendations.filter((item) => item.status === 'Completed').reduce((sum, item) => sum + Number(item.verified_monthly_savings || 0), 0)
    response.json({ data: { monthlySpend, annualSpend: monthlySpend * 12, subscriptions: subscriptions.length, licenses: licenses.length, verifiedMonthlySavings } })
  }))

  app.get('/api/v1/dashboard/spending', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const subscriptions = await getRows(request, 'subscriptions')
    const byCategory = new Map()
    for (const item of subscriptions) byCategory.set(item.category || 'Other', (byCategory.get(item.category || 'Other') ?? 0) + Number(item.monthlyCost || 0))
    response.json({ data: { subscriptions, categories: [...byCategory].map(([category, monthlySpend]) => ({ category, monthlySpend })) } })
  }))

  app.get('/api/v1/dashboard/utilization', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const licenses = await getRows(request, 'licenses')
    response.json({ data: { total: licenses.length, assigned: licenses.filter((item) => item.assigned).length, active: licenses.filter((item) => item.assigned && item.lastActive && Date.now() - new Date(item.lastActive).getTime() <= 30 * 86_400_000).length } })
  }))

  app.get('/api/v1/subscriptions', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const rows = await getRows(request, 'subscriptions')
    response.json({ data: rows })
  }))

  app.post('/api/v1/subscriptions', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const input = parseInput(subscriptionInput, request.body)
    const { supabase, organizationId } = await requireWorkspace(request)
    const { data, error } = await supabase.from('subscriptions').insert({ ...toDatabaseRow(input), organization_id: organizationId }).select().single()
    if (error) throw new HttpError(error.code === '23505' ? 409 : 400, 'Subscription could not be created.')
    response.status(201).json({ data: toApiRow(data) })
  }))

  app.get('/api/v1/subscriptions/:id', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const { supabase, organizationId } = await requireWorkspace(request)
    const { data, error } = await supabase.from('subscriptions').select('*').eq('id', request.params.id).eq('organization_id', organizationId).maybeSingle()
    if (error) throw new HttpError(500, 'Subscription could not be loaded.')
    if (!data) throw new HttpError(404, 'Subscription not found.')
    response.json({ data: toApiRow(data) })
  }))

  app.put('/api/v1/subscriptions/:id', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const input = parseInput(subscriptionInput, request.body)
    const { supabase, organizationId } = await requireWorkspace(request)
    const { data, error } = await supabase.from('subscriptions').update(toDatabaseRow(input)).eq('id', request.params.id).eq('organization_id', organizationId).select().maybeSingle()
    if (error) throw new HttpError(400, 'Subscription could not be updated.')
    if (!data) throw new HttpError(404, 'Subscription not found.')
    response.json({ data: toApiRow(data) })
  }))

  app.delete('/api/v1/subscriptions/:id', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const { supabase, organizationId } = await requireWorkspace(request)
    const { data, error } = await supabase.from('subscriptions').delete().eq('id', request.params.id).eq('organization_id', organizationId).select('id').maybeSingle()
    if (error) throw new HttpError(400, 'Subscription could not be removed.')
    if (!data) throw new HttpError(404, 'Subscription not found.')
    response.status(204).end()
  }))

  app.get('/api/v1/licenses/inactive', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const days = Math.min(3650, Math.max(1, Number(request.query.days) || 90))
    const licenses = await getRows(request, 'licenses')
    const cutoff = Date.now() - days * 86_400_000
    response.json({ data: licenses.filter((license) => license.assigned && !license.excludedFromOptimization && license.lastActive && !Number.isNaN(new Date(license.lastActive).getTime()) && new Date(license.lastActive).getTime() < cutoff) })
  }))

  app.get('/api/v1/licenses', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    response.json({ data: await getRows(request, 'licenses') })
  }))

  app.get('/api/v1/licenses/:id', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const { supabase, organizationId } = await requireWorkspace(request)
    const { data, error } = await supabase.from('licenses').select('*').eq('id', request.params.id).eq('organization_id', organizationId).maybeSingle()
    if (error) throw new HttpError(500, 'License could not be loaded.')
    if (!data) throw new HttpError(404, 'License not found.')
    response.json({ data: toApiRow(data) })
  }))

  app.patch('/api/v1/licenses/:id', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const input = parseInput(licensePatch, request.body)
    const { supabase, organizationId } = await requireWorkspace(request)
    const { data, error } = await supabase.from('licenses')
      .update(toDatabaseRow(input))
      .eq('id', request.params.id)
      .eq('organization_id', organizationId)
      .select()
      .maybeSingle()
    if (error) throw new HttpError(400, 'License could not be updated.')
    if (!data) throw new HttpError(404, 'License not found.')
    response.json({ data: toApiRow(data) })
  }))

  app.post('/api/v1/import/subscriptions', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    if (!Array.isArray(request.body.records) || request.body.records.length > 5000) throw new HttpError(400, 'Provide at most 5,000 subscription records.')
    const records = request.body.records.map((record) => parseInput(subscriptionInput, record))
    const { supabase, organizationId } = await requireWorkspace(request)
    const { data, error } = await supabase.from('subscriptions').upsert(records.map((record) => ({ ...toDatabaseRow(record), organization_id: organizationId })), { onConflict: 'organization_id,app_name' }).select()
    if (error) throw new HttpError(400, 'Subscription import failed validation or contains conflicting records.')
    response.status(201).json({ data: data.map(toApiRow) })
  }))

  app.post('/api/v1/import/licenses', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    if (!Array.isArray(request.body.records) || request.body.records.length > 10000) throw new HttpError(400, 'Provide at most 10,000 license records.')
    const records = request.body.records.map((record) => parseInput(licenseInput, record))
    const { supabase, organizationId } = await requireWorkspace(request)
    const { data, error } = await supabase.from('licenses').upsert(records.map((record) => ({ ...toDatabaseRow(record), organization_id: organizationId })), { onConflict: 'organization_id,subscription_id,employee_email' }).select()
    if (error) throw new HttpError(400, 'License import failed validation or contains conflicting records.')
    response.status(201).json({ data: data.map(toApiRow) })
  }))

  app.post('/api/v1/usage/activity/import', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const records = parseInput(activityImportInput, request.body.records)
    const { supabase, profile } = await requireWorkspace(request)
    if (profile.role !== 'admin') throw new HttpError(403, 'Only organization admins can import employee usage activity.')
    const { data, error } = await supabase.rpc('import_license_activity', {
      activity_records: records.map((record) => ({
        license_id: record.licenseId,
        last_active: record.lastActive,
      })),
    })
    if (error) throw new HttpError(400, 'Usage activity could not be imported. Apply the latest Supabase migration and verify the license records.')
    const result = data[0] ?? { matched_count: 0, updated_count: 0 }
    response.json({
      data: {
        matchedCount: result.matched_count,
        updatedCount: result.updated_count,
        unmatchedCount: records.length - result.matched_count,
      },
    })
  }))

  app.post('/api/v1/monitoring/enrollments', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const input = parseInput(monitoringEnrollmentInput, request.body)
    const { supabase, profile } = await requireWorkspace(request)
    if (profile.role !== 'admin') throw new HttpError(403, 'Only organization admins can enroll monitoring devices.')
    const code = randomBytes(32).toString('base64url')
    const { data, error } = await supabase.rpc('create_monitoring_enrollment', {
      enrollment_code_hash: hashSecret(code),
      target_employee_email: input.employeeEmail,
      target_device_name: input.deviceName,
      enrollment_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    if (error || !data?.length) throw new HttpError(400, 'A device enrollment code could not be created.')
    response.status(201).json({
      data: {
        id: data[0].enrollment_id,
        employeeEmail: input.employeeEmail,
        deviceName: input.deviceName,
        code,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    })
  }))

  app.post('/api/v1/monitoring/enroll', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const { code } = parseInput(monitoringEnrollmentConsumeInput, request.body)
    const deviceToken = randomBytes(32).toString('base64url')
    const { data, error } = await createAnonymousClient().rpc('consume_monitoring_enrollment', {
      enrollment_code_hash: hashSecret(code),
      device_token_hash: hashSecret(deviceToken),
    })
    if (error || !data?.length) throw new HttpError(401, 'The enrollment code is invalid, expired, or already used.')
    response.status(201).json({
      data: {
        deviceId: data[0].device_id,
        employeeEmail: data[0].employee_email,
        deviceName: data[0].device_name,
        deviceToken,
      },
    })
  }))

  app.post('/api/v1/monitoring/activity', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const deviceToken = requireDeviceToken(request)
    const input = parseInput(monitoringIngestionInput, request.body)
    const { data, error } = await createAnonymousClient().rpc('ingest_monitoring_activity', {
      device_token_hash: hashSecret(deviceToken),
      request_batch_id: input.batchId,
      usage_records: input.records.map((record) => ({
        app_id: record.appId,
        activity_date: record.activityDate,
        active_seconds: record.activeSeconds,
      })),
    })
    if (error) {
      const unauthorized = error.code === '42501'
      throw new HttpError(unauthorized ? 401 : 400, unauthorized
        ? 'This monitoring device is not authorized.'
        : 'Usage activity could not be recorded. Check the device data and try again.')
    }
    response.json({ data: { accepted: data?.[0]?.accepted ?? false } })
  }))

  app.get('/api/v1/monitoring/overview', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const { supabase, profile } = await requireWorkspace(request)
    if (profile.role !== 'admin') throw new HttpError(403, 'Only organization admins can view monitoring data.')
    const { data, error } = await supabase.rpc('get_monitoring_overview')
    if (error) throw new HttpError(500, 'Monitoring data could not be loaded. Apply the latest Supabase migration and try again.')
    response.json({ data })
  }))

  app.put('/api/v1/monitoring/app-mappings', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const input = parseInput(monitoringAppMappingInput, request.body)
    const { supabase, profile } = await requireWorkspace(request)
    if (profile.role !== 'admin') throw new HttpError(403, 'Only organization admins can map monitored applications.')
    const { data, error } = await supabase.rpc('upsert_monitoring_app_mapping', {
      target_app_id: input.appId,
      target_subscription_id: input.subscriptionId,
    })
    if (error || !data) throw new HttpError(400, 'The monitored application could not be mapped to that subscription.')
    response.json({ data: { appId: input.appId, subscriptionId: input.subscriptionId } })
  }))

  app.delete('/api/v1/monitoring/devices/:id', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const { supabase, profile } = await requireWorkspace(request)
    if (profile.role !== 'admin') throw new HttpError(403, 'Only organization admins can revoke monitoring devices.')
    const { data, error } = await supabase.rpc('revoke_monitoring_device', { target_device_id: request.params.id })
    if (error) throw new HttpError(400, 'The monitoring device could not be revoked.')
    if (!data) throw new HttpError(404, 'Monitoring device not found.')
    response.status(204).end()
  }))

  app.get('/api/v1/recommendations', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    response.json({ data: await getRows(request, 'recommendations') })
  }))

  app.post('/api/v1/recommendations/analyze', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const { thresholds } = parseInput(recommendationAnalysisInput, request.body)
    const { supabase, organizationId, profile } = await requireWorkspace(request)
    if (profile.role !== 'admin') throw new HttpError(403, 'Only organization admins can generate and save recommendations.')
    const [subscriptions, licenses, existingRecommendations] = await getWorkspaceData(request)
    const { data: organization, error: organizationError } = await supabase.from('organizations')
      .select('currency')
      .eq('id', organizationId)
      .single()
    if (organizationError) throw new HttpError(500, 'Workspace currency could not be loaded.')
    const { data: monitoringOverview, error: monitoringError } = await supabase.rpc('get_monitoring_overview')
    if (monitoringError) throw new HttpError(500, 'Monitoring data could not be loaded. Apply the latest Supabase migration and try again.')
    const usageBySubscription = new Map()
    for (const activity of monitoringOverview?.usage ?? []) {
      if (!activity.subscriptionId) continue
      const summary = usageBySubscription.get(activity.subscriptionId) ?? {
        subscriptionId: activity.subscriptionId,
        activeSeconds: 0,
        activeDays: 0,
        lastActivityDate: activity.lastActivityDate,
        employees: new Set(),
      }
      summary.activeSeconds += Number(activity.activeSeconds) || 0
      summary.activeDays += Number(activity.activeDays) || 0
      summary.employees.add(activity.employeeEmail)
      if (activity.lastActivityDate > summary.lastActivityDate) summary.lastActivityDate = activity.lastActivityDate
      usageBySubscription.set(activity.subscriptionId, summary)
    }
    const monitoredUsage = [...usageBySubscription.values()].map(({ employees, ...summary }) => ({
      ...summary,
      employeeCount: employees.size,
    }))
    const generated = generateWorkspaceRecommendations(
      subscriptions,
      licenses,
      thresholds,
      organization.currency,
      monitoredUsage,
    )
    const identity = (item) => item.type === 'duplicate_application'
      ? `${item.type}:${item.title.trim().toLowerCase()}`
      : `${item.type}:${item.subscriptionId || item.subscription_id || ''}`
    const existing = new Set(existingRecommendations.map(identity))
    const records = generated.filter((item) => !existing.has(identity(item)))
    if (!records.length) return response.json({ data: [], message: 'No new recommendations were found.' })

    const { data, error } = await supabase.from('recommendations')
      .insert(records.map((record) => ({ ...toDatabaseRow(record), organization_id: organizationId })))
      .select()
    if (error) throw new HttpError(400, 'Mathematical recommendations could not be saved.')
    response.status(201).json({ data: data.map(toApiRow) })
  }))

  app.post('/api/v1/recommendations', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const records = parseInput(recommendationInput, request.body.records)
    const { supabase, organizationId } = await requireWorkspace(request)
    if (records.length === 0) return response.status(201).json({ data: [] })
    const { data, error } = await supabase.from('recommendations')
      .insert(records.map((record) => ({ ...toDatabaseRow(record), organization_id: organizationId })))
      .select()
    if (error) throw new HttpError(400, 'Recommendations could not be saved.')
    response.status(201).json({ data: data.map(toApiRow) })
  }))

  app.patch('/api/v1/recommendations/:id', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const input = parseInput(recommendationPatch, request.body)
    const { supabase, organizationId, user } = await requireWorkspace(request)
    const { data: current, error: currentError } = await supabase.from('recommendations').select('status').eq('id', request.params.id).eq('organization_id', organizationId).maybeSingle()
    if (currentError) throw new HttpError(500, 'Recommendation status could not be loaded.')
    if (!current) throw new HttpError(404, 'Recommendation not found.')
    const allowedTransitions = {
      Pending: ['Approved', 'Dismissed'],
      Approved: ['Completed'],
      Dismissed: [],
      Completed: [],
    }
    if (!allowedTransitions[current.status]?.includes(input.status)) {
      throw new HttpError(409, `A recommendation cannot transition from ${current.status} to ${input.status}.`)
    }
    const changes = { status: input.status, updated_at: new Date().toISOString() }
    if (input.status === 'Completed') changes.verified_monthly_savings = input.verifiedMonthlySavings
    const { data, error } = await supabase.from('recommendations').update(changes).eq('id', request.params.id).eq('organization_id', organizationId).select().maybeSingle()
    if (error) throw new HttpError(400, 'Recommendation could not be updated.')
    if (!data) throw new HttpError(404, 'Recommendation not found.')
    if (input.status === 'Approved' || input.status === 'Completed') {
      const { error: historyError } = await supabase.from('optimization_history').insert({
        organization_id: organizationId,
        recommendation_id: data.id,
        action: input.status.toLowerCase(),
        approved_by: user.id,
        completed_at: input.status === 'Completed' ? new Date().toISOString() : null,
        verified_monthly_savings: input.status === 'Completed' ? input.verifiedMonthlySavings : null,
        notes: input.notes ?? null,
      })
      if (historyError) throw new HttpError(500, 'Recommendation status was updated, but optimization history could not be recorded.')
    }
    response.json({ data: toApiRow(data) })
  }))

  app.get('/api/v1/reports/summary', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const [subscriptions, licenses, recommendations] = await getWorkspaceData(request)
    const monthlySpend = subscriptions.reduce((sum, item) => sum + Number(item.monthly_cost || 0), 0)
    const unusedLicenses = licenses.filter((item) => {
      if (!item.assigned || item.excluded_from_optimization || !item.last_active) return false
      const date = new Date(item.last_active)
      return !Number.isNaN(date.getTime()) && (Date.now() - date.getTime()) / 86_400_000 > 90
    })
    const potential = unusedLicenses.reduce((sum, item) => sum + (Number(item.monthly_cost) || 0), 0)
    const verified = recommendations.filter((item) => item.status === 'Completed').reduce((sum, item) => sum + (Number(item.verified_monthly_savings) || 0), 0)
    response.json({ data: { monthlySpend, annualSpend: monthlySpend * 12, potentialMonthlySavings: potential, verifiedMonthlySavings: verified, unusedLicenseCount: unusedLicenses.length, subscriptionCount: subscriptions.length } })
  }))

  app.get('/api/v1/reports/export', asyncRoute(async (request, response) => {
    requireSupabaseConfig()
    const [subscriptions, licenses, recommendations] = await getWorkspaceData(request)
    const rows = [
      ['record_type', 'application', 'vendor', 'category', 'monthly_cost', 'status', 'details'],
      ...subscriptions.map((item) => ['subscription', item.app_name, item.vendor, item.category, item.monthly_cost, item.status, `${item.assigned_seats}/${item.total_seats} seats; renewal ${item.renewal_date}`]),
      ...licenses.map((item) => ['license', item.app_name, '', '', item.monthly_cost ?? '', item.reclaimed_at ? 'reclaimed' : item.assigned ? 'assigned' : 'unassigned', `${item.employee_email || ''}; ${item.department}`]),
      ...recommendations.map((item) => ['recommendation', item.title, '', item.type, item.status === 'Completed' ? item.verified_monthly_savings : item.estimated_savings, item.status, item.explanation]),
    ]
    response.type('text/csv').attachment(`spendwise-report-${new Date().toISOString().slice(0, 10)}.csv`).send(rows.map((row) => row.map(csvEscape).join(',')).join('\r\n'))
  }))

  app.use((_request, _response, next) => next(new HttpError(404, 'API endpoint not found.')))
  app.use(errorHandler)
  return app
}

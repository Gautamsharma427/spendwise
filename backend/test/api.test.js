import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { generateWorkspaceRecommendations } from '../src/recommendationEngine.js'
import cleanupHandler from '../api/cron/cleanup.js'
import {
  activityImportInput,
  licensePatch,
  monitoringEnrollmentInput,
  monitoringAppMappingInput,
  monitoringIngestionInput,
  onboardingInput,
  parseInput,
  recommendationInput,
  workspacePatch,
} from '../src/validation.js'

let server
let url

before(async () => {
  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  url = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

function createResponseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    status(value) { this.statusCode = value; return this },
    json(value) { this.body = value; return this },
  }
}

describe('SpendWise API', () => {
  it('reports readiness without exposing credentials', async () => {
    const response = await fetch(`${url}/api/v1/health`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { data: { status: 'ok', storage: 'not_configured' } })
  })

  it('requires an explicit CORS origin in production', () => {
    const previousNodeEnv = process.env.NODE_ENV
    const previousCorsOrigin = process.env.CORS_ORIGIN
    process.env.NODE_ENV = 'production'
    delete process.env.CORS_ORIGIN
    try {
      assert.throws(() => createApp(), /CORS_ORIGIN must contain the production frontend origin/)
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = previousNodeEnv
      if (previousCorsOrigin === undefined) delete process.env.CORS_ORIGIN
      else process.env.CORS_ORIGIN = previousCorsOrigin
    }
  })

  it('rejects unauthenticated requests to private data', async () => {
    const response = await fetch(`${url}/api/v1/subscriptions`)
    assert.equal(response.status, 503)
    assert.equal((await response.json()).error.code, 'SERVICE_UNAVAILABLE')
  })

  it('keeps new workspace endpoints unavailable until Supabase is configured', async () => {
    for (const [path, method, body] of [
      ['/api/v1/workspace', 'GET'],
      ['/api/v1/workspace/data', 'DELETE'],
      ['/api/v1/onboarding/status', 'GET'],
      ['/api/v1/onboarding/organization', 'POST', { organizationName: 'Acme', userName: 'Admin' }],
      ['/api/v1/recommendations/analyze', 'POST', { thresholds: { lowActivityDays: 30, potentialDays: 60, highPriorityDays: 90 } }],
      ['/api/v1/usage/activity/import', 'POST', { records: [{ licenseId: '00000000-0000-4000-8000-000000000001', lastActive: '2026-10-25' }] }],
      ['/api/v1/monitoring/enrollments', 'POST', { employeeEmail: 'worker@example.com', deviceName: 'Workstation' }],
      ['/api/v1/monitoring/overview', 'GET'],
      ['/api/v1/monitoring/app-mappings', 'PUT', { appId: 'code.exe', subscriptionId: '00000000-0000-4000-8000-000000000001' }],
      ['/api/v1/monitoring/enroll', 'POST', { code: 'a'.repeat(43) }],
      ['/api/v1/monitoring/activity', 'POST', { batchId: '00000000-0000-4000-8000-000000000002', records: [{ appId: 'code.exe', activityDate: '2026-10-25', activeSeconds: 300 }] }],
      ['/api/v1/licenses/00000000-0000-4000-8000-000000000001', 'PATCH', { underReview: true }],
      ['/api/v1/recommendations', 'POST', { records: [] }],
    ]) {
      const response = await fetch(`${url}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      })
      assert.equal(response.status, 503)
    }
  })

  it('validates workspace, license, and persisted recommendation inputs', () => {
    assert.deepEqual(parseInput(activityImportInput, [{
      licenseId: '00000000-0000-4000-8000-000000000001',
      lastActive: '2026-10-25',
    }]), [{
      licenseId: '00000000-0000-4000-8000-000000000001',
      lastActive: '2026-10-25',
    }])
    assert.throws(() => parseInput(activityImportInput, [
      { licenseId: '00000000-0000-4000-8000-000000000001', lastActive: '2026-10-25' },
      { licenseId: '00000000-0000-4000-8000-000000000001', lastActive: '2026-10-26' },
    ]))
    assert.deepEqual(parseInput(monitoringEnrollmentInput, {
      employeeEmail: 'worker@example.com',
      deviceName: 'Workstation',
    }), {
      employeeEmail: 'worker@example.com',
      deviceName: 'Workstation',
    })
    assert.deepEqual(parseInput(monitoringAppMappingInput, {
      appId: 'Code Editor.exe',
      subscriptionId: '00000000-0000-4000-8000-000000000001',
    }), {
      appId: 'Code Editor.exe',
      subscriptionId: '00000000-0000-4000-8000-000000000001',
    })
    assert.deepEqual(parseInput(monitoringIngestionInput, {
      batchId: '00000000-0000-4000-8000-000000000002',
      records: [{ appId: 'code.exe', activityDate: '2026-10-25', activeSeconds: 300 }],
    }).records[0], {
      appId: 'code.exe',
      activityDate: '2026-10-25',
      activeSeconds: 300,
    })
    assert.throws(() => parseInput(monitoringIngestionInput, {
      batchId: '00000000-0000-4000-8000-000000000002',
      records: [
        { appId: 'code.exe', activityDate: '2026-10-25', activeSeconds: 300 },
        { appId: 'CODE.EXE', activityDate: '2026-10-25', activeSeconds: 300 },
      ],
    }))
    assert.deepEqual(parseInput(workspacePatch, {
      organization: { name: 'Acme', currency: 'USD' },
      user: { name: 'Admin' },
    }), {
      organization: { name: 'Acme', currency: 'USD' },
      user: { name: 'Admin' },
    })
    assert.deepEqual(parseInput(licensePatch, { reclaimedAt: null, underReview: true }), {
      reclaimedAt: null,
      underReview: true,
    })
    assert.equal(parseInput(recommendationInput, [{
      subscriptionId: null,
      type: 'duplicate_application',
      title: 'Review overlapping tools',
      priority: 'Medium',
    }])[0].estimatedSavings, 0)
    assert.deepEqual(parseInput(onboardingInput, {
      organizationName: 'Acme',
      userName: 'Admin',
    }), {
      organizationName: 'Acme',
      userName: 'Admin',
      currency: 'INR',
    })
  })

  it('returns clear errors for unknown paths', async () => {
    const response = await fetch(`${url}/api/v1/no-such-route`)
    assert.equal(response.status, 404)
  })
})

describe('Scheduled cleanup endpoint', () => {
  it('rejects methods other than GET', async () => {
    const response = createResponseRecorder()
    await cleanupHandler({ method: 'POST', headers: {} }, response)
    assert.equal(response.statusCode, 405)
    assert.equal(response.headers.Allow, 'GET')
  })

  it('requires the Vercel cron bearer secret', async () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'test-secret-with-sufficient-length'
    try {
      const response = createResponseRecorder()
      await cleanupHandler({ method: 'GET', headers: { authorization: 'Bearer invalid' } }, response)
      assert.equal(response.statusCode, 401)
    } finally {
      if (previousSecret === undefined) delete process.env.CRON_SECRET
      else process.env.CRON_SECRET = previousSecret
    }
  })
})

describe('Mathematical workspace recommendations', () => {
  it('calculates inactivity savings from eligible license costs and preserves employee privacy', () => {
    const subscriptionId = '00000000-0000-4000-8000-000000000001'
    const subscriptions = [{
      id: subscriptionId,
      app_name: 'Slack',
      category: 'Communication',
      monthly_cost: 100,
      total_seats: 10,
      assigned_seats: 2,
      renewal_date: '2099-12-01',
      status: 'Active',
    }]
    const licenses = [{
      subscription_id: subscriptionId,
      assigned: true,
      reclaimed_at: null,
      excluded_from_optimization: false,
      last_active: '2026-07-01',
      monthly_cost: 8,
      employee_email: 'private@example.com',
    }, {
      subscription_id: subscriptionId,
      assigned: true,
      reclaimed_at: null,
      excluded_from_optimization: true,
      last_active: '2026-01-01',
      monthly_cost: 40,
      employee_email: 'excluded@example.com',
    }]
    const result = generateWorkspaceRecommendations(
      subscriptions,
      licenses,
      { lowActivityDays: 30, potentialDays: 60, highPriorityDays: 90 },
      'USD',
      [],
      new Date('2026-11-01T00:00:00.000Z'),
    )
    const inactive = result.find((item) => item.type === 'unused_license')
    assert.ok(inactive)
    assert.equal(inactive.estimatedSavings, 8)
    assert.equal(inactive.priority, 'High')
    assert.match(inactive.evidence[0], /1 assigned license/)
    assert.doesNotMatch(JSON.stringify(inactive), /private@example\.com|excluded@example\.com/)
  })

  it('generates renewal, unassigned-seat, and same-category review recommendations deterministically', () => {
    const recommendations = generateWorkspaceRecommendations([
      {
        id: 'one',
        app_name: 'Tool One',
        category: 'Project Management',
        monthly_cost: 120,
        total_seats: 10,
        assigned_seats: 7,
        renewal_date: '2026-11-08',
        status: 'Active',
      },
      {
        id: 'two',
        app_name: 'Tool Two',
        category: 'Project Management',
        monthly_cost: 60,
        total_seats: 5,
        assigned_seats: 5,
        renewal_date: '2027-01-01',
        status: 'Active',
      },
    ], [], { lowActivityDays: 30, potentialDays: 60, highPriorityDays: 90 }, 'USD', [], new Date('2026-11-01T00:00:00.000Z'))
    assert.deepEqual(recommendations.map((item) => item.type).sort(), [
      'duplicate_application',
      'renewal_review',
      'unassigned_seats',
    ])
    assert.equal(recommendations.find((item) => item.type === 'renewal_review').priority, 'High')
    assert.equal(recommendations.find((item) => item.type === 'unassigned_seats').estimatedSavings, 36)
    assert.equal(recommendations.find((item) => item.type === 'duplicate_application').estimatedSavings, 0)
    assert.match(recommendations.find((item) => item.type === 'duplicate_application').explanation, /not confirmed feature overlap/)
  })

  it('does not classify missing or future activity as inactivity', () => {
    const result = generateWorkspaceRecommendations([{
      id: 'one',
      app_name: 'Tool One',
      category: 'Utilities',
      monthly_cost: 100,
      total_seats: 1,
      assigned_seats: 1,
      renewal_date: '2027-01-01',
      status: 'Active',
    }], [{
      subscription_id: 'one',
      assigned: true,
      reclaimed_at: null,
      excluded_from_optimization: false,
      last_active: '2026-12-01',
      monthly_cost: 100,
    }], { lowActivityDays: 30, potentialDays: 60, highPriorityDays: 90 }, 'INR', [], new Date('2026-11-01T00:00:00.000Z'))
    assert.equal(result.some((item) => item.type === 'unused_license'), false)
  })

  it('bounds total savings by subscription spend', () => {
    const result = generateWorkspaceRecommendations([{
      id: 'one',
      app_name: 'Tool One',
      category: 'Utilities',
      monthly_cost: 20,
      total_seats: 10,
      assigned_seats: 5,
      renewal_date: '2027-01-01',
      status: 'Active',
    }], [{
      subscription_id: 'one',
      assigned: true,
      reclaimed_at: null,
      excluded_from_optimization: false,
      last_active: '2026-01-01',
      monthly_cost: 50,
    }], { lowActivityDays: 30, potentialDays: 60, highPriorityDays: 90 }, 'INR', [], new Date('2026-11-01T00:00:00.000Z'))
    const inactive = result.find((item) => item.type === 'unused_license')
    const unassigned = result.find((item) => item.type === 'unassigned_seats')
    assert.equal(inactive.estimatedSavings, 20)
    assert.equal(unassigned.estimatedSavings, 0)
    assert.ok(inactive.estimatedSavings + unassigned.estimatedSavings <= 20)
  })
})

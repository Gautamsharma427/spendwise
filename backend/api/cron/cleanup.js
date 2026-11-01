import { timingSafeEqual } from 'node:crypto'
import { cleanupMonitoringRetention } from '../../src/supabase.js'

function isAuthorized(request, secret) {
  const authorization = request.headers.authorization ?? ''
  const expected = `Bearer ${secret}`
  const actualBytes = Buffer.from(authorization)
  const expectedBytes = Buffer.from(expected)
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('CRON_SECRET is not configured for monitoring retention cleanup.')
    return response.status(503).json({ error: 'Scheduled cleanup is not configured.' })
  }
  if (!isAuthorized(request, secret)) return response.status(401).json({ error: 'Unauthorized.' })

  try {
    await cleanupMonitoringRetention()
    return response.status(200).json({ data: { cleaned: true } })
  } catch (error) {
    console.error('Scheduled monitoring retention cleanup failed:', error)
    return response.status(500).json({ error: 'Monitoring retention cleanup failed.' })
  }
}

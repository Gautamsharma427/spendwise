import { z } from 'zod'

const nonNegative = z.coerce.number().finite().min(0)
const positiveInt = z.coerce.number().int().min(1)

export const subscriptionInput = z.object({
  appName: z.string().trim().min(1).max(120),
  vendor: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  monthlyCost: nonNegative,
  billingFrequency: z.enum(['monthly', 'quarterly', 'annually']).default('monthly'),
  totalSeats: positiveInt,
  assignedSeats: z.coerce.number().int().min(0),
  renewalDate: z.iso.date(),
  department: z.string().trim().max(120).default(''),
  owner: z.string().trim().max(200).default(''),
  status: z.enum(['Active', 'Trial', 'Inactive']).default('Active'),
}).refine((value) => value.assignedSeats <= value.totalSeats, {
  message: 'Assigned seats cannot exceed total seats.',
  path: ['assignedSeats'],
})

export const licenseInput = z.object({
  subscriptionId: z.uuid(),
  employeeEmail: z.email().max(254),
  employeeName: z.string().trim().max(120).default(''),
  department: z.string().trim().min(1).max(120),
  licenseType: z.string().trim().min(1).max(80),
  assigned: z.boolean(),
  lastActive: z.union([z.iso.date(), z.literal('')]).default(''),
  monthlyCost: nonNegative.nullable().default(null),
  excludedFromOptimization: z.boolean().default(false),
})

export const licensePatch = z.object({
  employeeEmail: z.union([z.email().max(254), z.literal('')]).optional(),
  employeeName: z.string().trim().max(120).optional(),
  department: z.string().trim().min(1).max(120).optional(),
  licenseType: z.string().trim().min(1).max(80).optional(),
  assigned: z.boolean().optional(),
  lastActive: z.union([z.iso.date(), z.literal('')]).optional(),
  monthlyCost: nonNegative.nullable().optional(),
  excludedFromOptimization: z.boolean().optional(),
  underReview: z.boolean().optional(),
  reclaimedAt: z.union([z.iso.datetime(), z.null()]).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one license field is required.')

export const recommendationInput = z.array(z.object({
  subscriptionId: z.uuid().nullable().optional(),
  type: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  explanation: z.string().trim().max(2000).default(''),
  evidence: z.array(z.string().max(300)).max(10).default([]),
  suggestedAction: z.string().trim().max(1000).default(''),
  estimatedSavings: nonNegative.default(0),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  status: z.literal('Pending').default('Pending'),
})).max(30)

export const recommendationAnalysisInput = z.object({
  thresholds: z.object({
    lowActivityDays: z.coerce.number().int().min(1).max(3650),
    potentialDays: z.coerce.number().int().min(1).max(3650),
    highPriorityDays: z.coerce.number().int().min(1).max(3650),
  }).refine((value) => value.lowActivityDays < value.potentialDays && value.potentialDays < value.highPriorityDays, {
    message: 'Activity thresholds must be in ascending order.',
  }),
})

export const activityImportInput = z.array(z.object({
  licenseId: z.uuid(),
  lastActive: z.iso.date(),
})).min(1).max(10000).superRefine((records, context) => {
  const seen = new Set()
  records.forEach((record, index) => {
    if (seen.has(record.licenseId)) {
      context.addIssue({
        code: 'custom',
        message: 'A license can appear only once in an activity import.',
        path: [index, 'licenseId'],
      })
    }
    seen.add(record.licenseId)
  })
})

export const monitoringEnrollmentInput = z.object({
  employeeEmail: z.email().max(254),
  deviceName: z.string().trim().min(1).max(120),
})

export const monitoringEnrollmentConsumeInput = z.object({
  code: z.string().min(32).max(128),
})

export const monitoringAppMappingInput = z.object({
  appId: z.string().regex(/^[A-Za-z0-9._ -]{1,120}$/),
  subscriptionId: z.uuid(),
})

export const monitoringIngestionInput = z.object({
  batchId: z.uuid(),
  records: z.array(z.object({
    appId: z.string().regex(/^[A-Za-z0-9._ -]{1,120}$/),
    activityDate: z.iso.date(),
    activeSeconds: z.coerce.number().int().min(0).max(86400),
  })).min(1).max(250).superRefine((records, context) => {
    const seen = new Set()
    records.forEach((record, index) => {
      const key = `${record.activityDate}:${record.appId.toLowerCase()}`
      if (seen.has(key)) {
        context.addIssue({
          code: 'custom',
          message: 'An app can appear only once per day in an activity batch.',
          path: [index, 'appId'],
        })
      }
      seen.add(key)
    })
  }),
})

export const recommendationPatch = z.object({
  status: z.enum(['Pending', 'Approved', 'Dismissed', 'Completed']),
  verifiedMonthlySavings: nonNegative.optional(),
  notes: z.string().trim().max(1000).optional(),
}).refine((value) => value.status !== 'Completed' || value.verifiedMonthlySavings !== undefined, {
  message: 'Verified monthly savings are required to complete an optimization.',
  path: ['verifiedMonthlySavings'],
})

export const workspacePatch = z.object({
  organization: z.object({
    name: z.string().trim().min(1).max(120),
    currency: z.string().regex(/^[A-Z]{3}$/),
  }).optional(),
  user: z.object({
    name: z.string().trim().min(1).max(120),
  }).optional(),
}).refine((value) => value.organization || value.user, 'At least one workspace field is required.')

export const onboardingInput = z.object({
  organizationName: z.string().trim().min(1).max(120),
  userName: z.string().trim().min(1).max(120),
  currency: z.string().regex(/^[A-Z]{3}$/).default('INR'),
})

export function parseInput(schema, value) {
  const result = schema.safeParse(value)
  if (!result.success) {
    const error = new Error(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '))
    error.status = 400
    throw error
  }
  return result.data
}

export function toDatabaseRow(value) {
  return Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => [
    key.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`),
    fieldValue,
  ]))
}

export function toApiRow(value) {
  return Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => [
    key.replace(/_([a-z])/g, (_, character) => character.toUpperCase()),
    fieldValue,
  ]))
}

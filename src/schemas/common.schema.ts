import { z } from 'zod'

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone number.')

export const optionalPhoneSchema = z
  .union([phoneSchema, z.literal('')])
  .optional()
  .transform((v) => (v ? v : undefined))

export const CONTACT_TYPES = ['REGISTERED_MEMBER', 'MANAGER', 'EXTERNAL_CONTACT'] as const
export const RELATIONSHIPS = ['Friend', 'Relative', 'Colleague', 'Family', 'Community Contact', 'Other'] as const

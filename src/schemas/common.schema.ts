import { z } from 'zod'
import { COUNTRIES } from '@/lib/countries'

/** Legacy free-text phone validation — kept for any caller not yet moved
 * to the country-picker pair below (e.g. CSV import rows, which map their
 * own optional country column separately — see import.schema.ts). */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone number.')

export const optionalPhoneSchema = z
  .union([phoneSchema, z.literal('')])
  .optional()
  .transform((v) => (v ? v : undefined))

const VALID_ISO2 = new Set(COUNTRIES.map((c) => c.iso2))

/** Paired with a local-number field (see localNumberSchema below) —
 * together these replace phoneSchema wherever CountryPhoneField is used.
 * Storing the ISO2 code (not the dial code) is what makes the derived
 * international number deterministic instead of guessed. */
export const countryIso2Schema = z.string().refine((v) => VALID_ISO2.has(v.toUpperCase()), 'Select a country.')

export const optionalCountryIso2Schema = z
  .union([countryIso2Schema, z.literal('')])
  .optional()
  .transform((v) => (v ? v.toUpperCase() : undefined))

/** Local (subscriber) number only — no country code, no "+", digits only.
 * 4-14 digits covers every real-world local number length without
 * hardcoding an exact length per country (that data only exists for the
 * original 7-country table, not the full ~195-country list). */
export const localNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{4,14}$/, 'Enter a valid local number (digits only, no country code).')

export const optionalLocalNumberSchema = z
  .union([localNumberSchema, z.literal('')])
  .optional()
  .transform((v) => (v ? v : undefined))

export const CONTACT_TYPES = ['REGISTERED_MEMBER', 'MANAGER', 'EXTERNAL_CONTACT'] as const
export const RELATIONSHIPS = ['Friend', 'Relative', 'Colleague', 'Family', 'Community Contact', 'Other'] as const

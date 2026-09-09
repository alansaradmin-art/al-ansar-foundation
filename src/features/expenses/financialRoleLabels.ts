import type { FinancialRoleCode } from '@/types'

export const FINANCIAL_ROLE_LABELS: Record<FinancialRoleCode, string> = {
  TREASURER: 'Treasurer',
  VICE_TREASURER: 'Vice Treasurer',
  PRESIDENT: 'President',
  VICE_PRESIDENT: 'Vice President',
  SECRETARY: 'Secretary',
  GENERAL_SECRETARY: 'General Secretary',
}

export const FINANCIAL_ROLE_CODES: FinancialRoleCode[] = [
  'TREASURER',
  'VICE_TREASURER',
  'PRESIDENT',
  'VICE_PRESIDENT',
  'SECRETARY',
  'GENERAL_SECRETARY',
]

import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Manager = Database['public']['Tables']['managers']['Row']
export type Member = Database['public']['Tables']['members']['Row']
export type Donation = Database['public']['Tables']['donations']['Row']
export type MonthlyFollowup = Database['public']['Tables']['monthly_followups']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']

export type {
  Role,
  ManagerStatus,
  MemberStatus,
  ContactType,
  PaymentMethod,
  FollowUpStatus,
  FollowUpMethod,
  ContactedPersonType,
} from './database'

/** month/year pair used throughout the app for "which period am I viewing" state. */
export interface Period {
  month: number
  year: number
}

export interface PaginatedResult<T> {
  rows: T[]
  count: number
}

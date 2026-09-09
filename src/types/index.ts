import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Manager = Database['public']['Tables']['managers']['Row']
export type Member = Database['public']['Tables']['members']['Row']
export type Donation = Database['public']['Tables']['donations']['Row']
export type MonthlyFollowup = Database['public']['Tables']['monthly_followups']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type MemberDocument = Database['public']['Tables']['member_documents']['Row']
export type Fund = Database['public']['Tables']['funds']['Row']
export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']
export type ExpensePaymentMethod = Database['public']['Tables']['payment_methods']['Row']
export type Beneficiary = Database['public']['Tables']['beneficiaries']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseAttachment = Database['public']['Tables']['expense_attachments']['Row']
export type ProfileFinancialRole = Database['public']['Tables']['profile_financial_roles']['Row']
export type ExpenseApproval = Database['public']['Tables']['expense_approvals']['Row']

export type {
  Role,
  ManagerStatus,
  MemberStatus,
  ContactType,
  PaymentMethod,
  DonationType,
  FollowUpStatus,
  FollowUpMethod,
  ContactedPersonType,
  ExpenseStatus,
  FinancialRoleCode,
  ApprovalAction,
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

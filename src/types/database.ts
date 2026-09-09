// Hand-authored to match supabase/migrations/*.sql. Once the project is
// linked to a live Supabase instance, this can be regenerated with:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
// and this file's shape should be kept in sync in the meantime.
//
// `Relationships: []` on every table and `Views: {}` on the schema are
// required by supabase-js's GenericSchema constraint — without them the
// Database generic silently collapses to `never` everywhere.

export type Role = 'ADMIN' | 'MANAGER'
export type ManagerStatus = 'ACTIVE' | 'INACTIVE'
export type MemberStatus = 'ACTIVE' | 'INACTIVE'
export type ContactType = 'REGISTERED_MEMBER' | 'MANAGER' | 'EXTERNAL_CONTACT'
export type PaymentMethod = 'CASH' | 'UPI' | 'ONLINE' | 'BANK_TRANSFER' | 'OTHER'
export type DonationType = 'ZAKAT' | 'SADAQAH' | 'FITRA' | 'GENERAL' | 'OTHER'
export type FollowUpStatus = 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_INTERESTED' | 'CALLBACK_REQUIRED'
export type FollowUpMethod = 'PHONE' | 'WHATSAPP' | 'IN_PERSON' | 'OTHER'
export type ContactedPersonType = 'MEMBER' | 'ADDED_BY' | 'REFERENCE_CONTACT' | 'OTHER'
export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED'
export type FinancialRoleCode = 'TREASURER' | 'VICE_TREASURER' | 'PRESIDENT' | 'VICE_PRESIDENT' | 'SECRETARY' | 'GENERAL_SECRETARY'
export type ApprovalAction = 'APPROVE' | 'REJECT'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          clerk_user_id: string
          email: string
          full_name: string
          role: Role
          manager_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          clerk_user_id: string
          email: string
          full_name: string
          role: Role
        }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
        Relationships: []
      }
      managers: {
        Row: {
          id: string
          full_name: string
          phone: string
          phone_country: string | null
          email: string
          status: ManagerStatus
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['managers']['Row']> & {
          full_name: string
          phone: string
          email: string
        }
        Update: Partial<Database['public']['Tables']['managers']['Row']>
        Relationships: []
      }
      members: {
        Row: {
          id: string
          member_id: string
          member_name: string
          father_name: string | null
          mobile_number: string | null
          mobile_country: string | null
          address: string | null
          added_by_type: ContactType | null
          added_by_id: string | null
          added_by_name: string | null
          added_by_phone: string | null
          added_by_country: string | null
          reference_contact_type: ContactType | null
          reference_contact_id: string | null
          reference_contact_name: string | null
          reference_contact_phone: string | null
          reference_contact_country: string | null
          reference_contact_relationship: string | null
          assigned_manager_id: string | null
          status: MemberStatus
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['members']['Row']> & {
          member_name: string
        }
        Update: Partial<Database['public']['Tables']['members']['Row']>
        Relationships: []
      }
      donations: {
        Row: {
          id: string
          donation_id: string
          member_id: string | null
          donation_date: string
          donation_month: number
          donation_year: number
          amount_inr: number
          payment_method: PaymentMethod
          donation_type: DonationType
          transaction_reference: string | null
          notes: string | null
          // Only ever set when member_id is null (an anonymous donation) —
          // a member donation's donor identity always comes from the
          // member record itself. See supabase/migrations/0037_donation_receipts.sql.
          donor_name: string | null
          // Maintained entirely by a database trigger (see
          // supabase/migrations/0042_fund_donation_bridge.sql) — always
          // kept in sync with donation_type. No application code sets
          // this directly; it's typed here only for read accuracy.
          fund_id: string | null
          recorded_by: string
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['donations']['Row']> & {
          donation_date: string
          donation_month: number
          donation_year: number
          amount_inr: number
          payment_method: PaymentMethod
          donation_type: DonationType
          recorded_by: string
        }
        Update: Partial<Database['public']['Tables']['donations']['Row']>
        Relationships: []
      }
      monthly_followups: {
        Row: {
          id: string
          member_id: string
          manager_id: string
          month: number
          year: number
          follow_up_date: string
          follow_up_status: FollowUpStatus
          follow_up_method: FollowUpMethod | null
          contacted_person_type: ContactedPersonType | null
          contacted_person_name: string | null
          contacted_person_phone: string | null
          contacted_person_country: string | null
          contacted_person_relationship: string | null
          remarks: string | null
          next_follow_up_date: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['monthly_followups']['Row']> & {
          member_id: string
          manager_id: string
          month: number
          year: number
          follow_up_date: string
          follow_up_status: FollowUpStatus
          created_by: string
        }
        Update: Partial<Database['public']['Tables']['monthly_followups']['Row']>
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          actor_profile_id: string | null
          action: string
          entity_type: string
          entity_id: string
          old_value: Record<string, unknown> | null
          new_value: Record<string, unknown> | null
          created_at: string
        }
        // Written only by api/_lib/auditLog.ts using the service-role key —
        // RLS still has no insert policy for authenticated/anon (0003_rls.sql),
        // so this type being non-empty doesn't loosen who can actually write
        // a row, only what the service-role-only caller is typed to send.
        Insert: Partial<Database['public']['Tables']['audit_logs']['Row']> & {
          action: string
          entity_type: string
          entity_id: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: unknown
          updated_by: string | null
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['app_settings']['Row']> & {
          key: string
          value: unknown
        }
        Update: Partial<Database['public']['Tables']['app_settings']['Row']>
        Relationships: []
      }
      member_documents: {
        Row: {
          id: string
          member_id: string
          file_name: string
          storage_path: string
          file_size: number
          content_type: string
          uploaded_by: string
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['member_documents']['Row']> & {
          member_id: string
          file_name: string
          storage_path: string
          file_size: number
          content_type: string
          uploaded_by: string
        }
        Update: Partial<Database['public']['Tables']['member_documents']['Row']>
        Relationships: []
      }
      funds: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['funds']['Row']> & {
          code: string
          name: string
        }
        Update: Partial<Database['public']['Tables']['funds']['Row']>
        Relationships: []
      }
      expense_categories: {
        Row: {
          id: string
          name: string
          group_label: string | null
          is_active: boolean
          sort_order: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['expense_categories']['Row']> & {
          name: string
        }
        Update: Partial<Database['public']['Tables']['expense_categories']['Row']>
        Relationships: []
      }
      payment_methods: {
        Row: {
          id: string
          name: string
          requires_reference: boolean
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['payment_methods']['Row']> & {
          name: string
        }
        Update: Partial<Database['public']['Tables']['payment_methods']['Row']>
        Relationships: []
      }
      beneficiaries: {
        Row: {
          id: string
          member_id: string | null
          display_name: string | null
          phone: string | null
          address: string | null
          is_confidential: boolean
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['beneficiaries']['Row']> & {
          created_by: string
        }
        Update: Partial<Database['public']['Tables']['beneficiaries']['Row']>
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          expense_number: string
          expense_date: string
          amount_inr: number
          fund_id: string
          category_id: string
          beneficiary_id: string | null
          paid_to: string | null
          payment_method_id: string | null
          transaction_reference: string | null
          purpose: string
          description: string | null
          status: ExpenseStatus
          created_by: string
          submitted_at: string | null
          required_approval_roles: FinancialRoleCode[] | null
          approved_at: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_reason: string | null
          approval_cycle: number
          paid_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancellation_reason: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['expenses']['Row']> & {
          expense_date: string
          amount_inr: number
          fund_id: string
          category_id: string
          purpose: string
          created_by: string
        }
        Update: Partial<Database['public']['Tables']['expenses']['Row']>
        Relationships: []
      }
      expense_attachments: {
        Row: {
          id: string
          expense_id: string
          file_name: string
          storage_path: string
          file_size: number
          content_type: string
          uploaded_by: string
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['expense_attachments']['Row']> & {
          expense_id: string
          file_name: string
          storage_path: string
          file_size: number
          content_type: string
          uploaded_by: string
        }
        Update: Partial<Database['public']['Tables']['expense_attachments']['Row']>
        Relationships: []
      }
      profile_financial_roles: {
        Row: {
          id: string
          profile_id: string
          role_code: FinancialRoleCode
          granted_by: string
          granted_at: string
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['profile_financial_roles']['Row']> & {
          profile_id: string
          role_code: FinancialRoleCode
          granted_by: string
        }
        Update: Partial<Database['public']['Tables']['profile_financial_roles']['Row']>
        Relationships: []
      }
      expense_approvals: {
        Row: {
          id: string
          expense_id: string
          approval_cycle: number
          role_code: FinancialRoleCode | null
          signer_id: string
          action: ApprovalAction
          is_override: boolean
          comment: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['expense_approvals']['Row']> & {
          expense_id: string
          approval_cycle: number
          signer_id: string
          action: ApprovalAction
        }
        Update: Partial<Database['public']['Tables']['expense_approvals']['Row']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_current_period: {
        Args: Record<string, never>
        Returns: { month: number; year: number; day: number }[]
      }
      is_pending_followup: {
        Args: { p_member_id: string; p_month: number; p_year: number }
        Returns: boolean
      }
      manager_dashboard_stats: {
        Args: { p_manager_id: string; p_month: number; p_year: number }
        Returns: {
          total_members: number
          active_members: number
          members_with_donation: number
          donation_amount: number
          donation_count: number
          completed_followups: number
          pending_followups: number
          zakat_amount: number
          sadaqah_amount: number
          fitra_amount: number
          general_or_other_amount: number
        }[]
      }
      admin_dashboard_stats: {
        Args: { p_month: number; p_year: number }
        Returns: {
          total_members: number
          active_members: number
          inactive_members: number
          total_managers: number
          total_donations: number
          total_donation_amount: number
          period_donation_amount: number
          period_donation_count: number
          completed_followups: number
          pending_followups: number
        }[]
      }
      manager_wise_report: {
        Args: { p_month: number; p_year: number; p_donation_type?: string | null }
        Returns: {
          manager_id: string
          manager_name: string
          assigned_members: number
          members_with_donation: number
          donation_count: number
          donation_amount: number
          completed_followups: number
          pending_followups: number
        }[]
      }
      month_wise_report: {
        Args: { p_year: number; p_donation_type?: string | null }
        Returns: {
          month: number
          year: number
          donation_count: number
          donation_amount: number
          completed_followups: number
          pending_followups: number
        }[]
      }
      list_pending_followups: {
        Args: { p_manager_id: string | null; p_month: number; p_year: number }
        Returns: Database['public']['Tables']['members']['Row'][]
      }
      list_open_followups: {
        Args: { p_manager_id: string | null; p_month: number; p_year: number }
        Returns: Database['public']['Tables']['members']['Row'][]
      }
      is_pending_followup_batch: {
        Args: { p_member_ids: string[]; p_month: number; p_year: number }
        Returns: { member_id: string; is_pending: boolean }[]
      }
      members_needing_attention: {
        Args: { p_manager_id: string | null; p_month: number; p_year: number; p_limit?: number }
        Returns: {
          id: string
          member_id: string
          member_name: string
          father_name: string | null
          mobile_number: string | null
          assigned_manager_id: string | null
          manager_name: string | null
          status: string
          updated_at: string
          is_pending_followup: boolean
          is_inactive: boolean
          no_recent_donation: boolean
        }[]
      }
      member_growth_trend: {
        Args: { p_year: number }
        Returns: {
          month: number
          year: number
          new_members: number
        }[]
      }
      donation_engagement_report: {
        Args: { p_date_from: string | null; p_date_to: string | null; p_never_donated?: boolean }
        Returns: {
          member_id: string
          member_name: string
          father_name: string | null
          mobile_number: string | null
          mobile_country: string | null
          member_display_id: string
          assigned_manager_id: string | null
          manager_name: string | null
          donated: boolean
          donation_count: number
          total_amount: number
          latest_donation_date: string | null
        }[]
      }
      admin_overdue_followups: {
        Args: { p_manager_id: string | null; p_month: number; p_year: number }
        Returns: {
          member_id: string
          member_name: string
          father_name: string | null
          member_display_id: string
          assigned_manager_id: string | null
          manager_name: string | null
          last_follow_up_date: string | null
          last_follow_up_status: string | null
        }[]
      }
      admin_open_followups: {
        Args: { p_manager_id: string | null; p_month: number; p_year: number }
        Returns: {
          member_id: string
          member_name: string
          father_name: string | null
          member_display_id: string
          assigned_manager_id: string | null
          manager_name: string | null
          last_follow_up_date: string | null
          last_follow_up_status: string | null
        }[]
      }
      stale_active_member_ids: {
        Args: Record<string, never>
        Returns: { member_id: string }[]
      }
      member_last_donation_dates: {
        Args: { p_member_ids: string[] }
        Returns: { member_id: string; last_donation_date: string | null }[]
      }
      fund_balance: {
        Args: { p_fund_id: string; p_as_of?: string }
        Returns: number
      }
      fund_balances_summary: {
        Args: { p_as_of?: string }
        Returns: {
          fund_id: string
          fund_code: string
          fund_name: string
          donations_total: number
          expenses_total: number
          balance: number
        }[]
      }
      expense_dashboard_stats: {
        Args: { p_month: number; p_year: number }
        Returns: {
          total_expenses_amount: number
          total_expenses_count: number
          period_expenses_amount: number
          period_expenses_count: number
          pending_approval_count: number
          approved_count: number
          period_rejected_count: number
          period_cancelled_count: number
          total_donations_amount: number
          available_balance: number
        }[]
      }
      expense_category_breakdown: {
        Args: { p_month: number; p_year: number }
        Returns: { category_id: string; category_name: string; amount: number; expense_count: number }[]
      }
      expense_fund_breakdown: {
        Args: { p_month: number; p_year: number }
        Returns: { fund_id: string; fund_name: string; amount: number; expense_count: number }[]
      }
      expense_monthly_trend: {
        Args: { p_year: number }
        Returns: { month: number; year: number; amount: number; expense_count: number }[]
      }
      manager_followup_report: {
        Args: { p_date_from: string | null; p_date_to: string | null }
        Returns: {
          manager_id: string
          manager_name: string
          assigned_members: number
          pending_count: number
          started_count: number
          in_progress_count: number
          completed_count: number
          not_interested_count: number
          callback_required_count: number
          other_count: number
          total_followups: number
        }[]
      }
    }
  }
}

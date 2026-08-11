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
export type FollowUpStatus = 'NOT_STARTED' | 'COMPLETED' | 'NOT_INTERESTED' | 'CALLBACK_REQUIRED' | 'OTHER'
export type FollowUpMethod = 'PHONE' | 'WHATSAPP' | 'IN_PERSON' | 'OTHER'
export type ContactedPersonType = 'MEMBER' | 'ADDED_BY' | 'REFERENCE_CONTACT' | 'OTHER'

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
          address: string | null
          added_by_type: ContactType | null
          added_by_id: string | null
          added_by_name: string | null
          added_by_phone: string | null
          reference_contact_type: ContactType | null
          reference_contact_id: string | null
          reference_contact_name: string | null
          reference_contact_phone: string | null
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
          member_id: string
          donation_date: string
          donation_month: number
          donation_year: number
          amount_inr: number
          payment_method: PaymentMethod
          transaction_reference: string | null
          notes: string | null
          recorded_by: string
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['donations']['Row']> & {
          member_id: string
          donation_date: string
          donation_month: number
          donation_year: number
          amount_inr: number
          payment_method: PaymentMethod
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
          contacted_person_relationship: string | null
          remarks: string | null
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
        Args: { p_month: number; p_year: number }
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
        Args: { p_year: number }
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
      is_pending_followup_batch: {
        Args: { p_member_ids: string[]; p_month: number; p_year: number }
        Returns: { member_id: string; is_pending: boolean }[]
      }
    }
  }
}

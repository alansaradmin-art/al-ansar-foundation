/** Centralized query keys so invalidation after a mutation is consistent
 * across every screen that reads the same data — e.g. recording a donation
 * must invalidate that member's donations AND the pending-followups list. */
export const queryKeys = {
  members: {
    list: (params: unknown) => ['members', 'list', params] as const,
    detail: (id: string) => ['members', 'detail', id] as const,
    picker: (query: string) => ['members', 'picker', query] as const,
  },
  donations: {
    forMember: (memberId: string) => ['donations', 'member', memberId] as const,
    adminList: (filters: unknown) => ['donations', 'admin-list', filters] as const,
  },
  followups: {
    forMember: (memberId: string) => ['followups', 'member', memberId] as const,
    pending: (managerId: string | undefined, month: number, year: number) =>
      ['followups', 'pending', managerId, month, year] as const,
    adminList: (filters: unknown) => ['followups', 'admin-list', filters] as const,
  },
  managers: {
    list: (params: unknown) => ['managers', 'list', params] as const,
    detail: (id: string) => ['managers', 'detail', id] as const,
  },
  dashboard: {
    manager: (managerId: string, month: number, year: number) =>
      ['dashboard', 'manager', managerId, month, year] as const,
    admin: (month: number, year: number) => ['dashboard', 'admin', month, year] as const,
    managerWiseReport: (month: number, year: number) => ['reports', 'manager-wise', month, year] as const,
    monthWiseReport: (year: number) => ['reports', 'month-wise', year] as const,
    monthlyDonationReport: (month: number, year: number) => ['reports', 'monthly-donation', month, year] as const,
  },
  settings: {
    currentPeriod: ['settings', 'current-period'] as const,
    pendingDay: ['settings', 'pending-day'] as const,
  },
  auditLogs: {
    list: (filters: unknown) => ['audit-logs', 'list', filters] as const,
    actors: ['audit-logs', 'actors'] as const,
  },
  profile: {
    current: (clerkUserId: string | undefined) => ['current-profile', clerkUserId] as const,
  },
}

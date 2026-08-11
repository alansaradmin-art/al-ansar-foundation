import { useQuery } from '@tanstack/react-query'
import { useSupabaseClient } from '@/contexts/SupabaseContext'
import { getMemberPeriodSummaries } from '@/services/memberPeriod'

export function useMemberPeriodSummaries(memberIds: string[], month: number | undefined, year: number | undefined) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: ['member-period-summaries', [...memberIds].sort(), month, year],
    queryFn: () => getMemberPeriodSummaries(client, memberIds, month!, year!),
    enabled: memberIds.length > 0 && month != null && year != null,
  })
}

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { MemberStatus } from '@/types'

export function MembersFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  showStatusFilter = true,
}: {
  search: string
  onSearchChange: (value: string) => void
  status: MemberStatus | 'ALL'
  onStatusChange: (value: MemberStatus | 'ALL') => void
  /** Managers can only ever see ACTIVE members — the backend now enforces
   * this unconditionally, so offering "All"/"Inactive" tabs there would
   * just be a control that always returns nothing. Admin (default) keeps
   * the full three-way filter; the manager Members page passes false. */
  showStatusFilter?: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, ID, mobile, father's name…"
          className="pl-9"
        />
      </div>
      {showStatusFilter && (
        <Tabs value={status} onValueChange={(v) => onStatusChange(v as MemberStatus | 'ALL')}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="ACTIVE">Active</TabsTrigger>
            <TabsTrigger value="INACTIVE">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  )
}

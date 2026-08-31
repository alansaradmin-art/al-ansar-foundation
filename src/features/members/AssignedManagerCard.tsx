import { UserCog } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/StateViews'
import { ContactBlock } from './ContactBlock'
import { useManager } from '@/hooks/useManagers'

/** Admin-only — Member360View only renders this when showAssignedManager
 * is true, which only the Admin page wrapper passes; the Manager page
 * never renders it at all (see Member360View.tsx). No Call/WhatsApp here
 * either way — those stay in the Follow-ups section only. */
export function AssignedManagerCard({ managerId }: { managerId: string | null }) {
  const { data: manager, isLoading } = useManager(managerId ?? undefined)

  if (!managerId) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assigned Manager</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState label="Loading manager…" />
        ) : manager ? (
          <ContactBlock
            label="Manager"
            name={manager.full_name}
            phone={manager.phone}
            country={manager.phone_country}
            icon={UserCog}
            tone="info"
            hideActions
          />
        ) : (
          <p className="text-sm text-muted-foreground">Manager details unavailable.</p>
        )}
      </CardContent>
    </Card>
  )
}

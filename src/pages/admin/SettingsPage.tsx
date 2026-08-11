import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSupabaseClient } from '@/contexts/SupabaseContext'
import { useProfile } from '@/contexts/ProfileContext'
import { getFollowUpPendingDay, setFollowUpPendingDay } from '@/services/settings'
import { queryKeys } from '@/lib/queryKeys'
import { getFriendlyErrorMessage } from '@/lib/errors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/StateViews'

export default function SettingsPage() {
  const client = useSupabaseClient()
  const { profile } = useProfile()
  const queryClient = useQueryClient()
  const { data: pendingDay, isLoading } = useQuery({
    queryKey: queryKeys.settings.pendingDay,
    queryFn: () => getFollowUpPendingDay(client),
  })

  const [value, setValue] = useState<number>(20)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (pendingDay != null) setValue(pendingDay)
  }, [pendingDay])

  async function handleSave() {
    setSaving(true)
    try {
      await setFollowUpPendingDay(client, value, profile!.id)
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.pendingDay })
      toast.success('Setting saved.')
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Unable to save this setting.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Follow-up Cutoff Day</CardTitle>
          <CardDescription>
            After this day of the month, a member with no donation and no completed follow-up appears in Pending
            Follow-ups. Before this day, nothing is flagged as pending.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <LoadingState label="Loading…" />
          ) : (
            <div className="flex items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="pending-day">Day of month</Label>
                <Input
                  id="pending-day"
                  type="number"
                  min={1}
                  max={31}
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-24"
                />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useProfile } from '@/contexts/ProfileContext'
import { getFollowUpPendingDay, setFollowUpPendingDay, getNonDonorThreshold, setNonDonorThreshold } from '@/services/settings'
import { queryKeys } from '@/lib/queryKeys'
import { getFriendlyErrorMessage } from '@/lib/errors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/StateViews'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { AppFooter } from '@/components/AppFooter'

export default function SettingsPage() {
  const { getToken } = useAuth()
  const { profile } = useProfile()
  const queryClient = useQueryClient()
  const { data: pendingDay, isLoading } = useQuery({
    queryKey: queryKeys.settings.pendingDay,
    queryFn: () => getFollowUpPendingDay(getToken),
  })

  const [value, setValue] = useState<number>(20)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (pendingDay != null) setValue(pendingDay)
  }, [pendingDay])

  async function handleSave() {
    setSaving(true)
    try {
      await setFollowUpPendingDay(getToken, value, profile!.id)
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.pendingDay })
      toast.success('Setting saved.')
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Unable to save this setting.'))
    } finally {
      setSaving(false)
    }
  }

  const { data: nonDonorThreshold, isLoading: isThresholdLoading } = useQuery({
    queryKey: queryKeys.settings.nonDonorThreshold,
    queryFn: () => getNonDonorThreshold(getToken),
  })

  const [thresholdValue, setThresholdValue] = useState<number>(50)
  const [savingThreshold, setSavingThreshold] = useState(false)

  useEffect(() => {
    if (nonDonorThreshold != null) setThresholdValue(nonDonorThreshold)
  }, [nonDonorThreshold])

  async function handleSaveThreshold() {
    setSavingThreshold(true)
    try {
      await setNonDonorThreshold(getToken, thresholdValue)
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.nonDonorThreshold })
      toast.success('Setting saved.')
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Unable to save this setting.'))
    } finally {
      setSavingThreshold(false)
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Non-Donor Alert Threshold</CardTitle>
          <CardDescription>
            On the Admin Dashboard's "Needs Attention" section, a manager is flagged when this percentage or more of
            their assigned members haven't donated in the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isThresholdLoading ? (
            <LoadingState label="Loading…" />
          ) : (
            <div className="flex items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="non-donor-threshold">Percent (%)</Label>
                <Input
                  id="non-donor-threshold"
                  type="number"
                  min={1}
                  max={100}
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(Number(e.target.value))}
                  className="w-24"
                />
              </div>
              <Button onClick={handleSaveThreshold} disabled={savingThreshold}>
                {savingThreshold ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose how the app looks on this account.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSwitcher />
        </CardContent>
      </Card>

      <AppFooter />
    </div>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Palette, SlidersHorizontal, ClipboardList, IndianRupee, Receipt, type LucideIcon } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  getFollowUpPendingDay,
  setFollowUpPendingDay,
  getNonDonorThreshold,
  setNonDonorThreshold,
  getDefaultPageSize,
  setDefaultPageSize,
  getReceiptBranding,
  setReceiptBranding,
  type ReceiptBranding,
} from '@/services/settings'
import { queryKeys } from '@/lib/queryKeys'
import { getFriendlyErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState } from '@/components/StateViews'
import { PageHeader } from '@/components/PageHeader'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { AppFooter } from '@/components/AppFooter'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

type Tone = 'primary' | 'gold' | 'warning' | 'neutral'

const TONE_CHIP: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  gold: 'bg-gold/25 text-gold-foreground',
  warning: 'bg-warning/20 text-warning-foreground',
  neutral: 'bg-muted text-muted-foreground',
}

/** One category heading per group of related settings — the "sections
 * instead of one long page" structure. Reuses the same icon-chip visual
 * language as DashboardCard so Settings reads as part of the same design
 * system rather than a bolted-on form. */
function SettingsSection({
  icon: Icon,
  title,
  description,
  tone,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  tone: Tone
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONE_CHIP[tone])}>
          <Icon className="size-4.5" />
        </span>
        <div>
          <h2 className="font-display text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  const { getToken } = useAuth()
  const { profile } = useProfile()
  const queryClient = useQueryClient()
  const { theme } = useTheme()

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

  const EMPTY_BRANDING: ReceiptBranding = { bannerUrl: '', footerText: '', contactInfo: '', receivedByLabel: '' }
  const { data: receiptBranding, isLoading: isReceiptBrandingLoading } = useQuery({
    queryKey: queryKeys.settings.receiptBranding,
    queryFn: () => getReceiptBranding(getToken),
  })

  const [branding, setBranding] = useState<ReceiptBranding>(EMPTY_BRANDING)
  const [savingBranding, setSavingBranding] = useState(false)

  useEffect(() => {
    if (receiptBranding) setBranding(receiptBranding)
  }, [receiptBranding])

  async function handleSaveBranding() {
    setSavingBranding(true)
    try {
      await setReceiptBranding(getToken, branding)
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.receiptBranding })
      toast.success('Setting saved.')
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Unable to save this setting.'))
    } finally {
      setSavingBranding(false)
    }
  }

  const { data: pageSize, isLoading: isPageSizeLoading } = useQuery({
    queryKey: queryKeys.settings.defaultPageSize,
    queryFn: () => getDefaultPageSize(getToken),
  })

  const [pageSizeValue, setPageSizeValue] = useState<number>(10)
  const [savingPageSize, setSavingPageSize] = useState(false)

  useEffect(() => {
    if (pageSize != null) setPageSizeValue(pageSize)
  }, [pageSize])

  async function handleSavePageSize() {
    setSavingPageSize(true)
    try {
      await setDefaultPageSize(getToken, pageSizeValue)
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.defaultPageSize })
      toast.success('Setting saved.')
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Unable to save this setting.'))
    } finally {
      setSavingPageSize(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Settings" description="Configure how Al Ansar Foundation behaves for every Admin and Manager." />

      <SettingsSection
        icon={Palette}
        title="Appearance"
        description="Personal display preferences for this account."
        tone="primary"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Theme</CardTitle>
            <CardDescription>Choose how the app looks on this account. Applies instantly, no need to save.</CardDescription>
            <CardAction>
              <Badge variant="secondary" className="capitalize">
                {theme}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ThemeSwitcher />
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection
        icon={SlidersHorizontal}
        title="Application"
        description="General system preferences applied across every listing."
        tone="neutral"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listing Page Size</CardTitle>
            <CardDescription>
              The number of rows shown per page on Members, Donations, Follow-ups, Audit Logs, Managers, and the
              Donation Engagement report — for both Admin and Manager views.
            </CardDescription>
            {pageSize != null && (
              <CardAction>
                <Badge variant="secondary">{pageSize} rows</Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isPageSizeLoading ? (
              <LoadingState label="Loading…" />
            ) : (
              <div className="flex items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="page-size">Rows per page</Label>
                  <Select value={String(pageSizeValue)} onValueChange={(v) => setPageSizeValue(Number(v))}>
                    <SelectTrigger id="page-size" className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSavePageSize} disabled={savingPageSize}>
                  {savingPageSize ? 'Saving…' : 'Save'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection
        icon={ClipboardList}
        title="Follow-ups"
        description="Controls when a member counts as overdue for a follow-up."
        tone="warning"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Follow-up Cutoff Day</CardTitle>
            <CardDescription>
              After this day of the month, a member with no donation and no completed follow-up appears in Pending
              Follow-ups. Before this day, nothing is flagged as pending.
            </CardDescription>
            {pendingDay != null && (
              <CardAction>
                <Badge variant="secondary">Day {pendingDay}</Badge>
              </CardAction>
            )}
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
      </SettingsSection>

      <SettingsSection
        icon={IndianRupee}
        title="Donations"
        description="Thresholds that drive donation-engagement alerts on the Dashboard."
        tone="gold"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Non-Donor Alert Threshold</CardTitle>
            <CardDescription>
              On the Admin Dashboard's "Needs Attention" section, a manager is flagged when this percentage or more of
              their assigned members haven't donated in the selected period.
            </CardDescription>
            {nonDonorThreshold != null && (
              <CardAction>
                <Badge variant="secondary">{nonDonorThreshold}%</Badge>
              </CardAction>
            )}
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
      </SettingsSection>

      <SettingsSection
        icon={Receipt}
        title="Receipts"
        description="Branding shown on every donation receipt (PDF view, download, print, and WhatsApp share)."
        tone="gold"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receipt Branding</CardTitle>
            <CardDescription>
              The receipt no longer shows a logo — its banner carries the branding. Leave the banner blank to use
              this app's own default banner instead. Footer text and contact info appear at the bottom of every
              receipt; "Received By" appears on every receipt exactly as typed here, regardless of which manager
              actually recorded the donation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isReceiptBrandingLoading ? (
              <LoadingState label="Loading…" />
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="receipt-banner-url">Banner URL</Label>
                  <Input
                    id="receipt-banner-url"
                    placeholder="https://… (blank = use the app's default banner)"
                    value={branding.bannerUrl}
                    onChange={(e) => setBranding({ ...branding, bannerUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt-received-by">Received By</Label>
                  <Input
                    id="receipt-received-by"
                    placeholder="e.g. Accounts of Al-Ansar Foundation"
                    value={branding.receivedByLabel}
                    onChange={(e) => setBranding({ ...branding, receivedByLabel: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt-footer-text">Footer Text</Label>
                  <Textarea
                    id="receipt-footer-text"
                    rows={2}
                    value={branding.footerText}
                    onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt-contact-info">Contact Info</Label>
                  <Textarea
                    id="receipt-contact-info"
                    rows={2}
                    value={branding.contactInfo}
                    onChange={(e) => setBranding({ ...branding, contactInfo: e.target.value })}
                  />
                </div>
                <Button onClick={handleSaveBranding} disabled={savingBranding}>
                  {savingBranding ? 'Saving…' : 'Save'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </SettingsSection>

      <AppFooter />
    </div>
  )
}

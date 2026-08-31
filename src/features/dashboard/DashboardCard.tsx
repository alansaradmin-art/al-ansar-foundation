import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'primary' | 'success' | 'warning' | 'info' | 'gold' | 'neutral'

const TONE_CHIP: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/20 text-warning-foreground',
  info: 'bg-teal/15 text-teal',
  gold: 'bg-gold/25 text-gold-foreground',
  neutral: 'bg-muted text-muted-foreground',
}

export function DashboardCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'primary',
  to,
}: {
  label: string
  value: string | number
  description?: string
  icon: LucideIcon
  tone?: Tone
  to?: string
}) {
  const content = (
    <div
      className={cn(
        // min-w-0 lets this grid/flex item actually shrink to its cell's
        // width instead of the browser default (content-based minimum
        // width), which — combined with the same fix on the label/value
        // below — is what stops a long label or a large formatted amount
        // from forcing its cell (and the whole page) wider than the
        // viewport on a narrow screen.
        'group flex h-full min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all',
        to && 'md:hover:-translate-y-0.5 md:hover:border-primary/30 md:hover:shadow-md',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', TONE_CHIP[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="min-w-0">
        {/* wrap-break-word: a long formatted amount (e.g. "₹1,25,00,000")
         * has no spaces for the browser to wrap at by default, so without
         * this it stays one unbreakable token and overflows its cell
         * instead of wrapping — even once the cell itself is allowed to
         * shrink. */}
        <p className="wrap-break-word font-display text-2xl font-semibold tabular-nums leading-tight">{value}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  )

  return to ? (
    <Link to={to} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  )
}

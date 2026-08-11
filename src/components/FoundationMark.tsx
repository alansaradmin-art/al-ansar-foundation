import { Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FoundationMark({
  subtitle,
  size = 'default',
  className,
}: {
  subtitle?: string
  size?: 'sm' | 'default'
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground',
          size === 'sm' ? 'size-7' : 'size-9',
        )}
      >
        <Landmark className={size === 'sm' ? 'size-3.5' : 'size-4.5'} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className={cn('font-display font-semibold', size === 'sm' ? 'text-sm' : 'text-base')}>
          Al Ansar Foundation
        </p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

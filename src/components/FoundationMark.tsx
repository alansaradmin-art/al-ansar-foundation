import { cn } from '@/lib/utils'

const MARK_SIZE = {
  sm: 'size-7',
  default: 'size-9',
  lg: 'size-16',
}

const TEXT_SIZE = {
  sm: 'text-sm',
  default: 'text-base',
  lg: 'text-xl',
}

export function FoundationMark({
  subtitle,
  size = 'default',
  className,
}: {
  subtitle?: string
  size?: 'sm' | 'default' | 'lg'
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src="/Logo.jpeg"
        alt="Al Ansar Foundation"
        className={cn('shrink-0 rounded-full object-cover ring-1 ring-border', MARK_SIZE[size])}
      />
      <div className="min-w-0 leading-tight">
        <p className={cn('font-display font-semibold', TEXT_SIZE[size])}>Al Ansar Foundation</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

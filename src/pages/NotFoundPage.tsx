import { Link } from 'react-router-dom'
import { FoundationMark } from '@/components/FoundationMark'
import { AppFooter } from '@/components/AppFooter'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <FoundationMark />
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
      <AppFooter />
    </div>
  )
}

import { Sun, Moon } from 'lucide-react'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

/** Instant-apply, unlike this page's other settings fields — a theme
 * switcher is expected to take effect immediately, not behind a Save
 * button. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <Tabs value={theme} onValueChange={(v) => setTheme(v as Theme)}>
      <TabsList>
        <TabsTrigger value="light">
          <Sun className="size-4" /> Light
        </TabsTrigger>
        <TabsTrigger value="dark">
          <Moon className="size-4" /> Dark
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

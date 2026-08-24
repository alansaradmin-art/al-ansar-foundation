import type { InstallPlatform } from '@/hooks/useInstallPrompt'

/** Shown whenever canPromptInstall is false — either the browser never
 * fires beforeinstallprompt at all (iOS Safari), or it already did once
 * this session/recently and won't again. Shared between InstallAppCard
 * and InstallAppMenuItem so the wording never drifts between the two. */
export const INSTALL_INSTRUCTIONS: Record<InstallPlatform, string> = {
  ios: 'Tap the Share icon in Safari, then choose "Add to Home Screen".',
  android: 'Open your browser\'s menu and choose "Install app" or "Add to Home screen".',
  desktop: 'Click the install icon in your browser\'s address bar, or open the browser menu and choose "Install Al Ansar Foundation".',
}

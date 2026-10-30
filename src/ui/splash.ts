import * as SplashScreen from 'expo-splash-screen'

/** The shortest time the logo stays up, so it is seen even when the app loads quickly. */
const MIN_VISIBLE_MS = 1200

const startedAt = Date.now()

// Keep the native splash (the logo) on screen until the app is ready. This has to run at
// module scope, as early as possible, or the splash may already have hidden itself.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden or unavailable: nothing to hold on to.
})

/** Hides the splash once the minimum display time has passed. */
export function hideSplash() {
  const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt))
  setTimeout(() => SplashScreen.hide(), wait)
}

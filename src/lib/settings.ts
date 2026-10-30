import { File, Paths } from 'expo-file-system'

export type Settings = {
  /** Burn the date and time into photos and videos, and show it in the viewfinder. */
  dateStamp: boolean
}

const DEFAULTS: Settings = { dateStamp: true }

const settingsFile = () => new File(Paths.document, 'settings.json')

/** Reads saved settings; a missing or unreadable file just means defaults. */
export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(settingsFile().textSync()) }
  } catch {
    return DEFAULTS
  }
}

export function saveSettings(settings: Settings): void {
  try {
    settingsFile().writeSync(JSON.stringify(settings))
  } catch {
    // The setting still applies for this session; it just will not persist.
  }
}

import { Dimensions, StatusBar, useWindowDimensions } from 'react-native'

/** A typical 3-button navigation bar's thickness, in dp. */
const NAV_BAR = 48
/** Margin kept clear of a camera cutout when held sideways and the system keeps the app clear of its bars. */
const CUTOUT = 28

/**
 * Space to keep clear of the status bar, navigation bar and camera cutout, in dp.
 *
 * This is a small stand-in for `react-native-safe-area-context`, which cannot be built on
 * Windows here (its generated C++ paths exceed the 260-character limit). It has the same
 * shape (`top`, `bottom`, `left`, `right`), so the real hook can replace it one-for-one.
 *
 * When the app is drawn behind the navigation bar (the window is as big as the screen) the
 * bar's thickness is kept clear: at the bottom upright, and on both sides sideways, because
 * which side the bar lands on depends on which way the phone is turned and plain React Native
 * cannot tell. Otherwise the system already keeps the app clear of it.
 */
export function useInsets() {
  const window = useWindowDimensions()
  const screen = Dimensions.get('screen')
  const landscape = window.width > window.height
  const drawnBehind = landscape
    ? screen.width - window.width < 1
    : screen.height - window.height < 1

  const side = landscape ? (drawnBehind ? NAV_BAR : CUTOUT) : 0
  return {
    top: StatusBar.currentHeight ?? 0,
    bottom: !landscape && drawnBehind ? NAV_BAR : 0,
    left: side,
    right: side,
  }
}

import { createContext, useCallback, useContext } from 'react'
import { PixelRatio } from 'react-native'

const ScaleContext = createContext(1)
export const ScaleProvider = ScaleContext.Provider

/** Converts device-screen units (176x208 grid) to pixel-aligned dp. */
export function usePx() {
  const scale = useContext(ScaleContext)
  return useCallback(
    (units: number) => PixelRatio.roundToNearestPixel(units * scale),
    [scale],
  )
}

import { Canvas, type FontEdging, Group, Skia, Text as SkText } from '@shopify/react-native-skia'
import { memo, useMemo } from 'react'
import { PixelRatio } from 'react-native'
import { useFaces } from './fonts'
import { C } from './theme'
import { useCanvasNudge } from './useCanvasNudge'

/** `FontEdging.Alias`: the enum is typed but not exported at runtime, so use its value. */
const ALIAS_EDGING = 0 as FontEdging

type Props = {
  children: string
  /** Device pixels per font pixel. Silkscreen is an 8px font, so 3 or 4 stays razor sharp. */
  n?: number
  bold?: boolean
  color?: string
  /** Draws a one-pixel offset shadow, the way camera overlays keep text legible. */
  shadow?: string
}

/** Pixel-font text drawn with Skia so every glyph pixel lands on a device pixel. */
export const PixelText = memo(function PixelText({ children: text, n = 3, bold, color = C.text, shadow }: Props) {
  const faces = useFaces()
  const unit = n / PixelRatio.get()
  const size = 8 * unit
  const font = useMemo(() => {
    const f = Skia.Font(bold ? faces.bold : faces.regular, size)
    // Hard pixel edges: no smoothing and no subpixel positioning.
    f.setEdging(ALIAS_EDGING)
    f.setSubpixel(false)
    return f
  }, [faces, bold, size])

  const { ascent, descent } = font.getMetrics()
  const offset = shadow ? unit : 0
  // One extra font pixel: measured width can undercount the last glyph's right edge.
  const width = Math.ceil(font.measureText(text).width + offset + unit)
  const height = Math.ceil(descent - ascent + offset)

  const nudge = useCanvasNudge() // see the hook: makes Skia send the picture again after mount
  return (
    <Canvas style={{ width, height }}>
      <Group transform={[{ translateX: nudge }]}>
        {shadow ? <SkText x={offset} y={-ascent + offset} text={text} font={font} color={shadow} /> : null}
        <SkText x={0} y={-ascent} text={text} font={font} color={color} />
      </Group>
    </Canvas>
  )
})

import { Canvas, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia'
import { memo } from 'react'
import { PixelRatio } from 'react-native'
import { PIXEL_ICONS, type PixelIconName } from './icons/pixelarticons'
import { C } from './theme'
import { useCanvasNudge } from './useCanvasNudge'

const paths = new Map<PixelIconName, SkPath>()

function pathFor(name: PixelIconName): SkPath {
  let path = paths.get(name)
  if (!path) {
    path = Skia.Path.MakeFromSVGString(PIXEL_ICONS[name]) ?? Skia.Path.Make()
    paths.set(name, path)
  }
  return path
}

type Props = {
  name: PixelIconName
  /** Device pixels per icon pixel (icons are drawn on a 24x24 grid). */
  n?: number
  color?: string
  /** One-pixel offset shadow, for embossed look on gradients. */
  shadow?: string
}

export const PixelIcon = memo(function PixelIcon({ name, n = 2, color = C.text, shadow }: Props) {
  const unit = n / PixelRatio.get()
  const size = 24 * unit + (shadow ? unit : 0)
  const path = pathFor(name)
  const nudge = useCanvasNudge() // see the hook: makes Skia send the picture again after mount
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale: unit }, { translateX: nudge }]}>
        {shadow ? (
          <Group transform={[{ translateX: 1 }, { translateY: 1 }]}>
            <Path path={path} color={shadow} />
          </Group>
        ) : null}
        <Path path={path} color={color} />
      </Group>
    </Canvas>
  )
})

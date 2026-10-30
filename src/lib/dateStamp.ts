import {
  type FontEdging,
  ImageFormat,
  Skia,
  type SkCanvas,
  type SkTypeface,
} from '@shopify/react-native-skia'
import { File, Paths } from 'expo-file-system'

/** Orange digits with a dark edge: the date imprint of an early digital camera. */
export const STAMP_COLOR = '#FF9A1F'
export const STAMP_SHADOW = '#3A1600'

export type Stamp = { text: string; typeface: SkTypeface }

const pad = (n: number) => String(n).padStart(2, '0')

/** "30.10.26 19:45" */
export function formatStamp(date: Date): string {
  const year = String(date.getFullYear()).slice(-2)
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${year} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `FontEdging.Alias`: the enum is typed but not exported at runtime, so use its value. */
const ALIAS_EDGING = 0 as FontEdging

/**
 * Draws the stamp in the bottom-right corner of a `width` x `height` canvas.
 * `scale` is device pixels per font pixel (Silkscreen is an 8px font), keeping the glyphs sharp.
 */
export function drawStamp(
  canvas: SkCanvas,
  width: number,
  height: number,
  { text, typeface }: Stamp,
  scale: number,
) {
  const font = Skia.Font(typeface, 8 * scale)
  font.setEdging(ALIAS_EDGING)
  font.setSubpixel(false)

  const margin = 5 * scale
  const x = Math.round(width - font.measureText(text).width - margin)
  const baseline = Math.round(height - margin)

  const paint = Skia.Paint()
  paint.setColor(Skia.Color(STAMP_SHADOW))
  canvas.drawText(text, x + scale, baseline + scale, paint, font)
  paint.setColor(Skia.Color(STAMP_COLOR))
  canvas.drawText(text, x, baseline, paint, font)
}

/** Renders the stamp onto a transparent PNG so ffmpeg can overlay it on a video. */
export async function writeStampPng(stamp: Stamp, width: number, height: number): Promise<string> {
  const surface = Skia.Surface.Make(width, height)
  if (!surface) throw new Error('Could not create stamp surface')
  const canvas = surface.getCanvas()
  canvas.clear(Skia.Color('transparent'))
  drawStamp(canvas, width, height, stamp, 1)
  surface.flush()

  const image = surface.makeImageSnapshot()
  const bytes = image.encodeToBytes(ImageFormat.PNG)
  image.dispose()

  const file = new File(Paths.cache, `stamp-${Date.now()}.png`)
  await file.write(bytes)
  return file.uri
}

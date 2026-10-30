import {
  FilterMode,
  ImageFormat,
  MipmapMode,
  Skia,
  type SkImage,
} from '@shopify/react-native-skia'
import { File, Paths } from 'expo-file-system'
import { drawStamp, type Stamp } from './dateStamp'
import { addToAlbum } from './gallery'

/** Heavy compression: visible 8x8 blocks and ringing around contrasty edges. */
const JPEG_QUALITY = 30
/** VGA, matching the Nokia 7650 sensor. */
const LONG_SIDE = 640
const SHORT_SIDE = 480

/** Font pixels are drawn at 2x on the 480x640 photo: about 3% of its width, like a digicam imprint. */
const STAMP_SCALE = 2

/**
 * Resamples to exactly VGA (portrait or landscape, whichever the image is) and, when asked,
 * imprints the date. The stamp goes on after the color grade, so it stays crisp orange.
 */
function toVga(image: SkImage, stamp?: Stamp | null): SkImage {
  const portrait = image.height() > image.width()
  const width = portrait ? SHORT_SIDE : LONG_SIDE
  const height = portrait ? LONG_SIDE : SHORT_SIDE
  if (!stamp && image.width() === width && image.height() === height) return image

  const surface = Skia.Surface.Make(width, height)
  if (!surface) throw new Error('Could not create VGA surface')
  const canvas = surface.getCanvas()
  canvas.drawImageRectOptions(
    image,
    { x: 0, y: 0, width: image.width(), height: image.height() },
    { x: 0, y: 0, width, height },
    FilterMode.Linear,
    MipmapMode.None,
    Skia.Paint(),
  )
  if (stamp) drawStamp(canvas, width, height, stamp, STAMP_SCALE)
  surface.flush()
  return surface.makeImageSnapshot()
}

/**
 * Saves the (already color-graded) snapshot as a VGA JPEG in the "Kodak 2000" album,
 * with the date imprinted if a stamp is given; returns its URI.
 */
export async function savePhoto(snapshot: SkImage, stamp?: Stamp | null): Promise<string> {
  const vga = toVga(snapshot, stamp)
  const bytes = vga.encodeToBytes(ImageFormat.JPEG, JPEG_QUALITY)
  if (vga !== snapshot) vga.dispose()

  const file = new File(Paths.cache, `kodak-${Date.now()}.jpg`)
  await file.write(bytes)

  try {
    return await addToAlbum(file.uri)
  } finally {
    file.delete()
  }
}

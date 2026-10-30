import { FFmpegKit, ReturnCode } from '@wokcito/ffmpeg-kit-react-native'
import { Paths } from 'expo-file-system'

const FPS = 10
const VIDEO_BITRATE = '64k'
/** 8 kHz mono keeps only the tinny mid-range, like early AMR voice audio. */
const AUDIO_BITRATE = '16k'
const AUDIO_RATE = '8000'

/** QCIF-class frames (4:3), tiny like a 2002 phone's video: 176x144 held sideways, 144x192 upright. */
const SIZES = {
  portrait: { width: 144, height: 192 },
  landscape: { width: 192, height: 144 },
}

/** Frame size of the finished clip; the date stamp image must match it. */
export const videoSize = (landscape: boolean) => (landscape ? SIZES.landscape : SIZES.portrait)

/** The same cold, flat, muted grade as the photo shader, plus sensor noise. */
const filters = ({ width, height }: { width: number; height: number }) =>
  [
    `fps=${FPS}`,
    `scale=${width}:${height}:flags=bilinear`,
    'eq=contrast=1.12:brightness=0.03:saturation=0.78',
    'colorchannelmixer=rr=0.95:bb=1.06',
    'noise=alls=7:allf=t',
  ].join(',')

const toPath = (uri: string) => decodeURI(uri.replace(/^file:\/\//, ''))

type Options = {
  /** How the phone was held when recording started: decides the clip's shape. */
  landscape: boolean
  /** A transparent PNG of the date, `videoSize(landscape)` big, overlaid after the color grade. */
  stampUri?: string
}

/**
 * Re-encodes a recording into a tiny, choppy, heavily compressed clip: QCIF-class at 10 fps,
 * 64 kbps MPEG-4 video (big macroblocks) and 8 kHz mono audio. Returns a `file://` URI.
 *
 * The date stamp, if any, is compressed along with the picture like a real in-camera imprint.
 */
export async function nokiafyVideo(inputUri: string, { landscape, stampUri }: Options): Promise<string> {
  const output = toPath(`${Paths.cache.uri}kodak-${Date.now()}.mp4`)
  const grade = filters(videoSize(landscape))
  // Each label can be consumed once: `graded` feeds the overlay, and the overlay's own result is `out`.
  const graph = stampUri
    ? [
        '-i',
        toPath(stampUri),
        '-filter_complex',
        `[0:v]${grade}[graded];[graded][1:v]overlay=0:0[out]`,
        '-map',
        '[out]',
        '-map',
        '0:a?',
      ]
    : ['-vf', grade]
  const session = await FFmpegKit.executeWithArguments([
    '-y',
    '-i',
    toPath(inputUri),
    ...graph,
    '-c:v',
    'mpeg4',
    '-b:v',
    VIDEO_BITRATE,
    '-maxrate',
    '80k',
    '-bufsize',
    '64k',
    '-g',
    '20',
    '-c:a',
    'aac',
    '-b:a',
    AUDIO_BITRATE,
    '-ar',
    AUDIO_RATE,
    '-ac',
    '1',
    '-movflags',
    '+faststart',
    output,
  ])
  const code = await session.getReturnCode()
  if (!ReturnCode.isSuccess(code)) {
    const logs = await session.getAllLogsAsString()
    throw new Error(`ffmpeg failed: ${logs?.slice(-300) ?? 'no output'}`)
  }
  return `file://${output}`
}

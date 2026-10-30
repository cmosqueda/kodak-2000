import {
  FilterMode,
  MipmapMode,
  Skia,
  TileMode,
} from '@shopify/react-native-skia'
import { memo, type Ref, useCallback, useEffect, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import { createSynchronizable } from 'react-native-worklets'
import {
  CommonDynamicRanges,
  type CameraOutput,
  type Constraint,
  type Frame,
} from 'react-native-vision-camera'
import {
  SkiaCamera,
  type SkiaCameraRef,
  type SkiaOnFrameState,
} from 'react-native-vision-camera-skia'
import { nokia7650Effect } from '../shaders/nokia7650'

/** Nokia 7650 captured VGA (640x480). */
const TARGET_RESOLUTION = { width: 640, height: 480 }

/** Keep the pipeline "dumb": no HDR, no stabilization, no scene processing. */
const CONSTRAINTS: Constraint[] = [
  { photoHDR: false },
  { videoDynamicRange: CommonDynamicRanges.ANY_SDR },
  { videoStabilizationMode: 'off' },
  { previewStabilizationMode: 'off' },
]

/**
 * Minimum time between drawn frames in video mode: ~10 fps, like a 2002 phone. A little
 * under 100 ms so a 30 fps camera's every-third frame is never skipped by jitter.
 */
const CHOPPY_INTERVAL_MS = 90

const paint = Skia.Paint()

type Props = {
  cameraRef?: Ref<SkiaCameraRef>
  isActive: boolean
  /** Which camera to use; switching restarts the session. */
  facing?: 'back' | 'front'
  /** Extra camera outputs, e.g. the video recorder. Keep this array referentially stable. */
  outputs?: CameraOutput[]
  /** Drop frames from the preview for the stuttering early-phone video look. */
  choppy?: boolean
  /** Called when the camera session (re)starts; its controller is ready from then on. Keep stable. */
  onStarted?: () => void
  /** Reports how many frames per second are actually being drawn. Keep stable. */
  onFps?: (fps: number) => void
}

/**
 * Memoized on purpose. Re-rendering SkiaCamera swaps the frame callback on the camera
 * thread and rebuilds its outputs array, which glitches the preview. Everything passed in
 * must therefore be stable, so screen state (zoom readout, timers) never reaches it.
 */
export const NokiaCamera = memo(function NokiaCamera({
  cameraRef,
  isActive,
  facing = 'back',
  outputs,
  choppy = false,
  onStarted,
  onFps,
}: Props) {
  const rendered = useSharedValue(0)
  const lastDrawn = useMemo(() => createSynchronizable(0), [])

  // Frames drawn per second, sampled once a second (a counter, not per-frame JS work).
  useEffect(() => {
    if (!onFps) return
    let last = rendered.value
    const timer = setInterval(() => {
      const now = rendered.value
      onFps(now - last)
      last = now
    }, 1000)
    return () => clearInterval(timer)
  }, [onFps, rendered])

  const onFrame = useCallback(
    (frame: Frame, render: (draw: (state: SkiaOnFrameState) => void) => void) => {
      'worklet'
      if (choppy) {
        // Time-based, so it holds ~10 fps whatever rate the camera delivers.
        const now = Date.now()
        if (now - lastDrawn.getBlocking() < CHOPPY_INTERVAL_MS) {
          frame.dispose()
          return
        }
        lastDrawn.setBlocking(now)
      }
      render(({ canvas, frameTexture }) => {
        const src = frameTexture.makeShaderOptions(
          TileMode.Clamp,
          TileMode.Clamp,
          FilterMode.Linear,
          MipmapMode.None,
        )
        const time = (Date.now() % 100000) / 1000
        const shader = nokia7650Effect.makeShaderWithChildren([time], [src])
        paint.setShader(shader)
        canvas.drawRect(
          { x: 0, y: 0, width: frameTexture.width(), height: frameTexture.height() },
          paint,
        )
        // Free the per-frame GPU objects now instead of leaving them to the garbage collector.
        shader.dispose()
        src.dispose()
      })
      rendered.value += 1
      frame.dispose()
    },
    [choppy, rendered, lastDrawn],
  )

  return (
    <SkiaCamera
      ref={cameraRef}
      style={StyleSheet.absoluteFill}
      device={facing}
      isActive={isActive}
      outputs={outputs}
      onStarted={onStarted}
      pixelFormat="yuv"
      targetResolution={TARGET_RESOLUTION}
      constraints={CONSTRAINTS}
      enableDistortionCorrection={false}
      warnIfRenderSkipped={!choppy}
      onFrame={onFrame}
    />
  )
})

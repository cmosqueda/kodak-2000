import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Image,
  type GestureResponderEvent,
  PixelRatio,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native'
import { useInsets } from '../ui/insets'
import {
  type CameraController,
  useCameraPermission,
  useMicrophonePermission,
  useVideoOutput,
} from 'react-native-vision-camera'
import type { SkiaCameraRef } from 'react-native-vision-camera-skia'
import { NokiaCamera } from '../components/NokiaCamera'
import { formatStamp, type Stamp, STAMP_COLOR, STAMP_SHADOW } from '../lib/dateStamp'
import { type GalleryTab, loadPhotos } from '../lib/gallery'
import { loadSettings, saveSettings } from '../lib/settings'
import { savePhoto } from '../lib/savePhoto'
import { useRecorder } from '../lib/useRecorder'
import { BevelButton, GradientBar } from '../ui/Bevel'
import { useToast } from '../ui/Dialog'
import { useFaces } from '../ui/fonts'
import { PixelIcon } from '../ui/PixelIcon'
import { PixelText } from '../ui/PixelText'
import { usePx } from '../ui/scale'
import { Shutter } from '../ui/Shutter'
import { C } from '../ui/theme'

const EDGE = 2 / PixelRatio.get()
const pad = (n: number) => String(n).padStart(2, '0')

/** One-tap zoom levels shown over the viewfinder; pinching reaches everything in between. */
const ZOOM_PRESETS = [1, 2, 4]
/** Past this the 640x480 output is mostly digital smear. */
const MAX_ZOOM = 8
/** The zoom readout redraws at most this often while pinching. */
const ZOOM_UI_INTERVAL_MS = 100
const distance = (touches: readonly { pageX: number; pageY: number }[]) =>
  Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY)

/**
 * `takeSnapshot()` reads a texture that the camera disposes and replaces on every frame,
 * so it can rarely land on one that was just disposed. Retry instead of failing the press.
 */
function grabSnapshot(camera: SkiaCameraRef | null) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return camera?.takeSnapshot()
    } catch {
      // A newer frame's texture is already in place; try again.
    }
  }
  return undefined
}

/** The current time, refreshed every 15 seconds. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(timer)
  }, [])
  return now
}

type Mode = 'photo' | 'video'

type Props = {
  /** False while another screen covers the camera: it pauses instead of unmounting. */
  active: boolean
  /** Opens the gallery on the tab that matches what the camera was doing. */
  onGallery: (tab: GalleryTab) => void
}

/**
 * Viewfinder with on-screen zoom and light, and a compact set of controls. Upright, the
 * controls sit below the viewfinder; sideways, in a column beside it.
 */
export function CameraScreen({ active, onGallery }: Props) {
  const px = usePx()
  const insets = useInsets()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const landscape = windowWidth > windowHeight
  // On short phones, give up a little viewfinder height rather than squeeze the controls.
  const maxViewfinder = windowHeight - insets.top - insets.bottom - px(20) - px(78)
  const { hasPermission, requestPermission } = useCameraPermission()
  const microphone = useMicrophonePermission()
  const camera = useRef<SkiaCameraRef>(null)
  const busy = useRef(false)
  const [flash] = useState(() => new Animated.Value(0))
  const [mode, setMode] = useState<Mode>('photo')
  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [last, setLast] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ x: number; y: number } | null>(null)
  const [toast, showToast] = useToast()
  const [zoom, setZoom] = useState(1)
  const [torch, setTorch] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [fps, setFps] = useState(0)
  const [dateStamp, setDateStamp] = useState(() => loadSettings().dateStamp)
  const [stampReady, setStampReady] = useState(false)
  const now = useNow()
  const { regular: stampTypeface } = useFaces()
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)
  const lastPinch = useRef(0)
  const zoomTarget = useRef(1)
  const zoomInFlight = useRef(false)
  const zoomShownAt = useRef(0)

  // The stamp preview mounts a moment after the screen: a Skia canvas that mounts during the
  // busy first frames can lose its picture and stay blank.
  useEffect(() => {
    const timer = setTimeout(() => setStampReady(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  // Recording goes through the camera pipeline; the filter is applied when it is saved.
  const videoOutput = useVideoOutput({
    targetResolution: { width: 640, height: 480 },
    targetBitRate: 1_500_000,
    enableAudio: microphone.hasPermission,
    fileType: 'mp4',
  })
  const outputs = useMemo(() => [videoOutput], [videoOutput])
  const currentStamp = useCallback(
    (): Stamp | null => (dateStamp ? { text: formatStamp(new Date()), typeface: stampTypeface } : null),
    [dateStamp, stampTypeface],
  )
  const getLandscape = useCallback(() => landscape, [landscape])
  const recorder = useRecorder(videoOutput, {
    getStamp: currentStamp,
    getLandscape,
    onSaved: (uri) => {
      setLast(uri)
      showToast('VIDEO SAVED')
    },
    onFailed: () => showToast('VIDEO FAILED'),
  })
  const recording = recorder.status === 'recording'
  const processing = recorder.status === 'processing'
  const locked = recording || processing

  // Ask for camera, then microphone, one at a time: Android drops overlapping requests,
  // which surfaces as "JPromise was destroyed". The photo library is asked for after that.
  const asked = useRef(false)
  const [permissionsAsked, setPermissionsAsked] = useState(false)
  useEffect(() => {
    if (asked.current) return
    asked.current = true
    ;(async () => {
      try {
        if (!hasPermission) await requestPermission()
        if (!microphone.hasPermission) await microphone.requestPermission()
      } catch {
        // Denied or interrupted: the UI offers an Allow button for the camera.
      } finally {
        setPermissionsAsked(true)
      }
    })()
  }, [hasPermission, requestPermission, microphone])

  // Refresh the thumbnail whenever the camera comes back (media may have been deleted).
  useEffect(() => {
    if (!active || !permissionsAsked) return
    let cancelled = false
    loadPhotos()
      .then((photos) => {
        if (!cancelled) setLast(photos[0]?.uri ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [active, permissionsAsked])

  useEffect(() => {
    if (!focus) return
    const timer = setTimeout(() => setFocus(null), 900)
    return () => clearTimeout(timer)
  }, [focus])

  const capture = async () => {
    if (busy.current) return
    const snapshot = grabSnapshot(camera.current)
    if (!snapshot) {
      showToast('NOT READY')
      return
    }
    busy.current = true
    flash.setValue(1)
    Animated.timing(flash, { toValue: 0, duration: 160, useNativeDriver: true }).start()
    try {
      setLast(await savePhoto(snapshot, currentStamp()))
      showToast('PHOTO SAVED')
    } catch {
      showToast('SAVE FAILED')
    } finally {
      snapshot.dispose()
      busy.current = false
    }
  }

  const onShutter = () => {
    if (mode === 'photo') capture().catch(() => showToast('SAVE FAILED'))
    else if (recording) recorder.stop()
    else recorder.start()
  }

  const focusAt = (event: GestureResponderEvent) => {
    if (Date.now() - lastPinch.current < 400) return // the end of a pinch is not a tap
    const { locationX: x, locationY: y } = event.nativeEvent
    setFocus({ x, y })
    camera.current?.focusTo({ x, y }).catch(() => {})
  }

  /** A restarted session starts at 1x with the light off, so mirror that in the UI. Stable on purpose. */
  const onStarted = useCallback(() => {
    zoomTarget.current = 1
    setZoom(1)
    setTorch(false)
    setHasTorch(camera.current?.controller?.device.hasTorch ?? false)
  }, [])

  /** Sends only the newest zoom, one native call at a time, so a fast pinch cannot flood the camera. */
  const pumpZoom = useCallback((controller: CameraController) => {
    function send() {
      if (zoomInFlight.current) return
      zoomInFlight.current = true
      const sent = zoomTarget.current
      controller
        .setZoom(sent)
        .catch(() => {})
        .finally(() => {
          zoomInFlight.current = false
          if (zoomTarget.current !== sent) send()
        })
    }
    send()
  }, [])

  const applyZoom = useCallback(
    (value: number) => {
      const controller = camera.current?.controller
      if (!controller) return
      const next = Math.min(Math.max(value, controller.minZoom), Math.min(controller.maxZoom, MAX_ZOOM))
      zoomTarget.current = next
      // Redraw the readout at a calm rate while pinching; preset taps update it right away.
      const time = Date.now()
      if (!pinch.current || time - zoomShownAt.current >= ZOOM_UI_INTERVAL_MS) {
        zoomShownAt.current = time
        setZoom(next)
      }
      pumpZoom(controller)
    },
    [pumpZoom],
  )

  const toggleDateStamp = () => {
    const next = !dateStamp
    setDateStamp(next)
    saveSettings({ dateStamp: next })
  }

  const toggleTorch = () => {
    const controller = camera.current?.controller
    if (!controller || !hasTorch) {
      showToast('NO FLASHLIGHT')
      return
    }
    const next = !torch
    controller
      .setTorchMode(next ? 'on' : 'off')
      .then(() => setTorch(next))
      .catch(() => showToast('LIGHT FAILED'))
  }

  const onPinchMove = useCallback(
    (touches: readonly { pageX: number; pageY: number }[]) => {
      if (touches.length < 2) return
      const spread = distance(touches)
      lastPinch.current = Date.now()
      if (!pinch.current) {
        pinch.current = { distance: spread, zoom: zoomTarget.current }
        return
      }
      applyZoom((pinch.current.zoom * spread) / pinch.current.distance)
    },
    [applyZoom],
  )

  const endPinch = () => {
    if (!pinch.current) return
    pinch.current = null
    setZoom(zoomTarget.current) // settle the readout on the final value
  }

  const bracket = (corner: 'tl' | 'tr' | 'bl' | 'br') => ({
    position: 'absolute' as const,
    width: px(14),
    height: px(14),
    borderColor: 'rgba(255,255,255,0.9)',
    ...(corner === 'tl' && { top: px(8), left: px(8), borderTopWidth: EDGE * 1.5, borderLeftWidth: EDGE * 1.5 }),
    ...(corner === 'tr' && { top: px(8), right: px(8), borderTopWidth: EDGE * 1.5, borderRightWidth: EDGE * 1.5 }),
    ...(corner === 'bl' && { bottom: px(8), left: px(8), borderBottomWidth: EDGE * 1.5, borderLeftWidth: EDGE * 1.5 }),
    ...(corner === 'br' && { bottom: px(8), right: px(8), borderBottomWidth: EDGE * 1.5, borderRightWidth: EDGE * 1.5 }),
  })

  const isVideo = mode === 'video'
  const onPreset = ZOOM_PRESETS.some((preset) => Math.abs(zoom - preset) < 0.15)
  const clipSize = landscape ? '192x144' : '144x192'

  const viewfinderStyle: ViewStyle = landscape
    ? { height: windowHeight - insets.top - insets.bottom, aspectRatio: 4 / 3, backgroundColor: '#000' }
    : { width: '100%', aspectRatio: 3 / 4, maxHeight: maxViewfinder, backgroundColor: '#000' }

  const titleBar = (
    <GradientBar key="title" height={20} paddingTop={insets.top}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: px(6),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4) }}>
          <PixelIcon name={isVideo ? 'video' : 'camera'} n={2} color={C.white} shadow={C.navy} />
          <PixelText n={3} bold color={C.white} shadow={C.navy}>
            {isVideo ? 'VIDEO' : 'CAMERA'}
          </PixelText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4) }}>
          <BevelButton
            label={dateStamp ? 'Hide date' : 'Show date'}
            active={dateStamp}
            onPress={toggleDateStamp}
            style={{ width: px(30), height: px(16) }}
          >
            <PixelText n={2} bold>
              DATE
            </PixelText>
          </BevelButton>
          <BevelButton
            label={torch ? 'Turn flashlight off' : 'Turn flashlight on'}
            active={torch}
            onPress={toggleTorch}
            style={{ width: px(24), height: px(16), opacity: hasTorch ? 1 : 0.5 }}
          >
            <PixelIcon name={torch ? 'lightbulb' : 'lightbulbOff'} n={2} />
          </BevelButton>
        </View>
      </View>
    </GradientBar>
  )

  const viewfinder = (
    <View
      style={viewfinderStyle}
      onTouchMove={(event) => onPinchMove(event.nativeEvent.touches)}
      onTouchEnd={endPinch}
      onTouchCancel={endPinch}
    >
      {hasPermission ? (
        <>
          <NokiaCamera
            cameraRef={camera}
            isActive={active}
            facing={facing}
            outputs={isVideo ? outputs : undefined}
            choppy={isVideo}
            onStarted={onStarted}
            onFps={setFps}
          />
          <Pressable accessibilityLabel="Tap to focus" style={StyleSheet.absoluteFill} onPress={focusAt} />
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
              <View key={corner} style={bracket(corner)} />
            ))}
            {focus && (
              <View
                style={{
                  position: 'absolute',
                  left: focus.x - px(14),
                  top: focus.y - px(14),
                  width: px(28),
                  height: px(28),
                  borderWidth: EDGE * 1.5,
                  borderColor: '#FFE76A',
                }}
              />
            )}
            <View style={{ position: 'absolute', top: px(10), left: px(26), flexDirection: 'row', alignItems: 'center', gap: px(5) }}>
              {recording && (
                <View style={{ width: px(7), height: px(7), borderRadius: px(3.5), backgroundColor: '#FF3B30' }} />
              )}
              <PixelText n={3} bold color={C.white} shadow="#000000">
                {recording
                  ? `REC ${pad(Math.floor(recorder.seconds / 60))}:${pad(recorder.seconds % 60)}`
                  : isVideo
                    ? `QCIF ${clipSize}`
                    : 'VGA 640x480'}
              </PixelText>
            </View>
            {fps > 0 && (
              <View style={{ position: 'absolute', top: px(10), right: px(26) }}>
                <PixelText n={2} bold color={C.white} shadow="#000000">
                  {`${fps} FPS`}
                </PixelText>
              </View>
            )}
            {dateStamp && stampReady && (
              <View style={{ position: 'absolute', right: px(3.5), bottom: px(3.5) }}>
                {/* The photo stamp is 3% of its width and the tiny video one 5.5%: size the preview to match. */}
                <PixelText n={isVideo ? 5 : 3} color={STAMP_COLOR} shadow={STAMP_SHADOW}>
                  {formatStamp(now)}
                </PixelText>
              </View>
            )}
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: flash }]} />
            {processing && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', gap: px(6) },
                ]}
              >
                <PixelText n={4} bold color={C.white}>
                  PROCESSING...
                </PixelText>
                <PixelText n={2} color="#C4C9CF">
                  {`CRUSHING TO ${clipSize.toUpperCase()} / 10 FPS`}
                </PixelText>
              </View>
            )}
            {toast}
          </View>

          <View
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: px(24) }]}
          >
            {!onPreset && (
              <View style={{ marginBottom: px(4) }}>
                <PixelText n={3} bold color={C.white} shadow="#000000">
                  {`${zoom.toFixed(1)}X`}
                </PixelText>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: px(4) }}>
              {ZOOM_PRESETS.map((preset) => (
                <BevelButton
                  key={preset}
                  label={`Zoom ${preset}x`}
                  active={Math.abs(zoom - preset) < 0.15}
                  onPress={() => applyZoom(preset)}
                  style={{ width: px(22), height: px(14) }}
                >
                  <PixelText n={2} bold>
                    {`${preset}X`}
                  </PixelText>
                </BevelButton>
              ))}
            </View>
          </View>
        </>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: px(8) }}>
          <PixelIcon name="camera" n={5} color={C.line} />
          <PixelText n={3} bold color={C.white}>
            CAMERA ACCESS NEEDED
          </PixelText>
          <BevelButton label="Allow camera" onPress={requestPermission} style={{ width: px(60), height: px(20) }}>
            <PixelText n={3} bold>
              ALLOW
            </PixelText>
          </BevelButton>
        </View>
      )}
    </View>
  )

  const panel = (
    <View
      key="panel"
      style={{
        flex: 1,
        backgroundColor: C.panel,
        borderTopWidth: EDGE,
        borderTopColor: C.white,
        justifyContent: 'space-evenly',
        // Keep the controls clear of the navigation bar: the real inset plus some breathing room.
        paddingTop: px(4),
        paddingBottom: insets.bottom + px(landscape ? 6 : 12),
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: px(22) }}>
        {(['video', 'photo'] as const).map((value) => {
          const selected = mode === value
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityLabel={`${value} mode`}
              accessibilityState={{ selected, disabled: locked }}
              disabled={locked}
              hitSlop={px(4)}
              onPress={() => setMode(value)}
              style={{ alignItems: 'center', opacity: locked && !selected ? 0.5 : 1 }}
            >
              <PixelText n={3} bold={selected} color={selected ? C.title : C.textDim}>
                {value.toUpperCase()}
              </PixelText>
              <View
                style={{
                  alignSelf: 'stretch',
                  height: EDGE * 1.5,
                  marginTop: px(2),
                  backgroundColor: selected ? C.title : 'transparent',
                }}
              />
            </Pressable>
          )
        })}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: px(12),
        }}
      >
        <BevelButton
          label="Open gallery"
          onPress={() => onGallery(isVideo ? 'videos' : 'photos')}
          disabled={locked}
          style={{ width: px(30), height: px(30) }}
        >
          {last ? (
            <Image source={{ uri: last }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          ) : (
            <PixelIcon name="images" n={3} />
          )}
        </BevelButton>

        <Shutter
          onPress={onShutter}
          disabled={processing}
          tone={isVideo ? 'red' : 'aqua'}
          recording={recording}
          label={isVideo ? (recording ? 'Stop recording' : 'Start recording') : 'Take photo'}
        />

        <BevelButton
          label="Switch camera"
          onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
          disabled={locked}
          style={{ width: px(30), height: px(30) }}
        >
          <PixelIcon name="reload" n={3} />
        </BevelButton>
      </View>
    </View>
  )

  // Every section has a stable key, so when the phone is rotated React matches them by role
  // and not by position. Without keys it recycled the upright viewfinder view as the sideways
  // column and carried its aspect ratio over, which broke the layout. The viewfinder block
  // (camera included) has the same parent and key in both layouts, so it stays mounted.
  const viewfinderBlock = (
    <View
      key="viewfinder"
      style={landscape ? { backgroundColor: '#000', paddingTop: insets.top, paddingBottom: insets.bottom } : undefined}
    >
      {viewfinder}
    </View>
  )

  return (
    <View
      style={{
        flex: 1,
        flexDirection: landscape ? 'row' : 'column',
        // Sideways, the margins beside the camera stay black so they read as bezel.
        backgroundColor: landscape ? '#000' : C.lcd,
        paddingLeft: landscape ? insets.left : 0,
        paddingRight: landscape ? insets.right : 0,
      }}
    >
      {landscape ? (
        <>
          {viewfinderBlock}
          <View key="column" style={{ flex: 1 }}>
            {titleBar}
            {panel}
          </View>
        </>
      ) : (
        <>
          {titleBar}
          {viewfinderBlock}
          {panel}
        </>
      )}
    </View>
  )
}

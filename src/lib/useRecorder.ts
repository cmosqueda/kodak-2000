import { File } from 'expo-file-system'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CameraVideoOutput, Recorder } from 'react-native-vision-camera'
import { type Stamp, writeStampPng } from './dateStamp'
import { addToAlbum } from './gallery'
import { nokiafyVideo, videoSize } from './nokiaVideo'

/** Early phones capped clips; this also keeps the ffmpeg pass quick. */
export const MAX_SECONDS = 30

type Status = 'idle' | 'recording' | 'processing'

type Callbacks = {
  onSaved: (uri: string) => void
  onFailed: () => void
  /** Asked when a recording starts: the date to imprint, or null for none. */
  getStamp: () => Stamp | null
  /** Asked when a recording starts: whether the phone is held sideways. Defaults to upright. */
  getLandscape?: () => boolean
}

const quietly = (uri: string) => {
  try {
    new File(uri.startsWith('file://') ? uri : `file://${uri}`).delete()
  } catch {
    // Temp files are cleaned up by the system eventually.
  }
}

/** Records raw video, then crushes it to a Nokia-style clip and saves it to the album. */
export function useRecorder(output: CameraVideoOutput, callbacks: Callbacks) {
  const [status, setStatus] = useState<Status>('idle')
  const [seconds, setSeconds] = useState(0)
  const recorder = useRef<Recorder | null>(null)
  const stamp = useRef<Stamp | null>(null)
  const landscape = useRef(false)
  const latest = useRef(callbacks)
  useEffect(() => {
    latest.current = callbacks
  })

  useEffect(() => {
    if (status !== 'recording') return
    const timer = setInterval(() => {
      setSeconds(Math.floor(recorder.current?.recordedDuration ?? 0))
    }, 250)
    return () => clearInterval(timer)
  }, [status])

  const finish = useCallback(async (filePath: string) => {
    recorder.current = null
    setStatus('processing')
    let converted: string | null = null
    let stampImage: string | null = null
    try {
      if (stamp.current) {
        const { width, height } = videoSize(landscape.current)
        stampImage = await writeStampPng(stamp.current, width, height)
      }
      try {
        converted = await nokiafyVideo(filePath, {
          landscape: landscape.current,
          stampUri: stampImage ?? undefined,
        })
      } catch (error) {
        // A failed overlay must not cost the user their clip: save it without the date.
        if (!stampImage) throw error
        converted = await nokiafyVideo(filePath, { landscape: landscape.current })
      }
      latest.current.onSaved(await addToAlbum(converted))
    } catch {
      latest.current.onFailed()
    } finally {
      quietly(filePath)
      if (converted) quietly(converted)
      if (stampImage) quietly(stampImage)
      setStatus('idle')
    }
  }, [])

  const start = useCallback(async () => {
    try {
      const next = await output.createRecorder({ maxDuration: MAX_SECONDS })
      recorder.current = next
      stamp.current = latest.current.getStamp() // the time the clip was started
      landscape.current = latest.current.getLandscape?.() ?? false // how the phone was held then
      setSeconds(0)
      await next.startRecording(
        (filePath) => {
          finish(filePath)
        },
        () => {
          recorder.current = null
          setStatus('idle')
          latest.current.onFailed()
        },
      )
      setStatus('recording')
    } catch {
      recorder.current = null
      latest.current.onFailed()
    }
  }, [output, finish])

  const stop = useCallback(async () => {
    try {
      await recorder.current?.stopRecording()
    } catch {
      // Already stopped (e.g. the 30 s limit hit first); the finish callback handles the file.
    }
  }, [])

  return { status, seconds, start, stop }
}

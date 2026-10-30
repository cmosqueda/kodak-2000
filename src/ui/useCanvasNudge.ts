import { useEffect, useState } from 'react'

/**
 * Returns a tiny, invisible offset that changes a few times shortly after mount. Apply it as
 * a translation on a static Skia canvas's content.
 *
 * Skia can drop the first picture of a canvas that mounts while the screen is still busy,
 * and a static canvas never repaints on its own, so it would stay blank. Re-rendering with
 * identical content does not help: Skia diffs the new tree against the old one and sends
 * nothing when they match. The content has to genuinely differ, so each tick shifts it by a
 * hundredth of a pixel, which forces a fresh picture and cannot be seen.
 */
export function useCanvasNudge(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timers = [80, 400, 1200].map((delay) => setTimeout(() => setTick((t) => t + 1), delay))
    return () => timers.forEach(clearTimeout)
  }, [])
  return (tick % 2) * 0.01
}

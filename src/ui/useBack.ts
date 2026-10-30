import { useEffect, useRef } from 'react'
import { BackHandler } from 'react-native'

/** Handles Android's back button while mounted. Return `true` when the press was handled. */
export function useBack(handler: () => boolean) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => latest.current())
    return () => subscription.remove()
  }, [])
}

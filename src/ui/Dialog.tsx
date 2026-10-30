import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { PixelRatio, StyleSheet, View } from 'react-native'
import { BevelButton, GradientBar } from './Bevel'
import { PixelIcon } from './PixelIcon'
import { PixelText } from './PixelText'
import { usePx } from './scale'
import { C } from './theme'

const EDGE = 2 / PixelRatio.get()

type ConfirmProps = {
  title: string
  lines: string[]
  yes: string
  no: string
  onYes: () => void
  onNo: () => void
}

/** A modal Yes/No dialog with a blue title bar and raised buttons. */
export function ConfirmDialog({ title, lines, yes, no, onYes, onNo }: ConfirmProps) {
  const px = usePx()
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: 'rgba(11,27,46,0.55)', alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      <View style={{ width: px(140), backgroundColor: C.lcd, borderWidth: EDGE * 1.5, borderColor: C.text }}>
        <GradientBar height={14}>
          <View style={{ paddingHorizontal: px(6) }}>
            <PixelText n={3} bold color={C.white} shadow={C.navy}>
              {title}
            </PixelText>
          </View>
        </GradientBar>
        <View style={{ padding: px(8), gap: px(4), alignItems: 'center' }}>
          {lines.map((line) => (
            <PixelText key={line} n={3}>
              {line}
            </PixelText>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: px(8), paddingBottom: px(8) }}>
          <BevelButton label={yes} onPress={onYes} style={{ width: px(52), height: px(20) }}>
            <PixelText n={3} bold>
              {yes}
            </PixelText>
          </BevelButton>
          <BevelButton label={no} onPress={onNo} style={{ width: px(52), height: px(20) }}>
            <PixelText n={3} bold>
              {no}
            </PixelText>
          </BevelButton>
        </View>
      </View>
    </View>
  )
}

function Toast({ text }: { text: string }) {
  const px = usePx()
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: px(10), left: 0, right: 0, alignItems: 'center' }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: px(4),
          paddingHorizontal: px(8),
          paddingVertical: px(4),
          backgroundColor: C.panel,
          borderWidth: EDGE,
          borderColor: C.text,
          borderTopColor: C.white,
          borderLeftColor: C.white,
          borderBottomColor: C.shade,
          borderRightColor: C.shade,
        }}
      >
        <PixelIcon name="check" n={2} />
        <PixelText n={3} bold>
          {text}
        </PixelText>
      </View>
    </View>
  )
}

/** Returns a toast element to render and a function that shows it for ~1.6 seconds. */
export function useToast(): readonly [ReactNode, (text: string) => void] {
  const [text, setText] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const show = useCallback((message: string) => {
    clearTimeout(timer.current)
    setText(message)
    timer.current = setTimeout(() => setText(null), 1600)
  }, [])
  return [text ? <Toast text={text} /> : null, show] as const
}

import type { ReactNode } from 'react'
import { PixelRatio, Pressable, StyleSheet, View, type ViewStyle } from 'react-native'
import { usePx } from './scale'
import { C, TITLE_GRADIENT } from './theme'

/** Two device pixels, the thickness of a classic bevel edge. */
const EDGE = 2 / PixelRatio.get()

type ButtonProps = {
  children: ReactNode
  onPress: () => void
  label: string
  disabled?: boolean
  /** Stays sunken, like a selected toggle. */
  active?: boolean
  style?: ViewStyle
}

/** A raised gray button that sinks when pressed (or when `active`). */
export function BevelButton({ children, onPress, label, disabled, active, style }: ButtonProps) {
  return (
    <View style={[{ borderWidth: EDGE, borderColor: C.text }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => {
          const down = pressed || active
          return {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: down ? '#BFC3B8' : C.panel,
            borderTopWidth: EDGE,
            borderLeftWidth: EDGE,
            borderBottomWidth: EDGE,
            borderRightWidth: EDGE,
            borderTopColor: down ? C.shade : C.white,
            borderLeftColor: down ? C.shade : C.white,
            borderBottomColor: down ? C.white : C.shade,
            borderRightColor: down ? C.white : C.shade,
          }
        }}
      >
        {children}
      </Pressable>
    </View>
  )
}

/** A recessed frame, used around thumbnails and readouts. */
export function Sunken({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          borderTopWidth: EDGE,
          borderLeftWidth: EDGE,
          borderBottomWidth: EDGE,
          borderRightWidth: EDGE,
          borderTopColor: C.shade,
          borderLeftColor: C.shade,
          borderBottomColor: C.white,
          borderRightColor: C.white,
          backgroundColor: C.text,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

/** A strip filled with the blue title-bar gradient. */
export function GradientBar({
  height,
  paddingTop = 0,
  children,
}: {
  height: number
  /** Extra space above the content, e.g. the Android status bar. */
  paddingTop?: number
  children?: ReactNode
}) {
  const px = usePx()
  return (
    <View style={{ height: px(height) + paddingTop, paddingTop, backgroundColor: C.title }}>
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'column' }]}>
        {TITLE_GRADIENT.map((color) => (
          <View key={color} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </View>
      <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>
    </View>
  )
}

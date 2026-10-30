import {
  Canvas,
  Circle,
  LinearGradient,
  Oval,
  RadialGradient,
  RoundedRect,
  vec,
} from '@shopify/react-native-skia'
import { Pressable } from 'react-native'
import { usePx } from './scale'
import { C } from './theme'

const TONES = {
  aqua: { orb: ['#EAF8FF', '#6FB4EA', '#1D4E9A'], edge: C.navy },
  red: { orb: ['#FFECEC', '#F0746A', '#9A1D1D'], edge: '#5A0F0F' },
}

type Props = {
  onPress: () => void
  disabled?: boolean
  /** Aqua for photos, red for video. */
  tone?: keyof typeof TONES
  /** Shows a white stop square on the orb. */
  recording?: boolean
  label?: string
}

/** Glossy shutter: a silver bezel around a Y2K "jelly" orb. */
export function Shutter({ onPress, disabled, tone = 'aqua', recording, label = 'Take photo' }: Props) {
  const px = usePx()
  const size = px(34)
  const r = size / 2
  const { orb, edge } = TONES[tone]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        opacity: disabled ? 0.6 : 1,
        transform: [{ scale: pressed ? 0.93 : 1 }],
      })}
    >
      <Canvas style={{ width: size, height: size }}>
        <Circle cx={r} cy={r} r={r - 1}>
          <LinearGradient start={vec(0, 0)} end={vec(0, size)} colors={['#FFFFFF', '#8F958A']} />
        </Circle>
        <Circle cx={r} cy={r} r={r - 1} style="stroke" strokeWidth={1.5} color={C.text} />
        <Circle cx={r} cy={r} r={r * 0.74}>
          <RadialGradient c={vec(r * 0.8, r * 0.7)} r={r * 1.1} colors={orb} positions={[0, 0.5, 1]} />
        </Circle>
        <Circle cx={r} cy={r} r={r * 0.74} style="stroke" strokeWidth={1.5} color={edge} />
        <Oval x={r * 0.42} y={r * 0.3} width={r * 1.16} height={r * 0.5} color="rgba(255,255,255,0.55)" />
        {recording ? (
          <RoundedRect x={r * 0.62} y={r * 0.62} width={r * 0.76} height={r * 0.76} r={2} color="#FFFFFF" />
        ) : null}
      </Canvas>
    </Pressable>
  )
}

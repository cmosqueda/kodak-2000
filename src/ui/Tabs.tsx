import { PixelRatio, Pressable, View } from 'react-native'
import { PixelText } from './PixelText'
import { usePx } from './scale'
import { C } from './theme'

const EDGE = 2 / PixelRatio.get()

type Tab<T extends string> = { key: T; label: string; count: number }

type Props<T extends string> = {
  tabs: Tab<T>[]
  value: T
  onChange: (key: T) => void
}

/** Folder-style tabs: the active one is raised and merges into the page below it. */
export function Tabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  const px = usePx()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: px(2),
        paddingHorizontal: px(4),
        paddingTop: px(4),
        backgroundColor: C.lcd,
        borderBottomWidth: EDGE,
        borderBottomColor: C.shade,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.key === value
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label} ${tab.count}`}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(tab.key)}
            style={{
              flex: 1,
              height: px(active ? 20 : 17),
              marginBottom: active ? -EDGE : 0,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: px(4),
              backgroundColor: active ? C.lcd : '#BFC3B8',
              borderWidth: EDGE,
              borderBottomWidth: active ? 0 : EDGE,
              borderTopColor: active ? C.white : C.shade,
              borderLeftColor: active ? C.white : C.shade,
              borderRightColor: C.shade,
              borderBottomColor: C.shade,
            }}
          >
            <PixelText n={3} bold={active} color={active ? C.text : C.textDim}>
              {tab.label}
            </PixelText>
            <PixelText n={2} color={active ? C.title : C.textDim}>
              {String(tab.count)}
            </PixelText>
          </Pressable>
        )
      })}
    </View>
  )
}

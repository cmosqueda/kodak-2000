import { type SkTypeface, useTypeface } from '@shopify/react-native-skia'
import { createContext, type ReactNode, useContext, useEffect } from 'react'
import { View } from 'react-native'
import { hideSplash } from './splash'
import { C } from './theme'

type Faces = { regular: SkTypeface; bold: SkTypeface }

const FontContext = createContext<Faces | null>(null)

/**
 * Loads the Silkscreen pixel font once; children render after it is ready. The logo splash
 * stays up until then, so the app never shows an empty screen while it boots.
 */
export function FontProvider({ children }: { children: ReactNode }) {
  const regular = useTypeface(require('../../assets/fonts/Silkscreen_400Regular.ttf'))
  const bold = useTypeface(require('../../assets/fonts/Silkscreen_700Bold.ttf'))
  const ready = Boolean(regular && bold)

  useEffect(() => {
    if (ready) hideSplash()
  }, [ready])

  if (!regular || !bold) {
    return <View style={{ flex: 1, backgroundColor: C.desk }} />
  }
  return <FontContext.Provider value={{ regular, bold }}>{children}</FontContext.Provider>
}

export function useFaces(): Faces {
  const faces = useContext(FontContext)
  if (!faces) throw new Error('useFaces must be used inside <FontProvider>')
  return faces
}

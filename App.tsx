import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import type { GalleryTab } from './src/lib/gallery'
import { CameraScreen } from './src/screens/CameraScreen'
import { Gallery } from './src/screens/Gallery'
import { FontProvider } from './src/ui/fonts'
import { ScaleProvider } from './src/ui/scale'
import { SCREEN_W } from './src/ui/theme'

type Route = 'camera' | 'gallery'

/**
 * Two screens, so navigation is a plain state switch. The camera stays mounted under the
 * gallery (and pauses), which makes coming back instant and avoids tearing down the
 * camera pipeline. The UI is laid out on a 176-unit grid (the Nokia 7650's display width)
 * and scaled to the phone's shorter side, so it keeps its size when the phone is rotated.
 */
export default function App() {
  const { width, height } = useWindowDimensions()
  const [route, setRoute] = useState<Route>('camera')
  const [galleryTab, setGalleryTab] = useState<GalleryTab>('photos')

  return (
    <ScaleProvider value={Math.min(width, height) / SCREEN_W}>
      <StatusBar style="light" />
      <FontProvider>
        <View style={{ flex: 1 }}>
          <CameraScreen
            active={route === 'camera'}
            onGallery={(tab) => {
              setGalleryTab(tab)
              setRoute('gallery')
            }}
          />
          {route === 'gallery' && (
            <View style={StyleSheet.absoluteFill}>
              <Gallery initialTab={galleryTab} onBack={() => setRoute('camera')} />
            </View>
          )}
        </View>
      </FontProvider>
    </ScaleProvider>
  )
}

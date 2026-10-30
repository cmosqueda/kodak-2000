import { useVideoPlayer, VideoView } from 'expo-video'
import { useEffect, useMemo, useState } from 'react'
import { FlatList, Image, Pressable, useWindowDimensions, View } from 'react-native'
import { useInsets } from '../ui/insets'
import { deletePhoto, type GalleryTab, loadPhotos, type Photo } from '../lib/gallery'
import { BevelButton, GradientBar, Sunken } from '../ui/Bevel'
import { ConfirmDialog, useToast } from '../ui/Dialog'
import { PixelIcon } from '../ui/PixelIcon'
import { PixelText } from '../ui/PixelText'
import { usePx } from '../ui/scale'
import { Tabs } from '../ui/Tabs'
import { C } from '../ui/theme'
import { useBack } from '../ui/useBack'

/** Thumbnail columns: more of them when the phone is held sideways. */
const COLUMNS = { portrait: 3, landscape: 6 }

type Props = {
  /** Which tab to open on, e.g. Videos when the camera was in video mode. */
  initialTab: GalleryTab
  onBack: () => void
}

/** The gallery: photos and videos on separate tabs, a thumbnail grid, and a swipeable viewer. */
export function Gallery({ initialTab, onBack }: Props) {
  const insets = useInsets()
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloads, setReloads] = useState(0)
  const [tab, setTab] = useState<GalleryTab>(initialTab)
  const [viewing, setViewing] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [toast, showToast] = useToast()

  useEffect(() => {
    let cancelled = false
    loadPhotos()
      .then((list) => {
        if (cancelled) return
        setPhotos(list)
        setError(null)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'COULD NOT LOAD')
      })
    return () => {
      cancelled = true
    }
  }, [reloads])

  useBack(() => {
    if (confirming) setConfirming(false)
    else if (viewing !== null) setViewing(null)
    else onBack()
    return true
  })

  const { shown, photoCount, videoCount } = useMemo(() => {
    const all = photos ?? []
    const videos = all.filter((item) => item.isVideo)
    const stills = all.filter((item) => !item.isVideo)
    return {
      shown: tab === 'videos' ? videos : stills,
      photoCount: stills.length,
      videoCount: videos.length,
    }
  }, [photos, tab])

  const current = viewing === null ? undefined : shown[viewing]

  const changeTab = (next: GalleryTab) => {
    setTab(next)
    setViewing(null)
  }

  const removeCurrent = async () => {
    setConfirming(false)
    if (!current || viewing === null) return
    try {
      await deletePhoto(current)
      setReloads((n) => n + 1)
      setViewing(shown.length <= 1 ? null : Math.min(viewing, shown.length - 2))
      showToast(current.isVideo ? 'VIDEO DELETED' : 'PHOTO DELETED')
    } catch {
      showToast('DELETE FAILED')
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: viewing === null ? C.lcd : '#000',
        // Sideways, the navigation bar or camera cutout can sit on either edge.
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {viewing !== null && current ? (
        <Viewer
          photos={shown}
          index={Math.min(viewing, shown.length - 1)}
          onIndex={setViewing}
          onBack={() => setViewing(null)}
          onDelete={() => setConfirming(true)}
        />
      ) : (
        <Grid
          photos={photos === null ? null : shown}
          error={error}
          tab={tab}
          counts={{ photos: photoCount, videos: videoCount }}
          onTab={changeTab}
          onBack={onBack}
          onOpen={setViewing}
        />
      )}
      {toast}
      {confirming && (
        <ConfirmDialog
          title="DELETE"
          lines={[current?.isVideo ? 'DELETE THIS VIDEO?' : 'DELETE THIS PHOTO?']}
          yes="YES"
          no="NO"
          onYes={removeCurrent}
          onNo={() => setConfirming(false)}
        />
      )}
    </View>
  )
}

function Header({
  title,
  right,
  onBack,
  action,
}: {
  title: string
  right?: string
  onBack: () => void
  action?: { icon: 'trash'; label: string; onPress: () => void }
}) {
  const px = usePx()
  const insets = useInsets()
  return (
    <GradientBar height={22} paddingTop={insets.top}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: px(5),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
          <BevelButton label="Back" onPress={onBack} style={{ width: px(18), height: px(16) }}>
            <PixelIcon name="arrowLeft" n={2} />
          </BevelButton>
          <PixelText n={3} bold color={C.white} shadow={C.navy}>
            {title}
          </PixelText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
          {right ? (
            <PixelText n={3} color={C.white} shadow={C.navy}>
              {right}
            </PixelText>
          ) : null}
          {action ? (
            <BevelButton label={action.label} onPress={action.onPress} style={{ width: px(18), height: px(16) }}>
              <PixelIcon name={action.icon} n={2} />
            </BevelButton>
          ) : null}
        </View>
      </View>
    </GradientBar>
  )
}

/** Marks a thumbnail as a video. */
function PlayBadge({ size }: { size: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ opacity: 0.95 }}>
        <PixelIcon name="play" n={size} color={C.white} shadow="#000000" />
      </View>
    </View>
  )
}

function Grid({
  photos,
  error,
  tab,
  counts,
  onTab,
  onBack,
  onOpen,
}: {
  photos: Photo[] | null
  error: string | null
  tab: GalleryTab
  counts: { photos: number; videos: number }
  onTab: (tab: GalleryTab) => void
  onBack: () => void
  onOpen: (index: number) => void
}) {
  const px = usePx()
  const insets = useInsets()
  const { width, height } = useWindowDimensions()
  const columns = width > height ? COLUMNS.landscape : COLUMNS.portrait
  const pad = px(4)
  const gap = px(3)
  const size = (width - insets.left - insets.right - pad * 2 - gap * (columns - 1)) / columns

  const message = error ?? (photos === null ? 'PLEASE WAIT...' : null)
  const empty = photos !== null && photos.length === 0
  const isVideos = tab === 'videos'

  return (
    <View style={{ flex: 1 }}>
      <Header title="GALLERY" onBack={onBack} />
      <Tabs
        value={tab}
        onChange={onTab}
        tabs={[
          { key: 'photos', label: 'PHOTOS', count: counts.photos },
          { key: 'videos', label: 'VIDEOS', count: counts.videos },
        ]}
      />
      {message || empty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: px(8) }}>
          <PixelIcon name={isVideos ? 'video' : 'images'} n={5} color={C.shade} />
          <PixelText n={3} bold>
            {message ?? (isVideos ? 'NO VIDEOS YET' : 'NO PHOTOS YET')}
          </PixelText>
          {empty ? (
            <PixelText n={2} color={C.textDim}>
              {isVideos ? 'SWITCH THE CAMERA TO VIDEO' : 'TAKE ONE WITH THE CAMERA'}
            </PixelText>
          ) : null}
        </View>
      ) : (
        <FlatList
          // A separate list per tab and column count, so switching tabs or rotating re-lays-out cleanly.
          key={`${tab}-${columns}`}
          data={photos ?? []}
          numColumns={columns}
          keyExtractor={(photo) => photo.id}
          contentContainerStyle={{ padding: pad, paddingBottom: pad + insets.bottom, gap }}
          columnWrapperStyle={{ gap }}
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityLabel={`Open ${item.isVideo ? 'video' : 'photo'} ${index + 1}`}
              onPress={() => onOpen(index)}
            >
              {({ pressed }) => (
                <Sunken style={{ width: size, height: size * (4 / 3), opacity: pressed ? 0.7 : 1 }}>
                  <Image source={{ uri: item.uri }} resizeMode="cover" style={{ flex: 1 }} />
                  {item.isVideo ? <PlayBadge size={3} /> : null}
                </Sunken>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

/** Plays a clip on loop; tap to pause or resume. Only mounted for the visible page. */
function VideoPage({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true
    p.play()
  })
  const [paused, setPaused] = useState(false)

  const toggle = () => {
    if (player.playing) {
      player.pause()
      setPaused(true)
    } else {
      player.play()
      setPaused(false)
    }
  }

  return (
    <Pressable accessibilityLabel="Play or pause" style={{ flex: 1 }} onPress={toggle}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls={false} />
      {paused ? <PlayBadge size={6} /> : null}
    </Pressable>
  )
}

function Viewer({
  photos,
  index,
  onIndex,
  onBack,
  onDelete,
}: {
  photos: Photo[]
  index: number
  onIndex: (index: number) => void
  onBack: () => void
  onDelete: () => void
}) {
  const insets = useInsets()
  const { width: windowWidth } = useWindowDimensions()
  const width = windowWidth - insets.left - insets.right
  const current = photos[index]
  return (
    <View style={{ flex: 1 }}>
      <Header
        title={current?.isVideo ? 'VIDEO' : 'PHOTO'}
        right={`${index + 1}/${photos.length}`}
        onBack={onBack}
        action={{ icon: 'trash', label: current?.isVideo ? 'Delete video' : 'Delete photo', onPress: onDelete }}
      />
      <FlatList
        // Remount when the list or the page width changes (delete, rotate) so the page stays put.
        key={`${photos.length}-${width}`}
        horizontal
        pagingEnabled
        data={photos}
        extraData={index}
        keyExtractor={(photo) => photo.id}
        initialScrollIndex={index}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(event) => onIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: page }) => (
          <View style={{ width, flex: 1, paddingBottom: insets.bottom }}>
            {item.isVideo && page === index ? (
              <VideoPage uri={item.uri} />
            ) : (
              <>
                <Image source={{ uri: item.uri }} resizeMode="contain" style={{ flex: 1 }} />
                {item.isVideo ? <PlayBadge size={6} /> : null}
              </>
            )}
          </View>
        )}
      />
    </View>
  )
}

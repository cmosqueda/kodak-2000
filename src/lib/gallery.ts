import { Album, Asset, MediaType, requestPermissionsAsync } from 'expo-media-library'

export const ALBUM_NAME = 'Kodak 2000'

/** The gallery keeps photos and videos on separate tabs. */
export type GalleryTab = 'photos' | 'videos'

/** A photo or video in the "Kodak 2000" album. */
export type Photo = {
  id: string
  uri: string
  created: number
  isVideo: boolean
  asset: Asset
}

async function ensurePermission() {
  const permission = await requestPermissionsAsync(false, ['photo', 'video'])
  if (!permission.granted) {
    throw new Error('Photo library permission was denied')
  }
}

/** All photos and videos in the "Kodak 2000" album, newest first. */
export async function loadPhotos(): Promise<Photo[]> {
  await ensurePermission()
  const album = await Album.get(ALBUM_NAME)
  if (!album) return []

  const assets = await album.getAssets()
  const photos = await Promise.all(
    assets.map(async (asset) => ({
      id: asset.id,
      asset,
      uri: await asset.getUri(),
      created: (await asset.getCreationTime()) ?? 0,
      isVideo: (await asset.getMediaType()) === MediaType.VIDEO,
    })),
  )
  return photos.sort((a, b) => b.created - a.created)
}

export async function deletePhoto(photo: Photo): Promise<void> {
  await Asset.delete([photo.asset])
}

/** Adds a local photo or video file to the album (creating it if needed); returns the saved URI. */
export async function addToAlbum(fileUri: string): Promise<string> {
  await ensurePermission()
  const album = await Album.get(ALBUM_NAME)
  if (album) {
    return await (await Asset.create(fileUri, album)).getUri()
  }
  const asset = await Asset.create(fileUri)
  await Album.create(ALBUM_NAME, [asset])
  return await asset.getUri()
}

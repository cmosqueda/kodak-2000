/**
 * Subset of pixelarticons (https://github.com/halfmage/pixelarticons) v2.4.2, MIT License.
 * Copyright (c) 2019 Gerrit Halfmann. See THIRD_PARTY_LICENSES.md.
 * Each value is the SVG path data of a 24x24 icon.
 */
export const PIXEL_ICONS = {
  camera: "M4 5h4v2H4zm4-2h8v2H8zm8 2h4v2h-4zM2 7h2v12H2zm2 12h16v2H4zM20 7h2v12h-2zM10 8h4v2h-4zm0 6h4v2h-4zm-2-4h2v4H8zm6 0h2v4h-2z",
  images: "M7 2h14v2H7zm0 14h14v2H7zm-4 4h14v2H3zM5 4h2v12H5zM1 8h2v12H1zm20-4h2v12h-2zm-4 6h2v2h-2zm2 2h2v2h-2zm-4 0h2v2h-2zm-2 2h2v2h-2zm-2-8h2v2h-2zM9 8h2v2H9zm2 2h2v2h-2zm2-2h2v2h-2zM3 6h2v2H3zm14 12h2v2h-2z",
  trash: "M18 22H6V20H18V22ZM9 6H15V4H17V6H22V8H20V20H18V8H6V20H4V8H2V6H7V4H9V6ZM15 4H9V2H15V4Z",
  arrowLeft: "M20 11v2H4v-2zM8 13v2H6v-2zm2 2v2H8v-2zm2 2v2h-2v-2zm-4-6V9H6v2z M10 15V7H8v8zm2 2V5h-2v12z",
  chevronLeft: "M8 13v-2h2v2H8Zm2-2V9h2v2h-2Zm0 4v-2h2v2h-2Zm2-6V7h2v2h-2Zm0 8v-2h2v2h-2Zm2-10V5h2v2h-2Zm0 12v-2h2v2h-2Z",
  chevronRight: "M16 13v-2h-2v2h2Zm-2-2V9h-2v2h2Zm0 4v-2h-2v2h2Zm-2-6V7h-2v2h2Zm0 8v-2h-2v2h2ZM10 7V5H8v2h2Zm0 12v-2H8v2h2Z",
  close: "M7 19H5V17H7V19ZM19 19H17V17H19V19ZM9 15V17H7V15H9ZM17 17H15V15H17V17ZM11 15H9V13H11V15ZM15 15H13V13H15V15ZM13 13H11V11H13V13ZM11 11H9V9H11V11ZM15 11H13V9H15V11ZM9 9H7V7H9V9ZM17 9H15V7H17V9ZM7 7H5V5H7V7ZM19 7H17V5H19V7Z",
  check: "M10 18H8v-2h2v2Zm-2-2H6v-2h2v2Zm4-2v2h-2v-2h2Zm-6 0H4v-2h2v2Zm8 0h-2v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2V8h2v2Zm2-2h-2V6h2v2Z",
  reload: "M16 4h2v6h-2zm-2-2h2v2h-2zm0 2h2v8h-2zM4 8H2v5h2z M4 6h16v2H4zm4 14H6v-6h2zm2 2H8v-2h2zm0-2H8v-8h2zm10-4h2v-5h-2z M20 18H4v-2h16z",
  play: "M15 11h-2V9h2zm0 4h-2v-2h2zm-2 2h-2v-2h2zm0-8h-2V7h2zm-2-2H9V5h2zM9 21H7V3h2zm6-8h2v-2h-2zm-6 4h2v2H9z",
  video: "M20 17V7h2v10zm-2-2V9h2v6zM2 7h2v10H2zm14 0h2v10h-2zM4 5h12v2H4zm0 12h12v2H4z",
  plus: "M13 11h7v2h-7v7h-2v-7H4v-2h7V4h2v7Z",
  minus: "M4 11h16v2H4z",
  lightbulb: "M9 4h6v2H9zM7 6h2v2H7zm8 0h2v2h-2zm4-2h2v2h-2zm2-2h2v2h-2zM0 10h3v2H0zm21 0h3v2h-3zM3 4h2v2H3zM1 2h2v2H1zm6 12h2v2H7zm8 0h2v2h-2zM5 8h2v6H5zm12 0h2v6h-2zm-8 8h6v2H9zm0 4h6v2H9zm0-2h2v2H9zm4 0h2v2h-2zM11 0h2v3h-2z",
  lightbulbOff: "M9 3h6v2H9zM7 5h2v2H7zm8 0h2v2h-2zm-8 8h2v2H7zm8 0h2v2h-2zM5 7h2v6H5zm12 0h2v6h-2zm-8 8h6v2H9zm0 4h6v2H9zm0-2h2v2H9zm4 0h2v2h-2z",
} as const

export type PixelIconName = keyof typeof PIXEL_ICONS

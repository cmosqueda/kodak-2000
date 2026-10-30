/** Width of the design grid in "units"; the app scales it to the real screen width. */
export const SCREEN_W = 176

/** Early-2000s handset palette: pale gray LCD, Series 60 blue, glossy aqua. */
export const C = {
  desk: '#101216',
  lcd: '#DBDDD4',
  panel: '#CED1C7',
  text: '#10151F',
  textDim: '#5B6358',
  white: '#FFFFFF',
  shade: '#7A8077',
  line: '#9AA096',
  navy: '#0F2A5C',
  title: '#2A5498',
  aqua: '#6FAEDD',
} as const

/** Blue title-bar gradient, top to bottom, in coarse steps like an early LCD. */
export const TITLE_GRADIENT = ['#4B78BD', '#3F6CB2', '#3460A6', '#2A5498', '#21488B']

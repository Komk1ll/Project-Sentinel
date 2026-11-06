/** Shared by the runtime and offline scene-review export. Colours are sRGB hex. */
export const EVENING_LIGHT = {
  sky:0x7798ac,sun:0xffc38a,sunIntensity:2.1,interiorIntensity:2.3,
  ambientSky:0xabc9e3,ambientGround:0x6d7056,ambientIntensity:1,
  fill:0xa7c5dc,fillIntensity:.35,exposure:1.1,sunOffset:[-45,38,-28],
} as const;

export type TownTheme = 'morning' | 'night';
export const TOWN_LIGHT = {
  morning: {
    sky: 0xaacfe4, sun: 0xffe1aa, sunIntensity: 2.45, interiorIntensity: 2.15,
    ambientSky: 0xc5dff4, ambientGround: 0x95896a, ambientIntensity: 1.05,
    fill: 0xc1d9ee, fillIntensity: .33, exposure: 1.06, sunOffset: [-45, 31, -28],
  },
  night: {
    sky: 0x233854, sun: 0x9cbbff, sunIntensity: .55, interiorIntensity: 1.25,
    ambientSky: 0x88aaf0, ambientGround: 0x545268, ambientIntensity: .58,
    fill: 0x879fd1, fillIntensity: .2, exposure: 1.04, sunOffset: [32, 42, -36],
  },
} as const;

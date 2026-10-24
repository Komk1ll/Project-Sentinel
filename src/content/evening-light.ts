/** Shared by the runtime and offline scene-review export. Colours are sRGB hex. */
export const EVENING_LIGHT = {
  sky:0x555e83,sun:0xffb77e,sunIntensity:1.5,interiorIntensity:2.3,
  ambientSky:0x9eb9e5,ambientGround:0x55534f,ambientIntensity:.9,
  fill:0xa7bce8,fillIntensity:.3,exposure:1.08,sunOffset:[-45,38,-28],
} as const;

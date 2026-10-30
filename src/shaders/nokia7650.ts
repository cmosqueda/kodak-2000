import { Skia } from '@shopify/react-native-skia'

/**
 * Nokia 7650 (2002) color science: tiny dynamic range (clipped highlights, faded
 * gray blacks), muted colors, a slight cold/cyan cast and coarse color depth.
 * No blur, no pixelation and no sharpening - softness comes from the VGA
 * resolution and JPEG compression.
 *
 * Uniforms: `time` seconds (animates the sensor noise).
 */
const source = `
uniform shader src;
uniform float time;

const float LEVELS = 24.0;

float hash(float2 p) {
  return fract(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453);
}

half4 main(float2 xy) {
  half4 col = src.eval(xy);

  // Little dynamic range: push contrast and gain so highlights blow out to white.
  col.rgb = (col.rgb - 0.5) * 1.12 + 0.5;
  col.rgb *= 1.14;

  // Faded, muddy blacks with a faint blue-gray tint.
  col.rgb = col.rgb * 0.92 + half3(0.05, 0.06, 0.075);

  // Muted colors (about -22% saturation).
  half luma = dot(col.rgb, half3(0.299, 0.587, 0.114));
  col.rgb = mix(half3(luma), col.rgb, 0.78);

  // Slightly cold white balance, leaning cyan-blue.
  col.rgb *= half3(0.95, 1.0, 1.06);

  // Low-level per-pixel sensor noise (also dithers the quantization below).
  float n = hash(xy + floor(time * 12.0)) - 0.5;
  col.rgb += n * 0.04;

  // Coarse color depth for slightly visible banding.
  col.rgb = floor(clamp(col.rgb, 0.0, 1.0) * LEVELS + 0.5) / LEVELS;

  return half4(col.rgb, 1.0);
}
`

export const nokia7650Effect = Skia.RuntimeEffect.Make(source)!

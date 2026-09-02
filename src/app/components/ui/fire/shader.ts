// Fullscreen fragment shader: the card is a signed distance field, noise
// displaces that field's edge, and the noise scrolls upward -- fire is born
// at the bottom and flows to the top continuously instead of looping a CSS
// keyframe. Adapted from a standalone demo tuned for one large hero card;
// `uMargin`/`uCard` are supplied per-instance here since FireCanvas sizes
// itself to whatever card it's layered over.

export const VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const FRAG = `
  precision highp float;

  varying vec2 vUv;
  uniform vec2  uRes;      // canvas size, css px
  uniform vec2  uCard;     // card half-size, px
  uniform vec2  uOffset;   // card centre relative to canvas centre
  uniform float uRadius;
  uniform float uTime;
  uniform float uIntensity;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p = m * p;
      a *= 0.5;
    }
    return v;
  }

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    vec2 p = (vUv - 0.5) * uRes - uOffset;   // px, y up, origin at card centre
    float d = sdRoundBox(p, uCard, uRadius); // >0 outside the card

    // 0 at the card's bottom edge, 1 at its top, >1 above it
    float h  = (p.y + uCard.y) / (2.0 * uCard.y);
    float hc = clamp(h, -0.2, 1.8);
    float grow = smoothstep(-0.1, 1.15, hc);

    // fire gets bigger and looser the higher it has travelled
    float amp   = mix(12.0, 78.0, grow) * uIntensity;
    float thick = mix(10.0, 30.0, grow) * uIntensity;

    float t = uTime;

    // sample space: squashed vertically, scrolling down => pattern rises
    vec2 q = vec2(p.x * 0.016, p.y * 0.009 - t * 0.85);

    // domain warp -- this is what makes it curl instead of just wobble
    vec2 w = vec2(fbm(q * 0.6 + 1.3), fbm(q * 0.6 + 7.7));
    float n  = fbm(q + w * 1.2);
    float n2 = fbm(q * 2.4 + w * 0.8 + vec2(0.0, -t * 0.55));
    float ns = mix(n, n2, 0.35);

    // displace the card's outline by the noise -> flame silhouette
    float dd = d - (ns - 0.42) * amp;
    float I  = 1.0 - smoothstep(0.0, thick, dd);

    I *= smoothstep(-uCard.y - 34.0, -uCard.y + 26.0, p.y); // nothing below
    I *= mix(1.0, 0.5, smoothstep(0.95, 1.75, hc));         // thin at the tips
    I *= 0.75 + 0.45 * ns;                                  // break up the body
    I *= smoothstep(-20.0, 6.0, d);                         // fade over the edge
    I  = clamp(I, 0.0, 1.0);

    // temperature ramp: deep red -> orange -> yellow -> near white
    vec3 col = mix(vec3(0.60, 0.05, 0.01), vec3(1.0, 0.30, 0.02), smoothstep(0.10, 0.40, I));
    col = mix(col, vec3(1.0, 0.66, 0.10), smoothstep(0.38, 0.68, I));
    col = mix(col, vec3(1.0, 0.93, 0.70), smoothstep(0.70, 0.94, I));
    float a = smoothstep(0.06, 0.42, I);

    // ambient heat bloom around the whole shape
    float glow = exp(-max(d, 0.0) * 0.010) * (0.55 + 0.45 * ns) * 0.30 * uIntensity;
    glow *= smoothstep(-uCard.y - 60.0, -uCard.y + 60.0, p.y);
    col += vec3(1.0, 0.34, 0.06) * glow;
    a = max(a, glow * 0.85);

    // embers: a grid of cells scrolling upward, a few lit per row
    vec2 sp  = vec2(p.x * 0.020, p.y * 0.020 + t * 0.85);
    vec2 cid = floor(sp);
    vec2 fr  = fract(sp) - 0.5;
    vec2 r2  = vec2(hash(cid), hash(cid + 13.7));
    float sd = length(fr - (r2 - 0.5) * 0.7);
    float spark = smoothstep(0.10, 0.0, sd) * step(0.90, r2.y);
    spark *= smoothstep(4.0, 40.0, d) * (1.0 - smoothstep(220.0, 480.0, d));
    spark *= smoothstep(-0.1, 0.3, hc);
    col += vec3(1.0, 0.60, 0.20) * spark * 1.6;
    a = max(a, spark * 0.95);

    gl_FragColor = vec4(col, a);
  }
`;

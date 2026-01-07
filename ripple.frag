precision mediump float;

uniform sampler2D u_tex;

uniform vec2  u_mouse;      // 0..1
uniform float u_radius;     // can exceed 1.0
uniform float u_amp;        // strength
uniform float u_time;
uniform float u_mix;        // 0..1

// shockwave
uniform vec2  u_clickPos;   // 0..1
uniform float u_clickAge;   // seconds since last click (0..)

// mobile perf toggle (0 or 1)
uniform float u_mobile;

varying vec2 vTexCoord;

// -------- noise ----------
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

float noise2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash21(i), b=hash21(i+vec2(1,0)), c=hash21(i+vec2(0,1)), d=hash21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}

vec2 noise2v(vec2 p){ return vec2(noise2(p), noise2(p+37.2)); }

float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  v += a * noise2(p); p *= 2.02; a *= 0.5;
  v += a * noise2(p); p *= 2.03; a *= 0.5;
  v += a * noise2(p);
  return v;
}

// -------- helpers ----------
vec4 tex(vec2 uv){ return texture2D(u_tex, clamp(uv, vec2(0.0), vec2(1.0))); }

void main(){
  vec2 uv = vTexCoord;

  vec4 base = tex(uv);

  // -------- region falloff around mouse --------
  vec2 dxy = uv - u_mouse;
  float d  = length(dxy);
  float r  = max(u_radius, 0.0001);

  float fall = 1.0 - smoothstep(r * 0.10, r, d);
  fall *= u_mix;

  // Outside: still allow global ripple when slider max gives r > 1
  if (fall <= 0.001 && u_radius < 1.02) {
    gl_FragColor = base;
    return;
  }

  // -------- liquid glass flow field (refraction) --------
  float t = u_time;

  // flow noise (looks like liquid)
  vec2 flowP = uv * 3.2 + vec2(t * 0.10, -t * 0.08);
  vec2 flow = (noise2v(flowP) - 0.5);
  float flow2 = fbm(uv * 5.0 + vec2(-t * 0.12, t * 0.09));

  // gradient-like refraction (fake normal)
  vec2 grad = vec2(
    fbm((uv + vec2(0.002,0.0)) * 6.0 + t*0.05) - fbm((uv - vec2(0.002,0.0)) * 6.0 + t*0.05),
    fbm((uv + vec2(0.0,0.002)) * 6.0 + t*0.05) - fbm((uv - vec2(0.0,0.002)) * 6.0 + t*0.05)
  );

  // -------- ripple waves (mouse-centered) --------
  vec2 dir = dxy / max(d, 0.00001);

  float freq  = mix(80.0, 120.0, u_mix);
  float speed = 9.0;

  float w1 = sin(d * freq - t * speed);
  float w2 = sin(d * (freq * 0.60) - t * (speed * 1.35));

  float wave1 = pow(abs(w1), 1.7) * sign(w1);
  float wave2 = pow(abs(w2), 2.0) * sign(w2);

  // -------- click shockwave --------
  // expanding ring from click position, fades out over ~0.9s
  float age = u_clickAge;
  float shock = 0.0;
  if (age < 0.9) {
    float sd = distance(uv, u_clickPos);
    float ring = (age * 0.55);                 // ring radius grows
    float thickness = 0.018 + (age * 0.02);    // ring thickens slightly
    float band = 1.0 - smoothstep(thickness, thickness*1.6, abs(sd - ring));
    // add oscillation so ring has ripples
    float osc = sin((sd * 150.0) - (t * 18.0));
    shock = band * (0.65 + 0.35 * osc) * (1.0 - smoothstep(0.0, 0.9, age));
  }

  // -------- total displacement --------
  // base amplitude grows nonlinearly with slider, and uses falloff
  float local = max(fall, smoothstep(1.0, 1.25, u_radius) * u_mix); // when global, keep effect active
  float amp = (u_amp * 0.55) * pow(max(u_mix, 0.001), 1.2) * local;

  // combine components
  vec2 disp =
    dir * (amp * (wave1 * 1.10 + wave2 * 0.55)) +
    flow * (amp * 1.15) +
    grad * (amp * 2.40) +
    dir * (amp * 1.65 * shock);

  vec2 uv2 = uv + disp;

  // -------- chromatic refraction + optional soft blur --------
  vec2 ca = disp * 1.05;

  // Mobile: reduce sampling cost and chroma
  float caScale = mix(1.0, 0.55, u_mobile);

  float rC = tex(uv2 + ca * caScale).r;
  float gC = tex(uv2).g;
  float bC = tex(uv2 - ca * caScale).b;

  vec3 col = vec3(rC, gC, bC);

  // Optional softening (desktop only): 3-tap micro blur along disp
  if (u_mobile < 0.5) {
    vec3 a = tex(uv2 + disp * 0.35).rgb;
    vec3 b = tex(uv2 - disp * 0.35).rgb;
    col = mix(col, (col + a + b) / 3.0, 0.35);
  }

  // blend over base
  float blend = clamp(local, 0.0, 1.0);
  vec3 outCol = mix(base.rgb, col, blend);

  gl_FragColor = vec4(outCol, 1.0);
}

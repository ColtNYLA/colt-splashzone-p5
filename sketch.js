let vid, sh;
let distortion = 0.35;

let clickPos = [0.5, 0.5];
let clickTime = -9999;

let slider;
let started = false;

const BASE_W = 1102;
const BASE_H = 550;

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function preload() {
  sh = loadShader("ripple.vert", "ripple.frag");
}

function setup() {
  // create fixed internal resolution
  const c = createCanvas(BASE_W, BASE_H, WEBGL);
  noStroke();
  if (isMobile()) pixelDensity(1);

  // attach canvas to responsive stage div
  const stage = document.getElementById("stage");
  c.elt.parentNode.removeChild(c.elt);
  stage.appendChild(c.elt);

  // Slider overlay inside stage (so it scales/positions correctly)
  slider = createSlider(0, 1, distortion, 0.001);
  slider.addClass("p5-slider");
  slider.parent("stage");
  slider.position(12, 12);
  slider.size(240);
  slider.input(() => distortion = slider.value());

  // Video
  vid = createVideo("Colt_splashZone_1102x550.mp4", () => {
    vid.elt.muted = true;
    vid.elt.playsInline = true;
    vid.elt.setAttribute("muted", "");
    vid.elt.setAttribute("playsinline", "");
    vid.volume(0);
    tryStartVideo();
  });
  vid.hide();
}

function tryStartVideo() {
  if (!vid) return;
  const p = vid.elt.play();
  if (p && p.then) {
    p.then(() => { started = true; vid.loop(); })
     .catch(() => { started = false; });
  } else {
    started = true;
    vid.loop();
  }
}

// Compute UV from actual on-page canvas rect (responsive-safe)
function getMouseUV() {
  const canvasEl = document.querySelector("#stage canvas");
  const r = canvasEl.getBoundingClientRect();

  // Use clientX/clientY relative to canvas, not p5 mouseX (which assumes unscaled)
  const x = (window.event?.clientX ?? 0) - r.left;
  const y = (window.event?.clientY ?? 0) - r.top;

  let u = x / r.width;
  let v = y / r.height;

  u = Math.max(0, Math.min(1, u));
  v = Math.max(0, Math.min(1, v));

  // IMPORTANT: flip Y because frag flips vTexCoord to top-left space
  v = 1.0 - v;

  return [u, v];
}

function triggerShock(u, v) {
  clickPos = [u, v];
  clickTime = millis();
}

function mousePressed(e) {
  if (!started) tryStartVideo();
  const [u, v] = getMouseUV();
  triggerShock(u, v);
}

function touchStarted() {
  if (!started) tryStartVideo();

  const canvasEl = document.querySelector("#stage canvas");
  const r = canvasEl.getBoundingClientRect();

  const tx = (touches[0]?.x ?? 0);
  const ty = (touches[0]?.y ?? 0);

  let u = (tx - r.left) / r.width;
  let v = (ty - r.top) / r.height;

  u = Math.max(0, Math.min(1, u));
  v = Math.max(0, Math.min(1, v));

  // flip Y to match shader space
  v = 1.0 - v;

  triggerShock(u, v);
  return false;
}

function draw() {
  background(0);

  if (!vid || !vid.elt || vid.elt.readyState < 2) return;

  // If there is no mouse event yet, default center
  let mx = 0.5, my = 0.5;
  try {
    const uv = getMouseUV();
    mx = uv[0];
    my = uv[1];
  } catch (e) {}

  const localR  = 0.18;
  const globalR = 1.25;
  const rN = lerp(localR, globalR, Math.pow(distortion, 1.15));

  const ampScaled = lerp(0.03, 0.18, Math.pow(distortion, 1.35));

  const age = (millis() - clickTime) / 1000.0;

  shader(sh);

  sh.setUniform("u_tex", vid);
  sh.setUniform("u_mouse", [mx, my]);     // now correct orientation
  sh.setUniform("u_radius", rN);
  sh.setUniform("u_amp", ampScaled);
  sh.setUniform("u_time", millis() / 1000.0);
  sh.setUniform("u_mix", distortion);

  sh.setUniform("u_clickPos", clickPos); // also correct orientation
  sh.setUniform("u_clickAge", age);

  sh.setUniform("u_mobile", isMobile() ? 1.0 : 0.0);

  rect(-width / 2, -height / 2, width, height);
}

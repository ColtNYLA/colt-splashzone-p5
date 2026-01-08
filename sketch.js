let vid, sh;
let distortion = 0.35;

let clickPos = [0.5, 0.5];
let clickTime = -9999;

let slider;
let started = false;

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function preload() {
  sh = loadShader("ripple.vert", "ripple.frag");
}

function setup() {
  createCanvas(1102, 550, WEBGL);
  noStroke();
  if (isMobile()) pixelDensity(1);

  // Slider (always create; DOM overlay)
  slider = createSlider(0, 1, distortion, 0.001);
  slider.addClass("p5-slider");
  slider.position(12, 12);
  slider.size(240);
  slider.input(() => distortion = slider.value());

  // Video
  vid = createVideo("Colt_splashZone_1102x550.mp4", () => {
    // mobile-safe flags
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
     .catch(() => { started = false; /* will start on click */ });
  } else {
    started = true;
    vid.loop();
  }
}

function triggerShock(u, v) {
  clickPos = [u, v];
  clickTime = millis();
}

function mousePressed() {
  if (!started) tryStartVideo();

  // mouseX/Y are top-left pixel coords even in WEBGL
  const u = constrain(mouseX / width, 0, 1);
  const v = constrain(mouseY / height, 0, 1);
  triggerShock(u, v);
}

function touchStarted() {
  if (!started) tryStartVideo();

  const x = (touches[0]?.x ?? mouseX);
  const y = (touches[0]?.y ?? mouseY);

  const u = constrain(x / width, 0, 1);
  const v = constrain(y / height, 0, 1);
  triggerShock(u, v);

  return false;
}

function draw() {
  // No flicker: always draw something every frame
  background(0);

  // If video isn't ready yet, keep the last frame black + no return flicker
  if (!vid || !vid.elt || vid.elt.readyState < 2) {
    return;
  }

  // Mouse in TOP-LEFT UV space to match ripple.frag's uv
  const mx = constrain(mouseX / width, 0, 1);
  const my = constrain(mouseY / height, 0, 1);

  const localR  = 0.18;
  const globalR = 1.25;
  const rN = lerp(localR, globalR, Math.pow(distortion, 1.15));

  const ampScaled = lerp(0.03, 0.18, Math.pow(distortion, 1.35));

  const age = (millis() - clickTime) / 1000.0;

  shader(sh);

  sh.setUniform("u_tex", vid);
  sh.setUniform("u_mouse", [mx, my]);
  sh.setUniform("u_radius", rN);
  sh.setUniform("u_amp", ampScaled);
  sh.setUniform("u_time", millis() / 1000.0);
  sh.setUniform("u_mix", distortion);

  sh.setUniform("u_clickPos", clickPos);
  sh.setUniform("u_clickAge", age);

  sh.setUniform("u_mobile", isMobile() ? 1.0 : 0.0);

  // draw full canvas in WEBGL space
  rect(-width / 2, -height / 2, width, height);
}

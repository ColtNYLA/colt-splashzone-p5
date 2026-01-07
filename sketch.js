let vid, sh;
let distortion = 0.35;

let clickPos = [0.5, 0.5];
let clickTime = -9999; // ms

let slider, btnSave;

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function preload() {
  sh = loadShader("ripple.vert", "ripple.frag");
}

function setup() {
  createCanvas(1102, 550, WEBGL);
  noStroke();

  // Mobile perf
  if (isMobile()) pixelDensity(1);

  vid = createVideo("Colt_splashZone_1102x550.mp4", () => {
    vid.loop();
    vid.volume(0);
  });
  vid.hide();

  // Slider
  slider = createSlider(0, 1, distortion, 0.001);
  slider.addClass("p5-slider");
  slider.position(12, 12);
  slider.size(240);
  slider.input(() => distortion = slider.value());

  // Save button (mobile-safe)
  btnSave = createButton("Save Frame");
  btnSave.position(12, 44);
  btnSave.mousePressed(saveFrameMobileSafe);
}

function saveFrameMobileSafe() {
  // Render one frame on canvas, then export
  // saveCanvas triggers download in most browsers.
  // iOS Safari may block downloads; fallback opens image in new tab.
  try {
    saveCanvas("Colt_splashZone_frame", "png");
  } catch (e) {
    const c = document.querySelector("canvas");
    const url = c.toDataURL("image/png");
    window.open(url, "_blank");
  }
}

function triggerShock(u, v) {
  clickPos = [u, v];
  clickTime = millis();
}

function mousePressed() {
  const u = constrain(mouseX / width, 0, 1);
  const v = constrain(mouseY / height, 0, 1);
  triggerShock(u, v);
}

function touchStarted() {
  // Use first touch for shockwave
  const u = constrain((touches[0]?.x ?? mouseX) / width, 0, 1);
  const v = constrain((touches[0]?.y ?? mouseY) / height, 0, 1);
  triggerShock(u, v);
  return false; // prevent page scroll on touch
}

function draw() {
  shader(sh);

  const u = constrain(mouseX / width, 0, 1);
  const v = constrain(mouseY / height, 0, 1);

  // Radius expands to global at max
  const localR = 0.18;
  const globalR = 1.25;
  const rN = lerp(localR, globalR, Math.pow(distortion, 1.15));

  // Amp scales up strongly at high slider
  const ampScaled = lerp(0.03, 0.18, Math.pow(distortion, 1.35));

  // Click age seconds
  const age = (millis() - clickTime) / 1000.0;

  sh.setUniform("u_tex", vid);
  sh.setUniform("u_mouse", [u, v]);
  sh.setUniform("u_radius", rN);
  sh.setUniform("u_amp", ampScaled);
  sh.setUniform("u_time", millis() / 1000.0);
  sh.setUniform("u_mix", distortion);

  sh.setUniform("u_clickPos", clickPos);
  sh.setUniform("u_clickAge", age);

  sh.setUniform("u_mobile", isMobile() ? 1.0 : 0.0);

  rect(-width / 2, -height / 2, width, height);
}

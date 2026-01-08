let vid, sh;
let distortion = 0.35;

let stage = "boot";
let errMsg = "";

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function preload() {
  stage = "preload";
  try {
    sh = loadShader("ripple.vert", "ripple.frag");
  } catch (e) {
    errMsg = "loadShader threw: " + e;
    stage = "shader_load_fail";
  }
}

function setup() {
  createCanvas(1102, 550, WEBGL);
  noStroke();
  if (isMobile()) pixelDensity(1);

  stage = "setup";

  vid = createVideo("Colt_splashZone_1102x550.mp4", () => {
    try {
      vid.elt.muted = true;
      vid.elt.playsInline = true;
      vid.elt.setAttribute("muted", "");
      vid.elt.setAttribute("playsinline", "");
      vid.volume(0);
      vid.loop();
      const p = vid.elt.play();
      if (p?.catch) p.catch(()=>{});
    } catch(e) {}
  });
  vid.hide();
}

function drawText(msg) {
  resetShader();
  // WEBGL text draws in 3D space; easiest is draw a 2D overlay using an offscreen buffer
  // Minimal: draw big rect with debug via default fill (no text). We'll use DOM instead.
}

function draw() {
  background(0);

  // Stage A: prove sketch is running
  // draw a visible rectangle so you don't depend on text
  resetShader();
  push();
  translate(0, 0, 0);
  fill(20);
  rect(-width/2, -height/2, width, height);
  pop();

  // Stage B: prove video is usable (draw without shader)
  if (vid && vid.elt && vid.elt.readyState >= 2) {
    stage = "video_ok";
    push();
    // draw video to the full canvas (no shader)
    texture(vid);
    beginShape();
    vertex(-width/2, -height/2, 0, 0);
    vertex( width/2, -height/2, 1, 0);
    vertex( width/2,  height/2, 1, 1);
    vertex(-width/2,  height/2, 0, 1);
    endShape(CLOSE);
    pop();
  } else {
    stage = "waiting_video";
    return; // keep showing the gray rect until video is ready
  }

  // Stage C: prove shader works (if shader fails, you'll still see raw video above)
  if (!sh) { stage = "no_shader"; return; }

  try {
    stage = "shader_try";

    shader(sh);

    const mx = constrain(mouseX / width, 0, 1);
    const my = constrain(mouseY / height, 0, 1);

    // simple parameters
    const rN = 0.5;
    const ampScaled = 0.08;

    sh.setUniform("u_tex", vid);
    sh.setUniform("u_mouse", [mx, my]);
    sh.setUniform("u_radius", rN);
    sh.setUniform("u_amp", ampScaled);
    sh.setUniform("u_time", millis() / 1000.0);
    sh.setUniform("u_mix", 1.0);

    // if your frag includes these uniforms, set them too; otherwise comment them out
    // (safe try/catch below if mismatch)
    try {
      sh.setUniform("u_clickPos", [0.5, 0.5]);
      sh.setUniform("u_clickAge", 999.0);
      sh.setUniform("u_mobile", isMobile() ? 1.0 : 0.0);
    } catch(e) {}

    rect(-width/2, -height/2, width, height);

    stage = "shader_ok";
  } catch (e) {
    errMsg = "shader draw exception: " + e;
    stage = "shader_runtime_fail";
  }
}

// quick DOM debug overlay
function keyPressed() {
  console.log("stage:", stage, "err:", errMsg);
}

window.addEventListener("load", () => {
  const d = document.createElement("div");
  d.style.position = "absolute";
  d.style.left = "10px";
  d.style.bottom = "10px";
  d.style.color = "white";
  d.style.font = "12px monospace";
  d.style.zIndex = "9999";
  d.style.background = "rgba(0,0,0,0.5)";
  d.style.padding = "6px 8px";
  d.id = "dbg";
  document.body.appendChild(d);

  setInterval(() => {
    const el = document.getElementById("dbg");
    if (el) el.textContent = "stage: " + stage + (errMsg ? " | " + errMsg : "");
  }, 200);
});

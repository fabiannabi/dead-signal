/**
 * diorama.js — "Diorama de archivo" (Fase A: parallax 2.5D + atmosfera).
 *
 * Worldbuilding barato desde UNA foto: convierte foto + mapa de profundidad en una
 * escena habitada. WebGL crudo, un solo shader a pantalla completa (sin Three.js):
 *  - Parallax por profundidad: lo cercano se mueve mas que lo lejano (cursor/giro/deriva).
 *  - Niebla por profundidad: el fondo se difumina en bruma.
 *  - Tinte frio de archivo, polvo/ceniza en suspension, grano y viñeta.
 *
 * Reutiliza los assets ya generados para la reconstruccion volumetrica.
 */

const SITE = {
  photo: "./assets/AGS-7/photo.jpg",
  depth: "./assets/AGS-7/depth.png",
};

const canvas = document.getElementById("gl");
const errEl = document.getElementById("err");
const hintEl = document.getElementById("hint");

// reloj en vivo del OSD (sensacion de cámara grabando)
const tsEl = document.getElementById("ts");
function pad(n) { return String(n).padStart(2, "0"); }
function tickClock() {
  const d = new Date();
  if (tsEl) tsEl.textContent =
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
tickClock();
setInterval(tickClock, 1000);

function fail(msg) {
  errEl.hidden = false;
  errEl.textContent = "DIORAMA INTERRUMPIDO\n\n" + msg;
  console.error(msg);
}

const gl = canvas.getContext("webgl", { alpha: false, antialias: true, powerPreference: "high-performance" });
if (!gl) fail("Tu navegador no soporta WebGL.");

const VERT = `
  attribute vec2 aPos;
  varying vec2 vSt;
  void main(){ vSt = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;

const FRAG = `
  precision highp float;
  uniform sampler2D uPhoto, uDepth;
  uniform vec2 uResolution, uMouse;
  uniform float uTime, uImgAspect, uParallax, uFogAmount;
  uniform vec3 uFogColor, uHorizon, uShadow, uHigh, uVig;
  varying vec2 vSt;

  float hash21(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453); }

  // ruido de valor suave (para que la bruma respire)
  float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    f=f*f*(3.0-2.0*f);
    float a=hash21(i), b=hash21(i+vec2(1,0)), c=hash21(i+vec2(0,1)), d=hash21(i+vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  }

  // ajuste "cover": la imagen cubre la pantalla recortando el sobrante
  vec2 coverUv(vec2 st, float imgA, float scrA){
    vec2 s = vec2(1.0);
    if(scrA > imgA) s.y = imgA/scrA; else s.x = scrA/imgA;
    return (st-0.5)*s + 0.5;
  }

  // polvo / ceniza en suspension
  float motes(vec2 uv, float t){
    vec2 g = uv*vec2(20.0,11.0);
    g.y -= t*0.12;
    g.x += sin(t*0.2 + uv.y*6.2831)*0.25;
    vec2 id = floor(g); vec2 f = fract(g)-0.5;
    float on = step(0.93, hash21(id));
    float d = length(f*vec2(1.0,1.35));
    return on * smoothstep(0.18, 0.0, d);
  }

  void main(){
    float scrA = uResolution.x/uResolution.y;
    vec2 uv = coverUv(vSt, uImgAspect, scrA);

    float depth = texture2D(uDepth, uv).r;          // cerca = 1
    vec2 disp = uMouse * uParallax * depth;          // lo cercano se mueve mas
    vec2 uvP = clamp(uv - disp, 0.0, 1.0);

    vec3 col = texture2D(uPhoto, uvP).rgb;
    float d2 = texture2D(uDepth, uvP).r;

    // ---- BRUMA ATMOSFERICA (luminosa, con horizonte encendido) ----
    float dist = clamp(1.0 - d2, 0.0, 1.0);          // lejos = 1
    float fog  = smoothstep(0.12, 0.95, dist);
    float horizon = smoothstep(0.28, 0.66, vSt.y);    // banda alta = cielo
    fog = clamp(fog + horizon * 0.30 * dist, 0.0, 1.0);
    float breathe = vnoise(vec2(uv.x*3.0, uv.y*2.0) + vec2(uTime*0.04, uTime*0.02));
    vec3 haze = mix(uFogColor, uHorizon, horizon * 0.85) * (0.85 + 0.30*breathe);
    col = mix(col, haze, fog * uFogAmount);

    // ---- grado duotono suave ----
    float l = dot(col, vec3(0.299,0.587,0.114));
    vec3 graded = mix(uShadow, uHigh, smoothstep(0.0, 1.0, l));
    col = mix(col, graded, 0.18);
    col += uHorizon * smoothstep(0.55, 1.0, l) * fog * 0.25;

    // polvo en suspension
    col += vec3(0.85,0.88,0.75) * motes(uv + disp*0.5, uTime) * 0.10;

    // ===== CAPA FOSFORO / CRT (recreacion por computadora) =====
    vec3 phos = vec3(0.30, 1.0, 0.55);

    // tinte fosforo: el verde baña la escena sin matar el color
    col = mix(col, l*phos, 0.16);

    // rejilla de escaneo (mas marcada hacia el "piso", parte baja)
    vec2 gp = vec2(vSt.x*scrA, vSt.y);
    vec2 gf = abs(fract(gp*22.0) - 0.5);
    float grid = max(smoothstep(0.5, 0.46, gf.x), smoothstep(0.5, 0.46, gf.y));
    float floorW = smoothstep(0.62, 0.0, vSt.y);
    col += phos * grid * (0.05 + 0.10*floorW);

    // grano + scanline base (espacial, no parpadea)
    float g = hash21(uvP*uResolution*0.5 + uTime);
    col += (g-0.5)*0.03;
    col *= 0.985 + 0.015*sin(vSt.y*uResolution.y*1.5);

    // parpadeo CRT MUY sutil y lento (no marea)
    col *= 0.99 + 0.01*sin(uTime*6.0);

    // negros levantados verdosos (nada de negro puro)
    col = max(col, vec3(0.015, 0.045, 0.030));

    // viñeta + halo de fosforo en el borde
    float rr = length(vSt-0.5);
    float vig = smoothstep(1.20, 0.32, rr);
    col = mix(uVig, col, vig);
    col += phos * smoothstep(0.45, 0.98, rr) * 0.05;

    // ===== ESTATICA INTERMITENTE (la señal se va cada cierto tiempo) =====
    float win = floor(uTime/5.0);                         // ventana de 5 s
    float has = step(0.5, hash21(vec2(win, 3.7)));        // ~50% de las ventanas
    float center = 0.25 + 0.5*hash21(vec2(win, 9.1));     // momento dentro de la ventana
    float local = fract(uTime/5.0);
    float env = has * smoothstep(0.10, 0.0, abs(local - center)); // rafaga corta
    float ns = hash21(uvP*uResolution*0.9 + floor(uTime*60.0));
    vec3 noiseCol = vec3(ns) * vec3(0.55, 1.0, 0.7);       // estatica verdosa
    // banda de roll durante la rafaga
    float roll = smoothstep(0.06, 0.0, abs(fract(vSt.y*2.0 - uTime*1.5) - 0.5));
    col = mix(col, noiseCol, clamp(env*0.85 + env*roll*0.3, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error("Shader:\n" + gl.getShaderInfoLog(s));
  }
  return s;
}

let prog, uni, raf;
function buildProgram() {
  prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link:\n" + gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  uni = {};
  for (const n of ["uPhoto", "uDepth", "uResolution", "uMouse", "uTime", "uImgAspect", "uParallax", "uFogAmount", "uFogColor", "uHorizon", "uShadow", "uHigh", "uVig"]) {
    uni[n] = gl.getUniformLocation(prog, n);
  }
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("No se pudo cargar " + src));
    img.src = src;
  });
}

function makeTexture(img, unit) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // el feed esta inset por el bezel: medimos el canvas, no la ventana
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
}

// ---- control: cursor / touch / giroscopio + deriva automatica al estar quieto ----
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let targetX = 0, targetY = 0; // -1..1
let curX = 0, curY = 0;
let lastInput = 0;

function setTargetFromClient(x, y) {
  targetX = (x / innerWidth) * 2 - 1;
  targetY = (y / innerHeight) * 2 - 1;
  lastInput = performance.now();
  hintEl.classList.add("gone");
}
addEventListener("pointermove", (e) => setTargetFromClient(e.clientX, e.clientY));
addEventListener("pointerdown", (e) => setTargetFromClient(e.clientX, e.clientY));
// giroscopio (best-effort; iOS pide permiso con un gesto)
function enableGyro() {
  const handler = (e) => {
    if (e.gamma == null) return;
    targetX = Math.max(-1, Math.min(1, e.gamma / 35)); // izq/der
    targetY = Math.max(-1, Math.min(1, (e.beta - 45) / 35)); // adelante/atras
    lastInput = performance.now();
    hintEl.classList.add("gone");
  };
  if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
    addEventListener("click", () => DeviceOrientationEvent.requestPermission().then((p) => {
      if (p === "granted") addEventListener("deviceorientation", handler);
    }), { once: true });
  } else {
    addEventListener("deviceorientation", handler);
  }
}
enableGyro();

async function main() {
  try {
    buildProgram();
    const [photo, depth] = await Promise.all([loadImage(SITE.photo), loadImage(SITE.depth)]);
    makeTexture(photo, 0);
    makeTexture(depth, 1);
    gl.uniform1i(uni.uPhoto, 0);
    gl.uniform1i(uni.uDepth, 1);
    gl.uniform1f(uni.uImgAspect, photo.width / photo.height);
    gl.uniform1f(uni.uParallax, 0.016);
    gl.uniform1f(uni.uFogAmount, 0.5);
    gl.uniform3f(uni.uFogColor, 0.12, 0.26, 0.18); // bruma de fosforo
    gl.uniform3f(uni.uHorizon, 0.34, 0.58, 0.34); // horizonte fosforo encendido
    gl.uniform3f(uni.uShadow, 0.02, 0.07, 0.05); // sombras verde profundo
    gl.uniform3f(uni.uHigh, 0.78, 0.95, 0.60); // luces verde-fosforo
    gl.uniform3f(uni.uVig, 0.015, 0.05, 0.03); // viñeta verde (no negra)

    resize();
    addEventListener("resize", resize);

    const t0 = performance.now();
    const frame = () => {
      const t = (performance.now() - t0) / 1000;
      // deriva automatica cuando nadie interactua
      if (!reduceMotion && performance.now() - lastInput > 2500) {
        targetX = Math.sin(t * 0.18) * 0.6;
        targetY = Math.sin(t * 0.13 + 1.0) * 0.35;
      }
      // suavizado
      curX += (targetX - curX) * 0.05;
      curY += (targetY - curY) * 0.05;

      gl.uniform2f(uni.uResolution, canvas.width, canvas.height);
      gl.uniform2f(uni.uMouse, curX, curY);
      gl.uniform1f(uni.uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    frame();
    setTimeout(() => hintEl.classList.add("gone"), 6000);
  } catch (e) {
    fail(e.message);
  }
}

if (gl) main();

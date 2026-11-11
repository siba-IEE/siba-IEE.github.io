/**
 * Globe de l'ouverture : une sphère en projection orthographique, dessinée par un seul
 * fragment shader WebGL (aucune bibliothèque). La face éclairée montre l'image Blue Marble
 * de la NASA, la face nocturne l'image Black Marble ; la limite jour/nuit est celle de
 * l'instant, calculée à partir de la position réelle du soleil.
 *
 * Les repères (stations, villes) sont des éléments SVG placés par le même calcul de projection.
 */

const RAD = Math.PI / 180;

const VERTEX = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float;

uniform vec2 uCenter;
uniform float uRadius;
uniform vec3 uForward;
uniform vec3 uEast;
uniform vec3 uNorth;
uniform vec3 uSun;
uniform sampler2D uDay;
uniform sampler2D uNight;

const float PI = 3.141592653589793;
const vec3 SPACE = vec3(0.039);
const vec3 AIR = vec3(0.36, 0.58, 1.0);

void main() {
  vec2 q = (gl_FragCoord.xy - uCenter) / uRadius;
  float r = length(q);

  // Hors du disque : le vide, et un mince halo d'atmosphère du côté éclairé.
  if (r > 1.0) {
    vec3 rim = normalize(q.x * uEast + q.y * uNorth);
    float lit = smoothstep(-0.25, 0.35, dot(rim, uSun));
    float glow = exp(-(r - 1.0) * 55.0) * 0.55 * lit;
    gl_FragColor = vec4(SPACE + AIR * glow, 1.0);
    return;
  }

  float z = sqrt(1.0 - r * r);
  vec3 n = q.x * uEast + q.y * uNorth + z * uForward;
  vec2 uv = vec2(atan(n.x, n.z) / (2.0 * PI) + 0.5, 0.5 - asin(clamp(n.y, -1.0, 1.0)) / PI);

  float sun = dot(n, uSun);
  float daylight = smoothstep(-0.1, 0.16, sun);

  vec3 day = texture2D(uDay, uv).rgb * (0.42 + 0.72 * max(sun, 0.0));
  vec3 night = texture2D(uNight, uv).rgb * 1.25 + texture2D(uDay, uv).rgb * 0.035;
  vec3 color = mix(night, day, daylight);

  // Voile atmosphérique au limbe, puis lissage du bord du disque.
  color += AIR * pow(1.0 - z, 3.2) * 0.55 * (0.2 + 0.8 * daylight);
  float edge = smoothstep(1.0, 1.0 - 1.5 / uRadius, r);
  gl_FragColor = vec4(mix(SPACE, color, edge), 1.0);
}`;

type Vec3 = [number, number, number];

/** Vecteur unitaire du repère terrestre pour une latitude et une longitude en degrés. */
const toVector = (lat: number, lon: number): Vec3 => [
  Math.cos(lat * RAD) * Math.sin(lon * RAD),
  Math.sin(lat * RAD),
  Math.cos(lat * RAD) * Math.cos(lon * RAD),
];

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Point subsolaire à une date donnée (algorithme simplifié de la NOAA). */
export function subsolarPoint(date: Date): { lat: number; lon: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86400000);
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / 365) * (day - 1 + (hours - 12) / 24);
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const declination =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  return { lat: declination / RAD, lon: -15 * (hours - 12 + equationOfTime / 60) };
}

/** Hauteur du soleil (degrés) en un lieu, à une date donnée. */
export function solarElevation(lat: number, lon: number, date: Date): number {
  const sun = subsolarPoint(date);
  return Math.asin(dot(toVector(lat, lon), toVector(sun.lat, sun.lon))) / RAD;
}

function loadTexture(gl: WebGLRenderingContext, unit: number, src: string, onLoad: () => void) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Un pixel sombre en attendant l'image.
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB,
    1,
    1,
    0,
    gl.RGB,
    gl.UNSIGNED_BYTE,
    new Uint8Array([10, 10, 10]),
  );
  const image = new Image();
  image.onload = () => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    onLoad();
  };
  image.src = src;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

/** Vue de départ (au-dessus de Montréal) et vue de repos (Afrique de l'Ouest dans le haut du disque). */
const START = { lat: 16, lon: -73.6 };
const REST = { lat: -28, lon: -4 };

/**
 * Monte le globe dans l'élément donné. Renvoie une fonction de nettoyage,
 * ou null si WebGL n'est pas disponible (l'image de repli reste alors visible).
 */
export function mountGlobe(root: HTMLElement): (() => void) | null {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas');
  const gl = canvas?.getContext('webgl', { antialias: false, alpha: false });
  if (!canvas || !gl) return null;
  const program = createProgram(gl);
  if (!program) return null;

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const uCenter = uniform('uCenter');
  const uRadius = uniform('uRadius');
  const uForward = uniform('uForward');
  const uEast = uniform('uEast');
  const uNorth = uniform('uNorth');
  const uSun = uniform('uSun');
  gl.uniform1i(uniform('uDay'), 0);
  gl.uniform1i(uniform('uNight'), 1);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const markers = [...root.querySelectorAll<SVGGElement>('[data-lat]')].map((el) => ({
    el,
    vector: toVector(Number(el.dataset.lat), Number(el.dataset.lon)),
  }));

  const view = reduced ? { ...REST } : { ...START };
  let width = 0;
  let height = 0;
  let radius = 1;
  let centerX = 0;
  let centerY = 0;
  let frame = 0;
  let dirty = true;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    // Le disque déborde de l'écran : on regarde la Terre depuis l'orbite, horizon en haut.
    radius = Math.max(width * 0.56, height * 0.8);
    centerX = width / 2;
    centerY = height * 0.3 + radius;
    gl.uniform2f(uCenter, centerX * ratio, (height - centerY) * ratio);
    gl.uniform1f(uRadius, radius * ratio);
    dirty = true;
  };

  const draw = () => {
    const forward = toVector(view.lat, view.lon);
    const east: Vec3 = [Math.cos(view.lon * RAD), 0, -Math.sin(view.lon * RAD)];
    const north: Vec3 = [
      -Math.sin(view.lat * RAD) * Math.sin(view.lon * RAD),
      Math.cos(view.lat * RAD),
      -Math.sin(view.lat * RAD) * Math.cos(view.lon * RAD),
    ];
    const sun = subsolarPoint(new Date());
    gl.uniform3fv(uForward, forward);
    gl.uniform3fv(uEast, east);
    gl.uniform3fv(uNorth, north);
    gl.uniform3fv(uSun, toVector(sun.lat, sun.lon));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    for (const { el, vector } of markers) {
      const depth = dot(vector, forward);
      const x = centerX + radius * dot(vector, east);
      const y = centerY - radius * dot(vector, north);
      const visible = depth > 0.12 && y < height + 20;
      el.style.opacity = visible ? '1' : '0';
      if (visible) el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    }
  };

  /* ---------- Mouvement : arrivée depuis Montréal, puis rotation à la main avec inertie ---------- */

  let introStart = reduced ? -1 : performance.now() + 250;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velocityLon = 0;
  let velocityLat = 0;

  const loop = (now: number) => {
    if (introStart >= 0) {
      const p = Math.min(1, Math.max(0, (now - introStart) / 2600));
      const eased = 1 - (1 - p) ** 4;
      view.lat = START.lat + (REST.lat - START.lat) * eased;
      view.lon = START.lon + (REST.lon - START.lon) * eased;
      dirty = true;
      if (p >= 1) introStart = -1;
    } else if (!dragging && (Math.abs(velocityLon) > 0.002 || Math.abs(velocityLat) > 0.002)) {
      view.lon += velocityLon;
      view.lat = Math.max(-70, Math.min(70, view.lat + velocityLat));
      velocityLon *= 0.94;
      velocityLat *= 0.94;
      dirty = true;
    }
    if (dirty) {
      dirty = false;
      draw();
    }
    frame = requestAnimationFrame(loop);
  };

  const onDown = (event: PointerEvent) => {
    dragging = true;
    introStart = -1;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (!dragging) return;
    const scale = 180 / (Math.PI * radius);
    velocityLon = -(event.clientX - lastX) * scale;
    velocityLat = (event.clientY - lastY) * scale;
    view.lon += velocityLon;
    view.lat = Math.max(-70, Math.min(70, view.lat + velocityLat));
    lastX = event.clientX;
    lastY = event.clientY;
    dirty = true;
  };
  const onUp = () => {
    dragging = false;
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('resize', resize);
  // La limite jour/nuit avance : on redessine chaque minute.
  const timer = window.setInterval(() => (dirty = true), 60000);

  const markDirty = () => {
    dirty = true;
    root.dataset.ready = 'true';
  };
  loadTexture(gl, 0, root.dataset.day ?? '', markDirty);
  loadTexture(gl, 1, root.dataset.night ?? '', markDirty);

  resize();
  frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    window.clearInterval(timer);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
  };
}

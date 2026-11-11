/**
 * Globe de l'accueil : une sphère en projection orthographique, dessinée par un seul
 * fragment shader WebGL, sans bibliothèque.
 *
 * Images : NASA Blue Marble (jour), NASA Black Marble (nuit) et, sur l'Afrique de l'Ouest,
 * une image Blue Marble plus fine qui prend le relais quand la vue se rapproche.
 * La limite jour/nuit est celle de l'instant. Le défilement de la page pilote la vue :
 * la Terre entière, puis l'Afrique de l'Ouest, puis la Guinée.
 */

const RAD = Math.PI / 180;

/** Emprise de l'image régionale, en degrés : ouest, sud, est, nord. */
const DETAIL_BOX = [-32, -6, 24, 32] as const;
/** Domaine de validité de la droite biais-latitude : ouest, sud, est, nord. */
const BAND_BOX = [-17.6, 5.9, 11.6, 14] as const;

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
uniform float uDaylight;
uniform float uBand;
uniform vec4 uDetailBox;
uniform vec4 uBandBox;
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uDetail;

const float PI = 3.141592653589793;
const vec3 SPACE = vec3(0.027);
const vec3 AIR = vec3(0.36, 0.58, 1.0);
const vec3 ORANGE = vec3(1.0, 0.33, 0.0);

void main() {
  vec2 q = (gl_FragCoord.xy - uCenter) / uRadius;
  float r = length(q);

  // Hors du disque : le vide, et un halo d'atmosphère du côté éclairé.
  if (r > 1.0) {
    vec3 rim = normalize(q.x * uEast + q.y * uNorth);
    float lit = max(smoothstep(-0.3, 0.4, dot(rim, uSun)), uDaylight);
    float glow = (exp(-(r - 1.0) * 28.0) * 0.5 + exp(-(r - 1.0) * 6.0) * 0.1) * lit;
    gl_FragColor = vec4(SPACE + AIR * glow, 1.0);
    return;
  }

  float z = sqrt(1.0 - r * r);
  vec3 n = q.x * uEast + q.y * uNorth + z * uForward;
  float lon = degrees(atan(n.x, n.z));
  float lat = degrees(asin(clamp(n.y, -1.0, 1.0)));
  vec2 uv = vec2(lon / 360.0 + 0.5, 0.5 - lat / 180.0);

  // Image régionale, fondue sur ses bords dans l'image mondiale.
  vec3 surface = texture2D(uDay, uv).rgb;
  vec2 d = vec2((lon - uDetailBox.x) / (uDetailBox.z - uDetailBox.x), (uDetailBox.w - lat) / (uDetailBox.w - uDetailBox.y));
  vec2 feather = smoothstep(vec2(0.0), vec2(0.06), d) * smoothstep(vec2(0.0), vec2(0.06), 1.0 - d);
  surface = mix(surface, texture2D(uDetail, d).rgb, feather.x * feather.y);

  // Biais du satellite : un voile orange sur les terres, plus dense vers le sud.
  float inside = step(uBandBox.x, lon) * step(lon, uBandBox.z) * step(uBandBox.y, lat) * step(lat, uBandBox.w);
  float land = 1.0 - smoothstep(1.05, 1.4, surface.b / max(surface.r, 0.02));
  float south = (uBandBox.w - lat) / (uBandBox.w - uBandBox.y);
  surface = mix(surface, ORANGE, inside * land * uBand * (0.12 + 0.6 * south));

  float sun = dot(n, uSun);
  float daylight = max(smoothstep(-0.1, 0.16, sun), uDaylight);
  float shade = mix(0.42 + 0.72 * max(sun, 0.0), 1.0, uDaylight);
  vec3 night = texture2D(uNight, uv).rgb * 1.3 + surface * 0.03;
  vec3 color = mix(night, surface * shade, daylight);

  // Voile atmosphérique au limbe, puis lissage du bord du disque.
  color += AIR * pow(1.0 - z, 3.0) * 0.6 * (0.15 + 0.85 * daylight);
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
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

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

/** Une étape du parcours : où regarder, de quelle distance, et quoi montrer. */
interface View {
  lat: number;
  lon: number;
  /** Rayon du disque à l'écran, en pixels, pour une fenêtre donnée. */
  radius: (width: number, height: number) => number;
  /** 0 : éclairage réel de l'instant. 1 : plein jour, pour lire la carte. */
  daylight: number;
  band: number;
}

/** Rayon pour qu'un arc de `degrees` occupe `pixels` à l'écran. */
const radiusFor = (degrees: number, pixels: number) => pixels / (2 * Math.sin((degrees / 2) * RAD));

const VIEWS: View[] = [
  { lat: 9, lon: -6, radius: (w, h) => Math.min(w * 0.44, h * 0.4), daylight: 0, band: 0 },
  {
    lat: 10,
    lon: -3.5,
    radius: (w, h) => radiusFor(34, Math.min(w * 0.92, h * 1.5)),
    daylight: 1,
    band: 0,
  },
  {
    lat: 10,
    lon: -3.5,
    radius: (w, h) => radiusFor(34, Math.min(w * 0.92, h * 1.5)),
    daylight: 1,
    band: 1,
  },
  {
    lat: 10.2,
    lon: -11.2,
    radius: (w, h) => radiusFor(9.5, Math.min(w * 0.86, h * 0.8)),
    daylight: 1,
    band: 0.35,
  },
];

export const VIEW_COUNT = VIEWS.length;

function loadTexture(
  gl: WebGLRenderingContext,
  unit: number,
  src: string,
  repeat: boolean,
  onLoad: () => void,
) {
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
    new Uint8Array([8, 8, 8]),
  );
  const image = new Image();
  image.onload = () => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Les images n'ont pas des côtés en puissance de deux : pas de mipmaps en WebGL 1.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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

export interface Globe {
  /** Position dans le parcours : 0 pour la première vue, VIEW_COUNT - 1 pour la dernière. */
  setProgress: (progress: number) => void;
  destroy: () => void;
}

/**
 * Monte le globe dans l'élément donné. Renvoie null si WebGL n'est pas disponible :
 * l'image de repli reste alors visible.
 */
export function mountGlobe(root: HTMLElement): Globe | null {
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
  const locations = {
    center: uniform('uCenter'),
    radius: uniform('uRadius'),
    forward: uniform('uForward'),
    east: uniform('uEast'),
    north: uniform('uNorth'),
    sun: uniform('uSun'),
    daylight: uniform('uDaylight'),
    band: uniform('uBand'),
  };
  gl.uniform1i(uniform('uDay'), 0);
  gl.uniform1i(uniform('uNight'), 1);
  gl.uniform1i(uniform('uDetail'), 2);
  gl.uniform4f(uniform('uDetailBox'), ...DETAIL_BOX);
  gl.uniform4f(uniform('uBandBox'), ...BAND_BOX);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const markers = [...root.querySelectorAll<SVGGElement>('[data-lat]')].map((el) => ({
    el,
    vector: toVector(Number(el.dataset.lat), Number(el.dataset.lon)),
  }));

  let width = 0;
  let height = 0;
  let ratio = 1;
  let target = 0;
  let progress = 0;
  let frame = 0;
  let dirty = true;
  const started = performance.now();

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    dirty = true;
  };

  const draw = (now: number) => {
    const index = Math.min(VIEWS.length - 2, Math.floor(progress));
    const t = ease(Math.min(1, Math.max(0, progress - index)));
    const from = VIEWS[index];
    const to = VIEWS[index + 1];

    // Vue entière : la Terre tourne lentement sur elle-même, puis s'arrête en approchant.
    const far = 1 - Math.min(1, progress);
    const spin = reduced ? 0 : ((now - started) / 1000) * 2.2 * far;
    const lat = mix(from.lat, to.lat, t);
    const lon = mix(from.lon, to.lon, t) + spin;
    // Le zoom se fait sur le logarithme du rayon, pour une vitesse d'approche constante.
    const radius = Math.exp(
      mix(Math.log(from.radius(width, height)), Math.log(to.radius(width, height)), t),
    );
    const centerX = width / 2;
    const centerY = height * mix(0.52, 0.44, Math.min(1, progress));

    const forward = toVector(lat, lon);
    const east: Vec3 = [Math.cos(lon * RAD), 0, -Math.sin(lon * RAD)];
    const north: Vec3 = [
      -Math.sin(lat * RAD) * Math.sin(lon * RAD),
      Math.cos(lat * RAD),
      -Math.sin(lat * RAD) * Math.cos(lon * RAD),
    ];
    const sun = subsolarPoint(new Date());

    gl.uniform2f(locations.center, centerX * ratio, (height - centerY) * ratio);
    gl.uniform1f(locations.radius, radius * ratio);
    gl.uniform3fv(locations.forward, forward);
    gl.uniform3fv(locations.east, east);
    gl.uniform3fv(locations.north, north);
    gl.uniform3fv(locations.sun, toVector(sun.lat, sun.lon));
    gl.uniform1f(locations.daylight, mix(from.daylight, to.daylight, t));
    gl.uniform1f(locations.band, mix(from.band, to.band, t));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    for (const { el, vector } of markers) {
      const visible = dot(vector, forward) > 0.15;
      el.style.display = visible ? '' : 'none';
      if (visible) {
        const x = centerX + radius * dot(vector, east);
        const y = centerY - radius * dot(vector, north);
        el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      }
    }
    return far > 0 && !reduced;
  };

  const loop = (now: number) => {
    // Le globe rattrape la position de défilement avec un léger retard.
    const delta = target - progress;
    if (Math.abs(delta) > 0.0005) {
      progress += delta * (reduced ? 1 : 0.09);
      dirty = true;
    }
    if (dirty) dirty = draw(now);
    frame = requestAnimationFrame(loop);
  };

  const ready = () => {
    dirty = true;
    root.dataset.ready = 'true';
  };
  loadTexture(gl, 0, root.dataset.day ?? '', true, ready);
  loadTexture(gl, 1, root.dataset.night ?? '', true, ready);
  loadTexture(gl, 2, root.dataset.detail ?? '', false, ready);

  window.addEventListener('resize', resize);
  resize();
  frame = requestAnimationFrame(loop);

  return {
    setProgress: (value) => {
      target = Math.min(VIEWS.length - 1, Math.max(0, value));
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    },
  };
}

/**
 * Film 3D de la page Travaux (three.js). Six plans de douze secondes, joués comme une vidéo :
 * une station de mesure dans la savane, le satellite au-dessus de l'Afrique de l'Ouest, le
 * capteur en gros plan, le transfert vu du ciel, une centrale solaire, puis la maille d'un
 * produit satellitaire.
 *
 * Éléments réels : satellite géostationnaire modélisé par la NASA, image Blue Marble de la
 * Terre, sol de latérite photographié (Poly Haven, CC0). Le ciel est un modèle physique de
 * diffusion atmosphérique, qui éclaire aussi la scène. Le reste (station, centrale) est
 * construit ici avec des matériaux physiques.
 *
 * Ce module ne connaît ni les textes ni le lecteur : il rend l'image de l'instant demandé.
 */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export const CHAPTER_SECONDS = 12;
export const CHAPTER_COUNT = 6;
const FADE_SECONDS = 0.6;

export interface FilmAssets {
  groundColor: string;
  groundNormal: string;
  groundRoughness: string;
  earth: string;
  satellite: string;
  draco: string;
}

export interface Film {
  readonly duration: number;
  readonly playing: boolean;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  destroy: () => void;
}

/** État transmis au lecteur à chaque image : temps, plan en cours, opacité du fondu au noir. */
export type FrameListener = (seconds: number, chapter: number, fade: number) => void;

/* ---------- Outils ---------- */

const RAD = Math.PI / 180;
const ORANGE = 0xff5500;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Bruit lisse et déterministe, pour le relief et les variations de teinte du sol. */
const noise = (x: number, z: number) =>
  Math.sin(x * 0.013 + 1.7) * Math.cos(z * 0.011) + Math.sin(x * 0.031 + z * 0.027) * 0.4;

/** Suite pseudo-aléatoire reproductible : le décor est le même à chaque visite. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

/** Point du globe (rayon donné) pour une latitude et une longitude, selon le plaquage de SphereGeometry. */
function onGlobe(lat: number, lon: number, radius: number) {
  const phi = (lon + 180) * RAD;
  return vec(
    -Math.cos(phi) * Math.cos(lat * RAD),
    Math.sin(lat * RAD),
    Math.sin(phi) * Math.cos(lat * RAD),
  ).multiplyScalar(radius);
}

function part(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function textSprite(text: string, size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  context.font = '500 72px "Geist Variable", Helvetica, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0, 0, 0, 0.6)';
  context.shadowBlur = 12;
  context.fillStyle = '#fff';
  context.fillText(text, 256, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, fog: false }),
  );
  sprite.scale.set(size, size / 4, 1);
  return sprite;
}

/* ---------- Matériaux ---------- */

const steel = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 1, roughness: 0.32 });
const paint = new THREE.MeshStandardMaterial({ color: 0xf2f2ef, metalness: 0.1, roughness: 0.45 });
const black = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, metalness: 0.2, roughness: 0.6 });
const concrete = new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: 0.95 });
const glass = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0,
  roughness: 0,
  transmission: 1,
  thickness: 0.02,
  ior: 1.5,
  transparent: true,
});

/** Texture des cellules photovoltaïques, dessinée une fois. */
function cellTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#d9dde2';
  context.fillRect(0, 0, 512, 256);
  for (let col = 0; col < 12; col += 1) {
    for (let row = 0; row < 6; row += 1) {
      const x = 6 + col * 42;
      const y = 6 + row * 41;
      const shade = context.createLinearGradient(x, y, x + 38, y + 37);
      shade.addColorStop(0, '#10224a');
      shade.addColorStop(1, '#0a1630');
      context.fillStyle = shade;
      context.fillRect(x, y, 38, 37);
      context.fillStyle = 'rgba(200, 210, 225, 0.35)';
      context.fillRect(x + 12, y, 1, 37);
      context.fillRect(x + 25, y, 1, 37);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const moduleGlass = new THREE.MeshPhysicalMaterial({
  map: cellTexture(),
  metalness: 0,
  roughness: 0.14,
  clearcoat: 1,
  clearcoatRoughness: 0.04,
});

/* ---------- Objets ---------- */

/** Hauteur du capteur principal de la station, visé par le gros plan. */
const SENSOR = vec(-0.85, 3.02, 0);

/** Station de mesure du rayonnement : mât, potence, pyranomètre sous dôme, suiveur, coffret, panneau. */
function buildStation() {
  const group = new THREE.Group();
  group.add(part(new THREE.BoxGeometry(2.4, 0.2, 2.4), concrete, 0, 0.1, 0));
  group.add(part(new THREE.CylinderGeometry(0.05, 0.06, 3, 20), steel, 0, 1.7, 0));
  // Haubans du mât.
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2;
    const stay = part(
      new THREE.CylinderGeometry(0.012, 0.012, 2.3, 8),
      steel,
      Math.cos(angle) * 0.5,
      1.25,
      Math.sin(angle) * 0.5,
    );
    stay.rotation.z = Math.cos(angle) * 0.45;
    stay.rotation.x = -Math.sin(angle) * 0.45;
    group.add(stay);
  }
  // Potence et pyranomètre.
  const boom = part(new THREE.CylinderGeometry(0.03, 0.03, 2, 16), steel, 0, 2.9, 0);
  boom.rotation.z = Math.PI / 2;
  group.add(boom);
  group.add(part(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 32), steel, SENSOR.x, 2.92, 0));
  group.add(part(new THREE.CylinderGeometry(0.075, 0.08, 0.09, 32), paint, SENSOR.x, 2.975, 0));
  group.add(
    part(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 24), black, SENSOR.x, SENSOR.y + 0.003, 0),
  );
  const dome = part(
    new THREE.SphereGeometry(0.045, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    glass,
    SENSOR.x,
    SENSOR.y,
    0,
  );
  dome.castShadow = false;
  group.add(dome);
  // Second capteur, ombré par une boule : mesure du rayonnement diffus.
  group.add(part(new THREE.CylinderGeometry(0.075, 0.08, 0.09, 32), paint, 0.85, 2.975, 0));
  const shadeArm = part(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 8), black, 0.98, 3.2, 0.1);
  shadeArm.rotation.z = -0.5;
  group.add(shadeArm);
  group.add(part(new THREE.SphereGeometry(0.035, 16, 12), black, 1.1, 3.42, 0.1));
  // Coffret d'acquisition et son panneau d'alimentation.
  group.add(part(new THREE.BoxGeometry(0.5, 0.6, 0.25), paint, 0, 1.3, 0.2));
  group.add(part(new THREE.BoxGeometry(0.02, 0.12, 0.02), steel, 0.2, 1.3, 0.335));
  const supply = part(new THREE.BoxGeometry(0.9, 0.03, 0.55), moduleGlass, 0, 2.15, 0.45);
  supply.rotation.x = 0.5;
  group.add(supply);
  // Clôture : quatre poteaux et trois fils.
  const post = new THREE.CylinderGeometry(0.03, 0.03, 1.3, 10);
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => group.add(part(post, steel, sx * 2.6, 0.65, sz * 2.6))),
  );
  [0.4, 0.8, 1.2].forEach((height) => {
    [-1, 1].forEach((side) => {
      const wireX = part(
        new THREE.CylinderGeometry(0.006, 0.006, 5.2, 6),
        steel,
        0,
        height,
        side * 2.6,
      );
      wireX.rotation.z = Math.PI / 2;
      const wireZ = part(
        new THREE.CylinderGeometry(0.006, 0.006, 5.2, 6),
        steel,
        side * 2.6,
        height,
        0,
      );
      wireZ.rotation.x = Math.PI / 2;
      group.add(wireX, wireZ);
    });
  });
  return group;
}

/** Centre de la centrale solaire. */
const PLANT = vec(70, 0, -30);

/** Centrale : des tables de modules inclinées, instanciées, et un local onduleur. */
function buildPlant() {
  const group = new THREE.Group();
  const rows = 7;
  const columns = 9;
  const count = rows * columns;
  const tables = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 0.045, 2.1), moduleGlass, count);
  const frames = new THREE.InstancedMesh(new THREE.BoxGeometry(4.06, 0.06, 2.16), steel, count);
  const legs = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1, 8),
    steel,
    count * 2,
  );
  const pose = new THREE.Object3D();
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = (column - (columns - 1) / 2) * 4.25;
      const z = (row - (rows - 1) / 2) * 5.2;
      pose.rotation.set(0.3, 0, 0);
      pose.scale.setScalar(1);
      pose.position.set(x, 1.25, z);
      pose.updateMatrix();
      tables.setMatrixAt(index, pose.matrix);
      pose.position.set(x, 1.215, z - 0.01);
      pose.updateMatrix();
      frames.setMatrixAt(index, pose.matrix);
      pose.rotation.set(0, 0, 0);
      [-0.7, 0.7].forEach((offset, leg) => {
        const height = 1.25 - offset * 0.3;
        pose.scale.set(1, height, 1);
        pose.position.set(x, height / 2, z + offset);
        pose.updateMatrix();
        legs.setMatrixAt(index * 2 + leg, pose.matrix);
      });
      index += 1;
    }
  }
  [tables, frames, legs].forEach((mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  group.add(part(new THREE.BoxGeometry(6, 2.6, 2.4), paint, 26, 1.3, 4));
  group.add(part(new THREE.BoxGeometry(1, 2, 0.04), steel, 24.5, 1.05, 5.22));
  group.position.copy(PLANT);
  return group;
}

/** Positions du plan « transfert » : trois stations donneuses et le site sans mesure. */
const DONORS = [vec(-140, 0, -90), vec(40, 0, -190), vec(190, 0, -60)];
const TARGET_SITE = vec(-30, 0, 60);

/* ---------- Le film ---------- */

interface Shot {
  space: boolean;
  fog: number;
  /** Centre de l'ombre portée, pour les plans au sol. */
  shadowAt: THREE.Vector3;
  camera: (u: number) => { position: THREE.Vector3; target: THREE.Vector3 };
}

export function mountFilm(
  canvas: HTMLCanvasElement,
  assets: FilmAssets,
  labels: string[],
  onFrame: FrameListener,
  onReady: () => void,
): Film | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.4;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 12000);
  const textures = new THREE.TextureLoader();
  const disposables: { dispose: () => void }[] = [];

  /* ----- Scène au sol ----- */

  const land = new THREE.Scene();
  const sunDirection = new THREE.Vector3().setFromSphericalCoords(1, (90 - 32) * RAD, 62 * RAD);

  const sky = new Sky();
  sky.scale.setScalar(9000);
  const skyUniforms = sky.material.uniforms;
  skyUniforms.turbidity.value = 3.2;
  skyUniforms.rayleigh.value = 1.1;
  skyUniforms.mieCoefficient.value = 0.006;
  skyUniforms.mieDirectionalG.value = 0.82;
  skyUniforms.sunPosition.value.copy(sunDirection);

  // Le ciel éclaire la scène : on en tire la carte d'environnement.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skyOnly = new THREE.Scene();
  skyOnly.add(sky);
  const environment = pmrem.fromScene(skyOnly, 0, 0.1, 12000);
  land.add(sky);
  land.environment = environment.texture;
  land.environmentIntensity = 0.75;
  land.fog = new THREE.FogExp2(0xd9bfa3, 0.0014);
  disposables.push(pmrem, environment);

  const sun = new THREE.DirectionalLight(0xffe6c8, 3.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -48;
  sun.shadow.camera.right = 48;
  sun.shadow.camera.top = 48;
  sun.shadow.camera.bottom = -48;
  sun.shadow.camera.far = 400;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  land.add(sun, sun.target);

  // Sol : latérite photographiée, relief doux au loin, teinte qui varie pour casser la répétition.
  const tile = (url: string, color: boolean) => {
    const texture = textures.load(url);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(420, 420);
    texture.anisotropy = 8;
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    disposables.push(texture);
    return texture;
  };
  const groundGeometry = new THREE.PlaneGeometry(2400, 2400, 200, 200);
  groundGeometry.rotateX(-Math.PI / 2);
  const positions = groundGeometry.attributes.position;
  const tints = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const far = smooth(140, 700, Math.hypot(x, z));
    positions.setY(i, far * 16 * noise(x, z));
    const tint = 0.9 + 0.14 * noise(x * 2.3 + 40, z * 2.1 - 15);
    // Teinte chaude : la latérite de Guinée est plus rouge que l'échantillon photographié.
    tints.set([tint * 1.12, tint * 0.86, tint * 0.72], i * 3);
  }
  groundGeometry.setAttribute('color', new THREE.BufferAttribute(tints, 3));
  groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(
    groundGeometry,
    new THREE.MeshStandardMaterial({
      map: tile(assets.groundColor, true),
      normalMap: tile(assets.groundNormal, false),
      roughnessMap: tile(assets.groundRoughness, false),
      vertexColors: true,
    }),
  );
  ground.receiveShadow = true;
  land.add(ground);

  // Blocs de latérite épars.
  const next = random(7);
  const rocks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x9a6248, roughness: 1, flatShading: true }),
    160,
  );
  const pose = new THREE.Object3D();
  for (let i = 0; i < rocks.count; i += 1) {
    const angle = next() * Math.PI * 2;
    const distance = 9 + next() * 150;
    const size = 0.08 + next() * next() * 0.5;
    pose.position.set(Math.cos(angle) * distance, size * 0.25, Math.sin(angle) * distance);
    // Rien dans l'emprise de la centrale.
    if (Math.abs(pose.position.x - PLANT.x) < 32 && Math.abs(pose.position.z - PLANT.z) < 24)
      pose.position.y = -5;
    pose.rotation.set(next() * 3, next() * 3, next() * 3);
    pose.scale.set(size, size * (0.5 + next() * 0.4), size * (0.7 + next() * 0.5));
    pose.updateMatrix();
    rocks.setMatrixAt(i, pose.matrix);
  }
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  land.add(rocks);

  land.add(buildStation(), buildPlant());

  // Plan « transfert » : les stations donneuses, le site sans mesure, et les liaisons.
  const transfer = new THREE.Group();
  DONORS.forEach((donor) => {
    const station = buildStation();
    station.position.copy(donor);
    station.scale.setScalar(5); // vues de très haut, elles doivent rester lisibles
    transfer.add(station);
  });
  const stake = part(
    new THREE.CylinderGeometry(0.5, 0.5, 30, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }),
    TARGET_SITE.x,
    15,
    TARGET_SITE.z,
  );
  stake.castShadow = false;
  transfer.add(stake);
  const linkMaterial = new THREE.MeshBasicMaterial({ color: ORANGE, fog: false });
  const links = DONORS.map((donor) => {
    const middle = donor.clone().lerp(TARGET_SITE, 0.5).setY(95);
    const curve = new THREE.QuadraticBezierCurve3(
      donor.clone().setY(16),
      middle,
      TARGET_SITE.clone().setY(30),
    );
    const link = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.9, 8), linkMaterial);
    transfer.add(link);
    return link;
  });
  land.add(transfer);

  // Plan « maille » : une grande maille, deux villes dedans, puis la grille fine.
  const grid = new THREE.Group();
  const CELL = 460;
  const strip = (
    length: number,
    width: number,
    material: THREE.Material,
    x: number,
    z: number,
    turned: boolean,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(turned ? width : length, 0.4, turned ? length : width),
      material,
    );
    mesh.position.set(x, 2, z);
    grid.add(mesh);
  };
  const coarse = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  const fine = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    fog: false,
    transparent: true,
    opacity: 0,
  });
  [-1, 1].forEach((side) => {
    strip(CELL, 3.2, coarse, 0, (side * CELL) / 2, false);
    strip(CELL, 3.2, coarse, (side * CELL) / 2, 0, true);
  });
  for (let i = 1; i < 8; i += 1) {
    const offset = -CELL / 2 + (i * CELL) / 8;
    strip(CELL, 1.2, fine, 0, offset, false);
    strip(CELL, 1.2, fine, offset, 0, true);
  }
  const wash = new THREE.Mesh(
    new THREE.PlaneGeometry(CELL, CELL),
    new THREE.MeshBasicMaterial({
      color: 0xffe600,
      transparent: true,
      opacity: 0.22,
      fog: false,
      depthWrite: false,
    }),
  );
  wash.rotation.x = -Math.PI / 2;
  wash.position.y = 1.5;
  wash.material.depthTest = false;
  wash.renderOrder = 1;
  grid.add(wash);
  [vec(-120, 0, 60), vec(105, 0, -75)].forEach((town, i) => {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 46, 12), coarse);
    pin.position.set(town.x, 23, town.z);
    const name = textSprite(labels[i] ?? '', 110);
    name.position.set(town.x, 66, town.z);
    grid.add(pin, name);
  });
  land.add(grid);

  /* ----- Scène en orbite ----- */

  const space = new THREE.Scene();
  space.background = new THREE.Color(0x020203);
  space.environment = environment.texture;
  space.environmentIntensity = 0.35;
  const EARTH = 10;

  const starPositions = new Float32Array(1800 * 3);
  const star = random(11);
  for (let i = 0; i < 1800; i += 1) {
    const direction = new THREE.Vector3().setFromSphericalCoords(
      900,
      Math.acos(2 * star() - 1),
      star() * Math.PI * 2,
    );
    starPositions.set([direction.x, direction.y, direction.z], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  space.add(
    new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false }),
    ),
  );

  const earthTexture = textures.load(assets.earth);
  earthTexture.colorSpace = THREE.SRGBColorSpace;
  earthTexture.anisotropy = 8;
  disposables.push(earthTexture);
  space.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(EARTH, 128, 64),
      new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 1, metalness: 0 }),
    ),
  );

  // Atmosphère : un liseré bleu qui s'éclaircit au limbe.
  space.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(EARTH * 1.035, 96, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader:
          'varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader:
          'varying vec3 vNormal; void main() { float rim = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(0.35, 0.6, 1.0, 1.0) * rim; }',
      }),
    ),
  );

  const spaceSun = new THREE.DirectionalLight(0xffffff, 3.2);
  spaceSun.position.copy(onGlobe(14, 28, 100));
  space.add(spaceSun, new THREE.AmbientLight(0xffffff, 0.06));

  // Biais du satellite : un voile orange sur le domaine étudié, plus dense vers le sud.
  const bandSteps = { lat: 16, lon: 48 };
  const bandPositions: number[] = [];
  const bandColors: number[] = [];
  const bandIndex: number[] = [];
  for (let i = 0; i <= bandSteps.lat; i += 1) {
    for (let j = 0; j <= bandSteps.lon; j += 1) {
      const lat = 14 - (i / bandSteps.lat) * (14 - 5.9);
      const lon = -17.6 + (j / bandSteps.lon) * (11.6 + 17.6);
      const point = onGlobe(lat, lon, EARTH * 1.004);
      bandPositions.push(point.x, point.y, point.z);
      const edge = Math.min(j, bandSteps.lon - j) / 4;
      bandColors.push(1, 0.33, 0, (0.1 + 0.7 * (i / bandSteps.lat)) * clamp01(edge));
    }
  }
  for (let i = 0; i < bandSteps.lat; i += 1) {
    for (let j = 0; j < bandSteps.lon; j += 1) {
      const a = i * (bandSteps.lon + 1) + j;
      const b = a + bandSteps.lon + 1;
      bandIndex.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const bandGeometry = new THREE.BufferGeometry();
  bandGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bandPositions, 3));
  bandGeometry.setAttribute('color', new THREE.Float32BufferAttribute(bandColors, 4));
  bandGeometry.setIndex(bandIndex);
  const bandMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  space.add(new THREE.Mesh(bandGeometry, bandMaterial));

  const orbit = onGlobe(3, -9, EARTH + 4.2);
  const draco = new DRACOLoader();
  draco.setDecoderPath(assets.draco);
  const gltf = new GLTFLoader();
  gltf.setDRACOLoader(draco);
  gltf.load(assets.satellite, ({ scene: model }) => {
    // Le modèle de la NASA arrive à une échelle quelconque : on le ramène à une taille connue.
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.scale.setScalar(2.4 / Math.max(size.x, size.y, size.z));
    model.position.copy(orbit);
    model.lookAt(0, 0, 0);
    model.rotateZ(0.6);
    space.add(model);
    dirty = true;
  });

  /* ----- Les six plans ----- */

  const lookFrom =
    (from: THREE.Vector3, to: THREE.Vector3, targetFrom: THREE.Vector3, targetTo = targetFrom) =>
    (u: number) => {
      const eased = smooth(0, 1, u);
      return {
        position: from.clone().lerp(to, eased),
        target: targetFrom.clone().lerp(targetTo, eased),
      };
    };
  const origin = vec(0, 0, 0);
  const shots: Shot[] = [
    {
      space: false,
      fog: 0.0014,
      shadowAt: origin,
      camera: lookFrom(vec(15, 1.9, 17), vec(8.5, 2.6, 9.5), vec(0, 2.2, 0)),
    },
    {
      space: true,
      fog: 0,
      shadowAt: origin,
      camera: lookFrom(
        orbit.clone().add(vec(2.2, 1.6, 5.5)),
        onGlobe(22, -30, 36),
        orbit,
        onGlobe(9, -4, EARTH * 0.7),
      ),
    },
    {
      space: false,
      fog: 0.0014,
      shadowAt: origin,
      camera: lookFrom(vec(0.1, 3.3, 1.5), vec(-1.3, 3.16, 0.7), SENSOR),
    },
    {
      space: false,
      fog: 0.0009,
      shadowAt: origin,
      camera: lookFrom(vec(-90, 80, 230), vec(-40, 150, 300), vec(20, 10, -50)),
    },
    {
      space: false,
      fog: 0.0014,
      shadowAt: PLANT,
      camera: lookFrom(vec(42, 2.2, -4), vec(84, 6, 6), vec(66, 1.4, -26), vec(76, 1.4, -34)),
    },
    {
      space: false,
      fog: 0.0004,
      shadowAt: origin,
      camera: lookFrom(vec(0, 560, 420), vec(0, 760, 180), origin),
    },
  ];
  const duration = CHAPTER_SECONDS * CHAPTER_COUNT;

  /* ----- Lecture ----- */

  let seconds = 0;
  let playing = false;
  let dirty = true;
  let visible = true;
  let frame = 0;
  let previous = performance.now();

  const resize = () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    // Sur un écran étroit, on élargit le champ pour garder le sujet dans l'image.
    camera.fov = camera.aspect < 1 ? 58 : 35;
    camera.updateProjectionMatrix();
    dirty = true;
  };

  const render = () => {
    const chapter = Math.min(CHAPTER_COUNT - 1, Math.floor(seconds / CHAPTER_SECONDS));
    const local = seconds - chapter * CHAPTER_SECONDS;
    const u = local / CHAPTER_SECONDS;
    const shot = shots[chapter];

    const { position, target } = shot.camera(u);
    camera.position.copy(position);
    camera.lookAt(target);

    if (shot.space) {
      bandMaterial.opacity = smooth(0.4, 0.72, u);
    } else {
      (land.fog as THREE.FogExp2).density = shot.fog;
      sun.target.position.copy(shot.shadowAt);
      sun.position.copy(shot.shadowAt).addScaledVector(sunDirection, 200);
      transfer.visible = chapter === 3;
      grid.visible = chapter === 5;
      links.forEach((link, i) => {
        const count = link.geometry.index?.count ?? 0;
        link.geometry.setDrawRange(
          0,
          Math.floor((count * smooth(0.18 + i * 0.12, 0.6 + i * 0.12, u)) / 3) * 3,
        );
      });
      fine.opacity = smooth(0.52, 0.78, u) * 0.85;
      wash.material.opacity = 0.22 * (1 - smooth(0.52, 0.78, u));
    }
    renderer.render(shot.space ? space : land, camera);

    // Fondu au noir à chaque changement de plan.
    const fade = Math.max(
      1 - local / FADE_SECONDS,
      1 - (CHAPTER_SECONDS - local) / FADE_SECONDS,
      0,
    );
    onFrame(seconds, chapter, clamp01(fade));
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const delta = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    if (playing && visible) {
      seconds = Math.min(duration, seconds + delta);
      if (seconds >= duration) playing = false;
      dirty = true;
    }
    if (dirty && visible) {
      dirty = false;
      render();
    }
  };

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    dirty = true;
  });
  observer.observe(canvas);
  window.addEventListener('resize', resize);
  resize();

  THREE.DefaultLoadingManager.onLoad = () => {
    dirty = true;
    onReady();
  };
  frame = requestAnimationFrame(tick);

  return {
    duration,
    get playing() {
      return playing;
    },
    play: () => {
      if (seconds >= duration) seconds = 0;
      playing = true;
    },
    pause: () => {
      playing = false;
      dirty = true;
    },
    seek: (value) => {
      seconds = Math.min(duration, Math.max(0, value));
      dirty = true;
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      THREE.DefaultLoadingManager.onLoad = () => {};
      [land, space].forEach((scene) =>
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) object.geometry.dispose();
        }),
      );
      disposables.forEach((item) => item.dispose());
      draco.dispose();
      renderer.dispose();
    },
  };
}

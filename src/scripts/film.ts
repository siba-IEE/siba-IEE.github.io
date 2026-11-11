/**
 * Film 3D de la page Travaux (three.js). Sept plans de douze secondes, joués comme une vidéo :
 * une station de mesure, le réseau sur 13 pays, le satellite au-dessus de l'Afrique de l'Ouest,
 * le capteur en gros plan, le transfert vers un site sans station, une centrale solaire, puis
 * la maille d'un produit satellitaire.
 *
 * Tout ce qui peut être réel l'est : le paysage des plans au sol est une photographie à 360°
 * (Poly Haven, CC0) projetée au sol, qui éclaire aussi les objets ; le satellite est un modèle
 * de la NASA ; les plans vus du ciel sont des images satellite NASA (Blue Marble, MODIS) avec
 * les positions réelles des stations et des villes. Seules la station et la centrale sont
 * construites ici, avec des matériaux physiques.
 *
 * Ce module ne connaît ni les textes ni le lecteur : il rend l'image de l'instant demandé.
 */
import * as THREE from 'three';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { STATIONS } from '../data/stations';
import borders from '../data/borders.json';

export const CHAPTER_SECONDS = 12;
export const CHAPTER_COUNT = 7;
const FADE_SECONDS = 0.6;

export interface FilmAssets {
  /** Panorama à 360° du paysage des plans au sol. */
  panorama: string;
  earth: string;
  satellite: string;
  draco: string;
  /** Image satellite de l'Afrique de l'Ouest (NASA Blue Marble). */
  region: string;
  /** Image satellite de la Guinée (MODIS Terra, 21 décembre 2023). */
  cell: string;
}

/** Noms à afficher dans l'image, dans la langue de la page. */
export interface FilmLabels {
  kindia: string;
  mamou: string;
  conakry: string;
  /** Les 13 pays du réseau, dans l'ordre de COUNTRIES. */
  countries: string[];
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

/** Centre de la centrale solaire, devant la caméra du plan « dimensionner ». */
const PLANT = vec(0, 0, -9);

/** Centrale : des tables de modules inclinées, instanciées, et un local onduleur. */
function buildPlant() {
  const group = new THREE.Group();
  const rows = 5;
  const columns = 7;
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
  group.add(part(new THREE.BoxGeometry(6, 2.6, 2.4), paint, 19, 1.3, 2));
  group.add(part(new THREE.BoxGeometry(1, 2, 0.04), steel, 17.5, 1.05, 3.22));
  group.position.copy(PLANT);
  return group;
}

/* ---------- Plans sur image satellite ---------- */

/** Matériau non éclairé, hors du rendu tonal : l'image et les tracés gardent leurs couleurs. */
const flat = (parameters: THREE.MeshBasicMaterialParameters) =>
  new THREE.MeshBasicMaterial({ toneMapped: false, ...parameters });

/**
 * Une image satellite posée à plat, avec de quoi y placer des repères par latitude et
 * longitude. `bounds` : ouest, sud, est, nord, en degrés. `scale` : unités de scène par degré.
 */
function buildMap(texture: THREE.Texture, bounds: [number, number, number, number], scale: number) {
  const [west, south, east, north] = bounds;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry((east - west) * scale, (north - south) * scale),
    flat({ map: texture }),
  );
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);
  const at = (lat: number, lon: number, height = 0) =>
    vec((lon - (west + east) / 2) * scale, height, -(lat - (south + north) / 2) * scale);
  /** Trait posé sur la carte, entre deux points. */
  const line = (
    from: THREE.Vector3,
    to: THREE.Vector3,
    width: number,
    material: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(from.distanceTo(to), width), material);
    mesh.position.copy(from).lerp(to, 0.5).setY(0.05);
    mesh.rotation.set(-Math.PI / 2, 0, Math.atan2(-(to.z - from.z), to.x - from.x));
    scene.add(mesh);
    return mesh;
  };
  /** Repère vertical, avec une étiquette facultative. */
  const pin = (
    lat: number,
    lon: number,
    height: number,
    radius: number,
    color: number,
    name?: string,
  ) => {
    const base = at(lat, lon);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 12),
      flat({ color }),
    );
    stem.position.copy(base).setY(height / 2);
    const head = new THREE.Mesh(new THREE.SphereGeometry(radius * 2.6, 16, 12), flat({ color }));
    head.position.copy(base).setY(height);
    scene.add(stem, head);
    if (name) {
      const text = textSprite(name, height * 2.6);
      text.position.copy(base).setY(height * 1.5);
      scene.add(text);
    }
  };
  return { scene, at, line, pin };
}

const haversine = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const h =
    Math.sin(((b.lat - a.lat) * RAD) / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(((b.lon - a.lon) * RAD) / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(h));
};

/** Site sans station du plan « transfert » : Conakry. Villes du plan « maille ». */
const CONAKRY = { lat: 9.51, lon: -13.71 };
const KINDIA = { lat: 10.06, lon: -12.87 };
const MAMOU = { lat: 10.38, lon: -12.09 };
/** Où poser le nom de chacun des 13 pays du réseau (latitude, longitude). */
const COUNTRIES: [number, number][] = [
  [13.45, -15.4], // Gambie
  [12.0, -14.9], // Guinée-Bissau
  [10.9, -10.9], // Guinée
  [8.5, -11.8], // Sierra Leone
  [6.4, -9.4], // Libéria
  [14.2, -6.5], // Mali
  [7.6, -5.5], // Côte d'Ivoire
  [12.4, -1.6], // Burkina Faso
  [7.9, -1.2], // Ghana
  [8.6, 1.0], // Togo
  [9.9, 2.3], // Bénin
  [14.4, 5.5], // Niger
  [9.6, 8.0], // Nigeria
];

/** La maille d'un degré qui contient Kindia et Mamou : 10 à 11° N, 13 à 12° O. */
const CELL = { south: 10, north: 11, west: -13, east: -12 };

/* ---------- Le film ---------- */

interface Shot {
  scene: THREE.Scene;
  /** Éléments animés du plan, selon son avancement de 0 à 1. */
  animate?: (u: number) => void;
  /** Exposition du rendu : le plein jour et l'orbite ne se règlent pas pareil. */
  exposure: number;
  camera: (u: number) => { position: THREE.Vector3; target: THREE.Vector3 };
}

export function mountFilm(
  canvas: HTMLCanvasElement,
  assets: FilmAssets,
  labels: FilmLabels,
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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 12000);
  const textures = new THREE.TextureLoader();
  const disposables: { dispose: () => void }[] = [];

  /* ----- Scène au sol : un paysage photographié, projeté sur un sol plat ----- */

  const land = new THREE.Scene();
  const panorama = textures.load(assets.panorama);
  panorama.colorSpace = THREE.SRGBColorSpace;
  panorama.mapping = THREE.EquirectangularReflectionMapping;
  panorama.anisotropy = 8;
  disposables.push(panorama);

  // La photographie a été prise à hauteur d'homme : c'est la hauteur de projection.
  const EYE = 1.7;
  const backdrop = new GroundedSkybox(panorama, EYE, 160);
  backdrop.position.y = EYE;
  backdrop.material.toneMapped = false;
  land.add(backdrop);

  // Le même panorama éclaire les objets, pour qu'ils prennent la lumière du lieu.
  const pmrem = new THREE.PMREMGenerator(renderer);
  let environment: THREE.WebGLRenderTarget | null = null;
  const lightFromPanorama = () => {
    environment = pmrem.fromEquirectangular(panorama);
    land.environment = environment.texture;
  };
  land.environmentIntensity = 1.5;
  disposables.push(pmrem);

  // Le soleil de la photographie, à 73° de hauteur : il porte les ombres des objets.
  const sunDirection = vec(0.212, 0.956, 0.201).normalize();
  const sun = new THREE.DirectionalLight(0xfff4e4, 3);
  sun.position.copy(sunDirection).multiplyScalar(120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.far = 300;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  land.add(sun);

  // Le sol photographié ne reçoit pas d'ombre : un plan invisible la reçoit à sa place.
  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.ShadowMaterial({ opacity: 0.42 }),
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = 0.01;
  shadowCatcher.receiveShadow = true;
  land.add(shadowCatcher);

  const station = buildStation();
  const plant = buildPlant();
  land.add(station, plant);

  /* ----- Plan « transfert » : les 31 stations sur l'image de la région ----- */

  const photo = (url: string) => {
    const texture = textures.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    disposables.push(texture);
    return texture;
  };
  const region = buildMap(photo(assets.region), [-32, -6, 24, 32], 10);
  // Frontières et côtes (Natural Earth), puis le nom des 13 pays du réseau.
  const borderPoints: number[] = [];
  (borders as [number, number][][]).forEach((line) => {
    for (let i = 0; i < line.length - 1; i += 1) {
      const from = region.at(line[i][1], line[i][0], 0.06);
      const to = region.at(line[i + 1][1], line[i + 1][0], 0.06);
      borderPoints.push(from.x, from.y, from.z, to.x, to.y, to.z);
    }
  });
  const borderGeometry = new THREE.BufferGeometry();
  borderGeometry.setAttribute('position', new THREE.Float32BufferAttribute(borderPoints, 3));
  region.scene.add(
    new THREE.LineSegments(
      borderGeometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        toneMapped: false,
      }),
    ),
  );
  COUNTRIES.forEach(([lat, lon], i) => {
    const name = textSprite(labels.countries[i] ?? '', 13);
    name.position.copy(region.at(lat, lon, 0.6));
    region.scene.add(name);
  });
  const donors = [...STATIONS]
    .sort((a, b) => haversine(a, CONAKRY) - haversine(b, CONAKRY))
    .slice(0, 3);
  STATIONS.forEach((station) =>
    region.pin(station.lat, station.lon, donors.includes(station) ? 2.4 : 1.6, 0.09, 0xffffff),
  );
  region.pin(CONAKRY.lat, CONAKRY.lon, 3.4, 0.12, ORANGE, labels.conakry);
  const linkMaterial = flat({ color: ORANGE });
  const links = donors.map((donor) => {
    const from = region.at(donor.lat, donor.lon, 2.4);
    const to = region.at(CONAKRY.lat, CONAKRY.lon, 3.4);
    const curve = new THREE.QuadraticBezierCurve3(from, from.clone().lerp(to, 0.5).setY(9), to);
    const link = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.1, 8), linkMaterial);
    region.scene.add(link);
    return link;
  });
  const conakry = region.at(CONAKRY.lat, CONAKRY.lon);

  /* ----- Plan « maille » : la maille d'un degré sur l'image de la Guinée ----- */

  const guinea = buildMap(photo(assets.cell), [-14.5, 9, -10.5, 12], 100);
  const white = flat({ color: 0xffffff, transparent: true, opacity: 0.4 });
  const bold = flat({ color: 0xffffff });
  const fine = flat({ color: 0xffffff, transparent: true, opacity: 0 });
  // La grille d'un degré du produit, sur toute l'image.
  [-14, -13, -12, -11].forEach((lon) =>
    guinea.line(guinea.at(9, lon), guinea.at(12, lon), 0.6, white),
  );
  [10, 11].forEach((lat) => guinea.line(guinea.at(lat, -14.5), guinea.at(lat, -10.5), 0.6, white));
  // La maille de Kindia et Mamou, puis sa subdivision en mailles fines.
  guinea.line(guinea.at(CELL.south, CELL.west), guinea.at(CELL.south, CELL.east), 1.4, bold);
  guinea.line(guinea.at(CELL.north, CELL.west), guinea.at(CELL.north, CELL.east), 1.4, bold);
  guinea.line(guinea.at(CELL.south, CELL.west), guinea.at(CELL.north, CELL.west), 1.4, bold);
  guinea.line(guinea.at(CELL.south, CELL.east), guinea.at(CELL.north, CELL.east), 1.4, bold);
  for (let i = 1; i < 8; i += 1) {
    const step = i / 8;
    guinea.line(
      guinea.at(CELL.south + step, CELL.west),
      guinea.at(CELL.south + step, CELL.east),
      0.35,
      fine,
    );
    guinea.line(
      guinea.at(CELL.south, CELL.west + step),
      guinea.at(CELL.north, CELL.west + step),
      0.35,
      fine,
    );
  }
  const wash = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    flat({ color: 0xffe600, transparent: true, opacity: 0.25, depthWrite: false }),
  );
  wash.rotation.x = -Math.PI / 2;
  wash.position.copy(guinea.at(10.5, -12.5, 0.03));
  guinea.scene.add(wash);
  guinea.pin(KINDIA.lat, KINDIA.lon, 12, 0.4, 0xffffff, labels.kindia);
  guinea.pin(MAMOU.lat, MAMOU.lon, 12, 0.4, 0xffffff, labels.mamou);

  /* ----- Scène en orbite ----- */

  const space = new THREE.Scene();
  space.background = new THREE.Color(0x020203);
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

  /* ----- Les sept plans ----- */

  const lookFrom =
    (from: THREE.Vector3, to: THREE.Vector3, targetFrom: THREE.Vector3, targetTo = targetFrom) =>
    (u: number) => {
      const eased = smooth(0, 1, u);
      return {
        position: from.clone().lerp(to, eased),
        target: targetFrom.clone().lerp(targetTo, eased),
      };
    };
  const hideLinks = () => links.forEach((link) => link.geometry.setDrawRange(0, 0));
  const shots: Shot[] = [
    {
      scene: land,
      exposure: 1,
      camera: lookFrom(vec(9.5, 1.5, 10.5), vec(5.5, 2.1, 7), vec(0, 2.1, 0)),
      animate: () => {
        station.visible = true;
        plant.visible = false;
      },
    },
    {
      scene: region.scene,
      exposure: 1,
      // Survol d'ouest en est, de la Gambie au Nigeria.
      camera: lookFrom(
        region.at(11.5, -15, 0).add(vec(-6, 34, 46)),
        region.at(10.5, 6, 0).add(vec(6, 40, 52)),
        region.at(11.5, -14, 0),
        region.at(10.5, 5, 0),
      ),
      animate: hideLinks,
    },
    {
      scene: space,
      exposure: 0.4,
      camera: lookFrom(
        orbit.clone().add(vec(2.2, 1.6, 5.5)),
        onGlobe(22, -30, 36),
        orbit,
        onGlobe(9, -4, EARTH * 0.7),
      ),
      animate: (u) => (bandMaterial.opacity = smooth(0.4, 0.72, u)),
    },
    {
      scene: land,
      exposure: 1,
      camera: lookFrom(vec(0.1, 3.3, 1.5), vec(-1.3, 3.16, 0.7), SENSOR),
      animate: () => {
        station.visible = true;
        plant.visible = false;
      },
    },
    {
      scene: region.scene,
      exposure: 1,
      camera: lookFrom(
        vec(20, 120, 150),
        conakry.clone().add(vec(18, 26, 42)),
        vec(10, 0, 20),
        conakry.clone().add(vec(12, 0, -6)),
      ),
      // Les liaisons se tracent l'une après l'autre, des stations vers le site.
      animate: (u) =>
        links.forEach((link, i) => {
          const count = link.geometry.index?.count ?? 0;
          link.geometry.setDrawRange(
            0,
            Math.floor((count * smooth(0.3 + i * 0.1, 0.7 + i * 0.1, u)) / 3) * 3,
          );
        }),
    },
    {
      scene: land,
      exposure: 1,
      camera: lookFrom(vec(-13, 1.7, 9), vec(9, 3.6, 12), vec(-2, 1.2, -6), vec(3, 1.2, -8)),
      animate: () => {
        station.visible = false;
        plant.visible = true;
      },
    },
    {
      scene: guinea.scene,
      exposure: 1,
      camera: lookFrom(vec(0, 230, 170), vec(0, 175, 120), vec(0, 0, 10), vec(0, 0, 14)),
      // À mi-plan, la maille se subdivise.
      animate: (u) => {
        fine.opacity = smooth(0.52, 0.78, u) * 0.8;
        wash.material.opacity = 0.25 * (1 - smooth(0.52, 0.78, u));
      },
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

    renderer.toneMappingExposure = shot.exposure;
    shot.animate?.(u);
    renderer.render(shot.scene, camera);

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
    lightFromPanorama();
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
      [land, space, region.scene, guinea.scene].forEach((scene) =>
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) object.geometry.dispose();
        }),
      );
      disposables.forEach((item) => item.dispose());
      environment?.dispose();
      draco.dispose();
      renderer.dispose();
    },
  };
}

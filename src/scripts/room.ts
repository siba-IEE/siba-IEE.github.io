/**
 * Le décor : un couloir dont les murs portent le parcours, puis un salon meublé.
 * Les meubles sont des modèles Poly Haven (CC0), les sols et murs des textures du même fonds.
 * Tout est à l'échelle réelle, en mètres ; le personnage avance vers les z négatifs.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export interface Frame {
  when: string;
  title: string;
  place: string;
}

/** Distance entre deux cadres du couloir. */
export const GAP = 2.2;
const HALF = 1.3;
const HEIGHT = 2.7;
const ROOM_HALF = 3.3;
const ROOM_DEPTH = 7.5;
const TV = { width: 1.9, height: 1.07 };

export interface Room {
  group: THREE.Group;
  /** Position du seuil entre couloir et salon. */
  doorZ: number;
  /** Où le personnage s'arrête, dos au fauteuil. */
  seat: THREE.Vector3;
  /** Centre du plateau de la table basse. */
  table: THREE.Vector3;
  tv: { screen: THREE.Mesh; center: THREE.Vector3; width: number; height: number };
  /** Position du cadre d'indice donné, et côté du mur (-1 à gauche, 1 à droite). */
  frame(index: number): { z: number; side: number };
  /** Lumière d'accompagnement dans le couloir. */
  follow(position: THREE.Vector3): void;
  /** 0 : plein jour ; 1 : pièce assombrie, éclairée par la télévision. */
  setCinema(amount: number): void;
  setScreenTexture(texture: THREE.Texture): void;
  dispose(): void;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const textures = new THREE.TextureLoader();

function tiled(file: string, repeatX: number, repeatY: number, color = false) {
  const map = textures.load(`/textures/${file}.webp`);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.anisotropy = 8;
  if (color) map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

/** Une paroi : un plan texturé au mètre, qui reçoit les ombres. */
function panel(width: number, height: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.receiveShadow = true;
  return mesh;
}

function plaster(width: number, height: number, tint = 0xffffff) {
  return new THREE.MeshStandardMaterial({
    color: tint,
    map: tiled('mur', width / 2, height / 2, true),
    normalMap: tiled('mur-relief', width / 2, height / 2),
    roughness: 0.92,
  });
}

function parquet(width: number, depth: number) {
  return new THREE.MeshStandardMaterial({
    map: tiled('parquet', width / 1.8, depth / 1.8, true),
    normalMap: tiled('parquet-relief', width / 1.8, depth / 1.8),
    roughnessMap: tiled('parquet-rugosite', width / 1.8, depth / 1.8),
    roughness: 0.75,
  });
}

/** Le tirage encadré d'une étape du parcours. */
function print(frame: Frame) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 800;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, 640, 800);
  ctx.fillStyle = '#0a0a0a';
  ctx.font = '400 30px "Geist Mono Variable", monospace';
  ctx.fillText(frame.when, 64, 120);

  // Le titre se compose en drapeau, et rétrécit s'il dépasse six lignes.
  let size = 78;
  let lines: string[] = [];
  do {
    ctx.font = `400 ${size}px "Instrument Serif", serif`;
    lines = [];
    let line = '';
    for (const word of frame.title.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > 512 && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
    size -= 6;
  } while (lines.length > 6 && size > 36);
  lines.forEach((line, index) => ctx.fillText(line, 64, 250 + index * (size + 12)));

  ctx.fillStyle = '#55524c';
  ctx.font = '400 26px "Instrument Sans Variable", sans-serif';
  const place = frame.place.length > 44 ? `${frame.place.slice(0, 43)}…` : frame.place;
  ctx.fillText(place, 64, 720);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

/** Halo d'applique : un dégradé additif posé sur le mur. */
function glow(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 20, 4, 64, 20, 110);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/** Gobo de la fenêtre : six carreaux, pour que le soleil dessine les croisillons au sol. */
function panes() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#fff';
  for (let column = 0; column < 3; column++)
    for (let row = 0; row < 2; row++) ctx.fillRect(34 + column * 64, 56 + row * 74, 56, 66);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export function buildRoom(frames: Frame[]): Room {
  const group = new THREE.Group();
  const doorZ = -(frames.length * GAP + 1.2);
  const start = 5;
  const length = start - doorZ;
  const middle = (start + doorZ) / 2;
  const disposables: { dispose(): void }[] = [];
  const add = <T extends THREE.Object3D>(object: T, x: number, y: number, z: number, turn = 0) => {
    object.position.set(x, y, z);
    object.rotation.y = turn;
    group.add(object);
    return object;
  };

  const white = new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: 0.9 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xfaf9f6, roughness: 0.6 });
  const black = new THREE.MeshStandardMaterial({
    color: 0x0c0c0d,
    roughness: 0.35,
    metalness: 0.4,
  });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08d57, roughness: 0.3, metalness: 1 });

  /* ---------- Couloir ---------- */

  const hall = panel(HALF * 2, length, parquet(HALF * 2, length));
  hall.rotation.x = -Math.PI / 2;
  add(hall, 0, 0, middle);
  const hallCeiling = panel(HALF * 2, length, white);
  hallCeiling.rotation.x = Math.PI / 2;
  add(hallCeiling, 0, HEIGHT, middle);
  for (const side of [-1, 1]) {
    add(
      panel(length, HEIGHT, plaster(length, HEIGHT)),
      side * HALF,
      HEIGHT / 2,
      middle,
      (-side * Math.PI) / 2,
    );
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, length), trim);
    add(base, side * (HALF - 0.01), 0.05, middle);
  }
  add(panel(HALF * 2, HEIGHT, plaster(HALF * 2, HEIGHT)), 0, HEIGHT / 2, start, Math.PI);

  const frameAt = (index: number) => ({ z: -(index * GAP + 1.7), side: index % 2 ? -1 : 1 });
  const halo = glow('rgba(255,214,160,0.55)');
  const spot = new THREE.MeshBasicMaterial({ color: 0xfff1d8 });
  const haloMaterial = new THREE.MeshBasicMaterial({
    map: halo,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  frames.forEach((frame, index) => {
    const { z, side } = frameAt(index);
    const holder = new THREE.Group();
    const border = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.07, 0.035), black);
    border.castShadow = true;
    const map = print(frame);
    disposables.push(map);
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 1.0),
      new THREE.MeshStandardMaterial({ map, roughness: 0.9 }),
    );
    paper.position.z = 0.019;
    // Applique en laiton au-dessus du cadre, et son halo sur le mur.
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 12), brass);
    lamp.rotation.z = Math.PI / 2;
    lamp.position.set(0, 0.66, 0.09);
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.4), haloMaterial);
    wash.position.set(0, -0.15, -0.012);
    holder.add(border, paper, lamp, wash);
    add(holder, side * (HALF - 0.02), 1.55, z, (-side * Math.PI) / 2);

    // Spot encastré au plafond, à l'aplomb du passage.
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), spot);
    disc.rotation.x = Math.PI / 2;
    add(disc, 0, HEIGHT - 0.002, z + 0.4);
  });

  const walkLight = new THREE.PointLight(0xffe9cf, 26, 12, 2);
  const walkShadow = new THREE.SpotLight(0xfff0dc, 2.2, 0, 0.55, 0.7, 0);
  walkShadow.castShadow = true;
  walkShadow.shadow.mapSize.set(1024, 1024);
  walkShadow.shadow.bias = -0.0004;
  walkShadow.shadow.camera.near = 0.5;
  walkShadow.shadow.camera.far = 6;
  group.add(walkLight, walkShadow, walkShadow.target);

  /* ---------- Salon ---------- */

  const far = doorZ - ROOM_DEPTH;
  const center = doorZ - ROOM_DEPTH / 2;
  const floor = panel(ROOM_HALF * 2, ROOM_DEPTH, parquet(ROOM_HALF * 2, ROOM_DEPTH));
  floor.rotation.x = -Math.PI / 2;
  add(floor, 0, 0, center);
  const ceiling = panel(ROOM_HALF * 2, ROOM_DEPTH, white);
  ceiling.rotation.x = Math.PI / 2;
  add(ceiling, 0, HEIGHT, center);

  // Mur de la télévision, plus sombre pour que l'image s'en détache.
  add(panel(ROOM_HALF * 2, HEIGHT, plaster(ROOM_HALF * 2, HEIGHT, 0x4a5350)), 0, HEIGHT / 2, far);
  for (const side of [-1, 1]) {
    add(
      panel(ROOM_DEPTH, HEIGHT, plaster(ROOM_DEPTH, HEIGHT)),
      side * ROOM_HALF,
      HEIGHT / 2,
      center,
      (-side * Math.PI) / 2,
    );
    add(
      new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, ROOM_DEPTH), trim),
      side * (ROOM_HALF - 0.01),
      0.05,
      center,
    );
    // Retours du mur d'entrée, de part et d'autre du couloir.
    const width = ROOM_HALF - HALF;
    add(
      panel(width, HEIGHT, plaster(width, HEIGHT)),
      side * (HALF + width / 2),
      HEIGHT / 2,
      doorZ,
      Math.PI,
    );
    add(
      new THREE.Mesh(new THREE.BoxGeometry(0.09, HEIGHT, 0.16), trim),
      side * (HALF + 0.045),
      HEIGHT / 2,
      doorZ,
    );
  }
  add(new THREE.Mesh(new THREE.BoxGeometry(ROOM_HALF * 2, 0.1, 0.02), trim), 0, 0.05, far + 0.01);

  // Fenêtre : un panneau lumineux, ses montants, et un soleil qui en projette les carreaux.
  const windowZ = doorZ - 4.3;
  const glass = new THREE.MeshBasicMaterial({ color: 0xeaf2ff });
  add(
    new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), glass),
    ROOM_HALF - 0.005,
    1.6,
    windowZ,
    -Math.PI / 2,
  );
  for (const offset of [-1.2, -0.4, 0.4, 1.2])
    add(
      new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.56, 0.05), trim),
      ROOM_HALF - 0.02,
      1.6,
      windowZ + offset,
    );
  for (const height of [0.85, 1.6, 2.35])
    add(
      new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 2.45), trim),
      ROOM_HALF - 0.02,
      height,
      windowZ,
    );
  add(
    new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 2.5), trim),
    ROOM_HALF - 0.08,
    0.83,
    windowZ,
  );

  const sun = new THREE.SpotLight(0xffe6c4, 7, 0, 0.36, 0.2, 0);
  sun.position.set(ROOM_HALF + 5.5, 5, windowZ + 1.6);
  sun.target.position.set(-0.6, 0, windowZ - 0.9);
  sun.map = panes();
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 16;
  const lamp = new THREE.PointLight(0xffd9a8, 10, 8, 2);
  lamp.position.set(-1.75, 1.72, doorZ - 4.6);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.002;
  lamp.shadow.radius = 6;
  const fill = new THREE.HemisphereLight(0xfff6ea, 0x8a7a66, 0.55);
  const tvLight = new THREE.PointLight(0x9fc4ff, 0, 7, 2);
  tvLight.position.set(0, 1.4, far + 0.9);
  group.add(sun, sun.target, lamp, fill, tvLight);

  // Tapis.
  const rug = panel(
    3.2,
    2.4,
    new THREE.MeshStandardMaterial({
      color: 0xb9b2a6,
      map: tiled('tapis', 6, 4.5, true),
      normalMap: tiled('tapis-relief', 6, 4.5),
      roughness: 1,
    }),
  );
  rug.rotation.x = -Math.PI / 2;
  add(rug, 0, 0.008, doorZ - 5.2);

  // Télévision murale : dalle noire, écran émissif.
  const tvCenter = new THREE.Vector3(0, 1.42, far + 0.06);
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(TV.width + 0.03, TV.height + 0.03, 0.04),
    black,
  );
  slab.castShadow = true;
  add(slab, tvCenter.x, tvCenter.y, tvCenter.z - 0.022);
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(TV.width, TV.height), screenMaterial);
  add(screen, tvCenter.x, tvCenter.y, tvCenter.z);

  // Mobilier.
  const seat = new THREE.Vector3(0, 0, doorZ - 4.6);
  const table = new THREE.Vector3(0, 0.395, doorZ - 5.75);
  const furniture: [file: string, x: number, y: number, z: number, turn: number, scale?: number][] =
    [
      ['modern_arm_chair_01', 0, 0, doorZ - 4.1, Math.PI],
      ['mid_century_lounge_chair', -1.8, 0, doorZ - 4.5, Math.PI + 0.55],
      ['modern_coffee_table_01', table.x, 0, table.z, Math.PI / 2],
      ['modern_wooden_cabinet', 0, 0, far + 0.34, 0],
      ['modern_ceiling_lamp_01', -1.75, HEIGHT - 1.17, doorZ - 4.6, 0],
      ['potted_plant_02', 2.55, 0, far + 0.75, 0.6, 1.35],
      ['potted_plant_04', -0.92, 0.68, far + 0.36, 0, 1.2],
      ['side_table_01', 1.12, 0, doorZ - 4.15, 0],
      ['filmstrip_projector_8mm', 1.12, 0.55, doorZ - 4.15, Math.PI],
      ['steel_frame_shelves_03', -ROOM_HALF + 0.4, 0, doorZ - 5.5, Math.PI / 2, 0.9],
      ['ceramic_vase_01', -0.42, 0.395, table.z - 0.04, 0],
    ];
  let disposed = false;
  for (const [file, x, y, z, turn, scale = 1] of furniture) {
    loader.load(`/models/room/${file}.glb`, (gltf) => {
      if (disposed) return;
      gltf.scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      gltf.scene.scale.setScalar(scale);
      add(gltf.scene, x, y, z, turn);
    });
  }

  const baseSun = sun.intensity;
  const baseLamp = lamp.intensity;
  const baseFill = fill.intensity;

  return {
    group,
    doorZ,
    seat,
    table,
    tv: { screen, center: tvCenter, width: TV.width, height: TV.height },
    frame: frameAt,
    follow(position) {
      const inside = Math.min(1, Math.max(0, (doorZ + 1 - position.z) / 2));
      walkLight.position.set(position.x, 2.3, position.z - 0.6);
      walkLight.intensity = 26 * (1 - inside);
      walkShadow.position.set(position.x + 0.4, 2.65, position.z + 0.7);
      walkShadow.target.position.set(position.x, 0, position.z);
      walkShadow.intensity = 2.2 * (1 - inside);
      walkShadow.castShadow = inside < 0.98;
    },
    setCinema(amount) {
      sun.intensity = baseSun * (1 - 0.82 * amount);
      lamp.intensity = baseLamp * (1 - 0.7 * amount);
      fill.intensity = baseFill * (1 - 0.6 * amount);
      glass.color.setScalar(1).multiplyScalar(1 - 0.75 * amount);
      tvLight.intensity = 9 * amount;
    },
    setScreenTexture(texture) {
      screenMaterial.map = texture;
      screenMaterial.needsUpdate = true;
    },
    dispose() {
      disposed = true;
      disposables.forEach((item) => item.dispose());
      group.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          for (const value of Object.values(material))
            if ((value as THREE.Texture)?.isTexture) value.dispose();
          material.dispose();
        }
      });
    },
  };
}

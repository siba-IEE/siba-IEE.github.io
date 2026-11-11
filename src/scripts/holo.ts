/**
 * Le film d'une réalisation, projeté dans le salon : une maquette 3D qui se construit
 * au-dessus de la table basse à partir des données publiées des projets
 * (src/data/hologrammes.json). Une scène assemble une carte en relief, des panneaux
 * (courbes, barres, fiches), des étiquettes accrochées aux objets de la pièce et, au
 * besoin, une petite maquette d'installation.
 */
import * as THREE from 'three';
import donnees from '../data/hologrammes.json';

/* ---------- Description d'une scène ---------- */

export interface MapSpec {
  /** Guinée, Côte d'Ivoire ou Afrique de l'Ouest. */
  key: 'gn' | 'ci' | 'ao';
  /** Ce que la couleur des territoires raconte (Guinée seulement). */
  theme?: 'ghi' | 'confiance' | 'ecart';
  /** Une colonne par localité, haute comme son rayonnement. */
  columns?: boolean;
  /** Mailles d'un degré du produit satellite. */
  grid?: boolean;
  /** Localités mises en avant. */
  mark?: string[];
  /** Liaisons entre deux localités. */
  arcs?: [string, string][];
  /** Texte affiché au-dessus d'une localité. */
  labels?: Record<string, string>;
}

export type Panel =
  | {
      kind: 'lines';
      title: string;
      unit: string;
      series: { name: string; color: string; values: number[] }[];
    }
  | {
      kind: 'bars';
      title: string;
      unit: string;
      labels: string[];
      values: number[];
      mark?: number[];
    }
  | { kind: 'card'; title: string; rows: [string, string][] }
  | { kind: 'matrix'; title: string; across: string; down: string };

export interface Tag {
  at: 'tv' | 'lamp' | 'window' | 'table';
  text: string;
}

export interface Scene {
  map?: MapSpec;
  panels?: Panel[];
  tags?: Tag[];
  /** Maquette posée sur la table : un kit solaire domestique ou un mini-réseau de village. */
  model?: 'kit' | 'village';
  /** Point de vue : azimut et élévation en radians, distance en mètres. */
  cam?: [number, number, number];
}

export interface Holo {
  group: THREE.Group;
  /** Centre de la projection, que la caméra regarde. */
  center: THREE.Vector3;
  /** Remplace la scène en cours ; `null` éteint la projection. */
  show(scene: Scene | null): void;
  /** 0 éteint, 1 allumé : sert à assombrir la pièce autour. */
  readonly level: number;
  update(delta: number, camera: THREE.Camera): void;
  dispose(): void;
}

type Anchors = Record<Tag['at'], THREE.Vector3> & { projector: THREE.Vector3 };

/* ---------- Palette ---------- */

const GLOW = '#7fdcff';
const WARM = '#ffc266';
/** Classes d'irradiation du RNDE, en kWh/m²/j, du plus faible au plus fort. */
const GHI_BREAKS = [4.7, 5.0, 5.3, 5.6, 5.9];
const GHI_COLORS = ['#fff3a6', '#ffd166', '#ff9f43', '#ee5a52', '#b83280', '#5b2a86'];
const TRUST_COLORS = ['#c77f1a', '#2a6f97'];
const GAP_COLORS = ['#7fdcff', '#3d8fb3', '#1f4a66'];
const ghiColor = (value: number) => GHI_COLORS[GHI_BREAKS.filter((limit) => value >= limit).length];

const ease = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/* ---------- Cartes ---------- */

interface Town {
  n: string;
  x: number;
  y: number;
  v?: number;
}
interface Land {
  rings: number[][];
  towns: Town[];
  areas: { g: number; e: number; c: number; r: number[][] }[];
}

const lands: Record<MapSpec['key'], Land> = {
  gn: { rings: donnees.gn.contour, towns: donnees.gn.villes, areas: donnees.gn.sp },
  ci: { rings: donnees.ci.contour, towns: donnees.ci.villes, areas: [] },
  ao: { rings: Object.values(donnees.ao.pays).flat(), towns: donnees.ao.stations, areas: [] },
};

/** Projection plane d'une carte : longitudes resserrées par le cosinus de la latitude moyenne. */
function projection(land: Land, maxWidth: number, maxDepth: number) {
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  for (const ring of land.rings)
    for (let i = 0; i < ring.length; i += 2) {
      west = Math.min(west, ring[i]);
      east = Math.max(east, ring[i]);
      south = Math.min(south, ring[i + 1]);
      north = Math.max(north, ring[i + 1]);
    }
  const squeeze = Math.cos((((south + north) / 2) * Math.PI) / 180);
  const spanX = (east - west) * squeeze;
  const spanY = north - south;
  const scale = Math.min(maxWidth / spanX, maxDepth / spanY);
  return {
    width: spanX * scale,
    depth: spanY * scale,
    bounds: { west, east, south, north },
    /** Position sur la plaque, en mètres, centrée ; z négatif vers le nord. */
    place: (lon: number, lat: number) => ({
      x: (lon - (west + east) / 2) * squeeze * scale,
      z: -(lat - (south + north) / 2) * scale,
    }),
  };
}

/* ---------- Panneaux : des graphiques dessinés dans un canvas, qui se tracent peu à peu ---------- */

const PANEL = { width: 1024, height: 640 };
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function paintPanel(ctx: CanvasRenderingContext2D, panel: Panel, t: number) {
  const { width, height } = PANEL;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(11,13,18,0.82)';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(127,220,255,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, width - 3, height - 3);
  ctx.fillStyle = '#fff';
  ctx.font = '400 44px "Instrument Serif", serif';
  ctx.fillText(panel.title, 44, 74);

  const sans = (size: number) => `400 ${size}px "Instrument Sans Variable", sans-serif`;
  const mono = (size: number) => `400 ${size}px "Geist Mono Variable", monospace`;
  const left = 96;
  const right = width - 44;
  const top = 130;
  const bottom = height - 84;

  if (panel.kind === 'lines' || panel.kind === 'bars') {
    const values =
      panel.kind === 'lines' ? panel.series.flatMap((serie) => serie.values) : panel.values;
    const low = panel.kind === 'lines' ? Math.floor(Math.min(...values)) : 0;
    const high = Math.ceil(Math.max(...values) * 1.02);
    const y = (value: number) => bottom - ((value - low) / (high - low)) * (bottom - top);
    ctx.font = mono(22);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    for (let tick = 0; tick <= 4; tick++) {
      const value = low + ((high - low) * tick) / 4;
      ctx.fillText(value.toFixed(high - low > 20 ? 0 : 1), 28, y(value) + 7);
      ctx.beginPath();
      ctx.moveTo(left, y(value));
      ctx.lineTo(right, y(value));
      ctx.stroke();
    }
    ctx.fillText(panel.unit, left, 112);

    if (panel.kind === 'lines') {
      const x = (month: number) => left + 20 + (month * (right - left - 40)) / 11;
      MONTHS.forEach((month, index) => ctx.fillText(month, x(index) - 7, bottom + 34));
      panel.series.forEach((serie, index) => {
        // Chaque courbe se trace à son tour, de janvier à décembre.
        const drawn = clamp01(t * (panel.series.length + 1) - index) * 11;
        ctx.strokeStyle = serie.color;
        ctx.lineWidth = index === 0 ? 9 : 5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let month = 0; month <= Math.floor(drawn); month++)
          ctx.lineTo(x(month), y(serie.values[month]));
        const next = Math.floor(drawn) + 1;
        if (next <= 11) {
          const part = drawn - Math.floor(drawn);
          ctx.lineTo(
            x(next - 1 + part),
            y(serie.values[next - 1] + (serie.values[next] - serie.values[next - 1]) * part),
          );
        }
        ctx.stroke();
        ctx.fillStyle = serie.color;
        ctx.fillRect(left + index * ((right - left) / panel.series.length), height - 30, 26, 6);
        ctx.fillStyle = '#fff';
        ctx.font = sans(22);
        ctx.fillText(
          serie.name,
          left + 36 + index * ((right - left) / panel.series.length),
          height - 20,
        );
      });
    } else {
      const step = (right - left) / panel.values.length;
      panel.values.forEach((value, index) => {
        const grown = ease(clamp01(t * 2 - index / panel.values.length));
        const marked = panel.mark?.includes(index);
        ctx.fillStyle = marked ? WARM : GLOW;
        ctx.globalAlpha = marked || !panel.mark ? 1 : 0.45;
        const barTop = y(low + (value - low) * grown);
        ctx.fillRect(left + index * step + step * 0.18, barTop, step * 0.64, bottom - barTop);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = sans(panel.values.length > 6 ? 20 : 24);
        const label = panel.labels[index];
        ctx.fillText(
          label,
          left + index * step + step / 2 - ctx.measureText(label).width / 2,
          bottom + 34,
        );
        if (grown > 0.95 && (marked || panel.values.length <= 6)) {
          ctx.fillStyle = '#fff';
          const text = String(value).replace('.', ',');
          ctx.fillText(
            text,
            left + index * step + step / 2 - ctx.measureText(text).width / 2,
            barTop - 12,
          );
        }
      });
    }
  }

  if (panel.kind === 'card') {
    const pitch = Math.min(78, (height - 150) / panel.rows.length);
    panel.rows.forEach(([key, value], index) => {
      const shown = ease(clamp01(t * (panel.rows.length + 1) - index));
      ctx.globalAlpha = shown;
      const y = 150 + index * pitch + (1 - shown) * 18;
      ctx.fillStyle = GLOW;
      ctx.font = mono(26);
      ctx.fillText(key, 44, y);
      ctx.fillStyle = '#fff';
      ctx.font = sans(36);
      ctx.fillText(value, 360, y + 2, width - 400);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(44, y + 22);
      ctx.lineTo(width - 44, y + 22);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  if (panel.kind === 'matrix') {
    // Schéma : chaque case est une combinaison champ × stockage. Les cases pleines tiennent
    // l'objectif de fiabilité ; la case chaude est la moins chère d'entre elles.
    const columns = 12;
    const rows = 7;
    const cell = Math.min((right - left) / columns, (bottom - top) / rows);
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        const order = (row * columns + column) / (rows * columns);
        if (order > t * 1.4) continue;
        const admissible = column * 0.9 + (rows - 1 - row) * 1.5 >= 8.2;
        const best = column === 6 && row === 4;
        ctx.fillStyle = best ? WARM : admissible ? GLOW : 'rgba(255,255,255,0.1)';
        ctx.globalAlpha = best ? 1 : admissible ? 0.2 + 0.5 * (1 - column / columns) : 1;
        ctx.fillRect(left + column * cell + 3, top + row * cell + 3, cell - 6, cell - 6);
      }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = sans(24);
    ctx.fillText(panel.across, left, top + rows * cell + 38);
    ctx.save();
    ctx.translate(60, top + rows * cell);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(panel.down, 0, 0);
    ctx.restore();
  }
}

/** Étiquette flottante : un texte sur fond sombre, toujours face à la caméra. */
function label(text: string, warm = false) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = '400 44px "Instrument Sans Variable", sans-serif';
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width) + 48;
  canvas.height = 76;
  ctx.font = font;
  ctx.fillStyle = 'rgba(11,13,18,0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = warm ? WARM : GLOW;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, 24, 52);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, transparent: true, depthTest: false, toneMapped: false }),
  );
  sprite.scale.set((canvas.width / canvas.height) * 0.07, 0.07, 1);
  sprite.renderOrder = 5;
  return sprite;
}

/* ---------- Maquettes ---------- */

const solid = (color: number, emissive = 0) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    emissive,
    emissiveIntensity: emissive ? 0.9 : 0,
  });

/** Un module photovoltaïque incliné, posé en (x, z). */
function module(width: number, depth: number, x: number, z: number) {
  const group = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.008, depth),
    solid(0x16324f, 0x0d2a4a),
  );
  board.rotation.x = -0.35;
  board.position.y = depth * 0.24 + 0.02;
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 0.008, depth)),
    new THREE.LineBasicMaterial({ color: GLOW }),
  );
  frame.rotation.copy(board.rotation);
  frame.position.copy(board.position);
  group.add(board, frame);
  group.position.set(x, 0, z);
  return group;
}

function box(width: number, height: number, depth: number, color: number, x: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), solid(color));
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  return mesh;
}

/** Kit domestique : panneaux, batterie, onduleur. */
function buildKit() {
  const group = new THREE.Group();
  for (const x of [-0.17, 0, 0.17]) group.add(module(0.15, 0.24, x, -0.1));
  group.add(box(0.2, 0.12, 0.09, 0x2c3440, -0.14, 0.2), box(0.1, 0.14, 0.05, 0xd9d4c8, 0.14, 0.2));
  return group;
}

/** Mini-réseau : un village, son champ solaire, son stockage, son groupe et sa ligne. */
function buildVillage() {
  const group = new THREE.Group();
  for (let row = 0; row < 2; row++)
    for (let column = 0; column < 5; column++)
      group.add(module(0.085, 0.12, -0.5 + column * 0.1, -0.22 + row * 0.16));
  group.add(box(0.16, 0.07, 0.07, 0x3a6ea5, -0.3, 0.2), box(0.1, 0.06, 0.06, 0xb5532a, -0.08, 0.2));
  const roof = new THREE.MeshStandardMaterial({ color: 0x8a3b2a, roughness: 0.8 });
  const lit = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const wire: THREE.Vector3[] = [new THREE.Vector3(-0.08, 0.1, 0.2)];
  [
    [0.2, -0.2],
    [0.38, -0.05],
    [0.52, -0.22],
    [0.3, 0.14],
    [0.5, 0.1],
    [0.42, 0.26],
  ].forEach(([x, z]) => {
    const house = box(0.085, 0.055, 0.07, 0xd8cdb8, x, z);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.04, 4), roof);
    top.position.set(x, 0.075, z);
    top.rotation.y = Math.PI / 4;
    const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.02), lit);
    lamp.position.set(x, 0.03, z + 0.036);
    group.add(house, top, lamp);
    wire.push(new THREE.Vector3(x, 0.1, z));
  });
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(wire),
    new THREE.LineBasicMaterial({ color: WARM }),
  );
  group.add(line);
  return group;
}

/* ---------- La projection ---------- */

/** `instant` : sans animation de construction, pour qui a demandé moins de mouvement. */
export function createHolo(table: THREE.Vector3, anchors: Anchors, instant = false): Holo {
  const group = new THREE.Group();
  group.position.set(table.x, table.y + 0.04, table.z);
  const center = new THREE.Vector3(table.x, table.y + 0.5, table.z);
  let current: THREE.Group | null = null;
  let pending: Scene | null | undefined;
  let fade = 0;
  let progress = 0;
  let animate: ((t: number) => void)[] = [];
  let facing: THREE.Object3D[] = [];

  // Faisceau du projecteur 8 mm vers la table, et lueur de la maquette sur la pièce.
  const reach = new THREE.Vector3().subVectors(center, anchors.projector);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, reach.length(), 32, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xbfe9ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  beam.position.copy(anchors.projector).addScaledVector(reach, 0.5).sub(group.position);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), reach.clone().normalize());
  const glow = new THREE.PointLight(0x9fdcff, 0, 4, 2);
  glow.position.set(0, 0.5, 0);
  group.add(beam, glow);

  const dispose = (object: THREE.Object3D) =>
    object.traverse((node) => {
      const mesh = node as THREE.Mesh;
      mesh.geometry?.dispose();
      for (const material of [mesh.material].flat().filter(Boolean) as THREE.Material[]) {
        (material as THREE.MeshBasicMaterial).map?.dispose();
        material.dispose();
      }
    });

  /** Carte : une plaque peinte, des colonnes, des liaisons, des étiquettes. */
  const buildMap = (spec: MapSpec, root: THREE.Group, offsetZ: number) => {
    const land = lands[spec.key];
    const flat = projection(land, spec.key === 'ao' ? 1.9 : 1.4, 1.0);
    const canvas = document.createElement('canvas');
    const pixels = 1400 / flat.width;
    canvas.width = Math.ceil(flat.width * pixels) + 120;
    canvas.height = Math.ceil(flat.depth * pixels) + 120;
    const ctx = canvas.getContext('2d')!;
    const at = (lon: number, lat: number) => {
      const point = flat.place(lon, lat);
      return [canvas.width / 2 + point.x * pixels, canvas.height / 2 + point.z * pixels] as const;
    };
    const trace = (ring: number[]) => {
      ctx.beginPath();
      for (let i = 0; i < ring.length; i += 2) ctx.lineTo(...at(ring[i], ring[i + 1]));
      ctx.closePath();
    };
    const marked = land.towns.filter((town) => spec.mark?.includes(town.n));

    const paint = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineJoin = 'round';
      // Plateau sombre sous la carte : elle se lit quel que soit le meuble derrière.
      ctx.fillStyle = 'rgba(6,8,12,0.82)';
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, canvas.height, 36);
      ctx.fill();
      for (const ring of land.rings) {
        trace(ring);
        ctx.fillStyle = '#1b5163';
        ctx.fill();
      }
      if (spec.theme) {
        // Les territoires se colorent du nord au sud, comme une encre qui descend.
        const { north, south } = flat.bounds;
        land.areas.forEach((area) => {
          if ((north - area.r[0][1]) / (north - south) > t * 1.3) return;
          ctx.fillStyle =
            spec.theme === 'ghi'
              ? ghiColor(area.g)
              : spec.theme === 'confiance'
                ? TRUST_COLORS[area.c]
                : GAP_COLORS[area.e < 2 ? 0 : area.e < 4 ? 1 : 2];
          for (const ring of area.r) {
            trace(ring);
            ctx.fill();
            ctx.strokeStyle = 'rgba(11,13,18,0.55)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
      }
      if (spec.grid) {
        // Mailles d'un degré ; celles qui portent une localité marquée s'allument.
        const { west, east, south, north } = flat.bounds;
        ctx.lineWidth = 2;
        for (let lon = Math.floor(west); lon <= east; lon++)
          for (let lat = Math.floor(south); lat <= north; lat++) {
            // Le produit CERES est maillé sur des degrés entiers, centrés sur les demi-degrés.
            const [x0, y0] = at(lon, lat + 1);
            const [x1, y1] = at(lon + 1, lat);
            const hit = marked.some(
              (town) => Math.floor(town.x) === lon && Math.floor(town.y) === lat,
            );
            ctx.strokeStyle = `rgba(127,220,255,${0.35 * t})`;
            ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            if (hit) {
              ctx.fillStyle = `rgba(255,194,102,${0.45 * t})`;
              ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
            }
          }
      }
      for (const ring of land.rings) {
        trace(ring);
        ctx.strokeStyle = GLOW;
        ctx.lineWidth = spec.key === 'ao' ? 2 : 4;
        ctx.stroke();
      }
      texture.needsUpdate = true;
    };
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(canvas.width / pixels, canvas.height / pixels),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    plate.rotation.x = -Math.PI / 2;
    const map = new THREE.Group();
    map.position.set(0, 0.26, offsetZ);
    map.add(plate);
    root.add(map);
    animate.push(paint);

    // Colonnes : une par localité.
    const towns = land.towns.filter(
      (town) => spec.columns || spec.mark?.includes(town.n) || spec.labels?.[town.n],
    );
    if (towns.length) {
      const values = land.towns.map((town) => town.v ?? 0);
      const low = Math.min(...values);
      const span = Math.max(...values) - low || 1;
      const columns = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(1, 1, 1, 10).translate(0, 0.5, 0),
        new THREE.MeshBasicMaterial({ toneMapped: false }),
        towns.length,
      );
      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();
      const order = [...towns].sort((a, b) => b.y - a.y);
      const height = (town: Town) =>
        town.v === undefined ? 0.1 : 0.08 + ((town.v - low) / span) * 0.4;
      animate.push((t) => {
        order.forEach((town, index) => {
          const point = flat.place(town.x, town.y);
          const strong = spec.mark?.includes(town.n);
          const grown = ease(clamp01(t * 2.2 - (index / order.length) * 1.2));
          const radius = strong ? 0.018 : spec.key === 'ci' ? 0.007 : 0.011;
          matrix
            .makeScale(radius, Math.max(0.001, height(town) * grown), radius)
            .setPosition(point.x, 0, point.z);
          columns.setMatrixAt(index, matrix);
          columns.setColorAt(
            index,
            color.set(
              strong
                ? WARM
                : spec.mark
                  ? '#3d6f85'
                  : town.v === undefined
                    ? GLOW
                    : ghiColor(town.v),
            ),
          );
        });
        columns.instanceMatrix.needsUpdate = true;
        if (columns.instanceColor) columns.instanceColor.needsUpdate = true;
      });
      map.add(columns);
      for (const town of towns) {
        const text = spec.labels?.[town.n];
        if (!text) continue;
        const sprite = label(text, spec.mark?.includes(town.n));
        const point = flat.place(town.x, town.y);
        sprite.position.set(point.x, height(town) + 0.07, point.z);
        map.add(sprite);
      }
    }

    // Liaisons : un arc tendu entre deux localités, qui se tire d'un bout à l'autre.
    for (const [from, to] of spec.arcs ?? []) {
      const a = land.towns.find((town) => town.n === from);
      const b = land.towns.find((town) => town.n === to);
      if (!a || !b) continue;
      const start = flat.place(a.x, a.y);
      const end = flat.place(b.x, b.y);
      const span = Math.hypot(end.x - start.x, end.z - start.z);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(start.x, 0.1, start.z),
        new THREE.Vector3((start.x + end.x) / 2, 0.1 + span * 0.35, (start.z + end.z) / 2),
        new THREE.Vector3(end.x, 0.1, end.z),
      );
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 48, 0.006, 8),
        new THREE.MeshBasicMaterial({ color: WARM, toneMapped: false }),
      );
      const count = tube.geometry.index!.count;
      animate.push((t) =>
        tube.geometry.setDrawRange(0, Math.floor(count * ease(clamp01(t * 1.6 - 0.3)))),
      );
      map.add(tube);
    }
  };

  const build = (scene: Scene) => {
    const root = new THREE.Group();
    const hasMap = Boolean(scene.map);
    const panels = scene.panels ?? [];
    if (scene.map) buildMap(scene.map, root, panels.length ? 0.12 : 0);

    panels.forEach((panel, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = PANEL.width;
      canvas.height = PANEL.height;
      const ctx = canvas.getContext('2d')!;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      const size = hasMap || scene.model ? 1.05 : panels.length > 1 ? 1.15 : 1.5;
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size * (PANEL.height / PANEL.width)),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
      );
      const shift = panels.length > 1 ? (index - 0.5) * (size + 0.08) : 0;
      board.position.set(
        shift,
        hasMap || scene.model ? 1.05 : 0.62,
        hasMap || scene.model ? -0.42 : 0,
      );
      root.add(board);
      facing.push(board);
      // Le second panneau commence à se tracer quand le premier est à mi-course.
      animate.push((t) => {
        paintPanel(ctx, panel, ease(clamp01(t * 1.5 - index * 0.5)));
        texture.needsUpdate = true;
      });
    });

    if (scene.model) {
      // La maquette flotte à la hauteur des cartes, sur un plateau sombre.
      const model = scene.model === 'kit' ? buildKit() : buildVillage();
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(
          scene.model === 'kit' ? 0.42 : 0.78,
          scene.model === 'kit' ? 0.42 : 0.78,
          0.012,
          48,
        ),
        new THREE.MeshBasicMaterial({ color: 0x06080c, transparent: true, opacity: 0.82 }),
      );
      plate.position.y = -0.008;
      model.add(plate);
      model.position.y = 0.3;
      const scale = scene.model === 'kit' ? 1.5 : 1.25;
      animate.push((t) => model.scale.setScalar(Math.max(0.001, scale * ease(clamp01(t * 1.6)))));
      root.add(model);
    }

    for (const tag of scene.tags ?? []) {
      const sprite = label(tag.text, true);
      sprite.scale.multiplyScalar(1.5);
      sprite.position.copy(anchors[tag.at]).sub(group.position);
      root.add(sprite);
    }
    return root;
  };

  let level = 0;
  return {
    group,
    center,
    show(scene) {
      pending = scene;
    },
    get level() {
      return level;
    },
    update(delta, camera) {
      // L'ancienne scène s'efface, puis la nouvelle se construit.
      if (pending !== undefined) {
        fade = instant ? 0 : Math.max(0, fade - delta * 4);
        if (fade === 0 || !current) {
          if (current) {
            group.remove(current);
            dispose(current);
          }
          animate = [];
          facing = [];
          current = pending ? build(pending) : null;
          if (current) group.add(current);
          pending = undefined;
          progress = 0;
        }
      } else if (current) {
        fade = instant ? 1 : Math.min(1, fade + delta * 3);
        // Une fois la scène construite, plus rien n'est redessiné.
        if (progress < 1) {
          progress = instant ? 1 : Math.min(1, progress + delta / 2.6);
          for (const step of animate) step(progress);
        }
      }
      level += ((current && pending !== null ? 1 : 0) - level) * Math.min(1, delta * 3);
      if (current) {
        current.scale.setScalar(0.94 + 0.06 * fade);
        current.visible = fade > 0.01;
        current.traverse((node) => {
          const material = (node as THREE.Mesh).material as THREE.Material | undefined;
          if (material && 'opacity' in material && material.transparent) material.opacity = fade;
        });
      }
      (beam.material as THREE.MeshBasicMaterial).opacity = 0.05 * level;
      glow.intensity = 2.2 * level;
      for (const board of facing) {
        board.rotation.y = Math.atan2(
          camera.position.x - group.position.x - board.position.x,
          camera.position.z - group.position.z - board.position.z,
        );
      }
    },
    dispose() {
      dispose(group);
    },
  };
}

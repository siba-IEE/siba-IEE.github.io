/**
 * Pile de volumes reliés en 3D, d'après le site de Stripe Press : chaque entrée est un livre
 * posé à plat, dos vers le lecteur. Le volume en cours s'avance, s'incline et montre sa
 * couverture ; les autres s'écartent.
 */
import * as THREE from 'three';

export interface Volume {
  title: string;
  /** Petite mention au bout du dos (année, type…). */
  mention: string;
  /** Couleur de la toile de reliure. */
  color: string;
}

/* Dimensions d'un volume couché : longueur du dos, épaisseur, largeur de la couverture. */
const LENGTH = 6.4;
const THICKNESS = 0.78;
const WIDTH = 4.3;
const GAP = 0.1;

const SERIF = '"Instrument Serif", Georgia, serif';
const MONO = '"Geist Mono Variable", ui-monospace, monospace';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (t: number) => t * t * (3 - 2 * t);

/** Encre du titre : dorée sur une toile sombre, noire sur une toile claire. */
const foilFor = (color: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 170 ? '#1a1412' : '#f1e6cf';
};

/** Grain de toile : un semis de points clairs et sombres par-dessus l'aplat. */
function weave(context: CanvasRenderingContext2D, width: number, height: number) {
  for (let i = 0; i < (width * height) / 26; i += 1) {
    context.fillStyle = i % 2 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.07)';
    context.fillRect(Math.random() * width, Math.random() * height, 1.4, 1.4);
  }
}

function toTexture(canvas: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

/** Dos : le titre au fer à dorer, deux filets, la mention en petit. Un titre long est réduit, puis coupé. */
function spine(volume: Volume) {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 250;
  const context = canvas.getContext('2d')!;
  context.fillStyle = volume.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  weave(context, canvas.width, canvas.height);
  context.fillStyle = foilFor(volume.color);
  context.fillRect(70, 34, 3, 182);
  context.fillRect(canvas.width - 73, 34, 3, 182);
  context.textBaseline = 'middle';
  context.font = `400 34px ${MONO}`;
  const mention = volume.mention.toUpperCase();
  const room = canvas.width - 300 - context.measureText(mention).width;
  context.textAlign = 'right';
  context.fillText(mention, canvas.width - 120, 128);

  let size = 128;
  let title = volume.title;
  context.font = `400 ${size}px ${SERIF}`;
  while (size > 64 && context.measureText(title).width > room) {
    size -= 8;
    context.font = `400 ${size}px ${SERIF}`;
  }
  while (title.length > 8 && context.measureText(`${title}…`).width > room)
    title = title.slice(0, -1);
  if (title !== volume.title) title = `${title.trimEnd()}…`;
  context.textAlign = 'left';
  context.fillText(title, 120, 132);
  return toTexture(canvas);
}

/** Plat de couverture : le titre sur plusieurs lignes, dans un cadre. */
function cover(volume: Volume) {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 1032;
  const context = canvas.getContext('2d')!;
  context.fillStyle = volume.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  weave(context, canvas.width, canvas.height);
  context.strokeStyle = foilFor(volume.color);
  context.lineWidth = 3;
  context.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);
  context.fillStyle = foilFor(volume.color);
  context.textBaseline = 'alphabetic';

  // Retour à la ligne mot par mot ; le corps diminue jusqu'à ce que le titre tienne en cinq lignes.
  const wrap = (size: number) => {
    context.font = `400 ${size}px ${SERIF}`;
    const lines: string[] = [];
    for (const word of volume.title.split(' ')) {
      const last = lines[lines.length - 1];
      if (last && context.measureText(`${last} ${word}`).width < canvas.width - 260)
        lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    return lines;
  };
  let size = 190;
  let lines = wrap(size);
  while (size > 70 && lines.length * size * 0.95 > 700) {
    size -= 12;
    lines = wrap(size);
  }
  lines.forEach((line, index) => context.fillText(line, 130, 130 + size + index * size * 0.95));
  context.font = `400 40px ${MONO}`;
  context.fillText(volume.mention.toUpperCase(), 130, canvas.height - 130);
  return toTexture(canvas);
}

/** Tranche : le papier, strié de fines lignes. */
function pages() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#efe8d8';
  context.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 3) {
    context.fillStyle = `rgba(90, 70, 40, ${0.08 + Math.random() * 0.14})`;
    context.fillRect(0, y, 64, 1);
  }
  return toTexture(canvas);
}

export interface Stack {
  group: THREE.Group;
  /** `progress` : volume en cours (0 à n − 1). `arrival` : chute des volumes à l'entrée (0 à 1). */
  update: (progress: number, arrival: number) => void;
  dispose: () => void;
}

export function createStack(volumes: Volume[]): Stack {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(LENGTH, THICKNESS, WIDTH);
  const edge = new THREE.MeshStandardMaterial({ map: pages(), roughness: 0.95 });
  const cloth = { roughness: 0.82, metalness: 0.02 };

  const books = volumes.map((volume, index) => {
    // Ordre des faces d'une boîte : droite, gauche, dessus, dessous, devant, derrière.
    const book = new THREE.Mesh(geometry, [
      edge,
      edge,
      new THREE.MeshStandardMaterial({ map: cover(volume), ...cloth }),
      new THREE.MeshStandardMaterial({ color: volume.color, ...cloth }),
      new THREE.MeshStandardMaterial({ map: spine(volume), ...cloth }),
      edge,
    ]);
    // Une pile faite à la main n'est jamais d'équerre.
    book.userData.skew = Math.sin(index * 12.9898) * 0.035;
    book.userData.shift = Math.sin(index * 78.233) * 0.16;
    group.add(book);
    return book;
  });

  return {
    group,
    update: (progress, arrival) => {
      books.forEach((book, index) => {
        const offset = index - progress;
        // 1 pour le volume en cours, 0 pour ses voisins.
        const focus = ease(clamp01(1 - Math.abs(offset)));
        const spread = Math.sign(offset) * ease(clamp01(Math.abs(offset))) * 0.6;
        const drop = (1 - ease(clamp01(arrival * 1.8 - index * 0.1))) * 14;
        book.position.set(
          book.userData.shift * (1 - focus),
          -(offset * (THICKNESS + GAP) + spread) + drop,
          focus * 0.9,
        );
        book.rotation.set(focus * 0.3, book.userData.skew * (1 - focus), 0);
      });
    },
    dispose: () => {
      books.forEach((book) =>
        (book.material as THREE.MeshStandardMaterial[]).forEach((material) => {
          material.map?.dispose();
          material.dispose();
        }),
      );
      geometry.dispose();
    },
  };
}

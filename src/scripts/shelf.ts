/**
 * Pile de volumes reliés en 3D (three.js), d'après le site de Stripe Press : chaque entrée
 * est un livre posé à plat, dos vers le lecteur. Le défilement parcourt la pile ; le volume
 * en cours s'avance, s'incline et montre sa couverture, les autres s'écartent.
 *
 * Ce module ne connaît que des titres, des mentions et des couleurs : il sert aussi bien
 * aux services qu'aux projets ou aux publications.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface Volume {
  title: string;
  /** Petite mention au bout du dos (catégorie, année…). */
  mention: string;
  /** Couleur de la toile de reliure. */
  color: string;
}

export interface Shelf {
  /** Position dans la pile : 0 pour le premier volume, n − 1 pour le dernier. */
  setProgress: (progress: number) => void;
  destroy: () => void;
}

/* Dimensions d'un volume couché : longueur du dos, épaisseur, largeur de la couverture. */
const LENGTH = 6.4;
const THICKNESS = 0.78;
const WIDTH = 4.3;
const GAP = 0.1;

const SERIF = '"Instrument Serif", Georgia, serif';
const MONO = '"Geist Mono Variable", ui-monospace, monospace';
/** Encre du titre : dorée sur une toile sombre, noire sur une toile claire. */
const foilFor = (color: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 170 ? '#1a1412' : '#f1e6cf';
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (t: number) => t * t * (3 - 2 * t);

/** Grain de toile : un semis de points clairs et sombres par-dessus l'aplat. */
function weave(context: CanvasRenderingContext2D, width: number, height: number) {
  for (let i = 0; i < (width * height) / 26; i += 1) {
    context.fillStyle = i % 2 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.07)';
    context.fillRect(Math.random() * width, Math.random() * height, 1.4, 1.4);
  }
}

function texture(canvas: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

/** Dos : le titre au fer à dorer, deux filets, la mention en petit. */
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
  context.font = `400 128px ${SERIF}`;
  context.fillText(volume.title, 120, 132);
  context.font = `400 34px ${MONO}`;
  context.textAlign = 'right';
  context.fillText(volume.mention.toUpperCase(), canvas.width - 120, 128);
  return texture(canvas);
}

/** Plat de couverture : le titre en grand, sur plusieurs lignes, et un cadre. */
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
  context.font = `400 190px ${SERIF}`;
  context.textBaseline = 'alphabetic';
  // Retour à la ligne mot par mot, dans la largeur du cadre.
  const lines: string[] = [];
  for (const word of volume.title.split(' ')) {
    const last = lines[lines.length - 1];
    if (last && context.measureText(`${last} ${word}`).width < canvas.width - 260)
      lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  lines.forEach((line, index) => context.fillText(line, 130, 290 + index * 180));
  context.font = `400 40px ${MONO}`;
  context.fillText(volume.mention.toUpperCase(), 130, canvas.height - 130);
  return texture(canvas);
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
  return texture(canvas);
}

/**
 * Monte la pile dans le canvas donné. Renvoie null si WebGL n'est pas disponible :
 * la page garde alors sa liste en texte.
 */
export function mountShelf(canvas: HTMLCanvasElement, volumes: Volume[]): Shelf | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.55;
  const key = new THREE.DirectionalLight(0xfff1dd, 2.4);
  key.position.set(-4, 7, 9);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const stack = new THREE.Group();
  scene.add(stack);

  const geometry = new THREE.BoxGeometry(LENGTH, THICKNESS, WIDTH);
  const edge = new THREE.MeshStandardMaterial({ map: pages(), roughness: 0.95 });
  const books = volumes.map((volume, index) => {
    const cloth = { roughness: 0.82, metalness: 0.02 };
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
    stack.add(book);
    return book;
  });

  let target = 0;
  let progress = 0;
  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;
  let visible = true;
  const started = performance.now();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const resize = () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    // La caméra recule jusqu'à ce que la longueur d'un volume tienne dans l'écran.
    const fit = (LENGTH * 1.25) / (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    const wide = camera.aspect > 1;
    camera.position.set(0, 2.4, Math.max(19, fit));
    camera.lookAt(0, 0.1, 0);
    // La fiche du volume occupe la gauche sur un écran large, le bas sur un écran étroit :
    // la pile se range de l'autre côté.
    stack.position.set(wide ? 2.7 : 0, wide ? 0.2 : 2.3, 0);
    camera.updateProjectionMatrix();
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    if (!visible) return;
    progress += (target - progress) * (reduced ? 1 : 0.085);
    const intro = reduced ? 1 : clamp01((now - started) / 1400);

    books.forEach((book, index) => {
      const offset = index - progress;
      // 1 pour le volume en cours, 0 pour ses voisins : il s'avance, s'incline et fait de la place.
      const focus = ease(clamp01(1 - Math.abs(offset)));
      const spread = Math.sign(offset) * ease(clamp01(Math.abs(offset))) * 0.6;
      const drop = (1 - ease(clamp01(intro * 1.6 - index * 0.09))) * 9;
      book.position.set(
        book.userData.shift * (1 - focus),
        -(offset * (THICKNESS + GAP) + spread) + drop,
        focus * 0.9,
      );
      book.rotation.set(focus * 0.3, book.userData.skew * (1 - focus), 0);
    });

    stack.rotation.y += (pointerX * 0.16 - stack.rotation.y) * 0.06;
    stack.rotation.x += (pointerY * 0.05 - stack.rotation.x) * 0.06;
    renderer.render(scene, camera);
  };

  const onPointer = (event: PointerEvent) => {
    pointerX = event.clientX / window.innerWidth - 0.5;
    pointerY = event.clientY / window.innerHeight - 0.5;
  };
  const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
  observer.observe(canvas);
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('resize', resize);
  resize();
  frame = requestAnimationFrame(tick);

  return {
    setProgress: (value) => {
      target = Math.min(volumes.length - 1, Math.max(0, value));
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', resize);
      books.forEach((book) =>
        (book.material as THREE.MeshStandardMaterial[]).forEach((material) => {
          material.map?.dispose();
          material.dispose();
        }),
      );
      geometry.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

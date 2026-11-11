/**
 * Maquette 3D de la page Travaux (three.js) : un plateau, une scène par étape, et un
 * personnage qui marche de l'une à l'autre. La caméra le suit ; on peut la faire tourner
 * en glissant. Les textes des étapes sont dans la page, pas ici : ce module ne reçoit que
 * les étiquettes à poser dans la scène.
 */
import * as THREE from 'three';

/** Distance entre deux étapes, le long du plateau. */
const SPACING = 7;
const WALK_SPEED = 5;

const WHITE = 0xf6f6f6;
const INK = 0x151515;
const GREY = 0xcfcfcf;
const ORANGE = 0xff5500;
const YELLOW = 0xffe600;

export interface DioramaLabels {
  raw: string;
  onsite: string;
  nearest: string;
  trend: string;
  localities: string;
  sameValue: string;
}

export interface Diorama {
  goTo: (step: number) => void;
  destroy: () => void;
}

/* ---------- Petites briques ---------- */

const material = (color: number, options: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...options });

function mesh(
  geometry: THREE.BufferGeometry,
  color: number,
  options?: THREE.MeshStandardMaterialParameters,
) {
  const object = new THREE.Mesh(geometry, material(color, options));
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

const box = (
  w: number,
  h: number,
  d: number,
  color: number,
  options?: THREE.MeshStandardMaterialParameters,
) => mesh(new THREE.BoxGeometry(w, h, d), color, options);
const cylinder = (r: number, h: number, color: number, segments = 16) =>
  mesh(new THREE.CylinderGeometry(r, r, h, segments), color);

function at<T extends THREE.Object3D>(object: T, x: number, y: number, z: number): T {
  object.position.set(x, y, z);
  return object;
}

/** Étiquette de texte toujours tournée vers la caméra. */
function label(text: string, width = 2.6): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  context.font = '500 64px "Geist Variable", Helvetica, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#151515';
  context.fillText(text, 320, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  sprite.scale.set(width, width / 5, 1);
  return sprite;
}

/** Station de mesure : mât, traverse, pyranomètre sous dôme, petit panneau d'alimentation. */
function station(scale = 1): THREE.Group {
  const group = new THREE.Group();
  group.add(at(box(0.9, 0.12, 0.9, GREY), 0, 0.06, 0));
  group.add(at(cylinder(0.06, 2.2, WHITE), 0, 1.2, 0));
  group.add(at(box(1.3, 0.07, 0.07, WHITE), 0, 2.1, 0));
  group.add(at(cylinder(0.16, 0.1, INK), -0.55, 2.2, 0));
  const dome = mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), WHITE, {
    transparent: true,
    opacity: 0.75,
  });
  group.add(at(dome, -0.55, 2.25, 0));
  const panel = at(box(0.6, 0.04, 0.4, INK), 0.45, 1.5, 0);
  panel.rotation.x = -0.5;
  group.add(panel);
  group.scale.setScalar(scale);
  return group;
}

/** Colonne d'un petit histogramme, avec sa valeur au-dessus. */
function column(height: number, color: number, text: string): THREE.Group {
  const group = new THREE.Group();
  group.add(at(box(0.7, height, 0.7, color), 0, height / 2, 0));
  group.add(at(label(text, 2), 0, height + 0.45, 0));
  return group;
}

function house(name: string): THREE.Group {
  const group = new THREE.Group();
  group.add(at(box(0.7, 0.5, 0.6, WHITE), 0, 0.25, 0));
  const roof = at(mesh(new THREE.ConeGeometry(0.62, 0.4, 4), ORANGE), 0, 0.7, 0);
  roof.rotation.y = Math.PI / 4;
  group.add(roof);
  group.add(at(label(name, 2), 0, 1.35, 0));
  return group;
}

/* ---------- Les scènes, une par étape ---------- */

function buildScenes(labels: DioramaLabels): THREE.Group[] {
  // 1. Mesure au sol : une station sous le soleil.
  const ground = new THREE.Group();
  ground.add(station());
  ground.add(
    at(
      mesh(new THREE.SphereGeometry(0.7, 24, 16), YELLOW, {
        emissive: YELLOW,
        emissiveIntensity: 0.6,
      }),
      -2.2,
      4,
      -1,
    ),
  );

  // 2. Le satellite : son faisceau, et des mailles de plus en plus biaisées vers le sud (vers nous).
  const satellite = new THREE.Group();
  const craft = new THREE.Group();
  craft.add(box(0.7, 0.5, 0.5, WHITE));
  craft.add(at(box(1.1, 0.04, 0.45, INK), -1, 0, 0));
  craft.add(at(box(1.1, 0.04, 0.45, INK), 1, 0, 0));
  craft.rotation.z = 0.25;
  satellite.add(at(craft, 0.6, 5.2, 0));
  const beam = mesh(new THREE.ConeGeometry(2.2, 5.1, 32, 1, true), ORANGE, {
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  beam.castShadow = false;
  satellite.add(at(beam, 0.6, 2.6, 0));
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const tint = new THREE.Color(WHITE).lerp(new THREE.Color(ORANGE), 0.15 + row * 0.3);
      satellite.add(
        at(box(1.1, 0.1, 1.1, tint.getHex()), (col - 1) * 1.2 + 0.6, 0.05, (row - 1) * 1.2 - 0.4),
      );
    }
  }

  // 3. Calage sur site : la station, et l'erreur avant et après.
  const onSite = new THREE.Group();
  onSite.add(at(station(0.8), -1.6, 0, 0));
  onSite.add(at(column(3.3, ORANGE, labels.raw), 0.3, 0, 0));
  onSite.add(at(column(0.55, INK, labels.onsite), 1.6, 0, 0));

  // 4. Transfert : trois stations donneuses, un site sans mesure, et l'erreur selon la méthode.
  const transfer = new THREE.Group();
  const site = new THREE.Vector3(0, 0, 0.6);
  transfer.add(at(cylinder(0.04, 1.6, INK), site.x, 0.8, site.z));
  transfer.add(at(box(0.6, 0.35, 0.03, ORANGE), site.x + 0.32, 1.42, site.z));
  [
    [-2.6, -1.2],
    [-0.4, -2.4],
    [1.8, -1.6],
  ].forEach(([x, z]) => {
    transfer.add(at(station(0.6), x, 0, z));
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, 1.3, z),
      new THREE.Vector3((x + site.x) / 2, 2.8, (z + site.z) / 2),
      new THREE.Vector3(site.x, 1.6, site.z),
    );
    transfer.add(mesh(new THREE.TubeGeometry(curve, 24, 0.03, 8), ORANGE));
  });
  transfer.add(at(column(1.45, GREY, labels.nearest), 2.4, 0, 0.9));
  transfer.add(at(column(0.9, INK, labels.trend), 3.5, 0, 0.9));

  // 5. Application : une centrale dimensionnée sur la donnée corrigée.
  const plant = new THREE.Group();
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const panel = at(box(0.95, 0.05, 0.6, INK), (col - 1.5) * 1.1, 0.45, (row - 1) * 1.05 - 0.6);
      panel.rotation.x = 0.45;
      plant.add(panel);
      plant.add(at(cylinder(0.03, 0.4, WHITE), (col - 1.5) * 1.1, 0.2, (row - 1) * 1.05 - 0.6));
    }
  }
  plant.add(at(box(0.9, 0.8, 0.7, WHITE), 3, 0.4, -0.4));
  plant.add(at(label(labels.localities, 3.2), 0, 2.2, -0.6));

  // 6. Dégénérescence de pixel : deux villes sur une seule grande maille.
  const coarse = new THREE.Group();
  coarse.add(at(box(4, 0.25, 3.2, YELLOW), 0, 0.125, -0.5));
  coarse.add(at(house('Kindia'), -1.1, 0.25, -0.2));
  coarse.add(at(house('Mamou'), 1.1, 0.25, -0.9));
  coarse.add(at(label(labels.sameValue, 3), 0, 2.6, -0.5));

  // 7. La même zone vue par une grille fine : les deux villes sont séparées.
  const fine = new THREE.Group();
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const shade = new THREE.Color(YELLOW).lerp(
        new THREE.Color(ORANGE),
        ((row * 3 + col * 5) % 7) / 9,
      );
      const height = 0.15 + (((row * 7 + col * 3) % 5) / 5) * 0.35;
      fine.add(
        at(
          box(0.76, height, 0.76, shade.getHex()),
          (col - 2) * 0.8,
          height / 2,
          (row - 1.5) * 0.8 - 0.5,
        ),
      );
    }
  }
  fine.add(at(house('Kindia'), -0.8, 0.5, -0.1));
  fine.add(at(house('Mamou'), 0.8, 0.5, -0.9));

  return [ground, satellite, onSite, transfer, plant, coarse, fine];
}

/** Le personnage : gilet orange, casque jaune. Les membres pivotent à l'épaule et à la hanche. */
function buildWalker() {
  const group = new THREE.Group();
  const limb = (x: number, y: number, length: number, color: number) => {
    const pivot = at(new THREE.Group(), x, y, 0);
    pivot.add(at(cylinder(0.075, length, color, 10), 0, -length / 2, 0));
    group.add(pivot);
    return pivot;
  };
  const legs = [limb(-0.12, 0.6, 0.6, INK), limb(0.12, 0.6, 0.6, INK)];
  const arms = [limb(-0.3, 1.2, 0.5, WHITE), limb(0.3, 1.2, 0.5, WHITE)];
  group.add(at(mesh(new THREE.CapsuleGeometry(0.2, 0.4, 4, 12), ORANGE), 0, 0.95, 0));
  group.add(at(mesh(new THREE.SphereGeometry(0.17, 16, 12), WHITE), 0, 1.5, 0));
  const helmet = mesh(
    new THREE.SphereGeometry(0.19, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    YELLOW,
  );
  group.add(at(helmet, 0, 1.53, 0));
  return { group, legs, arms };
}

/**
 * Monte la maquette dans le canvas donné. Renvoie null si WebGL n'est pas disponible.
 * `onArrive` est appelé quand le personnage atteint une étape.
 */
export function mountDiorama(
  canvas: HTMLCanvasElement,
  labels: DioramaLabels,
  onArrive: (step: number) => void,
): Diorama | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbdbdbd, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  const scenes = buildScenes(labels);
  const last = scenes.length - 1;

  // Le plateau, le chemin, et une pastille par étape.
  const length = last * SPACING + 12;
  scene.add(at(box(length, 0.5, 10, WHITE), (last * SPACING) / 2, -0.25, 0));
  const path = at(box(length - 4, 0.02, 0.5, GREY), (last * SPACING) / 2, 0.01, 2.6);
  path.castShadow = false;
  scene.add(path);
  const marks = scenes.map((group, index) => {
    scene.add(at(group, index * SPACING, 0, -1));
    const mark = at(cylinder(0.42, 0.04, GREY, 32), index * SPACING, 0.02, 2.6);
    mark.castShadow = false;
    scene.add(mark);
    return mark;
  });

  const walker = buildWalker();
  walker.group.position.set(0, 0, 2.6);
  scene.add(walker.group);

  /* ---------- État ---------- */

  let target = 0;
  let arrived = -1;
  let azimuth = 0.45;
  let dragging = false;
  let lastX = 0;
  let frame = 0;
  let visible = true;
  let previous = performance.now();
  let time = 0;
  const focus = new THREE.Vector3(0, 1.3, 0);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / Math.max(1, clientHeight);
    camera.updateProjectionMatrix();
  };

  const tick = () => {
    frame = requestAnimationFrame(tick);
    if (!visible) return;
    const now = performance.now();
    const delta = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    time += delta;
    const { group, legs, arms } = walker;

    // Marche vers l'étape visée.
    const goal = target * SPACING;
    const gap = goal - group.position.x;
    const walking = Math.abs(gap) > 0.02;
    if (walking) {
      const step = reduced
        ? gap
        : Math.sign(gap) *
          Math.min(Math.abs(gap), WALK_SPEED * (1 + Math.abs(gap) / SPACING) * delta);
      group.position.x += step;
      group.rotation.y = (Math.sign(gap) * Math.PI) / 2;
      const swing = Math.sin(time * 11) * 0.7;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      arms[0].rotation.x = -swing * 0.7;
      arms[1].rotation.x = swing * 0.7;
      arms[1].rotation.z = 0;
      group.position.y = Math.abs(Math.sin(time * 11)) * 0.05;
      arrived = -1;
    } else {
      // Arrivé : il se tourne vers nous et montre la scène du bras.
      group.rotation.y += (0.35 - group.rotation.y) * 0.15;
      legs.forEach((leg) => (leg.rotation.x *= 0.8));
      arms[0].rotation.x *= 0.8;
      arms[1].rotation.x += (-2.4 - arms[1].rotation.x) * 0.12;
      arms[1].rotation.z = Math.sin(time * 3) * 0.08;
      group.position.y = 0;
      if (arrived !== target) {
        arrived = target;
        marks.forEach((mark, index) =>
          (mark.material as THREE.MeshStandardMaterial).color.set(index === target ? ORANGE : GREY),
        );
        onArrive(target);
      }
    }

    // La caméra suit le personnage ; elle recule sur un écran étroit.
    focus.lerp(
      new THREE.Vector3(group.position.x + (camera.aspect < 1 ? 0 : 1.4), 1.7, -0.4),
      reduced ? 1 : 0.08,
    );
    const radius = camera.aspect < 1 ? 27 : 17;
    camera.position.set(
      focus.x + Math.sin(azimuth) * radius * 0.86,
      focus.y + radius * 0.5,
      focus.z + Math.cos(azimuth) * radius * 0.86,
    );
    camera.lookAt(focus);
    sun.position.set(focus.x + 6, 14, focus.z + 9);
    sun.target.position.copy(focus);

    renderer.render(scene, camera);
  };

  /* ---------- Interactions ---------- */

  const onDown = (event: PointerEvent) => {
    dragging = true;
    lastX = event.clientX;
  };
  const onMove = (event: PointerEvent) => {
    if (!dragging) return;
    azimuth = Math.max(-0.9, Math.min(1.3, azimuth - (event.clientX - lastX) * 0.006));
    lastX = event.clientX;
  };
  const onUp = () => (dragging = false);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('resize', resize);

  // Hors de l'écran, la maquette ne calcule plus rien.
  const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
  observer.observe(canvas);

  resize();
  tick();

  return {
    goTo: (step) => {
      target = Math.max(0, Math.min(last, step));
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', resize);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      renderer.dispose();
    },
  };
}

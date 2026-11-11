/**
 * Scène de la page d'accueil (three.js) : un seul décor, un personnage, trois actes pilotés
 * par le défilement.
 *
 *   1. Il marche vers le lecteur pendant que son parcours défile à côté.
 *   2. Il s'assoit devant un projecteur ; l'écran (du HTML, posé derrière le canvas) montre
 *      ses réalisations comme des chaînes.
 *   3. Il se relève en hologramme à côté d'une pile de volumes : la recherche.
 *
 * Le personnage est un avatar Avaturn (squelette à la convention Mixamo). Son animation
 * d'attente vient du fichier ; la marche et la pose assise sont calculées ici, os par os,
 * par-dessus cette animation.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createStack, type Volume } from './stack';

/* ---------- Découpage du défilement ---------- */

/**
 * Jalons du défilement, en hauteurs d'écran. Partagé avec la page, qui en déduit la
 * hauteur de la piste et le texte à afficher.
 */
export function timeline(milestones: number, volumes: number) {
  const STEP = 0.7;
  const BOOK = 0.6;
  const walk = 1;
  const seat = walk + milestones * STEP;
  const screen = seat + 1;
  const rise = screen + 1.2;
  const books = rise + 1;
  const end = books + (volumes - 1) * BOOK;
  return { STEP, BOOK, walk, seat, screen, rise, books, end };
}

export interface Stage {
  /** Position de défilement, en hauteurs d'écran depuis le haut de la scène. */
  setProgress: (progress: number) => void;
  destroy: () => void;
}

/* ---------- Outils ---------- */

const BACKGROUND = 0x070b16;
const CYAN = 0x4fd8ff;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Sol : une grille fine qui s'efface au loin, et qui défile sous les pas. */
function buildFloor() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.strokeStyle = 'rgba(79, 216, 255, 0.55)';
  context.lineWidth = 2;
  context.strokeRect(0, 0, 256, 256);
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(60, 60);
  map.anisotropy = 8;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0.5, depthWrite: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  return { floor, map };
}

/** Ombre de contact : un disque sombre et flou sous le personnage. */
function buildShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  return shadow;
}

/** Tabouret, projecteur sur son pied, et faisceau. */
function buildCinema() {
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.55, metalness: 0.3 });
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.47, 40), dark);
  seat.position.set(0, 0.235, -0.38);
  group.add(seat);

  const projector = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.42), dark);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 0.1, 24),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbfeaff, emissiveIntensity: 2 }),
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.24;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.05, 12), dark);
  stand.position.y = -0.6;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 32), dark);
  foot.position.y = -1.12;
  projector.add(body, lens, stand, foot);
  projector.position.set(0.7, 1.13, 0.2);
  group.add(projector);

  // Faisceau : un cône de lumière additive, de l'objectif vers l'écran.
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0xbfeaff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 7, 40, 1, true), beamMaterial);
  beam.rotation.x = -Math.PI / 2;
  beam.position.set(0.7, 1.5, 3.95);
  beam.rotation.z = 0;
  group.add(beam);
  return { group, beamMaterial };
}

/** Matériau d'hologramme : bleu lumineux, translucide, strié de lignes qui montent. */
function hologramMaterial(time: { value: number }) {
  const material = new THREE.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float uTime;\nvoid main() {')
      .replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\n  gl_FragColor.rgb *= 0.55 + 0.75 * step(0.5, fract(gl_FragCoord.y * 0.22 - uTime * 1.5));',
      );
  };
  return material;
}

/* ---------- Personnage ---------- */

interface Bones {
  hips: THREE.Object3D;
  leftUpLeg: THREE.Object3D;
  rightUpLeg: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftForeArm: THREE.Object3D;
  rightForeArm: THREE.Object3D;
  spine: THREE.Object3D;
}

const BONE_NAMES: Record<keyof Bones, string> = {
  hips: 'Hips',
  leftUpLeg: 'LeftUpLeg',
  rightUpLeg: 'RightUpLeg',
  leftLeg: 'LeftLeg',
  rightLeg: 'RightLeg',
  leftArm: 'LeftArm',
  rightArm: 'RightArm',
  leftForeArm: 'LeftForeArm',
  rightForeArm: 'RightForeArm',
  spine: 'Spine',
};

/**
 * Pose calculée, ajoutée à l'animation d'attente. Sur ce squelette : tourner une cuisse
 * autour de X vers le négatif la porte en avant, tourner un tibia autour de X vers le
 * positif plie le genou, et un bras part en avant autour de Z (positif à gauche, négatif à droite).
 */
/** Recul du siège par rapport au personnage debout, en mètres. */
const SEAT_BACK = 0.3;

function pose(bones: Bones, walk: number, phase: number, sit: number) {
  const swing = Math.sin(phase);
  const lift = Math.cos(phase);
  // Marche : cuisses en opposition, le genou se plie quand la jambe revient vers l'avant.
  bones.leftUpLeg.rotateX(walk * -0.5 * swing - sit * 1.5);
  bones.rightUpLeg.rotateX(walk * 0.5 * swing - sit * 1.5);
  bones.leftLeg.rotateX(walk * (0.15 + 0.8 * Math.max(0, lift)) + sit * 1.5);
  bones.rightLeg.rotateX(walk * (0.15 + 0.8 * Math.max(0, -lift)) + sit * 1.5);
  // Bras : opposés aux jambes en marchant, mains posées sur les cuisses une fois assis.
  bones.leftArm.rotateZ(walk * -0.42 * swing + sit * 0.3);
  bones.rightArm.rotateZ(walk * -0.42 * swing - sit * 0.3);
  bones.leftForeArm.rotateZ(walk * 0.3 + sit * 0.85);
  bones.rightForeArm.rotateZ(-walk * 0.3 - sit * 0.85);
  bones.spine.rotateY(walk * 0.07 * swing);
  bones.hips.position.y += walk * 0.02 * Math.abs(lift) - sit * 0.42;
  // Il recule le bassin pour trouver le siège, placé derrière lui.
  bones.hips.position.z -= sit * SEAT_BACK;
}

/* ---------- La scène ---------- */

export function mountStage(
  canvas: HTMLCanvasElement,
  options: { avatar: string; milestones: number; volumes: Volume[] },
  onReady: () => void,
): Stage | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const T = timeline(options.milestones, options.volumes.length);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BACKGROUND, 7, 26);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.55;
  const key = new THREE.DirectionalLight(0xfff2e0, 2.2);
  key.position.set(2.5, 4, 4);
  const rim = new THREE.DirectionalLight(CYAN, 2.6);
  rim.position.set(-3, 2.5, -4);
  scene.add(key, rim);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  const { floor, map: floorMap } = buildFloor();
  const shadow = buildShadow();
  const cinema = buildCinema();
  cinema.group.visible = false;
  scene.add(floor, shadow, cinema.group);

  // Socle lumineux de l'hologramme.
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.04, 64, 1, true),
    new THREE.MeshBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  pad.position.y = 0.02;
  scene.add(pad);

  const stack = createStack(options.volumes);
  stack.group.scale.setScalar(0.3);
  stack.group.visible = false;
  scene.add(stack.group);

  /* ----- Personnage ----- */

  const time = { value: 0 };
  const hologram = hologramMaterial(time);
  const skins: { mesh: THREE.Mesh; solid: THREE.Material | THREE.Material[] }[] = [];
  let mixer: THREE.AnimationMixer | null = null;
  let bones: Bones | null = null;
  let avatar: THREE.Object3D | null = null;
  let ghost = false;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(options.avatar, (gltf) => {
    avatar = gltf.scene;
    avatar.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.frustumCulled = false;
        skins.push({ mesh: object, solid: object.material });
      }
    });
    const find = (name: string) => avatar!.getObjectByName(name);
    const found = Object.fromEntries(
      Object.entries(BONE_NAMES).map(([key, name]) => [key, find(name)]),
    );
    if (Object.values(found).every(Boolean)) bones = found as unknown as Bones;
    mixer = new THREE.AnimationMixer(avatar);
    if (gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play();
    scene.add(avatar);
    onReady();
  });

  const setGhost = (on: boolean) => {
    if (on === ghost) return;
    ghost = on;
    skins.forEach(({ mesh, solid }) => (mesh.material = on ? hologram : solid));
  };

  /* ----- Caméra : une position par acte ----- */

  const views = {
    intro: { position: vec(0.9, 1.5, 4.7), target: vec(0.78, 1.18, 0) },
    walk: { position: vec(2.3, 1.35, 5.5), target: vec(1.2, 1.0, 0) },
    screen: { position: vec(-0.9, 1.6, -3.6), target: vec(-1.1, 1.3, 2.5) },
    books: { position: vec(1.2, 1.45, 6.6), target: vec(1.45, 1.05, 0) },
  };
  const position = vec(0, 0, 0);
  const target = vec(0, 0, 0);
  const angleOf = (v: THREE.Vector3) => (Math.atan2(v.x, v.z) + Math.PI * 2) % (Math.PI * 2);
  /**
   * Passe d'une vue à l'autre. Avec `orbit`, la caméra tourne autour du personnage au lieu de
   * couper en ligne droite, ce qui la ferait le traverser.
   */
  const blend = (
    from: keyof typeof views,
    to: keyof typeof views,
    amount: number,
    orbit = false,
  ) => {
    const a = views[from].position;
    const b = views[to].position;
    target.lerpVectors(views[from].target, views[to].target, amount);
    if (!orbit) {
      position.lerpVectors(a, b, amount);
      return;
    }
    const angle = THREE.MathUtils.lerp(angleOf(a), angleOf(b), amount);
    const radius = THREE.MathUtils.lerp(Math.hypot(a.x, a.z), Math.hypot(b.x, b.z), amount);
    position.set(
      Math.sin(angle) * radius,
      THREE.MathUtils.lerp(a.y, b.y, amount),
      Math.cos(angle) * radius,
    );
  };

  /* ----- Boucle ----- */

  let progress = 0;
  let previousProgress = 0;
  let walkWeight = 0;
  let phase = 0;
  let previous = performance.now();
  let frame = 0;
  let visible = true;
  let portrait = false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const resize = () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    portrait = camera.aspect < 0.9;
    camera.fov = portrait ? 48 : 30;
    camera.updateProjectionMatrix();
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    if (!visible) return;
    const delta = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    time.value += delta;
    const p = progress;

    // Il marche tant que le lecteur fait défiler la partie « parcours ».
    const moving = Math.abs(p - previousProgress) > 0.0006 && p > T.walk - 0.3 && p < T.seat + 0.25;
    const direction = p >= previousProgress ? 1 : -1;
    previousProgress = p;
    walkWeight += ((moving && !reduced ? 1 : 0) - walkWeight) * Math.min(1, delta * 6);
    phase += delta * 9.5 * direction;
    floorMap.offset.y = -THREE.MathUtils.clamp(p - T.walk, 0, T.seat - T.walk) * 2.6;

    const sit = smooth(T.seat + 0.3, T.seat + 0.9, p) * (1 - smooth(T.rise, T.rise + 0.45, p));
    const cinemaAmount =
      smooth(T.seat + 0.1, T.seat + 0.6, p) * (1 - smooth(T.rise + 0.2, T.rise + 0.6, p));
    // Le quadrillage s'efface devant l'écran, qu'il rayerait sinon.
    (floor.material as THREE.MeshBasicMaterial).opacity = 0.5 - 0.42 * cinemaAmount;
    cinema.group.visible = cinemaAmount > 0.01;
    cinema.group.scale.setScalar(0.6 + 0.4 * cinemaAmount);
    cinema.beamMaterial.opacity =
      0.07 * smooth(T.seat + 0.7, T.screen, p) * (1 - smooth(T.rise - 0.1, T.rise + 0.2, p));

    const research = smooth(T.rise + 0.5, T.rise + 0.8, p);
    setGhost(research > 0.5);
    (pad.material as THREE.MeshBasicMaterial).opacity =
      research * (0.5 + 0.2 * Math.sin(time.value * 3));
    shadow.visible = research < 0.5;
    pad.position.x = portrait ? (research > 0.5 ? -0.25 : 0) : research * 1.05;
    stack.group.visible = p > T.rise + 0.3;
    stack.update((p - T.books) / T.BOOK, smooth(T.rise + 0.4, T.books, p));
    stack.group.position.set(portrait ? 0 : 2.75, portrait ? 2.45 : 1.2, portrait ? -0.6 : 0);

    if (avatar) {
      // En hologramme, il flotte légèrement et se tient de trois quarts vers la pile.
      avatar.position.set(
        portrait ? (research > 0.5 ? -0.25 : 0) : research * 1.05,
        research * 0.04 * Math.sin(time.value * 1.6),
        0,
      );
      avatar.rotation.y = research * (portrait ? 0 : 0.5);
      avatar.scale.setScalar(portrait && research > 0.5 ? 0.55 : 1);
    }
    mixer?.update(delta);
    if (bones) pose(bones, walkWeight * (1 - sit), phase, sit);

    // Caméra : intro, marche, écran, recherche.
    if (p < T.seat) blend('intro', 'walk', smooth(0.35, T.walk + 0.2, p));
    else if (p < T.rise) blend('walk', 'screen', smooth(T.seat, T.screen - 0.1, p), true);
    else blend('screen', 'books', smooth(T.rise, T.books - 0.2, p), true);
    if (portrait) {
      // Écran étroit : le personnage au centre, en haut ; le texte occupe le bas.
      const onScreen = p >= T.seat && p < T.rise + 0.5;
      position.x *= onScreen ? 0.7 : 0.25;
      target.x = onScreen ? 0.1 : 0;
      // Devant l'écran, il descend dans le cadre pour laisser l'image et ses commandes libres.
      target.y += onScreen ? 0.55 : -0.42;
      position.z *= onScreen ? 1.3 : 1.15;
    }
    camera.position.copy(position);
    camera.lookAt(target);
    renderer.render(scene, camera);
  };

  const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
  observer.observe(canvas);
  window.addEventListener('resize', resize);
  resize();
  frame = requestAnimationFrame(tick);

  return {
    setProgress: (value) => {
      progress = value;
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      stack.dispose();
      environment.dispose();
      pmrem.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      renderer.dispose();
    },
  };
}

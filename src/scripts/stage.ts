/**
 * Scène de la page d'accueil (three.js), pilotée par le défilement.
 *
 *   1. Le personnage fait face au lecteur, puis se retourne et remonte un couloir, de dos.
 *      Chaque cadre accroché au mur est une étape de son parcours.
 *   2. Il entre dans le salon, contourne le fauteuil, s'assoit et allume la télévision.
 *      Chaque réalisation est une chaîne ; en choisir une rapproche la caméra de l'écran.
 *   3. La caméra descend vers la table basse, où sont empilées les publications.
 *
 * Le personnage est un avatar Avaturn. Son attente vient du fichier ; sa marche est une
 * capture de mouvement recalée sur son squelette (public/models/walk.json) ; la pose assise
 * est calculée os par os.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createHolo, type Scene } from './holo';
import { buildRoom, GAP, type Frame } from './room';
import { createStack, type Volume } from './stack';
import { createTelevision, type Channel } from './tv';

/* ---------- Découpage du défilement ---------- */

/**
 * Jalons du défilement, en hauteurs d'écran. Partagé avec la page, qui en déduit la
 * hauteur de la piste et le texte à afficher.
 */
export function timeline(milestones: number, volumes: number) {
  const STEP = 0.7;
  const BOOK = 0.6;
  /** Fin de l'ouverture : il s'est retourné et part. */
  const walk = 1;
  /** Il passe le seuil du salon. */
  const seat = walk + milestones * STEP;
  /** Il est assis, la télévision est allumée. */
  const screen = seat + 2.3;
  /** La caméra quitte l'écran pour la table basse. */
  const rise = screen + 1.3;
  const books = rise + 0.8;
  const end = books + (volumes - 1) * BOOK;
  return { STEP, BOOK, walk, seat, screen, rise, books, end };
}

export interface StageOptions {
  avatar: string;
  walk: string;
  frames: Frame[];
  volumes: Volume[];
  channels: Channel[];
  /** Invitation affichée en tête de la mosaïque. */
  hint: string;
  /** Le lecteur a choisi une chaîne sur l'écran. */
  onPick: (index: number) => void;
}

export interface Stage {
  /** Position de défilement, en hauteurs d'écran depuis le haut de la scène. */
  setProgress: (progress: number) => void;
  /** Affiche le carton de la chaîne sur l'écran ; -1 pour revenir à la mosaïque. */
  tune: (index: number) => void;
  /** Projette une scène du film au-dessus de la table basse ; `null` éteint le projecteur. */
  project: (scene: Scene | null) => void;
  /**
   * Position à l'écran, en pixels du canvas, d'un élément nommé : un élément de la scène
   * projetée, ou `cadre:n` pour le cadre du couloir d'indice n.
   */
  locate: (name: string) => { x: number; y: number } | null;
  destroy: () => void;
}

/* ---------- Outils ---------- */

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Longueur parcourue pendant un cycle de marche (deux pas), en mètres. */
const STRIDE = 1.5;
/** Recul et abaissement du bassin pour s'asseoir au fond du fauteuil, en mètres. */
const SIT = { back: 0.52, down: 0.37, recline: 0.2 };

interface WalkData {
  duration: number;
  times: number[];
  tracks: Record<string, number[]>;
  hips: number[];
}

/** Os que la pose assise déplace, de la racine vers les extrémités. */
const POSED = [
  'Hips',
  'Spine',
  'Neck',
  'Head',
  ...['Left', 'Right'].flatMap((side) => [
    `${side}UpLeg`,
    `${side}Leg`,
    `${side}Foot`,
    `${side}Arm`,
    `${side}ForeArm`,
    `${side}Hand`,
  ]),
] as const;
type Bones = Record<(typeof POSED)[number], THREE.Object3D>;

const from = new THREE.Vector3();
const to = new THREE.Vector3();
const swing = new THREE.Quaternion();
const world = new THREE.Quaternion();
const local = new THREE.Quaternion();

/**
 * Oriente un os pour que le segment qui va de lui à son enfant pointe dans `direction`
 * (repère du monde). Cette visée ne dépend ni des axes propres de l'os ni de l'animation
 * en cours, ce qui la rend fiable là où une rotation « autour de X » ne l'est pas.
 */
function aim(
  bone: THREE.Object3D,
  child: THREE.Object3D,
  direction: THREE.Vector3,
  weight: number,
) {
  bone.updateWorldMatrix(true, false);
  child.updateWorldMatrix(false, false);
  from
    .setFromMatrixPosition(child.matrixWorld)
    .sub(to.setFromMatrixPosition(bone.matrixWorld))
    .normalize();
  swing.setFromUnitVectors(from, to.copy(direction).normalize());
  swing.multiply(bone.getWorldQuaternion(world));
  bone.parent!.getWorldQuaternion(local).invert().multiply(swing);
  bone.quaternion.slerp(local, weight);
}

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const direction = new THREE.Vector3();
/** Direction dans le repère du personnage : vers l'avant, vers le haut, vers sa droite. */
const toward = (ahead: number, up: number, aside: number) =>
  direction.set(0, up, 0).addScaledVector(forward, ahead).addScaledVector(right, aside);

/**
 * Pose assise, mêlée à l'animation d'attente selon `sit` (0 debout, 1 assis). Le buste part
 * vers l'avant pendant la descente puis s'adosse ; les cuisses reposent sur l'assise, les
 * tibias tombent à la verticale, les mains se posent sur les cuisses. `remote` lève
 * l'avant-bras droit, télécommande pointée vers l'écran.
 */
function pose(bones: Bones, heading: number, sit: number, remote: number) {
  if (sit <= 0) return;
  forward.set(Math.sin(heading), 0, Math.cos(heading));
  right.set(-Math.cos(heading), 0, Math.sin(heading));
  // Le bassin recule d'abord, descend ensuite : on cherche le siège avant de s'y poser.
  bones.Hips.position.z -= SIT.back * smooth(0, 0.7, sit);
  bones.Hips.position.y -= SIT.down * smooth(0.15, 1, sit);
  const lean = SIT.recline * smooth(0.6, 1, sit) - 0.45 * Math.sin(Math.PI * sit) ** 2;
  aim(bones.Hips, bones.Spine, toward(-Math.sin(lean), Math.cos(lean), 0), 1);
  aim(bones.Neck, bones.Head, toward(0.1, 1, 0), sit);

  for (const [side, out] of [
    ['Left', -1],
    ['Right', 1],
  ] as const) {
    const lifted = side === 'Right' ? remote : 0;
    aim(bones[`${side}UpLeg`], bones[`${side}Leg`], toward(1, -0.02, out * 0.14), sit);
    aim(bones[`${side}Leg`], bones[`${side}Foot`], toward(0.05, -1, 0), sit);
    aim(
      bones[`${side}Arm`],
      bones[`${side}ForeArm`],
      toward(0.22 + lifted * 0.3, -1, out * 0.16),
      sit,
    );
    aim(
      bones[`${side}ForeArm`],
      bones[`${side}Hand`],
      toward(1, -0.75 + lifted * 0.95, -out * 0.3 * (1 - lifted)),
      sit,
    );
  }
}

/* ---------- La scène ---------- */

export function mountStage(
  canvas: HTMLCanvasElement,
  options: StageOptions,
  onReady: () => void,
): Stage | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const T = timeline(options.frames.length, options.volumes.length);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0c0e);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.42;
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);

  const room = buildRoom(options.frames);
  scene.add(room.group);
  const tv = createTelevision(options.channels, options.hint);
  room.setScreenTexture(tv.texture);

  // La pile de publications, à l'échelle d'un livre, posée sur la table basse.
  const stack = createStack(options.volumes);
  stack.group.scale.setScalar(0.047);
  stack.group.position.set(room.table.x + 0.14, room.table.y, room.table.z);
  stack.group.rotation.y = 0.3;
  stack.group.traverse((object) => {
    object.castShadow = true;
    object.receiveShadow = true;
  });
  scene.add(stack.group);

  // Le film d'une réalisation se projette au-dessus de la table, depuis le projecteur 8 mm.
  const holo = createHolo(
    room.table,
    {
      tv: room.tv.center.clone().add(vec(0, 0.72, 0.1)),
      lamp: vec(-1.75, 1.42, room.doorZ - 4.6),
      window: vec(3.0, 1.7, room.doorZ - 4.3),
      table: room.table.clone().add(vec(0, 0.5, 0)),
      projector: vec(1.12, 0.78, room.doorZ - 4.15),
    },
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  scene.add(holo.group);
  /** Point de vue demandé par la scène en cours : azimut, élévation, distance. */
  const orbit = { azimuth: 0.4, elevation: 0.4, distance: 2.3 };
  const orbitGoal = { ...orbit };
  const spot = vec(0, 0, 0);

  /* ----- Trajet : le couloir en ligne droite, puis une courbe autour du fauteuil ----- */

  const corridor = options.frames.length * GAP;
  const D = room.doorZ;
  const curve = new THREE.CatmullRomCurve3(
    [
      vec(0, 0, -corridor),
      vec(0, 0, D),
      vec(-0.6, 0, D - 1.7),
      vec(-1.0, 0, D - 3.1),
      vec(-0.98, 0, D - 4.3),
      vec(-0.55, 0, room.seat.z - 0.12),
      room.seat.clone(),
    ],
    false,
    'centripetal',
  );
  const bend = curve.getLength();
  const point = vec(0, 0, 0);
  const tangent = vec(0, 0, -1);
  /** Position et cap du personnage après `distance` mètres de marche. */
  const along = (distance: number) => {
    if (distance <= corridor) {
      point.set(0, 0, -distance);
      tangent.set(0, 0, -1);
    } else {
      const u = clamp01((distance - corridor) / bend);
      curve.getPointAt(u, point);
      curve.getTangentAt(u, tangent);
    }
    return Math.atan2(tangent.x, tangent.z);
  };

  /* ----- Personnage ----- */

  let mixer: THREE.AnimationMixer | null = null;
  let walkAction: THREE.AnimationAction | null = null;
  let idleAction: THREE.AnimationAction | null = null;
  let bones: Bones | null = null;
  /**
   * Valeurs des os posés telles que l'animation les a laissées. Le mélangeur ne réécrit
   * que ce qui a changé : sans ce rappel, la pose s'ajouterait à elle-même d'image en image.
   */
  let base: { bone: THREE.Object3D; rotation: THREE.Quaternion; position: THREE.Vector3 }[] = [];
  let avatar: THREE.Object3D | null = null;
  let disposed = false;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const loadAvatar = new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>(
    (resolve, reject) => loader.load(options.avatar, resolve, undefined, reject),
  );
  const loadWalk = fetch(options.walk).then((response) => response.json() as Promise<WalkData>);
  Promise.all([loadAvatar, loadWalk])
    .then(([gltf, data]) => {
      if (disposed) return;
      avatar = gltf.scene;
      avatar.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.frustumCulled = false;
          object.castShadow = true;
        }
      });
      const found = Object.fromEntries(POSED.map((name) => [name, avatar!.getObjectByName(name)]));
      if (Object.values(found).every(Boolean)) {
        bones = found as Bones;
        base = POSED.map((name) => ({
          bone: bones![name],
          rotation: bones![name].quaternion.clone(),
          position: bones![name].position.clone(),
        }));
      }

      mixer = new THREE.AnimationMixer(avatar);
      if (gltf.animations[0]) idleAction = mixer.clipAction(gltf.animations[0]).play();
      const tracks: THREE.KeyframeTrack[] = Object.entries(data.tracks).map(
        ([name, values]) =>
          new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, data.times, values),
      );
      tracks.push(new THREE.VectorKeyframeTrack('Hips.position', data.times, data.hips));
      // La marche n'avance pas seule : son instant est réglé sur la distance parcourue.
      walkAction = mixer.clipAction(new THREE.AnimationClip('walk', data.duration, tracks)).play();
      walkAction.timeScale = 0;
      walkAction.setEffectiveWeight(0);
      scene.add(avatar);
      onReady();
    })
    .catch(() => onReady());

  /* ----- Écran : survol et choix d'une chaîne ----- */

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let watching = false;
  /** Rapprochement de la caméra vers l'écran, de 0 à 1, et sa cible. */
  let zoom = 0;
  let zoomTarget = 0;

  const channelAt = (event: PointerEvent | MouseEvent) => {
    if (!watching || zoomTarget > 0) return -1;
    const box = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - box.left) / box.width) * 2 - 1,
      -((event.clientY - box.top) / box.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObject(room.tv.screen);
    return hit?.uv ? tv.hit(hit.uv.x, hit.uv.y) : -1;
  };
  const onMove = (event: PointerEvent) => {
    const index = channelAt(event);
    tv.setHover(index);
    canvas.style.cursor = index >= 0 ? 'pointer' : '';
  };
  const onClick = (event: MouseEvent) => {
    const index = channelAt(event);
    if (index >= 0) options.onPick(index);
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('click', onClick);

  /* ----- Caméra ----- */

  const position = vec(0, 0, 0);
  const target = vec(0, 0, 0);
  const fromPosition = vec(0, 0, 0);
  const fromTarget = vec(0, 0, 0);
  let fov = 36;
  let portrait = false;
  /** Mélange la vue courante vers une autre. */
  const view = (
    x: number,
    y: number,
    z: number,
    lx: number,
    ly: number,
    lz: number,
    toFov: number,
    amount: number,
  ) => {
    position.lerp(fromPosition.set(x, y, z), amount);
    target.lerp(fromTarget.set(lx, ly, lz), amount);
    fov += (toFov - fov) * amount;
  };
  /** Focale verticale, en degrés, pour que l'écran vu à `distance` occupe la part `fill` de la largeur. */
  const fovFor = (fill: number, distance: number) =>
    THREE.MathUtils.radToDeg(
      2 * Math.atan(room.tv.width / 2 / (Math.abs(distance) * fill * camera.aspect)),
    );

  /* ----- Boucle ----- */

  let goal = 0;
  let progress = 0;
  let previousProgress = 0;
  let walkWeight = 0;
  let cycle = 0;
  let previousDistance = 0;
  /** 1 quand le lecteur remonte la page : le personnage revient sur ses pas, de face. */
  let back = 0;
  /** Côté du couloir que la caméra regarde, lissé. */
  let lean = 1;
  let previous = performance.now();
  let frame = 0;
  let visible = true;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const resize = () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    portrait = camera.aspect < 0.9;
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    if (!visible) return;
    const delta = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    // Le défilement est lissé : la marche et la caméra ne saccadent pas avec la molette.
    progress += (goal - progress) * (reduced ? 1 : 1 - Math.exp(-delta * 6));
    const p = progress;
    const speed = (p - previousProgress) / Math.max(delta, 0.001);
    previousProgress = p;

    /* Personnage : où il est, vers où il regarde, s'il marche. */
    const distance =
      p <= T.seat
        ? clamp01((p - T.walk) / (T.seat - T.walk)) * corridor
        : corridor + clamp01((p - T.seat) / 1.05) * bend;
    let heading = along(distance);
    // Ouverture : il fait face au lecteur, puis se retourne.
    const turn = smooth(0.4, 0.95, p);
    heading = THREE.MathUtils.lerp(0, heading, turn);
    // Devant le fauteuil, il pivote dos au siège, face à l'écran.
    const pivot = smooth(T.seat + 0.9, T.seat + 1.1, p);
    heading = THREE.MathUtils.lerp(heading, Math.PI, pivot);

    const walking = p > 0.4 && p < T.seat + 1.1;
    const moving = walking && Math.abs(speed) > 0.012;
    walkWeight += ((moving ? 1 : 0) - walkWeight) * Math.min(1, delta * (moving ? 7 : 4));
    back +=
      ((moving && speed < 0 && p > T.walk && p < T.seat + 0.95 ? 1 : 0) - back) *
      Math.min(1, delta * 5);
    const travelled = Math.abs(distance - previousDistance);
    previousDistance = distance;
    // Pendant qu'il pivote sur place, il piétine au rythme du temps.
    cycle += travelled / STRIDE + (moving && travelled < 0.0005 ? delta * 0.9 : 0);

    const sit = clamp01((p - T.seat - 1.1) / 0.45);
    const remote =
      smooth(T.seat + 1.55, T.seat + 1.7, p) * (1 - smooth(T.seat + 1.9, T.seat + 2.1, p));
    const power =
      smooth(T.seat + 1.7, T.seat + 1.9, p) * (1 - smooth(T.rise + 0.05, T.rise + 0.35, p));

    if (avatar) {
      avatar.position.copy(point);
      avatar.rotation.y = heading + back * Math.PI;
    }
    if (mixer && walkAction && idleAction) {
      const weight = walkWeight * (1 - sit);
      walkAction.setEffectiveWeight(weight);
      idleAction.setEffectiveWeight(1 - weight);
      walkAction.time = (cycle % 1) * walkAction.getClip().duration;
      for (const item of base) {
        item.bone.quaternion.copy(item.rotation);
        item.bone.position.copy(item.position);
      }
      mixer.update(delta);
      for (const item of base) {
        item.rotation.copy(item.bone.quaternion);
        item.position.copy(item.bone.position);
      }
    }
    if (bones && avatar) {
      avatar.updateMatrixWorld(true);
      pose(bones, heading, sit, remote);
    }

    /* Décor : lumière d'accompagnement, télévision, pile de livres. */
    room.follow(point);
    room.setCinema(power, holo.level);
    scene.environmentIntensity = 0.42 * (1 - 0.85 * holo.level);
    tv.setPower(power);
    watching = power > 0.95 && p < T.rise;
    if (!watching) {
      tv.setHover(-1);
      canvas.style.cursor = '';
    }
    stack.update((p - T.books) / T.BOOK, 1);

    /* Caméra. */
    const index = Math.min(options.frames.length - 1, Math.max(0, Math.floor(distance / GAP)));
    lean += (room.frame(index).side - lean) * Math.min(1, delta * 2.2);
    const wide = portrait ? 0.8 : 1;
    // Ouverture, de face.
    position.set(portrait ? 0.2 : -0.85, 1.45, portrait ? 5.2 : 3.7);
    target.set(portrait ? 0 : -1.05, portrait ? 0.85 : 1.15, 0);
    fov = portrait ? 46 : 34;
    // Dans son dos, légèrement décalée du côté opposé au cadre en cours.
    view(
      -lean * 0.72 * wide,
      1.62,
      point.z + (portrait ? 3.9 : 2.9),
      point.x * 0.5 + lean * 0.85 * wide,
      portrait ? 0.95 : 1.22,
      point.z - 2.5,
      portrait ? 52 : 38,
      smooth(0.35, T.walk, p),
    );
    // Vue d'ensemble du salon quand il entre.
    view(
      portrait ? 0.5 : 1.55,
      1.6,
      D - (portrait ? 0.4 : 1.3),
      portrait ? -0.1 : -0.25,
      portrait ? 0.7 : 1.0,
      room.tv.center.z,
      portrait ? 56 : 40,
      smooth(T.seat - 0.25, T.seat + 0.75, p),
    );
    // Par-dessus son épaule, vers l'écran : la focale se règle pour que l'écran occupe
    // une part fixe de la largeur.
    const { center } = room.tv;
    const eye = portrait ? vec(0, 1.85, room.seat.z + 2.9) : vec(0.95, 1.64, room.seat.z + 2.3);
    const tvFov = fovFor(portrait ? 0.92 : 0.62, center.z - eye.z);
    view(
      eye.x,
      eye.y,
      eye.z,
      center.x - (portrait ? 0 : 0.3),
      center.y - (portrait ? 0.75 : 0),
      center.z,
      tvFov,
      smooth(T.seat + 1.75, T.screen, p),
    );
    // Vers la table basse et la pile de publications.
    view(
      room.table.x + (portrait ? 0.25 : 0.62),
      room.table.y + (portrait ? 0.75 : 0.42),
      room.table.z + (portrait ? 1.15 : 0.82),
      room.table.x + (portrait ? 0.14 : 0.2),
      room.table.y + (portrait ? -0.05 : 0.08),
      room.table.z,
      portrait ? 44 : 30,
      smooth(T.rise, T.books - 0.15, p),
    );
    // Chaîne choisie : la caméra quitte l'écran et tourne autour de la maquette projetée,
    // le personnage assis derrière elle.
    zoom += (zoomTarget - zoom) * (reduced ? 1 : Math.min(1, delta * 2.6));
    const glide = reduced ? 1 : Math.min(1, delta * 1.8);
    orbit.azimuth += (orbitGoal.azimuth - orbit.azimuth) * glide;
    orbit.elevation += (orbitGoal.elevation - orbit.elevation) * glide;
    orbit.distance += (orbitGoal.distance - orbit.distance) * glide;
    if (zoom > 0.001) {
      const reach = orbit.distance * (portrait ? 1.5 : 1.15);
      // Écran étroit : la caméra monte, pour passer au-dessus des meubles du premier plan.
      const lift = orbit.elevation + (portrait ? 0.3 : 0);
      const flat = Math.cos(lift) * reach;
      view(
        holo.center.x + Math.sin(orbit.azimuth) * flat,
        holo.center.y + Math.sin(lift) * reach,
        holo.center.z + Math.cos(orbit.azimuth) * flat,
        holo.center.x,
        holo.center.y,
        holo.center.z,
        portrait ? 50 : 36,
        zoom * zoom * (3 - 2 * zoom),
      );
    }
    stack.group.visible = holo.level < 0.5;
    // Pendant un film, l'image est décalée pour laisser sa place au texte : à gauche sur
    // grand écran, en haut sur petit.
    const shift = zoom * zoom * (3 - 2 * zoom);
    const { clientWidth: fullWidth, clientHeight: fullHeight } = canvas;
    if (shift > 0.001)
      camera.setViewOffset(
        fullWidth,
        fullHeight,
        portrait ? 0 : -fullWidth * 0.16 * shift,
        portrait ? -fullHeight * 0.17 * shift : 0,
        fullWidth,
        fullHeight,
      );
    else camera.clearViewOffset();

    camera.fov = fov;
    camera.updateProjectionMatrix();
    camera.position.copy(position);
    camera.lookAt(target);
    holo.update(delta, camera);
    renderer.render(scene, camera);
  };

  const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
  observer.observe(canvas);
  window.addEventListener('resize', resize);
  resize();
  frame = requestAnimationFrame(tick);

  return {
    setProgress: (value) => {
      goal = value;
    },
    tune: (index) => {
      zoomTarget = index >= 0 ? 1 : 0;
      tv.setProgram(index);
    },
    locate: (name) => {
      if (name.startsWith('cadre:')) {
        // Un cadre du couloir : au centre du tirage, sur son mur.
        const { z, side } = room.frame(Number(name.slice(6)));
        spot.set(side * 1.28, 1.55, z);
      } else if (!holo.locate(name, spot)) return null;
      spot.project(camera);
      if (spot.z > 1) return null;
      return {
        x: ((spot.x + 1) / 2) * canvas.clientWidth,
        y: ((1 - spot.y) / 2) * canvas.clientHeight,
      };
    },
    project: (next) => {
      holo.show(next);
      if (!next?.cam) return;
      // Jamais dans l'axe du fauteuil : le personnage masquerait la maquette.
      const [azimuth, elevation, distance] = next.cam;
      orbitGoal.azimuth = Math.sign(azimuth || 1) * Math.max(0.45, Math.abs(azimuth));
      orbitGoal.elevation = elevation;
      // Une maquette vue de trop près déborde de l'image.
      orbitGoal.distance = next.model ? Math.max(distance, 2.1) : distance;
    },
    destroy: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('click', onClick);
      stack.dispose();
      holo.dispose();
      tv.dispose();
      room.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

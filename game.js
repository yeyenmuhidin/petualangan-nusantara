/* Petualangan Nusantara — original single-player 3D adventure.
   Three.js r170 is loaded from a local copy. No runtime CDN. */
import * as THREE from './three.module.js';

const SAVE_KEY = 'petualangan-nusantara-v2';
const SAVE_KEY_LEGACY = 'petualangan-nusantara-v1';
const ISLAND_R = 36;
const WALK_R = 33.5;
const PLAYER_SPEED = 7.2;
const PIXEL_CAP = 1.5;
const JOY_DEAD = 0.16;
const JOY_SNAP = 0.28;
const JOY_SMOOTH = 14;
const JOY_KNOB_TRAVEL = 46;
const CAM_DIST = 8.2;
const CAM_PITCH_TP = 0.48;
const CAM_TURN = 1.9;
const LOOK_SENS_YAW = 0.0052;
const LOOK_SENS_PITCH = 0.0036;

const START = { x: 0.4, z: -5.2, rot: Math.PI };
const ITEM_NAMES = {
  keranjang: 'Keranjang Bu Sari',
  ikan: 'Ikan segar',
  harta: 'Harta karun pulau',
  cangkul: 'Cangkul Pak Tani',
  padi: 'Seikat padi',
  bekal: 'Bekal untuk Mbah Karya',
  genta: 'Genta kuno',
  pusaka: 'Pusaka Nusantara',
};
const PUZZLE_ORDER = ['hijau', 'kuning', 'merah'];
const SAWAH = { x: 0, z: -54, rx: 16, rz: 15 };
const GUNUNG = { x: 24, z: -76, r: 13.8 };

const mats = new Map();
function mat(color, extra = {}) {
  const key = color + '|' + JSON.stringify(extra);
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshLambertMaterial({ color, ...extra }));
  }
  return mats.get(key);
}
function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, typeof material === 'number' ? mat(material) : material);
  m.position.set(x, y, z);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

function distToSeg(px, pz, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const len2 = abx * abx + abz * abz || 1;
  let u = ((px - ax) * abx + (pz - az) * abz) / len2;
  u = Math.max(0, Math.min(1, u));
  return Math.hypot(px - (ax + abx * u), pz - (az + abz * u));
}

function isWalkable(x, z) {
  if (x * x + z * z <= WALK_R * WALK_R) return true;
  if (distToSeg(x, z, 0, -32.0, 0, -42.5) <= 1.4) return true;
  const sx = (x - SAWAH.x) / SAWAH.rx;
  const sz = (z - SAWAH.z) / SAWAH.rz;
  if (sx * sx + sz * sz <= 1) return true;
  if (distToSeg(x, z, 11, -60, 18.5, -70) <= 1.7) return true;
  const gx = x - GUNUNG.x, gz = z - GUNUNG.z;
  if (gx * gx + gz * gz <= GUNUNG.r * GUNUNG.r) return true;
  return false;
}

function gunungHeight(x, z) {
  const gx = x - GUNUNG.x, gz = z - GUNUNG.z;
  const gd = Math.hypot(gx, gz);
  if (gd >= GUNUNG.r) return 0;
  const t = 1 - gd / GUNUNG.r;
  return 0.12 + t * t * 3.7;
}

function groundHeight(x, z) {
  const gh = gunungHeight(x, z);
  if (gh > 0) return gh;
  const dPath = distToSeg(x, z, 11, -60, 18.5, -70);
  if (dPath < 2.2) {
    const abx = 7.5, abz = -10;
    const len2 = abx * abx + abz * abz;
    let u = ((x - 11) * abx + (z + 60) * abz) / len2;
    u = Math.max(0, Math.min(1, u));
    const edge = gunungHeight(18.5, -70);
    return u * Math.max(edge, 1.4);
  }
  return 0;
}

function applyGroundY(obj, extra = 0) {
  obj.position.y = groundHeight(obj.position.x, obj.position.z) + extra;
}

function defaultSave() {
  return {
    coins: 0,
    collectedCoins: {},
    inventory: [],
    quests: {
      kades: 'idle', sari: 'idle', udin: 'idle', gua: 'idle',
      tani: 'idle', rina: 'idle', prasasti: 'idle', roh: 'idle',
    },
    defeatedSlimes: {},
    slimesDefeated: 0,
    basketTaken: false,
    treasureTaken: false,
    hoeTaken: false,
    bekalDelivered: false,
    puzzleStep: 0,
    puzzleDone: false,
    defeatedRoh: {},
    rohDefeated: 0,
    pusakaTaken: false,
    migratedFromV1: false,
    view: 'third',
    px: START.x,
    pz: START.z,
    rot: START.rot,
    won: false,
  };
}

function loadSave() {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    let migrated = false;
    if (!raw) {
      raw = localStorage.getItem(SAVE_KEY_LEGACY);
      if (raw) migrated = true;
    }
    if (!raw) return null;
    const data = JSON.parse(raw);
    const merged = { ...defaultSave(), ...data, quests: { ...defaultSave().quests, ...(data.quests || {}) } };
    if (migrated) {
      if (merged.won) merged.won = false;
      merged.migratedFromV1 = true;
      writeSave(merged);
    }
    return merged;
  } catch (err) {
    return null;
  }
}

function writeSave(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (err) { /* private mode */ }
}

const $ = (id) => document.getElementById(id);
const ui = {
  canvas: $('c'),
  title: $('title-screen'),
  hud: $('hud'),
  coinCount: $('coin-count'),
  area: $('chip-area'),
  missions: $('mission-list'),
  inv: $('inventory'),
  invList: $('inv-list'),
  dialog: $('dialog'),
  dialogName: $('dialog-name'),
  dialogText: $('dialog-text'),
  dialogActions: $('dialog-actions'),
  toast: $('toast'),
  prompt: $('prompt'),
  controls: $('controls'),
  joy: $('joystick'),
  joyBase: $('joy-base'),
  joyKnob: $('joy-knob'),
  action: $('btn-action'),
  win: $('win-screen'),
  keyHint: $('key-hint'),
  btnStart: $('btn-start'),
  btnContinue: $('btn-continue'),
  btnNew: $('btn-new'),
  btnInv: $('btn-inv'),
  btnView: $('btn-view'),
  btnInvClose: $('btn-inv-close'),
  btnAgain: $('btn-again'),
  btnKeep: $('btn-keep'),
};

const world = {
  scene: null,
  camera: null,
  renderer: null,
  clock: new THREE.Clock(),
  player: null,
  limbs: null,
  npcs: [],
  slimes: [],
  rohs: [],
  coins: [],
  basket: null,
  chest: null,
  hoe: null,
  pusaka: null,
  stones: [],
  warung: null,
  colliders: [],
  water: null,
  playing: false,
  blocked: false,
  wonShown: false,
  keys: new Set(),
  inputX: 0,
  inputY: 0,
  joy: { active: false, pointerId: null, rawX: 0, rawY: 0, x: 0, y: 0 },
  attackT: 0,
  saveT: 0,
  toastT: 0,
  areaName: 'Desa',
  camYaw: START.rot,
  camPitch: CAM_PITCH_TP,
  camLook: { active: false, pointerId: null, lastX: 0, lastY: 0 },
  camManualT: 0,
  viewMode: 'third',
  attackAnim: 0,
};

let save = defaultSave();

function isCoarse() {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
}

/* -------------------- renderer -------------------- */
function setupRenderer() {
  const renderer = new THREE.WebGLRenderer({
    canvas: ui.canvas,
    antialias: false,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setClearColor(0x7ec4d8, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ec4d8);
  scene.fog = new THREE.Fog(0x7ec4d8, 55, 150);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.2, 190);
  camera.position.set(0, 7, 10);
  world.renderer = renderer;
  world.scene = scene;
  world.camera = camera;
  resize();
}

function resize() {
  const r = world.renderer;
  if (!r) return;
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, PIXEL_CAP));
  r.setSize(w, h, false);
  world.camera.aspect = w / h;
  world.camera.updateProjectionMatrix();
  layoutControls();
}

function layoutControls() {
  const mobile = isCoarse();
  if (world.playing && !world.blocked) {
    ui.controls.hidden = !mobile;
    ui.keyHint.hidden = mobile;
  }
}

/* -------------------- people & props -------------------- */
function makePerson({ shirt, pants, skin, hair, hat = null }) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.62, 0.3), shirt, 0, 0.97, 0));
  g.add(mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), skin, 0, 1.48, 0));
  g.add(mesh(new THREE.BoxGeometry(0.4, 0.14, 0.4), hair, 0, 1.68, 0));
  g.add(mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), 0x222222, -0.09, 1.5, 0.19));
  g.add(mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), 0x222222, 0.09, 1.5, 0.19));

  const armL = new THREE.Group();
  armL.add(mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), shirt, 0, -0.22, 0));
  armL.add(mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), skin, 0, -0.5, 0));
  armL.position.set(-0.34, 1.18, 0);
  const armR = new THREE.Group();
  armR.add(mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), shirt, 0, -0.22, 0));
  armR.add(mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), skin, 0, -0.5, 0));
  armR.position.set(0.34, 1.18, 0);

  const legL = new THREE.Group();
  legL.add(mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), pants, 0, -0.22, 0));
  legL.position.set(-0.14, 0.66, 0);
  const legR = new THREE.Group();
  legR.add(mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), pants, 0, -0.22, 0));
  legR.position.set(0.14, 0.66, 0);

  g.add(armL, armR, legL, legR);

  if (hat === 'peci') {
    g.add(mesh(new THREE.BoxGeometry(0.36, 0.16, 0.36), 0x1a1a1a, 0, 1.78, 0));
  } else if (hat === 'cap') {
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.1, 8), 0x1d3557, 0, 1.74, 0));
    g.add(mesh(new THREE.BoxGeometry(0.26, 0.04, 0.18), 0x1d3557, 0, 1.7, 0.2));
  } else if (hat === 'bun') {
    g.add(mesh(new THREE.BoxGeometry(0.18, 0.16, 0.18), hair, 0, 1.84, -0.04));
  } else if (hat === 'band') {
    g.add(mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), 0x9a3412, 0, 1.64, 0));
  } else if (hat === 'caping') {
    const caping = mesh(new THREE.ConeGeometry(0.42, 0.4, 8), 0xe8d48a, 0, 1.9, 0);
    g.add(caping);
  } else if (hat === 'udeng') {
    g.add(mesh(new THREE.BoxGeometry(0.44, 0.12, 0.44), 0xf5f0e6, 0, 1.7, 0));
    g.add(mesh(new THREE.BoxGeometry(0.18, 0.16, 0.2), 0xf5f0e6, 0, 1.84, 0.1));
  }

  g.userData.limbs = { armL, armR, legL, legR };
  return g;
}

function addCollider(x, z, r) {
  world.colliders.push({ x, z, r });
}

function makeHouse(x, z, rot, wall, roof, w = 3.1, d = 2.7, h = 2.15) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, h, d), wall, 0, h / 2, 0));
  const roofM = mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 1.25, 4), roof, 0, h + 0.52, 0);
  roofM.rotation.y = Math.PI / 4;
  g.add(roofM);
  g.add(mesh(new THREE.BoxGeometry(0.55, 1.15, 0.08), 0x5c3d1e, 0, 0.58, d / 2 + 0.03));
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.4, 0.06), 0x9ad7ef, -0.8, 1.25, d / 2 + 0.03));
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.4, 0.06), 0x9ad7ef, 0.8, 1.25, d / 2 + 0.03));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  addCollider(x, z, Math.max(w, d) * 0.58);
  world.scene.add(g);
  return g;
}

function makeSign(text, x, z, rotY) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c4a574';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#5c3d1e';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 118);
  ctx.fillStyle = '#3b2a1a';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.12, 1.15, 0.12), 0x6b4a28, 0, 0.55, 0));
  const signMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  const boardF = mesh(new THREE.PlaneGeometry(1.5, 0.75), signMat, 0, 1.35, 0.08);
  const boardB = mesh(new THREE.PlaneGeometry(1.5, 0.75), signMat, 0, 1.35, -0.02);
  boardB.rotation.y = Math.PI;
  const back = mesh(new THREE.BoxGeometry(1.5, 0.75, 0.06), 0x6b4a28, 0, 1.35, 0.03);
  g.add(back, boardF, boardB);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  world.scene.add(g);
}

function makeChest() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), 0x8a5a22, 0, 0.28, 0));
  g.add(mesh(new THREE.BoxGeometry(0.92, 0.16, 0.62), 0xb8860b, 0, 0.58, 0));
  g.add(mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), 0xe8b84a, 0, 0.42, 0.32));
  return g;
}

function makeBasket() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.32, 8), 0xb45309, 0, 0.2, 0));
  g.add(mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 10), 0x7c2d12, 0, 0.38, 0));
  return g;
}

function makeSlime(color) {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.45, 8, 6), mat(color), 0, 0.4, 0);
  body.scale.set(1, 0.85, 1);
  g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.07, 6, 5), 0x1a1a1a, -0.15, 0.5, 0.32));
  g.add(mesh(new THREE.SphereGeometry(0.07, 6, 5), 0x1a1a1a, 0.15, 0.5, 0.32));
  g.userData.body = body;
  return g;
}

/* -------------------- island world -------------------- */
function biomeColor(x, z, target) {
  const r = Math.hypot(x, z);
  const shore = r > 28.5;
  const pantai = z > 11 || (z > 7 && r > 22);
  const gua = x < -14 && z > -8 && z < 16;
  const hutan = x > 9 && z < 9;
  if (shore || pantai) {
    const t = Math.min(1, Math.max(0, (r - 27) / 6));
    target.set(0xe2c97a).lerp(new THREE.Color(0xd4b56a), t);
    if (pantai && !shore) target.set(0xe6cf86);
    return target;
  }
  if (gua) {
    target.set(0x6d6a70);
    if (x < -22) target.set(0x58555c);
    return target;
  }
  if (hutan) {
    target.set(0x2f7a38);
    return target;
  }
  // village grass + dirt path near center
  const path = (Math.abs(x) < 1.05 && z > -34 && z < 11) ||
    (Math.abs(z + 6.2) < 0.95 && x > -7 && x < 6.5);
  if (path) {
    target.set(0x8b6b3e);
    return target;
  }
  target.set(0x4a9a4a);
  return target;
}

function buildIsland() {
  const half = ISLAND_R + 1.8;
  const geo = new THREE.PlaneGeometry(half * 2, half * 2, 84, 84);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    let y = 0.02;
    if (r > ISLAND_R + 0.4) {
      y = -0.62;
      c.set(0x1a6f8a);
    } else {
      if (r > 29) y = 0.02 - (r - 29) * 0.03;
      if (x < -14 && z > -8 && z < 16) y += 0.08;
      biomeColor(x, z, c);
    }
    pos.setY(i, y);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const island = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  world.scene.add(island);

  const water = mesh(new THREE.CircleGeometry(170, 48), mat(0x1a6f8a), 4, -0.42, -30);
  water.rotation.x = -Math.PI / 2;
  world.scene.add(water);
  world.water = water;

  const ring = mesh(new THREE.RingGeometry(ISLAND_R - 0.2, ISLAND_R + 3.2, 64), mat(0x3aa0b5), 0, -0.28, 0);
  ring.rotation.x = -Math.PI / 2;
  world.scene.add(ring);
}

function placeInstanced(geo, material, points, yOf) {
  const inst = new THREE.InstancedMesh(geo, material, points.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    dummy.position.set(p.x, yOf ? yOf(p) : p.y, p.z);
    dummy.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
    const s = p.s || 1;
    dummy.scale.set(s * (p.sx || 1), s * (p.sy || 1), s * (p.sz || 1));
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  world.scene.add(inst);
  return inst;
}

function seeded(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function buildTrees() {
  const trunks = [];
  const leaves = [];
  const leaves2 = [];
  let i = 0;
  const tryAdd = (x, z, s, palmy) => {
    const r = Math.hypot(x, z);
    if (r > 30 || r < 3) return;
    // keep clearings: village square, basket, cave mouth, beach open
    if (Math.hypot(x - 0, z + 6) < 9) return;
    if (Math.hypot(x - 20, z + 18) < 3.2) return;
    if (x < -12 && z > -6 && z < 16) return;
    if (z > 8) return;
    if (z > 4 && x < 11) return;
    if (z < -22 && Math.abs(x) < 4.5) return;
    if (palmy) return;
    trunks.push({ x, z, y: 0.7 * s, s, ry: seeded(i + 3) * Math.PI });
    leaves.push({ x, z, y: 1.7 * s, s, ry: seeded(i + 4) * Math.PI });
    leaves2.push({ x, z, y: 2.25 * s, s: s * 0.72, ry: seeded(i + 5) * Math.PI });
    addCollider(x, z, 0.42 * s);
    i++;
  };
  for (let k = 0; k < 46; k++) {
    const ang = seeded(k + 11) * Math.PI * 2;
    const rad = 10 + seeded(k + 91) * 20;
    let x = Math.cos(ang) * rad;
    let z = Math.sin(ang) * rad;
    // bias forest to the east
    if (seeded(k + 2) > 0.35) x = 11 + seeded(k + 21) * 16;
    z = -22 + seeded(k + 31) * 28;
    tryAdd(x, z, 0.85 + seeded(k + 41) * 0.5, false);
  }

  placeInstanced(new THREE.BoxGeometry(0.32, 1.4, 0.32), mat(0x6b3f1d), trunks, (p) => p.y);
  placeInstanced(new THREE.BoxGeometry(1.5, 1.3, 1.5), mat(0x1f7a3a), leaves, (p) => p.y);
  placeInstanced(new THREE.BoxGeometry(1.1, 1.0, 1.1), mat(0x2e9a48), leaves2, (p) => p.y);

  // palms on the beach
  const palms = [];
  const palmSpots = [
    [10, 18], [14, 21], [-8, 19], [-12, 16], [18, 16], [7, 24], [-15, 22], [16, 25],
  ];
  palmSpots.forEach(([x, z], n) => {
    const s = 0.95 + seeded(n + 70) * 0.25;
    palms.push({ x, z, y: 1.35 * s, s, rz: (seeded(n) - 0.5) * 0.15 });
    addCollider(x, z, 0.35);
  });
  placeInstanced(new THREE.CylinderGeometry(0.12, 0.2, 2.6, 6), mat(0x8a5a2b), palms, (p) => p.y);
  const palmFronds = [];
  palmSpots.forEach(([x, z], n) => {
    const s = 0.95 + seeded(n + 70) * 0.25;
    for (let k = 0; k < 5; k++) {
      palmFronds.push({
        x, z, y: 2.55 * s,
        s,
        ry: (k / 5) * Math.PI * 2 + seeded(n + 8),
        rx: 0.55,
        sx: 1.1, sy: 0.18, sz: 0.55,
      });
    }
  });
  placeInstanced(new THREE.BoxGeometry(2.1, 0.18, 0.7), mat(0x1c7c3a), palmFronds, (p) => p.y);
}

function buildRocksAndGrass() {
  const rocks = [];
  for (let k = 0; k < 22; k++) {
    const gua = k < 14;
    const x = gua ? -16 - seeded(k) * 14 : -8 + seeded(k + 4) * 28;
    const z = gua ? -4 + seeded(k + 9) * 18 : 14 + seeded(k + 13) * 12;
    if (Math.hypot(x, z) > 31) continue;
    rocks.push({
      x, z, y: 0.28,
      s: 0.5 + seeded(k + 17) * 0.9,
      ry: seeded(k + 20) * Math.PI,
      sx: 0.8 + seeded(k + 21) * 0.6,
      sy: 0.5 + seeded(k + 22) * 0.7,
      sz: 0.8 + seeded(k + 23) * 0.6,
    });
    if (gua && seeded(k) > 0.4) addCollider(x, z, 0.55);
  }
  placeInstanced(new THREE.BoxGeometry(1, 0.8, 1), mat(0x6f6b72), rocks, (p) => p.y * (p.sy || 1) * (p.s || 1));

  const tufts = [];
  for (let k = 0; k < 50; k++) {
    const x = -20 + seeded(k + 50) * 40;
    const z = -22 + seeded(k + 60) * 32;
    if (Math.hypot(x, z) > 28) continue;
    if (z > 12) continue;
    tufts.push({ x, z, y: 0.18, s: 0.4 + seeded(k) * 0.4, ry: seeded(k + 3) * Math.PI });
  }
  placeInstanced(new THREE.ConeGeometry(0.18, 0.4, 5), mat(0x3d9a45), tufts, (p) => p.y);
}

function buildVillage() {
  makeHouse(-7.5, -10.2, 0.25, 0xf2e4c8, 0xb45309);
  makeHouse(8.2, -11.4, -0.4, 0xf6d6b8, 0x9a3412, 3.0, 2.6, 2.0);
  makeHouse(-9.4, -3.6, 1.1, 0xe9e2d0, 0x7c2d12, 2.8, 2.5, 2.0);
  makeHouse(3.6, -14.2, 0.1, 0xf0dcc0, 0xc2410c, 3.3, 2.8, 2.2);

  // well
  const well = new THREE.Group();
  well.add(mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.55, 10), 0x8a8680, 0, 0.28, 0));
  well.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 10), 0x1d4e6e, 0, 0.42, 0));
  well.add(mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), 0x6b4a28, -0.6, 0.9, 0));
  well.add(mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), 0x6b4a28, 0.6, 0.9, 0));
  well.add(mesh(new THREE.BoxGeometry(1.3, 0.08, 0.08), 0x6b4a28, 0, 1.44, 0));
  well.position.set(0.2, 0, -9.2);
  world.scene.add(well);
  addCollider(0.2, -9.2, 0.85);

  // warung stall
  const warung = new THREE.Group();
  warung.add(mesh(new THREE.BoxGeometry(2.2, 0.7, 1.1), 0x8b5a2b, 0, 0.5, 0));
  warung.add(mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), 0x6b4a28, -1.0, 1.1, -0.4));
  warung.add(mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), 0x6b4a28, 1.0, 1.1, -0.4));
  warung.add(mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), 0x6b4a28, -1.0, 1.1, 0.4));
  warung.add(mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), 0x6b4a28, 1.0, 1.1, 0.4));
  const awning = mesh(new THREE.BoxGeometry(2.4, 0.08, 1.4), 0xdc2626, 0, 2.1, 0);
  warung.add(awning);
  warung.add(mesh(new THREE.BoxGeometry(0.5, 0.25, 0.35), 0xf5f0e6, -0.5, 0.95, 0.15));
  warung.add(mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), 0x16a34a, 0.35, 0.95, 0.1));
  warung.position.set(5.6, 0, -5.2);
  world.scene.add(warung);
  addCollider(5.6, -5.2, 1.15);
  world.warung = warung;
  warung.userData.kind = 'warung';

  makeSign('DESA', -1.5, 1.5, 0);
  makeSign('HUTAN', 11.5, -6, Math.PI / 2);
  makeSign('PANTAI', 1.2, 12.2, 0);
  makeSign('GUA', -14.2, 3.5, -Math.PI / 2);
}

function buildBeach() {
  // dock
  const dock = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    dock.add(mesh(new THREE.BoxGeometry(1.4, 0.12, 0.45), 0x8b5a2b, 0, 0.28, i * 0.5));
  }
  dock.add(mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), 0x6b4a28, -0.55, 0, 0.1));
  dock.add(mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), 0x6b4a28, 0.55, 0, 0.1));
  dock.add(mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), 0x6b4a28, -0.55, 0, 2.0));
  dock.add(mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), 0x6b4a28, 0.55, 0, 2.0));
  dock.position.set(4.2, 0, 23.2);
  world.scene.add(dock);

  // boat
  const boat = new THREE.Group();
  boat.add(mesh(new THREE.BoxGeometry(1.1, 0.35, 2.6), 0x7c3f14, 0, 0.25, 0));
  boat.add(mesh(new THREE.BoxGeometry(0.9, 0.2, 2.2), 0x92400e, 0, 0.42, 0));
  boat.add(mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), 0x5c3d1e, 0, 1.1, 0.2));
  boat.add(mesh(new THREE.BoxGeometry(0.9, 1.0, 0.06), 0xf5f0e6, 0.2, 1.3, 0.2));
  boat.position.set(4.2, 0.05, 26.4);
  boat.rotation.y = 0.15;
  world.scene.add(boat);
  addCollider(4.2, 26.4, 1.2);

  // fish crate near Udin
  const crate = new THREE.Group();
  crate.add(mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), 0x8b5a2b, 0, 0.2, 0));
  crate.add(mesh(new THREE.BoxGeometry(0.45, 0.12, 0.18), 0x60a5fa, 0, 0.42, 0));
  crate.position.set(3.4, 0, 20.2);
  world.scene.add(crate);
}

function buildCave() {
  const g = new THREE.Group();
  // rocky arch facing +X (east, toward village)
  const left = mesh(new THREE.BoxGeometry(3.2, 4.2, 5.0), 0x4b5563, -1.0, 2.1, -3.7);
  const right = mesh(new THREE.BoxGeometry(3.2, 4.2, 5.0), 0x4b5563, -1.0, 2.1, 3.7);
  const top = mesh(new THREE.BoxGeometry(3.4, 1.6, 9.2), 0x3f4651, -1.0, 4.5, 0);
  const back = mesh(new THREE.BoxGeometry(1.4, 4.4, 9.2), 0x2f343c, -3.7, 2.2, 0);
  const floor = mesh(new THREE.BoxGeometry(5.5, 0.2, 7.2), 0x3f3b40, -2.2, 0.08, 0);
  const dark = mesh(new THREE.BoxGeometry(0.2, 3.2, 2.6), 0x0b0d10, -2.8, 1.7, 0);
  g.add(left, right, top, back, floor, dark);
  g.position.set(-25.5, 0, 6);
  world.scene.add(g);
  addCollider(-26.5, 2.3, 2.15);
  addCollider(-26.5, 9.7, 2.15);
  addCollider(-29.3, 6, 1.15);
}

function buildBridge() {
  const g = new THREE.Group();
  const z1 = -32.4, z2 = -42.2;
  const len = Math.abs(z2 - z1);
  const midZ = (z1 + z2) / 2;
  g.add(mesh(new THREE.BoxGeometry(2.15, 0.14, len + 0.3), 0x8b5a2b, 0, 0.16, 0));
  for (let i = 0; i <= 8; i++) {
    const zz = -len / 2 + (i / 8) * len;
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), 0x6b4a28, -1.05, 0.5, zz));
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), 0x6b4a28, 1.05, 0.5, zz));
  }
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.1, len + 0.2), 0x6b4a28, -1.05, 0.9, 0));
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.1, len + 0.2), 0x6b4a28, 1.05, 0.9, 0));
  g.position.set(0, 0, midZ);
  world.scene.add(g);
}

function buildSawah() {
  const geo = new THREE.PlaneGeometry(38, 34, 38, 34);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + SAWAH.x;
    const z = pos.getZ(i) + SAWAH.z;
    const sx = (x - SAWAH.x) / (SAWAH.rx + 1.2);
    const sz = (z - SAWAH.z) / (SAWAH.rz + 1.2);
    const e = sx * sx + sz * sz;
    let y = 0.02;
    if (e > 1) {
      y = -0.62;
      c.set(0x1a6f8a);
    } else if (e > 0.82) {
      y = 0.02;
      c.set(0xdcc57a);
    } else {
      const col = Math.round((x + 12) / 5);
      const row = Math.round((z + 66) / 4.2);
      const dike = Math.abs((x + 12) - col * 5) < 0.45 || Math.abs((z + 66) - row * 4.2) < 0.38;
      if (dike) {
        y = 0.1;
        c.set(0x8a6a3b);
      } else {
        y = -0.02;
        c.set((col + row) % 2 === 0 ? 0x5fa85a : 0x4f9a4e);
        if ((col + row) % 3 === 0) c.set(0x3d8f62);
      }
    }
    pos.setY(i, y);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.position.set(SAWAH.x, 0, SAWAH.z);
  world.scene.add(ground);

  const ring = mesh(new THREE.RingGeometry(15.2, 18.2, 48), mat(0x3aa0b5), SAWAH.x, -0.28, SAWAH.z);
  ring.rotation.x = -Math.PI / 2;
  world.scene.add(ring);

  buildBridge();

  const stalks = [];
  for (let k = 0; k < 90; k++) {
    const x = -13 + seeded(k + 200) * 26;
    const z = -66 + seeded(k + 260) * 24;
    const sx = (x - SAWAH.x) / SAWAH.rx;
    const sz = (z - SAWAH.z) / SAWAH.rz;
    if (sx * sx + sz * sz > 0.72) continue;
    if (Math.abs(x) < 1.4 && z > -46) continue;
    stalks.push({
      x, z, y: 0.32, s: 0.7 + seeded(k + 9) * 0.5,
      ry: seeded(k) * Math.PI, sy: 0.9 + seeded(k + 3) * 0.5,
    });
  }
  if (stalks.length) {
    placeInstanced(new THREE.ConeGeometry(0.12, 0.7, 5), mat(0xc5dc6a), stalks, (p) => p.y * (p.sy || 1));
  }

  // farmer hut
  makeHouse(7.6, -45.6, -0.3, 0xf3e2c4, 0xc4a35a, 2.6, 2.2, 1.7);

  // scarecrow
  const sc = new THREE.Group();
  sc.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.7, 6), 0x6b4a28, 0, 0.85, 0));
  sc.add(mesh(new THREE.BoxGeometry(1.15, 0.1, 0.1), 0x6b4a28, 0, 1.35, 0));
  sc.add(mesh(new THREE.BoxGeometry(0.45, 0.4, 0.25), 0xb45309, 0, 1.2, 0));
  sc.add(mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), 0xe8d48a, 0, 1.62, 0));
  sc.add(mesh(new THREE.ConeGeometry(0.28, 0.22, 7), 0xd6b15a, 0, 1.84, 0));
  sc.position.set(-9.2, 0, -59.4);
  world.scene.add(sc);
  addCollider(-9.2, -59.4, 0.5);

  makeSign('SAWAH', 0, -40.6, 0);
  makeSign('GUNUNG', 10.6, -59.2, Math.PI * 0.7);
  makeSign('JEMBATAN', 0, -29.4, 0);
}

function makeHoe() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.05, 6), 0x6b4a28, 0, 0.55, 0));
  const blade = mesh(new THREE.BoxGeometry(0.38, 0.06, 0.22), 0x64748b, 0.08, 0.08, 0);
  blade.rotation.z = 0.3;
  g.add(blade);
  return g;
}

function makeRoh(color) {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.7, 0.62, 0.62), color);
  body.position.y = 0.45;
  g.add(body);
  g.add(mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), 0xfde68a, -0.16, 0.55, 0.3));
  g.add(mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), 0xfde68a, 0.16, 0.55, 0.3));
  g.userData.body = body;
  return g;
}

function makePusaka() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.16, 0.42), 0xb45309, 0, 0.1, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8), 0xe8b84a, 0, 0.5, 0));
  g.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), 0xf5d76e, 0, 0.92, 0));
  g.add(mesh(new THREE.BoxGeometry(0.36, 0.06, 0.06), 0xf5d76e, 0, 0.92, 0));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.36), 0xf5d76e, 0, 0.92, 0));
  return g;
}

function buildStonePath() {
  const slabs = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const x = 11 + (18.5 - 11) * u;
    const z = -60 + (-70 + 60) * u;
    const y = groundHeight(x, z) + 0.05;
    slabs.push({ x, z, y, s: 1, ry: Math.atan2(18.5 - 11, -70 + 60) + (seeded(i + 4) - 0.5) * 0.2, sx: 1.1, sy: 0.18, sz: 0.85 });
  }
  placeInstanced(new THREE.BoxGeometry(1.3, 0.12, 1.0), mat(0x7c756c), slabs, (p) => p.y);
}

function buildGunung() {
  const geo = new THREE.CircleGeometry(GUNUNG.r + 1.6, 48);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i);
    const x = lx + GUNUNG.x;
    const z = lz + GUNUNG.z;
    const r = Math.hypot(lx, lz);
    let y = gunungHeight(x, z);
    if (r > GUNUNG.r + 0.2) {
      y = -0.62;
      c.set(0x1a6f8a);
    } else if (r > GUNUNG.r - 1.6) {
      c.set(0x8a8378);
    } else {
      c.set(0x6f7a68).lerp(new THREE.Color(0x9aa084), y / 4);
    }
    pos.setY(i, y);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.position.set(GUNUNG.x, 0, GUNUNG.z);
  world.scene.add(ground);

  buildStonePath();

  const rocks = [];
  for (let k = 0; k < 18; k++) {
    const ang = seeded(k + 400) * Math.PI * 2;
    const rad = 6 + seeded(k + 410) * 7;
    const x = GUNUNG.x + Math.cos(ang) * rad;
    const z = GUNUNG.z + Math.sin(ang) * rad;
    if (Math.hypot(x - 26, z + 80) < 4) continue;
    const s = 0.45 + seeded(k + 420) * 0.8;
    rocks.push({
      x, z, y: groundHeight(x, z) + 0.22 * s,
      s, ry: seeded(k) * Math.PI,
      sx: 0.8 + seeded(k + 1) * 0.5, sy: 0.5 + seeded(k + 2) * 0.7, sz: 0.8 + seeded(k + 3) * 0.5,
    });
  }
  if (rocks.length) {
    placeInstanced(new THREE.BoxGeometry(1, 0.8, 1), mat(0x6f6b72), rocks, (p) => p.y);
  }

  // candi bentar (split gate)
  const gateY = groundHeight(19.6, -70.6);
  const gate = new THREE.Group();
  const pillar = (sx) => {
    const p = new THREE.Group();
    p.add(mesh(new THREE.BoxGeometry(0.7, 3.2, 0.7), 0xc4b5a0, sx, 1.6, 0));
    p.add(mesh(new THREE.BoxGeometry(0.95, 0.28, 0.95), 0xb45309, sx, 3.25, 0));
    p.add(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), 0xc4b5a0, sx, 3.55, 0));
    return p;
  };
  gate.add(pillar(-1.35), pillar(1.35));
  gate.position.set(19.6, gateY, -70.6);
  gate.rotation.y = 0.7;
  world.scene.add(gate);
  addCollider(19.6 - Math.cos(0.7) * 1.35, -70.6 - Math.sin(0.7) * 1.35, 0.55);
  addCollider(19.6 + Math.cos(0.7) * 1.35, -70.6 + Math.sin(0.7) * 1.35, 0.55);

  // temple ruin (candi)
  const tx = 26, tz = -80.2;
  const ty = groundHeight(tx, tz);
  const candi = new THREE.Group();
  candi.add(mesh(new THREE.BoxGeometry(6.2, 0.55, 6.2), 0xc4b5a0, 0, 0.28, 0));
  candi.add(mesh(new THREE.BoxGeometry(4.6, 0.5, 4.6), 0xb9aa95, 0, 0.75, 0));
  candi.add(mesh(new THREE.BoxGeometry(3.2, 0.48, 3.2), 0xc4b5a0, 0, 1.2, 0));
  candi.add(mesh(new THREE.BoxGeometry(2.0, 1.3, 2.0), 0xb7a68e, 0, 2.05, 0));
  candi.add(mesh(new THREE.CylinderGeometry(0.55, 0.85, 0.7, 8), 0xd6c4a3, 0, 2.85, 0));
  candi.add(mesh(new THREE.ConeGeometry(0.7, 0.9, 8), 0xe8b84a, 0, 3.5, 0));
  // broken corner pillars
  candi.add(mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), 0xb9aa95, 2.5, 1.1, 2.5));
  candi.add(mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), 0xb9aa95, -2.5, 0.7, 2.5));
  candi.add(mesh(new THREE.BoxGeometry(0.4, 1.3, 0.4), 0xb9aa95, 2.5, 0.95, -2.5));
  candi.add(mesh(new THREE.BoxGeometry(0.4, 1.1, 0.4), 0xb9aa95, -2.5, 0.85, -2.5));
  candi.position.set(tx, ty, tz);
  world.scene.add(candi);
  addCollider(tx, tz, 2.2);

  // altar on the east side of the temple, reachable around the base
  const ax = 29.6, az = -80.6;
  const ay = groundHeight(ax, az);
  const altar = new THREE.Group();
  altar.add(mesh(new THREE.BoxGeometry(1.5, 0.35, 1.1), 0x8a7a66, 0, 0.18, 0));
  altar.add(mesh(new THREE.BoxGeometry(1.2, 0.12, 0.85), 0xc4b5a0, 0, 0.38, 0));
  altar.position.set(ax, ay, az);
  world.scene.add(altar);
  addCollider(ax, az, 0.7);

  // prasasti tablet
  const px = 23.3, pz = -74.8;
  const py = groundHeight(px, pz);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b9aa95';
  ctx.fillRect(0, 0, 256, 320);
  ctx.strokeStyle = '#5c4a32';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 244, 308);
  ctx.fillStyle = '#3b2a1a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('PRASASTI', 128, 52);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Urutan batu:', 128, 110);
  ctx.fillStyle = '#15803d';
  ctx.fillText('1. HIJAU', 128, 165);
  ctx.fillStyle = '#a16207';
  ctx.fillText('2. KUNING', 128, 215);
  ctx.fillStyle = '#b91c1c';
  ctx.fillText('3. MERAH', 128, 265);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const tab = new THREE.Group();
  tab.add(mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), 0x6b4a28, 0, 0.55, 0));
  tab.add(mesh(new THREE.BoxGeometry(0.9, 1.15, 0.08), 0xb9aa95, 0, 1.4, 0));
  const face = mesh(new THREE.PlaneGeometry(0.82, 1.05), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }), 0, 1.4, 0.05);
  tab.add(face);
  tab.position.set(px, py, pz);
  tab.rotation.y = 0.3;
  world.scene.add(tab);

  makeSign('GUNUNG', 16.2, -67.5, 0.6);
}

function spawnHoe() {
  const h = makeHoe();
  h.position.set(-12.5, 0, -61.2);
  applyGroundY(h, 0);
  h.userData.kind = 'hoe';
  if (save.hoeTaken) h.visible = false;
  world.scene.add(h);
  world.hoe = h;
}

function spawnPusaka() {
  const g = makePusaka();
  g.position.set(29.6, 0, -80.6);
  applyGroundY(g, 0.42);
  g.userData.kind = 'pusaka';
  if (save.pusakaTaken) g.visible = false;
  world.scene.add(g);
  world.pusaka = g;
}

function spawnPuzzleStones() {
  const specs = [
    { id: 'hijau', color: 0x22c55e, x: 24.2, z: -73.0 },
    { id: 'kuning', color: 0xeab308, x: 27.3, z: -75.0 },
    { id: 'merah', color: 0xdc2626, x: 21.0, z: -75.2 },
  ];
  world.stones = specs.map((s) => {
    const g = new THREE.Group();
    const ped = mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.28, 8), 0x7c756c);
    const lit = new THREE.MeshLambertMaterial({ color: s.color, emissive: 0x000000, emissiveIntensity: 0 });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), lit);
    orb.position.y = 0.55;
    g.add(ped, orb);
    g.position.set(s.x, 0, s.z);
    applyGroundY(g, 0);
    g.userData.id = s.id;
    g.userData.kind = 'stone';
    g.userData.orb = orb;
    g.userData.lit = lit;
    world.scene.add(g);
    addCollider(s.x, s.z, 0.4);
    return g;
  });
  applyPuzzleVisual();
}

function applyPuzzleVisual() {
  const step = save.puzzleDone ? PUZZLE_ORDER.length : (save.puzzleStep || 0);
  for (const g of world.stones) {
    const on = save.puzzleDone || PUZZLE_ORDER.slice(0, step).includes(g.userData.id);
    g.userData.lit.emissive.setHex(on ? 0xffffff : 0x000000);
    g.userData.lit.emissiveIntensity = on ? 0.45 : 0;
  }
}

const ROH_SPOTS = [
  [22.2, -78.4],
  [28.4, -77.2],
  [23.5, -82.6],
  [28.8, -81.5],
];

function spawnRohs() {
  const colors = [0x57534e, 0x78716c, 0x44403c, 0x6b6560];
  world.rohs = ROH_SPOTS.map(([x, z], i) => {
    const r = makeRoh(colors[i]);
    r.position.set(x, 0, z);
    applyGroundY(r, 0);
    r.userData.id = 'r' + i;
    r.userData.homeX = x;
    r.userData.homeZ = z;
    r.userData.angle = seeded(i + 9) * Math.PI * 2;
    r.userData.phase = i * 1.1;
    r.userData.alive = !save.defeatedRoh['r' + i];
    r.visible = r.userData.alive;
    world.scene.add(r);
    return r;
  });
}

function buildLights() {
  const hemi = new THREE.HemisphereLight(0xc9e8f5, 0x7a5a28, 0.95);
  world.scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1c9, 0.95);
  sun.position.set(28, 42, 18);
  world.scene.add(sun);
  const sunBall = mesh(new THREE.SphereGeometry(2.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a }), 40, 28, 22);
  world.scene.add(sunBall);
}

/* -------------------- entities -------------------- */
function spawnPlayer() {
  const p = makePerson({
    shirt: 0x2a9d8f,
    pants: 0x1d3557,
    skin: 0xe0ac69,
    hair: 0x3b2a1a,
  });
  p.position.set(save.px, 0, save.pz);
  p.rotation.y = save.rot;
  world.scene.add(p);
  world.player = p;
  world.limbs = p.userData.limbs;
}

function spawnNpcs() {
  const list = [
    {
      id: 'kades',
      name: 'Pak Kades',
      x: -2.2, z: -6.4, rot: 0.4,
      look: { shirt: 0xf5f0e6, pants: 0x1f2937, skin: 0xc9956b, hair: 0x4b3b2a, hat: 'peci' },
    },
    {
      id: 'sari',
      name: 'Bu Sari',
      x: 4.0, z: -8.2, rot: -0.6,
      look: { shirt: 0xdb2777, pants: 0x831843, skin: 0xe0ac69, hair: 0x1c1410, hat: 'bun' },
    },
    {
      id: 'udin',
      name: 'Nelayan Udin',
      x: 2.0, z: 20.4, rot: 0.2,
      look: { shirt: 0x2563eb, pants: 0x1e3a5f, skin: 0xb8874e, hair: 0x1c1410, hat: 'cap' },
    },
    {
      id: 'penjaga',
      name: 'Penjaga Gua',
      x: -17.2, z: 6.0, rot: Math.PI / 2,
      look: { shirt: 0x57534e, pants: 0x292524, skin: 0xc9956b, hair: 0x1c1410, hat: 'band' },
    },
    {
      id: 'tani',
      name: 'Pak Tani',
      x: -3.5, z: -49.2, rot: 0.5,
      look: { shirt: 0x7c3f14, pants: 0x365314, skin: 0xc9956b, hair: 0x4b3b2a, hat: 'caping' },
    },
    {
      id: 'rina',
      name: 'Mbak Rina',
      x: 5.4, z: -48.4, rot: -0.7,
      look: { shirt: 0xea580c, pants: 0x9a3412, skin: 0xe0ac69, hair: 0x1c1410, hat: 'bun' },
    },
    {
      id: 'karya',
      name: 'Mbah Karya',
      x: 21.2, z: -75.6, rot: -0.4,
      look: { shirt: 0xf5f0e6, pants: 0x57534e, skin: 0xc9956b, hair: 0x9ca3af, hat: 'udeng' },
    },
    {
      id: 'andi',
      name: 'Kak Andi',
      x: 17.4, z: -68.8, rot: 0.8,
      look: { shirt: 0x0f766e, pants: 0x1e3a5f, skin: 0xb8874e, hair: 0x1c1410, hat: 'cap' },
    },
  ];
  world.npcs = list.map((spec) => {
    const p = makePerson(spec.look);
    p.position.set(spec.x, groundHeight(spec.x, spec.z), spec.z);
    p.rotation.y = spec.rot;
    p.userData.id = spec.id;
    p.userData.name = spec.name;
    p.userData.kind = 'npc';
    world.scene.add(p);
    addCollider(spec.x, spec.z, 0.55);
    return p;
  });
}

const COIN_SPOTS = [
  [2.5, -3.5], [-5.5, -7.8], [1.5, -12], [9.5, -7],
  [16, -10], [21, -15], [24, -6], [14, -20],
  [8, 14], [-4, 16], [12, 20], [-10, 18], [0, 23],
  [-18, 10], [-20, 1], [-13, -2], [6, 6], [-6, 8],
  [-6, -52], [4, -57], [-11, -56], [8, -50],
  [20, -73], [28, -76], [22, -81],
];

function spawnCoins() {
  world.coins = COIN_SPOTS.map(([x, z], i) => {
    const g = new THREE.Group();
    const c = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10), mat(0xe8b84a));
    c.rotation.x = Math.PI / 2;
    g.add(c);
    g.position.set(x, groundHeight(x, z) + 0.55, z);
    g.userData.id = 'c' + i;
    g.userData.phase = i * 0.7;
    if (save.collectedCoins[g.userData.id]) g.visible = false;
    world.scene.add(g);
    return g;
  });
}

function spawnBasket() {
  const b = makeBasket();
  b.position.set(20.2, 0, -18.1);
  b.userData.kind = 'basket';
  if (save.basketTaken) b.visible = false;
  world.scene.add(b);
  world.basket = b;
}

function spawnChest() {
  const c = makeChest();
  c.position.set(-27.4, 0, 6);
  c.rotation.y = Math.PI / 2;
  c.userData.kind = 'chest';
  if (save.treasureTaken) c.visible = false;
  world.scene.add(c);
  world.chest = c;
}

const SLIME_SPOTS = [
  [-22.0, 3.2],
  [-23.6, 9.4],
  [-21.2, 7.2],
  [-24.8, 4.0],
  [-19.8, 9.8],
];

function spawnSlimes() {
  const colors = [0x65a30d, 0x4d7c0f, 0x84cc16, 0x3f6212, 0x70a012];
  world.slimes = SLIME_SPOTS.map(([x, z], i) => {
    const s = makeSlime(colors[i]);
    s.position.set(x, 0, z);
    s.userData.id = 's' + i;
    s.userData.homeX = x;
    s.userData.homeZ = z;
    s.userData.angle = seeded(i + 3) * Math.PI * 2;
    s.userData.phase = i * 1.3;
    s.userData.alive = !save.defeatedSlimes['s' + i];
    s.visible = s.userData.alive;
    world.scene.add(s);
    return s;
  });
}

function buildWorld() {
  buildLights();
  buildIsland();
  buildTrees();
  buildRocksAndGrass();
  buildVillage();
  buildBeach();
  buildCave();
  buildSawah();
  buildGunung();
  spawnPlayer();
  spawnNpcs();
  spawnCoins();
  spawnBasket();
  spawnChest();
  spawnSlimes();
  spawnHoe();
  spawnPuzzleStones();
  spawnRohs();
  spawnPusaka();
}

/* -------------------- save / ui -------------------- */
function persist(partial) {
  save = { ...save, ...partial, px: world.player ? world.player.position.x : save.px, pz: world.player ? world.player.position.z : save.pz, rot: world.player ? world.player.rotation.y : save.rot };
  writeSave(save);
  refreshHud();
}

function refreshHud() {
  ui.coinCount.textContent = String(save.coins);
  const lines = [];
  if (save.quests.kades === 'active') lines.push('Kumpulkan koin (' + Math.min(save.coins, 10) + '/10)');
  if (save.quests.sari === 'active') {
    lines.push(save.basketTaken ? 'Kembalikan keranjang ke Bu Sari' : 'Temukan keranjang di hutan');
  }
  if (save.quests.udin === 'active') {
    lines.push(save.inventory.includes('ikan') ? 'Antar ikan ke Warung Desa' : 'Ambil ikan dari Nelayan Udin');
  }
  if (save.quests.gua === 'active') {
    if (save.slimesDefeated < 5) lines.push('Kalahkan slime (' + save.slimesDefeated + '/5)');
    else if (!save.treasureTaken) lines.push('Ambil harta karun di dalam gua');
  }
  if (save.quests.tani === 'active') {
    lines.push(save.hoeTaken ? 'Kembalikan cangkul ke Pak Tani' : 'Temukan cangkul di pojok sawah');
  }
  if (save.quests.rina === 'active') {
    lines.push(save.bekalDelivered ? 'Kembali ke Mbak Rina' : 'Antar bekal ke Mbah Karya di gunung');
  }
  if (save.quests.prasasti === 'active') {
    lines.push(save.puzzleDone ? 'Bicara lagi dengan Mbah Karya' : 'Sentuh batu: hijau, kuning, merah');
  }
  if (save.quests.roh === 'active') {
    if (save.rohDefeated < 4) lines.push('Kalahkan roh batu (' + save.rohDefeated + '/4)');
    else if (!save.pusakaTaken) lines.push('Ambil Pusaka Nusantara di altar');
  }
  if (!lines.length) {
    ui.missions.innerHTML = '<p>Bicara dengan warga untuk menerima misi.</p>';
  } else {
    ui.missions.innerHTML = lines.map((l) => '<p>• ' + l + '</p>').join('');
  }
  renderInventory();
}

function renderInventory() {
  const items = [];
  items.push('Koin: ' + save.coins);
  save.inventory.forEach((id) => items.push(ITEM_NAMES[id] || id));
  if (save.inventory.length === 0 && save.coins === 0) {
    ui.invList.innerHTML = '<li class="empty">Tas masih kosong.</li>';
  } else {
    ui.invList.innerHTML = items.map((t) => '<li>' + t + '</li>').join('');
  }
}

function showToast(text) {
  ui.toast.textContent = text;
  ui.toast.hidden = false;
  world.toastT = 2.3;
}

function setPrompt(text) {
  if (!text) {
    ui.prompt.hidden = true;
    ui.prompt.textContent = '';
    return;
  }
  ui.prompt.textContent = text;
  ui.prompt.hidden = false;
}

function areaAt(x, z) {
  if (z < -66 || (x > 13 && z < -62)) return 'Gunung';
  if (z < -38) return 'Sawah';
  if (x < -14 && z > -10 && z < 16) return 'Gua';
  if (z > 11) return 'Pantai';
  if (x > 10 && z < 9 && z > -28) return 'Hutan';
  return 'Desa';
}

/* -------------------- dialogs & quests -------------------- */
function closeDialog() {
  ui.dialog.hidden = true;
  ui.dialogActions.innerHTML = '';
  world.blocked = false;
  layoutControls();
}

function openDialog(name, text, actions) {
  world.blocked = true;
  world.joy.active = false;
  world.joy.x = 0;
  world.joy.y = 0;
  ui.controls.hidden = true;
  ui.dialogName.textContent = name;
  ui.dialogText.textContent = text;
  ui.dialogActions.innerHTML = '';
  actions.forEach((a) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (a.primary ? ' primary' : '');
    b.textContent = a.label;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      a.fn();
    });
    ui.dialogActions.appendChild(b);
  });
  ui.dialog.hidden = false;
}

function talkTo(npc) {
  const id = npc.userData.id;
  if (id === 'kades') talkKades();
  else if (id === 'sari') talkSari();
  else if (id === 'udin') talkUdin();
  else if (id === 'penjaga') talkPenjaga();
  else if (id === 'tani') talkTani();
  else if (id === 'rina') talkRina();
  else if (id === 'karya') talkKarya();
  else if (id === 'andi') talkAndi();
}

function talkKades() {
  const q = save.quests.kades;
  if (q === 'idle') {
    openDialog('Pak Kades', 'Ah, selamat datang di Desa Bahari, nak. Pulau ini damai, tapi kami butuh bantuan. Kumpulkan 10 koin yang tersebar di desa, hutan, pantai, dan sekitar gua, ya.', [
      { label: 'Baik, Pak', primary: true, fn: () => { persist({ quests: { ...save.quests, kades: 'active' } }); showToast('Misi baru: kumpulkan 10 koin.'); closeDialog(); } },
      { label: 'Nanti saja', fn: closeDialog },
    ]);
  } else if (q === 'active' && save.coins < 10) {
    openDialog('Pak Kades', 'Koinnya masih kurang. Sekarang kau punya ' + save.coins + ' dari 10. Cari di pantai, hutan, dan sekitar desa.', [
      { label: 'Baik', primary: true, fn: closeDialog },
    ]);
  } else if (q === 'active') {
    openDialog('Pak Kades', 'Hebat! 10 koin sudah terkumpul. Terima kasih, desa kami jadi terbantu.', [
      { label: 'Sama-sama', primary: true, fn: () => { persist({ quests: { ...save.quests, kades: 'done' } }); showToast('Misi Pak Kades selesai.'); closeDialog(); maybeWin(); } },
    ]);
  } else {
    openDialog('Pak Kades', 'Terima kasih sudah membantu desa. Ada jembatan baru ke utara, menuju sawah dan gunung. Hutan di timur, pantai di selatan, dan gua di barat juga menanti.', [
      { label: 'Baik, Pak', primary: true, fn: closeDialog },
    ]);
  }
}

function talkSari() {
  const q = save.quests.sari;
  if (q === 'idle') {
    openDialog('Bu Sari', 'Aduh, keranjang belanjaku tertinggal di hutan sebelah timur. Tolong carikan, nak? Ada di dekat pohon besar di tengah hutan.', [
      { label: 'Saya carikan', primary: true, fn: () => { persist({ quests: { ...save.quests, sari: 'active' } }); showToast('Misi baru: temukan keranjang di hutan.'); closeDialog(); } },
      { label: 'Nanti saja', fn: closeDialog },
    ]);
  } else if (q === 'active' && !save.basketTaken) {
    openDialog('Bu Sari', 'Keranjangnya di dalam hutan, dekat pohon yang lebih besar. Hati-hati tersesat ya.', [
      { label: 'Saya cari lagi', primary: true, fn: closeDialog },
    ]);
  } else if (q === 'active' && save.basketTaken) {
    openDialog('Bu Sari', 'Oh, ini dia keranjangku! Terima kasih banyak, kau baik sekali.', [
      { label: 'Sama-sama, Bu', primary: true, fn: () => {
        const inv = save.inventory.filter((x) => x !== 'keranjang');
        persist({ inventory: inv, quests: { ...save.quests, sari: 'done' } });
        showToast('Misi Bu Sari selesai.');
        closeDialog();
        maybeWin();
      } },
    ]);
  } else {
    openDialog('Bu Sari', 'Keranjangnya sudah kembali. Kalau ke pantai, sapa Nelayan Udin ya. Beliau sering butuh bantuan mengantar ikan.', [
      { label: 'Baik, Bu', primary: true, fn: closeDialog },
    ]);
  }
}

function talkUdin() {
  const q = save.quests.udin;
  if (q === 'idle') {
    openDialog('Nelayan Udin', 'Hasil tangkapan hari ini bagus! Tolong antarkan ikan segar ini ke Warung Desa, di kampung dekat rumah Bu Sari.', [
      { label: 'Saya antar', primary: true, fn: () => {
        const inv = save.inventory.includes('ikan') ? save.inventory : [...save.inventory, 'ikan'];
        persist({ inventory: inv, quests: { ...save.quests, udin: 'active' } });
        showToast('Ikan masuk ke tas. Antarkan ke Warung Desa.');
        closeDialog();
      } },
      { label: 'Nanti saja', fn: closeDialog },
    ]);
  } else if (q === 'active' && save.inventory.includes('ikan')) {
    openDialog('Nelayan Udin', 'Warungnya di desa, dekat rumah Bu Sari. Antarkan sebelum siang ya, ikannya masih segar.', [
      { label: 'Menuju warung', primary: true, fn: closeDialog },
    ]);
  } else if (q === 'active') {
    openDialog('Nelayan Udin', 'Ikan sudah kau bawa ke warung? Kalau belum, ambil lagi di peti sebelahku.', [
      { label: 'Baik', primary: true, fn: () => {
        if (!save.inventory.includes('ikan')) {
          persist({ inventory: [...save.inventory, 'ikan'] });
          showToast('Ikan kembali masuk ke tas.');
        }
        closeDialog();
      } },
    ]);
  } else {
    openDialog('Nelayan Udin', 'Ikan sudah sampai di warung. Syukurlah. Terima kasih, nak. Laut hari ini tenang, silakan jalan-jalan di pantai.', [
      { label: 'Sama-sama', primary: true, fn: closeDialog },
    ]);
  }
}

function talkPenjaga() {
  const q = save.quests.gua;
  if (q === 'idle') {
    openDialog('Penjaga Gua', 'Gua ini menyimpan harta karun pulau. Tapi 5 slime menjaga kawasannya. Mereka tidak berbahaya, cukup kalahkan dengan tombol Aksi saat kau dekat, lalu ambil hartanya.', [
      { label: 'Saya siapkan', primary: true, fn: () => { persist({ quests: { ...save.quests, gua: 'active' } }); showToast('Misi baru: kalahkan 5 slime, lalu ambil harta karun.'); closeDialog(); } },
      { label: 'Nanti saja', fn: closeDialog },
    ]);
  } else if (q === 'active' && save.slimesDefeated < 5) {
    openDialog('Penjaga Gua', 'Slime yang menjaga gua masih ada. Kalahkan dengan tombol Aksi saat berada di dekatnya. Sekarang ' + save.slimesDefeated + ' dari 5.', [
      { label: 'Baik', primary: true, fn: closeDialog },
    ]);
  } else if (q === 'active' && !save.treasureTaken) {
    openDialog('Penjaga Gua', 'Bagus, slimenya sudah pergi. Masuk ke gua dan ambil harta karun itu. Petinya ada di dalam, di belakang lorong gelap.', [
      { label: 'Masuk gua', primary: true, fn: closeDialog },
    ]);
  } else {
    openDialog('Penjaga Gua', 'Kau layak membawa harta itu. Pulau ini berutang padamu, petualang.', [
      { label: 'Terima kasih', primary: true, fn: closeDialog },
    ]);
  }
}

function talkTani() {
  const q = save.quests.tani;
  if (q === 'idle') {
    openDialog('Pak Tani', 'Wah, ada tamu di sawah. Cangkulku tertinggal di pojok barat, dekat orang-orangan sawah. Tolong ambilkan, nak?', [
      { label: 'Saya ambilkan', primary: true, fn: () => { persist({ quests: { ...save.quests, tani: 'active' } }); showToast('Misi baru: temukan cangkul di pojok sawah.'); closeDialog(); } },
      { label: 'Nanti saja', fn: closeDialog },
    ]);
  } else if (q === 'active' && !save.hoeTaken) {
    openDialog('Pak Tani', 'Cangkulnya di ujung barat sawah, dekat orang-orangan. Kalau sudah ketemu, bawa ke sini ya.', [
      { label: 'Baik, Pak', primary: true, fn: closeDialog },
    ]);
  } else if (q === 'active' && save.hoeTaken) {
    openDialog('Pak Tani', 'Ini dia cangkulku! Terima kasih banyak. Ini seikat padi untukmu, sebagai tanda terima kasih.', [
      { label: 'Terima kasih, Pak', primary: true, fn: () => {
        let inv = save.inventory.filter((x) => x !== 'cangkul');
        if (!inv.includes('padi')) inv = [...inv, 'padi'];
        persist({ inventory: inv, quests: { ...save.quests, tani: 'done' } });
        showToast('Misi Pak Tani selesai. Kau mendapat seikat padi.');
        closeDialog();
        maybeWin();
      } },
    ]);
  } else {
    openDialog('Pak Tani', 'Padi tahun ini subur berkat bantuanmu. Kalau ke gunung, ikuti jalan batu ke timur laut, dan hati-hati di jalur menanjak ya.', [
      { label: 'Baik, Pak', primary: true, fn: closeDialog },
    ]);
  }
}

function talkRina() {
  const q = save.quests.rina;
  if (q === 'idle') {
    openDialog('Mbak Rina', 'Mbah Karya di kuil gunung belum makan sejak pagi. Tolong antarkan bekal ini ke beliau, ya? Ikuti jalan batu ke arah gunung.', [
      { label: 'Saya antar', primary: true, fn: () => {
        const inv = save.inventory.includes('bekal') ? save.inventory : [...save.inventory, 'bekal'];
        persist({ inventory: inv, quests: { ...save.quests, rina: 'active' } });
        showToast('Bekal masuk ke tas. Antarkan ke Mbah Karya di gunung.');
        closeDialog();
      } },
      { label: 'Nanti saja', fn: closeDialog },
    ]);
  } else if (q === 'active' && !save.bekalDelivered) {
    openDialog('Mbak Rina', 'Kuilnya di puncak gunung, di balik gapura batu. Mbah Karya biasanya menunggu di pelataran.', [
      { label: 'Menuju gunung', primary: true, fn: closeDialog },
    ]);
  } else if (q === 'active' && save.bekalDelivered) {
    openDialog('Mbak Rina', 'Bekalnya sudah sampai? Syukurlah. Terima kasih banyak, kau baik sekali.', [
      { label: 'Sama-sama, Mbak', primary: true, fn: () => {
        persist({ quests: { ...save.quests, rina: 'done' } });
        showToast('Misi Mbak Rina selesai.');
        closeDialog();
        maybeWin();
      } },
    ]);
  } else {
    openDialog('Mbak Rina', 'Mbah Karya pasti senang. Kalau ke kuil lagi, perhatikan prasasti di pelataran ya.', [
      { label: 'Baik', primary: true, fn: closeDialog },
    ]);
  }
}

function talkKarya() {
  const q = save.quests.prasasti;
  if (save.quests.rina === 'active' && save.inventory.includes('bekal') && !save.bekalDelivered) {
    openDialog('Mbah Karya', 'Wah, bekal dari Mbak Rina? Terima kasih, nak. Perutku sudah keroncongan sejak pagi. Kau boleh sampaikan kabar ini ke Rina, atau bantu kuil ini lebih dulu.', [
      { label: 'Sama-sama, Mbah', primary: true, fn: () => {
        persist({ inventory: save.inventory.filter((x) => x !== 'bekal'), bekalDelivered: true });
        showToast('Bekal disampaikan ke Mbah Karya.');
        closeDialog();
      } },
    ]);
    return;
  }
  if (q === 'idle') {
    openDialog('Mbah Karya', 'Prasasti kuil meredup. Sentuh tiga batu di pelataran sesuai urutan yang tertulis: hijau, kuning, lalu merah. Kalau salah, mulai lagi dari awal.', [
      { label: 'Saya coba', primary: true, fn: () => { persist({ quests: { ...save.quests, prasasti: 'active' }, puzzleStep: 0 }); showToast('Misi baru: sentuh batu hijau, kuning, lalu merah.'); closeDialog(); } },
      { label: 'Nanti saja', fn: closeDialog },
    ]);
  } else if (q === 'active' && !save.puzzleDone) {
    openDialog('Mbah Karya', 'Urutannya tertulis di prasasti: hijau, kuning, lalu merah. Sentuh batu itu dengan tombol Aksi. Sekarang langkah ke-' + (save.puzzleStep + 1) + '.', [
      { label: 'Baik, Mbah', primary: true, fn: closeDialog },
    ]);
  } else if (q === 'active' && save.puzzleDone) {
    openDialog('Mbah Karya', 'Genta kuno kembali berbunyi. Terimalah genta ini sebagai tanda. Tapi roh pelindung di sekitar altar masih gelisah. Sapa Kak Andi di gapura ya.', [
      { label: 'Terima kasih, Mbah', primary: true, fn: () => {
        const inv = save.inventory.includes('genta') ? save.inventory : [...save.inventory, 'genta'];
        persist({ inventory: inv, quests: { ...save.quests, prasasti: 'done' } });
        showToast('Misi prasasti selesai. Kau mendapat genta kuno.');
        closeDialog();
        maybeWin();
      } },
    ]);
  } else {
    openDialog('Mbah Karya', 'Kuil ini tenang berkat bantuanmu. Jagalah pusaka pulau dengan hati yang jernih, nak.', [
      { label: 'Baik, Mbah', primary: true, fn: closeDialog },
    ]);
  }
}

function talkAndi() {
  const q = save.quests.roh;
  if (q === 'idle') {
    openDialog('Kak Andi', 'Empat roh batu menjaga altar di samping kuil. Mereka tidak berbahaya, cukup kalahkan dengan tombol Aksi saat kau dekat, lalu ambil Pusaka Nusantara di altar.', [
      { label: 'Saya siapkan', primary: true, fn: () => { persist({ quests: { ...save.quests, roh: 'active' } }); showToast('Misi baru: kalahkan 4 roh batu, lalu ambil pusaka.'); closeDialog(); } },
      { label: 'Nanti saja', fn: closeDialog },
    ]);
  } else if (q === 'active' && save.rohDefeated < 4) {
    openDialog('Kak Andi', 'Roh batu masih berkeliaran di pelataran dan belakang kuil. Kalahkan dengan tombol Aksi. Sekarang ' + save.rohDefeated + ' dari 4.', [
      { label: 'Baik', primary: true, fn: closeDialog },
    ]);
  } else if (q === 'active' && !save.pusakaTaken) {
    openDialog('Kak Andi', 'Rohnya sudah tenang. Pergi ke altar di samping kuil dan ambil Pusaka Nusantara.', [
      { label: 'Menuju altar', primary: true, fn: closeDialog },
    ]);
  } else {
    openDialog('Kak Andi', 'Pusaka Nusantara ada di tanganmu. Kau penjaga yang layak. Pulau ini lebih aman sekarang.', [
      { label: 'Terima kasih', primary: true, fn: closeDialog },
    ]);
  }
}

function useWarung() {
  if (save.quests.udin === 'active' && save.inventory.includes('ikan')) {
    openDialog('Warung Desa', 'Kau mengantar ikan dari Nelayan Udin. Ikan segar ini akan segera dimasak untuk warga desa. Terima kasih!', [
      { label: 'Sama-sama', primary: true, fn: () => {
        persist({ inventory: save.inventory.filter((x) => x !== 'ikan'), quests: { ...save.quests, udin: 'done' } });
        showToast('Misi Nelayan Udin selesai.');
        closeDialog();
        maybeWin();
      } },
    ]);
  } else if (save.quests.udin === 'done') {
    openDialog('Warung Desa', 'Ikan dari Udin sudah diterima. Warung ini buka setiap pagi.', [
      { label: 'Baik', primary: true, fn: closeDialog },
    ]);
  } else {
    openDialog('Warung Desa', 'Warung Desa menunggu kiriman ikan segar dari pantai. Coba sapa Nelayan Udin di tepi laut.', [
      { label: 'Baik', primary: true, fn: closeDialog },
    ]);
  }
}

function tryTakeTreasure() {
  if (save.treasureTaken) return;
  if (save.quests.gua !== 'active') {
    showToast('Bicara dulu dengan Penjaga Gua.');
    return;
  }
  if (save.slimesDefeated < 5) {
    showToast('Kalahkan 5 slime terlebih dahulu! (' + save.slimesDefeated + '/5)');
    return;
  }
  world.chest.visible = false;
  const inv = save.inventory.includes('harta') ? save.inventory : [...save.inventory, 'harta'];
  persist({ inventory: inv, treasureTaken: true, quests: { ...save.quests, gua: 'done' } });
  showToast('Harta karun didapat!');
  maybeWin();
}

function allQuestsDone() {
  const q = save.quests;
  return q.kades === 'done' && q.sari === 'done' && q.udin === 'done' && q.gua === 'done'
    && q.tani === 'done' && q.rina === 'done' && q.prasasti === 'done' && q.roh === 'done'
    && save.treasureTaken && save.pusakaTaken;
}

function maybeWin() {
  if (!allQuestsDone() || save.won) return;
  persist({ won: true });
  world.wonShown = true;
  world.blocked = true;
  ui.win.hidden = false;
  ui.controls.hidden = true;
}

/* -------------------- interaction -------------------- */
function dist2(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
}

function nearestOf(list, range, pred) {
  const p = world.player.position;
  let best = null, bestD = range * range;
  for (const obj of list) {
    if (pred && !pred(obj)) continue;
    const d = dist2(p.x, p.z, obj.position.x, obj.position.z);
    if (d < bestD) { bestD = d; best = obj; }
  }
  return best;
}

function pickupNearby() {
  const p = world.player.position;
  for (const c of world.coins) {
    if (!c.visible) continue;
    if (dist2(p.x, p.z, c.position.x, c.position.z) < 1.15 * 1.15) {
      c.visible = false;
      const collected = { ...save.collectedCoins, [c.userData.id]: true };
      persist({ coins: save.coins + 1, collectedCoins: collected });
      showToast('Koin didapat! (' + save.coins + ')');
    }
  }
  if (world.basket.visible && dist2(p.x, p.z, world.basket.position.x, world.basket.position.z) < 1.6 * 1.6) {
    world.basket.visible = false;
    const inv = save.inventory.includes('keranjang') ? save.inventory : [...save.inventory, 'keranjang'];
    persist({ inventory: inv, basketTaken: true });
    if (save.quests.sari === 'active') showToast('Keranjang ditemukan. Kembalikan ke Bu Sari.');
    else showToast('Keranjang ditemukan. Bawa ke Bu Sari di desa.');
  }
  if (world.hoe && world.hoe.visible && dist2(p.x, p.z, world.hoe.position.x, world.hoe.position.z) < 1.6 * 1.6) {
    world.hoe.visible = false;
    const inv = save.inventory.includes('cangkul') ? save.inventory : [...save.inventory, 'cangkul'];
    persist({ inventory: inv, hoeTaken: true });
    if (save.quests.tani === 'active') showToast('Cangkul ditemukan. Kembalikan ke Pak Tani.');
    else showToast('Cangkul ditemukan. Bawa ke Pak Tani di sawah.');
  }
}

function targetInteract() {
  const npc = nearestOf(world.npcs, 2.3);
  if (npc) return { type: 'npc', obj: npc, label: 'Bicara dengan ' + npc.userData.name };
  if (world.chest.visible && dist2(world.player.position.x, world.player.position.z, world.chest.position.x, world.chest.position.z) < 2.2 * 2.2) {
    return { type: 'chest', obj: world.chest, label: 'Ambil harta karun' };
  }
  if (world.pusaka && world.pusaka.visible && dist2(world.player.position.x, world.player.position.z, world.pusaka.position.x, world.pusaka.position.z) < 2.5 * 2.5) {
    return { type: 'pusaka', obj: world.pusaka, label: 'Ambil Pusaka Nusantara' };
  }
  const stone = nearestOf(world.stones, 1.85);
  if (stone) return { type: 'stone', obj: stone, label: 'Sentuh batu ' + stone.userData.id };
  const w = world.warung;
  if (w && dist2(world.player.position.x, world.player.position.z, w.position.x, w.position.z) < 2.4 * 2.4) {
    return { type: 'warung', obj: w, label: 'Antar ke Warung Desa' };
  }
  const roh = nearestOf(world.rohs, 1.95, (s) => s.userData.alive);
  if (roh) return { type: 'roh', obj: roh, label: 'Serang roh batu' };
  const slime = nearestOf(world.slimes, 1.9, (s) => s.userData.alive);
  if (slime) return { type: 'slime', obj: slime, label: 'Serang slime' };
  return null;
}

function doAction() {
  if (!world.playing) return;
  if (!ui.dialog.hidden) {
    const first = ui.dialogActions.querySelector('button');
    if (first) first.click();
    return;
  }
  if (!ui.inv.hidden) { closeInv(); return; }
  if (!ui.win.hidden) return;
  const t = targetInteract();
  if (!t) return;
  if (t.type === 'npc') talkTo(t.obj);
  else if (t.type === 'warung') useWarung();
  else if (t.type === 'chest') tryTakeTreasure();
  else if (t.type === 'pusaka') tryTakePusaka();
  else if (t.type === 'stone') touchStone(t.obj);
  else if (t.type === 'roh') attackRoh(t.obj);
  else if (t.type === 'slime') attackSlime(t.obj);
}

function attackSlime(slime) {
  if (world.attackT > 0 || !slime.userData.alive) return;
  world.attackT = 0.45;
  world.attackAnim = 0.35;
  slime.userData.alive = false;
  slime.scale.set(1.35, 0.25, 1.35);
  const id = slime.userData.id;
  const defeated = { ...save.defeatedSlimes, [id]: true };
  const n = save.slimesDefeated + 1;
  persist({ defeatedSlimes: defeated, slimesDefeated: n });
  showToast('Slime kalah! (' + n + '/5)');
  setTimeout(() => { slime.visible = false; }, 220);
}

function attackRoh(roh) {
  if (world.attackT > 0 || !roh.userData.alive) return;
  world.attackT = 0.45;
  world.attackAnim = 0.35;
  roh.userData.alive = false;
  roh.scale.set(1.35, 0.25, 1.35);
  const id = roh.userData.id;
  const defeated = { ...save.defeatedRoh, [id]: true };
  const n = save.rohDefeated + 1;
  persist({ defeatedRoh: defeated, rohDefeated: n });
  showToast('Roh batu kalah! (' + n + '/4)');
  setTimeout(() => { roh.visible = false; }, 220);
}

function touchStone(stone) {
  if (save.puzzleDone) {
    showToast('Prasasti sudah menyala.');
    return;
  }
  if (save.quests.prasasti !== 'active') {
    showToast('Bicara dulu dengan Mbah Karya.');
    return;
  }
  const need = PUZZLE_ORDER[save.puzzleStep || 0];
  if (stone.userData.id === need) {
    const step = (save.puzzleStep || 0) + 1;
    const done = step >= PUZZLE_ORDER.length;
    persist({ puzzleStep: step, puzzleDone: done });
    applyPuzzleVisual();
    if (done) showToast('Semua batu menyala! Bicara lagi dengan Mbah Karya.');
    else showToast('Batu ' + stone.userData.id + ' benar. (' + step + '/3)');
  } else {
    persist({ puzzleStep: 0, puzzleDone: false });
    applyPuzzleVisual();
    showToast('Urutannya salah, coba lagi dari batu hijau.');
  }
}

function tryTakePusaka() {
  if (save.pusakaTaken) return;
  if (save.quests.roh !== 'active') {
    showToast('Bicara dulu dengan Kak Andi.');
    return;
  }
  if (save.rohDefeated < 4) {
    showToast('Kalahkan 4 roh batu terlebih dahulu! (' + save.rohDefeated + '/4)');
    return;
  }
  world.pusaka.visible = false;
  const inv = save.inventory.includes('pusaka') ? save.inventory : [...save.inventory, 'pusaka'];
  persist({ inventory: inv, pusakaTaken: true, quests: { ...save.quests, roh: 'done' } });
  showToast('Pusaka Nusantara didapat!');
  maybeWin();
}

function closeInv() { ui.inv.hidden = true; world.blocked = false; layoutControls(); }
function openInv() {
  if (!world.playing || !ui.dialog.hidden || !ui.win.hidden) return;
  renderInventory();
  ui.inv.hidden = false;
  world.blocked = true;
  ui.controls.hidden = true;
}

/* -------------------- movement / camera -------------------- */
function resolveCollisions(prevX, prevZ) {
  const p = world.player.position;
  const pr = 0.42;
  for (const c of world.colliders) {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const min = pr + c.r;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      const push = (min - d) / d;
      p.x += dx * push;
      p.z += dz * push;
    }
  }
  if (!isWalkable(p.x, p.z)) {
    if (isWalkable(p.x, prevZ)) p.z = prevZ;
    else if (isWalkable(prevX, p.z)) p.x = prevX;
    else { p.x = prevX; p.z = prevZ; }
  }
  p.y = groundHeight(p.x, p.z);
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, Math.max(0, t));
}

function smoothStick(dt) {
  const k = 1 - Math.exp(-JOY_SMOOTH * dt);
  const j = world.joy;
  j.x += (j.rawX - j.x) * k;
  j.y += (j.rawY - j.y) * k;
}

function stickInput() {
  let x = world.joy.x;
  let y = world.joy.y;
  const mag = Math.hypot(x, y);
  if (mag < JOY_DEAD) return { ix: 0, iy: 0, len: 0 };
  const scaled = (mag - JOY_DEAD) / (1 - JOY_DEAD);
  x = (x / mag) * Math.min(1, scaled);
  y = (y / mag) * Math.min(1, scaled);
  // If the thumb is mostly up or down, ignore slight sideways drift
  const ang = Math.atan2(x, -y);
  if (Math.abs(ang) < JOY_SNAP && -y > 0.2) x = 0;
  if (Math.abs(Math.abs(ang) - Math.PI) < JOY_SNAP && y > 0.2) x = 0;
  const len = Math.hypot(x, y);
  return { ix: x, iy: -y, len };
}

function updatePlayer(dt) {
  if (world.blocked) {
    world.player.position.y = groundHeight(world.player.position.x, world.player.position.z);
    idleLimbs(dt);
    return 0;
  }
  smoothStick(dt);
  let { ix, iy, len } = stickInput();
  if (world.keys.has('KeyW') || world.keys.has('ArrowUp')) iy += 1;
  if (world.keys.has('KeyS') || world.keys.has('ArrowDown')) iy -= 1;
  if (world.keys.has('KeyA') || world.keys.has('ArrowLeft')) ix -= 1;
  if (world.keys.has('KeyD') || world.keys.has('ArrowRight')) ix += 1;
  const rawLen = Math.hypot(ix, iy);
  if (rawLen > 1) { ix /= rawLen; iy /= rawLen; len = 1; }
  else len = rawLen;
  if (len < 0.06) {
    world.player.position.y = groundHeight(world.player.position.x, world.player.position.z);
    if (world.viewMode === 'first') world.player.rotation.y = world.camYaw;
    idleLimbs(dt);
    return 0;
  }

  // Camera-relative: stick up = walk straight away from the camera / along look yaw
  const yaw = world.camYaw;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const rx = fz, rz = -fx;
  const mx = fx * iy + rx * ix;
  const mz = fz * iy + rz * ix;
  const speed = PLAYER_SPEED * Math.min(1, len);
  const prevX = world.player.position.x;
  const prevZ = world.player.position.z;
  world.player.position.x += mx * speed * dt;
  world.player.position.z += mz * speed * dt;
  if (world.viewMode === 'first') {
    world.player.rotation.y = world.camYaw;
  } else {
    const target = Math.atan2(mx, mz);
    const turn = 1 - Math.exp(-10 * dt);
    world.player.rotation.y = lerpAngle(world.player.rotation.y, target, turn);
  }
  resolveCollisions(prevX, prevZ);
  walkLimbs(dt, len);
  return len;
}

function walkLimbs(dt, amount) {
  const { armL, armR, legL, legR } = world.limbs;
  const t = world.clock.elapsedTime;
  const swing = Math.sin(t * 11) * 0.7 * Math.min(1, amount);
  const extra = world.attackAnim > 0 ? 1.2 : 0;
  armL.rotation.x = swing;
  armR.rotation.x = -swing + extra;
  legL.rotation.x = -swing;
  legR.rotation.x = swing;
}

function idleLimbs(dt) {
  const { armL, armR, legL, legR } = world.limbs;
  const damp = 1 - Math.pow(0.001, dt);
  armL.rotation.x += (0 - armL.rotation.x) * damp;
  const extra = world.attackAnim > 0 ? 1.2 : 0;
  armR.rotation.x += (extra - armR.rotation.x) * damp;
  legL.rotation.x += (0 - legL.rotation.x) * damp;
  legR.rotation.x += (0 - legR.rotation.x) * damp;
}

function applyLookKeys(dt) {
  let yaw = 0;
  if (world.keys.has('KeyQ')) yaw += 1;
  if (world.keys.has('KeyR')) yaw -= 1;
  if (yaw) {
    world.camYaw += yaw * CAM_TURN * dt;
    world.camManualT = 0.45;
  }
}

function updateCamera(dt) {
  applyLookKeys(dt);
  if (world.camManualT > 0) world.camManualT = Math.max(0, world.camManualT - dt);
  const p = world.player;
  const cam = world.camera;
  const moving = world.playing && !world.blocked;

  if (world.viewMode === 'first') {
    world.player.visible = false;
    const eye = 1.52;
    const yaw = world.camYaw;
    const pitch = world.camPitch;
    const destX = p.position.x + Math.sin(yaw) * 0.18;
    const destZ = p.position.z + Math.cos(yaw) * 0.18;
    const destY = p.position.y + eye;
    const k = 1 - Math.exp(-18 * dt);
    cam.position.x += (destX - cam.position.x) * k;
    cam.position.y += (destY - cam.position.y) * k;
    cam.position.z += (destZ - cam.position.z) * k;
    cam.lookAt(
      cam.position.x + Math.sin(yaw) * Math.cos(pitch),
      cam.position.y + Math.sin(pitch),
      cam.position.z + Math.cos(yaw) * Math.cos(pitch)
    );
    return;
  }

  world.player.visible = true;
  // Auto-follow behind the player while walking, unless the player is looking around
  if (moving && world.camManualT <= 0 && !world.camLook.active) {
    const j = stickInput();
    let iy = j.iy;
    if (world.keys.has('KeyW') || world.keys.has('ArrowUp')) iy += 1;
    if (world.keys.has('KeyS') || world.keys.has('ArrowDown')) iy -= 1;
    if (iy > 0.25) {
      const follow = 1 - Math.exp(-1.6 * dt);
      world.camYaw = lerpAngle(world.camYaw, world.player.rotation.y, follow);
    }
  }
  const yaw = world.camYaw;
  const pitch = world.camPitch;
  const horiz = CAM_DIST * Math.cos(pitch);
  const destX = p.position.x - Math.sin(yaw) * horiz;
  const destZ = p.position.z - Math.cos(yaw) * horiz;
  const destY = p.position.y + 1.25 + CAM_DIST * Math.sin(pitch);
  const k = world.camLook.active ? (1 - Math.exp(-16 * dt)) : (1 - Math.exp(-7 * dt));
  cam.position.x += (destX - cam.position.x) * k;
  cam.position.y += (destY - cam.position.y) * k;
  cam.position.z += (destZ - cam.position.z) * k;
  cam.lookAt(p.position.x, p.position.y + 1.25, p.position.z);
}

function snapCamera() {
  const p = world.player;
  const cam = world.camera;
  if (world.viewMode === 'first') {
    world.player.visible = false;
    const yaw = world.camYaw;
    const pitch = world.camPitch;
    cam.position.set(p.position.x + Math.sin(yaw) * 0.18, p.position.y + 1.52, p.position.z + Math.cos(yaw) * 0.18);
    cam.lookAt(
      cam.position.x + Math.sin(yaw) * Math.cos(pitch),
      cam.position.y + Math.sin(pitch),
      cam.position.z + Math.cos(yaw) * Math.cos(pitch)
    );
    return;
  }
  world.player.visible = true;
  const yaw = world.camYaw;
  const pitch = world.camPitch;
  const horiz = CAM_DIST * Math.cos(pitch);
  cam.position.set(
    p.position.x - Math.sin(yaw) * horiz,
    p.position.y + 1.25 + CAM_DIST * Math.sin(pitch),
    p.position.z - Math.cos(yaw) * horiz
  );
  cam.lookAt(p.position.x, p.position.y + 1.25, p.position.z);
}

function setView(mode) {
  world.viewMode = mode === 'first' ? 'first' : 'third';
  if (world.viewMode === 'first') {
    if (Math.abs(world.camPitch - CAM_PITCH_TP) < 0.2 || world.camPitch > 0.3) world.camPitch = 0;
    world.camPitch = Math.max(-0.7, Math.min(0.6, world.camPitch));
  } else {
    if (Math.abs(world.camPitch) < 0.25) world.camPitch = CAM_PITCH_TP;
    world.camPitch = Math.max(0.12, Math.min(0.78, world.camPitch));
  }
  if (world.player) {
    world.player.visible = world.viewMode !== 'first';
    if (world.viewMode === 'first') world.player.rotation.y = world.camYaw;
  }
  if (ui.btnView) {
    ui.btnView.setAttribute('aria-pressed', world.viewMode === 'first' ? 'true' : 'false');
    ui.btnView.title = world.viewMode === 'first' ? 'Ubah ke pandangan belakang' : 'Ubah ke pandangan mata karakter';
  }
  if (world.playing) {
    snapCamera();
    persist({ view: world.viewMode });
  }
}

function toggleView() {
  if (!world.playing) return;
  setView(world.viewMode === 'first' ? 'third' : 'first');
}

function updateProps(dt) {
  const t = world.clock.elapsedTime;
  for (const c of world.coins) {
    if (!c.visible) continue;
    c.rotation.y += dt * 2.4;
    c.position.y = groundHeight(c.position.x, c.position.z) + 0.55 + Math.sin(t * 2.5 + c.userData.phase) * 0.12;
  }
  if (world.water) world.water.position.y = -0.42 + Math.sin(t * 0.6) * 0.04;
  for (const s of world.slimes) {
    if (!s.userData.alive) continue;
    s.userData.angle += dt * 0.6;
    const hx = s.userData.homeX, hz = s.userData.homeZ;
    const ox = Math.cos(s.userData.angle) * 1.6;
    const oz = Math.sin(s.userData.angle * 0.85) * 1.4;
    s.position.x = hx + ox;
    s.position.z = hz + oz;
    const bob = 0.12 + Math.abs(Math.sin(t * 3 + s.userData.phase)) * 0.22;
    s.position.y = groundHeight(s.position.x, s.position.z) + bob;
    s.rotation.y += dt * 0.5;
  }
  for (const s of world.rohs) {
    if (!s.userData.alive) continue;
    s.userData.angle += dt * 0.55;
    const hx = s.userData.homeX, hz = s.userData.homeZ;
    const ox = Math.cos(s.userData.angle) * 1.3;
    const oz = Math.sin(s.userData.angle * 0.8) * 1.2;
    s.position.x = hx + ox;
    s.position.z = hz + oz;
    const bob = 0.2 + Math.abs(Math.sin(t * 2.6 + s.userData.phase)) * 0.28;
    s.position.y = groundHeight(s.position.x, s.position.z) + bob;
    s.rotation.y += dt * 0.7;
  }
  if (world.pusaka && world.pusaka.visible) {
    world.pusaka.rotation.y += dt * 1.2;
    applyGroundY(world.pusaka, 0.48 + Math.sin(t * 2.2) * 0.06);
  }
  for (const n of world.npcs) {
    n.position.y = groundHeight(n.position.x, n.position.z) + Math.sin(t * 1.6 + n.position.x) * 0.015;
  }
}

/* -------------------- loop -------------------- */
function tick() {
  const dt = Math.min(0.05, world.clock.getDelta());
  if (world.attackT > 0) world.attackT -= dt;
  if (world.attackAnim > 0) world.attackAnim -= dt;
  if (world.toastT > 0) {
    world.toastT -= dt;
    if (world.toastT <= 0) ui.toast.hidden = true;
  }

  if (world.playing && world.player) {
    updatePlayer(dt);
    updateCamera(dt);
    updateProps(dt);
    pickupNearby();

    const area = areaAt(world.player.position.x, world.player.position.z);
    if (area !== world.areaName) {
      world.areaName = area;
      ui.area.textContent = area;
      showToast('Wilayah: ' + area);
    }

    if (!world.blocked && ui.dialog.hidden && ui.inv.hidden && ui.win.hidden) {
      const t = targetInteract();
      setPrompt(t ? t.label : '');
    } else if (ui.dialog.hidden) {
      setPrompt('');
    }

    world.saveT += dt;
    if (world.saveT > 3) {
      world.saveT = 0;
      persist({});
    }
  } else {
    // title-screen idle camera orbit
    const t = world.clock.elapsedTime;
    const cam = world.camera;
    cam.position.set(Math.sin(t * 0.12) * 14, 9.5, Math.cos(t * 0.12) * 14 - 4);
    cam.lookAt(0, 0.8, -6);
    updateProps(dt);
  }

  world.renderer.render(world.scene, world.camera);
  requestAnimationFrame(tick);
}

/* -------------------- controls wiring -------------------- */
function joyPos(clientX, clientY) {
  const rect = ui.joyBase.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let x = (clientX - cx) / (rect.width * 0.5);
  let y = (clientY - cy) / (rect.height * 0.5);
  const l = Math.hypot(x, y);
  if (l > 1) { x /= l; y /= l; }
  world.joy.rawX = x;
  world.joy.rawY = y;
  ui.joyKnob.style.transform = 'translate(' + (x * JOY_KNOB_TRAVEL) + 'px,' + (y * JOY_KNOB_TRAVEL) + 'px)';
}

function joyEnd() {
  world.joy.active = false;
  world.joy.pointerId = null;
  world.joy.rawX = 0;
  world.joy.rawY = 0;
  ui.joyKnob.style.transform = 'translate(0,0)';
}

function lookEnd() {
  world.camLook.active = false;
  world.camLook.pointerId = null;
}

function isLookTarget(el) {
  if (!el || !el.closest) return true;
  return !el.closest('#joystick, #btn-action, #btn-inv, #btn-view, #btn-inv-close, #dialog, #inventory, #title-screen, #win-screen, .btn, .chip, .panel, .overlay, a, button');
}

function applyLookDelta(dx, dy) {
  world.camYaw -= dx * LOOK_SENS_YAW;
  world.camPitch -= dy * LOOK_SENS_PITCH;
  if (world.viewMode === 'first') {
    world.camPitch = Math.max(-0.7, Math.min(0.6, world.camPitch));
  } else {
    world.camPitch = Math.max(0.12, Math.min(0.78, world.camPitch));
  }
  world.camManualT = 0.55;
}

function setupControls() {
  ui.joy.addEventListener('pointerdown', (e) => {
    if (!world.playing || world.blocked) return;
    e.preventDefault();
    try { ui.joy.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or inactive pointer */ }
    world.joy.active = true;
    world.joy.pointerId = e.pointerId;
    joyPos(e.clientX, e.clientY);
  });
  ui.joy.addEventListener('pointermove', (e) => {
    if (!world.joy.active || e.pointerId !== world.joy.pointerId) return;
    e.preventDefault();
    joyPos(e.clientX, e.clientY);
  });
  const up = (e) => {
    if (e.pointerId !== world.joy.pointerId) return;
    joyEnd();
  };
  ui.joy.addEventListener('pointerup', up);
  ui.joy.addEventListener('pointercancel', up);

  const onLookDown = (e) => {
    if (!world.playing || world.blocked) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerId === world.joy.pointerId) return;
    if (!isLookTarget(e.target)) return;
    world.camLook.active = true;
    world.camLook.pointerId = e.pointerId;
    world.camLook.lastX = e.clientX;
    world.camLook.lastY = e.clientY;
    try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  };
  const onLookMove = (e) => {
    if (!world.camLook.active || e.pointerId !== world.camLook.pointerId) return;
    e.preventDefault();
    applyLookDelta(e.clientX - world.camLook.lastX, e.clientY - world.camLook.lastY);
    world.camLook.lastX = e.clientX;
    world.camLook.lastY = e.clientY;
  };
  const onLookUp = (e) => {
    if (e.pointerId !== world.camLook.pointerId) return;
    lookEnd();
  };
  document.addEventListener('pointerdown', onLookDown);
  document.addEventListener('pointermove', onLookMove);
  document.addEventListener('pointerup', onLookUp);
  document.addEventListener('pointercancel', onLookUp);

  ui.action.addEventListener('pointerup', (e) => {
    e.preventDefault();
    doAction();
  });
  ui.action.addEventListener('click', (e) => e.preventDefault());
  if (ui.btnView) ui.btnView.addEventListener('click', (e) => { e.preventDefault(); toggleView(); });

  window.addEventListener('keydown', (e) => {
    world.keys.add(e.code);
    if (e.code === 'Space' || e.code === 'KeyE') {
      e.preventDefault();
      if (!e.repeat) doAction();
    }
    if (e.code === 'KeyV' && !e.repeat) {
      e.preventDefault();
      toggleView();
    }
    if (e.code === 'KeyI' && !e.repeat) {
      if (ui.inv.hidden) openInv(); else closeInv();
    }
    if (e.code === 'Escape') {
      if (!ui.inv.hidden) closeInv();
      else if (!ui.dialog.hidden) closeDialog();
    }
  });
  window.addEventListener('keyup', (e) => world.keys.delete(e.code));

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) world.clock.getDelta();
  });
  window.addEventListener('blur', () => { world.keys.clear(); joyEnd(); lookEnd(); });

  ui.btnStart.addEventListener('click', () => startGame(false));
  ui.btnContinue.addEventListener('click', () => startGame(true));
  ui.btnNew.addEventListener('click', () => startGame(false));
  ui.btnInv.addEventListener('click', openInv);
  ui.btnInvClose.addEventListener('click', closeInv);
  ui.btnAgain.addEventListener('click', () => {
    ui.win.hidden = true;
    startGame(false);
  });
  ui.btnKeep.addEventListener('click', () => {
    ui.win.hidden = true;
    world.blocked = false;
    layoutControls();
  });
}

function showTitle() {
  const existing = loadSave();
  const hasProgress = !!(existing && (existing.coins > 0 || existing.quests.kades !== 'idle' || existing.quests.tani !== 'idle' || existing.px !== START.x));
  ui.btnContinue.hidden = !hasProgress;
  ui.btnNew.hidden = !hasProgress;
  ui.btnStart.hidden = hasProgress;
  ui.title.hidden = false;
  ui.hud.hidden = true;
  ui.controls.hidden = true;
  ui.win.hidden = true;
  world.playing = false;
}

function startGame(cont) {
  if (cont) {
    const loaded = loadSave();
    save = loaded ? { ...defaultSave(), ...loaded, quests: { ...defaultSave().quests, ...(loaded.quests || {}) } } : defaultSave();
  } else {
    save = defaultSave();
    writeSave(save);
    // reset entities to default visibility
    for (const c of world.coins) c.visible = true;
    if (world.basket) world.basket.visible = true;
    if (world.chest) world.chest.visible = true;
    for (const s of world.slimes) {
      s.userData.alive = true;
      s.visible = true;
      s.scale.set(1, 1, 1);
    }
    if (world.hoe) world.hoe.visible = true;
    if (world.pusaka) world.pusaka.visible = true;
    for (const s of world.rohs) {
      s.userData.alive = true;
      s.visible = true;
      s.scale.set(1, 1, 1);
    }
  }
  const gy = groundHeight(save.px, save.pz);
  world.player.position.set(save.px, gy, save.pz);
  world.player.rotation.y = save.rot;
  world.camYaw = save.rot;
  world.camPitch = (save.view === 'first') ? 0 : CAM_PITCH_TP;
  world.camManualT = 0;
  joyEnd();
  lookEnd();

  // apply collected/defeated from save
  for (const c of world.coins) c.visible = !save.collectedCoins[c.userData.id];
  if (world.basket) world.basket.visible = !save.basketTaken;
  if (world.chest) world.chest.visible = !save.treasureTaken;
  for (const s of world.slimes) {
    s.userData.alive = !save.defeatedSlimes[s.userData.id];
    s.visible = s.userData.alive;
    if (s.userData.alive) s.scale.set(1, 1, 1);
  }
  if (world.hoe) world.hoe.visible = !save.hoeTaken;
  if (world.pusaka) world.pusaka.visible = !save.pusakaTaken;
  for (const s of world.rohs) {
    s.userData.alive = !save.defeatedRoh[s.userData.id];
    s.visible = s.userData.alive;
    if (s.userData.alive) s.scale.set(1, 1, 1);
  }
  applyPuzzleVisual();

  world.playing = true;
  world.blocked = false;
  world.wonShown = false;
  world.areaName = areaAt(save.px, save.pz);
  ui.area.textContent = world.areaName;
  ui.title.hidden = true;
  ui.hud.hidden = false;
  ui.win.hidden = true;
  ui.dialog.hidden = true;
  ui.inv.hidden = true;
  closeDialog();
  refreshHud();
  setView(save.view || 'third');
  layoutControls();

  if (save.migratedFromV1) {
    showToast('Wilayah baru terbuka di utara: Sawah dan Gunung.');
    persist({ migratedFromV1: false });
  }
}

/* -------------------- boot -------------------- */
function boot() {
  setupRenderer();
  buildWorld();
  setupControls();
  showTitle();
  world.clock.start();
  const params = new URLSearchParams(location.search);
  if (params.get('play') === '1' || params.get('autostart') === '1') {
    const cont = params.get('new') !== '1' && !!loadSave();
    startGame(cont);
  }
  if (params.get('test') === '1') {
    window.__pn = {
      setPos(x, z, rot) {
        const gy = groundHeight(x, z);
        world.player.position.set(x, gy, z);
        if (rot != null) {
          world.player.rotation.y = rot;
          world.camYaw = rot;
        }
        snapCamera();
      },
      setJoy(x, y) {
        world.joy.rawX = x;
        world.joy.rawY = y;
        world.joy.x = x;
        world.joy.y = y;
      },
      clearJoy() {
        joyEnd();
        world.joy.x = 0;
        world.joy.y = 0;
      },
      setCamYaw(a) { world.camYaw = a; world.camManualT = 1; snapCamera(); },
      getCam() {
        return {
          yaw: world.camYaw,
          pitch: world.camPitch,
          view: world.viewMode,
          visible: world.player.visible,
          px: world.player.position.x,
          py: world.player.position.y,
          pz: world.player.position.z,
          rot: world.player.rotation.y,
          camX: world.camera.position.x,
          camY: world.camera.position.y,
          camZ: world.camera.position.z,
        };
      },
      setView,
      toggleView,
      snapCamera,
      talk(id) { const n = world.npcs.find((p) => p.userData.id === id); if (n) talkTo(n); },
      action: doAction,
      save: () => JSON.parse(JSON.stringify(save)),
      pickup: pickupNearby,
      attackNearest() {
        const s = nearestOf(world.slimes, 8, (o) => o.userData.alive);
        if (s) attackSlime(s);
      },
      attackNearestRoh() {
        const s = nearestOf(world.rohs, 24, (o) => o.userData.alive);
        if (s) attackRoh(s);
      },
      attackRohById(id) {
        world.attackT = 0;
        const s = world.rohs.find((o) => o.userData.id === id);
        if (s) attackRoh(s);
      },
      attackSlimeById(id) {
        world.attackT = 0;
        const s = world.slimes.find((o) => o.userData.id === id);
        if (s) attackSlime(s);
      },
      resetAttack() { world.attackT = 0; },
      touchStone(id) {
        const s = world.stones.find((o) => o.userData.id === id);
        if (s) touchStone(s);
      },
      takeTreasure: tryTakeTreasure,
      takePusaka: tryTakePusaka,
      useWarung,
      walkable: isWalkable,
      height: groundHeight,
    };
  }
  requestAnimationFrame(tick);
}

boot();

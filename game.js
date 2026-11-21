/* Petualangan Nusantara — original single-player 3D adventure.
   Three.js r170 is loaded from a local copy. No runtime CDN. */
import * as THREE from './three.module.js';

const SAVE_KEY = 'petualangan-nusantara-v3';
const SAVE_KEY_V2 = 'petualangan-nusantara-v2';
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
  surat: 'Tiga surat desa',
  sepatu: 'Sepatu lari',
  topi: 'Topi anyaman',
  jamu: 'Jamu hati',
  lentera: 'Lentera kuningan',
  pancing: 'Pancing kuat',
};
const PUZZLE_ORDER = ['hijau', 'kuning', 'merah'];
const SAWAH = { x: 0, z: -54, rx: 16, rz: 15 };
const GUNUNG = { x: 24, z: -76, r: 13.8 };
const KANDANG = { x0: -10.6, x1: -7.0, z0: 2.4, z1: 5.6 };
const SHOP_ITEMS = [
  { id: 'sepatu', name: 'Sepatu lari', price: 8, desc: 'Langkah jadi lebih kencang.' },
  { id: 'topi', name: 'Topi anyaman', price: 5, desc: 'Topi anyaman untuk di kepala.' },
  { id: 'jamu', name: 'Jamu hati', price: 6, desc: 'Tambah satu nyawa (hati).' },
  { id: 'lentera', name: 'Lentera kuningan', price: 7, desc: 'Menerangi malam di sekitarmu.' },
  { id: 'pancing', name: 'Pancing kuat', price: 12, desc: 'Tunggu lebih singkat, ikan langka lebih mudah.' },
];
const FISH_TYPES = {
  nila: { name: 'Ikan nila', rarity: 'umum', biome: 'pond', price: 2, color: 0x64748b, w: 40 },
  lele: { name: 'Ikan lele', rarity: 'umum', biome: 'pond', price: 2, color: 0x1c1917, w: 32 },
  mas: { name: 'Ikan mas', rarity: 'agak langka', biome: 'pond', price: 3, color: 0xf59e0b, w: 18 },
  gurame: { name: 'Ikan gurame', rarity: 'langka', biome: 'pond', price: 5, color: 0xd6b07a, w: 8 },
  kembung: { name: 'Ikan kembung', rarity: 'umum', biome: 'beach', price: 2, color: 0x5b7c8a, w: 38 },
  tongkol: { name: 'Ikan tongkol', rarity: 'agak langka', biome: 'beach', price: 3, color: 0x1e3a5f, w: 22 },
  baronang: { name: 'Ikan baronang', rarity: 'agak langka', biome: 'beach', price: 4, color: 0x16a34a, w: 16 },
  kakap: { name: 'Ikan kakap', rarity: 'langka', biome: 'beach', price: 6, color: 0xe11d48, w: 7 },
};
const FURNITURE = {
  kursi: { name: 'Kursi kayu', price: 4, desc: 'Kursi sederhana untuk tamu.' },
  meja: { name: 'Meja makan', price: 6, desc: 'Meja kayu di tengah ruangan.' },
  lemari: { name: 'Lemari', price: 7, desc: 'Lemari untuk menyimpan barang.' },
  kasur: { name: 'Kasur', price: 8, desc: 'Tempat tidur yang nyaman.' },
  pot: { name: 'Tanaman pot', price: 3, desc: 'Tanaman hijau dalam pot.' },
  lampu: { name: 'Lampu meja', price: 5, desc: 'Lampu hangat untuk malam.' },
  batik: { name: 'Lukisan batik', price: 6, desc: 'Lukisan motif batik di dinding.' },
  karpet: { name: 'Karpet', price: 5, desc: 'Karpet anyaman di lantai.' },
  trophy: { name: 'Piala ikan', price: 10, desc: 'Piala untuk pemancing handal.', needRare: true },
};
const FISH_SPOTS = [
  { id: 'kolam', name: 'Kolam Desa', x: -6.05, z: -23.2, r: 1.85, waterX: -8.2, waterZ: -23.2, biome: 'pond' },
  { id: 'pantai', name: 'Dermaga Pantai', x: 4.2, z: 24.35, r: 2.25, waterX: 4.2, waterZ: 26.15, biome: 'beach' },
];
const PLAYER_HOUSE = { x: 2.6, z: 6.2, w: 3.2, d: 2.8 };
const HOUSE_IN = { cx: 90, cz: 0, hw: 4.15, hd: 3.25 };
const HG = { ox: 86.6, oz: -2.55, cols: 8, rows: 6, size: 0.85 };
const MAX_FURNITURE = 16;


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

function inHouseInterior(x, z) {
  return Math.abs(x - HOUSE_IN.cx) <= HOUSE_IN.hw - 0.2 && Math.abs(z - HOUSE_IN.cz) <= HOUSE_IN.hd - 0.2;
}

function isWalkable(x, z) {
  if (inHouseInterior(x, z)) return true;
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
      ayam: 'idle', surat: 'idle', mancing: 'idle', rumah: 'idle',
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
    sound: true,
    vibrate: true,
    shop: { sepatu: false, topi: false, jamu: false, lentera: false, pancing: false },
    letters: { rumah1: false, rumah2: false, rumah3: false },
    ayamCaught: {},
    fishBag: {},
    fishLog: {},
    fishTotal: 0,
    houseOwned: {},
    housePlaced: [],
    migratedFromV2: false,
    hp: 3,
    maxHp: 3,
    migratedVillage: false,
    px: START.x,
    pz: START.z,
    rot: START.rot,
    won: false,
  };
}

function mergeSave(data) {
  const base = defaultSave();
  if (!data) return base;
  const placed = Array.isArray(data.housePlaced) ? data.housePlaced.filter((p) => p && FURNITURE[p.id]) : [];
  return {
    ...base,
    ...data,
    quests: { ...base.quests, ...(data.quests || {}) },
    shop: { ...base.shop, ...(data.shop || {}) },
    letters: { ...base.letters, ...(data.letters || {}) },
    ayamCaught: { ...(data.ayamCaught || {}) },
    fishBag: { ...(data.fishBag || {}) },
    fishLog: { ...(data.fishLog || {}) },
    houseOwned: { ...(data.houseOwned || {}) },
    housePlaced: placed,
    fishTotal: data.fishTotal || 0,
  };
}

function loadSave() {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    let migrated = false;
    let fromV2 = false;
    if (!raw) {
      raw = localStorage.getItem(SAVE_KEY_V2);
      if (raw) { migrated = true; fromV2 = true; }
    }
    if (!raw) {
      raw = localStorage.getItem(SAVE_KEY_LEGACY);
      if (raw) migrated = true;
    }
    if (!raw) return null;
    const merged = mergeSave(JSON.parse(raw));
    if (migrated && !fromV2) {
      if (merged.won) merged.won = false;
      merged.migratedFromV1 = true;
    }
    if (fromV2) merged.migratedFromV2 = true;
    if (merged.won && (merged.quests.ayam !== 'done' || merged.quests.surat !== 'done')) {
      merged.won = false;
      merged.migratedVillage = true;
    }
    if (migrated || merged.migratedVillage || merged.migratedFromV2) writeSave(merged);
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
  btnFx: $('btn-fx'),
  fxPanel: $('fx-panel'),
  fxSound: $('fx-sound'),
  fxVib: $('fx-vib'),
  fxClose: $('fx-close'),
  btnInvClose: $('btn-inv-close'),
  btnAgain: $('btn-again'),
  btnKeep: $('btn-keep'),
  btnSprint: $('btn-sprint'),
  stamina: $('stamina'),
  staminaFill: $('stamina-fill'),
  hearts: $('hearts'),
  minimap: $('minimap'),
  shopPanel: $('shop-panel'),
  shopList: $('shop-list'),
  shopCoins: $('shop-coins'),
  btnShopClose: $('btn-shop-close'),
  fishPanel: $('fish-panel'),
  fishTitle: $('fish-title'),
  fishStatus: $('fish-status'),
  fishBar: $('fish-bar'),
  fishZone: $('fish-zone'),
  fishMarker: $('fish-marker'),
  btnFishMain: $('btn-fish-main'),
  btnFishCancel: $('btn-fish-cancel'),
  decorPanel: $('decor-panel'),
  decorList: $('decor-list'),
  decorCoins: $('decor-coins'),
  btnDecorPlace: $('btn-decor-place'),
  btnDecorRot: $('btn-decor-rot'),
  btnDecorPick: $('btn-decor-pick'),
  btnDecorClose: $('btn-decor-close'),
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
  tod: 0.32,
  weather: 'clear',
  weatherT: 0,
  weatherDur: 90 + Math.random() * 80,
  rainAmt: 0,
  windAmt: 0.18,
  shake: 0,
  hitCD: 0,
  stepT: 0,
  hemi: null,
  sun: null,
  sunBall: null,
  moonBall: null,
  lamps: [],
  swayers: [],
  rain: null,
  leaves: null,
  shopStall: null,
  mailboxes: [],
  lanternLight: null,
  animals: { ayam: [], grazers: [], cats: [], birds: [], fish: [], flutters: [], fireflies: null },
  flowers: [],
  stamina: 1,
  sprintHeld: false,
  sprinting: false,
  mapT: 0,
  overview: false,
  playerGear: { topi: null, lantern: null },
  ponds: [],
  playerHouse: null,
  houseDoor: null,
  houseExit: null,
  houseFurnish: null,
  inHouse: false,
  fishing: null,
  bobber: null,
  decorOpen: false,
  decorSel: null,
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
  const hutan = x > 12 && z < 9;
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
  // village grass + dirt path near center, plus new streets
  const path = (Math.abs(x) < 1.05 && z > -34 && z < 11) ||
    (Math.abs(z + 6.2) < 0.95 && x > -7 && x < 11) ||
    (Math.abs(z + 19.2) < 1.05 && x > -11 && x < 10) ||
    (Math.abs(x + 10.2) < 0.95 && z > -20 && z < -8) ||
    (Math.abs(x - 8.6) < 0.95 && z > -21 && z < 3) ||
    (Math.abs(z - 2.4) < 0.85 && x > -9 && x < 1.5);
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

function placeInstanced(geo, material, points, yOf, sway) {
  const inst = new THREE.InstancedMesh(geo, material, points.length);
  const dummy = new THREE.Object3D();
  const bases = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const s = p.s || 1;
    const rec = {
      x: p.x,
      y: yOf ? yOf(p) : p.y,
      z: p.z,
      rx: p.rx || 0,
      ry: p.ry || 0,
      rz: p.rz || 0,
      sx: s * (p.sx || 1),
      sy: s * (p.sy || 1),
      sz: s * (p.sz || 1),
      phase: seeded(i + 19) * Math.PI * 2,
    };
    dummy.position.set(rec.x, rec.y, rec.z);
    dummy.rotation.set(rec.rx, rec.ry, rec.rz);
    dummy.scale.set(rec.sx, rec.sy, rec.sz);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    bases.push(rec);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.userData.bases = bases;
  inst.userData.sway = sway || null;
  inst.userData.dummy = dummy;
  world.scene.add(inst);
  if (sway) world.swayers.push(inst);
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
    // keep clearings: expanded village, basket, cave mouth, beach open
    const vx = x / 15.8;
    const vz = (z + 9) / 17.4;
    if (vx * vx + vz * vz < 1) return;
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

  placeInstanced(new THREE.BoxGeometry(0.32, 1.4, 0.32), mat(0x6b3f1d), trunks, (p) => p.y, 'tree');
  placeInstanced(new THREE.BoxGeometry(1.5, 1.3, 1.5), mat(0x1f7a3a), leaves, (p) => p.y, 'canopy');
  placeInstanced(new THREE.BoxGeometry(1.1, 1.0, 1.1), mat(0x2e9a48), leaves2, (p) => p.y, 'canopy');

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
  placeInstanced(new THREE.CylinderGeometry(0.12, 0.2, 2.6, 6), mat(0x8a5a2b), palms, (p) => p.y, 'palm');
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
  placeInstanced(new THREE.BoxGeometry(2.1, 0.18, 0.7), mat(0x1c7c3a), palmFronds, (p) => p.y, 'frond');
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
  placeInstanced(new THREE.ConeGeometry(0.18, 0.4, 5), mat(0x3d9a45), tufts, (p) => p.y, 'grass');
}

function makeStall(x, z, rot, color, w = 2.15) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, 0.65, 1.05), 0x8b5a2b, 0, 0.48, 0));
  g.add(mesh(new THREE.BoxGeometry(0.1, 1.85, 0.1), 0x6b4a28, -w * 0.45, 1.05, -0.4));
  g.add(mesh(new THREE.BoxGeometry(0.1, 1.85, 0.1), 0x6b4a28, w * 0.45, 1.05, -0.4));
  g.add(mesh(new THREE.BoxGeometry(0.1, 1.85, 0.1), 0x6b4a28, -w * 0.45, 1.05, 0.4));
  g.add(mesh(new THREE.BoxGeometry(0.1, 1.85, 0.1), 0x6b4a28, w * 0.45, 1.05, 0.4));
  g.add(mesh(new THREE.BoxGeometry(w + 0.25, 0.08, 1.35), color, 0, 2.0, 0));
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.22, 0.3), 0xf5f0e6, -0.4, 0.9, 0.12));
  g.add(mesh(new THREE.BoxGeometry(0.34, 0.18, 0.28), 0x16a34a, 0.4, 0.88, 0.1));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  world.scene.add(g);
  addCollider(x, z, Math.max(1.05, w * 0.55));
  return g;
}

function makeMasjid(x, z) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(4.2, 2.35, 3.6), 0xf5f0e6, 0, 1.18, 0));
  const roof = mesh(new THREE.ConeGeometry(3.15, 1.45, 4), 0x3d6b4f, 0, 2.95, 0);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.28, 10), 0xf5f0e6, 0, 3.72, 0));
  g.add(mesh(new THREE.SphereGeometry(0.62, 10, 8), mat(0x2f6b4f), 0, 4.15, 0));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), 0xc4a24a, 0, 4.82, 0));
  // short minaret
  g.add(mesh(new THREE.BoxGeometry(0.7, 3.5, 0.7), 0xf0e6d4, -2.35, 1.75, -1.35));
  g.add(mesh(new THREE.BoxGeometry(0.86, 0.14, 0.86), 0x3d6b4f, -2.35, 3.55, -1.35));
  g.add(mesh(new THREE.SphereGeometry(0.36, 8, 6), mat(0x2f6b4f), -2.35, 3.95, -1.35));
  g.add(mesh(new THREE.BoxGeometry(0.7, 1.35, 0.1), 0x6b4a28, 0, 0.7, 1.84));
  g.add(mesh(new THREE.BoxGeometry(0.45, 0.5, 0.06), 0x9ad7ef, -1.15, 1.45, 1.84));
  g.add(mesh(new THREE.BoxGeometry(0.45, 0.5, 0.06), 0x9ad7ef, 1.15, 1.45, 1.84));
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.12, 1.1), 0xe7dcc4, 0, 0.08, 2.2));
  g.position.set(x, 0, z);
  world.scene.add(g);
  addCollider(x, z, 2.35);
  addCollider(x - 2.35, z - 1.35, 0.55);
  return g;
}

function makeBalai(x, z) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(5.2, 0.18, 3.8), 0x8b5a2b, 0, 0.42, 0));
  const posts = [[-2.2, -1.5], [2.2, -1.5], [-2.2, 1.5], [2.2, 1.5], [0, -1.5], [0, 1.5]];
  posts.forEach(([px, pz]) => {
    g.add(mesh(new THREE.BoxGeometry(0.16, 2.15, 0.16), 0x6b4a28, px, 1.45, pz));
  });
  const roof = mesh(new THREE.ConeGeometry(3.6, 1.35, 4), 0xa16207, 0, 3.05, 0);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  g.add(mesh(new THREE.BoxGeometry(1.4, 0.35, 1.0), 0x7c4a1e, 0, 0.7, 0.2));
  g.position.set(x, 0, z);
  world.scene.add(g);
  addCollider(x, z, 1.55);
  return g;
}

function makeBeringin(x, z) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.55, 0.72, 2.6, 8), 0x5c3d1e, 0, 1.3, 0));
  g.add(mesh(new THREE.BoxGeometry(3.8, 1.5, 3.8), 0x1b6b32, 0, 3.15, 0));
  g.add(mesh(new THREE.BoxGeometry(2.8, 1.15, 2.8), 0x237a3a, 0.4, 4.1, -0.2));
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.9, 2.2), 0x17632c, -0.5, 4.7, 0.3));
  for (let i = 0; i < 5; i++) {
    const a = i * 1.15;
    g.add(mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), 0x6b4a28, Math.cos(a) * 1.3, 1.4, Math.sin(a) * 1.3));
  }
  g.position.set(x, 0, z);
  world.scene.add(g);
  addCollider(x, z, 1.05);
  return g;
}

function makePond(x, z, r) {
  const water = mesh(new THREE.CircleGeometry(r, 16), mat(0x2a7d8a), x, 0.05, z);
  water.rotation.x = -Math.PI / 2;
  world.scene.add(water);
  const stones = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    stones.push({
      x: x + Math.cos(a) * r * 0.95,
      z: z + Math.sin(a) * r * 0.95,
      y: 0.12,
      s: 0.35 + seeded(i + 80) * 0.25,
      ry: a,
    });
  }
  placeInstanced(new THREE.BoxGeometry(0.45, 0.22, 0.35), mat(0x7a756c), stones, (p) => p.y);
  world.flowers.push({ x, z, r });
  return { x, z, r };
}

function makeMailbox(id, x, z, rot) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), 0x6b4a28, 0, 0.42, 0));
  g.add(mesh(new THREE.BoxGeometry(0.38, 0.26, 0.22), 0xb45309, 0, 0.92, 0));
  g.add(mesh(new THREE.BoxGeometry(0.16, 0.08, 0.04), 0xe8b84a, 0, 0.92, 0.13));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.userData.id = id;
  g.userData.kind = 'mailbox';
  world.scene.add(g);
  world.mailboxes.push(g);
  addCollider(x, z, 0.22);
  return g;
}

function placeFenceLoop(points, gapAt) {
  const posts = [];
  const rails = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (gapAt && i === gapAt) continue;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(len / 0.85));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = a[0] + dx * t, z = a[1] + dz * t;
      posts.push({ x, z, y: 0.4, s: 1, ry: Math.atan2(dx, dz) });
      if (k < n) {
        const mx = a[0] + dx * (k + 0.5) / n;
        const mz = a[1] + dz * (k + 0.5) / n;
        const seg = len / n;
        rails.push({
          x: mx, z: mz, y: 0.48, ry: Math.atan2(dx, dz),
          sx: 0.08, sy: 0.07, sz: seg * 0.92, s: 1,
        });
      }
    }
  }
  placeInstanced(new THREE.BoxGeometry(0.1, 0.8, 0.1), mat(0x6b4a28), posts, (p) => p.y);
  placeInstanced(new THREE.BoxGeometry(1, 1, 1), mat(0x8b5a2b), rails, (p) => p.y);
}

function placeFlowers() {
  const spots = [
    [0.8, -16.4], [-3.4, -17.8], [3.2, -17.2], [-10.2, -15.6],
    [7.4, -17.8], [-6.2, -8.4], [2.2, -3.4], [8.8, 1.6],
  ];
  const heads = [];
  const stems = [];
  spots.forEach(([x, z], i) => {
    world.flowers.push({ x, z, r: 1.4 });
    for (let k = 0; k < 4; k++) {
      const ox = (seeded(i * 9 + k) - 0.5) * 1.3;
      const oz = (seeded(i * 9 + k + 4) - 0.5) * 1.3;
      stems.push({ x: x + ox, z: z + oz, y: 0.14, s: 0.7 });
      heads.push({
        x: x + ox, z: z + oz, y: 0.28,
        s: 0.35 + seeded(i + k) * 0.2,
        ry: seeded(i + k + 2) * Math.PI,
      });
    }
  });
  placeInstanced(new THREE.BoxGeometry(0.04, 0.28, 0.04), mat(0x2f7a38), stems, (p) => p.y, 'grass');
  placeInstanced(new THREE.SphereGeometry(0.1, 5, 4), mat(0xe11d48), heads, (p) => p.y);
}

function buildPondJetty() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    g.add(mesh(new THREE.BoxGeometry(0.95, 0.1, 0.42), 0x8b5a2b, 0, 0.22, i * 0.44));
  }
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), 0x6b4a28, -0.38, 0.2, 0.08));
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), 0x6b4a28, 0.38, 0.2, 0.08));
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), 0x6b4a28, -0.38, 0.2, 1.1));
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), 0x6b4a28, 0.38, 0.2, 1.1));
  g.position.set(-6.15, 0, -23.2);
  g.rotation.y = Math.PI / 2;
  world.scene.add(g);
}

function buildPlayerHouse() {
  const h = makeHouse(PLAYER_HOUSE.x, PLAYER_HOUSE.z, 0, 0xdbeafe, 0x0f766e, PLAYER_HOUSE.w, PLAYER_HOUSE.d, 2.2);
  h.userData.kind = 'player-house';
  const potL = new THREE.Group();
  potL.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.22, 8), 0xb45309, 0, 0.12, 0));
  potL.add(mesh(new THREE.SphereGeometry(0.16, 6, 5), mat(0x16a34a), 0, 0.32, 0));
  potL.position.set(PLAYER_HOUSE.x - 1.15, 0, PLAYER_HOUSE.z + 1.55);
  const potR = potL.clone();
  potR.position.set(PLAYER_HOUSE.x + 1.15, 0, PLAYER_HOUSE.z + 1.55);
  world.scene.add(potL, potR);
  world.playerHouse = h;
  world.houseDoor = { x: PLAYER_HOUSE.x, z: PLAYER_HOUSE.z + PLAYER_HOUSE.d / 2 + 0.55 };
}

function makeBatikTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1d4e4a';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#c4a24a';
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const x = i * 16 + 8, y = j * 16 + 8;
      g.beginPath();
      g.moveTo(x, y - 6); g.lineTo(x + 5, y); g.lineTo(x, y + 6); g.lineTo(x - 5, y);
      g.closePath();
      g.fill();
      if ((i + j) % 2 === 0) {
        g.fillStyle = '#f5f0e6';
        g.fillRect(x - 2, y - 2, 4, 4);
        g.fillStyle = '#c4a24a';
      }
    }
  }
  g.strokeStyle = '#7c2d12';
  g.lineWidth = 8;
  g.strokeRect(4, 4, 120, 120);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function makeFurnitureMesh(id) {
  const g = new THREE.Group();
  g.userData.furnId = id;
  if (id === 'kursi') {
    g.add(mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), 0x8b5a2b, 0, 0.42, 0));
    g.add(mesh(new THREE.BoxGeometry(0.55, 0.5, 0.08), 0x7c4a1e, 0, 0.71, -0.24));
    [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([lx, lz]) => {
      g.add(mesh(new THREE.BoxGeometry(0.07, 0.4, 0.07), 0x6b4a28, lx, 0.2, lz));
    });
  } else if (id === 'meja') {
    g.add(mesh(new THREE.BoxGeometry(0.95, 0.08, 0.62), 0x8b5a2b, 0, 0.58, 0));
    [[-0.38, -0.22], [0.38, -0.22], [-0.38, 0.22], [0.38, 0.22]].forEach(([lx, lz]) => {
      g.add(mesh(new THREE.BoxGeometry(0.08, 0.54, 0.08), 0x6b4a28, lx, 0.27, lz));
    });
  } else if (id === 'lemari') {
    g.add(mesh(new THREE.BoxGeometry(0.7, 1.35, 0.42), 0x7c4a1e, 0, 0.68, 0));
    g.add(mesh(new THREE.BoxGeometry(0.02, 1.2, 0.36), 0x6b4a28, 0, 0.68, 0.2));
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), 0xe8b84a, -0.16, 0.68, 0.22));
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), 0xe8b84a, 0.16, 0.68, 0.22));
  } else if (id === 'kasur') {
    g.add(mesh(new THREE.BoxGeometry(0.85, 0.18, 1.25), 0xf5f0e6, 0, 0.28, 0));
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.1, 1.3), 0x7c2d12, 0, 0.16, 0));
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.12, 0.28), 0xdbeafe, 0, 0.4, 0.42));
  } else if (id === 'pot') {
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.24, 8), 0xb45309, 0, 0.14, 0));
    g.add(mesh(new THREE.SphereGeometry(0.2, 7, 6), mat(0x16a34a), 0, 0.38, 0));
    g.add(mesh(new THREE.SphereGeometry(0.12, 6, 5), mat(0x237a3a), 0.08, 0.5, -0.04));
  } else if (id === 'lampu') {
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.08, 8), 0x6b4a28, 0, 0.06, 0));
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), 0x57534e, 0, 0.3, 0));
    const glow = mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfde68a }), 0, 0.58, 0);
    g.add(glow);
  } else if (id === 'batik') {
    if (!world.batikTex) world.batikTex = makeBatikTexture();
    const matB = new THREE.MeshBasicMaterial({ map: world.batikTex });
    const pl = mesh(new THREE.PlaneGeometry(0.95, 0.7), matB, 0, 1.55, 0.01);
    g.add(mesh(new THREE.BoxGeometry(1.04, 0.8, 0.05), 0x5c3d1e, 0, 1.55, -0.02));
    g.add(pl);
  } else if (id === 'karpet') {
    g.add(mesh(new THREE.BoxGeometry(1.15, 0.04, 0.85), 0x9a3412, 0, 0.03, 0));
    g.add(mesh(new THREE.BoxGeometry(0.95, 0.02, 0.65), 0xc4a24a, 0, 0.05, 0));
  } else if (id === 'trophy') {
    g.add(mesh(new THREE.BoxGeometry(0.28, 0.1, 0.28), 0x6b4a28, 0, 0.06, 0));
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), 0xe8b84a, 0, 0.2, 0));
    g.add(mesh(new THREE.BoxGeometry(0.22, 0.1, 0.1), 0x38bdf8, 0, 0.38, 0));
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.08, 0.02), 0x38bdf8, -0.14, 0.38, 0));
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), 0xb45309, 0, 0.52, 0));
  }
  return g;
}

function gridToWorld(gx, gz) {
  return { x: HG.ox + (gx + 0.5) * HG.size, z: HG.oz + (gz + 0.5) * HG.size };
}

function worldToGrid(x, z) {
  const gx = Math.max(0, Math.min(HG.cols - 1, Math.floor((x - HG.ox) / HG.size)));
  const gz = Math.max(0, Math.min(HG.rows - 1, Math.floor((z - HG.oz) / HG.size)));
  return { gx, gz };
}

function playerGrid() {
  const p = world.player.position;
  const fx = Math.sin(world.player.rotation.y);
  const fz = Math.cos(world.player.rotation.y);
  return worldToGrid(p.x + fx * 0.7, p.z + fz * 0.7);
}

function buildHouseInterior() {
  const root = new THREE.Group();
  const { cx, cz, hw, hd } = HOUSE_IN;
  const floor = mesh(new THREE.BoxGeometry(hw * 2, 0.08, hd * 2), 0xb0894d, cx, -0.02, cz);
  root.add(floor);
  const wallH = 3.15;
  const wallY = wallH / 2;
  root.add(mesh(new THREE.BoxGeometry(hw * 2 + 0.2, wallH, 0.16), 0xf5f0e6, cx, wallY, cz - hd));
  root.add(mesh(new THREE.BoxGeometry(hw * 2 + 0.2, wallH, 0.16), 0xf5f0e6, cx, wallY, cz + hd));
  root.add(mesh(new THREE.BoxGeometry(0.16, wallH, hd * 2), 0xf3ead8, cx - hw, wallY, cz));
  root.add(mesh(new THREE.BoxGeometry(0.16, wallH, hd * 2), 0xf3ead8, cx + hw, wallY, cz));
  // doorway gap on south (+Z) wall: a darker door frame
  root.add(mesh(new THREE.BoxGeometry(1.15, 2.05, 0.08), 0x5c3d1e, cx, 1.02, cz + hd + 0.02));
  root.add(mesh(new THREE.BoxGeometry(0.9, 1.8, 0.04), 0x7c4a1e, cx, 0.95, cz + hd + 0.06));
  // windows
  const win = (x, z, rot, ix, iz) => {
    const frame = mesh(new THREE.BoxGeometry(1.02, 0.82, 0.06), 0x6b4a28, x, 1.55, z);
    frame.rotation.y = rot;
    root.add(frame);
    const glass = mesh(new THREE.BoxGeometry(0.88, 0.66, 0.04), new THREE.MeshBasicMaterial({ color: 0x7dd3fc }), x + ix, 1.55, z + iz);
    glass.rotation.y = rot;
    root.add(glass);
  };
  win(cx - 1.7, cz - hd + 0.2, 0, 0, 0.06);
  win(cx + 1.7, cz - hd + 0.2, 0, 0, 0.06);
  win(cx - hw + 0.2, cz, Math.PI / 2, 0.06, 0);
  win(cx + hw - 0.2, cz, Math.PI / 2, -0.06, 0);
  // baseboard
  root.add(mesh(new THREE.BoxGeometry(hw * 2, 0.1, 0.08), 0x8b5a2b, cx, 0.08, cz - hd + 0.1));
  root.add(mesh(new THREE.BoxGeometry(hw * 2, 0.1, 0.08), 0x8b5a2b, cx, 0.08, cz + hd - 0.1));
  const furnish = new THREE.Group();
  root.add(furnish);
  world.scene.add(root);
  world.houseRoot = root;
  world.houseFurnish = furnish;
  world.houseExit = { x: cx, z: cz + hd - 0.55 };
  addCollider(cx, cz - hd, 0.55);
  addCollider(cx, cz + hd, 0.55);
  addCollider(cx - hw, cz, 0.55);
  addCollider(cx + hw, cz, 0.55);
  // keep corners tight
  addCollider(cx - hw, cz - hd, 0.7);
  addCollider(cx + hw, cz - hd, 0.7);
  addCollider(cx - hw, cz + hd, 0.7);
  addCollider(cx + hw, cz + hd, 0.7);
}

function buildVillage() {
  makeHouse(-7.5, -10.2, 0.25, 0xf2e4c8, 0xb45309);
  makeHouse(8.2, -11.4, -0.4, 0xf6d6b8, 0x9a3412, 3.0, 2.6, 2.0);
  makeHouse(-9.4, -3.6, 1.1, 0xe9e2d0, 0x7c2d12, 2.8, 2.5, 2.0);
  makeHouse(3.6, -14.2, 0.1, 0xf0dcc0, 0xc2410c, 3.3, 2.8, 2.2);
  makeHouse(-11.8, -12.5, 0.35, 0xf6e7d0, 0xb45309, 3.0, 2.6, 2.05);
  makeHouse(10.6, -16.4, -0.55, 0xe8dcc4, 0x9a3412, 2.9, 2.55, 2.05);
  makeHouse(-12.4, -7.4, 0.95, 0xf3e2c8, 0x7c2d12, 2.7, 2.45, 1.95);
  makeHouse(5.6, -22.6, 0.12, 0xf0dcc0, 0xc2410c, 3.15, 2.7, 2.15);
  makeHouse(-5.8, -16.6, 0.2, 0xf7ecd8, 0xa16207, 2.85, 2.5, 2.0);
  makeHouse(-6.4, 3.4, Math.PI, 0xe9e2d0, 0xb45309, 2.8, 2.5, 2.0);

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

  makeMasjid(-10.6, -19.2);
  makeBalai(8.4, -20.6);
  makeBeringin(0.2, -19.4);
  world.ponds = [makePond(-8.6, -23.2, 2.15)];
  buildPondJetty();

  makeStall(9.4, 0.6, -0.4, 0xdc2626, 2.3);
  makeStall(10.6, -2.2, -0.15, 0xca8a04, 2.1);
  makeStall(10.8, -4.6, 0.1, 0x16a34a, 2.0);
  const shop = makeStall(9.2, -1.0, -0.55, 0x1d4e89, 2.45);
  shop.userData.kind = 'shop';
  world.shopStall = shop;

  makeMailbox('rumah1', -6.2, -8.7, 0.25);
  makeMailbox('rumah2', 3.6, -12.5, 0.1);
  makeMailbox('rumah3', -11.8, -10.8, 0.35);

  // kandang ayam (opening on the north/-Z side)
  placeFenceLoop([[-10.6, 2.4], [-7.0, 2.4], [-7.0, 5.6], [-10.6, 5.6]], 0);
  const coop = new THREE.Group();
  coop.add(mesh(new THREE.BoxGeometry(1.5, 1.05, 1.15), 0xc4a574, 0, 0.55, 0));
  coop.add(mesh(new THREE.BoxGeometry(1.7, 0.1, 1.35), 0x9a3412, 0, 1.12, 0));
  coop.position.set(-9.6, 0, 4.85);
  world.scene.add(coop);
  addCollider(-9.6, 4.85, 0.85);

  placeFenceLoop([[-4.6, -22.4], [3.6, -22.4], [3.6, -16.6], [-4.6, -16.6]], 2);

  placeFlowers();
  buildPlayerHouse();

  makeSign('DESA', -1.5, 1.5, 0);
  makeSign('RUMAHMU', PLAYER_HOUSE.x - 1.85, PLAYER_HOUSE.z + 2.15, -0.15);
  makeSign('MANCING', -5.35, -21.55, 0.4);
  makeSign('HUTAN', 13.2, -6, Math.PI / 2);
  makeSign('PANTAI', 1.2, 12.2, 0);
  makeSign('GUA', -14.2, 3.5, -Math.PI / 2);
  makeSign('PASAR', 7.4, 1.8, 0.4);
  makeSign('LANGGAR', -8.2, -16.4, 0.2);
  makeSign('BALAI', 6.2, -17.8, -0.3);
  makeLamp(1.7, -7.1, 2.4);
  makeLamp(-4.4, -8.6, 2.3);
  makeLamp(4.1, -4.2, 2.25);
  makeLamp(-1.1, -12.2, 2.35);
  makeLamp(-8.8, -17.4, 2.4);
  makeLamp(8.6, -18.4, 2.35);
  makeLamp(8.8, -0.6, 2.3);
  makeLamp(0.4, -16.6, 2.3);
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
    placeInstanced(new THREE.ConeGeometry(0.12, 0.7, 5), mat(0xc5dc6a), stalks, (p) => p.y * (p.sy || 1), 'stalk');
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

function makeLamp(x, z, h) {
  h = h || 2.35;
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.1, h, 6), 0x3f2f22, 0, h / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(0.28, 0.08, 0.28), 0x5c4330, 0, h + 0.02, 0));
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffc266, transparent: true, opacity: 0 })
  );
  glow.position.y = h + 0.16;
  g.add(glow);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0, depthWrite: false })
  );
  halo.position.y = h + 0.16;
  g.add(halo);
  const light = new THREE.PointLight(0xffb040, 0, 10, 2);
  light.position.y = h + 0.16;
  g.add(light);
  g.position.set(x, 0, z);
  world.scene.add(g);
  addCollider(x, z, 0.22);
  world.lamps.push({ glow, halo, light });
  return g;
}

function buildLights() {
  const hemi = new THREE.HemisphereLight(0xc9e8f5, 0x7a5a28, 0.95);
  world.scene.add(hemi);
  world.hemi = hemi;
  const sun = new THREE.DirectionalLight(0xfff1c9, 0.95);
  sun.position.set(28, 42, 18);
  world.scene.add(sun);
  world.sun = sun;
  const sunBall = mesh(new THREE.SphereGeometry(2.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a }), 40, 28, 22);
  world.scene.add(sunBall);
  world.sunBall = sunBall;
  const moonBall = mesh(new THREE.SphereGeometry(1.6, 8, 8), new THREE.MeshBasicMaterial({ color: 0xd9e7ff }), -40, 24, -16);
  moonBall.visible = false;
  world.scene.add(moonBall);
  world.moonBall = moonBall;
}

function buildParticles() {
  const rainN = 80;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(rainN * 2 * 3);
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: 0xb9d4e6, transparent: true, opacity: 0, depthWrite: false });
  const rainMesh = new THREE.LineSegments(rainGeo, rainMat);
  rainMesh.frustumCulled = false;
  rainMesh.visible = false;
  world.scene.add(rainMesh);
  const drops = [];
  for (let i = 0; i < rainN; i++) {
    drops.push({
      x: (Math.random() - 0.5) * 28,
      y: Math.random() * 14,
      z: (Math.random() - 0.5) * 28,
      v: 11 + Math.random() * 7,
    });
  }
  world.rain = { mesh: rainMesh, pos: rainPos, drops };

  const leafN = 32;
  const leafGeo = new THREE.BoxGeometry(0.2, 0.04, 0.12);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x5a8a3a });
  const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, leafN);
  leafMesh.frustumCulled = false;
  leafMesh.visible = false;
  const leafData = [];
  for (let i = 0; i < leafN; i++) {
    leafData.push({
      x: (Math.random() - 0.5) * 24,
      y: 1 + Math.random() * 6,
      z: (Math.random() - 0.5) * 24,
      vx: 0.6 + Math.random() * 1.4,
      vy: -0.2 - Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      spin: 1 + Math.random() * 2,
    });
  }
  world.scene.add(leafMesh);
  world.leaves = { mesh: leafMesh, data: leafData, dummy: new THREE.Object3D() };
}

const DAY_CYCLE = 300;
const SKY = {
  night: new THREE.Color(0x0b1730),
  dawn: new THREE.Color(0xf0a878),
  day: new THREE.Color(0x7ec4d8),
  dusk: new THREE.Color(0xe0955a),
  rain: new THREE.Color(0x4a5d6c),
};

function dayFactor() {
  const a = Math.cos((world.tod - 0.5) * Math.PI * 2);
  return Math.max(0, Math.min(1, a * 0.55 + 0.45));
}

function skyColorAt(tod, rainAmt) {
  const c = new THREE.Color();
  const t = ((tod % 1) + 1) % 1;
  if (t < 0.18) c.copy(SKY.night);
  else if (t < 0.28) c.copy(SKY.night).lerp(SKY.dawn, (t - 0.18) / 0.1);
  else if (t < 0.36) c.copy(SKY.dawn).lerp(SKY.day, (t - 0.28) / 0.08);
  else if (t < 0.64) c.copy(SKY.day);
  else if (t < 0.74) c.copy(SKY.day).lerp(SKY.dusk, (t - 0.64) / 0.1);
  else if (t < 0.84) c.copy(SKY.dusk).lerp(SKY.night, (t - 0.74) / 0.1);
  else c.copy(SKY.night);
  if (rainAmt > 0.01) c.lerp(SKY.rain, rainAmt * 0.7);
  return c;
}

function pickWeather() {
  const r = Math.random();
  if (r < 0.38) return 'rain';
  if (r < 0.7) return 'wind';
  return 'clear';
}

function setWeather(kind) {
  world.weather = kind === 'rain' || kind === 'wind' ? kind : 'clear';
  world.weatherDur = world.weather === 'clear' ? 80 + Math.random() * 90 : 35 + Math.random() * 35;
  world.weatherT = 0;
}

function updateSway(dt) {
  const t = world.clock.elapsedTime;
  const ampBase = 0.16 + world.windAmt * 0.7;
  if (ampBase < 0.03) return;
  for (const inst of world.swayers) {
    const dummy = inst.userData.dummy;
    const kind = inst.userData.sway;
    let mul = 1;
    if (kind === 'tree' || kind === 'palm') mul = 0.45;
    else if (kind === 'canopy' || kind === 'frond') mul = 1.15;
    else if (kind === 'grass' || kind === 'stalk') mul = 1.35;
    const amp = ampBase * mul;
    const bases = inst.userData.bases;
    for (let i = 0; i < bases.length; i++) {
      const b = bases[i];
      const w = Math.sin(t * (1.2 + (kind === 'grass' ? 1.1 : 0.3)) + b.phase) * amp;
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(b.rx + w * 0.25, b.ry, b.rz + w);
      dummy.scale.set(b.sx, b.sy, b.sz);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  }
}

function updateParticles(dt) {
  const cam = world.camera;
  const cx = cam ? cam.position.x : 0;
  const cz = cam ? cam.position.z : 0;
  if (world.rain && world.rainAmt > 0.04 && !world.inHouse) {
    const { mesh, pos, drops } = world.rain;
    mesh.visible = true;
    mesh.material.opacity = 0.35 + world.rainAmt * 0.4;
    const lean = 0.35 + world.windAmt * 0.5;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.y -= d.v * dt;
      d.x += lean * 3 * dt;
      if (d.y < 0) {
        d.y = 8 + Math.random() * 8;
        d.x = cx + (Math.random() - 0.5) * 26;
        d.z = cz + (Math.random() - 0.5) * 26;
      }
      const o = i * 6;
      pos[o] = d.x; pos[o + 1] = d.y; pos[o + 2] = d.z;
      pos[o + 3] = d.x + lean * 0.25; pos[o + 4] = d.y + 0.7; pos[o + 5] = d.z;
    }
    mesh.geometry.attributes.position.needsUpdate = true;
  } else if (world.rain) {
    world.rain.mesh.visible = false;
    world.rain.mesh.material.opacity = 0;
  }

  if (world.leaves && world.windAmt > 0.25) {
    const { mesh, data, dummy } = world.leaves;
    mesh.visible = true;
    const t = world.clock.elapsedTime;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      d.x += (d.vx + world.windAmt) * dt;
      d.y += d.vy * dt + Math.sin(t * 1.5 + d.phase) * 0.15 * dt;
      d.z += Math.sin(t * 0.7 + d.phase) * 0.5 * dt;
      if (d.y < 0.2 || d.x > cx + 16) {
        d.x = cx - 8 - Math.random() * 6;
        d.y = 1.5 + Math.random() * 6;
        d.z = cz + (Math.random() - 0.5) * 20;
      }
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(t * d.spin, t * d.spin * 0.7, d.phase);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  } else if (world.leaves) {
    world.leaves.mesh.visible = false;
  }
}

function updateAtmosphere(dt) {
  world.tod = (world.tod + dt / DAY_CYCLE) % 1;
  world.weatherT += dt;
  if (world.weather === 'clear') {
    if (world.weatherT > world.weatherDur) setWeather(pickWeather());
  } else if (world.weatherT > world.weatherDur) {
    setWeather('clear');
    world.weatherDur = 90 + Math.random() * 100;
  }
  const rainT = world.weather === 'rain' ? 1 : 0;
  const windT = (world.weather === 'wind' || world.weather === 'rain') ? 1 : 0.16;
  const k = 1 - Math.exp(-1.15 * dt);
  world.rainAmt += (rainT - world.rainAmt) * k;
  world.windAmt += (windT - world.windAmt) * k;

  const day = dayFactor();
  const night = 1 - day;
  const sky = skyColorAt(world.tod, world.rainAmt);
  if (world.scene) {
    world.scene.background.copy(sky);
    world.scene.fog.color.copy(sky);
    if (world.inHouse) {
      world.scene.fog.near = 12;
      world.scene.fog.far = 24;
    } else {
      world.scene.fog.near = 48 + night * 18;
      world.scene.fog.far = 140 - night * 20 - world.rainAmt * 18;
    }
  }
  if (world.renderer) world.renderer.setClearColor(sky, 1);
  if (world.hemi) {
    world.hemi.color.set(night > 0.6 ? 0x6a7aa0 : 0xc9e8f5);
    world.hemi.groundColor.set(night > 0.6 ? 0x1b1510 : 0x7a5a28);
    world.hemi.intensity = 0.22 + day * 0.78;
  }
  const ang = world.tod * Math.PI * 2 - Math.PI / 2;
  if (world.sun) {
    world.sun.position.set(Math.cos(ang) * 52, Math.sin(ang) * 44, 20);
    world.sun.color.set(day > 0.55 ? 0xfff1c9 : 0xffb070);
    world.sun.intensity = Math.max(0, Math.sin(ang)) * (0.95 - world.rainAmt * 0.35);
  }
  if (world.sunBall) {
    world.sunBall.position.copy(world.sun.position);
    world.sunBall.visible = world.sun.position.y > 3;
    world.sunBall.material.color.set(day > 0.55 ? 0xffe08a : 0xff9a4a);
  }
  if (world.moonBall) {
    world.moonBall.position.set(-Math.cos(ang) * 48, -Math.sin(ang) * 38, -16);
    world.moonBall.visible = world.moonBall.position.y > 4 && night > 0.35;
  }
  const lamp = Math.max(0, (night - 0.28) / 0.72);
  for (const L of world.lamps) {
    L.glow.material.opacity = lamp * 0.95;
    L.halo.material.opacity = lamp * 0.28;
    L.light.intensity = lamp * 1.15;
  }
  if (world.hemi && save.shop && save.shop.lentera) {
    world.hemi.intensity += night * 0.12;
  }
  applyPlayerGear();
  updateSway(dt);
  updateParticles(dt);
  updateAmbience(day, night, dt);
}

/* -------------------- audio + haptics -------------------- */
const audio = {
  ctx: null,
  master: null,
  rainGain: null,
  windGain: null,
  started: false,
  birdT: 0.8,
  cricketT: 0.4,
  noiseBuf: null,
};

function audioReady() {
  return !!(audio.started && audio.ctx && save.sound);
}

function unlockAudio() {
  if (audio.started) {
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = save.sound ? 0.5 : 0;
    master.connect(ctx.destination);
    const n = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.2;
    }
    function loopNoise(filterType, freq, q) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = freq;
      if (q) f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
      return g;
    }
    audio.ctx = ctx;
    audio.master = master;
    audio.noiseBuf = buf;
    audio.rainGain = loopNoise('highpass', 900, 0.7);
    audio.windGain = loopNoise('lowpass', 380, 0.4);
    audio.started = true;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch (err) {
    audio.started = false;
  }
}

function applyMasterGain() {
  if (!audio.master || !audio.ctx) return;
  const v = save.sound ? 0.5 : 0;
  try { audio.master.gain.setTargetAtTime(v, audio.ctx.currentTime, 0.04); } catch (err) { audio.master.gain.value = v; }
}

function playTone(freq, dur, type, vol, slide) {
  if (!audioReady()) return;
  try {
    const ctx = audio.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audio.master);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (err) { /* ignore */ }
}

function playNoiseBurst(dur, vol, freq) {
  if (!audioReady() || !audio.noiseBuf) return;
  try {
    const ctx = audio.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = audio.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 400;
    f.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(audio.master);
    src.start(t); src.stop(t + dur + 0.02);
  } catch (err) { /* ignore */ }
}

function sfxCoin() {
  playTone(920, 0.08, 'sine', 0.11, 1400);
  playTone(1380, 0.12, 'sine', 0.08);
}

function sfxHit() {
  playNoiseBurst(0.16, 0.22, 220);
  playTone(140, 0.14, 'square', 0.07, 70);
}

function sfxStep() {
  playNoiseBurst(0.07, 0.07, 180 + Math.random() * 80);
}

function sfxQuest() {
  playTone(523, 0.12, 'sine', 0.1);
  setTimeout(() => playTone(659, 0.12, 'sine', 0.1), 90);
  setTimeout(() => playTone(784, 0.2, 'sine', 0.12), 180);
}

function sfxBird() {
  const f = 1600 + Math.random() * 1600;
  playTone(f, 0.11 + Math.random() * 0.06, 'sine', 0.045, f * (0.65 + Math.random() * 0.5));
}

function sfxCricket() {
  playTone(4200 + Math.random() * 1400, 0.03, 'square', 0.025);
}

function updateAmbience(day, night, dt) {
  if (!audio.started || !audio.ctx) return;
  const now = audio.ctx.currentTime;
  const rainV = (save.sound ? world.rainAmt : 0) * 0.22;
  const windV = (save.sound ? (world.weather === 'wind' ? 0.16 : world.rainAmt * 0.06) : 0) + (save.sound ? 0.02 : 0);
  try {
    if (audio.rainGain) audio.rainGain.gain.setTargetAtTime(rainV, now, 0.2);
    if (audio.windGain) audio.windGain.gain.setTargetAtTime(windV, now, 0.25);
  } catch (err) { /* ignore */ }
  if (!audioReady()) return;
  audio.birdT -= dt;
  audio.cricketT -= dt;
  if (day > 0.45 && world.rainAmt < 0.55 && audio.birdT <= 0) {
    sfxBird();
    if (Math.random() < 0.35) setTimeout(sfxBird, 80 + Math.random() * 120);
    audio.birdT = 1.3 + Math.random() * 3.2;
  }
  if (night > 0.45 && audio.cricketT <= 0) {
    sfxCricket();
    audio.cricketT = 0.28 + Math.random() * 0.45;
  }
}

function canVibrate() {
  return !!(save.vibrate && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function');
}

function haptic(pattern) {
  if (!canVibrate()) return;
  try { navigator.vibrate(pattern); } catch (err) { /* unsupported */ }
}

function onQuestComplete() {
  haptic([40, 70, 40, 70, 90]);
  sfxQuest();
}

function onPlayerHit() {
  if (world.hitCD > 0) return;
  world.hitCD = 1.05;
  world.shake = 0.28;
  haptic([30, 40, 45]);
  sfxHit();
  if (save.hp == null) save.hp = save.maxHp || 3;
  save.hp = Math.max(0, save.hp - 1);
  refreshHud();
  if (save.hp <= 0) {
    save.hp = save.maxHp || 3;
    persist({ hp: save.hp });
    showToast('Kau terhuyung, tapi masih kuat.');
    world.hitCD = 1.6;
  } else {
    persist({ hp: save.hp });
  }
}

function checkEnemyHits() {
  if (!world.playing || world.blocked || world.hitCD > 0) return;
  const slime = nearestOf(world.slimes, 0.9, (s) => s.userData.alive);
  const roh = nearestOf(world.rohs, 1.0, (s) => s.userData.alive);
  if (slime || roh) onPlayerHit();
}

/* -------------------- entities -------------------- */

function inKandang(x, z) {
  return x > KANDANG.x0 + 0.2 && x < KANDANG.x1 - 0.2 && z > KANDANG.z0 + 0.2 && z < KANDANG.z1 - 0.2;
}

function makeAyam(color) {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.28, 0.16, 0.2), color, 0, 0.22, 0);
  const head = new THREE.Group();
  head.add(mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), color, 0, 0, 0));
  head.add(mesh(new THREE.BoxGeometry(0.05, 0.04, 0.08), 0xf59e0b, 0, -0.02, 0.1));
  head.add(mesh(new THREE.BoxGeometry(0.04, 0.08, 0.08), 0xb91c1c, 0, 0.1, 0));
  head.position.set(0, 0.34, 0.14);
  g.add(body, head);
  const legL = mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), 0xf59e0b, -0.06, 0.08, 0);
  const legR = mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), 0xf59e0b, 0.06, 0.08, 0);
  g.add(legL, legR);
  g.userData.parts = { head, legL, legR };
  return g;
}

function makeGrazer(kind) {
  const g = new THREE.Group();
  const cow = kind === 'cow';
  const bodyC = cow ? 0xf5f0e6 : 0xd6d3d1;
  g.add(mesh(new THREE.BoxGeometry(cow ? 0.85 : 0.55, cow ? 0.5 : 0.32, cow ? 0.45 : 0.28), bodyC, 0, cow ? 0.55 : 0.42, 0));
  if (cow) g.add(mesh(new THREE.BoxGeometry(0.22, 0.16, 0.18), 0x1c1410, 0.18, 0.62, 0.1));
  const head = mesh(new THREE.BoxGeometry(cow ? 0.32 : 0.2, cow ? 0.28 : 0.2, cow ? 0.28 : 0.22), bodyC, 0, cow ? 0.7 : 0.58, cow ? 0.4 : 0.28);
  g.add(head);
  g.add(mesh(new THREE.BoxGeometry(0.07, cow ? 0.18 : 0.16, 0.05), 0xe7e5e4, -0.1, cow ? 0.9 : 0.74, cow ? 0.38 : 0.26));
  g.add(mesh(new THREE.BoxGeometry(0.07, cow ? 0.18 : 0.16, 0.05), 0xe7e5e4, 0.1, cow ? 0.9 : 0.74, cow ? 0.38 : 0.26));
  const legS = cow ? 0.1 : 0.07;
  const legH = cow ? 0.32 : 0.26;
  const ox = cow ? 0.28 : 0.16, oz = cow ? 0.15 : 0.1;
  [[-ox, -oz], [ox, -oz], [-ox, oz], [ox, oz]].forEach(([lx, lz]) => {
    g.add(mesh(new THREE.BoxGeometry(legS, legH, legS), cow ? 0x1c1410 : 0xa8a29e, lx, legH / 2, lz));
  });
  g.userData.parts = { head };
  g.userData.kind = kind;
  return g;
}

function makeCat(color) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.34, 0.16, 0.18), color, 0, 0.2, 0));
  const head = mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), color, 0, 0.3, 0.16);
  g.add(head);
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.08, 0.04), color, -0.06, 0.4, 0.14));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.08, 0.04), color, 0.06, 0.4, 0.14));
  const tail = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.22), color, 0, 0.24, -0.2);
  g.add(tail);
  g.userData.parts = { head, tail };
  return g;
}

function makeBird() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), 0x1f2937, 0, 0, 0));
  const wingL = mesh(new THREE.BoxGeometry(0.32, 0.03, 0.12), 0x374151, -0.16, 0, 0);
  const wingR = mesh(new THREE.BoxGeometry(0.32, 0.03, 0.12), 0x374151, 0.16, 0, 0);
  g.add(wingL, wingR);
  g.userData.parts = { wingL, wingR };
  return g;
}

function makeFish(color) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.22, 0.1, 0.1), color, 0, 0, 0));
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.08, 0.02), color, -0.14, 0, 0));
  return g;
}

function makeFlutter(color) {
  const g = new THREE.Group();
  const wingL = mesh(new THREE.BoxGeometry(0.16, 0.02, 0.1), color, -0.08, 0, 0);
  const wingR = mesh(new THREE.BoxGeometry(0.16, 0.02, 0.1), color, 0.08, 0, 0);
  g.add(wingL, wingR);
  g.add(mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08), 0x1c1917, 0, 0, 0));
  g.userData.parts = { wingL, wingR };
  return g;
}

function spawnAnimals() {
  const A = world.animals;
  A.ayam = [];
  A.grazers = [];
  A.cats = [];
  A.birds = [];
  A.fish = [];
  A.flutters = [];
  const ayamSpots = [
    { id: 'a0', x: -1.2, z: -17.6, color: 0xf5f0e6 },
    { id: 'a1', x: 6.2, z: -8.4, color: 0xb45309 },
    { id: 'a2', x: 2.4, z: 1.1, color: 0xfef3c7 },
    { id: 'a3', x: -8.8, z: 4.2, color: 0xf5f0e6, pen: true },
  ];
  ayamSpots.forEach((s) => {
    const a = makeAyam(s.color);
    const caught = !!(s.pen || (save.ayamCaught && save.ayamCaught[s.id]));
    const x = caught ? (-9.4 + seeded(s.id.length + 7) * 1.6) : s.x;
    const z = caught ? (3.2 + seeded(s.id.length + 9) * 1.6) : s.z;
    a.position.set(x, 0, z);
    a.userData.id = s.id;
    a.userData.homeX = s.x;
    a.userData.homeZ = s.z;
    a.userData.state = caught ? 'pen' : 'wander';
    a.userData.caught = caught;
    a.userData.t = seeded(s.x) * 2;
    a.userData.heading = seeded(s.z) * Math.PI * 2;
    a.userData.quest = !s.pen;
    world.scene.add(a);
    A.ayam.push(a);
  });

  const grazeSpots = [
    { kind: 'goat', x: -8.2, z: -52.4 },
    { kind: 'goat', x: -1.6, z: -58.2 },
    { kind: 'cow', x: 7.4, z: -56.0 },
    { kind: 'cow', x: 10.2, z: -51.6 },
  ];
  grazeSpots.forEach((s, i) => {
    const g = makeGrazer(s.kind);
    g.position.set(s.x, 0, s.z);
    g.userData.homeX = s.x;
    g.userData.homeZ = s.z;
    g.userData.state = 'graze';
    g.userData.t = 1 + i;
    g.userData.heading = seeded(i + 40) * Math.PI * 2;
    world.scene.add(g);
    A.grazers.push(g);
  });

  [[-3.2, -8.8, 0xd6d3d1], [6.8, -13.2, 0x78716c]].forEach(([x, z, col], i) => {
    const c = makeCat(col);
    c.position.set(x, 0, z);
    c.userData.homeX = x;
    c.userData.homeZ = z;
    c.userData.state = 'sit';
    c.userData.t = 2 + i;
    c.userData.heading = i;
    c.userData.followT = 0;
    world.scene.add(c);
    A.cats.push(c);
  });

  for (let i = 0; i < 6; i++) {
    const b = makeBird();
    b.userData.r = 8 + i * 1.7;
    b.userData.cy = 8.5 + (i % 3) * 1.1;
    b.userData.cx = (i % 2) * 8 - 2;
    b.userData.cz = -10 - (i % 3) * 6;
    b.userData.phase = i * 0.9;
    b.userData.speed = 0.35 + i * 0.05;
    world.scene.add(b);
    A.birds.push(b);
  }

  const fishSpots = [
    { x: -8.6, z: -23.2, sea: false },
    { x: -8.2, z: -22.6, sea: false },
    { x: 3.2, z: 22.4, sea: true },
    { x: -6.0, z: 21.5, sea: true },
  ];
  fishSpots.forEach((s, i) => {
    const f = makeFish(i % 2 ? 0xf97316 : 0x38bdf8);
    f.position.set(s.x, s.sea ? -0.2 : -0.1, s.z);
    f.userData.homeX = s.x;
    f.userData.homeZ = s.z;
    f.userData.sea = s.sea;
    f.userData.t = 1 + i * 1.4;
    f.userData.jump = 0;
    world.scene.add(f);
    A.fish.push(f);
  });

  const cols = [0xf59e0b, 0x38bdf8, 0xf472b6, 0xa3e635, 0xfda4af];
  for (let i = 0; i < 5; i++) {
    const fl = makeFlutter(cols[i]);
    const fp = world.flowers[i] || { x: 0, z: -16 };
    fl.position.set(fp.x, 0.7, fp.z);
    fl.userData.homeX = fp.x;
    fl.userData.homeZ = fp.z;
    fl.userData.phase = i * 1.3;
    world.scene.add(fl);
    A.flutters.push(fl);
  }

  const nFire = 10;
  const inst = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.06, 5, 4),
    new THREE.MeshBasicMaterial({ color: 0xfde68a }),
    nFire
  );
  inst.userData.bases = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < nFire; i++) {
    const rec = {
      x: -12 + seeded(i + 200) * 22,
      z: -24 + seeded(i + 210) * 28,
      y: 0.5 + seeded(i + 220) * 1.4,
      phase: seeded(i + 230) * Math.PI * 2,
    };
    dummy.position.set(rec.x, rec.y, rec.z);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    inst.userData.bases.push(rec);
  }
  inst.userData.dummy = dummy;
  inst.visible = false;
  world.scene.add(inst);
  A.fireflies = inst;
}

function tryMoveAnimal(obj, nx, nz) {
  if (!isWalkable(nx, nz)) return false;
  if (Math.hypot(nx, nz) > WALK_R - 0.4) return false;
  obj.position.x = nx;
  obj.position.z = nz;
  return true;
}

function updateAyam(dt) {
  const t = world.clock.elapsedTime;
  const p = world.player;
  let changed = false;
  for (const a of world.animals.ayam) {
    const u = a.userData;
    u.t -= dt;
    const dx = p ? p.position.x - a.position.x : 0;
    const dz = p ? p.position.z - a.position.z : 0;
    const d = Math.hypot(dx, dz);
    if (u.caught || u.state === 'pen') {
      u.state = 'pen';
      if (u.t < 0) {
        u.t = 0.6 + Math.random() * 1.8;
        u.heading += (Math.random() - 0.5) * 1.2;
      }
      const nx = a.position.x + Math.sin(u.heading) * 0.35 * dt;
      const nz = a.position.z + Math.cos(u.heading) * 0.35 * dt;
      if (inKandang(nx, nz)) {
        a.position.x = nx;
        a.position.z = nz;
      } else {
        u.heading += 1.2;
      }
    } else if (p && world.playing && d < 2.15) {
      u.state = 'flee';
      u.heading = Math.atan2(-dx, -dz);
      const spd = 3.6;
      tryMoveAnimal(a, a.position.x + Math.sin(u.heading) * spd * dt, a.position.z + Math.cos(u.heading) * spd * dt);
      if (inKandang(a.position.x, a.position.z)) {
        u.caught = true;
        u.state = 'pen';
        if (u.quest) {
          const caught = { ...save.ayamCaught, [u.id]: true };
          persist({ ayamCaught: caught });
          changed = true;
          const n = ayamCaughtCount();
          if (save.quests.ayam === 'active') showToast('Ayam masuk kandang! (' + n + '/3)');
        }
      }
    } else {
      if (u.state === 'flee' && d > 3.2) u.state = 'wander';
      if (u.state === 'wander' && u.t < 0) {
        u.state = Math.random() < 0.45 ? 'peck' : 'wander';
        u.t = u.state === 'peck' ? 0.9 + Math.random() * 0.6 : 1.4 + Math.random();
        u.heading += (Math.random() - 0.5) * 1.6;
      }
      if (u.state === 'wander') {
        tryMoveAnimal(a, a.position.x + Math.sin(u.heading) * 0.7 * dt, a.position.z + Math.cos(u.heading) * 0.7 * dt);
      }
    }
    a.rotation.y = u.heading;
    a.position.y = groundHeight(a.position.x, a.position.z);
    const parts = u.parts;
    if (parts) {
      if (u.state === 'peck') parts.head.rotation.x = 0.85 + Math.sin(t * 10) * 0.25;
      else parts.head.rotation.x = Math.sin(t * 3 + u.heading) * 0.12;
      const step = (u.state === 'wander' || u.state === 'flee') ? Math.sin(t * (u.state === 'flee' ? 14 : 8)) * 0.35 : 0;
      parts.legL.rotation.x = step;
      parts.legR.rotation.x = -step;
    }
  }
  return changed;
}

function ayamCaughtCount() {
  let n = 0;
  for (const a of world.animals.ayam) {
    if (a.userData.quest && a.userData.caught) n++;
  }
  return n;
}

function captureAllAyam() {
  const caught = { ...save.ayamCaught };
  let i = 0;
  for (const a of world.animals.ayam) {
    if (!a.userData.quest) continue;
    a.userData.caught = true;
    a.userData.state = 'pen';
    a.position.set(-9.3 + i * 0.7, 0, 3.6 + i * 0.35);
    caught[a.userData.id] = true;
    i++;
  }
  persist({ ayamCaught: caught });
}

function updateGrazers(dt) {
  const t = world.clock.elapsedTime;
  for (const g of world.animals.grazers) {
    const u = g.userData;
    u.t -= dt;
    if (u.t < 0) {
      u.state = u.state === 'graze' ? 'walk' : 'graze';
      u.t = u.state === 'graze' ? 2 + Math.random() * 3 : 1.4 + Math.random() * 2;
      u.heading += (Math.random() - 0.5) * 1.4;
    }
    if (u.state === 'walk') {
      const nx = g.position.x + Math.sin(u.heading) * 0.55 * dt;
      const nz = g.position.z + Math.cos(u.heading) * 0.55 * dt;
      if (Math.hypot(nx - u.homeX, nz - u.homeZ) < 5 && isWalkable(nx, nz)) {
        g.position.x = nx;
        g.position.z = nz;
      } else {
        u.heading += 1.1;
      }
    }
    g.rotation.y = u.heading;
    g.position.y = groundHeight(g.position.x, g.position.z);
    if (u.parts && u.parts.head) {
      u.parts.head.rotation.x = u.state === 'graze' ? 0.7 + Math.sin(t * 1.5) * 0.08 : Math.sin(t * 3) * 0.1;
    }
  }
}

function updateCats(dt) {
  const t = world.clock.elapsedTime;
  const p = world.player;
  for (const c of world.animals.cats) {
    const u = c.userData;
    u.t -= dt;
    const dx = p ? p.position.x - c.position.x : 0;
    const dz = p ? p.position.z - c.position.z : 0;
    const d = Math.hypot(dx, dz);
    if (p && world.playing && d < 3.4 && d > 0.7) {
      u.state = 'follow';
      u.followT = 3.2;
      u.heading = Math.atan2(dx, dz);
      tryMoveAnimal(c, c.position.x + Math.sin(u.heading) * 1.5 * dt, c.position.z + Math.cos(u.heading) * 1.5 * dt);
    } else if (u.state === 'follow') {
      u.followT -= dt;
      if (u.followT <= 0) { u.state = 'sit'; u.t = 2; }
      else {
        u.heading = Math.atan2(dx, dz);
        if (d > 0.9) tryMoveAnimal(c, c.position.x + Math.sin(u.heading) * 1.3 * dt, c.position.z + Math.cos(u.heading) * 1.3 * dt);
      }
    } else if (u.t < 0) {
      u.state = u.state === 'sit' ? 'walk' : 'sit';
      u.t = u.state === 'sit' ? 2 + Math.random() * 3 : 1.5 + Math.random();
      u.heading += (Math.random() - 0.5) * 2;
    } else if (u.state === 'walk') {
      const nx = c.position.x + Math.sin(u.heading) * 0.7 * dt;
      const nz = c.position.z + Math.cos(u.heading) * 0.7 * dt;
      if (Math.hypot(nx - u.homeX, nz - u.homeZ) < 6 && isWalkable(nx, nz)) {
        c.position.x = nx; c.position.z = nz;
      } else u.heading += 1.2;
    }
    c.rotation.y = u.heading;
    c.position.y = groundHeight(c.position.x, c.position.z);
    if (u.parts && u.parts.tail) u.parts.tail.rotation.y = Math.sin(t * 3 + u.heading) * 0.4;
  }
}

function updateBirdsFishFlutters(dt) {
  const t = world.clock.elapsedTime;
  const day = dayFactor();
  const night = 1 - day;
  for (const b of world.animals.birds) {
    const u = b.userData;
    const ang = t * u.speed + u.phase;
    b.position.set(
      u.cx + Math.cos(ang) * u.r,
      u.cy + Math.sin(ang * 2) * 0.45,
      u.cz + Math.sin(ang) * u.r * 0.7
    );
    b.rotation.y = -ang + Math.PI / 2;
    b.visible = day > 0.28;
    if (u.parts) {
      const flap = Math.sin(t * 12 + u.phase) * 0.5;
      u.parts.wingL.rotation.z = 0.35 + flap;
      u.parts.wingR.rotation.z = -0.35 - flap;
    }
  }
  for (const f of world.animals.fish) {
    const u = f.userData;
    u.t -= dt;
    if (u.jump > 0) {
      u.jump += dt * 1.7;
      const k = u.jump;
      const y0 = u.sea ? -0.15 : -0.05;
      f.position.y = y0 + Math.sin(Math.min(1, k) * Math.PI) * (u.sea ? 1.15 : 0.85);
      f.position.x = u.homeX + Math.sin(k * 2) * 0.4;
      f.rotation.z = (0.5 - k) * 0.8;
      f.visible = f.position.y > y0 - 0.02;
      if (k >= 1) { u.jump = 0; u.t = 2.5 + Math.random() * 3; f.visible = false; }
    } else {
      f.visible = false;
      if (u.t < 0) { u.jump = 0.001; f.position.set(u.homeX, 0, u.homeZ); f.rotation.z = 0; }
    }
  }
  for (const fl of world.animals.flutters) {
    const u = fl.userData;
    const ang = t * 0.7 + u.phase;
    fl.position.set(
      u.homeX + Math.cos(ang) * 1.1,
      0.55 + Math.abs(Math.sin(t * 2 + u.phase)) * 0.55,
      u.homeZ + Math.sin(ang * 1.3) * 1.1
    );
    fl.visible = day > 0.32;
    if (u.parts) {
      const w = Math.sin(t * 16 + u.phase) * 0.7;
      u.parts.wingL.rotation.z = w;
      u.parts.wingR.rotation.z = -w;
    }
  }
  const fire = world.animals.fireflies;
  if (fire) {
    fire.visible = night > 0.45;
    if (fire.visible) {
      const dummy = fire.userData.dummy;
      fire.userData.bases.forEach((rec, i) => {
        dummy.position.set(
          rec.x + Math.sin(t * 0.6 + rec.phase) * 0.5,
          rec.y + Math.sin(t * 2.2 + rec.phase) * 0.25,
          rec.z + Math.cos(t * 0.5 + rec.phase) * 0.5
        );
        dummy.updateMatrix();
        fire.setMatrixAt(i, dummy.matrix);
      });
      fire.instanceMatrix.needsUpdate = true;
    }
  }
}

function updateWanderNpcs(dt) {
  const t = world.clock.elapsedTime;
  for (const n of world.npcs) {
    const u = n.userData;
    if (!u.wander || world.blocked) {
      continue;
    }
    u.wT -= dt;
    if (u.wState === 'walk') {
      const spd = 1.15;
      const nx = n.position.x + Math.sin(u.heading) * spd * dt;
      const nz = n.position.z + Math.cos(u.heading) * spd * dt;
      let blocked = !isWalkable(nx, nz) || Math.hypot(nx - u.homeX, nz - u.homeZ) > 8;
      if (!blocked) {
        for (const c of world.colliders) {
          if ((nx - c.x) * (nx - c.x) + (nz - c.z) * (nz - c.z) < (c.r + 0.5) * (c.r + 0.5)) { blocked = true; break; }
        }
      }
      if (blocked) u.heading += 1.3;
      else {
        n.position.x = nx;
        n.position.z = nz;
        n.rotation.y = u.heading;
      }
      if (u.wT < 0) { u.wState = 'idle'; u.wT = 1.5 + Math.random() * 2.5; }
      if (u.limbs) {
        const swing = Math.sin(t * 7) * 0.45;
        u.limbs.armL.rotation.x = swing;
        u.limbs.armR.rotation.x = -swing;
        u.limbs.legL.rotation.x = -swing;
        u.limbs.legR.rotation.x = swing;
      }
    } else if (u.wT < 0) {
      u.wState = 'walk';
      u.wT = 2 + Math.random() * 3;
      u.heading += (Math.random() - 0.5) * 2.2;
    }
  }
}

function updateAnimals(dt) {
  if (!world.animals || !world.animals.ayam) return;
  updateAyam(dt);
  updateGrazers(dt);
  updateCats(dt);
  updateBirdsFishFlutters(dt);
  updateWanderNpcs(dt);
}

function applyPlayerGear() {
  const p = world.player;
  if (!p) return;
  if (save.shop && save.shop.topi) {
    if (!world.playerGear.topi) {
      const hat = mesh(new THREE.ConeGeometry(0.34, 0.28, 8), 0xc4a24a, 0, 1.86, 0);
      p.add(hat);
      world.playerGear.topi = hat;
    }
    world.playerGear.topi.visible = true;
  } else if (world.playerGear.topi) {
    world.playerGear.topi.visible = false;
  }
  if (world.lanternLight) {
    const night = 1 - dayFactor();
    const on = !!(save.shop && save.shop.lentera);
    world.lanternLight.intensity = on ? Math.max(0.15, night * 1.55) : 0;
  }
  if (save.shop && save.shop.lentera) {
    if (!world.playerGear.lantern) {
      const lantern = new THREE.Group();
      lantern.add(mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), 0xb45309, 0, 0, 0));
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: 0xffc266 }));
      glow.position.y = 0;
      lantern.add(glow);
      lantern.position.set(0.28, 0.95, 0.12);
      p.add(lantern);
      world.playerGear.lantern = lantern;
    }
    world.playerGear.lantern.visible = true;
  } else if (world.playerGear.lantern) {
    world.playerGear.lantern.visible = false;
  }
}


function spawnPlayer() {
  const p = makePerson({
    shirt: 0x2a9d8f,
    pants: 0x1d3557,
    skin: 0xe0ac69,
    hair: 0x3b2a1a,
  });
  p.position.set(save.px, 0, save.pz);
  p.rotation.y = save.rot;
  const light = new THREE.PointLight(0xffc878, 0, 11, 2);
  light.position.set(0, 1.35, 0.25);
  p.add(light);
  world.lanternLight = light;
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
    {
      id: 'ijah',
      name: 'Bu Ijah',
      x: 7.55, z: -0.35, rot: 2.5,
      look: { shirt: 0x7c3aed, pants: 0x4c1d95, skin: 0xe0ac69, hair: 0x1c1410, hat: 'bun' },
    },
    {
      id: 'hasan',
      name: 'Pak Hasan',
      x: 8.0, z: -18.15, rot: 0.2,
      look: { shirt: 0xf5f0e6, pants: 0x1f2937, skin: 0xc9956b, hair: 0x4b3b2a, hat: 'peci' },
    },
    {
      id: 'yanti',
      name: 'Bu Yanti',
      x: -6.55, z: 2.05, rot: 0.35,
      look: { shirt: 0xdb2777, pants: 0x831843, skin: 0xe0ac69, hair: 0x1c1410, hat: 'bun' },
    },
    {
      id: 'budi',
      name: 'Mas Budi',
      x: 1.4, z: -3.6, rot: 0.3,
      wander: true,
      look: { shirt: 0x2563eb, pants: 0x1e3a5f, skin: 0xc9956b, hair: 0x1c1410, hat: 'cap' },
    },
    {
      id: 'tari',
      name: 'Nenek Tari',
      x: 1.6, z: -18.15, rot: -0.8,
      look: { shirt: 0x9a3412, pants: 0x44403c, skin: 0xc9956b, hair: 0x9ca3af, hat: 'bun' },
    },
    {
      id: 'joko',
      name: 'Bang Joko',
      x: 7.2, z: -7.4, rot: -0.5,
      wander: true,
      look: { shirt: 0xca8a04, pants: 0x3f3f46, skin: 0xb8874e, hair: 0x1c1410, hat: 'cap' },
    },
    {
      id: 'dedi',
      name: 'Pak Dedi',
      x: -6.15, z: -21.55, rot: -0.4,
      look: { shirt: 0x1d4e89, pants: 0x1e3a5f, skin: 0xb8874e, hair: 0x1c1410, hat: 'cap' },
    },
  ];
  world.npcs = list.map((spec) => {
    const p = makePerson(spec.look);
    p.position.set(spec.x, groundHeight(spec.x, spec.z), spec.z);
    p.rotation.y = spec.rot;
    p.userData.id = spec.id;
    p.userData.name = spec.name;
    p.userData.kind = 'npc';
    p.userData.homeX = spec.x;
    p.userData.homeZ = spec.z;
    p.userData.wander = !!spec.wander;
    p.userData.wState = 'idle';
    p.userData.wT = 1 + seeded(spec.x + 3) * 2;
    p.userData.heading = spec.rot;
    world.scene.add(p);
    if (!spec.wander) addCollider(spec.x, spec.z, 0.55);
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
  [0.4, -17.5], [-10.2, -14.8], [9.0, 1.4], [-8.0, 1.8],
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
  buildParticles();
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
  spawnAnimals();
  buildHouseInterior();
}

/* -------------------- save / ui -------------------- */
function persist(partial) {
  save = { ...save, ...partial, px: world.player ? world.player.position.x : save.px, pz: world.player ? world.player.position.z : save.pz, rot: world.player ? world.player.rotation.y : save.rot };
  writeSave(save);
  refreshHud();
}

function refreshHud() {
  ui.coinCount.textContent = String(save.coins);
  if (ui.hearts) {
    const hp = Math.max(0, save.hp || 0);
    const max = Math.max(3, save.maxHp || 3);
    ui.hearts.textContent = '♥'.repeat(hp) + '♡'.repeat(Math.max(0, max - hp));
  }
  if (ui.staminaFill) {
    ui.staminaFill.style.transform = 'scaleX(' + Math.max(0, Math.min(1, world.stamina)) + ')';
  }
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
  if (save.quests.ayam === 'active') {
    const n = ayamCaughtCount();
    lines.push(n >= 3 ? 'Bicara lagi dengan Bu Yanti' : 'Giring ayam ke kandang (' + n + '/3)');
  }
  if (save.quests.surat === 'active') {
    const n = letterCount();
    lines.push(n >= 3 ? 'Kembali ke Pak Hasan di balai' : 'Antar surat ke rumah (' + n + '/3)');
  }
  if (save.quests.mancing === 'active') {
    const n = Math.min(save.fishTotal || 0, 3);
    lines.push(n >= 3 ? 'Bicara lagi dengan Pak Dedi' : 'Mancing 3 ikan (' + n + '/3)');
  }
  if (save.quests.rumah === 'active') {
    const n = housePlacedCount();
    lines.push(n >= 1 ? 'Bicara lagi dengan Pak Kades' : 'Hias rumahmu dengan perabot');
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
  if (save.shop) {
    if (save.shop.sepatu) items.push(ITEM_NAMES.sepatu);
    if (save.shop.topi) items.push(ITEM_NAMES.topi);
    if (save.shop.lentera) items.push(ITEM_NAMES.lentera);
    if (save.shop.pancing) items.push(ITEM_NAMES.pancing);
    else items.push('Pancing bambu');
    if (save.shop.jamu) items.push('Jamu hati (sudah diminum)');
  }
  const bag = save.fishBag || {};
  const fishLines = Object.keys(FISH_TYPES).filter((id) => bag[id] > 0).map((id) => FISH_TYPES[id].name + ' ×' + bag[id]);
  const logN = fishLogCount();
  const owned = save.houseOwned || {};
  const houseLines = Object.keys(FURNITURE).filter((id) => owned[id] > 0).map((id) => FURNITURE[id].name + ' ×' + owned[id]);
  const empty = items.length === 1 && items[0].startsWith('Koin: 0') && !fishLines.length && !houseLines.length && logN === 0 && !(save.shop && (save.shop.sepatu || save.shop.topi || save.shop.lentera || save.shop.jamu || save.shop.pancing)) && save.inventory.length === 0;
  if (empty) {
    ui.invList.innerHTML = '<li class="empty">Tas masih kosong.</li>';
  } else {
    let html = items.map((t) => '<li>' + t + '</li>').join('');
    html += '<li class="inv-sub">Ikan (' + logN + '/8 jenis)</li>';
    html += fishLines.length ? fishLines.map((t) => '<li>' + t + '</li>').join('') : '<li class="empty">Belum ada ikan di tas.</li>';
    if (houseLines.length) {
      html += '<li class="inv-sub">Perabot</li>';
      html += houseLines.map((t) => '<li>' + t + '</li>').join('');
    }
    ui.invList.innerHTML = html;
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
  if (inHouseInterior(x, z)) return 'Rumah';
  if (z < -66 || (x > 13 && z < -62)) return 'Gunung';
  if (z < -38) return 'Sawah';
  if (x < -14 && z > -10 && z < 16) return 'Gua';
  if (z > 11) return 'Pantai';
  if (x > 12 && z < 9 && z > -28) return 'Hutan';
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
  else if (id === 'ijah') talkIjah();
  else if (id === 'hasan') talkHasan();
  else if (id === 'yanti') talkYanti();
  else if (id === 'dedi') talkDedi();
  else talkFlavor(npc);
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
      { label: 'Sama-sama', primary: true, fn: () => { persist({ quests: { ...save.quests, kades: 'done' } }); showToast('Misi Pak Kades selesai.'); closeDialog(); onQuestComplete(); maybeWin(); } },
    ]);
  } else if (save.quests.rumah === 'idle') {
    openDialog('Pak Kades', 'Terima kasih sudah membantu desa. Ada rumah kosong di selatan, dekat jalan ke pantai. Itu untukmu, nak. Hias dengan perabot dari toko atau dari dalam rumah.', [
      { label: 'Saya hias, Pak', primary: true, fn: () => { persist({ quests: { ...save.quests, rumah: 'active' } }); showToast('Misi baru: hias rumahmu di desa.'); closeDialog(); } },
      { label: 'Nanti saja', fn: closeDialog },
    ]);
  } else if (save.quests.rumah === 'active' && housePlacedCount() < 1) {
    openDialog('Pak Kades', 'Rumahmu ada di selatan desa, ada papan "RUMAHMU". Beli perabot, masuk ke dalam, lalu letakkan setidaknya satu perabot.', [
      { label: 'Baik, Pak', primary: true, fn: closeDialog },
    ]);
  } else if (save.quests.rumah === 'active') {
    openDialog('Pak Kades', 'Rumahmu sudah mulai terasa hangat. Bagus, nak. Ini sedikit koin untuk perabot berikutnya.', [
      { label: 'Terima kasih, Pak', primary: true, fn: () => {
        persist({ coins: save.coins + 4, quests: { ...save.quests, rumah: 'done' } });
        showToast('Misi rumah selesai. Kau mendapat 4 koin.');
        closeDialog();
        onQuestComplete();
      } },
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
        onQuestComplete();
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
        onQuestComplete();
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
        onQuestComplete();
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
        onQuestComplete();
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


function letterCount() {
  const L = save.letters || {};
  return (L.rumah1 ? 1 : 0) + (L.rumah2 ? 1 : 0) + (L.rumah3 ? 1 : 0);
}

function talkFlavor(npc) {
  const id = npc.userData.id;
  let text = 'Selamat datang di desa kami.';
  if (id === 'budi') text = 'Pasar pagi ini ramai, nak. Coba lihat toko Bu Ijah kalau butuh sepatu, pancing, atau perabot rumah.';
  else if (id === 'joko') text = 'Ada rumah kosong di selatan desa, dekat jalan ke pantai. Katanya itu untuk pendatang baru.';
  else if (id === 'tari') text = 'Kolam di dekat langgar enak untuk mancing, nak. Pak Dedi biasanya menunggu di tepinya.';
  openDialog(npc.userData.name, text, [{ label: 'Baik', primary: true, fn: closeDialog }]);
}

function talkDedi() {
  const q = save.quests.mancing;
  const n = save.fishTotal || 0;
  const bagN = fishCount();
  const sellBtn = { label: bagN ? ('Jual ikan (' + fishValue() + ' koin)') : 'Tidak ada ikan', fn: () => {
    if (!bagN) { closeDialog(); return; }
    sellAllFish();
    closeDialog();
  } };
  if (q === 'idle') {
    openDialog('Pak Dedi', 'Kolam desa dan dermaga pantai ramai ikannya. Coba mancing, lalu kumpulkan 3 ikan. Nanti bisa dijual kepadaku atau di Toko Pasar. Pancing bambu sudah cukup untuk mulai.', [
      { label: 'Saya mancing', primary: true, fn: () => { persist({ quests: { ...save.quests, mancing: 'active' } }); showToast('Misi baru: mancing 3 ikan.'); closeDialog(); } },
      { label: 'Nanti saja', fn: closeDialog },
    ]);
  } else if (q === 'active' && n < 3) {
    openDialog('Pak Dedi', 'Ikan yang tertangkap masih ' + n + ' dari 3. Lempar pancing di kolam atau di dermaga pantai, lalu tarik saat umpan disambar.', [
      sellBtn,
      { label: 'Baik, Pak', primary: true, fn: closeDialog },
    ]);
  } else if (q === 'active') {
    openDialog('Pak Dedi', 'Tiga ikan sudah di tangan! Kau cepat belajar. Ini sedikit koin, dan kalau mau hasil lebih bagus, beli pancing kuat di toko Bu Ijah.', [
      { label: 'Terima kasih', primary: true, fn: () => {
        persist({ coins: save.coins + 5, quests: { ...save.quests, mancing: 'done' } });
        showToast('Misi mancing selesai. Kau mendapat 5 koin.');
        closeDialog();
        onQuestComplete();
      } },
    ]);
  } else {
    openDialog('Pak Dedi', bagN
      ? ('Mau jual ' + bagN + ' ikan seharga ' + fishValue() + ' koin? Catatanmu ' + fishLogCount() + ' dari 8 jenis.')
      : ('Kolam dan pantai menunggu. Catatanmu ' + fishLogCount() + ' dari 8 jenis. Pancing kuat di toko membantu mendapat ikan langka.'), [
      sellBtn,
      { label: 'Nanti saja', primary: !bagN, fn: closeDialog },
    ]);
  }
}

function talkIjah() {
  openDialog('Bu Ijah', 'Selamat datang di Toko Pasar. Ada sepatu, topi, jamu, lentera, pancing kuat, dan perabot rumah. Ikan hasil pancingan juga bisa dijual di sini.', [
    { label: 'Lihat barang', primary: true, fn: () => { closeDialog(); openShop(); } },
    { label: 'Nanti saja', fn: closeDialog },
  ]);
}

function talkYanti() {
  const q = save.quests.ayam;
  const n = ayamCaughtCount();
  if (q === 'idle') {
    openDialog('Bu Yanti', 'Aduh, tiga ayamku kabur ke lapangan dan sekitar pasar! Tolong giring mereka kembali ke kandang di sebelah sini.', [
      { label: 'Saya giring', primary: true, fn: () => { persist({ quests: { ...save.quests, ayam: 'active' } }); showToast('Misi baru: giring ayam ke kandang.'); closeDialog(); } },
      { label: 'Nanti saja', fn: closeDialog },
    ]);
  } else if (q === 'active' && n < 3) {
    openDialog('Bu Yanti', 'Masih ada ayam yang belum masuk. Sudah ' + n + ' dari 3. Dekati mereka perlahan, lalu arahkan ke kandang.', [
      { label: 'Baik, Bu', primary: true, fn: closeDialog },
    ]);
  } else if (q === 'active') {
    openDialog('Bu Yanti', 'Wah, semua ayam sudah kembali! Terima kasih, nak. Ini sedikit koin untukmu.', [
      { label: 'Sama-sama, Bu', primary: true, fn: () => {
        persist({ coins: save.coins + 4, quests: { ...save.quests, ayam: 'done' } });
        showToast('Misi Bu Yanti selesai. Kau mendapat 4 koin.');
        closeDialog();
        onQuestComplete();
        maybeWin();
      } },
    ]);
  } else {
    openDialog('Bu Yanti', 'Ayam-ayam sudah tenang di kandang. Kalau lapar, beli jamu di toko Bu Ijah ya.', [
      { label: 'Baik, Bu', primary: true, fn: closeDialog },
    ]);
  }
}

function talkHasan() {
  const q = save.quests.surat;
  const n = letterCount();
  if (q === 'idle') {
    openDialog('Pak Hasan', 'Ada tiga surat dari balai desa yang harus sampai ke rumah warga. Tolong masukkan ke kotak surat di depan tiga rumah itu, ya.', [
      { label: 'Saya antar', primary: true, fn: () => {
        const inv = save.inventory.includes('surat') ? save.inventory : [...save.inventory, 'surat'];
        persist({ inventory: inv, quests: { ...save.quests, surat: 'active' } });
        showToast('Misi baru: antar tiga surat ke rumah warga.');
        closeDialog();
      } },
      { label: 'Nanti saja', fn: closeDialog },
    ]);
  } else if (q === 'active' && n < 3) {
    openDialog('Pak Hasan', 'Suratnya belum semua sampai. Sudah ' + n + ' dari 3 rumah. Cari kotak surat di depan rumah.', [
      { label: 'Baik, Pak', primary: true, fn: closeDialog },
    ]);
  } else if (q === 'active') {
    openDialog('Pak Hasan', 'Semua surat sudah sampai. Desa berterima kasih. Ini sedikit koin untuk perjalananmu.', [
      { label: 'Sama-sama, Pak', primary: true, fn: () => {
        persist({
          coins: save.coins + 4,
          inventory: save.inventory.filter((x) => x !== 'surat'),
          quests: { ...save.quests, surat: 'done' },
        });
        showToast('Misi Pak Hasan selesai. Kau mendapat 4 koin.');
        closeDialog();
        onQuestComplete();
        maybeWin();
      } },
    ]);
  } else {
    openDialog('Pak Hasan', 'Balai desa selalu terbuka. Kalau butuh berita kampung, datang saja ke sini.', [
      { label: 'Baik, Pak', primary: true, fn: closeDialog },
    ]);
  }
}

function deliverLetter(id) {
  if (save.quests.surat !== 'active') {
    showToast('Bicara dulu dengan Pak Hasan di balai desa.');
    return;
  }
  if (!save.inventory.includes('surat')) {
    showToast('Suratnya tidak ada di tas.');
    return;
  }
  if (save.letters && save.letters[id]) {
    showToast('Surat untuk rumah ini sudah masuk.');
    return;
  }
  const letters = { ...(save.letters || {}), [id]: true };
  persist({ letters });
  const n = letterCount();
  showToast(n >= 3 ? 'Semua surat sampai. Kembali ke Pak Hasan.' : 'Surat dimasukkan. (' + n + '/3)');
  haptic(16);
  sfxCoin();
}

function deliverAllLetters() {
  persist({ letters: { rumah1: true, rumah2: true, rumah3: true } });
}

const MAIL_NAMES = { rumah1: 'rumah sebelah barat', rumah2: 'rumah dekat sumur', rumah3: 'rumah dekat langgar' };

function openShop() {
  if (!world.playing || !ui.win.hidden) return;
  if (world.fishing && world.fishing.active) return;
  if (!ui.dialog.hidden) closeDialog();
  ui.inv.hidden = true;
  if (ui.fxPanel) ui.fxPanel.hidden = true;
  renderShop();
  ui.shopPanel.hidden = false;
  world.blocked = true;
  ui.controls.hidden = true;
}

function closeShop() {
  if (ui.shopPanel) ui.shopPanel.hidden = true;
  if (!uiBlocking()) {
    world.blocked = false;
    layoutControls();
  }
}

function addShopRow(parent, title, desc, rightEl) {
  const li = document.createElement('li');
  li.innerHTML = '<div class="shop-name">' + title + '</div><div class="shop-desc">' + desc + '</div><div class="shop-buy"></div>';
  li.querySelector('.shop-buy').appendChild(rightEl);
  parent.appendChild(li);
  return li;
}

function renderShop() {
  if (!ui.shopList) return;
  if (ui.shopCoins) ui.shopCoins.textContent = String(save.coins);
  ui.shopList.innerHTML = '';
  const bagN = fishCount();
  if (bagN) {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.justifyContent = 'space-between';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '8px';
    wrap.style.width = '100%';
    const price = document.createElement('span');
    price.textContent = fishValue() + ' koin';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn primary';
    b.textContent = 'Jual semua';
    b.addEventListener('click', (e) => { e.preventDefault(); sellAllFish(); });
    wrap.appendChild(price);
    wrap.appendChild(b);
    addShopRow(ui.shopList, 'Jual ikan (' + bagN + ' ekor)', 'Hasil mancing dijual ke toko.', wrap);
  }
  SHOP_ITEMS.forEach((it) => {
    const owned = !!(save.shop && save.shop[it.id]);
    const li = document.createElement('li');
    const can = !owned && save.coins >= it.price;
    li.innerHTML = '<div class="shop-name">' + it.name + '</div><div class="shop-desc">' + it.desc + '</div><div class="shop-buy"></div>';
    const row = li.querySelector('.shop-buy');
    if (owned) {
      const s = document.createElement('span');
      s.className = 'owned';
      s.textContent = 'Sudah dimiliki';
      row.appendChild(s);
    } else {
      const price = document.createElement('span');
      price.textContent = it.price + ' koin';
      row.appendChild(price);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn primary';
      b.textContent = 'Beli';
      if (!can) { b.disabled = true; li.classList.add('pricey'); }
      b.addEventListener('click', (e) => { e.preventDefault(); buyItem(it.id); });
      row.appendChild(b);
    }
    ui.shopList.appendChild(li);
  });
  Object.keys(FURNITURE).forEach((id) => {
    const it = FURNITURE[id];
    const owned = (save.houseOwned && save.houseOwned[id]) || 0;
    const cap = id === 'trophy' ? 1 : 3;
    const li = document.createElement('li');
    const lockedRare = !!(it.needRare && !hasRareFish());
    const can = !lockedRare && owned < cap && save.coins >= it.price;
    li.innerHTML = '<div class="shop-name">' + it.name + '</div><div class="shop-desc">' + it.desc + (owned ? ' (dimiliki ' + owned + ')' : '') + (lockedRare ? ' Butuh ikan langka.' : '') + '</div><div class="shop-buy"></div>';
    const row = li.querySelector('.shop-buy');
    if (owned >= cap) {
      const s = document.createElement('span');
      s.className = 'owned';
      s.textContent = 'Sudah cukup';
      row.appendChild(s);
    } else {
      const price = document.createElement('span');
      price.textContent = it.price + ' koin';
      row.appendChild(price);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn primary';
      b.textContent = 'Beli';
      if (!can) { b.disabled = true; li.classList.add('pricey'); }
      b.addEventListener('click', (e) => { e.preventDefault(); buyFurniture(id); });
      row.appendChild(b);
    }
    ui.shopList.appendChild(li);
  });
}

function buyItem(id) {
  const it = SHOP_ITEMS.find((x) => x.id === id);
  if (!it) return false;
  if (save.shop && save.shop[id]) { showToast('Barang ini sudah dimiliki.'); return false; }
  if (save.coins < it.price) { showToast('Koin tidak cukup.'); return false; }
  const shop = { ...(save.shop || {}), [id]: true };
  const partial = { coins: save.coins - it.price, shop };
  if (id === 'jamu') {
    const maxHp = (save.maxHp || 3) + 1;
    partial.maxHp = maxHp;
    partial.hp = maxHp;
  }
  persist(partial);
  applyPlayerGear();
  renderShop();
  showToast(it.name + ' terbeli.');
  haptic(20);
  sfxCoin();
  return true;
}


function fishCount() {
  const bag = save.fishBag || {};
  let n = 0;
  for (const k in bag) n += bag[k] || 0;
  return n;
}

function fishValue() {
  const bag = save.fishBag || {};
  let v = 0;
  for (const k in bag) v += (bag[k] || 0) * ((FISH_TYPES[k] && FISH_TYPES[k].price) || 0);
  return v;
}

function fishLogCount() {
  const log = save.fishLog || {};
  return Object.keys(FISH_TYPES).filter((id) => log[id] > 0).length;
}

function hasRareFish() {
  const log = save.fishLog || {};
  return !!(log.gurame || log.kakap);
}

function housePlacedCount() {
  return (save.housePlaced || []).length;
}

function ownedFree(id) {
  const owned = (save.houseOwned && save.houseOwned[id]) || 0;
  const used = (save.housePlaced || []).filter((p) => p.id === id).length;
  return Math.max(0, owned - used);
}

function furnitureRadius(id) {
  if (id === 'kasur' || id === 'meja') return 0.55;
  if (id === 'lemari') return 0.42;
  if (id === 'karpet' || id === 'batik') return 0;
  return 0.32;
}

function clearHouseItemColliders() {
  world.colliders = world.colliders.filter((c) => !c.houseItem);
}

function syncHouseFromSave() {
  if (!world.houseFurnish) return;
  while (world.houseFurnish.children.length) world.houseFurnish.remove(world.houseFurnish.children[0]);
  clearHouseItemColliders();
  for (const rec of (save.housePlaced || [])) {
    if (!FURNITURE[rec.id]) continue;
    const m = makeFurnitureMesh(rec.id);
    const pos = gridToWorld(rec.gx, rec.gz);
    m.position.set(pos.x, 0, pos.z);
    m.rotation.y = rec.rot || 0;
    if (rec.id === 'batik') {
      // keep painting on the nearest wall
      snapBatik(m, rec);
    }
    m.userData.placed = rec;
    world.houseFurnish.add(m);
    const r = furnitureRadius(rec.id);
    if (r > 0) world.colliders.push({ x: pos.x, z: pos.z, r, houseItem: true });
  }
}

function snapBatik(m, rec) {
  const pos = gridToWorld(rec.gx, rec.gz);
  const { cx, cz, hw, hd } = HOUSE_IN;
  const dist = [
    { wall: 'n', d: Math.abs(pos.z - (cz - hd)), x: pos.x, z: cz - hd + 0.12, rot: 0 },
    { wall: 's', d: Math.abs(pos.z - (cz + hd)), x: pos.x, z: cz + hd - 0.12, rot: Math.PI },
    { wall: 'w', d: Math.abs(pos.x - (cx - hw)), x: cx - hw + 0.12, z: pos.z, rot: Math.PI / 2 },
    { wall: 'e', d: Math.abs(pos.x - (cx + hw)), x: cx + hw - 0.12, z: pos.z, rot: -Math.PI / 2 },
  ];
  dist.sort((a, b) => a.d - b.d);
  const w = dist[0];
  m.position.set(w.x, 0, w.z);
  m.rotation.y = w.rot;
}

function cellTaken(gx, gz, ignore) {
  return (save.housePlaced || []).some((p, i) => i !== ignore && p.gx === gx && p.gz === gz);
}

function enterHouse() {
  if (world.inHouse) return;
  closeFish();
  closeDecor();
  closeShop();
  closeFx();
  closeInv();
  if (!ui.dialog.hidden) closeDialog();
  world.inHouse = true;
  const x = HOUSE_IN.cx;
  const z = HOUSE_IN.cz + HOUSE_IN.hd - 1.15;
  world.player.position.set(x, 0, z);
  world.player.rotation.y = Math.PI;
  world.camYaw = Math.PI;
  world.camPitch = world.viewMode === 'first' ? 0 : 0.42;
  snapCamera();
  world.areaName = 'Rumah';
  ui.area.textContent = 'Rumah';
  if (save.quests.rumah === 'idle') {
    persist({ quests: { ...save.quests, rumah: 'active' } });
    showToast('Ini rumahmu. Beli perabot dan hias ruangan.');
  } else {
    showToast('Selamat datang di rumahmu.');
  }
}

function exitHouse() {
  if (!world.inHouse) return;
  closeDecor();
  world.inHouse = false;
  const d = world.houseDoor || { x: PLAYER_HOUSE.x, z: PLAYER_HOUSE.z + 2.1 };
  world.player.position.set(d.x, 0, d.z + 0.35);
  world.player.rotation.y = 0;
  world.camYaw = 0;
  world.camPitch = world.viewMode === 'first' ? 0 : CAM_PITCH_TP;
  snapCamera();
  const area = areaAt(world.player.position.x, world.player.position.z);
  world.areaName = area;
  ui.area.textContent = area;
  showToast('Kembali ke desa.');
}

function setInHouseFromPos() {
  if (!world.player) return;
  world.inHouse = inHouseInterior(world.player.position.x, world.player.position.z);
}

function nearFishSpot() {
  if (!world.player || world.inHouse) return null;
  const p = world.player.position;
  let best = null, bestD = 99;
  for (const s of FISH_SPOTS) {
    const d = Math.hypot(p.x - s.x, p.z - s.z);
    if (d <= s.r && d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function sfxCast() { playNoiseBurst(0.16, 0.08, 700); playTone(220, 0.12, 'sine', 0.07); }
function sfxBite() { playTone(660, 0.09, 'square', 0.07); playTone(880, 0.1, 'square', 0.05, 990); }
function sfxCatch() { playTone(523, 0.1, 'sine', 0.08); playTone(659, 0.12, 'sine', 0.08); playTone(784, 0.16, 'sine', 0.09); }
function sfxMiss() { playTone(220, 0.2, 'triangle', 0.07, 140); }

function betterRod() { return !!(save.shop && save.shop.pancing); }

function showFishBar(on, zone0, zone1, marker) {
  if (!ui.fishBar) return;
  ui.fishBar.hidden = !on;
  if (!on) return;
  const z0 = Math.max(0, zone0);
  const z1 = Math.min(1, zone1);
  ui.fishZone.style.left = (z0 * 100) + '%';
  ui.fishZone.style.width = ((z1 - z0) * 100) + '%';
  ui.fishMarker.style.left = (marker * 100) + '%';
}

function setFishUI() {
  const f = world.fishing;
  if (!f || !ui.fishPanel) return;
  ui.fishTitle.textContent = 'Mancing · ' + f.spot.name;
  if (f.phase === 'ready') {
    ui.fishStatus.textContent = betterRod()
      ? 'Pancing kuat siap. Lempar umpan, lalu tunggu hingga ikan menyambar.'
      : 'Lempar pancing ke air, lalu tunggu umpan disambar.';
    ui.btnFishMain.textContent = 'Lempar';
    showFishBar(false);
  } else if (f.phase === 'wait') {
    ui.fishStatus.textContent = 'Umpan di air. Sabar, tunggu hingga ada yang menyambar...';
    ui.btnFishMain.textContent = 'Menunggu';
    showFishBar(false);
  } else if (f.phase === 'bite') {
    ui.fishStatus.textContent = 'Ada yang menyambar! Ketuk Tarik saat penanda berada di zona hijau.';
    ui.btnFishMain.textContent = 'Tarik';
    showFishBar(true, f.zone0, f.zone1, f.marker);
  } else if (f.phase === 'result') {
    showFishBar(false);
    ui.btnFishMain.textContent = 'Lempar lagi';
  }
}

function ensureBobber(spot) {
  if (!world.bobber) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xdc2626 }), 0, 0, 0));
    g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf5f0e6 }), 0, 0.07, 0));
    world.scene.add(g);
    world.bobber = g;
  }
  world.bobber.visible = true;
  world.bobber.position.set(spot.waterX, spot.biome === 'beach' ? -0.18 : 0.1, spot.waterZ);
}

function hideBobber() {
  if (world.bobber) world.bobber.visible = false;
}

function openFishing(spot) {
  if (!world.playing || !ui.win.hidden) return;
  if (!ui.dialog.hidden) closeDialog();
  closeShop(); closeFx(); closeInv(); closeDecor();
  world.fishing = {
    active: true,
    phase: 'ready',
    spot,
    t: 0,
    wait: 0,
    marker: 0.12,
    dir: 1,
    zone0: 0.4,
    zone1: 0.62,
    result: null,
  };
  world.blocked = true;
  ui.controls.hidden = true;
  ui.fishPanel.hidden = false;
  setFishUI();
  ensureBobber(spot);
  hideBobber();
}

function closeFish() {
  if (world.fishing) world.fishing.active = false;
  world.fishing = null;
  hideBobber();
  if (ui.fishPanel) ui.fishPanel.hidden = true;
  if (ui.decorPanel && !ui.decorPanel.hidden) return;
  if ((!ui.fxPanel || ui.fxPanel.hidden) && ui.inv.hidden && (!ui.shopPanel || ui.shopPanel.hidden) && ui.dialog.hidden) {
    world.blocked = false;
    layoutControls();
  }
}

function pickFish(biome) {
  const rod = betterRod();
  const pool = [];
  let total = 0;
  for (const id in FISH_TYPES) {
    const ft = FISH_TYPES[id];
    if (ft.biome !== biome) continue;
    let w = ft.w;
    if (rod && ft.rarity === 'langka') w *= 1.7;
    else if (rod && ft.rarity === 'agak langka') w *= 1.25;
    pool.push({ id, w });
    total += w;
  }
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.w;
    if (r <= 0) return p.id;
  }
  return pool[0].id;
}

function addCaughtFish(id) {
  const bag = { ...(save.fishBag || {}) };
  const log = { ...(save.fishLog || {}) };
  bag[id] = (bag[id] || 0) + 1;
  log[id] = (log[id] || 0) + 1;
  persist({ fishBag: bag, fishLog: log, fishTotal: (save.fishTotal || 0) + 1 });
}

function startCast() {
  const f = world.fishing;
  if (!f || f.phase !== 'ready' && f.phase !== 'result') return;
  f.phase = 'wait';
  f.t = 0;
  f.wait = (betterRod() ? 1.05 : 1.6) + Math.random() * (betterRod() ? 1.6 : 2.6);
  f.result = null;
  ensureBobber(f.spot);
  sfxCast();
  haptic(12);
  setFishUI();
}

function startBite() {
  const f = world.fishing;
  if (!f) return;
  ensureBobber(f.spot);
  f.phase = 'bite';
  f.t = 0;
  const width = betterRod() ? 0.3 : 0.2;
  f.zone0 = 0.18 + Math.random() * (0.7 - width);
  f.zone1 = f.zone0 + width;
  f.marker = Math.random() < 0.5 ? 0.06 : 0.94;
  f.dir = f.marker < 0.5 ? 1 : -1;
  f.biteWindow = betterRod() ? 2.7 : 2.15;
  sfxBite();
  haptic([18, 40, 24]);
  setFishUI();
}

function resolveYank() {
  const f = world.fishing;
  if (!f || f.phase !== 'bite') return;
  const hit = f.marker >= f.zone0 && f.marker <= f.zone1;
  finishFishing(hit);
}

function finishFishing(ok) {
  const f = world.fishing;
  if (!f) return;
  f.phase = 'result';
  if (ok) {
    const id = pickFish(f.spot.biome);
    addCaughtFish(id);
    const ft = FISH_TYPES[id];
    f.result = id;
    ui.fishStatus.textContent = 'Dapat ' + ft.name + ' (' + ft.rarity + ')! Bisa dijual ke Pak Dedi atau Toko Pasar.';
    showToast('Ikan tertangkap: ' + ft.name);
    sfxCatch();
    haptic(30);
  } else {
    f.result = null;
    ui.fishStatus.textContent = 'Ikan lepas! Coba lempar lagi, dan tarik saat penanda di zona hijau.';
    showToast('Ikan lepas!');
    sfxMiss();
    haptic([8, 30, 8]);
  }
  hideBobber();
  setFishUI();
}

function fishMainAction() {
  const f = world.fishing;
  if (!f || !f.active) return;
  if (f.phase === 'ready' || f.phase === 'result') startCast();
  else if (f.phase === 'wait') showToast('Sabar, umpan belum disambar.');
  else if (f.phase === 'bite') resolveYank();
}

function updateFishing(dt) {
  const f = world.fishing;
  if (!f || !f.active) return;
  if (f.phase === 'wait') {
    f.t += dt;
    if (world.bobber && world.bobber.visible) {
      world.bobber.position.y = (f.spot.biome === 'beach' ? -0.18 : 0.1) + Math.sin(world.clock.elapsedTime * 3) * 0.03;
    }
    if (f.t >= f.wait) startBite();
  } else if (f.phase === 'bite') {
    f.t += dt;
    const spd = betterRod() ? 1.15 : 1.45;
    f.marker += f.dir * spd * dt;
    if (f.marker >= 1) { f.marker = 1; f.dir = -1; }
    if (f.marker <= 0) { f.marker = 0; f.dir = 1; }
    showFishBar(true, f.zone0, f.zone1, f.marker);
    if (f.t >= f.biteWindow) finishFishing(false);
  }
}

function sellAllFish() {
  const n = fishCount();
  const v = fishValue();
  if (!n) { showToast('Tidak ada ikan untuk dijual.'); return false; }
  persist({ coins: save.coins + v, fishBag: {} });
  showToast('Terjual ' + n + ' ikan, dapat ' + v + ' koin.');
  sfxCoin();
  haptic(18);
  if (ui.shopPanel && !ui.shopPanel.hidden) renderShop();
  return true;
}

function buyFurniture(id) {
  const it = FURNITURE[id];
  if (!it) return false;
  if (it.needRare && !hasRareFish()) {
    showToast('Tangkap ikan langka (gurame atau kakap) dulu.');
    return false;
  }
  const owned = { ...(save.houseOwned || {}) };
  if ((owned[id] || 0) >= (id === 'trophy' ? 1 : 3)) {
    showToast('Sudah cukup ' + it.name + '.');
    return false;
  }
  const total = Object.keys(owned).reduce((a, k) => a + (owned[k] || 0), 0);
  if (total >= MAX_FURNITURE) { showToast('Rumah sudah penuh perabot.'); return false; }
  if (save.coins < it.price) { showToast('Koin tidak cukup.'); return false; }
  owned[id] = (owned[id] || 0) + 1;
  persist({ coins: save.coins - it.price, houseOwned: owned });
  showToast(it.name + ' terbeli.');
  sfxCoin();
  haptic(16);
  if (ui.shopPanel && !ui.shopPanel.hidden) renderShop();
  if (world.decorOpen) renderDecor();
  return true;
}

function openDecor() {
  if (!world.playing || !world.inHouse || !ui.win.hidden) return;
  if (!ui.dialog.hidden) closeDialog();
  closeShop(); closeFx(); closeInv();
  world.decorOpen = true;
  world.decorSel = world.decorSel || null;
  ui.decorPanel.hidden = false;
  renderDecor();
}

function closeDecor() {
  world.decorOpen = false;
  if (ui.decorPanel) ui.decorPanel.hidden = true;
}

function renderDecor() {
  if (!ui.decorList) return;
  if (ui.decorCoins) ui.decorCoins.textContent = String(save.coins);
  ui.decorList.innerHTML = '';
  Object.keys(FURNITURE).forEach((id) => {
    const it = FURNITURE[id];
    const free = ownedFree(id);
    const owned = (save.houseOwned && save.houseOwned[id]) || 0;
    const li = document.createElement('li');
    if (world.decorSel === id) li.className = 'selected';
    const left = document.createElement('div');
    left.innerHTML = '<div class="decor-name">' + it.name + '</div><div class="decor-meta">' +
      (owned ? ('Dimiliki ' + owned + ' · sisa ' + free) : it.price + ' koin') +
      (it.needRare && !hasRareFish() ? ' · butuh ikan langka' : '') + '</div>';
    li.appendChild(left);
    li.addEventListener('click', (e) => {
      if (e.target.closest('.decor-buy')) return;
      if (free > 0) { world.decorSel = id; renderDecor(); }
      else showToast('Beli ' + it.name + ' dulu.');
    });
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn primary decor-buy';
    b.textContent = 'Beli';
    const locked = (it.needRare && !hasRareFish()) || save.coins < it.price || owned >= (id === 'trophy' ? 1 : 3);
    b.disabled = locked;
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); buyFurniture(id); });
    li.appendChild(b);
    ui.decorList.appendChild(li);
  });
}

function placeSelectedFurniture() {
  if (!world.inHouse) return;
  const id = world.decorSel;
  if (!id || ownedFree(id) <= 0) { showToast('Pilih perabot yang masih sisa.'); return; }
  if (housePlacedCount() >= MAX_FURNITURE) { showToast('Tidak ada ruang lagi.'); return; }
  const cell = playerGrid();
  if (cellTaken(cell.gx, cell.gz)) { showToast('Petak ini sudah terisi.'); return; }
  const placed = [...(save.housePlaced || []), { id, gx: cell.gx, gz: cell.gz, rot: 0 }];
  persist({ housePlaced: placed });
  syncHouseFromSave();
  renderDecor();
  showToast(FURNITURE[id].name + ' diletakkan.');
  haptic(14);
}

function rotateFurnitureAtPlayer() {
  if (!world.inHouse) return;
  const cell = playerGrid();
  const list = [...(save.housePlaced || [])];
  const i = list.findIndex((p) => p.gx === cell.gx && p.gz === cell.gz);
  if (i < 0) { showToast('Tidak ada perabot di depanmu.'); return; }
  list[i] = { ...list[i], rot: (list[i].rot || 0) + Math.PI / 2 };
  persist({ housePlaced: list });
  syncHouseFromSave();
  showToast('Perabot diputar.');
}

function pickFurnitureAtPlayer() {
  if (!world.inHouse) return;
  const cell = playerGrid();
  const list = [...(save.housePlaced || [])];
  const i = list.findIndex((p) => p.gx === cell.gx && p.gz === cell.gz);
  if (i < 0) { showToast('Tidak ada perabot di depanmu.'); return; }
  const id = list[i].id;
  list.splice(i, 1);
  persist({ housePlaced: list });
  world.decorSel = id;
  syncHouseFromSave();
  if (world.decorOpen) renderDecor();
  showToast(FURNITURE[id].name + ' diangkat.');
}

function furnishDemo(items) {
  const placed = [];
  for (const rec of items) {
    if (!FURNITURE[rec.id]) continue;
    const owned = { ...(save.houseOwned || {}) };
    owned[rec.id] = (owned[rec.id] || 0) + 1;
    save.houseOwned = owned;
    placed.push({ id: rec.id, gx: rec.gx, gz: rec.gz, rot: rec.rot || 0 });
  }
  persist({ houseOwned: save.houseOwned, housePlaced: placed });
  syncHouseFromSave();
}

function useWarung() {
  if (save.quests.udin === 'active' && save.inventory.includes('ikan')) {
    openDialog('Warung Desa', 'Kau mengantar ikan dari Nelayan Udin. Ikan segar ini akan segera dimasak untuk warga desa. Terima kasih!', [
      { label: 'Sama-sama', primary: true, fn: () => {
        persist({ inventory: save.inventory.filter((x) => x !== 'ikan'), quests: { ...save.quests, udin: 'done' } });
        showToast('Misi Nelayan Udin selesai.');
        closeDialog();
        onQuestComplete();
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
  onQuestComplete();
  maybeWin();
}

function allQuestsDone() {
  const q = save.quests;
  return q.kades === 'done' && q.sari === 'done' && q.udin === 'done' && q.gua === 'done'
    && q.tani === 'done' && q.rina === 'done' && q.prasasti === 'done' && q.roh === 'done'
    && q.ayam === 'done' && q.surat === 'done'
    && save.treasureTaken && save.pusakaTaken;
}

function maybeWin() {
  if (!allQuestsDone() || save.won) return;
  persist({ won: true });
  world.wonShown = true;
  world.blocked = true;
  ui.win.hidden = false;
  ui.controls.hidden = true;
  haptic([50, 80, 50, 80, 50, 80, 120]);
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
      haptic(18);
      sfxCoin();
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
  const box = nearestOf(world.mailboxes || [], 1.7);
  if (box) {
    const done = save.letters && save.letters[box.userData.id];
    return { type: 'mailbox', obj: box, label: done ? 'Kotak surat (sudah diantar)' : 'Masukkan surat' };
  }
  if (world.shopStall && dist2(world.player.position.x, world.player.position.z, world.shopStall.position.x, world.shopStall.position.z) < 2.3 * 2.3) {
    return { type: 'shop', obj: world.shopStall, label: 'Buka Toko Pasar' };
  }
  const w = world.warung;
  if (w && dist2(world.player.position.x, world.player.position.z, w.position.x, w.position.z) < 2.4 * 2.4) {
    return { type: 'warung', obj: w, label: 'Antar ke Warung Desa' };
  }
  const roh = nearestOf(world.rohs, 1.95, (s) => s.userData.alive);
  if (roh) return { type: 'roh', obj: roh, label: 'Serang roh batu' };
  const slime = nearestOf(world.slimes, 1.9, (s) => s.userData.alive);
  if (slime) return { type: 'slime', obj: slime, label: 'Serang slime' };
  if (world.inHouse) {
    if (world.houseExit && dist2(world.player.position.x, world.player.position.z, world.houseExit.x, world.houseExit.z) < 1.25 * 1.25) {
      return { type: 'house-exit', label: 'Keluar rumah' };
    }
    if (world.decorOpen) {
      const cell = playerGrid();
      if (cellTaken(cell.gx, cell.gz)) return { type: 'decor-here', label: 'Putar atau angkat perabot' };
      if (world.decorSel && ownedFree(world.decorSel) > 0) return { type: 'decor-place', label: 'Letakkan ' + FURNITURE[world.decorSel].name };
      return { type: 'decor', label: 'Pilih perabot di daftar' };
    }
    return { type: 'decor', label: 'Hias rumah' };
  }
  if (world.houseDoor && dist2(world.player.position.x, world.player.position.z, world.houseDoor.x, world.houseDoor.z) < 1.7 * 1.7) {
    return { type: 'house-enter', label: 'Masuk rumah' };
  }
  const spot = nearFishSpot();
  if (spot) return { type: 'fish', obj: spot, label: 'Mancing di ' + spot.name };
  return null;
}

function doAction() {
  if (!world.playing) return;
  if (world.fishing && world.fishing.active) { fishMainAction(); return; }
  if (!ui.dialog.hidden) {
    const first = ui.dialogActions.querySelector('button');
    if (first) first.click();
    return;
  }
  if (ui.shopPanel && !ui.shopPanel.hidden) { closeShop(); return; }
  if (!ui.inv.hidden) { closeInv(); return; }
  if (!ui.win.hidden) return;
  const t = targetInteract();
  if (!t) return;
  if (t.type === 'npc') talkTo(t.obj);
  else if (t.type === 'shop') openShop();
  else if (t.type === 'mailbox') deliverLetter(t.obj.userData.id);
  else if (t.type === 'warung') useWarung();
  else if (t.type === 'chest') tryTakeTreasure();
  else if (t.type === 'pusaka') tryTakePusaka();
  else if (t.type === 'stone') touchStone(t.obj);
  else if (t.type === 'roh') attackRoh(t.obj);
  else if (t.type === 'slime') attackSlime(t.obj);
  else if (t.type === 'house-enter') enterHouse();
  else if (t.type === 'house-exit') exitHouse();
  else if (t.type === 'fish') openFishing(t.obj);
  else if (t.type === 'decor') openDecor();
  else if (t.type === 'decor-place') placeSelectedFurniture();
  else if (t.type === 'decor-here') rotateFurnitureAtPlayer();
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
  world.shake = Math.max(world.shake, 0.12);
  haptic(15);
  sfxHit();
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
  world.shake = Math.max(world.shake, 0.14);
  haptic(18);
  sfxHit();
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
  onQuestComplete();
  maybeWin();
}

function uiBlocking() {
  return !ui.dialog.hidden
    || (ui.shopPanel && !ui.shopPanel.hidden)
    || (ui.fxPanel && !ui.fxPanel.hidden)
    || !ui.inv.hidden
    || (ui.fishPanel && !ui.fishPanel.hidden)
    || !ui.win.hidden;
}
function closeInv() { ui.inv.hidden = true; if (!uiBlocking()) { world.blocked = false; layoutControls(); } }
function openInv() {
  if (!world.playing || !ui.dialog.hidden || !ui.win.hidden) return;
  if (world.fishing && world.fishing.active) return;
  closeFx();
  closeShop();
  renderInventory();
  ui.inv.hidden = false;
  world.blocked = true;
  ui.controls.hidden = true;
}

function refreshFxButtons() {
  if (!ui.fxSound || !ui.fxVib) return;
  ui.fxSound.textContent = save.sound ? 'Nyala' : 'Mati';
  ui.fxSound.classList.toggle('off', !save.sound);
  ui.fxVib.textContent = save.vibrate ? 'Nyala' : 'Mati';
  ui.fxVib.classList.toggle('off', !save.vibrate);
}

function openFx() {
  if (!world.playing || !ui.win.hidden) return;
  if (world.fishing && world.fishing.active) return;
  if (!ui.dialog.hidden) closeDialog();
  ui.inv.hidden = true;
  closeShop();
  refreshFxButtons();
  ui.fxPanel.hidden = false;
  world.blocked = true;
  ui.controls.hidden = true;
}

function closeFx() {
  if (ui.fxPanel) ui.fxPanel.hidden = true;
  if (!uiBlocking()) {
    world.blocked = false;
    layoutControls();
  }
}

function setSound(on) {
  persist({ sound: !!on });
  applyMasterGain();
  refreshFxButtons();
}

function setVibrate(on) {
  persist({ vibrate: !!on });
  refreshFxButtons();
  if (on) haptic(25);
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
    world.sprinting = false;
    world.stamina = Math.min(1, world.stamina + dt * 0.28);
    if (ui.staminaFill) ui.staminaFill.style.transform = 'scaleX(' + world.stamina.toFixed(3) + ')';
    idleLimbs(dt);
    return 0;
  }

  // Camera-relative: stick up = walk straight away from the camera / along look yaw
  const yaw = world.camYaw;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const rx = fz, rz = -fx;
  const mx = fx * iy + rx * ix;
  const mz = fz * iy + rz * ix;
  let speed = PLAYER_SPEED * Math.min(1, len);
  if (save.shop && save.shop.sepatu) speed *= 1.22;
  const wantSprint = (world.sprintHeld || world.keys.has('ShiftLeft') || world.keys.has('ShiftRight')) && len > 0.15;
  if (wantSprint && world.stamina > 0.06) {
    world.sprinting = true;
    world.stamina = Math.max(0, world.stamina - dt * 0.32);
    speed *= 1.48;
  } else {
    world.sprinting = false;
    world.stamina = Math.min(1, world.stamina + dt * 0.24);
  }
  if (ui.staminaFill) ui.staminaFill.style.transform = 'scaleX(' + world.stamina.toFixed(3) + ')';
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
  world.stepT += dt * Math.min(1, len) * (world.sprinting ? 1.35 : 1);
  if (world.stepT > (world.sprinting ? 0.28 : 0.38)) {
    world.stepT = 0;
    sfxStep();
  }
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
  if (world.overview) {
    const cam = world.camera;
    cam.position.set(2.2, 16.5, 15.5);
    cam.lookAt(0, 0.3, -12);
    return;
  }
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
    applyShake(dt);
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
  const dist = world.inHouse ? 5.05 : CAM_DIST;
  const horiz = dist * Math.cos(pitch);
  const destX = p.position.x - Math.sin(yaw) * horiz;
  const destZ = p.position.z - Math.cos(yaw) * horiz;
  let destY = p.position.y + 1.25 + dist * Math.sin(pitch);
  if (world.inHouse) destY = Math.min(destY, 2.85);
  const k = world.camLook.active ? (1 - Math.exp(-16 * dt)) : (1 - Math.exp(-7 * dt));
  cam.position.x += (destX - cam.position.x) * k;
  cam.position.y += (destY - cam.position.y) * k;
  cam.position.z += (destZ - cam.position.z) * k;
  if (world.inHouse) {
    cam.position.x = Math.max(HOUSE_IN.cx - HOUSE_IN.hw + 0.35, Math.min(HOUSE_IN.cx + HOUSE_IN.hw - 0.35, cam.position.x));
    cam.position.z = Math.max(HOUSE_IN.cz - HOUSE_IN.hd + 0.35, Math.min(HOUSE_IN.cz + HOUSE_IN.hd - 0.35, cam.position.z));
  }
  cam.lookAt(p.position.x, p.position.y + 1.25, p.position.z);
  applyShake(dt);
}

function applyShake(dt) {
  if (world.shake <= 0.001) { world.shake = 0; return; }
  const s = world.shake;
  const t = world.clock.elapsedTime;
  world.camera.position.x += Math.sin(t * 47) * s;
  world.camera.position.y += Math.cos(t * 61) * s * 0.65;
  world.shake *= Math.exp(-7 * dt);
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
  const dist = world.inHouse ? 5.05 : CAM_DIST;
  const horiz = dist * Math.cos(pitch);
  let cy = p.position.y + 1.25 + dist * Math.sin(pitch);
  if (world.inHouse) cy = Math.min(cy, 2.85);
  cam.position.set(
    p.position.x - Math.sin(yaw) * horiz,
    cy,
    p.position.z - Math.cos(yaw) * horiz
  );
  if (world.inHouse) {
    cam.position.x = Math.max(HOUSE_IN.cx - HOUSE_IN.hw + 0.35, Math.min(HOUSE_IN.cx + HOUSE_IN.hw - 0.35, cam.position.x));
    cam.position.z = Math.max(HOUSE_IN.cz - HOUSE_IN.hd + 0.35, Math.min(HOUSE_IN.cz + HOUSE_IN.hd - 0.35, cam.position.z));
  }
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
function drawMinimap() {
  const canvas = ui.minimap;
  if (!canvas || !world.player || ui.hud.hidden) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  const x0 = -38, x1 = 42, z0 = -94, z1 = 38;
  const toX = (x) => ((x - x0) / (x1 - x0)) * w;
  const toY = (z) => ((z - z0) / (z1 - z0)) * h;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0f4a58';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1a6f8a';
  ctx.beginPath();
  ctx.arc(toX(0), toY(0), ((ISLAND_R + 6) / (x1 - x0)) * w, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f9a4a';
  ctx.beginPath();
  ctx.arc(toX(0), toY(0), (ISLAND_R / (x1 - x0)) * w, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e6cf86';
  ctx.beginPath();
  ctx.ellipse(toX(0), toY(18), (18 / (x1 - x0)) * w, (10 / (z1 - z0)) * h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6a9a3a';
  ctx.beginPath();
  ctx.ellipse(toX(SAWAH.x), toY(SAWAH.z), (SAWAH.rx / (x1 - x0)) * w, (SAWAH.rz / (z1 - z0)) * h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7c7468';
  ctx.beginPath();
  ctx.arc(toX(GUNUNG.x), toY(GUNUNG.z), (GUNUNG.r / (x1 - x0)) * w, 0, Math.PI * 2);
  ctx.fill();
  const dot = (x, z, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(toX(x), toY(z), r || 3.2, 0, Math.PI * 2);
    ctx.fill();
  };
  const q = save.quests;
  const markNpc = (id, color) => {
    const n = world.npcs.find((p) => p.userData.id === id);
    if (n) dot(n.position.x, n.position.z, color, 3.4);
  };
  if (q.kades !== 'done') markNpc('kades', '#e8b84a');
  if (q.sari !== 'done') markNpc('sari', '#e8b84a');
  if (q.udin !== 'done') markNpc('udin', '#e8b84a');
  if (q.gua !== 'done') markNpc('penjaga', '#e8b84a');
  if (q.tani !== 'done') markNpc('tani', '#e8b84a');
  if (q.rina !== 'done') markNpc('rina', '#e8b84a');
  if (q.prasasti !== 'done') markNpc('karya', '#e8b84a');
  if (q.roh !== 'done') markNpc('andi', '#e8b84a');
  if (q.ayam !== 'done') markNpc('yanti', '#fb7185');
  if (q.surat !== 'done') markNpc('hasan', '#fb7185');
  if (q.mancing !== 'done') markNpc('dedi', '#38bdf8');
  if (world.shopStall) dot(world.shopStall.position.x, world.shopStall.position.z, '#7dd3fc', 2.6);
  if (world.houseDoor) dot(world.houseDoor.x, world.houseDoor.z, '#2dd4bf', 3);
  for (const s of FISH_SPOTS) dot(s.x, s.z, '#38bdf8', 2.4);
  if (q.ayam === 'active') dot((KANDANG.x0 + KANDANG.x1) / 2, (KANDANG.z0 + KANDANG.z1) / 2, '#f97316', 3);
  if (q.surat === 'active') {
    for (const b of world.mailboxes) {
      if (!(save.letters && save.letters[b.userData.id])) dot(b.position.x, b.position.z, '#fdba74', 3);
    }
  }
  const px = toX(world.player.position.x);
  const py = toY(world.player.position.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(world.player.rotation.y + Math.PI);
  ctx.fillStyle = '#fff8e6';
  ctx.strokeStyle = '#16323a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(-4.5, 5);
  ctx.lineTo(4.5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}


function tick() {
  const dt = Math.min(0.05, world.clock.getDelta());
  if (world.attackT > 0) world.attackT -= dt;
  if (world.attackAnim > 0) world.attackAnim -= dt;
  if (world.hitCD > 0) world.hitCD -= dt;
  if (world.toastT > 0) {
    world.toastT -= dt;
    if (world.toastT <= 0) ui.toast.hidden = true;
  }
  updateAtmosphere(dt);

  if (world.playing && world.player) {
    updatePlayer(dt);
    checkEnemyHits();
    updateAnimals(dt);
    updateCamera(dt);
    updateProps(dt);
    pickupNearby();
    updateFishing(dt);
    world.mapT += dt;
    if (world.mapT > 0.12) { world.mapT = 0; drawMinimap(); }

    const area = areaAt(world.player.position.x, world.player.position.z);
    if (area !== world.areaName) {
      world.areaName = area;
      ui.area.textContent = area;
      showToast('Wilayah: ' + area);
    }

    if (world.fishing && world.fishing.active) {
      setPrompt('');
    } else if (!world.blocked && ui.dialog.hidden && ui.inv.hidden && ui.win.hidden) {
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
    cam.position.set(Math.sin(t * 0.12) * 18, 12, Math.cos(t * 0.12) * 18 + 4);
    cam.lookAt(0, 0.6, -10);
    updateProps(dt);
    updateAnimals(dt);
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
  return !el.closest('#joystick, #btn-action, #btn-sprint, #btn-inv, #btn-view, #btn-fx, #btn-inv-close, #btn-shop-close, #btn-fish-main, #btn-fish-cancel, #btn-decor-place, #btn-decor-rot, #btn-decor-pick, #btn-decor-close, #dialog, #inventory, #fx-panel, #shop-panel, #fish-panel, #decor-panel, #minimap, #title-screen, #win-screen, .btn, .chip, .panel, .overlay, a, button');
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
  if (ui.btnFx) ui.btnFx.addEventListener('click', (e) => { e.preventDefault(); if (ui.fxPanel.hidden) openFx(); else closeFx(); });
  if (ui.fxClose) ui.fxClose.addEventListener('click', (e) => { e.preventDefault(); closeFx(); });
  if (ui.fxSound) ui.fxSound.addEventListener('click', (e) => { e.preventDefault(); setSound(!save.sound); });
  if (ui.fxVib) ui.fxVib.addEventListener('click', (e) => { e.preventDefault(); setVibrate(!save.vibrate); });
  if (ui.btnShopClose) ui.btnShopClose.addEventListener('click', (e) => { e.preventDefault(); closeShop(); });
  if (ui.btnFishMain) ui.btnFishMain.addEventListener('click', (e) => { e.preventDefault(); fishMainAction(); });
  if (ui.btnFishCancel) ui.btnFishCancel.addEventListener('click', (e) => { e.preventDefault(); closeFish(); });
  if (ui.btnDecorPlace) ui.btnDecorPlace.addEventListener('click', (e) => { e.preventDefault(); placeSelectedFurniture(); });
  if (ui.btnDecorRot) ui.btnDecorRot.addEventListener('click', (e) => { e.preventDefault(); rotateFurnitureAtPlayer(); });
  if (ui.btnDecorPick) ui.btnDecorPick.addEventListener('click', (e) => { e.preventDefault(); pickFurnitureAtPlayer(); });
  if (ui.btnDecorClose) ui.btnDecorClose.addEventListener('click', (e) => { e.preventDefault(); closeDecor(); });
  if (ui.btnSprint) {
    const sprintOn = (e) => { e.preventDefault(); world.sprintHeld = true; ui.btnSprint.classList.add('held'); };
    const sprintOff = (e) => { if (e) e.preventDefault(); world.sprintHeld = false; ui.btnSprint.classList.remove('held'); };
    ui.btnSprint.addEventListener('pointerdown', sprintOn);
    ui.btnSprint.addEventListener('pointerup', sprintOff);
    ui.btnSprint.addEventListener('pointercancel', sprintOff);
    ui.btnSprint.addEventListener('pointerleave', sprintOff);
  }
  const unlockOnce = () => unlockAudio();
  window.addEventListener('pointerdown', unlockOnce);
  window.addEventListener('keydown', unlockOnce);

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
    if (e.code === 'KeyF' && !e.repeat && world.decorOpen) {
      e.preventDefault();
      rotateFurnitureAtPlayer();
    }
    if (e.code === 'KeyX' && !e.repeat && world.decorOpen) {
      e.preventDefault();
      pickFurnitureAtPlayer();
    }
    if (e.code === 'Escape') {
      if (world.fishing && world.fishing.active) closeFish();
      else if (world.decorOpen) closeDecor();
      else if (ui.shopPanel && !ui.shopPanel.hidden) closeShop();
      else if (ui.fxPanel && !ui.fxPanel.hidden) closeFx();
      else if (!ui.inv.hidden) closeInv();
      else if (!ui.dialog.hidden) closeDialog();
    }
  });
  window.addEventListener('keyup', (e) => world.keys.delete(e.code));

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) world.clock.getDelta();
  });
  window.addEventListener('blur', () => { world.keys.clear(); joyEnd(); lookEnd(); });

  ui.btnStart.addEventListener('click', () => { unlockAudio(); startGame(false); });
  ui.btnContinue.addEventListener('click', () => { unlockAudio(); startGame(true); });
  ui.btnNew.addEventListener('click', () => { unlockAudio(); startGame(false); });
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
    save = loaded ? mergeSave(loaded) : defaultSave();
    if (save.won && (save.quests.ayam !== 'done' || save.quests.surat !== 'done')) {
      save.won = false;
      save.migratedVillage = true;
    }
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
  syncAnimalsFromSave();
  applyPlayerGear();
  closeShop();
  closeFx();
  closeFish();
  closeDecor();
  setInHouseFromPos();
  syncHouseFromSave();

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

  if (save.migratedFromV2) {
    showToast('Fitur baru: mancing di kolam atau pantai, dan hias rumahmu di desa.');
    persist({ migratedFromV2: false });
  } else if (save.migratedFromV1) {
    showToast('Wilayah baru terbuka di utara: Sawah dan Gunung.');
    persist({ migratedFromV1: false });
  } else if (save.migratedVillage) {
    showToast('Desa sudah lebih luas. Ada pasar, misi baru, dan toko.');
    persist({ migratedVillage: false });
  }
  drawMinimap();
}

function syncAnimalsFromSave() {
  if (!world.animals || !world.animals.ayam) return;
  let i = 0;
  for (const a of world.animals.ayam) {
    const should = !a.userData.quest || !!(save.ayamCaught && save.ayamCaught[a.userData.id]);
    a.userData.caught = should;
    a.userData.state = should ? 'pen' : 'wander';
    if (should) {
      a.position.set(-9.3 + (i % 3) * 0.55, 0, 3.4 + (i % 2) * 0.55);
      i++;
    } else {
      a.position.set(a.userData.homeX, 0, a.userData.homeZ);
      a.userData.heading = Math.random() * Math.PI * 2;
    }
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
      setTime(v) { world.tod = ((v % 1) + 1) % 1; updateAtmosphere(0); },
      setWeather,
      getEffects() {
        return {
          tod: world.tod,
          day: dayFactor(),
          weather: world.weather,
          rainAmt: world.rainAmt,
          windAmt: world.windAmt,
          sound: save.sound,
          vibrate: save.vibrate,
          audioStarted: audio.started,
          shake: world.shake,
          lamp: world.lamps[0] ? world.lamps[0].light.intensity : 0,
          rainVisible: !!(world.rain && world.rain.mesh.visible),
        };
      },
      unlockAudio,
      setSound,
      setVibrate,
      onPlayerHit,
      onQuestComplete,
      addCoins(n) { persist({ coins: save.coins + n }); },
      buyItem,
      openShop,
      closeShop,
      captureAyam: captureAllAyam,
      deliverLetter,
      deliverAllLetters,
      startFish(id) {
        const s = FISH_SPOTS.find((x) => x.id === id) || FISH_SPOTS[0];
        window.__pn.setPos(s.x, s.z, 0);
        openFishing(s);
      },
      fishCast: startCast,
      fishYank: resolveYank,
      forceCatch() { if (world.fishing && world.fishing.active) finishFishing(true); },
      setFishMarker(v) { if (world.fishing) { world.fishing.marker = v; if (world.fishing.phase === 'bite') showFishBar(true, world.fishing.zone0, world.fishing.zone1, v); } },
      fishState() { return world.fishing ? { ...world.fishing, spot: world.fishing.spot && world.fishing.spot.id } : null; },
      forceBite() { if (world.fishing && world.fishing.active) startBite(); },
      closeFish,
      sellAllFish,
      enterHouse,
      exitHouse,
      openDecor,
      closeDecor,
      buyFurniture,
      placeFurniture(id, gx, gz, rot) {
        const owned = { ...(save.houseOwned || {}) };
        owned[id] = Math.max(owned[id] || 0, ((save.housePlaced || []).filter((p) => p.id === id).length + 1));
        const placed = (save.housePlaced || []).filter((p) => !(p.gx === gx && p.gz === gz));
        placed.push({ id, gx, gz, rot: rot || 0 });
        persist({ houseOwned: owned, housePlaced: placed });
        syncHouseFromSave();
      },
      furnishDemo,
      getFish() { return { bag: { ...save.fishBag }, log: { ...save.fishLog }, total: save.fishTotal || 0, types: fishLogCount(), value: fishValue() }; },
      getHouse() { return { inHouse: !!world.inHouse, owned: { ...save.houseOwned }, placed: [...(save.housePlaced || [])], decorOpen: !!world.decorOpen }; },
      setSprint(v) { world.sprintHeld = !!v; },
      overviewVillage(on) { world.overview = on !== false; if (!world.overview) snapCamera(); },
      getVillage() {
        return {
          shop: { ...save.shop },
          letters: { ...save.letters },
          ayam: ayamCaughtCount(),
          stamina: world.stamina,
          sprinting: world.sprinting,
          hp: save.hp,
          maxHp: save.maxHp,
          speed: (save.shop && save.shop.sepatu ? 1.22 : 1),
          animals: {
            ayam: world.animals.ayam.length,
            grazers: world.animals.grazers.length,
            cats: world.animals.cats.length,
            birds: world.animals.birds.length,
            fish: world.animals.fish.length,
            flutters: world.animals.flutters.length,
            fireflies: world.animals.fireflies ? world.animals.fireflies.count : 0,
          },
          shopOpen: !!(ui.shopPanel && !ui.shopPanel.hidden),
          minimap: !!(ui.minimap && !ui.hud.hidden),
          fishTotal: save.fishTotal || 0,
          fishTypes: fishLogCount(),
          inHouse: !!world.inHouse,
          housePlaced: housePlacedCount(),
          fishing: !!(world.fishing && world.fishing.active),
        };
      },
    };
  }
  requestAnimationFrame(tick);
}

boot();

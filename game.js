/* Petualangan Nusantara — original single-player 3D adventure.
   Three.js r170 is loaded from a local copy. No runtime CDN. */
import * as THREE from './three.module.js';

const SAVE_KEY = 'petualangan-nusantara-v1';
const ISLAND_R = 36;
const WALK_R = 33.5;
const PLAYER_SPEED = 7.2;
const PIXEL_CAP = 1.5;
const START = { x: 0.4, z: -5.2, rot: Math.PI };
const ITEM_NAMES = {
  keranjang: 'Keranjang Bu Sari',
  ikan: 'Ikan segar',
  harta: 'Harta karun pulau',
};

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

function defaultSave() {
  return {
    coins: 0,
    collectedCoins: {},
    inventory: [],
    quests: { kades: 'idle', sari: 'idle', udin: 'idle', gua: 'idle' },
    defeatedSlimes: {},
    slimesDefeated: 0,
    basketTaken: false,
    treasureTaken: false,
    px: START.x,
    pz: START.z,
    rot: START.rot,
    won: false,
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { ...defaultSave(), ...data, quests: { ...defaultSave().quests, ...(data.quests || {}) } };
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
  coins: [],
  basket: null,
  chest: null,
  warung: null,
  colliders: [],
  water: null,
  playing: false,
  blocked: false,
  wonShown: false,
  keys: new Set(),
  inputX: 0,
  inputY: 0,
  joy: { active: false, pointerId: null, x: 0, y: 0 },
  attackT: 0,
  saveT: 0,
  toastT: 0,
  areaName: 'Desa',
  camYaw: 0,
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
  scene.fog = new THREE.Fog(0x7ec4d8, 44, 98);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.2, 140);
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
  const path = (Math.abs(x) < 1.05 && z > -12 && z < 11) ||
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

  const water = mesh(new THREE.CircleGeometry(110, 40), mat(0x1a6f8a), 0, -0.42, 0);
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
  ];
  world.npcs = list.map((spec) => {
    const p = makePerson(spec.look);
    p.position.set(spec.x, 0, spec.z);
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
];

function spawnCoins() {
  world.coins = COIN_SPOTS.map(([x, z], i) => {
    const g = new THREE.Group();
    const c = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10), mat(0xe8b84a));
    c.rotation.x = Math.PI / 2;
    g.add(c);
    g.position.set(x, 0.55, z);
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
  spawnPlayer();
  spawnNpcs();
  spawnCoins();
  spawnBasket();
  spawnChest();
  spawnSlimes();
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
  if (x < -14) return 'Gua';
  if (z > 11) return 'Pantai';
  if (x > 10 && z < 9) return 'Hutan';
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
    openDialog('Pak Kades', 'Terima kasih sudah membantu desa. Jelajahi hutan di timur, pantai di selatan, dan gua di barat ya.', [
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
  return save.quests.kades === 'done' && save.quests.sari === 'done' && save.quests.udin === 'done' && save.quests.gua === 'done' && save.treasureTaken;
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
}

function targetInteract() {
  const npc = nearestOf(world.npcs, 2.3);
  if (npc) return { type: 'npc', obj: npc, label: 'Bicara dengan ' + npc.userData.name };
  if (world.chest.visible && dist2(world.player.position.x, world.player.position.z, world.chest.position.x, world.chest.position.z) < 2.2 * 2.2) {
    return { type: 'chest', obj: world.chest, label: 'Ambil harta karun' };
  }
  const w = world.warung;
  if (w && dist2(world.player.position.x, world.player.position.z, w.position.x, w.position.z) < 2.4 * 2.4) {
    return { type: 'warung', obj: w, label: 'Antar ke Warung Desa' };
  }
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

function closeInv() { ui.inv.hidden = true; world.blocked = false; layoutControls(); }
function openInv() {
  if (!world.playing || !ui.dialog.hidden || !ui.win.hidden) return;
  renderInventory();
  ui.inv.hidden = false;
  world.blocked = true;
  ui.controls.hidden = true;
}

/* -------------------- movement / camera -------------------- */
function resolveCollisions() {
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
  const r = Math.hypot(p.x, p.z);
  if (r > WALK_R) {
    p.x *= WALK_R / r;
    p.z *= WALK_R / r;
  }
}

function updatePlayer(dt) {
  if (world.blocked) return 0;
  let ix = world.joy.x;
  let iy = -world.joy.y;
  if (world.keys.has('KeyW') || world.keys.has('ArrowUp')) iy += 1;
  if (world.keys.has('KeyS') || world.keys.has('ArrowDown')) iy -= 1;
  if (world.keys.has('KeyA') || world.keys.has('ArrowLeft')) ix -= 1;
  if (world.keys.has('KeyD') || world.keys.has('ArrowRight')) ix += 1;
  const len = Math.hypot(ix, iy);
  if (len > 1) { ix /= len; iy /= len; }
  if (len < 0.08) {
    idleLimbs(dt);
    return 0;
  }

  const cam = world.camera;
  const lookX = world.player.position.x - cam.position.x;
  const lookZ = world.player.position.z - cam.position.z;
  const l = Math.hypot(lookX, lookZ) || 1;
  const fx = lookX / l, fz = lookZ / l;
  const rx = fz, rz = -fx;
  const mx = (fx * iy + rx * ix);
  const mz = (fz * iy + rz * ix);
  const speed = PLAYER_SPEED * Math.min(1, len);
  world.player.position.x += mx * speed * dt;
  world.player.position.z += mz * speed * dt;
  world.player.rotation.y = Math.atan2(mx, mz);
  resolveCollisions();
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

function updateCamera(dt) {
  const p = world.player;
  const dist = 8.2;
  const height = 5.4;
  const destX = p.position.x - Math.sin(p.rotation.y) * dist;
  const destZ = p.position.z - Math.cos(p.rotation.y) * dist;
  const destY = p.position.y + height;
  const k = 1 - Math.pow(0.0008, dt);
  const cam = world.camera;
  cam.position.x += (destX - cam.position.x) * k;
  cam.position.y += (destY - cam.position.y) * k;
  cam.position.z += (destZ - cam.position.z) * k;
  cam.lookAt(p.position.x, p.position.y + 1.25, p.position.z);
}

function updateProps(dt) {
  const t = world.clock.elapsedTime;
  for (const c of world.coins) {
    if (!c.visible) continue;
    c.rotation.y += dt * 2.4;
    c.position.y = 0.55 + Math.sin(t * 2.5 + c.userData.phase) * 0.12;
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
    s.position.y = bob;
    s.rotation.y += dt * 0.5;
  }
  for (const n of world.npcs) {
    n.position.y = Math.sin(t * 1.6 + n.position.x) * 0.015;
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
  world.joy.x = x;
  world.joy.y = y;
  ui.joyKnob.style.transform = 'translate(' + (x * 32) + 'px,' + (y * 32) + 'px)';
}

function joyEnd() {
  world.joy.active = false;
  world.joy.pointerId = null;
  world.joy.x = 0;
  world.joy.y = 0;
  ui.joyKnob.style.transform = 'translate(0,0)';
}

function setupControls() {
  ui.joy.addEventListener('pointerdown', (e) => {
    if (!world.playing || world.blocked) return;
    e.preventDefault();
    ui.joy.setPointerCapture(e.pointerId);
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

  ui.action.addEventListener('pointerup', (e) => {
    e.preventDefault();
    doAction();
  });
  ui.action.addEventListener('click', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    world.keys.add(e.code);
    if (e.code === 'Space' || e.code === 'KeyE') {
      e.preventDefault();
      if (!e.repeat) doAction();
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
  window.addEventListener('blur', () => { world.keys.clear(); joyEnd(); });

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
  const hasProgress = !!(existing && (existing.coins > 0 || existing.quests.kades !== 'idle' || existing.px !== START.x));
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
  }
  world.player.position.set(save.px, 0, save.pz);
  world.player.rotation.y = save.rot;
  // snap camera behind
  const dist = 8.2;
  world.camera.position.set(
    save.px - Math.sin(save.rot) * dist,
    5.4,
    save.pz - Math.cos(save.rot) * dist
  );
  world.camera.lookAt(save.px, 1.25, save.pz);

  // apply collected/defeated from save
  for (const c of world.coins) c.visible = !save.collectedCoins[c.userData.id];
  if (world.basket) world.basket.visible = !save.basketTaken;
  if (world.chest) world.chest.visible = !save.treasureTaken;
  for (const s of world.slimes) {
    s.userData.alive = !save.defeatedSlimes[s.userData.id];
    s.visible = s.userData.alive;
    if (s.userData.alive) s.scale.set(1, 1, 1);
  }

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
  layoutControls();

  if (save.won && !world.wonShown) {
    // already finished previously: don't auto pop the win screen on continue
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
        world.player.position.set(x, 0, z);
        if (rot != null) world.player.rotation.y = rot;
        const dist = 8.2;
        world.camera.position.set(x - Math.sin(world.player.rotation.y) * dist, 5.4, z - Math.cos(world.player.rotation.y) * dist);
        world.camera.lookAt(x, 1.25, z);
      },
      talk(id) { const n = world.npcs.find((p) => p.userData.id === id); if (n) talkTo(n); },
      action: doAction,
      save: () => JSON.parse(JSON.stringify(save)),
      pickup: pickupNearby,
      attackNearest() {
        const s = nearestOf(world.slimes, 8, (o) => o.userData.alive);
        if (s) attackSlime(s);
      },
      takeTreasure: tryTakeTreasure,
      useWarung,
    };
  }
  requestAnimationFrame(tick);
}

boot();

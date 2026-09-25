import * as THREE from 'three';
import { COLORS, DOG, WORLD, SHEEP_TYPES, WOLF_TYPES, BLACK, ALPHA, GOAT, ROAM, BUMP } from './config.js';
import { GEO, mesh } from './materials.js';

const TAU = Math.PI * 2;

// Shortest signed difference between two angles.
export function angleTo(from, to) {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// Frame-rate independent exponential smoothing.
export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

const clamp = THREE.MathUtils.clamp;

// Four leg pivots ordered front-left, front-right, back-left, back-right.
function addLegs(parent, color, { x, zFront, zBack, y, length, width, geometry = GEO.leg }) {
  return [
    [x, zFront],
    [-x, zFront],
    [x, zBack],
    [-x, zBack],
  ].map(([lx, lz]) => {
    const pivot = new THREE.Group();
    pivot.position.set(lx, y, lz);
    pivot.add(mesh(geometry, color, { scale: [width, length, width] }));
    parent.add(pivot);
    return pivot;
  });
}

export class Animal {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.position = this.root.position;
    this.velocity = new THREE.Vector3();
    this.heading = 0; // yaw; 0 faces +Z
    this.phase = Math.random() * TAU;
    this.alive = true;
    scene.add(this.root);
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z);
    return this;
  }

  update(dt, world) {}

  destroy() {
    this.alive = false;
    this.scene.remove(this.root);
  }

  get speed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  // Rotates toward `angle` at a limited turn rate. Returns the remaining difference.
  turnToward(angle, turnSpeed, dt) {
    const diff = angleTo(this.heading, angle);
    this.heading += Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed * dt);
    this.root.rotation.y = this.heading;
    return diff;
  }

  faceVelocity(turnSpeed, dt, minSpeed = 0.2) {
    if (this.speed < minSpeed) return 0;
    return this.turnToward(Math.atan2(this.velocity.x, this.velocity.z), turnSpeed, dt);
  }

  // Trot: diagonal leg pairs move together.
  swingLegs(legs, phase, amount) {
    const s = Math.sin(phase) * amount;
    legs[0].rotation.x = s;
    legs[1].rotation.x = -s;
    legs[2].rotation.x = -s;
    legs[3].rotation.x = s;
  }
}

// ---------------------------------------------------------------------------

const HORN = new THREE.TorusGeometry(0.15, 0.06, 6, 14, Math.PI * 1.6);
const COLLAR = new THREE.TorusGeometry(0.3, 0.045, 6, 18);
const BELL = new THREE.CylinderGeometry(0.06, 0.13, 0.17, 8);

// kind: 'normal' | 'wanderer' | 'ram' | 'lamb' | 'black' | 'sleepy' | 'golden' | 'bellwether'
//       | 'disguised' (see SHEEP_TYPES)
export class Sheep extends Animal {
  constructor(scene, kind = 'normal') {
    super(scene);
    this.kind = kind;
    this.type = SHEEP_TYPES[kind];
    const wool = { wanderer: COLORS.wandererWool, lamb: COLORS.lambWool, black: COLORS.blackWool, golden: COLORS.goldWool }[kind] ?? COLORS.sheep;
    const face = { ram: COLORS.ramFace, black: COLORS.blackFace }[kind] ?? COLORS.sheepFace;

    const body = (this.body = new THREE.Group());
    body.position.y = 0.78;
    this.root.add(body);
    body.add(mesh(GEO.woolBody, wool, { shadow: true }));
    body.add(mesh(GEO.lowSphere, wool, { position: [0, 0.12, -0.72], scale: 0.18 }));

    const head = (this.head = new THREE.Group());
    head.position.set(0, 0.2, 0.62);
    body.add(head);
    head.add(mesh(GEO.sphere, face, { position: [0, 0, 0.14], scale: [0.25, 0.27, 0.32], shadow: true }));
    head.add(mesh(GEO.lowSphere, wool, { position: [0, 0.2, 0.04], scale: 0.2 }));
    this.eyes = [];
    for (const side of [-1, 1]) {
      head.add(mesh(GEO.sphere, face, { position: [side * 0.27, 0.06, 0.02], scale: [0.15, 0.06, 0.09], rotation: [0, 0, side * -0.4] }));
      const eye = mesh(GEO.sphere, COLORS.eye, { position: [side * 0.12, 0.08, 0.4], scale: 0.05 });
      head.add(eye);
      this.eyes.push(eye);
      if (kind === 'ram') {
        // Curled horns on the sides of the head.
        head.add(mesh(HORN, COLORS.horn, { position: [side * 0.24, 0.12, 0.06], rotation: [0.3, Math.PI / 2, 0.4], shadow: true }));
      }
    }

    if (kind === 'lamb') head.scale.setScalar(1.3); // babies have big heads
    if (kind === 'bellwether') {
      body.add(mesh(COLLAR, COLORS.collar, { position: [0, 0.12, 0.5], rotation: [Math.PI / 2 - 0.3, 0, 0] }));
      this.bell = mesh(BELL, COLORS.bell, { position: [0, -0.2, 0.62], shadow: true });
      body.add(this.bell);
    }
    if (kind === 'disguised') {
      // The tell: a grey wolf tail poking out of the fleece.
      body.add(mesh(GEO.tail, COLORS.wolf, { position: [0, 0.02, -0.6], scale: [0.09, 0.55, 0.09], rotation: [1.1, 0, 0] }));
    }

    // The disguised wolf's legs are grey instead of black.
    const legColor = kind === 'disguised' ? COLORS.wolf : face;
    this.legs = addLegs(this.root, legColor, { x: 0.24, zFront: 0.32, zBack: -0.32, y: 0.5, length: 0.5, width: 0.075 });
    this.root.scale.setScalar(this.type.scale);

    // Behaviour state, driven by flock.js
    this.wanderAngle = Math.random() * TAU;
    this.mode = 'graze';
    this.modeTimer = Math.random() * 3;
    this.fear = 0;
    this.grabbedBy = null;
    this.lookYaw = 0;
    this.headDip = 0;
    this.hop = 0;
    this.idleTimer = Math.random() * 4;
    this.spawnScale = 1;
    this.strayed = false;
    this.wolfNear = false;
    this.parent = null; // lamb → its mother
    this.child = null; // mother → her lamb
    this.orphan = false;
    // Stampedes (black sheep lead, others follow)
    this.nextStampede = kind === 'black' ? BLACK.interval[0] * (0.6 + Math.random() * 0.4) : Infinity;
    this.windup = 0;
    this.stampede = 0;
    this.stampedeDir = new THREE.Vector3();
    this.leader = null;
    this.asleep = kind === 'sleepy';
    this.sleepPose = this.asleep ? 1 : 0;
    this.wakeTimer = 0;
    this.bump = 0; // 1 → 0 while bouncing off the running dog
    this.bumpSide = 1;
    this.bumpCooldown = 0;
    this.stress = 0; // seconds spent panicking this wave
    this.wasGrabbed = false; // this wave
    this.regroup = 0; // seconds left being called by a bellwether
    this.regroupTo = null;
    this.bellSwing = 0;
  }

  // Pop in with a little bounce.
  appear() {
    this.spawnScale = 0;
  }

  animate(dt, time) {
    const speed = this.speed;
    const moving = Math.min(speed / 1.5, 1);
    this.phase += dt * (6 + speed * 3.5);
    this.swingLegs(this.legs, this.phase, 0.6 * moving);

    // Sleepy sheep lie down: legs folded, body low, eyes shut.
    this.sleepPose = damp(this.sleepPose, this.asleep ? 1 : 0, 5, dt);
    const lie = this.sleepPose;
    if (lie > 0.01) {
      const [fl, fr, bl, br] = this.legs;
      fl.rotation.x = fr.rotation.x = fl.rotation.x * (1 - lie) - 1.4 * lie;
      bl.rotation.x = br.rotation.x = bl.rotation.x * (1 - lie) + 1.4 * lie;
    }
    for (const eye of this.eyes) eye.scale.y = this.asleep ? 0.012 : 0.05;
    if (this.bell) {
      this.bellSwing = Math.max(0, this.bellSwing - dt * 1.5);
      this.bell.rotation.x = Math.sin(time * 18) * 0.5 * this.bellSwing + Math.sin(this.phase) * 0.1 * moving;
    }

    // Personality: the occasional hop or look around.
    this.idleTimer -= dt;
    if (this.idleTimer <= 0) {
      this.idleTimer = (2 + Math.random() * 5) / this.type.fidget;
      const r = Math.random();
      if (r < (this.kind === 'lamb' ? 0.45 : 0.15)) this.hop = 1;
      else if (r < 0.6) this.lookYaw = (Math.random() - 0.5) * 1.6;
      else this.lookYaw = 0;
    }

    if (this.windup > 0 && this.hop === 0) this.hop = 1; // stamping before a stampede

    // "Flop-flop-flop" walk bounce plus hops. The disguised wolf walks flat: another tell.
    const bounce = this.type.fake ? 0 : 0.08;
    let y = 0.78 + Math.abs(Math.sin(this.phase)) * bounce * moving - lie * 0.4 + Math.sin(time * 2 + this.phase) * 0.02 * lie;
    if (this.hop > 0) {
      this.hop = Math.max(0, this.hop - dt * 2.5);
      y += Math.sin(this.hop * Math.PI) * 0.45;
    }
    // Knocked by the running dog: a quick boing with a tilt away from it.
    let bumpTilt = 0;
    if (this.bump > 0) {
      this.bump = Math.max(0, this.bump - dt * 2.8);
      const arc = Math.sin(this.bump * Math.PI);
      y += arc * BUMP.height;
      bumpTilt = arc * 0.45 * this.bumpSide;
      this.body.scale.set(1 - arc * 0.08, 1 + arc * 0.12, 1 - arc * 0.08); // stretch in the air
    } else this.body.scale.set(1, 1, 1);
    this.body.position.y = y;
    this.body.rotation.x = Math.sin(this.phase * 2) * 0.05 * moving;

    const grazing = (this.mode === 'graze' && speed < 0.4 && this.fear < 0.1 && !this.grabbedBy && !this.type.fake) || this.asleep;
    // The ram lowers its head at nearby wolves instead of panicking.
    const brace = this.kind === 'ram' && this.wolfNear && !grazing;
    this.headDip = damp(this.headDip, grazing ? 1 : brace ? 0.5 : 0, brace ? 2 : 4, dt);
    this.head.rotation.x = this.headDip * (this.asleep ? 0.45 : 0.7 + (grazing ? Math.sin(time * 5 + this.phase) * 0.08 : 0));
    this.head.position.y = 0.2 - this.headDip * 0.18;
    this.head.rotation.y = damp(this.head.rotation.y, grazing ? 0 : this.lookYaw, 5, dt);

    // Struggle while a wolf holds on.
    this.body.rotation.z = this.grabbedBy ? Math.sin(time * 45) * 0.18 : damp(this.body.rotation.z, bumpTilt, 10, dt);

    if (this.spawnScale < 1) {
      this.spawnScale = Math.min(1, this.spawnScale + dt * 3);
      const t = this.spawnScale;
      this.root.scale.setScalar(this.type.scale * (1 + Math.sin(t * Math.PI) * 0.35) * t);
    }
  }
}

// ---------------------------------------------------------------------------

export class Dog extends Animal {
  // look: optional { body, light, scale } for a differently coloured dog (the helper).
  constructor(scene, look = {}) {
    super(scene);
    const dark = look.body ?? COLORS.dog;
    const light = look.light ?? COLORS.dogLight;
    this.stats = { ...DOG };
    this.target = new THREE.Vector3();
    this.hasTarget = false;
    this.travel = 0; // distance run since the last order, for the arrival burst
    this.idleTime = 0;
    this.barkTimer = 0;
    this.barkAnim = 0;
    this.sit = 0;
    this.shakeTime = 0;
    this.lookYaw = 0;
    this.alert = false;
    this.onArrive = null;

    const body = (this.body = new THREE.Group());
    body.position.y = 0.72;
    this.root.add(body);
    body.add(mesh(GEO.sphere, dark, { scale: [0.33, 0.3, 0.62], shadow: true }));
    body.add(mesh(GEO.sphere, light, { position: [0, -0.04, 0.36], scale: 0.26 }));
    body.add(mesh(GEO.sphere, light, { position: [0, 0.14, 0.42], scale: [0.3, 0.26, 0.2] }));

    const head = (this.head = new THREE.Group());
    head.position.set(0, 0.34, 0.55);
    body.add(head);
    head.add(mesh(GEO.sphere, dark, { scale: [0.28, 0.26, 0.28], shadow: true }));
    head.add(mesh(GEO.sphere, light, { position: [0, 0.1, 0.17], scale: [0.06, 0.14, 0.12] }));
    head.add(mesh(GEO.sphere, light, { position: [0, -0.07, 0.26], scale: [0.15, 0.13, 0.2] }));
    head.add(mesh(GEO.sphere, dark, { position: [0, -0.02, 0.45], scale: 0.055 }));
    this.tongue = mesh(GEO.box, COLORS.tongue, { position: [0, -0.18, 0.33], scale: [0.09, 0.025, 0.15], rotation: [0.4, 0, 0] });
    head.add(this.tongue);

    this.ears = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.19, 0.18, -0.02);
      pivot.add(mesh(GEO.sphere, dark, { position: [side * 0.04, -0.09, 0], scale: [0.09, 0.16, 0.06] }));
      pivot.userData.side = side;
      head.add(pivot);
      return pivot;
    });

    const tail = (this.tail = new THREE.Group());
    tail.position.set(0, 0.12, -0.58);
    body.add(tail);
    tail.add(mesh(GEO.leg, dark, { scale: [0.065, 0.5, 0.065] }));
    tail.add(mesh(GEO.sphere, light, { position: [0, -0.5, 0], scale: 0.08 }));

    this.legs = addLegs(this.root, light, { x: 0.17, zFront: 0.33, zBack: -0.36, y: 0.6, length: 0.6, width: 0.075 });
    this.root.scale.setScalar(look.scale ?? 1.25);

    // Faint circle showing how close the dog needs to get to scare a wolf.
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.96, 1, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: COLORS.ui, transparent: true, opacity: 0.3, depthWrite: false })
    );
    this.ring.renderOrder = 1;
    scene.add(this.ring);
  }

  setTarget(point) {
    const r = Math.hypot(point.x, point.z);
    const max = WORLD.playRadius;
    const k = r > max ? max / r : 1;
    this.target.set(point.x * k, 0, point.z * k);
    this.hasTarget = true;
    this.idleTime = 0;
  }

  // Returns true when the bark actually happens (it has a cooldown).
  bark() {
    if (this.barkTimer > 0) return false;
    this.barkTimer = this.stats.barkCooldown;
    this.barkAnim = 1;
    return true;
  }

  update(dt, time) {
    const s = this.stats;
    this.barkTimer -= dt;

    // Steer toward the target, slowing down on arrival.
    let desiredX = 0;
    let desiredZ = 0;
    if (this.hasTarget) {
      const dx = this.target.x - this.position.x;
      const dz = this.target.z - this.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.3) {
        this.hasTarget = false;
        if (this.travel > 3) this.onArrive?.(this.position);
        this.travel = 0;
      } else {
        const speed = s.maxSpeed * Math.min(1, dist / 2.2);
        desiredX = (dx / dist) * speed;
        desiredZ = (dz / dist) * speed;
      }
    }
    let sx = desiredX - this.velocity.x;
    let sz = desiredZ - this.velocity.z;
    const steer = Math.hypot(sx, sz);
    const maxStep = s.acceleration * dt;
    if (steer > maxStep) {
      sx *= maxStep / steer;
      sz *= maxStep / steer;
    }
    this.velocity.x += sx;
    this.velocity.z += sz;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    const speed = this.speed;
    this.travel += speed * dt;
    const turn = this.faceVelocity(s.turnSpeed, dt, 0.5);
    this.ring.position.set(this.position.x, 0.04, this.position.z);
    this.ring.scale.setScalar(s.threatRadius);

    this.animate(dt, time, speed, turn);
  }

  animate(dt, time, speed, turn) {
    const run = Math.min(speed / this.stats.maxSpeed, 1);
    const stride = Math.min(1, speed / 3);
    const idle = 1 - stride;

    if (speed < 0.3 && !this.hasTarget) this.idleTime += dt;
    else this.idleTime = 0;
    this.sit = damp(this.sit, this.idleTime > 3.5 && !this.alert ? 1 : 0, 6, dt);

    // Occasional full-body shake while idle.
    if (this.idleTime > 1.5 && this.sit < 0.1 && this.shakeTime <= 0 && Math.random() < dt * 0.08) this.shakeTime = 0.7;
    this.shakeTime -= dt;
    const shake = this.shakeTime > 0 ? Math.sin(time * 40) * 0.25 * Math.sin((this.shakeTime / 0.7) * Math.PI) : 0;

    // Gallop: front and back pairs slightly offset.
    this.phase += dt * (5 + speed * 1.3);
    const a = 0.9 * stride;
    const [fl, fr, bl, br] = this.legs;
    fl.rotation.x = Math.sin(this.phase) * a;
    fr.rotation.x = Math.sin(this.phase + 0.5) * a;
    bl.rotation.x = Math.sin(this.phase + Math.PI) * a - 1.1 * this.sit;
    br.rotation.x = Math.sin(this.phase + Math.PI + 0.5) * a - 1.1 * this.sit;
    bl.position.y = br.position.y = 0.6 - 0.2 * this.sit;

    const body = this.body;
    body.position.y = 0.72 + Math.abs(Math.sin(this.phase)) * 0.12 * run - this.sit * 0.16;
    body.rotation.x = Math.cos(this.phase) * 0.08 * run - this.sit * 0.45;
    body.rotation.z = damp(body.rotation.z, clamp(-turn * 0.3, -0.3, 0.3) * run, 8, dt) + shake;

    // Head: pant when idle, look at whatever matters, jerk up on a bark.
    this.barkAnim = Math.max(0, this.barkAnim - dt * 4);
    this.head.position.y = 0.34 + Math.sin(time * 14) * 0.015 * idle + this.sit * 0.05;
    this.head.rotation.x = -this.barkAnim * 0.5 + this.sit * 0.35;
    this.head.rotation.y = damp(this.head.rotation.y, this.lookYaw * idle, 6, dt);
    this.tongue.visible = idle > 0.6 && this.barkAnim === 0;

    for (const ear of this.ears) {
      const side = ear.userData.side;
      ear.rotation.z = side * (0.15 + Math.abs(Math.sin(this.phase)) * 0.4 * run + this.barkAnim * 0.4);
      ear.rotation.x = -0.7 * run;
    }

    this.tail.rotation.x = 2.2 - 0.6 * run - this.sit * 0.9;
    this.tail.rotation.z = Math.sin(time * (idle > 0.5 ? 16 : 8)) * (0.5 * idle + 0.15);
  }

  destroy() {
    super.destroy();
    this.scene.remove(this.ring);
  }
}

// ---------------------------------------------------------------------------

const WOLF_LOOKS = {
  normal: { body: COLORS.wolf, light: COLORS.wolfLight, eye: COLORS.wolfEye, girth: 1, ears: 1 },
  runner: { body: COLORS.runner, light: COLORS.runnerLight, eye: COLORS.wolfEye, girth: 0.82, ears: 1.5 },
  brute: { body: COLORS.brute, light: COLORS.bruteLight, eye: COLORS.bruteEye, girth: 1.15, ears: 0.8 },
  sneaky: { body: COLORS.sneaky, light: COLORS.sneakyLight, eye: COLORS.sneakyEye, girth: 0.95, ears: 0.8, legs: 0.65 },
  alpha: { body: COLORS.alpha, light: COLORS.alphaMane, eye: COLORS.alphaEye, girth: 1.05, ears: 1.1 },
  pup: { body: COLORS.pup, light: COLORS.pupLight, eye: COLORS.wolfEye, girth: 1.1, ears: 1.3, legs: 0.8, head: 1.35 },
  howler: { body: COLORS.howler, light: COLORS.howlerLight, eye: 0x9fd3ff, girth: 1, ears: 1.2 },
  trickster: { body: COLORS.fox, light: COLORS.foxLight, eye: COLORS.wolfEye, girth: 0.8, ears: 1.6, legColor: COLORS.foxDark, bushy: true },
  disguised: { body: COLORS.wolf, light: COLORS.wolfLight, eye: COLORS.wolfEye, girth: 1, ears: 1 },
};

// kind: 'normal' | 'runner' | 'brute' | 'sneaky' | 'alpha' | 'pup' | 'howler' | 'trickster' | 'disguised'
// (see WOLF_TYPES)
export class Wolf extends Animal {
  constructor(scene, kind = 'normal') {
    super(scene);
    this.kind = kind;
    this.type = WOLF_TYPES[kind];
    this.fear = 0; // brute's fear meter, fills while the dog stays close
    this.resisting = false;
    this.revealed = true; // false hides the off-screen indicator (sneaky wolves)
    this.state = 'WANDER';
    this.stateTimer = 0;
    this.target = null;
    this.pause = 0;
    this.retarget = 0;
    this.orbitDir = Math.random() < 0.5 ? -1 : 1;
    this.fleeDir = new THREE.Vector3();
    this.gone = false;
    this.headDip = 0;
    this.tailLift = 1.1;
    this.stun = 0; // seconds left dazed (goat head-butt)
    this.howling = 0; // howler: seconds left in the current howl
    this.howlTimer = 0;
    this.feinted = false; // trickster: already switched sides this attack
    this.group = null; // pups: shared group state

    // Angular silhouette: boxes and 4-sided cones.
    const look = WOLF_LOOKS[kind];
    const g = look.girth;
    const legs = look.legs ?? 1; // shorter legs = lower to the ground
    this.bodyY = 0.95 - 0.8 * (1 - legs);
    this.prowl = kind === 'sneaky' ? 0.2 : 0; // extra head-down
    const body = (this.body = new THREE.Group());
    body.position.y = this.bodyY;
    this.root.add(body);
    body.add(mesh(GEO.box, look.body, { position: [0, 0, -0.05], scale: [0.5 * g, 0.46 * g, 1.15], shadow: true }));
    body.add(mesh(GEO.box, look.body, { position: [0, 0.06, 0.35], scale: [0.58 * g, 0.58 * g, 0.5], rotation: [0.15, 0, 0], shadow: true }));
    body.add(mesh(GEO.box, look.light, { position: [0, -0.14, 0.45], scale: [0.4 * g, 0.3, 0.3] }));
    if (kind === 'brute') {
      // Scars: pale stripes across both flanks.
      for (const side of [-1, 1]) {
        for (const z of [-0.2, 0.05]) {
          body.add(mesh(GEO.box, COLORS.bruteScar, { position: [side * 0.29, 0.05, z], scale: [0.02, 0.32, 0.05], rotation: [0.5, 0, 0] }));
        }
      }
    }

    if (kind === 'disguised') {
      // Scraps of the sheepskin still clinging to its back.
      body.add(mesh(GEO.lowSphere, COLORS.sheep, { position: [0, 0.26, -0.15], scale: [0.3, 0.16, 0.34] }));
      body.add(mesh(GEO.lowSphere, COLORS.sheep, { position: [0.12, 0.24, 0.25], scale: [0.2, 0.14, 0.2] }));
    }

    if (kind === 'alpha') {
      // Pale mane around the neck and shoulders.
      body.add(mesh(GEO.box, COLORS.alphaMane, { position: [0, 0.1, 0.3], scale: [0.7, 0.6, 0.34], rotation: [0.25, 0, 0], shadow: true }));
      body.add(mesh(GEO.box, COLORS.alphaMane, { position: [0, -0.12, 0.55], scale: [0.5, 0.36, 0.3], rotation: [-0.3, Math.PI / 4, 0] }));
      // Faint ring on the ground: scare the alpha and every wolf inside it runs too.
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.97, 1, 64).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: COLORS.danger, transparent: true, opacity: 0.22, depthWrite: false })
      );
      ring.position.y = 0.04;
      ring.scale.setScalar(ALPHA.panicRadius / this.type.scale);
      ring.renderOrder = 1;
      this.root.add(ring);
    }

    const head = (this.head = new THREE.Group());
    head.position.set(0, 0.2, 0.62);
    head.scale.setScalar(look.head ?? 1);
    body.add(head);
    head.add(mesh(GEO.box, look.body, { position: [0, 0, 0.12], scale: [0.42, 0.36, 0.42], shadow: true }));
    head.add(mesh(GEO.box, look.light, { position: [0, -0.07, 0.42], scale: [0.22, 0.18, 0.36] }));
    head.add(mesh(GEO.box, COLORS.sheepFace, { position: [0, -0.01, 0.61], scale: [0.09, 0.08, 0.06] }));
    for (const side of [-1, 1]) {
      const e = look.ears;
      head.add(mesh(GEO.cone, look.body, { position: [side * 0.13, 0.17 + 0.12 * e, 0.04], scale: [0.1 * e, 0.26 * e, 0.08], rotation: [0, Math.PI / 4, side * -0.15 * e] }));
      head.add(mesh(GEO.box, look.eye, { position: [side * 0.11, 0.07, 0.33], scale: [0.08, 0.05, 0.03] }));
    }

    const tail = (this.tail = new THREE.Group());
    tail.position.set(0, 0.1, -0.62);
    body.add(tail);
    if (look.bushy) {
      tail.add(mesh(GEO.tail, look.body, { scale: [0.22, 0.85, 0.22] }));
      tail.add(mesh(GEO.lowSphere, look.light, { position: [0, -0.75, 0], scale: [0.11, 0.16, 0.11] }));
    } else tail.add(mesh(GEO.tail, look.body, { scale: [0.13 * g, 0.8, 0.13 * g] }));

    this.legs = addLegs(this.root, look.legColor ?? look.body, { x: 0.17 * g, zFront: 0.4, zBack: -0.45, y: 0.8 * legs, length: 0.8 * legs, width: 0.13 * g, geometry: GEO.boxLeg });
    this.root.scale.setScalar(this.type.scale);
  }

  animate(dt, time) {
    const speed = this.speed;
    const run = Math.min(speed / 7, 1);
    this.phase += dt * (5 + speed * 1.4);
    this.swingLegs(this.legs, this.phase, 0.8 * Math.min(1, speed / 2));

    const st = this.stun > 0 ? 'STUN' : this.howling > 0 ? 'HOWL' : this.resisting ? 'RESIST' : this.state;
    let hop = 0;
    if (st === 'FLEE' && this.pause > 0) hop = Math.sin((this.pause / 0.14) * Math.PI) * 0.35;
    this.body.position.y = this.bodyY + Math.abs(Math.sin(this.phase)) * 0.08 * run + hop;
    this.body.rotation.y = st === 'ATTACK' ? Math.sin(time * 30) * 0.15 : 0;
    // Snarling in place: small fast shudder. Dazed: slow wobble.
    this.body.rotation.z = st === 'RESIST' ? Math.sin(time * 38) * 0.05 : st === 'STUN' ? Math.sin(time * 10) * 0.25 : 0;
    // Howling: sit back, nose to the sky.
    this.body.rotation.x = damp(this.body.rotation.x, st === 'HOWL' ? -0.35 : 0, 8, dt);

    // Head low while stalking, up while fleeing. Tail tucked when scared.
    const dip = { WANDER: 0.1, APPROACH: 0.3, CHASE: 0.15, ATTACK: 0.45, RESIST: 0.35, FLEE: -0.25, LEAVE: 0, HOWL: -0.9, STUN: 0.4 }[st] ?? 0;
    this.headDip = damp(this.headDip, dip + (st === 'FLEE' ? 0 : this.prowl), 8, dt);
    this.head.rotation.x = this.headDip;
    const tail = { FLEE: 0.35, CHASE: 1.6, ATTACK: 1.7, RESIST: 1.9, APPROACH: 1.0 }[st] ?? 1.2;
    this.tailLift = damp(this.tailLift, tail, 8, dt);
    this.tail.rotation.x = this.tailLift;
    this.tail.rotation.z = Math.sin(time * 6 + this.phase) * 0.15;
  }
}

// ---------------------------------------------------------------------------

const TORSO = new THREE.CylinderGeometry(0.36, 0.44, 1, 8).translate(0, 0.5, 0);
const STICK = new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6);
const CROOK = new THREE.TorusGeometry(0.16, 0.04, 6, 12, Math.PI);

export class Shepherd extends Animal {
  constructor(scene) {
    super(scene);
    this.action = 'idle';
    this.actionTimer = 3;
    this.stats = { threatRadius: 0 }; // > 0 once the Shepherd's Crook upgrade is bought
    this.pointTarget = null;
    this.walkTarget = null; // leading the flock to a new grazing spot
    this.hatLift = 0;

    this.legs = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.17, 1.0, 0);
      pivot.add(mesh(GEO.boxLeg, COLORS.brown, { scale: [0.24, 1.0, 0.26], shadow: true }));
      this.root.add(pivot);
      return pivot;
    });

    const torso = (this.torso = new THREE.Group());
    torso.position.y = 1.0;
    this.root.add(torso);
    torso.add(mesh(TORSO, COLORS.shirt, { scale: [1, 0.95, 0.8], shadow: true }));
    torso.add(mesh(GEO.cylinder, COLORS.brown, { position: [0, 0.1, 0], scale: [0.45, 0.1, 0.37] }));

    const head = (this.head = new THREE.Group());
    head.position.y = 1.25;
    torso.add(head);
    head.add(mesh(GEO.sphere, COLORS.skin, { scale: 0.28, shadow: true }));
    head.add(mesh(GEO.sphere, COLORS.skin, { position: [0, -0.02, 0.27], scale: 0.07 }));
    head.add(mesh(GEO.sphere, COLORS.beard, { position: [0, -0.14, 0.13], scale: [0.22, 0.18, 0.18] }));
    for (const side of [-1, 1]) head.add(mesh(GEO.sphere, COLORS.sheepFace, { position: [side * 0.1, 0.06, 0.25], scale: 0.035 }));

    const hat = (this.hat = new THREE.Group());
    hat.position.y = 0.2;
    head.add(hat);
    hat.add(mesh(GEO.cylinder, COLORS.brown, { scale: [0.55, 0.05, 0.55], shadow: true }));
    hat.add(mesh(GEO.cylinder, COLORS.brown, { position: [0, 0.14, 0], scale: [0.3, 0.28, 0.3], shadow: true }));
    hat.add(mesh(GEO.cylinder, COLORS.hatBand, { position: [0, 0.06, 0], scale: [0.31, 0.06, 0.31] }));

    // Right arm is -X (the model faces +Z), and holds the crook.
    this.arms = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.46, 0.88, 0);
      pivot.add(mesh(GEO.leg, COLORS.shirt, { scale: [0.11, 0.7, 0.11], shadow: true }));
      pivot.add(mesh(GEO.sphere, COLORS.skin, { position: [0, -0.75, 0], scale: 0.1 }));
      torso.add(pivot);
      return pivot;
    });
    const stick = new THREE.Group();
    stick.position.set(0, -0.72, 0.08);
    stick.add(mesh(STICK, COLORS.wood, { shadow: true }));
    stick.add(mesh(CROOK, COLORS.wood, { position: [0.16, 1.15, 0], shadow: true }));
    this.arms[0].add(stick);

    this.root.scale.setScalar(1.15);
  }

  // One-off actions: 'wave', 'point', 'clap', 'hat'
  play(action, duration, pointTarget = null) {
    this.action = action;
    this.actionTimer = duration;
    this.pointTarget = pointTarget;
  }

  update(dt, time) {
    this.actionTimer -= dt;
    if (this.actionTimer <= 0) {
      if (this.action !== 'idle') this.play('idle', 4 + Math.random() * 5);
      else {
        const r = Math.random();
        if (r < 0.4) this.play('wave', 1.6);
        else if (r < 0.7) this.play('hat', 1.2);
        else this.play('idle', 3 + Math.random() * 4);
      }
    }

    const [right, left] = this.arms;
    let rx = -0.25, rz = 0.05, lx = 0, lz = -0.1;
    let face = 0;
    this.hatLift = damp(this.hatLift, 0, 6, dt);

    switch (this.action) {
      case 'wave':
        lz = 2.6 + Math.sin(time * 10) * 0.3;
        break;
      case 'hat':
        lx = -0.4;
        lz = 2.7;
        this.hatLift = Math.sin(Math.min(1, 1 - this.actionTimer / 1.2) * Math.PI) * 0.18;
        break;
      case 'swat': {
        // Swing the crook at a wolf that came too close.
        const t = 1 - Math.max(0, this.actionTimer) / 0.5;
        rx = -0.3 - Math.sin(t * Math.PI) * 1.8;
        rz = 0.4;
        if (this.pointTarget) face = Math.atan2(this.pointTarget.x - this.position.x, this.pointTarget.z - this.position.z);
        break;
      }
      case 'whistle':
        // Fingers to the mouth.
        lx = -2.5;
        lz = -0.6;
        break;
      case 'point':
        lx = -1.5;
        if (this.pointTarget) face = Math.atan2(this.pointTarget.x - this.position.x, this.pointTarget.z - this.position.z);
        break;
      case 'clap': {
        const c = (Math.sin(time * 16) * 0.5 + 0.5) * 0.25;
        rx = lx = -1.3;
        rz = 0.35 + c;
        lz = -0.35 - c;
        break;
      }
    }

    right.rotation.x = damp(right.rotation.x, rx, 10, dt);
    right.rotation.z = damp(right.rotation.z, rz, 10, dt);
    left.rotation.x = damp(left.rotation.x, lx, 10, dt);
    left.rotation.z = damp(left.rotation.z, lz, 10, dt);
    // Walking to a new grazing spot: face the way he's going unless he's busy with a wolf.
    let walking = 0;
    if (this.walkTarget) {
      const wx = this.walkTarget.x - this.position.x;
      const wz = this.walkTarget.z - this.position.z;
      const wd = Math.hypot(wx, wz);
      if (wd < 0.2) this.walkTarget = null;
      else {
        walking = 1;
        const step = Math.min(wd, ROAM.speed * dt);
        this.position.x += (wx / wd) * step;
        this.position.z += (wz / wd) * step;
        if (this.action !== 'point' && this.action !== 'swat') face = Math.atan2(wx, wz);
      }
    }
    this.phase += dt * 5 * walking;
    const stride = Math.sin(this.phase) * 0.45 * walking;
    this.legs[0].rotation.x = damp(this.legs[0].rotation.x, stride, 12, dt);
    this.legs[1].rotation.x = damp(this.legs[1].rotation.x, -stride, 12, dt);

    this.turnToward(face, 3, dt);

    this.hat.position.y = 0.2 + this.hatLift;
    this.torso.scale.y = 1 + Math.sin(time * 2) * 0.012;
    this.torso.rotation.z = Math.sin(time * 0.7) * 0.03;
  }
}

// ---------------------------------------------------------------------------

// Not a sheep: wanders wherever it likes and head-butts wolves (behaviour in flock.js → updateGoat).
export class Goat extends Animal {
  constructor(scene) {
    super(scene);
    this.kind = 'goat';
    this.wanderAngle = Math.random() * TAU;
    this.turnTimer = 0;
    this.cooldown = 0;
    this.butt = 0; // head-down lunge animation
    this.target = null;

    const body = (this.body = new THREE.Group());
    body.position.y = 0.85;
    this.root.add(body);
    body.add(mesh(GEO.sphere, COLORS.goat, { scale: [0.28, 0.3, 0.55], shadow: true }));
    body.add(mesh(GEO.sphere, COLORS.goat, { position: [0, 0.05, 0.38], scale: [0.26, 0.3, 0.25] }));

    const head = (this.head = new THREE.Group());
    head.position.set(0, 0.28, 0.52);
    body.add(head);
    head.add(mesh(GEO.box, COLORS.goat, { position: [0, 0.05, 0.14], scale: [0.24, 0.26, 0.36], rotation: [0.3, 0, 0], shadow: true }));
    head.add(mesh(GEO.box, COLORS.goatDark, { position: [0, -0.02, 0.33], scale: [0.14, 0.12, 0.08] }));
    head.add(mesh(GEO.tail, COLORS.goatDark, { position: [0, -0.1, 0.22], scale: [0.05, 0.2, 0.05] })); // beard
    for (const side of [-1, 1]) {
      head.add(mesh(GEO.cone, COLORS.goatDark, { position: [side * 0.08, 0.3, 0.02], scale: [0.05, 0.3, 0.05], rotation: [-0.7, 0, side * 0.15] }));
      head.add(mesh(GEO.sphere, COLORS.goat, { position: [side * 0.17, 0.1, 0.06], scale: [0.12, 0.04, 0.06], rotation: [0, 0, side * 0.3] }));
      head.add(mesh(GEO.box, COLORS.wolfEye, { position: [side * 0.1, 0.12, 0.27], scale: [0.06, 0.04, 0.02] }));
    }
    body.add(mesh(GEO.cone, COLORS.goat, { position: [0, 0.22, -0.52], scale: [0.06, 0.18, 0.06], rotation: [-0.6, 0, 0] }));

    this.legs = addLegs(this.root, COLORS.goatDark, { x: 0.15, zFront: 0.34, zBack: -0.34, y: 0.7, length: 0.7, width: 0.06 });
    this.root.scale.setScalar(1.1);
  }

  animate(dt, time) {
    const speed = this.speed;
    const moving = Math.min(speed / 1.5, 1);
    this.phase += dt * (6 + speed * 2.5);
    this.swingLegs(this.legs, this.phase, 0.7 * moving);
    this.body.position.y = 0.85 + Math.abs(Math.sin(this.phase)) * 0.1 * moving;
    this.butt = Math.max(0, this.butt - dt * 2.5);
    const charging = this.target ? 0.4 : 0;
    this.head.rotation.x = damp(this.head.rotation.x, charging + Math.sin(this.butt * Math.PI) * 0.8, 10, dt);
    this.head.rotation.y = Math.sin(time * 0.7 + this.phase * 0.1) * 0.3 * (1 - moving);
  }
}

// ---------------------------------------------------------------------------

const POST = new THREE.CylinderGeometry(0.07, 0.09, 2.4, 6).translate(0, 1.2, 0);
const ARM = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6).rotateZ(Math.PI / 2);

// A static threat bought as an upgrade: ordinary wolves that come close get scared.
export class Scarecrow extends Animal {
  constructor(scene) {
    super(scene);
    this.kind = 'scarecrow';
    this.wobble = 0;
    const body = (this.body = new THREE.Group());
    this.root.add(body);
    body.add(mesh(POST, COLORS.wood, { shadow: true }));
    body.add(mesh(ARM, COLORS.wood, { position: [0, 1.75, 0], shadow: true }));
    body.add(mesh(GEO.box, COLORS.accent, { position: [0, 1.55, 0], scale: [0.62, 0.7, 0.36], shadow: true })); // shirt
    body.add(mesh(GEO.box, COLORS.accent, { position: [0, 1.75, 0], scale: [1.3, 0.22, 0.26] })); // sleeves
    for (const side of [-1, 1]) {
      body.add(mesh(GEO.cone, 0xe8c85a, { position: [side * 0.8, 1.68, 0], scale: [0.1, 0.22, 0.1], rotation: [0, 0, side * 2.4] })); // straw
    }
    body.add(mesh(GEO.sphere, COLORS.dust, { position: [0, 2.2, 0], scale: [0.27, 0.3, 0.27], shadow: true })); // sack head
    body.add(mesh(GEO.cylinder, COLORS.brown, { position: [0, 2.46, 0], scale: [0.45, 0.04, 0.45] }));
    body.add(mesh(GEO.cone, COLORS.brown, { position: [0, 2.66, 0], scale: [0.26, 0.4, 0.26] }));
    for (const side of [-1, 1]) body.add(mesh(GEO.box, COLORS.sheepFace, { position: [side * 0.09, 2.24, 0.25], scale: [0.06, 0.06, 0.02] }));
    this.root.scale.setScalar(1.1);
  }

  animate(dt, time) {
    this.wobble = Math.max(0, this.wobble - dt * 1.5);
    this.body.rotation.z = Math.sin(time * 1.3 + this.phase) * 0.03 + Math.sin(time * 20) * 0.15 * this.wobble;
  }
}

// ---------------------------------------------------------------------------

const TUFT = new THREE.IcosahedronGeometry(0.4, 0);

// A tuft of wolf fur (bounty). Bobs and spins until the dog picks it up or it blows away.
export class Tuft extends Animal {
  constructor(scene, color, value, life) {
    super(scene);
    this.kind = 'tuft';
    this.value = value;
    this.life = life;
    this.body = new THREE.Group();
    this.root.add(this.body);
    for (let i = 0; i < value; i++) {
      const a = (i / value) * Math.PI * 2;
      this.body.add(mesh(TUFT, color, { position: [Math.cos(a) * 0.26, 0.14 * i, Math.sin(a) * 0.26], scale: 1 - i * 0.1, shadow: true }));
    }
    this.glow = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.9, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.8, depthWrite: false })
    );
    this.glow.position.y = 0.05;
    this.root.add(this.glow);
  }

  animate(dt, time, blinkTime) {
    this.life -= dt;
    this.body.position.y = 0.6 + Math.sin(time * 4 + this.phase) * 0.15;
    this.body.rotation.y += dt * 2;
    this.glow.scale.setScalar(1 + Math.sin(time * 6) * 0.1);
    this.root.visible = this.life > blinkTime || Math.sin(time * 20) > 0;
  }
}


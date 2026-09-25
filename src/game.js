import * as THREE from 'three';
import { DOG, SHEEP, WORLD, BLACK, BELL, GOAT, PUPS, DISGUISE, FIRST_WAVE, HELPER, WHISTLE, BIG_BARK, waveConfig } from './config.js';
import { createWorld } from './world.js';
import { Dog, Sheep, Wolf, Goat, Shepherd, Scarecrow, angleTo } from './entities.js';
import { updateHelper } from './helper.js';
import { updateFlock, updateGoat, flockCenter } from './flock.js';
import { updateWolves, toWander, isThreatening, stunWolf, forceScare } from './wolves.js';
import { ParticleSystem } from './particles.js';
import { Juice } from './juice.js';
import { Sfx } from './audio.js';
import { MouseController } from './input.js';
import { UI } from './ui.js';
import { Bestiary, ENTRY, entryId } from './bestiary.js';
import { UPGRADE, SHOP, cost, modifiers, drawCards } from './upgrades.js';

export const STATE = {
  MENU: 'MENU',
  INTRO: 'INTRO',
  PLAYING: 'PLAYING',
  WAVE_COMPLETE: 'WAVE_COMPLETE',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
};

const POINTS = { save: 25, survivor: 2, perfect: 50 }; // scaring a wolf pays WOLF_TYPES[kind].points
const ZOOM = { min: 0.7, max: 1.5 }; // multiplier on the default camera distance

// Game feel: a tiny freeze when a wolf is scared, slow motion for a last-second rescue,
// and a combo chain for scares in quick succession.
const FEEL = {
  hitstop: 0.05, // seconds frozen per scare
  scatterHitstop: 0.1,
  closeCall: 0.4, // a rescue with less than this much grab time left counts as a close one
  slowmo: 0.6, // real seconds of slow motion
  slowmoScale: 0.25,
  punch: 0.1, // camera push-in on a close call (fraction of the distance)
  comboWindow: 2.5, // seconds to land the next scare
  comboBonus: 5, // extra wool per combo step
  comboMaxSteps: 6, // the bonus stops growing at ×7 (the chain can keep counting)
};
const BEST_KEY = 'this-is-my-sheep.best';

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

const between = ([min, max]) => min + Math.random() * (max - min);
const tmp = new THREE.Vector3();

export class Game {
  constructor(container) {
    this.world = createWorld(container);
    const { scene, camera, renderer } = this.world;

    this.particles = new ParticleSystem(scene);
    this.world.onResize(() => {
      this.particles.setViewport(renderer.domElement.height, camera.fov);
    });
    this.sfx = new Sfx();
    this.ui = new UI();
    this.juice = new Juice({ scene, camera, particles: this.particles, sfx: this.sfx });
    this.bestiary = new Bestiary();

    this.shepherd = new Shepherd(scene);
    this.dog = new Dog(scene).setPosition(0, 0, 7);
    this.dog.onArrive = (p) => this.juice.dogArrival(p);
    this.sheep = []; // includes any wolf in sheep's clothing; see flockSize()
    this.wolves = [];
    this.goat = null;

    this.state = STATE.MENU;
    this.time = 0;
    this.wave = 0;
    this.wool = 0;
    this.best = readBest();
    this.cfg = null;
    this.center = new THREE.Vector3();
    this.cameraFocus = new THREE.Vector3();
    this.zoom = 1;
    this.levels = {}; // upgrade id → level, reset every run
    this.shop = null;
    this.helper = null; // Second Dog upgrade
    this.scarecrows = [];
    this.whistleTimer = 0;
    this.hitstop = 0;
    this.slowmo = 0;
    this.punch = 0;
    this.combo = { count: 0, timer: 0 };
    this.bigBarkTimer = 0; // cooldown left

    // Shared context handed to the flock and wolf systems.
    this.ctx = {
      dog: this.dog,
      shepherd: this.shepherd,
      sheep: this.sheep,
      wolves: this.wolves,
      center: this.center,
      cfg: null,
      time: 0,
      huntingAllowed: false,
      stampedes: false,
      cohesionScale: 1,
      mods: modifiers({}),
      guards: [this.dog], // dogs that scare wolves (plus the helper once bought)
      scarecrows: this.scarecrows,
      onSheepPanic: (s) => this.juice.sheepPanic(s),
      onSheepStray: (s) => this.juice.sheepStray(s),
      onWolfResist: (w) => this.juice.wolfResist(w),
      onLambOrphaned: (s) => this.juice.lambOrphaned(s),
      onLambReunited: (s) => this.juice.lambReunited(s),
      onStampedeWarning: (s) => this.juice.stampedeWarning(s),
      onStampede: (s) => this.juice.stampede(s),
      onStampedeStopped: (s) => {
        this.addWool(BLACK.points);
        this.juice.stampedeStopped(s, BLACK.points);
      },
      onSheepWoke: (s) => this.juice.sheepWoke(s),
      onSheepDozed: (s) => this.juice.snore(s),
      onSnore: (s) => this.juice.snore(s),
      onBell: (s) => this.juice.bell(s),
      onGoatButt: (g, w) => {
        stunWolf(w, this.ctx, GOAT.stun);
        this.juice.goatButt(g, w);
      },
      onHowlStart: (w) => this.juice.howlStart(w),
      onHowl: (w) => this.juice.howl(w),
      onFeint: (w) => this.juice.feint(w),
      onPupsSplit: (w) => this.juice.pupsSplit(w),
      onPupCombo: (w) => {
        this.addWool(PUPS.comboPoints);
        this.juice.pupCombo(w, PUPS.comboPoints);
      },
      onAlphaCall: (w) => this.juice.alphaCall(w),
      onPackScattered: (w, count) => {
        this.freeze(FEEL.scatterHitstop);
        this.juice.packScattered(w, count);
      },
      onWolfCharge: (w) => this.onWolfCharge(w),
      onWolfScared: (w, threatening, by) => this.onWolfScared(w, threatening, by),
      onSheepGrabbed: (s, w) => this.juice.sheepGrabbed(s),
      onSheepSaved: (s, w) => this.onSheepSaved(s, w),
      onSheepLost: (s) => this.onSheepLost(s),
    };

    this.input = new MouseController(renderer.domElement, camera, {
      onPress: (p) => {
        if (this.scarecrowsToPlace() > 0) return this.placeScarecrow(p);
        this.dog.setTarget(p);
        this.juice.clickMarker(this.dog.target);
      },
      onDrag: (p) => this.dog.setTarget(p),
      onZoom: (factor) => this.zoomBy(factor),
      onAltPress: () => this.bigBark(),
    });

    this.bindUI();
    this.spawnSheep(['ram', 'black', 'bellwether', 'wanderer', 'sleepy', 'lamb', ...Array(7).fill('normal')], false);
    this.ui.setBest(this.best);
    this.ui.setMuted(this.sfx.muted);
    this.ui.show('menu');

    this.last = performance.now();
    renderer.setAnimationLoop(() => this.frame());
  }

  bindUI() {
    const ui = this.ui;
    ui.on('play', () => this.startGame());
    ui.on('next', () => {
      this.sfx.click();
      this.nextWave();
    });
    ui.on('retry', () => this.startGame());
    ui.on('resume', () => this.togglePause());
    ui.on('pause', () => this.togglePause());
    ui.on('menu', () => this.toMenu());
    ui.on('mute', () => {
      this.sfx.unlock();
      this.sfx.setMuted(!this.sfx.muted);
      ui.setMuted(this.sfx.muted);
    });
    ui.on('bestiary', () => this.openBestiary());
    ui.on('reroll', () => this.reroll());
    ui.on('bigbark', () => this.bigBark());
    ui.onBuy = (id) => this.buy(id);
    ui.on('close-bestiary', () => this.closeBestiary());

    window.addEventListener('keydown', (e) => {
      if (this.bestiaryReturn !== undefined && (e.key === 'Escape' || e.key === 'b' || e.key === 'B')) this.closeBestiary();
      else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') this.togglePause();
      else if (e.key === 'b' || e.key === 'B') this.openBestiary();
      if (e.key === ' ' && this.input.enabled) {
        e.preventDefault();
        this.bigBark();
      }
      if (e.key === '+' || e.key === '=') this.zoomBy(1 / 1.15);
      if (e.key === '-' || e.key === '_') this.zoomBy(1.15);
    });
    const autoPause = () => {
      if (this.state === STATE.PLAYING || this.state === STATE.INTRO) this.togglePause();
    };
    window.addEventListener('blur', autoPause);
    document.addEventListener('visibilitychange', () => document.hidden && autoPause());
  }

  setState(state) {
    this.state = state;
    this.input.enabled = state === STATE.INTRO || state === STATE.PLAYING || state === STATE.WAVE_COMPLETE;
    this.ctx.huntingAllowed = state === STATE.PLAYING;
    this.ctx.stampedes = state === STATE.PLAYING;
  }

  // Real sheep only: a wolf in sheep's clothing doesn't count.
  flockSize() {
    let n = 0;
    for (const s of this.sheep) if (!s.type.fake) n++;
    return n;
  }

  // --- Bestiary ------------------------------------------------------------

  openBestiary(focusId) {
    if (this.bestiaryReturn !== undefined) {
      if (focusId) this.ui.showBeast(focusId);
      return;
    }
    // Opening it mid-wave pauses the game; closing it goes back to whatever screen was up.
    if (this.state === STATE.PLAYING || this.state === STATE.INTRO) this.togglePause();
    this.bestiaryReturn = true;
    this.sfx.click();
    this.ui.openBestiary(this.bestiary, focusId);
  }

  closeBestiary() {
    this.bestiaryReturn = undefined;
    // The end-of-wave / game-over panel may have come due while the bestiary was open.
    const panelDue = this.panelTimer <= 0;
    this.ui.show({ [STATE.MENU]: 'menu', [STATE.PAUSED]: 'pause' }[this.state] ?? null);
    if (panelDue && this.state === STATE.WAVE_COMPLETE) this.showWavePanel();
    if (panelDue && this.state === STATE.GAME_OVER) this.ui.showGameOver({ wave: this.wave, best: this.best, wool: this.wool });
  }

  // Unlock anything on the field that hasn't been seen before (sneaky wolves once they show up,
  // the disguised wolf only once it's revealed).
  discover() {
    const check = (animal) => {
      if (animal.type?.fake) return;
      if (animal.kind === 'sneaky' && !animal.revealed) return;
      const id = entryId(animal);
      if (this.bestiary.unlock(id)) this.ui.toast(this.bestiary, id, (focus) => this.openBestiary(focus));
    };
    for (const s of this.sheep) check(s);
    for (const w of this.wolves) check(w);
    if (this.goat) check(this.goat);
  }

  // --- Upgrades ------------------------------------------------------------

  applyUpgrades() {
    const mods = (this.ctx.mods = modifiers(this.levels));
    Object.assign(this.dog.stats, {
      maxSpeed: DOG.maxSpeed * mods.dogSpeed,
      acceleration: DOG.acceleration * mods.dogSpeed,
      turnSpeed: DOG.turnSpeed * mods.dogSpeed,
      threatRadius: DOG.threatRadius * mods.threat,
      fleeTime: DOG.fleeTime * mods.flee,
    });
    if (mods.helper && !this.helper) {
      this.helper = new Dog(this.world.scene, { body: 0x7a4a2c, light: 0xf2dcb8, scale: 1.05 });
      this.helper.setPosition(this.shepherd.position.x - 3, 0, this.shepherd.position.z + 3);
      this.ctx.guards.push(this.helper);
      this.juice.newSheep(this.helper);
    }
    if (this.helper) {
      const s = this.dog.stats;
      Object.assign(this.helper.stats, {
        maxSpeed: s.maxSpeed * HELPER.speed,
        acceleration: s.acceleration * HELPER.speed,
        threatRadius: s.threatRadius * HELPER.threat,
        fleeTime: s.fleeTime,
      });
    }
    this.ui.hint(this.scarecrowsToPlace() > 0 && this.state !== STATE.WAVE_COMPLETE ? '🌾 Click the meadow to place your scarecrow' : null);
  }

  scarecrowsToPlace() {
    return this.state === STATE.INTRO || this.state === STATE.PLAYING ? this.ctx.mods.scarecrows - this.scarecrows.length : 0;
  }

  placeScarecrow(p) {
    const r = Math.hypot(p.x, p.z);
    const k = r > WORLD.playRadius ? WORLD.playRadius / r : 1;
    const sc = new Scarecrow(this.world.scene).setPosition(p.x * k, 0, p.z * k);
    sc.root.rotation.y = Math.atan2(this.center.x - sc.position.x, this.center.z - sc.position.z) + Math.PI; // face outward
    this.scarecrows.push(sc);
    this.juice.scarecrowPlaced(sc);
    this.applyUpgrades(); // refreshes the placement hint
  }

  whistle() {
    for (const s of this.sheep) {
      if (s.grabbedBy || s.asleep) continue;
      s.regroup = WHISTLE.regroupTime;
      s.regroupTo = this.shepherd;
    }
    this.shepherd.play('whistle', 1.2);
    this.juice.whistle(this.shepherd);
  }

  openShop() {
    this.shop = { cards: drawCards(this.levels), bought: new Set(), rerollCost: SHOP.reroll };
  }

  showShop() {
    this.ui.renderShop({ ...this.shop, levels: this.levels, wool: this.wool, price: (id) => cost(UPGRADE[id], this.levels[id] ?? 0) });
  }

  showWavePanel() {
    this.ui.showWaveComplete(this.pendingPanel);
    this.showShop();
  }

  buy(id) {
    const price = cost(UPGRADE[id], this.levels[id] ?? 0);
    if (this.shop.bought.has(id) || this.wool < price) return;
    this.wool -= price;
    this.levels[id] = (this.levels[id] ?? 0) + 1;
    this.shop.bought.add(id);
    this.applyUpgrades();
    this.sfx.upgrade();
    this.showShop();
  }

  reroll() {
    if (this.wool < this.shop.rerollCost) return;
    this.wool -= this.shop.rerollCost;
    this.shop.rerollCost += SHOP.reroll;
    this.shop.cards = drawCards(this.levels);
    this.shop.bought.clear();
    this.sfx.click();
    this.showShop();
  }

  // --- Flow ----------------------------------------------------------------

  startGame() {
    this.sfx.unlock();
    this.sfx.click();
    for (const w of this.wolves) w.destroy();
    this.wolves.length = 0;
    for (const s of this.sheep) s.destroy();
    this.sheep.length = 0;
    this.goat?.destroy();
    this.goat = null;
    this.juice.clearFloats();
    this.dog.setPosition(0, 0, 7);
    this.dog.velocity.set(0, 0, 0);
    this.dog.hasTarget = false;
    this.wave = 0;
    this.wool = 0;
    this.levels = {};
    this.bigBarkTimer = 0;
    this.helper?.destroy();
    this.helper = null;
    this.ctx.guards.length = 1;
    for (const sc of this.scarecrows) sc.destroy();
    this.scarecrows.length = 0;
    this.applyUpgrades();
    this.ui.setHudVisible(true);
    this.nextWave();
  }

  nextWave() {
    this.wave++;
    const cfg = (this.cfg = this.ctx.cfg = waveConfig(this.wave));
    this.ctx.cohesionScale = 1;

    // Special sheep first, then plain ones, up to the flock cap.
    const has = (kind) => this.sheep.some((s) => s.kind === kind);
    const kinds = [];
    for (const kind of ['ram', 'black', 'bellwether']) if (cfg[kind] && !has(kind)) kinds.push(kind);
    if (cfg.golden && !has('golden')) kinds.push('golden');
    for (let i = 0; i < cfg.sleepy; i++) kinds.push('sleepy');
    for (let i = 0; i < cfg.wanderers; i++) kinds.push('wanderer');
    const mods = this.ctx.mods;
    for (let i = 0; i < cfg.lambs + mods.lambs; i++) kinds.push('lamb');
    for (let i = 0; i < cfg.newSheep + (this.wave > 1 ? mods.extraSheep : 0); i++) kinds.push('normal');
    this.spawnSheep(kinds.slice(0, Math.max(0, SHEEP.cap - this.flockSize())), this.wave > 1);
    for (let i = 0; i < cfg.disguised; i++) this.spawnDisguise();
    if (cfg.goat && !this.goat) {
      this.goat = new Goat(this.world.scene).setPosition(this.center.x + 6, 0, this.center.z - 4);
      this.juice.newSheep(this.goat);
    }

    this.waveStartSheep = this.flockSize();
    this.waveTime = 0;
    this.wolvesSpawned = 0;
    this.nextWolfAt = 2;
    this.introTimer = 2.2;
    this.ui.show(null);

    // Announce the kinds that first turn up this wave (the disguise stays a surprise).
    const newcomers = Object.keys(FIRST_WAVE)
      .filter((k) => FIRST_WAVE[k] === this.wave && k !== 'disguised')
      .map((k) => ENTRY[k === 'pups' ? 'pup' : k].name);
    const sub =
      this.wave === 1
        ? 'Click the meadow to move your dog'
        : newcomers.length
          ? `New: ${newcomers.join(' & ')}. See the 📖 bestiary`
          : `${cfg.wolves} wolves are coming`;
    this.ui.banner(`Wave ${this.wave}`, sub);
    this.whistleTimer = this.ctx.mods.whistle;
    this.setState(STATE.INTRO);
    this.applyUpgrades(); // shows the scarecrow placement hint if one is waiting
  }

  completeWave() {
    this.setState(STATE.WAVE_COMPLETE);
    for (const s of this.sheep.filter((s) => s.type.fake)) this.revealDisguise(s, 'leave');
    for (const w of this.wolves) {
      if (w.target?.grabbedBy === w) w.target.grabbedBy = null;
      w.target = null;
      w.howling = 0;
      if (w.state !== 'FLEE') w.state = 'LEAVE';
    }
    const survived = this.flockSize();
    const perfect = survived === this.waveStartSheep;
    const survivorWool = this.sheep.reduce((sum, s) => sum + (s.type.fake ? 0 : s.type.wool), 0) * POINTS.survivor;
    const reward = survivorWool + (perfect ? POINTS.perfect : 0);
    this.wool += reward;
    this.juice.waveComplete(this.center);
    this.shepherd.play('clap', 2);
    this.panelTimer = 1.8;
    this.pendingPanel = { wave: this.wave, survived, total: this.waveStartSheep, reward, perfect };
    this.openShop();
  }

  gameOver() {
    this.setState(STATE.GAME_OVER);
    this.best = Math.max(this.best, this.wave - 1);
    try {
      localStorage.setItem(BEST_KEY, String(this.best));
    } catch {}
    this.sfx.gameOver();
    this.panelTimer = 1.5;
    this.pendingPanel = null;
  }

  toMenu() {
    for (const w of this.wolves) w.destroy();
    this.wolves.length = 0;
    for (const s of this.sheep.filter((s) => s.type.fake)) this.removeSheep(s);
    this.juice.clearFloats();
    if (this.sheep.length < 8) this.spawnSheep(Array(12 - this.sheep.length).fill('normal'), false);
    for (const s of this.sheep) s.grabbedBy = null;
    this.ui.setHudVisible(false);
    this.ui.setBest(this.best);
    this.ui.show('menu');
    this.setState(STATE.MENU);
    this.sfx.suspend(false);
  }

  togglePause() {
    if (this.state === STATE.PAUSED) {
      this.setState(this.pausedFrom);
      this.ui.show(null);
      this.sfx.suspend(false);
      this.last = performance.now();
    } else if (this.state === STATE.PLAYING || this.state === STATE.INTRO) {
      this.pausedFrom = this.state;
      this.setState(STATE.PAUSED);
      this.ui.show('pause');
      this.sfx.suspend(true);
    }
  }

  // --- Spawning ------------------------------------------------------------

  spawnSheep(kinds, announce) {
    // Adults first, so every lamb can be paired with a mother.
    const ordered = [...kinds.filter((k) => k !== 'lamb'), ...kinds.filter((k) => k === 'lamb')];
    for (let kind of ordered) {
      let mother = null;
      if (kind === 'lamb') {
        mother = this.sheep.find((o) => o.kind === 'normal' && !o.child && !o.grabbedBy);
        if (!mother) kind = 'normal';
      }
      const a = Math.random() * Math.PI * 2;
      const r = 2.5 + Math.random() * (2 + Math.sqrt(this.sheep.length + kinds.length));
      const s = new Sheep(this.world.scene, kind).setPosition(this.center.x + Math.cos(a) * r, 0, this.center.z + Math.sin(a) * r);
      if (mother) {
        s.position.copy(mother.position).add(tmp.set(Math.random() - 0.5, 0, Math.random() - 0.5));
        s.parent = mother;
        mother.child = s;
      }
      s.heading = Math.random() * Math.PI * 2;
      s.root.rotation.y = s.heading;
      if (announce) {
        s.appear();
        this.juice.newSheep(s);
      }
      this.sheep.push(s);
    }
  }

  // A wolf in sheep's clothing joins the flock looking like any other new sheep.
  spawnDisguise() {
    this.spawnSheep(['disguised'], true);
    const s = this.sheep[this.sheep.length - 1];
    s.revealIn = between(DISGUISE.reveal);
    s.sniff = 0;
  }

  // mode: 'exposed' (the dog found it), 'attack' (it chose its moment), 'leave' (wave over)
  revealDisguise(s, mode) {
    this.removeSheep(s);
    const w = new Wolf(this.world.scene, 'disguised').setPosition(s.position.x, 0, s.position.z);
    w.heading = s.heading;
    w.root.rotation.y = s.heading;
    this.wolves.push(w);
    if (mode === 'leave') w.state = 'LEAVE';
    else if (mode === 'exposed') w.state = 'APPROACH'; // the dog is right there: it gets scared next frame
    else {
      let best = null;
      let bestD = Infinity;
      for (const o of this.sheep) {
        const d = o.position.distanceTo(w.position);
        if (!o.type.fake && !o.grabbedBy && d < bestD) {
          bestD = d;
          best = o;
        }
      }
      w.state = best ? 'CHASE' : 'APPROACH';
      w.target = best;
    }
    if (this.bestiary.unlock('disguised')) this.ui.toast(this.bestiary, 'disguised', (id) => this.openBestiary(id));
    this.juice.disguiseRevealed(w, mode);
  }

  spawnWolf(kind) {
    // Spread arrivals around the meadow rather than bunching on one side.
    // Sneaky wolves slip in on the far side of the flock from the dog.
    const base =
      kind === 'sneaky'
        ? Math.atan2(this.center.z - this.dog.position.z, this.center.x - this.dog.position.x)
        : this.wolvesSpawned * 2.4 + Math.random() * 1.2;
    const at = (a) => [Math.cos(a) * WORLD.spawnRadius, 0, Math.sin(a) * WORLD.spawnRadius];

    if (kind === 'pups') {
      const group = { pups: [], split: false, alarm: 0, scares: [] };
      for (let i = 0; i < PUPS.count; i++) {
        const w = new Wolf(this.world.scene, 'pup').setPosition(...at(base + (i - 1) * 0.04));
        w.group = group;
        group.pups.push(w);
        this.wolves.push(w);
        toWander(w, this.ctx);
      }
      this.sfx.howl(1.5);
      return;
    }

    const w = new Wolf(this.world.scene, kind).setPosition(...at(base));
    this.wolves.push(w);
    toWander(w, this.ctx);
    if (w.type.howler) w.howlTimer = 6; // time to walk in from the tree line first
    if (kind !== 'sneaky') this.sfx.howl({ brute: 0.7, runner: 1.25, alpha: 0.85, trickster: 1.15 }[kind] ?? 1);
  }

  // --- Events --------------------------------------------------------------

  addWool(amount) {
    this.wool += amount;
  }

  onWolfCharge(wolf) {
    this.juice.wolfCharge(wolf);
    if (wolf.position.distanceTo(this.shepherd.position) < 18 && this.shepherd.action !== 'point') {
      this.shepherd.play('point', 1.2, wolf.position);
    }
  }

  onWolfScared(wolf, threatening, by) {
    if (by instanceof Scarecrow) {
      by.wobble = 1;
      this.juice.scarecrowScare(by);
    } else if (by?.bark()) this.juice.bark(by);
    const points = threatening && this.state === STATE.PLAYING ? wolf.type.points : 0;
    this.addWool(points);
    if (points) {
      this.freeze(FEEL.hitstop);
      this.addCombo(wolf);
    }
    const praise = by instanceof Scarecrow ? 'SCARED OFF!' : by === this.helper ? 'GOOD PUP!' : 'GOOD DOG!';
    this.juice.wolfScared(wolf, points, praise);
  }

  onSheepSaved(sheep, wolf) {
    this.addWool(POINTS.save);
    this.juice.sheepSaved(sheep, POINTS.save);
    // Saved in the nick of time: slow motion and a little camera push.
    if (wolf?.stateTimer < FEEL.closeCall && this.state === STATE.PLAYING) {
      this.slowmo = FEEL.slowmo;
      this.punch = 1;
      this.juice.closeCall(sheep);
    }
  }

  // Scares every wolf around the dog, brutes included, but startles nearby sheep too.
  bigBark() {
    if (!this.input.enabled) return;
    if (this.bigBarkTimer > 0) return this.ui.denyBigBark();
    this.bigBarkTimer = BIG_BARK.cooldown * this.ctx.mods.bigBarkCooldown;
    const dog = this.dog;
    dog.barkAnim = 1;
    dog.barkTimer = dog.stats.barkCooldown; // the normal bark waits its turn
    let scared = 0;
    for (const w of this.wolves) {
      if (w.position.distanceTo(dog.position) < BIG_BARK.radius && forceScare(w, this.ctx, dog)) scared++;
    }
    for (const s of this.sheep) {
      const d = s.position.distanceTo(dog.position);
      if (d < BIG_BARK.startleRadius && d > 1e-3 && !s.grabbedBy) {
        s.fear = Math.max(s.fear, 0.7);
        s.velocity.x += ((s.position.x - dog.position.x) / d) * 3;
        s.velocity.z += ((s.position.z - dog.position.z) / d) * 3;
        if (s.asleep) s.asleep = false;
      }
    }
    this.freeze(BIG_BARK.hitstop);
    this.juice.bigBark(dog, BIG_BARK.radius, scared);
  }

  freeze(seconds) {
    this.hitstop = Math.max(this.hitstop, seconds);
  }

  // Scares landed within FEEL.comboWindow of each other chain into a combo.
  addCombo(wolf) {
    const c = this.combo;
    c.count = c.timer > 0 ? c.count + 1 : 1;
    c.timer = FEEL.comboWindow;
    if (c.count < 2) return;
    const bonus = FEEL.comboBonus * Math.min(c.count - 1, FEEL.comboMaxSteps);
    this.addWool(bonus);
    this.juice.combo(this.dog, c.count, bonus);
  }

  removeSheep(sheep) {
    if (sheep.parent) sheep.parent.child = null;
    const i = this.sheep.indexOf(sheep);
    if (i >= 0) this.sheep.splice(i, 1);
    sheep.destroy();
  }

  onSheepLost(sheep) {
    this.removeSheep(sheep);
    this.juice.sheepLost(sheep.position);
    if (sheep.kind === 'bellwether' && this.state === STATE.PLAYING) {
      this.ctx.cohesionScale = BELL.lostCohesion;
      this.juice.bellwetherLost(sheep.position);
    }
    if (this.flockSize() === 0 && this.state === STATE.PLAYING) this.gameOver();
  }

  zoomBy(factor) {
    this.zoom = THREE.MathUtils.clamp(this.zoom * factor, ZOOM.min, ZOOM.max);
  }

  // --- Loop ----------------------------------------------------------------

  frame() {
    const now = performance.now();
    let dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;
    if (this.hitstop > 0) {
      // Freeze-frame: keep rendering, skip the simulation.
      this.hitstop -= dt;
    } else if (this.state !== STATE.PAUSED) {
      if (this.slowmo > 0) {
        this.slowmo -= dt;
        dt *= FEEL.slowmoScale;
      }
      this.time += dt;
      this.update(dt);
    }
    this.world.renderer.render(this.world.scene, this.world.camera);
  }

  update(dt) {
    switch (this.state) {
      case STATE.INTRO:
        this.introTimer -= dt;
        if (this.introTimer <= 0) this.setState(STATE.PLAYING);
        break;
      case STATE.PLAYING:
        this.waveTime += dt;
        if (this.wolvesSpawned < this.cfg.wolves && this.waveTime >= this.nextWolfAt) {
          this.spawnWolf(this.cfg.pack[this.wolvesSpawned] ?? 'normal');
          this.wolvesSpawned++;
          this.nextWolfAt += this.cfg.spawnInterval;
        }
        this.updateDisguises(dt);
        if (this.ctx.mods.whistle && (this.whistleTimer -= dt) <= 0) {
          this.whistleTimer = this.ctx.mods.whistle;
          this.whistle();
        }
        if (this.waveTime >= this.cfg.duration) this.completeWave();
        break;
      case STATE.WAVE_COMPLETE:
      case STATE.GAME_OVER:
        if (this.panelTimer > 0) {
          this.panelTimer -= dt;
          if (this.panelTimer <= 0 && this.bestiaryReturn === undefined) {
            if (this.state === STATE.WAVE_COMPLETE) this.showWavePanel();
            else this.ui.showGameOver({ wave: this.wave, best: this.best, wool: this.wool });
          }
        }
        break;
    }

    this.simulate(dt);
    if (this.state !== STATE.MENU) this.discover();
    this.updateCamera(dt);
    this.juice.updateFloats(dt);
    this.ui.updateIndicators(this.wolves, this.world.camera);
    this.ui.updateFearMeters(this.wolves, this.world.camera, this.ctx.mods.courage);
    this.bigBarkTimer = Math.max(0, this.bigBarkTimer - dt);
    this.ui.setBigBark(1 - this.bigBarkTimer / (BIG_BARK.cooldown * this.ctx.mods.bigBarkCooldown));
    const c = this.combo;
    c.timer = Math.max(0, c.timer - dt);
    if (!c.timer) c.count = 0;
    this.ui.setCombo(c.count, c.timer / FEEL.comboWindow);
    if (this.state !== STATE.MENU) {
      this.ui.setHud({
        sheep: this.flockSize(),
        sheepMax: this.waveStartSheep,
        wave: this.wave,
        timeLeft: this.cfg ? Math.max(0, 1 - this.waveTime / this.cfg.duration) : 1,
        wool: this.wool,
      });
    }
  }

  // The wolf in sheep's clothing throws off its disguise when its time comes, or when the dog
  // sniffs it out.
  updateDisguises(dt) {
    for (const s of this.sheep.filter((s) => s.type.fake)) {
      s.revealIn -= dt;
      const near = s.position.distanceTo(this.dog.position) < DISGUISE.sniffRadius;
      s.sniff = near ? s.sniff + dt : 0;
      if (s.sniff >= DISGUISE.sniffTime) this.revealDisguise(s, 'exposed');
      else if (s.revealIn <= 0) this.revealDisguise(s, 'attack');
    }
  }

  simulate(dt) {
    const { dog, sheep, wolves, time } = this;
    this.ctx.time = time;
    flockCenter(sheep, this.center);

    // Dog: sits when idle unless a wolf is about; looks at the nearest wolf, else the shepherd.
    let nearest = null;
    let nearestD = 16;
    for (const w of wolves) {
      const d = w.position.distanceTo(dog.position);
      if (d < nearestD && w.state !== 'LEAVE') {
        nearest = w;
        nearestD = d;
      }
    }
    dog.alert = wolves.some(isThreatening);
    dog.update(dt, time);
    // Keep barking at a brute that stands its ground.
    if (wolves.some((w) => w.resisting) && dog.bark()) this.juice.bark(dog);
    const look = nearest ? nearest.position : this.shepherd.position;
    dog.lookYaw = THREE.MathUtils.clamp(angleTo(dog.heading, Math.atan2(look.x - dog.position.x, look.z - dog.position.z)), -1, 1);

    updateFlock(sheep, this.ctx, dt);
    for (const s of sheep) s.animate(dt, time);
    if (this.goat) {
      updateGoat(this.goat, this.ctx, dt);
      this.goat.animate(dt, time);
    }
    if (this.helper) updateHelper(this.helper, this.ctx, dt, time);
    for (const sc of this.scarecrows) sc.animate(dt, time);

    updateWolves(wolves, this.ctx, dt);
    for (let i = wolves.length - 1; i >= 0; i--) {
      const w = wolves[i];
      if (w.gone) {
        w.destroy();
        wolves.splice(i, 1);
      } else w.animate(dt, time);
    }

    this.shepherd.update(dt, time);
    this.emitTrails(dt);
    this.particles.update(dt);
    this.juice.update(dt);
  }

  // Dust behind running animals, grass flicks from panicking sheep, glitter off the golden fleece.
  emitTrails(dt) {
    const trail = (e, minSpeed, interval, emit) => {
      e.trail = (e.trail ?? 0) - dt;
      if (e.speed < minSpeed || e.trail > 0) return;
      e.trail = interval;
      emit(tmp.set(e.position.x - e.velocity.x * 0.05, 0.15, e.position.z - e.velocity.z * 0.05));
    };
    trail(this.dog, 6, 0.05, (p) => this.particles.dust(p, 1, 0.8));
    for (const w of this.wolves) {
      if (w.kind === 'runner') trail(w, 5, 0.04, (p) => this.particles.dust(p, 2, 0.8));
      else trail(w, 5, 0.08, (p) => this.particles.dust(p, 1, w.kind === 'brute' ? 1.4 : 0.9));
    }
    for (const s of this.sheep) {
      if (s.kind === 'golden') trail(s, -1, 0.35, (p) => this.particles.sparkle(p.setY(1.2), 2, [0xfff3b0, 0xf2c14e]));
      else trail(s, 3, 0.25, (p) => this.particles.grass(p, 2));
    }
  }

  updateCamera(dt) {
    // Follow the flock, leaning a little toward the dog so it rarely leaves the frame.
    const focus = this.cameraFocus.copy(this.center).lerp(this.dog.position, 0.25);
    focus.z -= 1.5; // nudge the view down a little so the HUD doesn't cover the flock
    this.punch = Math.max(0, this.punch - dt * 1.5);
    const distance = (35 + Math.min(this.sheep.length, SHEEP.cap) * 0.12) * this.zoom * (1 - FEEL.punch * Math.sin(this.punch * Math.PI));
    this.world.updateCamera(focus, distance, dt, this.juice.shakeOffset);
  }
}

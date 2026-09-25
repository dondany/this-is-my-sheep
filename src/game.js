import * as THREE from 'three';
import { DOG, ROAM, SHEEP, SHEEP_TYPES, WORLD, BLACK, BELL, GOAT, PUPS, DISGUISE, FIRST_WAVE, HELPER, WHISTLE, BIG_BARK, SHEARING, BOUNTY, COLORS, waveConfig } from './config.js';
import { createWorld } from './world.js';
import { Dog, Sheep, Wolf, Goat, Shepherd, Scarecrow, Tuft, angleTo } from './entities.js';
import { updateHelper } from './helper.js';
import { updateFlock, updateGoat, flockCenter } from './flock.js';
import { updateWolves, toWander, isThreatening, stunWolf, forceScare } from './wolves.js';
import { ParticleSystem } from './particles.js';
import { Juice } from './juice.js';
import { Sfx } from './audio.js';
import { MouseController } from './input.js';
import { UI } from './ui.js';
import { Bestiary, ENTRY, entryId } from './bestiary.js';
import { Achievements } from './achievements.js';
import { UPGRADE, SHOP, ANIMAL, cost, modifiers, drawCards, drawAnimal, animalPrice } from './upgrades.js';

export const STATE = {
  MENU: 'MENU',
  INTRO: 'INTRO',
  PLAYING: 'PLAYING',
  WAVE_COMPLETE: 'WAVE_COMPLETE',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
};

// Score is for bragging; wool (from shearing, see SHEARING) is what you spend.
// Scaring a wolf scores WOLF_TYPES[kind].points.
const SCORE = { save: 25, comboStep: 10, comboMaxSteps: 9 }; // combo bonus tops out at +90
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
};
const BEST_KEY = 'this-is-my-sheep.best';
const BEST_SCORE_KEY = 'this-is-my-sheep.bestScore';

function readNumber(key) {
  try {
    return Number(localStorage.getItem(key)) || 0;
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
    this.achievements = new Achievements();
    this.overlay = null; // 'bestiary' | 'achievements' while one of those screens is open
    this.achievementCheck = 0;

    this.shepherd = new Shepherd(scene);
    this.dog = new Dog(scene).setPosition(0, 0, 7);
    this.dog.onArrive = (p) => this.juice.dogArrival(p);
    this.sheep = []; // includes any wolf in sheep's clothing; see sheepCount() / flockSize()
    this.wolves = [];
    this.goat = null;

    this.state = STATE.MENU;
    this.time = 0;
    this.wave = 0;
    this.wool = 0;
    this.score = 0;
    this.achievements.newRun();
    this.best = readNumber(BEST_KEY);
    this.bestScore = readNumber(BEST_SCORE_KEY);
    this.cfg = null;
    this.center = new THREE.Vector3();
    this.cameraFocus = new THREE.Vector3();
    this.zoom = 1;
    this.levels = {}; // upgrade id → level, reset every run
    this.shop = null;
    this.helper = null; // Second Dog upgrade
    this.scarecrows = [];
    this.tufts = []; // bounty tufts waiting to be picked up
    this.pendingAnimals = []; // livestock bought in the shop, joining next wave
    this.waveBounty = 0;
    this.whistleTimer = 0;
    this.roamTimer = 0;
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
      onSheepBump: (s) => this.juice.sheepBump(s),
      onSheepStray: (s) => this.juice.sheepStray(s),
      onWolfResist: (w) => this.juice.wolfResist(w),
      onLambOrphaned: (s) => this.juice.lambOrphaned(s),
      onLambReunited: (s) => {
        this.achievements.add('reunions');
        this.juice.lambReunited(s);
      },
      onStampedeWarning: (s) => this.juice.stampedeWarning(s),
      onStampede: (s) => this.juice.stampede(s),
      onStampedeStopped: (s) => {
        this.achievements.add('stampedes');
        this.addScore(BLACK.points);
        this.juice.stampedeStopped(s, BLACK.points);
      },
      onSheepWoke: (s) => {
        this.achievements.add('wakeUps');
        this.juice.sheepWoke(s);
      },
      onSheepDozed: (s) => this.juice.snore(s),
      onSnore: (s) => this.juice.snore(s),
      onBell: (s) => this.juice.bell(s),
      onGoatButt: (g, w) => {
        this.achievements.add('goatButts');
        stunWolf(w, this.ctx, GOAT.stun);
        // Knock the wolf back, away from the goat.
        const kx = w.position.x - g.position.x;
        const kz = w.position.z - g.position.z;
        const kd = Math.hypot(kx, kz) || 1;
        w.position.x += (kx / kd) * GOAT.knockback;
        w.position.z += (kz / kd) * GOAT.knockback;
        this.juice.goatButt(g, w);
      },
      onHowlStart: (w) => this.juice.howlStart(w),
      onHowl: (w) => this.juice.howl(w),
      onFeint: (w) => this.juice.feint(w),
      onPupsSplit: (w) => this.juice.pupsSplit(w),
      onPupCombo: (w) => {
        this.achievements.add('pupCombos');
        this.addScore(PUPS.comboPoints);
        this.juice.pupCombo(w, PUPS.comboPoints);
      },
      onAlphaCall: (w) => this.juice.alphaCall(w),
      onPackScattered: (w, count) => {
        this.achievements.add('packScatters');
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
    this.ui.setBest(this.best, this.bestScore);
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
    ui.on('close-bestiary', () => this.closeOverlay());
    ui.on('achievements', () => this.openAchievements());
    ui.on('close-achievements', () => this.closeOverlay());

    window.addEventListener('keydown', (e) => {
      if (this.overlay && (e.key === 'Escape' || e.key === 'b' || e.key === 'B')) this.closeOverlay();
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
  // The flock counter: real sheep plus the goat, if you bought one.
  flockSize() {
    return this.sheepCount() + (this.goat ? 1 : 0);
  }

  sheepCount() {
    let n = 0;
    for (const s of this.sheep) if (!s.type.fake) n++;
    return n;
  }

  // --- Bestiary and achievements screens ----------------------------------

  // Opening one mid-wave pauses the game; closing it goes back to whatever screen was up.
  openOverlay(name) {
    if (this.state === STATE.PLAYING || this.state === STATE.INTRO) this.togglePause();
    this.overlay = name;
    this.sfx.click();
  }

  openBestiary(focusId) {
    if (this.overlay === 'bestiary') {
      if (focusId) this.ui.showBeast(focusId);
      return;
    }
    this.openOverlay('bestiary');
    this.ui.openBestiary(this.bestiary, focusId);
  }

  openAchievements() {
    this.openOverlay('achievements');
    this.ui.openAchievements(this.achievements);
  }

  // Unlock whatever has been achieved since the last check, with a card for each.
  checkAchievements() {
    this.achievements.life.discovered = this.bestiary.unlocked.size;
    for (const a of this.achievements.check()) {
      this.ui.toastAchievement(a, () => this.openAchievements());
      this.sfx.upgrade();
    }
  }

  closeOverlay() {
    this.overlay = null;
    // The end-of-wave / game-over panel may have come due while the overlay was open.
    const panelDue = this.panelTimer <= 0;
    this.ui.show({ [STATE.MENU]: 'menu', [STATE.PAUSED]: 'pause' }[this.state] ?? null);
    if (panelDue && this.state === STATE.WAVE_COMPLETE) this.showWavePanel();
    if (panelDue && this.state === STATE.GAME_OVER) this.ui.showGameOver({ wave: this.wave, best: this.best, score: this.score, bestScore: this.bestScore, newBest: this.newBestScore });
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
      threatRadius: DOG.threatRadius + mods.barkRange,
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
        maxSpeed: s.maxSpeed * mods.helperSpeed,
        acceleration: s.acceleration * mods.helperSpeed,
        turnSpeed: s.turnSpeed * mods.helperSpeed,
        threatRadius: HELPER.threatRadius * mods.helperThreat,
        barkCooldown: HELPER.barkCooldown,
        fleeTime: s.fleeTime,
      });
    }
    // Shepherd's Crook: the shepherd becomes a (short-range) guard too.
    this.shepherd.stats.threatRadius = mods.crook;
    const guards = this.ctx.guards;
    if (mods.crook && !guards.includes(this.shepherd)) guards.push(this.shepherd);
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

  // The shepherd leads the flock to a new grazing spot.
  roam() {
    this.roamTimer = between(ROAM.interval);
    const from = this.shepherd.position;
    for (let tries = 0; tries < 20; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * ROAM.maxRadius;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x - from.x, z - from.z) < ROAM.minMove) continue;
      this.shepherd.walkTarget = { x, z };
      this.juice.shepherdMoves(this.shepherd);
      return;
    }
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

  // Two upgrade cards and one livestock card, in random order.
  drawShopCards() {
    const cards = drawCards(this.levels, SHOP.cards - 1);
    const animal = drawAnimal((kind) => this.canBuyAnimal(kind));
    if (animal) cards.splice(Math.floor(Math.random() * (cards.length + 1)), 0, `animal:${animal}`);
    return cards;
  }

  // Animals that have turned up this run (a lamb always), and only one of each unique kind.
  canBuyAnimal(kind) {
    if (kind !== 'lamb' && this.wave < FIRST_WAVE[kind]) return false;
    if (this.flockSize() + this.pendingAnimals.length >= SHEEP.cap) return false;
    return !(ANIMAL[kind].unique && this.ownedAnimals(kind) > 0);
  }

  ownedAnimals(kind) {
    const onField = kind === 'goat' ? (this.goat ? 1 : 0) : this.sheep.filter((s) => s.kind === kind).length;
    return onField + this.pendingAnimals.filter((k) => k === kind).length;
  }

  cardPrice(key) {
    if (key.startsWith('animal:')) {
      const kind = key.slice(7);
      return animalPrice(kind, this.ownedAnimals(kind));
    }
    return cost(UPGRADE[key], this.levels[key] ?? 0);
  }

  openShop() {
    this.shop = { cards: this.drawShopCards(), bought: new Set(), rerollCost: SHOP.reroll };
  }

  showShop() {
    const cards = this.shop.cards.map((key) => {
      const bought = this.shop.bought.has(key);
      const price = this.cardPrice(key);
      if (key.startsWith('animal:')) {
        const kind = key.slice(7);
        const a = ANIMAL[kind];
        const wool = kind === 'goat' ? 0 : SHEEP_TYPES[kind].wool;
        return {
          key,
          livestock: true,
          name: ENTRY[kind].name,
          image: this.bestiary.portrait(kind),
          text: a.text,
          pays: wool ? `Shorn for 🧶 ${wool} a wave` : '',
          price,
          bought,
        };
      }
      const u = UPGRADE[key];
      return { key, ...u, level: this.levels[key] ?? 0, price, bought };
    });
    this.ui.renderShop({ cards, rerollCost: this.shop.rerollCost, wool: this.wool });
  }

  showWavePanel() {
    this.ui.showWaveComplete(this.pendingPanel);
    this.showShop();
  }

  buy(key) {
    const price = this.cardPrice(key);
    if (this.shop.bought.has(key) || this.wool < price) return;
    this.wool -= price;
    this.shop.bought.add(key);
    if (key.startsWith('animal:')) this.pendingAnimals.push(key.slice(7));
    else {
      this.levels[key] = (this.levels[key] ?? 0) + 1;
      this.applyUpgrades();
      if (this.levels.loud >= UPGRADE.loud.max) this.achievements.run.loudMax = true;
      this.checkAchievements();
    }
    this.sfx.upgrade();
    this.showShop();
  }

  reroll() {
    if (this.wool < this.shop.rerollCost) return;
    this.wool -= this.shop.rerollCost;
    this.shop.rerollCost += SHOP.reroll;
    this.shop.cards = this.drawShopCards();
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
    this.shepherd.setPosition(0, 0, 0);
    this.shepherd.walkTarget = null;
    this.wave = 0;
    this.wool = 0;
    this.score = 0;
    this.levels = {};
    this.pendingAnimals.length = 0;
    this.bigBarkTimer = 0;
    for (const t of this.tufts) t.destroy();
    this.tufts.length = 0;
    this.helper?.destroy();
    this.helper = null;
    this.ctx.guards.length = 1; // just the player's dog
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

    // Livestock bought in the shop comes first: it's paid for.
    const bought = this.pendingAnimals.splice(0);
    this.spawnSheep(bought.filter((k) => k !== 'goat'), true);
    if (bought.includes('goat') && !this.goat) {
      this.goat = new Goat(this.world.scene).setPosition(this.center.x + 4, 0, this.center.z - 3);
      this.goat.appear?.();
      this.juice.newSheep(this.goat);
    }

    // Then special sheep, then plain ones, up to the flock cap.
    const count = (kind) => this.sheep.filter((s) => s.kind === kind).length;
    const kinds = [];
    for (const kind of ['ram', 'black', 'bellwether']) for (let i = count(kind); i < cfg[kind]; i++) kinds.push(kind);
    if (cfg.golden && !count('golden')) kinds.push('golden');
    for (let i = 0; i < cfg.sleepy; i++) kinds.push('sleepy');
    for (let i = 0; i < cfg.wanderers; i++) kinds.push('wanderer');
    const mods = this.ctx.mods;
    for (let i = 0; i < cfg.lambs + mods.lambs; i++) kinds.push('lamb');
    for (let i = 0; i < cfg.newSheep + (this.wave > 1 ? mods.extraSheep : 0); i++) kinds.push('normal');
    this.spawnSheep(kinds.slice(0, Math.max(0, SHEEP.cap - this.flockSize())), this.wave > 1);
    for (let i = 0; i < cfg.disguised; i++) this.spawnDisguise();

    this.waveStartSheep = this.flockSize();
    this.waveStartScore = this.score;
    this.waveBounty = 0;
    for (const s of this.sheep) {
      s.stress = 0;
      s.wasGrabbed = false;
    }
    this.waveTime = 0;
    this.wolvesSpawned = 0;
    this.nextWolfAt = 2;
    this.introTimer = 2.2;
    this.ui.show(null);

    // Announce the kinds that first turn up this wave (the disguise stays a surprise).
    const newcomers = Object.keys(FIRST_WAVE)
      .filter((k) => FIRST_WAVE[k] === this.wave && k !== 'disguised' && k !== 'goat')
      .map((k) => ENTRY[k === 'pups' ? 'pup' : k].name);
    const sub =
      this.wave === 1
        ? 'Click the meadow to move your dog'
        : newcomers.length
          ? `New: ${newcomers.join(' & ')}. See the 📖 bestiary`
          : `${cfg.wolves} wolves are coming`;
    this.ui.banner(`Wave ${this.wave}`, sub);
    this.whistleTimer = this.ctx.mods.whistle;
    this.roamTimer = between(ROAM.interval) * 0.6;
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
    // Shearing Day: every surviving sheep pays its wool, calm ones a little extra.
    const flock = this.sheep.filter((s) => !s.type.fake);
    const sheared = Math.floor(flock.reduce((sum, s) => sum + s.type.wool, 0) * this.ctx.mods.shears);
    const calm = Math.floor(flock.filter((s) => !s.wasGrabbed && s.stress < SHEARING.calmStress).length * SHEARING.calmBonus);
    const perfect = this.flockSize() === this.waveStartSheep ? SHEARING.perfect : 0;
    const interest = Math.min(Math.floor(this.wool / SHEARING.interestPer), SHEARING.interestMax + this.ctx.mods.interest);
    const reward = sheared + calm + perfect + interest;
    this.wool += reward;

    const run = this.achievements.run;
    run.wave = this.wave;
    if (perfect && this.wave >= 2) run.perfectWave = true;
    if (interest > 0 && interest >= SHEARING.interestMax + this.ctx.mods.interest) run.maxInterest = true;
    this.achievements.best('bestWaveWool', reward + this.waveBounty);
    for (const s of flock) {
      if (s.kind !== 'golden') continue;
      s.wavesSurvived = (s.wavesSurvived ?? 0) + 1;
      this.achievements.best('goldenStreak', s.wavesSurvived);
    }
    this.checkAchievements();
    this.juice.waveComplete(this.center);
    this.juice.shearing(flock, this.shepherd, reward);
    this.shepherd.play('clap', 2);
    this.panelTimer = 1.8;
    this.pendingPanel = {
      wave: this.wave,
      survived: this.flockSize(),
      total: this.waveStartSheep,
      lines: [
        [`Shearing: ${flock.length} sheep`, sheared],
        ['Calm sheep bonus', calm],
        ['Perfect flock', perfect],
        [`Interest (1 per ${SHEARING.interestPer} saved)`, interest],
      ],
      bounty: this.waveBounty,
      reward,
      score: this.score - this.waveStartScore,
    };
    this.openShop();
  }

  gameOver() {
    this.setState(STATE.GAME_OVER);
    this.best = Math.max(this.best, this.wave - 1);
    this.newBestScore = this.score > this.bestScore;
    this.bestScore = Math.max(this.bestScore, this.score);
    try {
      localStorage.setItem(BEST_KEY, String(this.best));
      localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
    } catch {}
    this.sfx.gameOver();
    this.checkAchievements();
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
    this.ui.setBest(this.best, this.bestScore);
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
    else if (mode === 'exposed') {
      w.state = 'APPROACH'; // the dog is right there: it gets scared next frame
      this.achievements.add('exposed');
    } // the dog is right there: it gets scared next frame
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

  addScore(amount) {
    this.score += amount;
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
    } else if (by === this.shepherd) {
      this.shepherd.play('swat', 0.5, wolf.position);
      this.juice.crook(this.shepherd);
    } else if (by?.bark()) this.juice.bark(by);
    const points = threatening && this.state === STATE.PLAYING ? wolf.type.points : 0;
    if (points) {
      this.achievements.add('scares');
      if (wolf.kind === 'brute') this.achievements.add('brutes');
      if (wolf.kind === 'howler') this.achievements.add('howlers');
    }
    this.addScore(points);
    if (points) {
      this.freeze(FEEL.hitstop);
      this.addCombo(wolf);
      this.dropBounty(wolf);
    }
    const praise = by instanceof Scarecrow ? 'SCARED OFF!' : by === this.helper ? 'GOOD PUP!' : by === this.shepherd ? 'NICE SWING!' : 'GOOD DOG!';
    this.juice.wolfScared(wolf, points, praise);
  }

  onSheepSaved(sheep, wolf) {
    this.achievements.add('saves');
    this.addScore(SCORE.save);
    this.juice.sheepSaved(sheep, SCORE.save);
    // Saved in the nick of time: slow motion and a little camera push.
    if (wolf?.stateTimer < FEEL.closeCall && this.state === STATE.PLAYING) {
      this.slowmo = FEEL.slowmo;
      this.punch = 1;
      this.achievements.add('closeCalls');
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
    const radius = BIG_BARK.radius * this.ctx.mods.bigBarkRadius;
    let scared = 0;
    for (const w of this.wolves) {
      if (w.position.distanceTo(dog.position) < radius && forceScare(w, this.ctx, dog)) scared++;
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
    this.achievements.best('bestBigBark', scared);
    this.freeze(BIG_BARK.hitstop);
    this.juice.bigBark(dog, radius, scared);
  }

  // The first time a big wolf is scared off it leaves a tuft of fur behind.
  dropBounty(wolf) {
    const value = BOUNTY.wool[wolf.kind];
    if (!value || wolf.bountyDropped) return;
    wolf.bountyDropped = true;
    const color = { brute: COLORS.brute, alpha: COLORS.alphaMane, trickster: COLORS.fox }[wolf.kind];
    const t = new Tuft(this.world.scene, color, value, BOUNTY.life * this.ctx.mods.tuftLife).setPosition(wolf.position.x, 0, wolf.position.z);
    this.tufts.push(t);
    this.juice.tuftDropped(t);
  }

  updateTufts(dt) {
    for (let i = this.tufts.length - 1; i >= 0; i--) {
      const t = this.tufts[i];
      t.animate(dt, this.time, BOUNTY.blink);
      const picked = t.position.distanceTo(this.dog.position) < BOUNTY.pickupRadius * this.ctx.mods.tuftRadius;
      if (picked) {
        this.addWool(t.value);
        this.waveBounty += t.value;
        this.achievements.add('tufts');
        this.juice.tuftCollected(t);
      } else if (t.life <= 0) this.juice.tuftLost(t);
      if (picked || t.life <= 0) {
        t.destroy();
        this.tufts.splice(i, 1);
      }
    }
  }

  freeze(seconds) {
    this.hitstop = Math.max(this.hitstop, seconds);
  }

  // Scares landed within FEEL.comboWindow of each other chain into a combo.
  addCombo(wolf) {
    const c = this.combo;
    c.count = c.timer > 0 ? c.count + 1 : 1;
    c.timer = FEEL.comboWindow;
    this.achievements.best('bestCombo', c.count);
    if (c.count < 2) return;
    const bonus = SCORE.comboStep * Math.min(c.count - 1, SCORE.comboMaxSteps);
    this.addScore(bonus);
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
    if (this.wave <= 5 && !sheep.type.fake) this.achievements.run.lostBy5++;
    if (sheep.kind === 'bellwether' && this.state === STATE.PLAYING) {
      this.ctx.cohesionScale = BELL.lostCohesion;
      this.juice.bellwetherLost(sheep.position);
    }
    // The goat can't keep the flock going on its own.
    if (this.sheepCount() === 0 && this.state === STATE.PLAYING) this.gameOver();
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
        if ((this.roamTimer -= dt) <= 0) this.roam();
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
          if (this.panelTimer <= 0 && !this.overlay) {
            if (this.state === STATE.WAVE_COMPLETE) this.showWavePanel();
            else this.ui.showGameOver({ wave: this.wave, best: this.best, score: this.score, bestScore: this.bestScore, newBest: this.newBestScore });
          }
        }
        break;
    }

    this.simulate(dt);
    if (this.state !== STATE.MENU) {
      this.discover();
      this.achievements.best('maxFlock', this.flockSize());
      if ((this.achievementCheck -= dt) <= 0) {
        this.achievementCheck = 0.5;
        this.checkAchievements();
      }
    }
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
        score: this.score,
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
      if (s.sniff >= DISGUISE.sniffTime * this.ctx.mods.sniff) this.revealDisguise(s, 'exposed');
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
    this.updateTufts(dt);

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

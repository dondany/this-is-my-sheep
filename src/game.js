import * as THREE from 'three';
import { GOAL, lineFor, LAST_STAND, VETERAN, XP, xpToNext, ENDLESS, BOSS, SUMMERS, summerRules, DOG, ROAM, SHEEP, SHEEP_TYPES, WORLD, BLACK, BELL, GOAT, PUPS, DISGUISE, FIRST_WAVE, HELPER, WHISTLE, BIG_BARK, SHEARING, BOUNTY, COLORS, waveConfig } from './config.js';
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
import { Tips } from './tips.js';
import { Wardrobe, rewardFor } from './cosmetics.js';
import { CHARM, SHOP, ANIMAL, PERK, modifiers, drawCards, drawAnimal, animalPrice, drawPerks, perkText } from './upgrades.js';

export const STATE = {
  MENU: 'MENU',
  INTRO: 'INTRO',
  PLAYING: 'PLAYING',
  WAVE_COMPLETE: 'WAVE_COMPLETE',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
};

// Only three numbers during a run: the flock (against this wave's target), the wave, and wool
// (from shearing, see SHEARING). How far you got is the result; there's no separate score.
const ZOOM = { min: 0.7, max: 1.5 }; // multiplier on the default camera distance

// Game feel. An ordinary scare only jolts the wolf and the dog (see Wolf/Dog.animate); the whole
// game freezes only for big moments, slow motion marks a last-second rescue, and scares in quick
// succession chain into a combo. The Screen effects setting (full / reduced / off) tones it down.
const FEEL = {
  bigHitstop: 0.08, // whole-game freeze for Big Bark and a scattered alpha pack
  freezeGap: 0.5, // at most one whole-game freeze per this many seconds
  closeCall: 0.4, // a rescue with less than this much grab time left counts as a close one
  slowmo: 0.4, // real seconds of slow motion
  slowmoScale: 0.4,
  slowmoGap: 5, // at most once per this many seconds
  punch: 0.1, // camera push-in on a close call (fraction of the distance)
  comboWindow: 2.5, // seconds to land the next scare
};
const EFFECTS_KEY = 'this-is-my-sheep.effects';
const EFFECTS = ['full', 'reduced', 'off'];
const BEST_KEY = 'this-is-my-sheep.best';
const WINS_KEY = 'this-is-my-sheep.wins';
const SUMMER_KEY = 'this-is-my-sheep.summerUnlocked'; // highest difficulty level unlocked
const SUMMER_WON_KEY = 'this-is-my-sheep.summerWon'; // highest difficulty level won
const BEST_STARS_KEY = 'this-is-my-sheep.bestStars';

// The run in progress, saved at checkpoints (the start of each wave, and the end-of-wave shop) so
// it can be continued from the menu after quitting or closing the browser.
const RUN_KEY = 'this-is-my-sheep.run';
const RUN_VERSION = 3; // 2: dog levels and perks; 3: charms instead of shop upgrades

function readSavedRun() {
  try {
    const data = JSON.parse(localStorage.getItem(RUN_KEY));
    return data?.v === RUN_VERSION ? data : null;
  } catch {
    return null;
  }
}

function clearSavedRun() {
  try {
    localStorage.removeItem(RUN_KEY);
  } catch {}
}

function readNumber(key) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

const between = ([min, max]) => min + Math.random() * (max - min);

// What happened this run, for the summary on the win and game-over screens.
function newRunStats() {
  return { scared: 0, saved: 0, closeCalls: 0, lost: 0, lostTo: {}, bestCombo: 0, bigBarks: 0, tufts: 0, woolEarned: 0, woolSpent: 0, animals: [] };
}
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
    this.stats = newRunStats();
    this.tips = new Tips();
    this.wardrobe = new Wardrobe((id) => this.achievements.has(id));
    this.overlay = null; // 'bestiary' | 'achievements' while one of those screens is open
    this.achievementCheck = 0;

    this.shepherd = new Shepherd(scene);
    this.dog = new Dog(scene, this.wardrobe.dogStyle()).setPosition(0, 0, 7);
    this.world.setTheme(this.wardrobe.theme());
    this.dog.onArrive = (p) => this.juice.dogArrival(p);
    this.sheep = []; // includes any wolf in sheep's clothing; see sheepCount() / flockSize()
    this.wolves = [];
    this.goat = null;

    this.state = STATE.MENU;
    this.time = 0;
    this.wave = 0;
    this.wool = 0;
    this.endless = false;
    this.achievements.newRun();
    this.best = readNumber(BEST_KEY);
    this.wins = readNumber(WINS_KEY);
    this.bestStars = readNumber(BEST_STARS_KEY);
    this.endless = false; // true once the player keeps going after winning
    this.summerUnlocked = Math.max(1, Math.min(SUMMERS.length, readNumber(SUMMER_KEY)));
    this.summerWon = readNumber(SUMMER_WON_KEY);
    this.summer = this.summerUnlocked; // the difficulty picked on the menu
    this.rules = summerRules(this.summer);
    this.cfg = null;
    this.center = new THREE.Vector3();
    this.cameraFocus = new THREE.Vector3();
    this.zoom = 1;
    this.charms = []; // charm ids on the dog's collar, in slot order; reset every run
    this.perks = {}; // dog perk id → points, from level-ups
    this.shop = null;
    this.frozen = []; // shop cards kept for the next wave's shop
    this.helper = null; // Second Dog upgrade
    this.scarecrows = [];
    this.tufts = []; // bounty tufts waiting to be picked up
    this.pendingAnimals = []; // livestock bought in the shop, joining next wave
    this.waveBounty = 0;
    this.whistleTimer = 0;
    this.roamTimer = 0;
    this.hitstop = 0;
    this.slowmo = 0;
    this.lastFreeze = -Infinity; // real time (ms) of the last whole-game freeze
    this.lastSlowmo = -Infinity;
    try {
      this.effects = EFFECTS.includes(localStorage.getItem(EFFECTS_KEY)) ? localStorage.getItem(EFFECTS_KEY) : 'full';
    } catch {
      this.effects = 'full';
    }
    this.punch = 0;
    this.combo = { count: 0, timer: 0 };
    this.barkCharge = 1; // the Big Bark meter, 0-1

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
      mods: modifiers(),
      guards: [this.dog], // dogs that scare wolves (plus the helper once bought)
      scarecrows: this.scarecrows,
      onSheepPanic: (s) => this.juice.sheepPanic(s),
      onSheepBump: (s) => this.juice.sheepBump(s),
      onSheepTossed: (s) => this.juice.sheepBump(s),
      onRascalDash: (w) => {
        this.juice.rascalDash(w);
        this.tip('rascal');
      },
      onSheepStray: (s) => {
        this.juice.sheepStray(s);
        this.tip('stray');
      },
      onWolfResist: (w) => {
        this.juice.wolfResist(w);
        this.tip('brute');
      },
      onLambOrphaned: (s) => {
        this.juice.lambOrphaned(s);
        this.tip('orphan');
      },
      onLambReunited: (s) => {
        this.achievements.add('reunions');
        this.juice.lambReunited(s);
      },
      onStampedeWarning: (s) => {
        this.juice.stampedeWarning(s);
        this.tip('stampede');
      },
      onStampede: (s) => this.juice.stampede(s),
      onStampedeStopped: (s) => {
        this.achievements.add('stampedes');
        this.juice.stampedeStopped(s);
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
      onHowlStart: (w) => {
        this.juice.howlStart(w);
        this.tip('howl');
      },
      onHowl: (w) => this.juice.howl(w),
      onFeint: (w) => this.juice.feint(w),
      onPupsSplit: (w) => this.juice.pupsSplit(w),
      onPupCombo: (w) => {
        this.achievements.add('pupCombos');
        this.juice.pupCombo(w);
      },
      onAlphaCall: (w) => this.juice.alphaCall(w),
      onBossDriven: (w, left) => this.onBossDriven(w, left),
      onPackScattered: (w, count) => {
        this.achievements.add('packScatters');
        this.freeze(FEEL.bigHitstop);
        this.juice.packScattered(w, count);
      },
      onWolfCharge: (w) => this.onWolfCharge(w),
      onWolfScared: (w, threatening, by) => this.onWolfScared(w, threatening, by),
      onSheepGrabbed: (s, w) => {
        this.juice.sheepGrabbed(s);
        this.tip('grabbed');
        // On the line every grab could end the run: play it in slow motion.
        if (this.lastStand && this.effects === 'full') {
          this.slowmo = LAST_STAND.slowmo;
          this.punch = 1;
        }
      },
      onSheepSaved: (s, w) => this.onSheepSaved(s, w),
      onSheepLost: (s, w) => this.onSheepLost(s, w),
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
    this.ui.setBest(this.best, this.wins, this.bestStars);
    this.ui.setSummer(this.summer, this.summerUnlocked, this.summerWon);
    this.ui.setMuted(this.sfx.muted);
    this.applyEffects();
    this.refreshContinue();
    this.ui.show('menu');

    this.last = performance.now();
    renderer.setAnimationLoop(() => this.frame());
  }

  bindUI() {
    const ui = this.ui;
    ui.on('play', () => {
      // With a saved run, New Game asks for a second click before throwing it away.
      if (readSavedRun() && !this.newGameArmed) {
        this.newGameArmed = true;
        this.ui.armNewGame();
        return;
      }
      this.startGame();
    });
    ui.on('continue', () => this.continueRun());
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
    ui.on('keep-grazing', () => this.keepGrazing());
    ui.on('summer-down', () => this.pickSummer(-1));
    ui.on('summer-up', () => this.pickSummer(1));
    ui.on('reroll', () => this.reroll());
    ui.on('bigbark', () => this.bigBark());
    ui.onBuy = (id) => this.buy(id);
    ui.onFreeze = (id) => this.toggleFreeze(id);
    ui.onSell = (id) => this.sellCharm(id);
    ui.onPick = (i) => this.pickPerk(i);
    ui.on('close-bestiary', () => this.closeOverlay());
    ui.on('achievements', () => this.openAchievements());
    ui.on('wardrobe', () => this.openWardrobe());
    ui.on('close-wardrobe', () => this.closeOverlay());
    ui.onPickCosmetic = (slot, id) => this.pickCosmetic(slot, id);
    ui.on('effects', () => this.cycleEffects());
    ui.on('reset-tips', () => {
      this.tips.reset();
      this.sfx.click();
      this.ui.showTip('💡 Tips will show again the first time things happen.');
    });
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
    this.achievements.enabled = state !== STATE.MENU;
    this.tips.enabled = state !== STATE.MENU;
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

  // --- Wardrobe (cosmetics) --------------------------------------------------

  openWardrobe() {
    this.openOverlay('wardrobe');
    this.ui.openWardrobe(this.wardrobe, this.bestiary);
  }

  pickCosmetic(slot, id) {
    if (!this.wardrobe.pick(slot, id)) return;
    this.sfx.click();
    if (slot === 'meadow') this.world.setTheme(this.wardrobe.theme());
    else this.restyleDog();
    this.ui.openWardrobe(this.wardrobe, this.bestiary);
  }

  // Swap the dog for one in the new coat/accessories, keeping where it is and what it's doing.
  restyleDog() {
    const old = this.dog;
    const dog = new Dog(this.world.scene, this.wardrobe.dogStyle()).setPosition(old.position.x, 0, old.position.z);
    dog.heading = old.heading;
    dog.root.rotation.y = old.heading;
    dog.onArrive = old.onArrive;
    this.dog = this.ctx.dog = this.ctx.guards[0] = dog;
    old.destroy();
    this.applyUpgrades();
  }

  // Show a first-time tip (only ever once per player).
  tip(id) {
    const text = this.tips.take(id);
    if (text) this.ui.showTip(text);
  }

  // Unlock whatever has been achieved since the last check, with a card for each.
  checkAchievements() {
    this.achievements.life.discovered = this.bestiary.unlocked.size;
    for (const a of this.achievements.check()) {
      this.ui.toastAchievement(a, () => this.openAchievements(), rewardFor(a.id));
      this.sfx.upgrade();
    }
  }

  closeOverlay() {
    this.overlay = null;
    // The end-of-wave / game-over panel may have come due while the overlay was open.
    const panelDue = this.panelTimer <= 0;
    this.ui.show({ [STATE.MENU]: 'menu', [STATE.PAUSED]: 'pause' }[this.state] ?? null);
    if (panelDue && this.state === STATE.WAVE_COMPLETE) this.showWavePanel();
    if (panelDue && this.state === STATE.GAME_OVER) this.ui.showGameOver({ reason: this.gameOverReason, spare: this.lineStart - this.line, lost: this.lineStart - this.sheepCount(), wave: this.wave, endless: this.endless ? this.wave - GOAL.finalWave : 0, best: this.best, newBest: this.newBest, summary: this.runSummary() });
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
    const mods = (this.ctx.mods = modifiers(this.charms, this.perks));
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
    if (!mods.helper && this.helper) {
      // Sold: the second dog goes home.
      this.ctx.guards.splice(this.ctx.guards.indexOf(this.helper), 1);
      this.helper.destroy();
      this.helper = null;
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
    if (!mods.veteran) this.veteran = 0; // Veteran's reach only lasts while it's on the collar
    const d = this.dog.stats;
    this.dogBase = { maxSpeed: d.maxSpeed, acceleration: d.acceleration, threatRadius: d.threatRadius };
    this.applyLastStand();
    // Shepherd's Crook: the shepherd becomes a (short-range) guard too.
    this.shepherd.stats.threatRadius = mods.crook;
    const guards = this.ctx.guards;
    if (mods.crook && !guards.includes(this.shepherd)) guards.push(this.shepherd);
    if (!mods.crook && guards.includes(this.shepherd)) guards.splice(guards.indexOf(this.shepherd), 1);
    // Sold scarecrows are taken down.
    while (this.scarecrows.length > mods.scarecrows) this.scarecrows.pop().destroy();
    this.ui.setCharms(this.charms.map((id) => CHARM[id]));
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
    if (this.ctx.mods.stayPut) return; // Staying Put charm
    const from = this.shepherd.position;
    for (let tries = 0; tries < 20; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * ROAM.maxRadius;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x - from.x, z - from.z) < ROAM.minMove) continue;
      this.shepherd.walkTarget = { x, z };
      this.juice.shepherdMoves(this.shepherd);
      this.tip('roam');
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

  // Three upgrade cards and one livestock card. Frozen cards come first and stay put; the rest are
  // drawn at random around them.
  drawShopCards() {
    this.frozen = this.frozen.filter((key) => this.canOfferCard(key));
    const frozenAnimal = this.frozen.find((k) => k.startsWith('animal:'));
    const frozenUpgrades = this.frozen.filter((k) => !k.startsWith('animal:'));
    const fresh = drawCards(this.charms, SHOP.cards - 1 - frozenUpgrades.length, frozenUpgrades);
    const animal = frozenAnimal ? null : drawAnimal((kind) => this.canBuyAnimal(kind));
    if (animal) fresh.splice(Math.floor(Math.random() * (fresh.length + 1)), 0, `animal:${animal}`);
    return [...this.frozen, ...fresh];
  }

  // Whether a card (e.g. a frozen one) can still be offered: a charm not on the collar yet, an animal
  // still available.
  canOfferCard(key) {
    return key.startsWith('animal:') ? this.canBuyAnimal(key.slice(7)) : !!CHARM[key] && !this.charms.includes(key);
  }

  // Freeze a card to keep it in the shop for the next wave (up to SHOP.maxFrozen), or unfreeze it.
  toggleFreeze(key) {
    if (this.frozen.includes(key)) this.frozen = this.frozen.filter((k) => k !== key);
    else if (this.frozen.length >= SHOP.maxFrozen) return this.ui.denyFreeze();
    else this.frozen.push(key);
    this.sfx.click();
    this.showShop();
    this.saveRun();
  }

  // Animals that have turned up this run (a lamb always), and only one of each unique kind.
  canBuyAnimal(kind) {
    if (kind !== 'lamb' && this.wave < FIRST_WAVE[kind]) return false;
    if (this.flockSize() + this.pendingAnimals.length >= this.flockCap()) return false;
    return !(ANIMAL[kind].unique && this.ownedAnimals(kind) > 0);
  }

  ownedAnimals(kind) {
    const onField = kind === 'goat' ? (this.goat ? 1 : 0) : this.sheep.filter((s) => s.kind === kind).length;
    return onField + this.pendingAnimals.filter((k) => k === kind).length;
  }

  cardPrice(key) {
    const base = key.startsWith('animal:') ? animalPrice(key.slice(7), this.ownedAnimals(key.slice(7))) : CHARM[key].price;
    return Math.round(base * this.rules.prices);
  }

  // Difficulty level picked on the menu (only unlocked ones).
  pickSummer(step) {
    this.summer = Math.max(1, Math.min(this.summerUnlocked, this.summer + step));
    this.ui.setSummer(this.summer, this.summerUnlocked, this.summerWon);
    this.sfx.click();
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
          frozen: this.frozen.includes(key),
          livestock: true,
          name: ENTRY[kind].name,
          image: this.bestiary.portrait(kind),
          text: a.text,
          pays: wool ? `Shorn for 🧶 ${wool} a wave` : '',
          price,
          bought,
        };
      }
      return { key, ...CHARM[key], price, bought, frozen: this.frozen.includes(key), full: this.charms.length >= SHOP.slots };
    });
    const collar = this.charms.map((id) => ({ ...CHARM[id], sell: this.sellPrice(id) }));
    this.ui.renderShop({ cards, collar, slots: SHOP.slots, rerollCost: this.shop.rerollCost, wool: this.wool, frozen: this.frozen.length, maxFrozen: SHOP.maxFrozen });
  }

  // The end-of-wave screen: level-up picks first (one at a time), then the shop.
  showWavePanel() {
    if (this.victoryPanel) return this.ui.showVictory(this.victoryPanel);
    this.ui.showWaveComplete(this.pendingPanel);
    if (this.levelOffer) {
      this.ui.showLevelUp({
        level: this.level - this.pendingLevels + 1,
        left: this.pendingLevels,
        cards: this.levelOffer.map((c) => ({ ...c, icon: PERK[c.id].icon, name: PERK[c.id].name, text: perkText(c.id, c.points), owned: this.perks[c.id] ?? 0, max: PERK[c.id].max })),
      });
      this.tip('levelUp');
      return;
    }
    this.ui.showLevelUp(null);
    this.showShop();
    this.tip('shop');
  }

  buy(key) {
    const price = this.cardPrice(key);
    if (this.shop.bought.has(key) || this.wool < price) return;
    if (!key.startsWith('animal:') && this.charms.length >= SHOP.slots) return this.ui.denyCollar();
    this.wool -= price;
    this.stats.woolSpent += price;
    if (key.startsWith('animal:')) this.stats.animals.push(key.slice(7));
    this.shop.bought.add(key);
    this.frozen = this.frozen.filter((k) => k !== key);
    if (key.startsWith('animal:')) this.pendingAnimals.push(key.slice(7));
    else {
      this.charms.push(key);
      this.applyUpgrades();
      this.checkAchievements();
    }
    this.sfx.upgrade();
    this.showShop();
    this.saveRun();
  }

  sellPrice(id) {
    return Math.floor(CHARM[id].price * this.rules.prices * SHOP.sellBack);
  }

  // Take a charm off the collar for half its price, to make room for another.
  sellCharm(id) {
    if (this.state !== STATE.WAVE_COMPLETE || !this.charms.includes(id)) return;
    this.wool += this.sellPrice(id);
    this.charms = this.charms.filter((c) => c !== id);
    this.applyUpgrades();
    this.sfx.coin();
    this.showShop();
    this.saveRun();
  }

  reroll() {
    if (this.wool < this.shop.rerollCost) return;
    this.wool -= this.shop.rerollCost;
    this.shop.rerollCost += SHOP.reroll;
    this.shop.cards = this.drawShopCards();
    this.shop.bought.clear();
    this.sfx.click();
    this.showShop();
    this.saveRun();
  }

  // --- Flow ----------------------------------------------------------------

  startGame() {
    this.sfx.unlock();
    this.sfx.click();
    clearSavedRun();
    this.resetRun();
    this.nextWave();
  }

  // Clear the field and all per-run state (used by New Game and Continue).
  resetRun() {
    this.line = 0;
    this.heartbeat = 0;
    this.veteran = 0; // Veteran charm stacks
    this.lineStart = 0;
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
    this.endless = false;
    this.victoryPanel = null;
    this.boss = null;
    this.combo = { count: 0, timer: 0 };
    this.achievements.newRun();
    this.stats = newRunStats();
    this.rules = summerRules(this.summer);
    this.charms = [];
    this.perks = {};
    this.xp = 0;
    this.level = 1;
    this.pendingLevels = 0; // level-ups waiting for their pick at the end of the wave
    this.levelOffer = null; // the perk cards on offer for the next pick
    this.frozen = [];
    this.pendingAnimals.length = 0;
    this.barkCharge = 1;
    for (const t of this.tufts) t.destroy();
    this.tufts.length = 0;
    this.helper?.destroy();
    this.helper = null;
    this.ctx.guards.length = 1; // just the player's dog
    for (const sc of this.scarecrows) sc.destroy();
    this.scarecrows.length = 0;
    this.applyUpgrades();
    this.ui.setHudVisible(true);
  }

  nextWave() {
    if (this.levelOffer) return; // pick the level-up first
    this.wave++;
    const cfg = (this.cfg = this.ctx.cfg = waveConfig(this.wave, this.rules));
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
    for (let i = 0; i < this.ctx.mods.extraGolden; i++) kinds.push('golden'); // Golden Child charm
    for (let i = 0; i < cfg.sleepy; i++) kinds.push('sleepy');
    for (let i = 0; i < cfg.wanderers; i++) kinds.push('wanderer');
    const mods = this.ctx.mods;
    for (let i = 0; i < cfg.lambs + mods.lambs; i++) kinds.push('lamb');
    for (let i = 0; i < cfg.newSheep + (this.wave > 1 ? mods.extraSheep : 0); i++) kinds.push('normal');
    const room = Math.max(0, this.flockCap() - this.flockSize());
    this.spawnSheep(kinds.slice(0, room), this.wave > 1);
    // Endless: newcomers that don't fit are sold at market.
    const sold = this.endless ? Math.max(0, kinds.length - room) : 0;
    if (sold) {
      this.addWool(sold * ENDLESS.marketWool);
      this.juice.soldAtMarket(this.shepherd, sold, sold * ENDLESS.marketWool);
    }
    for (let i = 0; i < cfg.disguised; i++) this.spawnDisguise();
    this.beginWave();
  }

  // Everything that happens once the wave's flock is in place: reset per-wave state, announce the
  // wave, start the intro and save a checkpoint. A continued run starts here too.
  beginWave() {
    const cfg = this.cfg;
    this.waveStartSheep = this.flockSize();
    // The line: the flock may lose a share of its sheep this wave, but no more.
    this.lineStart = this.sheepCount();
    this.line = lineFor(this.wave, this.lineStart);
    if (this.line && this.ctx.mods.brink) this.line = Math.min(this.lineStart - 1, this.line + 1); // On the Brink charm
    this.boss = null;
    this.bossSpawned = false;
    this.bossOvertime = false;
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
    const final = this.wave === GOAL.finalWave;
    const sub =
      this.wave === 1
        ? this.rules.summer > 1
          ? `Summer ${this.rules.summer}: keep the flock safe until wave ${GOAL.finalWave}`
          : `Keep the flock safe until the end of summer: wave ${GOAL.finalWave}`
        : final
          ? 'The last wave of summer. Hold on!'
          : this.endless
            ? `${cfg.wolves} wolves`
            : newcomers.length
              ? `New: ${newcomers.join(' & ')}. See the 📖 bestiary`
              : `${cfg.wolves} wolves are coming`;
    const title = this.endless ? `Endless ${this.wave - GOAL.finalWave}` : final ? 'Final wave' : `Wave ${this.wave}`;
    this.ui.banner(title, this.line ? `${sub} · the shepherd can spare ${this.lineStart - this.line}` : sub);
    if (this.line) this.tip('line');
    if (this.wave === 1) setTimeout(() => this.tip('move'), 800);
    if (this.wave === 2) this.tip('bigBark');
    if (this.sheep.some((s) => s.kind === 'sleepy')) this.tip('sleepy');
    this.whistleTimer = this.ctx.mods.whistle;
    this.roamTimer = between(ROAM.interval) * 0.6;
    this.setState(STATE.INTRO);
    this.applyUpgrades(); // shows the scarecrow placement hint if one is waiting
    this.saveRun();
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

    if (this.line && this.sheepCount() === this.line) this.achievements.add('heldLine');
    // Veteran charm: a clean wave adds reach for good; a bad one resets it.
    if (this.ctx.mods.veteran) {
      const lost = this.lineStart - this.sheepCount();
      if (lost === 0) {
        this.veteran++;
        this.juice.veteran(this.dog, this.veteran);
      } else if (lost >= VETERAN.resetAt) this.veteran = 0;
      this.applyLastStand();
    }

    // Shearing Day: every surviving sheep pays its wool, calm ones a little extra.
    const flock = this.sheep.filter((s) => !s.type.fake);
    const sheared = Math.floor(flock.reduce((sum, s) => sum + s.type.wool, 0) * this.ctx.mods.shears);
    const calm = Math.floor(flock.filter((s) => !s.wasGrabbed && s.stress < SHEARING.calmStress).length * SHEARING.calmBonus);
    const perfect = this.flockSize() === this.waveStartSheep ? SHEARING.perfect : 0;
    const interest = Math.min(Math.floor(this.wool / SHEARING.interestPer), SHEARING.interestMax + this.ctx.mods.interest);
    const reward = sheared + calm + perfect + interest;
    this.stats.woolEarned += reward;
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
    if (this.wave === GOAL.finalWave && !this.endless) this.victory();
    this.panelTimer = this.victoryPanel ? 2.6 : 1.8;
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
      line: this.line ? { spare: this.lineStart - this.line, lost: this.lineStart - this.sheepCount() } : null,
      bounty: this.waveBounty,
      reward,
    };
    this.openShop();
    this.offerLevelUp();
    this.saveRun();
  }

  // reason: 'wolves' (the flock is gone) or 'line' (more sheep lost than the shepherd could spare)
  gameOver(reason = 'wolves') {
    this.gameOverReason = reason;
    this.setState(STATE.GAME_OVER);
    clearSavedRun();
    this.newBest = this.wave - 1 > this.best;
    this.best = Math.max(this.best, this.wave - 1);
    try {
      localStorage.setItem(BEST_KEY, String(this.best));
    } catch {}
    this.sfx.gameOver();
    this.checkAchievements();
    this.panelTimer = 1.5;
    this.pendingPanel = null;
  }

  // --- Saving and continuing a run ----------------------------------------

  // Checkpoint: during the end-of-wave screen (shop or win screen) it saves that screen; otherwise
  // the start of the current wave.
  saveRun() {
    const atShop = this.state === STATE.WAVE_COMPLETE;
    const index = new Map(this.sheep.map((s, i) => [s, i]));
    const r = (v) => Math.round(v * 100) / 100;
    const data = {
      v: RUN_VERSION,
      at: atShop ? 'shop' : 'wave',
      wave: this.wave,
      summer: this.rules.summer,
      endless: this.endless,
      wool: this.wool,

      charms: this.charms,
      perks: this.perks,
      xp: this.xp,
      level: this.level,
      veteran: this.veteran,
      pendingLevels: this.pendingLevels,
      levelOffer: atShop ? this.levelOffer : null,
      stats: this.stats,
      run: this.achievements.run,
      shepherd: [r(this.shepherd.position.x), r(this.shepherd.position.z)],
      goat: this.goat ? [r(this.goat.position.x), r(this.goat.position.z)] : null,
      scarecrows: this.scarecrows.map((sc) => [r(sc.position.x), r(sc.position.z), r(sc.root.rotation.y)]),
      sheep: this.sheep.map((s) => ({
        k: s.kind,
        x: r(s.position.x),
        z: r(s.position.z),
        h: r(s.heading),
        p: s.parent ? (index.get(s.parent) ?? -1) : -1,
        a: s.asleep ? 1 : 0,
        g: s.wavesSurvived ?? 0,
        r: s.type.fake ? r(s.revealIn) : undefined,
      })),
      pendingAnimals: this.pendingAnimals,
      frozen: this.frozen,
      shop: atShop && this.shop ? { cards: this.shop.cards, bought: [...this.shop.bought], rerollCost: this.shop.rerollCost } : null,
      panel: atShop ? this.pendingPanel : null,
      victory: atShop ? this.victoryPanel : null,
    };
    try {
      localStorage.setItem(RUN_KEY, JSON.stringify(data));
    } catch {}
  }

  continueRun() {
    const data = readSavedRun();
    if (!data) return this.startGame();
    this.sfx.unlock();
    this.sfx.click();
    this.summer = data.summer;
    this.resetRun();

    this.wave = data.wave;
    this.wool = data.wool;
    this.endless = data.endless;
    this.charms = data.charms;
    this.perks = data.perks;
    this.xp = data.xp;
    this.level = data.level;
    this.veteran = data.veteran ?? 0;
    this.pendingLevels = data.pendingLevels;
    this.levelOffer = data.levelOffer;
    this.frozen = data.frozen ?? [];
    this.stats = { ...newRunStats(), ...data.stats };
    Object.assign(this.achievements.run, data.run);
    this.applyUpgrades(); // brings back the second dog if it was bought

    this.shepherd.setPosition(data.shepherd[0], 0, data.shepherd[1]);
    for (const [x, z, ry] of data.scarecrows) {
      const sc = new Scarecrow(this.world.scene).setPosition(x, 0, z);
      sc.root.rotation.y = ry;
      this.scarecrows.push(sc);
    }
    for (const d of data.sheep) {
      const s = new Sheep(this.world.scene, d.k).setPosition(d.x, 0, d.z);
      s.heading = d.h;
      s.root.rotation.y = d.h;
      s.asleep = !!d.a;
      s.sleepPose = s.asleep ? 1 : 0;
      s.wavesSurvived = d.g;
      if (s.type.fake) {
        s.revealIn = d.r ?? 15;
        s.sniff = 0;
      }
      this.sheep.push(s);
    }
    data.sheep.forEach((d, i) => {
      const mother = this.sheep[d.p];
      if (mother) {
        this.sheep[i].parent = mother;
        mother.child = this.sheep[i];
      }
    });
    if (data.goat) this.goat = new Goat(this.world.scene).setPosition(data.goat[0], 0, data.goat[1]);
    flockCenter(this.sheep, this.center);
    this.cfg = this.ctx.cfg = waveConfig(this.wave, this.rules);
    this.ctx.cohesionScale = 1;

    if (data.at === 'wave') {
      this.beginWave(); // the wave restarts from its beginning
    } else {
      this.pendingAnimals.push(...data.pendingAnimals);
      this.shop = { cards: data.shop.cards, bought: new Set(data.shop.bought), rerollCost: data.shop.rerollCost };
      this.pendingPanel = data.panel;
      this.victoryPanel = data.victory;
      this.offerLevelUp();
      this.setState(STATE.WAVE_COMPLETE);
      this.panelTimer = 0;
      this.showWavePanel();
    }
  }

  // Menu: "Continue" when there's a saved run.
  refreshContinue() {
    const data = readSavedRun();
    this.newGameArmed = false;
    if (!data) return this.ui.setContinue(null);
    const where = data.at === 'shop' ? `wave ${data.wave} done` : `wave ${data.wave}`;
    const extras = [data.summer > 1 && `Summer ${data.summer}`, data.endless && 'endless'].filter(Boolean);
    this.ui.setContinue(`Continue · ${where}${extras.length ? ' · ' + extras.join(' · ') : ''}`);
  }

  toMenu() {
    for (const w of this.wolves) w.destroy();
    this.wolves.length = 0;
    for (const s of this.sheep.filter((s) => s.type.fake)) this.removeSheep(s);
    this.juice.clearFloats();
    if (this.sheep.length < 8) this.spawnSheep(Array(12 - this.sheep.length).fill('normal'), false);
    for (const s of this.sheep) s.grabbedBy = null;
    this.ui.setHudVisible(false);
    this.ui.setBest(this.best, this.wins, this.bestStars);
    this.ui.setSummer(this.summer, this.summerUnlocked, this.summerWon);
    this.refreshContinue();
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

  spawnWolf(kind, angle) {
    // Spread arrivals around the meadow rather than bunching on one side.
    // Sneaky wolves slip in on the far side of the flock from the dog.
    const base =
      kind === 'sneaky'
        ? Math.atan2(this.center.z - this.dog.position.z, this.center.x - this.dog.position.x)
        : (angle ?? this.wolvesSpawned * 2.4 + Math.random() * 1.2);
    this.lastSpawnAngle = base;
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

  flockCap() {
    return this.endless ? ENDLESS.flockCap : SHEEP.cap;
  }

  waveLabel() {
    return this.endless ? `${this.wave} ∞` : `${this.wave} / ${GOAL.finalWave}`;
  }

  // The run summary shown on the win and game-over screens.
  runSummary() {
    const charms = this.charms.map((id) => ({ icon: CHARM[id].icon, name: CHARM[id].name }));
    const perks = Object.entries(this.perks).map(([id, points]) => ({ icon: PERK[id].icon, name: PERK[id].name, level: points }));
    return { ...this.stats, level: this.level, perks, charms, animals: this.stats.animals.map((k) => ENTRY[k]?.name ?? k) };
  }

  // --- The goal ------------------------------------------------------------

  // Old Greymuzzle comes on the final wave, and every few endless waves.
  isBossWave() {
    const w = this.wave;
    return w === GOAL.finalWave || (w > GOAL.finalWave && (w - GOAL.finalWave) % BOSS.endlessEvery === 0);
  }

  spawnBoss() {
    this.bossSpawned = true;
    const a = Math.atan2(this.center.z - this.dog.position.z, this.center.x - this.dog.position.x) + (Math.random() - 0.5);
    const w = new Wolf(this.world.scene, 'greymuzzle').setPosition(Math.cos(a) * WORLD.spawnRadius, 0, Math.sin(a) * WORLD.spawnRadius);
    w.drivesLeft = BOSS.driveOffs + this.rules.bossDrives + Math.floor(Math.max(0, this.wave - GOAL.finalWave) / BOSS.endlessEvery);
    w.drivesTotal = w.drivesLeft;
    this.wolves.push(w);
    toWander(w, this.ctx);
    w.stateTimer = 2;
    this.boss = w;
    this.juice.bossArrives(w);
    this.tip('boss');
  }

  onBossDriven(boss, left) {
    this.juice.bossDriven(boss, left);
    this.addXp(XP.bossDrive);
    if (left > 0) {
      // It comes back with fresh wolves.
      for (let i = 0; i < BOSS.reinforcements; i++) this.spawnWolf('normal');
    } else {
      const t = new Tuft(this.world.scene, COLORS.greymuzzleLight, BOSS.tuft, BOUNTY.life * this.ctx.mods.tuftLife * 1.5).setPosition(boss.position.x, 0, boss.position.z);
      this.tufts.push(t);
      this.juice.tuftDropped(t);
    }
  }

  bossActive() {
    return this.boss && !this.boss.defeated && !this.boss.gone;
  }

  // End of summer: the final wave is over and there are sheep left.
  victory() {
    const flock = this.sheepCount();
    const stars = flock >= GOAL.stars[1] ? 3 : flock >= GOAL.stars[0] ? 2 : 1;
    const run = this.achievements.run;
    run.won = true;
    run.stars = stars;
    run.goldenAtWin = this.sheep.some((s) => s.kind === 'golden');
    this.wins++;
    this.bestStars = Math.max(this.bestStars, stars);
    this.best = Math.max(this.best, this.wave);
    try {
      localStorage.setItem(WINS_KEY, String(this.wins));
      localStorage.setItem(BEST_STARS_KEY, String(this.bestStars));
      localStorage.setItem(BEST_KEY, String(this.best));
    } catch {}
    // Winning a summer unlocks the next one.
    const summer = this.rules.summer;
    const unlocked = summer === this.summerUnlocked && summer < SUMMERS.length ? summer + 1 : 0;
    this.summerWon = Math.max(this.summerWon, summer);
    if (unlocked) this.summerUnlocked = this.summer = unlocked;
    run.summerWon = summer;
    try {
      localStorage.setItem(SUMMER_KEY, String(this.summerUnlocked));
      localStorage.setItem(SUMMER_WON_KEY, String(this.summerWon));
    } catch {}
    this.victoryPanel = {
      stars,
      flock,
      summer,
      unlocked: unlocked && { summer: unlocked, text: SUMMERS[unlocked - 1].text },
      wool: this.wool,
      level: this.level,
      summary: this.runSummary(),
    };
    this.juice.victory(this.center);
    this.checkAchievements();
  }

  // Carry on after winning: back to the usual end-of-wave shop, then endless waves.
  keepGrazing() {
    this.endless = true;
    this.victoryPanel = null;
    this.sfx.click();
    this.showWavePanel();
    this.saveRun();
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
    } else if (by?.bark?.()) this.juice.bark(by);
    if (by === this.helper) this.helper.rest = HELPER.rest; // catches its breath before the next chase
    // A scare that stopped a real threat: counts for combos, tufts and achievements.
    const counted = threatening && this.state === STATE.PLAYING;
    if (counted) {
      this.achievements.add('scares');
      this.stats.scared++;
      if (wolf.kind === 'brute') this.achievements.add('brutes');
      if (wolf.kind === 'howler') this.achievements.add('howlers');
      this.addCombo(wolf);
      this.dropBounty(wolf);
      // The dog's scares earn XP, and so do the dominoes they set off (Chain Reaction).
      if (by === this.dog || by instanceof Wolf) this.addXp((XP.wolf[wolf.kind] ?? 1) * Math.min(XP.comboMax, 1 + XP.comboStep * (this.combo.count - 1)));
      // Bounty Hunter charm: every scare pays, more in a combo.
      const mods = this.ctx.mods;
      if (mods.woolPerScare) {
        const pay = Math.min(mods.woolPerScare, this.combo.count);
        this.addWool(pay);
        this.stats.woolEarned += pay;
        this.juice.bountyPaid(wolf, pay);
      }
      // Scares charge the Big Bark, more the longer the combo.
      if (!this.barking && this.barkCharge < this.ctx.mods.barkMax) {
        this.barkCharge = Math.min(this.ctx.mods.barkMax, this.barkCharge + BIG_BARK.perScare * this.combo.count);
        this.ui.chargeBigBark();
      }
    }
    if (by === this.dog) this.dog.recoil = 1;
    const praise = by instanceof Scarecrow ? 'SCARED OFF!' : by instanceof Wolf ? 'DOMINO!' : by === this.helper ? 'GOOD PUP!' : by === this.shepherd ? 'NICE SWING!' : 'GOOD DOG!';
    this.juice.wolfScared(wolf, counted && praise);
  }

  onSheepSaved(sheep, wolf) {
    this.achievements.add('saves');
    this.stats.saved++;
    if (this.state === STATE.PLAYING) this.addXp(XP.rescue);
    this.juice.sheepSaved(sheep);
    // Saved in the nick of time: slow motion and a little camera push.
    if (wolf?.stateTimer < FEEL.closeCall && this.state === STATE.PLAYING) {
      const now = performance.now();
      if (this.effects === 'full' && now - this.lastSlowmo > FEEL.slowmoGap * 1000) {
        this.slowmo = FEEL.slowmo;
        this.punch = 1;
        this.lastSlowmo = now;
      }
      this.achievements.add('closeCalls');
      this.stats.closeCalls++;
      this.juice.closeCall(sheep);
    }
  }

  // Scares every wolf around the dog, brutes included, but startles nearby sheep too.
  bigBark() {
    if (!this.input.enabled) return;
    if (this.barkCharge < 1) return this.ui.denyBigBark();
    if (this.wave < this.rules.bigBarkFrom) {
      this.juice.floatText(`Big Bark unlocks at wave ${this.rules.bigBarkFrom}`, { follow: this.dog, offsetY: 3, cls: 'warn', duration: 1.4 });
      return this.ui.denyBigBark();
    }
    this.barkCharge -= 1;
    const dog = this.dog;
    dog.barkAnim = 1;
    dog.barkTimer = dog.stats.barkCooldown; // the normal bark waits its turn
    const full = BIG_BARK.radius * this.ctx.mods.bigBarkRadius;
    const horn = this.ctx.mods.horn; // Herding Horn charm: half the range for wolves, the flock comes to the dog
    const radius = horn ? full / 2 : full;
    let scared = 0;
    this.barking = true; // its own scares don't charge the meter
    for (const w of this.wolves) {
      if (w.position.distanceTo(dog.position) < radius && forceScare(w, this.ctx, dog)) scared++;
    }
    this.barking = false;
    for (const s of this.sheep) {
      const d = s.position.distanceTo(dog.position);
      if (horn) {
        if (d < full && !s.grabbedBy) {
          s.regroup = WHISTLE.regroupTime;
          s.regroupTo = dog;
          if (s.asleep) s.asleep = false;
        }
        continue;
      }
      if (d < BIG_BARK.startleRadius && d > 1e-3 && !s.grabbedBy) {
        s.fear = Math.max(s.fear, 0.7);
        s.velocity.x += ((s.position.x - dog.position.x) / d) * 3;
        s.velocity.z += ((s.position.z - dog.position.z) / d) * 3;
        if (s.asleep) s.asleep = false;
      }
    }
    this.achievements.best('bestBigBark', scared);
    this.stats.bigBarks++;
    this.freeze(FEEL.bigHitstop);
    this.juice.bigBark(dog, radius, scared);
  }

  // The first time a big wolf is scared off it leaves a tuft of fur behind.
  dropBounty(wolf) {
    const value = BOUNTY.wool[wolf.kind]; // the boss drops its own big tuft when it's gone for good
    if (!value || wolf.bountyDropped) return;
    wolf.bountyDropped = true;
    const color = { brute: COLORS.brute, alpha: COLORS.alphaMane, trickster: COLORS.fox }[wolf.kind];
    const t = new Tuft(this.world.scene, color, value, BOUNTY.life * this.ctx.mods.tuftLife).setPosition(wolf.position.x, 0, wolf.position.z);
    this.tufts.push(t);
    this.juice.tuftDropped(t);
    this.tip('tuft');
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
        this.stats.tufts++;
        this.stats.woolEarned += t.value;
        this.juice.tuftCollected(t);
      } else if (t.life <= 0) this.juice.tuftLost(t);
      if (picked || t.life <= 0) {
        t.destroy();
        this.tufts.splice(i, 1);
      }
    }
  }

  // Whole-game freeze-frame, kept for big moments and rate-limited so busy waves don't stutter.
  freeze(seconds) {
    const now = performance.now();
    if (this.effects !== 'full' || now - this.lastFreeze < FEEL.freezeGap * 1000) return;
    this.lastFreeze = now;
    this.hitstop = Math.max(this.hitstop, seconds);
  }

  cycleEffects() {
    this.effects = EFFECTS[(EFFECTS.indexOf(this.effects) + 1) % EFFECTS.length];
    try {
      localStorage.setItem(EFFECTS_KEY, this.effects);
    } catch {}
    this.applyEffects();
    this.sfx.click();
  }

  applyEffects() {
    this.juice.intensity = { full: 1, reduced: 0.5, off: 0 }[this.effects];
    this.ui.setEffects(this.effects);
  }

  // --- Dog levels -------------------------------------------------------------

  // XP from the dog's scares, rescues and the boss; doubled on the line. Each level is picked at the
  // end of the wave.
  addXp(amount) {
    this.xp += amount * (this.lastStand ? XP.onTheLine : 1);
    while (this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level);
      this.level++;
      this.pendingLevels++;
      this.juice.levelUp(this.dog, this.level);
    }
  }

  // The next level-up's three perk cards, if one is waiting.
  offerLevelUp() {
    if (!this.levelOffer && this.pendingLevels > 0) this.levelOffer = drawPerks(this.perks, this.charms);
    if (this.levelOffer && !this.levelOffer.length) {
      // Everything maxed out: nothing to pick.
      this.levelOffer = null;
      this.pendingLevels = 0;
    }
  }

  pickPerk(i) {
    const card = this.levelOffer?.[i];
    if (!card) return;
    this.perks[card.id] = (this.perks[card.id] ?? 0) + card.points;
    this.pendingLevels--;
    this.levelOffer = null;
    this.applyUpgrades();
    if (this.perks.loud >= PERK.loud.max) this.achievements.run.loudMax = true;
    this.checkAchievements();
    this.sfx.upgrade();
    this.offerLevelUp();
    this.showWavePanel();
    this.saveRun();
  }

  // Scares landed within FEEL.comboWindow of each other chain into a combo.
  addCombo(wolf) {
    const c = this.combo;
    c.count = c.timer > 0 ? c.count + 1 : 1;
    c.timer = FEEL.comboWindow;
    this.achievements.best('bestCombo', c.count);
    this.stats.bestCombo = Math.max(this.stats.bestCombo, c.count);
    if (c.count < 2) return;
    this.juice.combo(this.dog, c.count);
  }

  removeSheep(sheep) {
    if (sheep.parent) sheep.parent.child = null;
    const i = this.sheep.indexOf(sheep);
    if (i >= 0) this.sheep.splice(i, 1);
    sheep.destroy();
  }

  onSheepLost(sheep, wolf) {
    if (!sheep.type.fake) {
      this.stats.lost++;
      const by = wolf ? ENTRY[entryId(wolf)]?.name ?? 'Wolf' : 'Wolf';
      this.stats.lostTo[by] = (this.stats.lostTo[by] ?? 0) + 1;
    }
    this.removeSheep(sheep);
    this.juice.sheepLost(sheep.position);
    if (this.wave <= 5 && !sheep.type.fake) this.achievements.run.lostBy5++;
    if (sheep.kind === 'bellwether' && this.state === STATE.PLAYING) {
      this.ctx.cohesionScale = BELL.lostCohesion;
      this.juice.bellwetherLost(sheep.position);
    }
    // Crossing the line ends the run on the spot: no waiting out a lost wave.
    if (this.line && !sheep.type.fake && this.sheepCount() < this.line && this.state === STATE.PLAYING) {
      this.juice.lineCrossed(this.shepherd);
      return this.gameOver('line');
    }
    // The goat can't keep the flock going on its own.
    if (this.sheepCount() === 0 && this.state === STATE.PLAYING) this.gameOver();
  }

  // Last Sheep Standing: on the line, one more loss ends the run, so the dog finds a second wind
  // (faster, bigger reach), the screen closes in with a heartbeat and every grab plays in slow motion.
  updateLastStand(dt) {
    const on = this.state === STATE.PLAYING && this.line > 0 && this.sheepCount() <= this.line + (this.ctx.mods.brink ? 1 : 0);
    if (on !== !!this.lastStand) {
      this.lastStand = on;
      this.applyLastStand();
      this.ui.setLastStand(on);
      if (on) {
        this.juice.lastStand(this.dog);
        this.tip('lastStand');
        this.heartbeat = 0;
      }
    }
    if (on && (this.heartbeat -= dt) <= 0) {
      this.heartbeat = LAST_STAND.heartbeat;
      this.sfx.heartbeat();
    }
  }

  applyLastStand() {
    const b = this.dogBase;
    if (!b) return;
    const twice = this.ctx.mods.brink ? 2 : 1; // On the Brink charm
    const k = this.lastStand ? { speed: 1 + (LAST_STAND.speed - 1) * twice, reach: 1 + (LAST_STAND.reach - 1) * twice } : { speed: 1, reach: 1 };
    const veteran = this.ctx.mods.veteran ? 1 + VETERAN.reach * this.veteran : 1;
    Object.assign(this.dog.stats, { maxSpeed: b.maxSpeed * k.speed, acceleration: b.acceleration * k.speed, threatRadius: b.threatRadius * k.reach * veteran });
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
          // From wave 2 wolves arrive in pairs from opposite sides, so the dog can't cover both.
          const pair = this.cfg.pairs && this.wolvesSpawned + 1 < this.cfg.wolves;
          this.spawnWolf(this.cfg.pack[this.wolvesSpawned] ?? 'normal');
          this.wolvesSpawned++;
          if (pair) {
            this.spawnWolf(this.cfg.pack[this.wolvesSpawned] ?? 'normal', this.lastSpawnAngle + Math.PI);
            this.wolvesSpawned++;
          }
          this.nextWolfAt += this.cfg.spawnInterval * (pair ? 1.6 : 1);
        }
        this.updateDisguises(dt);
        if ((this.roamTimer -= dt) <= 0) this.roam();
        if (this.ctx.mods.whistle && (this.whistleTimer -= dt) <= 0) {
          this.whistleTimer = this.ctx.mods.whistle;
          this.whistle();
        }
        const arriveAt = this.rules.bossEarly ? Math.min(BOSS.arriveAt, 0.1) : BOSS.arriveAt;
        if (this.isBossWave() && !this.bossSpawned && this.waveTime >= this.cfg.duration * arriveAt) this.spawnBoss();
        // The boss wave only ends once Old Greymuzzle has been driven off for good.
        if (this.waveTime >= this.cfg.duration) {
          if (!this.bossActive()) this.completeWave();
          else if (!this.bossOvertime) {
            this.bossOvertime = true;
            this.ui.banner('Overtime', 'Drive off Old Greymuzzle to end the wave!');
          }
        }
        break;
      case STATE.WAVE_COMPLETE:
      case STATE.GAME_OVER:
        if (this.panelTimer > 0) {
          this.panelTimer -= dt;
          if (this.panelTimer <= 0 && !this.overlay) {
            if (this.state === STATE.WAVE_COMPLETE) this.showWavePanel();
            else this.ui.showGameOver({ reason: this.gameOverReason, spare: this.lineStart - this.line, lost: this.lineStart - this.sheepCount(), wave: this.wave, endless: this.endless ? this.wave - GOAL.finalWave : 0, best: this.best, newBest: this.newBest, summary: this.runSummary() });
          }
        }
        break;
    }

    this.updateLastStand(dt);
    this.simulate(dt);
    if (this.state !== STATE.MENU) {
      if (this.state === STATE.PLAYING && !this.tips.seen.has('wolfComing') && this.wolves.some((w) => w.state === 'APPROACH')) this.tip('wolfComing');
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
    const boss = this.bossActive() ? this.boss : null;
    this.ui.setBoss(boss && { name: 'Old Greymuzzle', done: boss.drivesTotal - boss.drivesLeft, left: boss.drivesLeft });
    const barkMax = this.ctx.mods.barkMax;
    this.barkCharge = Math.min(barkMax, this.barkCharge + (dt * this.ctx.mods.barkPassive) / (BIG_BARK.recharge * this.ctx.mods.bigBarkCooldown));
    const barkLocked = this.wave < this.rules.bigBarkFrom;
    this.ui.setBigBark(barkLocked ? 0 : this.barkCharge);
    const c = this.combo;
    c.timer = Math.max(0, c.timer - dt);
    if (!c.timer) c.count = 0;
    this.ui.setCombo(c.count, c.timer / FEEL.comboWindow);
    if (this.state !== STATE.MENU) {
      this.ui.setHud({
        sheep: this.sheepCount(), // the goat doesn't count towards the line
        line: this.line,
        spare: this.lineStart - this.line,
        wave: this.waveLabel(),
        timeLeft: this.cfg ? Math.max(0, 1 - this.waveTime / this.cfg.duration) : 1,
        wool: this.wool,
        level: this.level,
        xp: this.xp / xpToNext(this.level),
        pending: this.pendingLevels,
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

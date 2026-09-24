import * as THREE from 'three';
import { SHEEP, WORLD, waveConfig } from './config.js';
import { createWorld } from './world.js';
import { Dog, Sheep, Wolf, Shepherd, angleTo } from './entities.js';
import { updateFlock, flockCenter } from './flock.js';
import { updateWolves, toWander, isThreatening } from './wolves.js';
import { ParticleSystem } from './particles.js';
import { Juice } from './juice.js';
import { Sfx } from './audio.js';
import { MouseController } from './input.js';
import { UI } from './ui.js';

export const STATE = {
  MENU: 'MENU',
  INTRO: 'INTRO',
  PLAYING: 'PLAYING',
  WAVE_COMPLETE: 'WAVE_COMPLETE',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
};

const POINTS = { scare: 15, save: 25, survivor: 5, perfect: 50 };
const BEST_KEY = 'this-is-my-sheep.best';

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
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

    this.shepherd = new Shepherd(scene);
    this.dog = new Dog(scene).setPosition(0, 0, 7);
    this.dog.onArrive = (p) => this.juice.dogArrival(p);
    this.sheep = [];
    this.wolves = [];

    this.state = STATE.MENU;
    this.time = 0;
    this.wave = 0;
    this.wool = 0;
    this.best = readBest();
    this.cfg = null;
    this.center = new THREE.Vector3();
    this.cameraFocus = new THREE.Vector3();

    // Shared context handed to the flock and wolf systems.
    this.ctx = {
      dog: this.dog,
      shepherd: this.shepherd,
      sheep: this.sheep,
      wolves: this.wolves,
      center: this.center,
      cfg: null,
      huntingAllowed: false,
      onSheepPanic: (s) => this.juice.sheepPanic(s),
      onWolfCharge: (w) => this.onWolfCharge(w),
      onWolfScared: (w, threatening) => this.onWolfScared(w, threatening),
      onSheepGrabbed: (s, w) => this.juice.sheepGrabbed(s),
      onSheepSaved: (s) => this.onSheepSaved(s),
      onSheepLost: (s) => this.onSheepLost(s),
    };

    this.input = new MouseController(renderer.domElement, camera, {
      onPress: (p) => {
        this.dog.setTarget(p);
        this.juice.clickMarker(this.dog.target);
      },
      onDrag: (p) => this.dog.setTarget(p),
    });

    this.bindUI();
    this.spawnSheep(12, false);
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

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') this.togglePause();
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
  }

  // --- Flow ----------------------------------------------------------------

  startGame() {
    this.sfx.unlock();
    this.sfx.click();
    for (const w of this.wolves) w.destroy();
    this.wolves.length = 0;
    for (const s of this.sheep) s.destroy();
    this.sheep.length = 0;
    this.juice.clearFloats();
    this.dog.setPosition(0, 0, 7);
    this.dog.velocity.set(0, 0, 0);
    this.dog.hasTarget = false;
    this.wave = 0;
    this.wool = 0;
    this.ui.setHudVisible(true);
    this.nextWave();
  }

  nextWave() {
    this.wave++;
    this.cfg = this.ctx.cfg = waveConfig(this.wave);
    const add = Math.max(0, Math.min(this.cfg.newSheep, SHEEP.cap - this.sheep.length));
    this.spawnSheep(add, this.wave > 1);
    this.waveStartSheep = this.sheep.length;
    this.waveTime = 0;
    this.wolvesSpawned = 0;
    this.nextWolfAt = 2;
    this.introTimer = 2.2;
    this.ui.show(null);
    this.ui.banner(`Wave ${this.wave}`, this.wave === 1 ? 'Click the meadow to move your dog' : `${this.cfg.wolves} wolves are coming`);
    this.setState(STATE.INTRO);
  }

  completeWave() {
    this.setState(STATE.WAVE_COMPLETE);
    for (const w of this.wolves) {
      if (w.target?.grabbedBy === w) w.target.grabbedBy = null;
      w.target = null;
      if (w.state !== 'FLEE') w.state = 'LEAVE';
    }
    const survived = this.sheep.length;
    const perfect = survived === this.waveStartSheep;
    const reward = survived * POINTS.survivor + (perfect ? POINTS.perfect : 0);
    this.wool += reward;
    this.juice.waveComplete(this.center);
    this.shepherd.play('clap', 2);
    this.panelTimer = 1.8;
    this.pendingPanel = { wave: this.wave, survived, total: this.waveStartSheep, reward, perfect };
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
    this.juice.clearFloats();
    if (this.sheep.length < 8) this.spawnSheep(12 - this.sheep.length, false);
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

  spawnSheep(count, announce) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.5 + Math.random() * (2 + Math.sqrt(this.sheep.length + count));
      const s = new Sheep(this.world.scene).setPosition(Math.cos(a) * r, 0, Math.sin(a) * r);
      s.heading = Math.random() * Math.PI * 2;
      s.root.rotation.y = s.heading;
      if (announce) {
        s.appear();
        this.juice.newSheep(s);
      }
      this.sheep.push(s);
    }
  }

  spawnWolf() {
    // Spread arrivals around the meadow rather than bunching on one side.
    const base = this.wolvesSpawned * 2.4 + Math.random() * 1.2;
    const w = new Wolf(this.world.scene).setPosition(Math.cos(base) * WORLD.spawnRadius, 0, Math.sin(base) * WORLD.spawnRadius);
    toWander(w, this.ctx);
    this.wolves.push(w);
    this.sfx.howl();
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

  onWolfScared(wolf, threatening) {
    if (this.dog.bark()) this.juice.bark(this.dog);
    const points = threatening && this.state === STATE.PLAYING ? POINTS.scare : 0;
    this.addWool(points);
    this.juice.wolfScared(wolf, points);
  }

  onSheepSaved(sheep) {
    this.addWool(POINTS.save);
    this.juice.sheepSaved(sheep, POINTS.save);
  }

  onSheepLost(sheep) {
    const i = this.sheep.indexOf(sheep);
    if (i >= 0) this.sheep.splice(i, 1);
    sheep.destroy();
    this.juice.sheepLost(sheep.position);
    if (this.sheep.length === 0 && this.state === STATE.PLAYING) this.gameOver();
  }

  // --- Loop ----------------------------------------------------------------

  frame() {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;
    if (this.state !== STATE.PAUSED) {
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
          this.spawnWolf();
          this.wolvesSpawned++;
          this.nextWolfAt += this.cfg.spawnInterval;
        }
        if (this.waveTime >= this.cfg.duration) this.completeWave();
        break;
      case STATE.WAVE_COMPLETE:
      case STATE.GAME_OVER:
        if (this.panelTimer > 0) {
          this.panelTimer -= dt;
          if (this.panelTimer <= 0) {
            if (this.state === STATE.WAVE_COMPLETE) this.ui.showWaveComplete(this.pendingPanel);
            else this.ui.showGameOver({ wave: this.wave, best: this.best, wool: this.wool });
          }
        }
        break;
    }

    this.simulate(dt);
    this.updateCamera(dt);
    this.juice.updateFloats(dt);
    this.ui.updateIndicators(this.wolves, this.world.camera);
    if (this.state !== STATE.MENU) {
      this.ui.setHud({
        sheep: this.sheep.length,
        sheepMax: this.waveStartSheep,
        wave: this.wave,
        timeLeft: this.cfg ? Math.max(0, 1 - this.waveTime / this.cfg.duration) : 1,
        wool: this.wool,
      });
    }
  }

  simulate(dt) {
    const { dog, sheep, wolves, time } = this;
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
    const look = nearest ? nearest.position : this.shepherd.position;
    dog.lookYaw = THREE.MathUtils.clamp(angleTo(dog.heading, Math.atan2(look.x - dog.position.x, look.z - dog.position.z)), -1, 1);

    updateFlock(sheep, this.ctx, dt);
    for (const s of sheep) s.animate(dt, time);

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

  // Dust behind running animals, grass flicks from panicking sheep.
  emitTrails(dt) {
    const trail = (e, minSpeed, interval, emit) => {
      e.trail = (e.trail ?? 0) - dt;
      if (e.speed < minSpeed || e.trail > 0) return;
      e.trail = interval;
      emit(tmp.set(e.position.x - e.velocity.x * 0.05, 0.15, e.position.z - e.velocity.z * 0.05));
    };
    trail(this.dog, 6, 0.05, (p) => this.particles.dust(p, 1, 0.8));
    for (const w of this.wolves) trail(w, 5, 0.08, (p) => this.particles.dust(p, 1, 0.9));
    for (const s of this.sheep) trail(s, 3, 0.25, (p) => this.particles.grass(p, 2));
  }

  updateCamera(dt) {
    // Follow the flock, leaning a little toward the dog so it rarely leaves the frame.
    const focus = this.cameraFocus.copy(this.center).lerp(this.dog.position, 0.25);
    focus.z -= 1.5; // nudge the view down a little so the HUD doesn't cover the flock
    const distance = 35 + Math.min(this.sheep.length, SHEEP.cap) * 0.12;
    this.world.updateCamera(focus, distance, dt, this.juice.shakeOffset);
  }
}

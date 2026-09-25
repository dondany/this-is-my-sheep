import * as THREE from 'three';
import { COLORS } from './config.js';

const RING = new THREE.RingGeometry(0.88, 1, 48).rotateX(-Math.PI / 2);
const tmp = new THREE.Vector3();

// Central place for feedback: every game event maps to particles, sound, shake, rings and text.
export class Juice {
  constructor({ scene, camera, particles, sfx }) {
    this.scene = scene;
    this.camera = camera;
    this.particles = particles;
    this.sfx = sfx;
    this.rings = [];
    this.ringPool = [];
    this.floats = [];
    this.floatLayer = document.getElementById('float-layer');
    this.flashEl = document.getElementById('flash');
    this.shakeTime = 0;
    this.shakeDuration = 1;
    this.shakeAmp = 0;
    this.shakeOffset = new THREE.Vector3();
  }

  // --- Primitives ----------------------------------------------------------

  shake(amount, ms) {
    // Plan-style amounts (0.03 – 0.12) scaled into world units.
    const amp = amount * 8;
    if (amp < this.shakeAmp * (this.shakeTime / this.shakeDuration)) return;
    this.shakeAmp = amp;
    this.shakeDuration = this.shakeTime = ms / 1000;
  }

  ring(position, { from = 0.2, to = 1, duration = 0.45, color = COLORS.ui, opacity = 0.8 } = {}) {
    let m = this.ringPool.pop();
    if (!m) {
      m = new THREE.Mesh(RING, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      m.renderOrder = 1;
    }
    m.material.color.setHex(color);
    m.position.set(position.x, 0.06, position.z);
    m.userData = { t: 0, from, to, duration, opacity };
    this.scene.add(m);
    this.rings.push(m);
  }

  floatText(text, { position, follow, offsetY = 2.5, cls = '', duration = 1.1, size }) {
    const el = document.createElement('div');
    el.className = `float-text ${cls}`;
    el.textContent = text;
    if (size) el.style.fontSize = `${size}px`;
    this.floatLayer.appendChild(el);
    this.floats.push({ el, pos: position?.clone(), follow, offsetY, age: 0, duration });
  }

  flash(color) {
    const el = this.flashEl;
    el.style.background = color;
    el.classList.remove('on');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('on');
  }

  // --- Game events ---------------------------------------------------------

  clickMarker(p) {
    this.ring(p, { from: 0.2, to: 1.1, duration: 0.4, color: COLORS.accent, opacity: 0.9 });
    this.ring(p, { from: 0.1, to: 0.5, duration: 0.3, color: COLORS.ui, opacity: 0.9 });
    this.sfx.click();
  }

  dogArrival(p) {
    this.particles.dust(p, 8, 0.9);
    this.particles.sparkle(tmp.set(p.x, 0.8, p.z), 6);
  }

  bark(dog) {
    this.ring(dog.position, { from: 0.5, to: dog.stats.threatRadius, duration: 0.45, color: COLORS.ui, opacity: 0.9 });
    this.floatText('WOOF!', { follow: dog, offsetY: 2.4, cls: 'woof', duration: 0.7 });
    this.sfx.bark();
  }

  wolfScared(wolf, points, praise = 'GOOD DOG!') {
    this.floatText('!', { follow: wolf, offsetY: 2.6, cls: 'exclaim', duration: 0.7 });
    if (points) this.floatText(`${praise} +${points}`, { position: wolf.position, offsetY: 1.5, cls: 'good', duration: 1.2 });
    this.particles.dust(wolf.position, 10, 1.2);
    this.shake(0.05, 100);
    this.sfx.yelp();
  }

  wolfCharge(wolf) {
    this.sfx.growl();
  }

  sheepPanic(sheep) {
    this.particles.dust(sheep.position, 4, 0.8);
    this.sfx.bleat(true, sheep.kind === 'lamb' ? 1.5 : 1);
  }

  stampedeWarning(sheep) {
    this.floatText('!', { follow: sheep, offsetY: 2.4, cls: 'warn', duration: 1.2 });
    this.particles.dust(sheep.position, 5, 0.7);
    this.sfx.snort();
  }

  stampede(sheep) {
    this.particles.dust(sheep.position, 10, 1.2);
    this.shake(0.03, 120);
    this.sfx.bleat(true, 0.8);
  }

  stampedeStopped(sheep, points) {
    this.floatText(`HEADED OFF! +${points}`, { position: sheep.position, offsetY: 2.2, cls: 'good', duration: 1.3 });
    this.particles.sparkle(tmp.copy(sheep.position).setY(1), 8);
  }

  alphaCall(wolf) {
    this.floatText('AWOOO!', { follow: wolf, offsetY: 3.2, cls: 'danger', duration: 1.4 });
    this.sfx.howl(0.85, true);
  }

  packScattered(wolf, count) {
    this.floatText(`PACK SCATTERED! ×${count + 1}`, { position: wolf.position, offsetY: 3.6, cls: 'big', duration: 1.6 });
    this.shake(0.08, 160);
  }

  bigBark(dog, radius, scared) {
    this.ring(dog.position, { from: 1, to: radius, duration: 0.5, color: COLORS.ui, opacity: 1 });
    this.ring(dog.position, { from: 0.5, to: radius * 0.7, duration: 0.4, color: COLORS.accent, opacity: 0.8 });
    this.floatText('WOOOF!!', { follow: dog, offsetY: 2, cls: 'big', duration: 1, size: 48 });
    if (scared > 1) this.floatText(`×${scared} SCATTERED!`, { follow: dog, offsetY: 5.6, cls: 'good', duration: 1.3 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.particles.dust(tmp.set(dog.position.x + Math.cos(a) * 1.5, 0.2, dog.position.z + Math.sin(a) * 1.5), 2, 1.3);
    }
    this.flash('rgba(255, 240, 208, 0.3)');
    this.shake(0.15, 250);
    this.sfx.bigBark();
  }

  // Shearing Day: a tuft of wool flies off every surviving sheep.
  shearing(flock, shepherd, reward) {
    for (const s of flock) this.particles.puff(tmp.copy(s.position).setY(1.2), 3);
    this.floatText(`🧶 +${reward}`, { follow: shepherd, offsetY: 4.5, cls: 'big', duration: 2.2 });
  }

  tuftDropped(tuft) {
    this.floatText(`🧶 ${tuft.value}`, { follow: tuft, offsetY: 1.6, cls: 'good', duration: 1.2 });
    this.particles.sparkle(tmp.copy(tuft.position).setY(0.6), 8, [0xffe08a, 0xffffff]);
  }

  tuftCollected(tuft) {
    this.floatText(`+${tuft.value} 🧶`, { position: tuft.position, offsetY: 1.8, cls: 'big', duration: 1.1, size: 30 });
    this.particles.sparkle(tmp.copy(tuft.position).setY(0.8), 14, [0xffe08a, 0xfff3b0, 0xffffff]);
    this.sfx.coin();
  }

  tuftLost(tuft) {
    this.particles.puff(tmp.copy(tuft.position).setY(0.6), 6);
  }

  combo(dog, count, bonus) {
    this.floatText(`COMBO ×${count}! +${bonus}`, { follow: dog, offsetY: 3.9, cls: 'combo', duration: 1.2, size: Math.min(22 + count * 4, 44) });
    this.particles.sparkle(tmp.copy(dog.position).setY(1.5), 4 + count * 2, [0xfff3b0, COLORS.accent, 0xffffff]);
    this.sfx.combo(count);
  }

  closeCall(sheep) {
    this.floatText('CLOSE ONE!', { follow: sheep, offsetY: 3.4, cls: 'big', duration: 1.4 });
    this.flash('rgba(255, 240, 208, 0.35)');
  }

  shepherdMoves(shepherd) {
    this.floatText('This way, girls!', { follow: shepherd, offsetY: 3.8, cls: 'good', duration: 1.8 });
  }

  crook(shepherd) {
    this.floatText('BONK!', { follow: shepherd, offsetY: 3.6, cls: 'bonk', duration: 0.9 });
    this.ring(shepherd.position, { from: 0.5, to: shepherd.stats.threatRadius, duration: 0.35, color: COLORS.wood, opacity: 0.8 });
    this.sfx.bonk();
  }

  whistle(shepherd) {
    this.ring(shepherd.position, { from: 1, to: 14, duration: 0.8, color: COLORS.accent, opacity: 0.6 });
    this.floatText('♪ FWEET!', { follow: shepherd, offsetY: 3.6, cls: 'good', duration: 1.2 });
    this.sfx.whistle();
  }

  scarecrowPlaced(sc) {
    this.particles.dust(sc.position, 12, 1.2);
    this.ring(sc.position, { from: 0.5, to: 4.5, duration: 0.5, color: COLORS.accent, opacity: 0.7 });
    this.sfx.pop();
  }

  scarecrowScare(sc) {
    this.floatText('BOO!', { follow: sc, offsetY: 3.4, cls: 'warn', duration: 0.9 });
    this.ring(sc.position, { from: 0.5, to: 4.5, duration: 0.4, color: COLORS.ui, opacity: 0.8 });
  }

  sheepWoke(sheep) {
    this.floatText('!', { follow: sheep, offsetY: 2.2, cls: 'warn', duration: 0.9 });
    this.particles.dust(sheep.position, 8, 1);
    this.sfx.bleat(true);
  }

  snore(sheep) {
    this.floatText('z', { follow: sheep, offsetY: 1.6, cls: 'zzz', duration: 1.6 });
  }

  bell(sheep) {
    this.ring(sheep.position, { from: 1, to: 10, duration: 0.9, color: 0xe0b040, opacity: 0.5 });
    this.sfx.ding();
  }

  bellwetherLost(position) {
    this.floatText('The flock loses heart…', { position, offsetY: 3.5, cls: 'danger', duration: 2 });
  }

  goatButt(goat, wolf) {
    const p = tmp.copy(wolf.position).setY(1.2);
    this.floatText('BONK!', { position: wolf.position, offsetY: 2.4, cls: 'bonk', duration: 1 });
    this.floatText('💫', { follow: wolf, offsetY: 2.2, duration: 1.3 });
    this.particles.sparkle(p, 10, [0xffe08a, 0xffffff]);
    this.particles.dust(wolf.position, 8, 1);
    this.shake(0.05, 120);
    this.sfx.bonk();
  }

  howlStart(wolf) {
    this.floatText('AWOOOO…', { follow: wolf, offsetY: 3, cls: 'danger', duration: 1.4 });
    this.sfx.howl(1.1, true);
  }

  howl(wolf) {
    this.ring(wolf.position, { from: 2, to: 36, duration: 1.1, color: 0x9d8fc4, opacity: 0.45 });
    this.sfx.bleat(true);
  }

  feint(wolf) {
    this.floatText('HEH!', { follow: wolf, offsetY: 2.4, cls: 'warn', duration: 1 });
  }

  pupsSplit(wolf) {
    this.floatText('YIP!', { follow: wolf, offsetY: 1.8, cls: 'warn', duration: 0.8 });
  }

  pupCombo(wolf, points) {
    this.floatText(`PUP PACK! +${points}`, { position: wolf.position, offsetY: 3, cls: 'big', duration: 1.5 });
    this.particles.sparkle(tmp.copy(wolf.position).setY(1), 12);
  }

  disguiseRevealed(wolf, mode) {
    const p = tmp.copy(wolf.position).setY(1);
    this.particles.puff(p, 20);
    if (mode === 'exposed') this.floatText('EXPOSED!', { follow: wolf, offsetY: 3, cls: 'good', duration: 1.3 });
    else if (mode === 'attack') {
      this.floatText("IT'S A WOLF!", { follow: wolf, offsetY: 3, cls: 'danger', duration: 1.6 });
      this.flash('rgba(201, 87, 69, 0.22)');
      this.shake(0.06, 150);
      this.sfx.growl();
    }
  }

  lambOrphaned(lamb) {
    this.floatText('MAMA?!', { follow: lamb, offsetY: 1.8, cls: 'danger', duration: 1.4 });
    this.sfx.bleat(true, 1.6);
  }

  lambReunited(lamb) {
    this.floatText('♥', { follow: lamb, offsetY: 1.8, cls: 'love', duration: 1.2 });
    this.particles.sparkle(tmp.copy(lamb.position).setY(0.8), 8, [0xe8a0b4, 0xfff0d0, 0xffffff]);
    this.sfx.bleat(false, 1.5);
  }

  sheepStray(sheep) {
    this.floatText('?', { follow: sheep, offsetY: 2.2, cls: 'stray', duration: 1.2 });
    this.sfx.bleat(false);
  }

  wolfResist(wolf) {
    this.floatText('GRRR!', { follow: wolf, offsetY: 3.4, cls: 'danger', duration: 0.9 });
    this.sfx.growl();
  }

  sheepGrabbed(sheep) {
    this.floatText('HELP!', { follow: sheep, offsetY: 2.4, cls: 'danger', duration: 1.1 });
    this.ring(sheep.position, { from: 0.3, to: 2, duration: 0.5, color: COLORS.danger, opacity: 0.8 });
    this.particles.hit(tmp.copy(sheep.position).setY(0.8));
    this.sfx.bleat(true);
    this.sfx.growl();
  }

  sheepSaved(sheep, points) {
    this.floatText(`SAVED! +${points}`, { position: sheep.position, offsetY: 2.2, cls: 'good', duration: 1.3 });
    this.particles.sparkle(tmp.copy(sheep.position).setY(1), 12);
    this.sfx.saved();
  }

  sheepLost(position) {
    const p = tmp.copy(position).setY(0.8);
    this.particles.puff(p);
    this.particles.hit(p);
    this.floatText('-1 🐑', { position, offsetY: 2, cls: 'danger', duration: 1.2 });
    this.flash('rgba(201, 87, 69, 0.28)');
    this.shake(0.03, 100);
    this.sfx.lost();
  }

  newSheep(sheep) {
    this.particles.sparkle(tmp.copy(sheep.position).setY(0.8), 6);
    this.sfx.pop();
  }

  waveComplete(center) {
    this.particles.confetti(tmp.copy(center).setY(1));
    this.floatText('FLOCK SAFE!', { position: center, offsetY: 5, cls: 'big', duration: 2 });
    this.flash('rgba(255, 240, 208, 0.45)');
    this.shake(0.12, 200);
    this.sfx.waveComplete();
  }

  // --- Per frame -----------------------------------------------------------

  update(dt) {
    // Rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const m = this.rings[i];
      const u = m.userData;
      u.t += dt;
      const t = Math.min(u.t / u.duration, 1);
      const eased = 1 - (1 - t) ** 3;
      m.scale.setScalar(u.from + (u.to - u.from) * eased);
      m.material.opacity = u.opacity * (1 - t);
      if (t >= 1) {
        this.scene.remove(m);
        this.rings.splice(i, 1);
        this.ringPool.push(m);
      }
    }

    // Shake
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const k = Math.max(0, this.shakeTime / this.shakeDuration) * this.shakeAmp;
      this.shakeOffset.set((Math.random() - 0.5) * k, (Math.random() - 0.5) * k * 0.5, (Math.random() - 0.5) * k);
    } else {
      this.shakeAmp = 0;
      this.shakeOffset.set(0, 0, 0);
    }
  }

  // Called after the camera moves so text sticks to the world.
  updateFloats(dt) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.age += dt;
      const t = f.age / f.duration;
      if (t >= 1) {
        f.el.remove();
        this.floats.splice(i, 1);
        continue;
      }
      tmp.copy(f.follow ? f.follow.position : f.pos);
      tmp.y += f.offsetY + f.age * 1.2;
      tmp.project(this.camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.6 : 1.2 - Math.min(0.2, (t - 0.15) * 1.5);
      f.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${pop})`;
      f.el.style.opacity = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    }
  }

  clearFloats() {
    for (const f of this.floats) f.el.remove();
    this.floats.length = 0;
  }
}

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

  floatText(text, { position, follow, offsetY = 2.5, cls = '', duration = 1.1 }) {
    const el = document.createElement('div');
    el.className = `float-text ${cls}`;
    el.textContent = text;
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

  wolfScared(wolf, points) {
    this.floatText('!', { follow: wolf, offsetY: 2.6, cls: 'exclaim', duration: 0.7 });
    if (points) this.floatText(`GOOD DOG! +${points}`, { position: wolf.position, offsetY: 1.5, cls: 'good', duration: 1.2 });
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

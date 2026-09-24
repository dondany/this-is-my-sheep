import * as THREE from 'three';
import { isThreatening } from './wolves.js';

const $ = (id) => document.getElementById(id);
const tmp = new THREE.Vector3();

// Plain HTML/CSS layered over the canvas.
export class UI {
  constructor() {
    this.handlers = {};
    this.cache = {};
    this.indicators = [];
    this.meters = [];
    this.el = {
      hud: $('hud'),
      sheep: $('hud-sheep'),
      sheepBar: $('hud-sheep-bar'),
      wave: $('hud-wave'),
      timerBar: $('hud-timer-bar'),
      wool: $('hud-wool'),
      mute: $('btn-mute'),
      banner: $('banner'),
      indicatorLayer: $('indicator-layer'),
    };
    document.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handlers[btn.dataset.action]?.();
      });
    });
  }

  on(action, fn) {
    this.handlers[action] = fn;
  }

  show(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('hidden', s.id !== `screen-${name}`));
  }

  setHudVisible(visible) {
    this.el.hud.classList.toggle('hidden', !visible);
  }

  set(key, value, apply) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    apply(value);
  }

  setHud({ sheep, sheepMax, wave, timeLeft, wool }) {
    this.set('sheep', `${sheep} / ${sheepMax}`, (v) => (this.el.sheep.textContent = v));
    this.set('sheepBar', sheepMax ? sheep / sheepMax : 1, (v) => {
      this.el.sheepBar.style.transform = `scaleX(${v})`;
      this.el.sheepBar.classList.toggle('low', v < 0.5);
    });
    this.set('wave', String(wave).padStart(2, '0'), (v) => (this.el.wave.textContent = v));
    this.set('timer', Math.round(timeLeft * 200) / 200, (v) => (this.el.timerBar.style.transform = `scaleX(${v})`));
    this.set('wool', wool, (v) => (this.el.wool.textContent = v));
  }

  setMuted(muted) {
    this.el.mute.textContent = muted ? '🔇' : '🔊';
    this.el.mute.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  }

  banner(title, sub = '') {
    const el = this.el.banner;
    el.querySelector('.banner-title').textContent = title;
    el.querySelector('.banner-sub').textContent = sub;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  showWaveComplete({ wave, survived, total, reward, perfect }) {
    $('wave-title').textContent = `Wave ${wave} complete!`;
    $('wave-sheep').textContent = `🐑 ${survived} / ${total}`;
    $('wave-reward').textContent = `+${reward} wool${perfect ? ' · perfect flock!' : ''}`;
    this.show('wave');
  }

  showGameOver({ wave, best, wool }) {
    $('over-waves').textContent = wave - 1 === 1 ? 'You survived 1 wave' : `You survived ${wave - 1} waves`;
    $('over-stats').textContent = `🧶 ${wool} wool · best: wave ${best}`;
    this.show('over');
  }

  setBest(best) {
    $('menu-best').textContent = best ? `Best: wave ${best}` : '';
  }

  // Arrows at the screen edge pointing at off-screen wolves.
  updateIndicators(wolves, camera) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let used = 0;
    for (const wolf of wolves) {
      if (wolf.state === 'LEAVE' || wolf.gone) continue;
      tmp.copy(wolf.position).setY(1).project(camera);
      let { x, y } = tmp;
      if (tmp.z > 1) {
        x = -x;
        y = -y;
      }
      if (tmp.z <= 1 && Math.abs(x) < 0.95 && Math.abs(y) < 0.95) continue;

      let el = this.indicators[used];
      if (!el) {
        el = document.createElement('div');
        el.className = 'indicator';
        el.innerHTML = '<span class="arrow"></span><span class="face">🐺</span>';
        this.el.indicatorLayer.appendChild(el);
        this.indicators.push(el);
      }
      used++;
      const mx = 1 - 44 / (w / 2);
      const my = 1 - 44 / (h / 2);
      const k = 1 / Math.max(Math.abs(x) / mx, Math.abs(y) / my, 1e-6);
      const sx = (x * k * 0.5 + 0.5) * w;
      const sy = (-y * k * 0.5 + 0.5) * h;
      const angle = Math.atan2(-y, x);
      el.style.display = '';
      el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
      el.firstChild.style.transform = `rotate(${angle}rad)`;
      el.classList.toggle('danger', isThreatening(wolf));
      el.classList.toggle('runner', wolf.kind === 'runner');
      el.classList.toggle('brute', wolf.kind === 'brute');
    }
    for (let i = used; i < this.indicators.length; i++) this.indicators[i].style.display = 'none';
  }

  // Fear meter over wolves that need the dog to stand its ground (brutes).
  updateFearMeters(wolves, camera) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let used = 0;
    for (const wolf of wolves) {
      if (!wolf.type.courage || wolf.fear <= 0) continue;
      tmp.copy(wolf.position);
      tmp.y += 3.3;
      tmp.project(camera);
      if (tmp.z > 1) continue;
      let el = this.meters[used];
      if (!el) {
        el = document.createElement('div');
        el.className = 'fear-meter';
        el.innerHTML = '<div class="fear-fill"></div>';
        this.el.indicatorLayer.appendChild(el);
        this.meters.push(el);
      }
      used++;
      el.style.display = '';
      el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px) translate(-50%, -50%)`;
      el.firstChild.style.transform = `scaleX(${Math.min(1, wolf.fear / wolf.type.courage)})`;
    }
    for (let i = used; i < this.meters.length; i++) this.meters[i].style.display = 'none';
  }
}

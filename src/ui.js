import * as THREE from 'three';
import { isThreatening } from './wolves.js';
import { ENTRIES, ENTRY } from './bestiary.js';

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
      score: $('hud-score'),
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

  setHud({ sheep, sheepMax, wave, timeLeft, wool, score }) {
    this.set('score', score, (v) => (this.el.score.textContent = v));
    this.set('sheep', `${sheep} / ${sheepMax}`, (v) => (this.el.sheep.textContent = v));
    this.set('sheepBar', sheepMax ? sheep / sheepMax : 1, (v) => {
      this.el.sheepBar.style.transform = `scaleX(${v})`;
      this.el.sheepBar.classList.toggle('low', v < 0.5);
    });
    this.set('wave', String(wave).padStart(2, '0'), (v) => (this.el.wave.textContent = v));
    this.set('timer', Math.round(timeLeft * 200) / 200, (v) => (this.el.timerBar.style.transform = `scaleX(${v})`));
    this.set('wool', wool, (v) => (this.el.wool.textContent = v));
  }

  setCombo(count, left) {
    this.set('combo', count >= 2 ? count : 0, (n) => {
      $('hud-combo').classList.toggle('hidden', !n);
      if (!n) return;
      $('hud-combo-n').textContent = `×${n}`;
      const el = $('hud-combo');
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    });
    if (count >= 2) $('hud-combo-bar').style.transform = `scaleX(${left})`;
  }

  // ready: 0 → just used, 1 → available
  setBigBark(ready) {
    this.set('bigbark', Math.round(ready * 100) / 100, (v) => {
      const btn = $('btn-bigbark');
      btn.style.setProperty('--p', v);
      btn.classList.toggle('ready', v >= 1);
    });
  }

  denyBigBark() {
    const btn = $('btn-bigbark');
    btn.classList.remove('deny');
    void btn.offsetWidth;
    btn.classList.add('deny');
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

  showWaveComplete({ wave, survived, total, lines, bounty, reward, score }) {
    $('wave-title').textContent = `Wave ${wave} complete!`;
    $('wave-sheep').textContent = `🐑 ${survived} / ${total}`;
    $('wave-score').textContent = `★ +${score}`;
    const rows = lines
      .filter(([, amount]) => amount > 0)
      .map(([label, amount]) => {
        const li = document.createElement('li');
        li.innerHTML = '<span></span><span></span>';
        li.firstChild.textContent = label;
        li.lastChild.textContent = `+${amount}`;
        return li;
      });
    const sum = document.createElement('li');
    sum.className = 'total';
    sum.innerHTML = `<span>Wool from shearing</span><span>🧶 +${reward}</span>`;
    const extra = [];
    if (bounty) {
      const li = document.createElement('li');
      li.className = 'bounty';
      li.innerHTML = `<span>Bounty tufts collected during the wave</span><span>🧶 +${bounty}</span>`;
      extra.push(li);
    }
    $('wave-breakdown').replaceChildren(...rows, sum, ...extra);
    this.show('wave');
  }

  // Shop cards on the end-of-wave screen: upgrades and one livestock card.
  renderShop({ cards, rerollCost, wool }) {
    $('shop-wool').textContent = wool;
    const reroll = $('shop-reroll');
    reroll.textContent = `🎲 Reroll (${rerollCost})`;
    reroll.disabled = wool < rerollCost;
    const group = { dog: 'Dog', shepherd: 'Shepherd', flock: 'Flock' };
    $('shop-cards').replaceChildren(
      ...cards.map((c) => {
        const card = document.createElement('button');
        const style = c.livestock ? 'livestock' : `group-${c.group}${c.rare ? ' rare' : ''}`;
        card.className = `upgrade-card ${style}${c.bought ? ' bought' : ''}`;
        card.disabled = c.bought || wool < c.price;
        card.innerHTML = `
          <span class="upgrade-group"></span>
          <span class="upgrade-icon"></span>
          <strong class="upgrade-name"></strong>
          <span class="upgrade-pips"></span>
          <span class="upgrade-text"></span>
          <span class="upgrade-price"></span>`;
        const q = (sel) => card.querySelector(sel);
        q('.upgrade-name').textContent = c.name;
        q('.upgrade-text').textContent = c.text;
        if (c.livestock) {
          q('.upgrade-group').textContent = 'Livestock';
          q('.upgrade-icon').innerHTML = `<img alt="" src="${c.image}">`;
          q('.upgrade-pips').textContent = c.pays;
          q('.upgrade-price').textContent = c.bought ? '✓ Joins next wave' : `🧶 ${c.price}`;
        } else {
          q('.upgrade-group').textContent = c.rare ? `${group[c.group]} · rare` : group[c.group];
          q('.upgrade-icon').textContent = c.icon;
          q('.upgrade-pips').textContent = '●'.repeat(c.level) + '○'.repeat(c.max - c.level);
          q('.upgrade-price').textContent = c.bought ? '✓ Bought' : `🧶 ${c.price}`;
        }
        card.addEventListener('click', () => this.onBuy?.(c.key));
        return card;
      })
    );
    if (!cards.length) $('shop-cards').textContent = 'Everything is maxed out. Good dog!';
  }

  showGameOver({ wave, best, score, bestScore, newBest }) {
    $('over-score').textContent = `★ ${score}${newBest ? ' · new best!' : ''}`;
    $('over-waves').textContent = wave - 1 === 1 ? 'You survived 1 wave' : `You survived ${wave - 1} waves`;
    $('over-stats').textContent = `Best: ★ ${bestScore} · wave ${best}`;
    this.show('over');
  }

  // --- Bestiary ------------------------------------------------------------

  openBestiary(bestiary, focusId) {
    this.bestiary = bestiary;
    const found = ENTRIES.filter((e) => bestiary.has(e.id)).length;
    $('bestiary-count').textContent = `${found} / ${ENTRIES.length} discovered`;
    for (const side of ['flock', 'wolves']) {
      const grid = $(`bestiary-${side}`);
      grid.replaceChildren(
        ...ENTRIES.filter((e) => e.side === side).map((e) => {
          const known = bestiary.has(e.id);
          const card = document.createElement('button');
          card.className = `beast-card${known ? '' : ' locked'}`;
          card.dataset.id = e.id;
          card.innerHTML = `<img alt="" src="${bestiary.portrait(e.id)}"><span>${known ? e.name : '???'}</span>`;
          card.addEventListener('click', () => this.showBeast(e.id));
          return card;
        })
      );
    }
    this.showBeast(focusId ?? ENTRIES.find((e) => bestiary.has(e.id))?.id ?? ENTRIES[0].id);
    this.show('bestiary');
  }

  showBeast(id) {
    const e = ENTRY[id];
    const known = this.bestiary.has(id);
    document.querySelectorAll('.beast-card').forEach((c) => c.classList.toggle('selected', c.dataset.id === id));
    const detail = $('bestiary-detail');
    detail.classList.toggle('locked', !known);
    detail.innerHTML = `
      <img alt="" src="${this.bestiary.portrait(id)}">
      <h3></h3>
      <p class="beast-side"></p>
      <p class="beast-text"></p>
      <p class="beast-tip"></p>`;
    detail.querySelector('h3').textContent = known ? e.name : '???';
    detail.querySelector('.beast-side').textContent = e.side === 'flock' ? 'The flock' : 'The wolves';
    detail.querySelector('.beast-text').textContent = known ? e.text : `Not met yet. Keep playing: it turns up from wave ${e.wave}.`;
    detail.querySelector('.beast-tip').textContent = known ? e.tip : '';
  }

  // Small card sliding in from the corner when something new is unlocked.
  toast(bestiary, id, onClick) {
    const e = ENTRY[id];
    const el = document.createElement('button');
    el.className = 'toast';
    el.innerHTML = `<img alt="" src="${bestiary.portrait(id)}"><span><small>New in the bestiary</small><strong></strong></span>`;
    el.querySelector('strong').textContent = e.name;
    el.addEventListener('click', () => {
      el.remove();
      onClick?.(id);
    });
    const layer = $('toast-layer');
    while (layer.children.length >= 3) layer.firstChild.remove();
    layer.appendChild(el);
    setTimeout(() => el.classList.add('out'), 4000);
    setTimeout(() => el.remove(), 4500);
  }

  // A persistent instruction at the bottom of the screen (e.g. placing a scarecrow).
  hint(text) {
    const el = $('hint');
    el.classList.toggle('hidden', !text);
    if (text) el.textContent = text;
  }

  setBest(best, bestScore) {
    $('menu-best').textContent = best || bestScore ? `Best: ★ ${bestScore} · wave ${best}` : '';
  }

  // Arrows at the screen edge pointing at off-screen wolves.
  updateIndicators(wolves, camera) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let used = 0;
    for (const wolf of wolves) {
      if (wolf.state === 'LEAVE' || wolf.gone || !wolf.revealed) continue;
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
      el.classList.toggle('alpha', wolf.kind === 'alpha');
      el.classList.toggle('howler', wolf.kind === 'howler');
    }
    for (let i = used; i < this.indicators.length; i++) this.indicators[i].style.display = 'none';
  }

  // Fear meter over wolves that need the dog to stand its ground (brutes).
  updateFearMeters(wolves, camera, courageScale = 1) {
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
      el.firstChild.style.transform = `scaleX(${Math.min(1, wolf.fear / (wolf.type.courage * courageScale))})`;
    }
    for (let i = used; i < this.meters.length; i++) this.meters[i].style.display = 'none';
  }
}

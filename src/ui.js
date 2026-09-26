import * as THREE from 'three';
import { isThreatening } from './wolves.js';
import { ENTRIES, ENTRY } from './bestiary.js';
import { ACHIEVEMENTS } from './achievements.js';
import { SUMMERS } from './config.js';

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
    this.set('wave', wave, (v) => (this.el.wave.textContent = v));
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

  // Boss bar under the HUD: how many more times it has to be driven off.
  setBoss(boss) {
    const el = $('hud-boss');
    el.classList.toggle('hidden', !boss);
    if (!boss) return;
    const pips = '●'.repeat(boss.done) + '○'.repeat(boss.left);
    this.set('boss', `${boss.name} ${pips}`, (v) => ($('hud-boss-text').textContent = v));
  }

  setEffects(level) {
    const label = { full: 'Full', reduced: 'Reduced', off: 'Off' }[level];
    document.querySelectorAll('.effects-btn').forEach((b) => (b.textContent = `✨ Screen effects: ${label}`));
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

  // Stat tiles plus what took the sheep and what was bought.
  renderSummary(id, s) {
    const tiles = [
      ['🐺', s.scared, 'wolves scared'],
      ['🛟', s.saved, s.closeCalls ? `saved (${s.closeCalls} close ${s.closeCalls === 1 ? 'call' : 'calls'})` : 'sheep saved'],
      ['💀', s.lost, 'sheep lost'],
      ['🔥', `×${s.bestCombo}`, 'best combo'],
      ['📢', s.bigBarks, 'Big Barks'],
      ['🧶', s.woolEarned, `wool earned · ${s.woolSpent} spent`],
    ];
    const lines = [];
    const lostTo = Object.entries(s.lostTo).sort((a, b) => b[1] - a[1]);
    if (lostTo.length) lines.push(['Lost to', lostTo.map(([name, n]) => `${name} ×${n}`).join(' · ')]);
    if (s.upgrades.length) lines.push(['Upgrades', s.upgrades.map((u) => `${u.icon} ${u.name}${u.level > 1 ? ' ' + u.level : ''}`).join(' · ')]);
    if (s.animals.length) lines.push(['Bought', s.animals.join(' · ')]);
    if (s.tufts) lines.push(['Bounty tufts', String(s.tufts)]);
    const el = $(id);
    el.innerHTML = '<div class="summary-tiles"></div><dl class="summary-lines"></dl>';
    el.firstChild.append(
      ...tiles.map(([icon, value, label]) => {
        const t = document.createElement('div');
        t.className = 'summary-tile';
        t.innerHTML = '<span class="summary-icon"></span><strong></strong><small></small>';
        t.children[0].textContent = icon;
        t.children[1].textContent = value;
        t.children[2].textContent = label;
        return t;
      })
    );
    el.lastChild.append(
      ...lines.flatMap(([k, v]) => {
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = k;
        dd.textContent = v;
        return [dt, dd];
      })
    );
  }

  // Difficulty picker on the menu: only shown once a summer has been won.
  setSummer(summer, unlocked, won) {
    $('summer-picker').classList.toggle('hidden', unlocked < 2);
    $('summer-name').textContent = `Summer ${summer}${summer <= won ? ' ✓' : ''}`;
    const rules = SUMMERS.slice(1, summer).map((s) => s.text);
    $('summer-rules').textContent = rules.length ? rules.join(' ') : SUMMERS[0].text;
    document.querySelector('[data-action=summer-down]').disabled = summer <= 1;
    document.querySelector('[data-action=summer-up]').disabled = summer >= unlocked;
  }

  showVictory({ stars, flock, summer, unlocked, score, wool, upgrades, newBest, summary }) {
    this.renderSummary('victory-summary', summary);
    document.querySelector('#screen-victory h2').textContent = summer > 1 ? `Summer ${summer} won!` : "Summer's End!";
    $('victory-unlock').classList.toggle('hidden', !unlocked);
    if (unlocked) $('victory-unlock').textContent = `🔓 Summer ${unlocked.summer} unlocked: ${unlocked.text}`;
    $('victory-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    $('victory-flock').textContent = flock === 1 ? '🐑 1 sheep made it home' : `🐑 ${flock} sheep made it home`;
    $('victory-stats').textContent = `★ ${score}${newBest ? ' (new best!)' : ''} · 🧶 ${wool} wool left · ${upgrades} upgrades`;
    this.show('victory');
  }

  showGameOver({ wave, endless, best, score, bestScore, newBest, summary }) {
    this.renderSummary('over-summary', summary);
    $('over-score').textContent = `★ ${score}${newBest ? ' · new best!' : ''}`;
    $('over-waves').textContent = endless
      ? `Summer won, then ${endless - 1} endless ${endless - 1 === 1 ? 'wave' : 'waves'}`
      : wave - 1 === 1
        ? 'You survived 1 wave'
        : `You survived ${wave - 1} waves`;
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

  openAchievements(achievements) {
    const done = ACHIEVEMENTS.filter((a) => achievements.has(a.id)).length;
    $('achievements-count').textContent = `${done} / ${ACHIEVEMENTS.length} unlocked`;
    const groups = [...new Set(ACHIEVEMENTS.map((a) => a.group))];
    $('achievements-list').replaceChildren(
      ...groups.flatMap((group) => {
        const h = document.createElement('h3');
        h.textContent = group;
        const grid = document.createElement('div');
        grid.className = 'achievement-grid';
        for (const a of ACHIEVEMENTS.filter((a) => a.group === group)) {
          const card = document.createElement('div');
          card.className = `achievement${achievements.has(a.id) ? '' : ' locked'}`;
          card.innerHTML = '<span class="achievement-icon"></span><span><strong></strong><small></small></span>';
          card.querySelector('.achievement-icon').textContent = a.icon;
          card.querySelector('strong').textContent = a.name;
          card.querySelector('small').textContent = a.text;
          grid.appendChild(card);
        }
        return [h, grid];
      })
    );
    this.show('achievements');
  }

  toastAchievement(a, onClick) {
    this.pushToast(`<span class="toast-icon">${a.icon}</span><span><small>Achievement unlocked</small><strong></strong></span>`, a.name, onClick, 'achievement-toast');
  }

  // Small card sliding in from the corner when something new is unlocked.
  toast(bestiary, id, onClick) {
    this.pushToast(`<img alt="" src="${bestiary.portrait(id)}"><span><small>New in the bestiary</small><strong></strong></span>`, ENTRY[id].name, () => onClick?.(id));
  }

  pushToast(html, title, onClick, cls = '') {
    const el = document.createElement('button');
    el.className = `toast ${cls}`;
    el.innerHTML = html;
    el.querySelector('strong').textContent = title;
    el.addEventListener('click', () => {
      el.remove();
      onClick?.();
    });
    const layer = $('toast-layer');
    while (layer.children.length >= 3) layer.firstChild.remove();
    layer.appendChild(el);
    setTimeout(() => el.classList.add('out'), 4000);
    setTimeout(() => el.remove(), 4500);
  }

  // First-time tips: one at a time, each for a few seconds (click to dismiss), queued if several
  // come up together.
  showTip(text) {
    this.tipQueue = this.tipQueue ?? [];
    this.tipQueue.push(text);
    if (!this.tipShowing) this.nextTip();
  }

  nextTip() {
    const el = $('tip');
    clearTimeout(this.tipTimer);
    const text = this.tipQueue.shift();
    this.tipShowing = !!text;
    el.classList.toggle('hidden', !text);
    if (!text) return;
    el.textContent = text;
    el.onclick = () => this.nextTip();
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    this.tipTimer = setTimeout(() => this.nextTip(), 4000 + text.length * 40);
  }

  // A persistent instruction at the bottom of the screen (e.g. placing a scarecrow).
  hint(text) {
    const el = $('hint');
    el.classList.toggle('hidden', !text);
    if (text) el.textContent = text;
  }

  setBest(best, bestScore, wins = 0, bestStars = 0) {
    const won = wins ? ` · summers won: ${wins} (best ${'★'.repeat(bestStars)})` : '';
    $('menu-best').textContent = best || bestScore ? `Best: ★ ${bestScore} · wave ${best}${won}` : '';
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
      el.classList.toggle('boss', !!wolf.type.boss);
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
      tmp.y += 1.2 + wolf.type.scale * 1.8; // above its head, however big it is
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

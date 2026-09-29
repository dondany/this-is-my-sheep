import * as THREE from 'three';
import { isThreatening } from './wolves.js';
import { ENTRIES, ENTRY } from './bestiary.js';
import { ACHIEVEMENTS } from './achievements.js';
import { SUMMERS } from './config.js';
import { ACHIEVEMENT } from './achievements.js';
import { WARDROBE, SLOTS, item, rewardFor } from './cosmetics.js';
import { Dog } from './entities.js';
import { makeCard, CardTip, draggable } from './cards.js';

const $ = (id) => document.getElementById(id);
const tmp = new THREE.Vector3();

// Plain HTML/CSS layered over the canvas.
export class UI {
  constructor() {
    this.handlers = {};
    this.cache = {};
    this.indicators = [];
    this.meters = [];
    this.tip = new CardTip($('card-tip'));
    this.cardInfo = new Map(); // card key → its tooltip
    this.selected = null; // the selected card's key ('shop:crook', 'shop:train:swift', 'collar:piggy')
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
    // Clicking the shop's background puts a selected card back.
    $('screen-wave').addEventListener('click', (e) => {
      if (this.selected && !e.target.closest('.card-slot')) this.select(this.selected);
    });
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
    const shopping = name === 'wave';
    if (shopping && !document.body.classList.contains('shopping')) {
      // Entering the shop: wave tips make way for the tray's own hint line.
      this.tipQueue = [];
      this.nextTip();
      $('tray-hint').textContent = '';
    }
    if (!shopping) {
      this.selected = null;
      this.shopData = null;
      this.tip.hide();
    }
    document.body.classList.toggle('shopping', shopping);
  }

  setHudVisible(visible) {
    this.el.hud.classList.toggle('hidden', !visible);
  }

  set(key, value, apply) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    apply(value);
  }

  // The flock against the line: "12 / 8" (just "12" before the line starts). The bar shows how many
  // of the sheep the shepherd can spare are left, and turns red on the line.
  setHud({ sheep, line = 0, spare = 1, wave, timeLeft, wool }) {
    this.set('sheep', line ? `${sheep} / ${line}` : String(sheep), (v) => (this.el.sheep.textContent = v));
    this.set('sheepBar', line ? Math.max(0, Math.min(1, (sheep - line) / spare)) : 1, (v) => (this.el.sheepBar.style.transform = `scaleX(${v})`));
    this.set('short', line > 0 && sheep <= line, (short) => {
      this.el.sheepBar.classList.toggle('low', short);
      this.el.sheep.classList.toggle('short', short);
    });
    this.set('wave', wave, (v) => (this.el.wave.textContent = v));
    this.set('timer', Math.round(timeLeft * 200) / 200, (v) => (this.el.timerBar.style.transform = `scaleX(${v})`));
    this.set('wool', wool, (v) => (this.el.wool.textContent = v));
  }

  // The red, pulsing edge of the screen while the flock is on the line.
  setLastStand(on) {
    $('last-stand').classList.toggle('on', on);
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

  // Boss bar under the HUD: how many more times it has to be driven off.
  setBoss(boss) {
    const el = $('hud-boss');
    el.classList.toggle('hidden', !boss);
    if (!boss) return;
    const pips = '●'.repeat(boss.done) + '○'.repeat(boss.left);
    this.set('boss', `${boss.name} ${pips}`, (v) => ($('hud-boss-text').textContent = v));
  }

  // Menu: a Continue button when there's a saved run; Play becomes a (quieter) New Game.
  setContinue(label) {
    const cont = $('continue-btn');
    const play = $('play-btn');
    cont.classList.toggle('hidden', !label);
    if (label) cont.textContent = label;
    play.textContent = label ? 'New Game' : 'Play';
    play.classList.toggle('btn-quiet', !!label);
    play.classList.remove('armed');
  }

  armNewGame() {
    const play = $('play-btn');
    play.textContent = 'Start over? Your saved run will be lost';
    play.classList.add('armed');
  }

  setEffects(level) {
    const label = { full: 'Full', reduced: 'Reduced', off: 'Off' }[level];
    document.querySelectorAll('.effects-btn').forEach((b) => (b.textContent = `✨ Screen effects: ${label}`));
    document.body.dataset.effects = level;
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

  // --- End of a wave: the shop screen -------------------------------------------------
  // Collar on top, the wave's result on the left, and the tray in the middle: level-up picks first,
  // then the shop (two charms and an animal). Cards only show an icon and a name; details are in a
  // tooltip on hover, or pinned when a card is selected (a click or a tap), which also shows its
  // buttons. Charms are bought by dragging them onto the collar, animals onto the flock, and sold
  // by dragging them off the collar.

  showWaveComplete({ wave, survived, lines, bounty, reward, line, dog }) {
    $('wave-title').textContent = `Wave ${wave} ✓`;
    $('wave-sheep').textContent = survived;
    $('wave-line').textContent = line ? `Lost ${line.lost} · could spare ${line.spare} ✓` : '';
    const short = (label) => label.replace(/ \(.*\)$/, '').replace('Shearing: ', 'Shorn: ');
    const row = (label, amount, cls = '') => {
      const li = document.createElement('li');
      li.className = cls;
      li.innerHTML = '<span></span><span></span>';
      li.firstChild.textContent = label;
      li.lastChild.textContent = amount;
      return li;
    };
    $('wave-breakdown').replaceChildren(
      ...lines.filter(([, amount]) => amount > 0).map(([label, amount]) => row(short(label), `+${amount}`)),
      ...(bounty ? [row('Bounty tufts', `+${bounty}`)] : []),
      row('Wool', `🧶 +${reward + (bounty ?? 0)}`, 'total')
    );
    this.setDogTraining(dog);
    this.show('wave');
  }

  // The dog's training levels in the sidebar, like Balatro's hand levels.
  setDogTraining(dog) {
    $('side-training').replaceChildren(
      ...(dog?.length
        ? dog.map((t) => {
            const chip = document.createElement('span');
            chip.className = 'train-chip';
            chip.textContent = `${t.icon} ${t.level}`;
            chip.title = `${t.stat} level ${t.level}: ${t.text}`;
            return chip;
          })
        : [Object.assign(document.createElement('small'), { textContent: 'Untrained' })])
    );
  }

  // The charms on the dog's collar, shown small in the top bar during a wave.
  setCharms(charms) {
    const box = $('hud-charms');
    box.classList.toggle('hidden', !charms.length);
    box.replaceChildren(
      ...charms.map((c) => {
        const el = document.createElement('span');
        el.className = 'hud-charm';
        el.textContent = c.icon;
        el.title = `${c.name}: ${c.text}${c.catch ? ` Catch: ${c.catch}` : ''}`;
        return el;
      })
    );
  }

  denyCollar() {
    this.shake($('collar'));
    this.trayHint('The collar is full: drag a charm off it to sell it first.');
  }

  denyFreeze() {
    this.trayHint('Only two cards can be frozen at a time.');
  }

  shake(el) {
    el.classList.remove('deny');
    void el.offsetWidth;
    el.classList.add('deny');
  }

  trayHint(text) {
    const el = $('tray-hint');
    el.textContent = text;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  renderShop(data) {
    this.shopData = data;
    const { cards, collar, slots, rerollCost, wool } = data;
    const keys = new Set([...cards.map((c) => `shop:${c.key}`), ...collar.map((c) => `collar:${c.id}`)]);
    if (this.selected && !keys.has(this.selected)) this.selected = null;
    $('shop-wool').textContent = wool;
    $('reroll-cost').textContent = rerollCost;
    $('shop-reroll').disabled = wool < rerollCost;
    $('collar-count').textContent = `${collar.length} / ${slots}`;
    const groupName = { dog: 'Dog', shepherd: 'Shepherd', flock: 'Flock', trick: 'Trick', xp: 'XP' };
    const rarityName = (r) => r[0].toUpperCase() + r.slice(1);

    // The collar: filled slots are cards you can drag off to sell.
    $('collar-slots').replaceChildren(
      ...Array.from({ length: slots }, (_, i) => {
        const c = collar[i];
        if (!c) {
          const empty = document.createElement('div');
          empty.className = 'card-slot empty';
          empty.innerHTML = '<div class="card card-empty"></div>';
          return empty;
        }
        const info = { title: c.name, meta: `${rarityName(c.rarity)} · ${groupName[c.group]}`, text: c.text, catch: c.catch, foot: `Sells for 🧶 ${c.sell} · drag it off the collar to sell` };
        return this.cardSlot(`collar:${c.id}`, { icon: c.icon, name: c.name, rarity: c.rarity, group: c.group }, info, {
          small: true,
          actions: [[`Sell 🧶${c.sell}`, () => this.onSell?.(c.id)]],
          zones: () => [{ name: 'sell', el: $('sell-zone') }],
          onDrop: () => this.onSell?.(c.id),
          onDragStart: () => {
            $('sell-price').textContent = c.sell;
            $('sell-zone').classList.remove('hidden');
          },
          onDragEnd: () => $('sell-zone').classList.add('hidden'),
        });
      })
    );

    // The shop: two charms, then the animal. Bought cards leave an empty spot.
    const shopCard = (c) => {
      if (c.bought) {
        const gone = document.createElement('div');
        gone.className = 'card-slot empty';
        gone.innerHTML = `<div class="card card-empty">${c.livestock ? 'Joins next wave' : 'On the collar'}</div>`;
        return gone;
      }
      const affordable = wool >= c.price;
      const blocked = !affordable || (!c.livestock && c.full);
      const target = c.livestock ? $('side-flock') : c.training ? $('side-dog') : $('collar'); // where it's dropped to buy
      const info = c.livestock
        ? { title: c.name, meta: `Livestock${c.frozen ? ' · ❄️ frozen' : ''}`, text: c.text, foot: `${c.pays ? c.pays + ' · ' : ''}Drag onto your flock to buy` }
        : c.training
          ? { title: c.name, meta: `Training · ${c.stat} ${c.level} → ${c.level + 1}${c.frozen ? ' · ❄️ frozen' : ''}`, text: c.text, foot: `At level ${c.level + 1}: ${c.total} · Drag onto your dog to train` }
          : { title: c.name, meta: `${rarityName(c.rarity)} · ${groupName[c.group]}${c.frozen ? ' · ❄️ frozen' : ''}`, text: c.text, catch: c.catch, foot: c.full ? 'The collar is full: sell a charm first' : 'Drag onto the collar to buy' };
      return this.cardSlot(
        `shop:${c.key}`,
        { icon: c.icon, image: c.image, name: c.name, rarity: c.livestock ? 'livestock' : c.training ? 'training' : c.rarity, group: c.group, pips: c.training ? `Lv ${c.level} → ${c.level + 1}` : '', frozen: c.frozen },
        info,
        {
          price: c.price,
          short: !affordable,
          actions: [
            [`Buy 🧶${c.price}`, () => this.onBuy?.(c.key), blocked],
            [c.frozen ? 'Unfreeze' : '❄️ Freeze', () => this.onFreeze?.(c.key)],
          ],
          zones: () => [{ name: 'target', el: target }],
          onDrop: () => (blocked ? (c.full && affordable ? this.denyCollar() : this.shake(target)) : this.onBuy?.(c.key)),
        }
      );
    };
    $('shop-charms').replaceChildren(...cards.filter((c) => !c.livestock && !c.training).map(shopCard));
    $('shop-training').replaceChildren(...cards.filter((c) => c.training).map(shopCard));
    $('shop-animal').replaceChildren(...cards.filter((c) => c.livestock).map(shopCard));
    this.pinSelected();
  }

  // A card plus what goes around it: its price tag, and its buttons while it's selected.
  cardSlot(key, spec, info, { price, short, actions = [], zones, onDrop, onDragStart, onDragEnd, big, small }) {
    const slot = document.createElement('div');
    slot.className = `card-slot${big ? ' big' : ''}${small ? ' small' : ''}${this.selected === key ? ' selected' : ''}`;
    const card = makeCard(spec);
    card.dataset.key = key;
    this.cardInfo.set(key, info);
    slot.appendChild(card);
    // Under the card: its price tag, or its buttons while it's selected (in the same spot, so
    // nothing below moves; the collar's small cards show them floating instead).
    const foot = document.createElement('div');
    foot.className = 'card-foot';
    if (price != null && this.selected !== key) {
      const tag = document.createElement('span');
      tag.className = `card-price${short ? ' short' : ''}`;
      tag.textContent = `🧶 ${price}`;
      foot.appendChild(tag);
    }
    if (!small) slot.appendChild(foot);
    if (this.selected === key) {
      const row = document.createElement('div');
      row.className = 'card-actions';
      for (const [label, fn, disabled] of actions) {
        const b = document.createElement('button');
        b.className = 'btn btn-small';
        b.textContent = label;
        b.disabled = !!disabled;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selected = null;
          this.tip.hide();
          fn();
        });
        row.appendChild(b);
      }
      (small ? slot : foot).appendChild(row);
    }
    card.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && !document.querySelector('.card-ghost') && this.tip.show(card, info));
    card.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && this.pinSelected());
    draggable(card, {
      zones,
      onDrop,
      onDragStart: () => {
        this.tip.hide();
        onDragStart?.();
      },
      onDragEnd,
      onClick: () => this.select(key),
    });
    return slot;
  }

  select(key) {
    this.selected = this.selected === key ? null : key;
    if (this.shopData) this.renderShop(this.shopData);
  }

  // Keep the selected card's tooltip open (and hide the tooltip if nothing's selected).
  pinSelected() {
    const card = this.selected && document.querySelector(`.card[data-key="${this.selected}"]`);
    if (card && card.offsetParent) this.tip.show(card, this.cardInfo.get(this.selected));
    else this.tip.hide();
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
    if (s.training?.length) lines.push(['Training', s.training.map((t) => `${t.icon} ${t.name} ${t.level}`).join(' · ')]);
    if (s.charms?.length) lines.push(['Charms', s.charms.map((c) => `${c.icon} ${c.name}`).join(' · ')]);
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

  showVictory({ stars, flock, summer, unlocked, wool, trained, summary }) {
    this.renderSummary('victory-summary', summary);
    document.querySelector('#screen-victory h2').textContent = summer > 1 ? `Summer ${summer} won!` : "Summer's End!";
    $('victory-unlock').classList.toggle('hidden', !unlocked);
    if (unlocked) $('victory-unlock').textContent = `🔓 Summer ${unlocked.summer} unlocked: ${unlocked.text}`;
    $('victory-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    $('victory-flock').textContent = flock === 1 ? '🐑 1 sheep made it home' : `🐑 ${flock} sheep made it home`;
    $('victory-stats').textContent = `🧶 ${wool} wool left · 🐕 ${trained} training`;
    this.show('victory');
  }

  // The result of a run is simply how far you got.
  showGameOver({ reason, spare, lost, wave, endless, best, newBest, summary }) {
    $('over-title').textContent = reason === 'line' ? 'The shepherd called it off' : 'The wolves got the flock';
    this.renderSummary('over-summary', summary);
    const survived = (n) => `${n} wave${n === 1 ? '' : 's'} survived`;
    const result = endless ? `Summer won + ${survived(endless - 1).replace('wave', 'endless wave')}` : survived(wave - 1);
    $('over-result').textContent = `${result}${newBest ? ' · new best!' : ''}`;
    $('over-waves').textContent =
      reason === 'line'
        ? `He could spare ${spare} sheep this wave, and the wolves took ${lost}.`
        : endless
          ? `Summer won, then ${endless - 1} endless ${endless - 1 === 1 ? 'wave' : 'waves'}`
          : wave - 1 === 1
            ? 'You survived 1 wave'
            : `You survived ${wave - 1} waves`;
    $('over-stats').textContent = `Best: ${best} wave${best === 1 ? '' : 's'} survived`;
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
          const reward = rewardFor(a.id);
          card.querySelector('small').textContent = reward ? `${a.text} 🎁 ${reward.name}` : a.text;
          grid.appendChild(card);
        }
        return [h, grid];
      })
    );
    this.show('achievements');
  }

  toastAchievement(a, onClick, reward) {
    const label = reward ? `Achievement unlocked · 🎁 ${reward.name}` : 'Achievement unlocked';
    this.pushToast(`<span class="toast-icon">${a.icon}</span><span><small></small><strong></strong></span>`, a.name, onClick, 'achievement-toast');
    $('toast-layer').lastChild.querySelector('small').textContent = label;
  }

  // Wardrobe: a preview of the current look, then every item by slot. Locked items show which
  // achievement unlocks them.
  openWardrobe(wardrobe, bestiary) {
    const dogPortrait = (overrides = {}) => {
      const style = wardrobe.dogStyle(overrides);
      const key = `dog:${style.body}|${style.hat}|${style.neck}|${style.legs ?? 1}`;
      return bestiary.render(key, (scene) => [new Dog(scene, style)]);
    };
    $('wardrobe-current').src = dogPortrait();
    $('wardrobe-current-name').textContent = SLOTS.map((slot) => item(slot, wardrobe.picked[slot]).name)
      .filter((name) => name !== 'Nothing')
      .join(' · ');
    $('wardrobe-slots').replaceChildren(
      ...SLOTS.flatMap((slot) => {
        const h = document.createElement('h3');
        h.textContent = WARDROBE[slot].title;
        const grid = document.createElement('div');
        grid.className = 'wardrobe-grid';
        for (const it of WARDROBE[slot].items) {
          const open = wardrobe.available(slot, it.id);
          const card = document.createElement('button');
          card.className = `wardrobe-item${open ? '' : ' locked'}${wardrobe.picked[slot] === it.id ? ' selected' : ''}`;
          if (slot === 'meadow') {
            const colors = [...it.theme.leaves, ...it.theme.flowers].map((c) => `#${c.toString(16).padStart(6, '0')}`);
            card.innerHTML = `<span class="swatch" style="background: linear-gradient(135deg, ${colors.join(', ')})"></span>`;
          } else card.innerHTML = `<img alt="" src="${dogPortrait({ [slot]: it.id })}">`;
          const name = document.createElement('strong');
          name.textContent = it.name;
          card.appendChild(name);
          if (!open) {
            const hint = document.createElement('small');
            hint.textContent = `🔒 ${ACHIEVEMENT[it.unlock].name}`;
            card.appendChild(hint);
            card.title = `Unlock with the achievement "${ACHIEVEMENT[it.unlock].name}": ${ACHIEVEMENT[it.unlock].text}`;
          }
          card.addEventListener('click', () => open && this.onPickCosmetic?.(slot, it.id));
          grid.appendChild(card);
        }
        return [h, grid];
      })
    );
    this.show('wardrobe');
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
    while (layer.children.length >= 2) layer.firstChild.remove();
    layer.appendChild(el);
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => el.remove(), 3700);
  }

  // First-time tips: one at a time, each for a few seconds (click to dismiss), queued if several
  // come up together.
  showTip(text) {
    if (document.body.classList.contains('shopping')) return this.trayHint(text);
    this.tipQueue = this.tipQueue ?? [];
    this.tipQueue.push(text);
    if (!this.tipShowing) this.nextTip();
  }

  nextTip() {
    const el = $('tip');
    clearTimeout(this.tipTimer);
    const text = this.tipQueue?.shift();
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

  setBest(best, wins = 0, bestStars = 0) {
    const won = wins ? ` · summers won: ${wins} (best ${'★'.repeat(bestStars)})` : '';
    $('menu-best').textContent = best ? `Best: ${best} wave${best === 1 ? '' : 's'} survived${won}` : '';
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

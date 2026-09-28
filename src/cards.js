// Cards for the end-of-wave screen, Balatro style: just the icon and a short name on the card, the
// details in a tooltip on hover (or tap). Cards can be dragged onto drop zones (buy onto the collar,
// sell out of it) with pointer events, so mouse and touch both work; a plain click selects instead.

const DRAG_START = 6; // pixels the pointer has to move before a press becomes a drag

const GROUP_GLYPH = { dog: '🐕', shepherd: '👨‍🌾', flock: '🐑', trick: '🎭', xp: '⭐' };

// spec: { icon | image, name, rarity, group, pips, frozen, dim }
export function makeCard(spec) {
  const card = document.createElement('div');
  card.className = `card rarity-${spec.rarity ?? 'common'}${spec.frozen ? ' frozen' : ''}${spec.dim ? ' dim' : ''}`;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.innerHTML = '<span class="card-group"></span><span class="card-icon"></span><span class="card-name"></span><span class="card-pips"></span>';
  const q = (sel) => card.querySelector(sel);
  q('.card-group').textContent = GROUP_GLYPH[spec.group] ?? '';
  if (spec.image) q('.card-icon').innerHTML = `<img alt="" src="${spec.image}">`;
  else q('.card-icon').textContent = spec.icon;
  q('.card-name').textContent = spec.name;
  q('.card-pips').textContent = spec.pips ?? '';
  card.setAttribute('aria-label', spec.name);
  return card;
}

// One tooltip for every card: name, a small line (rarity · group), the effect, the catch in red,
// and a footer (price, what it sells for...).
export class CardTip {
  constructor(el) {
    this.el = el;
  }

  show(card, { title, meta, text, catch: downside, foot }) {
    const el = this.el;
    el.innerHTML = '<strong></strong><small></small><p class="tip-text"></p><p class="tip-catch"></p><p class="tip-foot"></p>';
    el.querySelector('strong').textContent = title;
    el.querySelector('small').textContent = meta ?? '';
    el.querySelector('.tip-text').textContent = text ?? '';
    el.querySelector('.tip-catch').textContent = downside ? `Catch: ${downside}` : '';
    el.querySelector('.tip-foot').textContent = foot ?? '';
    el.classList.remove('hidden');
    // Beside the card (right, or left if there's no room), so its price and buttons stay visible.
    const r = card.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const right = r.right + 14 + w < window.innerWidth;
    el.style.left = `${right ? r.right + 14 : Math.max(8, r.left - w - 14)}px`;
    el.style.top = `${Math.max(8, Math.min(window.innerHeight - h - 8, r.top))}px`;
  }

  hide() {
    this.el.classList.add('hidden');
  }
}

// Make a card draggable. zones() returns the current drop zones as [{ name, el }]; while dragging,
// the zone under the pointer gets .drop-hot, and dropping on one calls onDrop(name). A press that
// doesn't move is a click.
export function draggable(el, { zones, onDrop, onClick, onDragStart, onDragEnd }) {
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const start = { x: e.clientX, y: e.clientY };
    const rect = el.getBoundingClientRect();
    let ghost = null;
    const over = (ev) => zones().find((z) => inside(z.el, ev.clientX, ev.clientY));
    const move = (ev) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_START) return;
        ghost = el.cloneNode(true);
        ghost.classList.add('card-ghost');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        document.body.appendChild(ghost);
        el.classList.add('dragging');
        onDragStart?.();
      }
      ghost.style.left = `${ev.clientX - rect.width / 2}px`;
      ghost.style.top = `${ev.clientY - rect.height / 2}px`;
      const hot = over(ev);
      for (const z of zones()) z.el.classList.toggle('drop-hot', z === hot);
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!ghost) return onClick?.();
      const hot = ev.type === 'pointerup' ? over(ev) : null;
      ghost.remove();
      el.classList.remove('dragging');
      for (const z of zones()) z.el.classList.remove('drop-hot');
      onDragEnd?.();
      if (hot) onDrop(hot.name);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
  el.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick?.()));
}

function inside(el, x, y) {
  const r = el.getBoundingClientRect();
  const pad = 16; // a little forgiving around the edges
  return x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
}

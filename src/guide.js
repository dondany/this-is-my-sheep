// The field guide (guide.html): an internal reference page generated from the game's own data, so
// it stays in sync with the code. Not linked from the game.

import {
  quotaFor, DOG, BIG_BARK, BUMP, ROAM, SHEEP, SHEEP_TYPES, WOLF, WOLF_TYPES, FIRST_WAVE, GOAL, ENDLESS, BOSS, SUMMERS,
  SHEARING, BOUNTY, GOAT, LAMB, BLACK, BELL, SLEEPY, GOLDEN, DISGUISE, RAM_CALM, RASCAL, PUPS, HOWLER,
  TRICKSTER, ALPHA, SNEAKY, HELPER, SCARECROW, waveConfig,
} from './config.js';
import { UPGRADES, SHOP, LIVESTOCK, cost, animalPrice, modifiers } from './upgrades.js';
import { ACHIEVEMENTS, ACHIEVEMENT } from './achievements.js';
import { WARDROBE, SLOTS, rewardFor } from './cosmetics.js';
import { ENTRIES, Bestiary } from './bestiary.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const n = (v, digits = 1) => (Number.isInteger(v) ? String(v) : v.toFixed(digits).replace(/\.0$/, ''));
const pct = (m) => `${m >= 1 ? '+' : ''}${Math.round((m - 1) * 100)}%`;
const table = (head, rows) =>
  `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
const chips = (items) => `<ul class="chips">${items.filter(Boolean).map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`).join('')}</ul>`;

// Bestiary ids → the game's type keys.
const SHEEP_KIND = { sheep: 'normal' };
const WOLF_KIND = { wolf: 'normal' };
const firstWave = (id) => FIRST_WAVE[id === 'pup' ? 'pups' : id] ?? 1;
const startReach = DOG.threatRadius;
const reachScale = startReach / DOG.baseReach; // sheep react to the dog relative to its reach

// --- Table of contents -------------------------------------------------------

$('toc').innerHTML = [...document.querySelectorAll('main section')]
  .map((s) => `<a href="#${s.id}">${esc(s.querySelector('h2').textContent)}</a>`)
  .join('');

// --- The dog ------------------------------------------------------------------

const loud = UPGRADES.find((u) => u.id === 'loud');
$('dog-stats').innerHTML = `
  <h3>The dog</h3>
  ${chips([
    ['Top speed', `${DOG.maxSpeed} u/s`],
    ['Reach (the ring)', `${startReach} at the start, +1 per Dog's Reach level, up to ${startReach + loud.max}`],
    ['Big Bark', `every wolf within ${BIG_BARK.radius}, brutes included · ${BIG_BARK.cooldown} s recharge · startles sheep within ${BIG_BARK.startleRadius}`],
    ['Running through the flock', `sheep it passes at over ${BUMP.minSpeed} u/s bounce aside`],
    ['Parking among the sheep', `they grow uneasy and keep up to ${SHEEP.pressureMax}× further away after ${SHEEP.pressureTime} s`],
  ])}
  <p class="note">The shepherd moves the flock every ${ROAM.interval[0]}-${ROAM.interval[1]} s, and sheep keep a little personal space (${SHEEP.minDistance} units apart), so camping in the middle of the flock doesn't work.</p>`;

// --- Goal ---------------------------------------------------------------------

$('goal-body').innerHTML = `
  <p>Survive <strong>wave ${GOAL.finalWave}</strong> and drive off the boss, <strong>Old Greymuzzle</strong>, with at least one sheep left, and you win the run. The win screen rates the flock you brought home:</p>
  ${chips([
    ['★', 'any survivors'],
    ['★★', `${GOAL.stars[0]}+ sheep`],
    ['★★★', `${GOAL.stars[1]}+ sheep`],
  ])}
  <h3>The shepherd's quota</h3>
  <p>From wave ${GOAL.quotaFrom}, each wave must end with at least this many sheep (the goat doesn't count). Missing it costs a ❤️; after ${GOAL.strikes} misses the run is over. It keeps rising by ${GOAL.quotaEndlessStep} per wave in endless mode.</p>
  ${table(['Wave', ...Array.from({ length: GOAL.finalWave - GOAL.quotaFrom + 1 }, (_, i) => String(GOAL.quotaFrom + i))], [['Sheep needed', ...Array.from({ length: GOAL.finalWave - GOAL.quotaFrom + 1 }, (_, i) => String(quotaFor(GOAL.quotaFrom + i)))]])}
  <h3>The boss</h3>
  <p>Old Greymuzzle arrives ${Math.round(BOSS.arriveAt * 100)}% of the way into the final wave. Like a brute, the dog has to stay next to him until his fear meter fills; like an alpha, he leads the pack. He has to be driven off <strong>${BOSS.driveOffs} times</strong>, coming back with ${BOSS.reinforcements} fresh wolves after each of the first ones, and drops a ${BOSS.tuft}-wool tuft when he's gone for good. The wave can't end until he is (overtime).</p>
  <h3>Endless mode</h3>
  <p>After winning, <em>Keep grazing</em> plays on:</p>
  <ul>
    <li>+${ENDLESS.extraWolves} wolf every wave (up to ${ENDLESS.maxWolves}), the extra slots all special wolves, and a second alpha.</li>
    <li>Score multiplier ×${n(1 + ENDLESS.scoreBonus)} on the first endless wave, ×${n(1 + 2 * ENDLESS.scoreBonus)} on the second, and so on.</li>
    <li>Flock cap ${ENDLESS.flockCap} (from ${SHEEP.cap}); newcomers that don't fit are sold at market for ${ENDLESS.marketWool} wool each.</li>
    <li>Old Greymuzzle returns every ${BOSS.endlessEvery} endless waves, with one more drive-off each time.</li>
  </ul>
  <h3>Summers (difficulty levels)</h3>
  <p>Winning unlocks the next summer; each adds its rule on top of all the earlier ones.</p>
  ${table(['Summer', 'Adds'], SUMMERS.map((s, i) => [String(i + 1), esc(s.text)]))}`;

// --- Economy ------------------------------------------------------------------

const woolRows = Object.entries({
  'Sheep, wanderer, sleepy, black sheep': SHEEP_TYPES.normal.wool,
  Lamb: SHEEP_TYPES.lamb.wool,
  Bellwether: SHEEP_TYPES.bellwether.wool,
  'Old Ram': SHEEP_TYPES.ram.wool,
  'Golden Fleece': SHEEP_TYPES.golden.wool,
  Goat: 0,
}).map(([k, v]) => [k, String(v)]);
$('economy-body').innerHTML = `
  <h3>Shearing (end of every wave)</h3>
  ${table(['Survivor', 'Wool'], [
    ...woolRows,
    ['Calm bonus (never grabbed, panicked under ' + SHEARING.calmStress + ' s)', `+1 per ${Math.round(1 / SHEARING.calmBonus)} calm sheep`],
    ['Perfect flock (nobody lost)', `+${SHEARING.perfect}`],
    ['Interest on unspent wool', `+1 per ${SHEARING.interestPer}, up to +${SHEARING.interestMax} (Piggy Bank raises the cap)`],
  ])}
  <h3>Bounty tufts (during a wave)</h3>
  <p>The first time these wolves are scared off they drop a tuft of fur; run the dog over it within ${BOUNTY.life} s.</p>
  ${table(['Wolf', 'Wool'], [...Object.entries(BOUNTY.wool).map(([k, v]) => [esc(ENTRIES.find((e) => e.id === k)?.name ?? k), String(v)]), ['Old Greymuzzle (when gone for good)', String(BOSS.tuft)]])}
  <h3>The shop</h3>
  <ul>
    <li>${SHOP.cards} cards after every wave: ${SHOP.cards - 1} upgrades and 1 animal. Rare upgrades come up about ${Math.round(SHOP.rareWeight * 100)}% as often.</li>
    <li>Reroll: ${SHOP.reroll} wool, +${SHOP.reroll} for each further reroll that wave.</li>
    <li>Freeze up to ${SHOP.maxFrozen} cards (❄️) to keep them for the next wave.</li>
    <li>Upgrade level <em>n</em> costs its base price × (<em>n</em> + 1).</li>
  </ul>
  <h3>Score</h3>
  <p>Scaring a wolf scores its ★ value (see the wolves), rescues and combos add more. Endless waves multiply everything.</p>`;

// --- Animals -----------------------------------------------------------------

const sheepNotes = {
  normal: () => 'The standard sheep. Grazes, strolls and sticks with the flock.',
  wanderer: () => 'Strays far from the flock and attracts wolves, but notices the dog from twice as far.',
  lamb: () => `Follows its mother (stays within ${LAMB.followDistance}). If she's taken it bolts off and adopts a new mother once herded back.`,
  sleepy: () => `Dozes and ignores wolves. The dog within ${SLEEPY.wakeRadius} wakes it, startling sheep within ${SLEEPY.startleRadius}. Stays awake ${SLEEPY.awake[0]}-${SLEEPY.awake[1]} s.`,
  ram: (t) => `Sheep within ${t.attractRadius} are drawn to him and panic ${Math.round((1 - RAM_CALM) * 100)}% less.`,
  golden: () => `Joins at wave ${GOLDEN.firstWave}, then with a ${Math.round(GOLDEN.chance * 100)}% chance per wave if there isn't one.`,
  black: () => `Stampedes every ${BLACK.interval[0]}-${BLACK.interval[1]} s at ${BLACK.speed} u/s, dragging up to ${BLACK.followers} sheep, for up to ${BLACK.duration} s. The dog within ${BLACK.cutOffRadius} heads it off (★ ${BLACK.points}).`,
  bellwether: () => `Rings every ${BELL.interval[0]}-${BELL.interval[1]} s; sheep within ${BELL.radius} regroup around it. Losing it cuts flock cohesion to ${Math.round(BELL.lostCohesion * 100)}% for the wave.`,
  disguised: () => `Reveals itself ${DISGUISE.reveal[0]}-${DISGUISE.reveal[1]} s into the wave, or when the dog stays within ${DISGUISE.sniffRadius} for ${DISGUISE.sniffTime} s (★ ${DISGUISE.points}).`,
};

function sheepStats(id) {
  if (id === 'goat') {
    return chips([
      ['First', `shop only, from wave ${FIRST_WAVE.goat}`],
      ['Wool', '0'],
      ['Charges wolves within', GOAT.sightRadius],
      ['Head-butt', `${GOAT.stun} s daze, knocks back ${GOAT.knockback}, every ${GOAT.cooldown} s`],
    ]);
  }
  const kind = SHEEP_KIND[id] ?? id;
  const t = SHEEP_TYPES[kind];
  return chips([
    ['First wave', firstWave(id)],
    ['Wool', t.wool],
    ['Size', `${n(t.scale / SHEEP_TYPES.normal.scale, 2)}×`],
    ['Walk speed', `${t.walkSpeed} u/s`],
    ['Notices the dog', `${n(t.dogFearRadius * reachScale)} (at the start)`],
    t.panic !== 1 && ['Wolf panic', pct(t.panic)],
    t.grabTime !== 1 && ['Time to take it', `${n(WOLF.grabTime * t.grabTime)} s`],
    t.lure && ['Wolves prefer it', `+${t.lure}`],
  ]) + `<p class="note">${esc(sheepNotes[kind]?.(t) ?? '')}</p>`;
}

const wolfNotes = {
  normal: () => 'Prowls the tree line, then goes for stragglers.',
  pup: () => `Arrives in threes; they split up when the dog has been within ${PUPS.splitRadius} for ${PUPS.reaction} s. Scaring all three within ${PUPS.comboWindow} s scores ★ ${PUPS.comboPoints}.`,
  runner: () => 'Goes for the nearest sheep and gives up a chase when the dog nears its target.',
  rascal: () => `Never takes sheep: dashes through the flock ${RASCAL.passes[0]}-${RASCAL.passes[1]} times at ${RASCAL.speed} u/s, tossing sheep aside.`,
  howler: () => `Never attacks. Howls every ${HOWLER.interval[0]}-${HOWLER.interval[1]} s, panicking sheep within ${HOWLER.radius}.`,
  sneaky: () => `No off-screen arrow until within ${SNEAKY.revealDistance} of the flock; circles to the side away from the dog.`,
  brute: () => 'Has to be kept next to the dog until its fear meter fills; shoves sheep aside.',
  trickster: () => `Switches to the far side of the flock once the dog runs at it (within ${TRICKSTER.commitRadius}).`,
  alpha: () => `Other wolves stalk ${Math.round((1 - ALPHA.stalk) * 100)}% less and attack on its howl; scaring it scares every wolf within ${ALPHA.panicRadius}.`,
  greymuzzle: () => `The final boss: ${BOSS.driveOffs} drive-offs, leads the pack, needs the dog close for a while each time.`,
  disguised: () => 'What comes out of the sheepskin: a regular wolf.',
};

function wolfStats(id) {
  const kind = WOLF_KIND[id] ?? id;
  const t = WOLF_TYPES[kind];
  const flags = [t.skittish && 'skittish', t.shove && 'shoves sheep', t.leader && 'leads the pack', t.hidden && 'hidden', t.feint && 'feints', t.howler && 'never attacks', t.rascal && 'never takes sheep', t.boss && 'boss'].filter(Boolean);
  return chips([
    ['First wave', firstWave(id)],
    ['Score', `★ ${t.points}`],
    ['Speed', `${n(t.speed, 2)}× (chase ${n(WOLF.chaseSpeed * t.speed)} u/s)`],
    ['Size', `${n(t.scale / WOLF_TYPES.normal.scale, 2)}×`],
    t.courage && ['Fear meter', `${t.courage} s next to the dog`],
    t.threatScale !== 1 && ['Scared from', `${n(t.threatScale, 2)}× the dog's reach`],
    t.grabTime !== 1 && ['Takes a sheep in', `${n(WOLF.grabTime * t.grabTime)} s`],
    flags.length && ['Traits', flags.join(', ')],
  ]) + `<p class="note">${esc(wolfNotes[kind]?.(t) ?? '')}</p>`;
}

function beastCard(e, stats) {
  return `<article class="beast" id="beast-${e.id}">
    <img alt="" data-portrait="${e.id}">
    <div>
      <h3>${esc(e.name)}</h3>
      <p>${esc(e.text)}</p>
      <p class="tip">${esc(e.tip)}</p>
      ${stats}
    </div>
  </article>`;
}

$('flock-list').innerHTML = ENTRIES.filter((e) => e.side === 'flock').map((e) => beastCard(e, sheepStats(e.id))).join('');
$('wolf-list').innerHTML = ENTRIES.filter((e) => e.side === 'wolves').map((e) => beastCard(e, wolfStats(e.id))).join('');

// Portraits come from the same renderer as the in-game bestiary; draw them one per frame.
const bestiary = new Bestiary();
const pending = [...document.querySelectorAll('img[data-portrait]')];
(function drawNext() {
  const img = pending.shift();
  if (!img) return;
  img.src = bestiary.portrait(img.dataset.portrait);
  requestAnimationFrame(drawNext);
})();

// --- Waves -------------------------------------------------------------------

const nameOf = (kind) => ({ normal: 'wolf', pups: 'pup pack' })[kind] ?? ENTRIES.find((e) => e.id === kind)?.name.toLowerCase() ?? kind;
const waveRows = [];
for (const wave of [...Array(GOAL.finalWave).keys()].map((i) => i + 1).concat([16, 20, 25])) {
  const cfg = waveConfig(wave);
  const counts = {};
  for (const k of cfg.pack) counts[k] = (counts[k] ?? 0) + 1;
  const pack = Object.entries(counts)
    .sort((a, b) => (a[0] === 'normal') - (b[0] === 'normal'))
    .map(([k, c]) => `${c > 1 ? c + '× ' : ''}${nameOf(k)}`)
    .join(', ');
  const arrivals = [
    cfg.newSheep && `${cfg.newSheep} sheep`,
    cfg.wanderers && `${cfg.wanderers} wanderer${cfg.wanderers > 1 ? 's' : ''}`,
    cfg.lambs && `${cfg.lambs} lamb`,
    cfg.sleepy && `${cfg.sleepy} sleepy`,
    wave === GOLDEN.firstWave && 'golden fleece',
  ].filter(Boolean);
  const keep = ['ram', 'black', 'bellwether'].filter((k) => cfg[k]).map((k) => `${cfg[k]} ${nameOf(k)}`);
  const newcomers = Object.keys(FIRST_WAVE)
    .filter((k) => FIRST_WAVE[k] === wave)
    .map((k) => (k === 'goat' ? 'goat (in the shop)' : nameOf(k === 'pups' ? 'pup' : k)));
  const label = wave > GOAL.finalWave ? `${wave} <small>(endless)</small>` : wave === GOAL.finalWave ? `${wave} <small>(final, boss)</small>` : String(wave);
  waveRows.push([
    label,
    `${cfg.duration} s`,
    `${cfg.wolves}${cfg.pairs ? ' <small>(pairs)</small>' : ''}`,
    esc(pack) + (wave > GOAL.finalWave ? ' <small>(extra slots random)</small>' : ''),
    esc(arrivals.join(', ')) + (keep.length ? `<br><small>keeps: ${esc(keep.join(', '))}</small>` : ''),
    esc(newcomers.join(', ')),
  ]);
}
$('wave-table').outerHTML = table(['Wave', 'Length', 'Wolves', 'Pack', 'New sheep', 'First seen'], waveRows);

// --- Upgrades & livestock ----------------------------------------------------

const groupName = { dog: 'Dog', shepherd: 'Shepherd', flock: 'Flock' };
const helperMods = modifiers({ helper: 1 });
$('upgrades-body').innerHTML = `
  <p>Level <em>n</em> costs base × (<em>n</em> + 1). Summer 5 and later add 25% to all prices. Rare cards come up about ${Math.round(SHOP.rareWeight * 100)}% as often; Dog's Reach twice as often.</p>
  ${table(
    ['', 'Upgrade', 'Group', 'Effect per level', 'Prices by level'],
    UPGRADES.map((u) => [
      u.icon,
      `<strong>${esc(u.name)}</strong>${u.rare ? ' <small>(rare)</small>' : ''}${u.requires ? ` <small>(needs ${esc(UPGRADES.find((x) => x.id === u.requires).name)})</small>` : ''}`,
      groupName[u.group],
      esc(u.text),
      [...Array(u.max).keys()].map((l) => cost(u, l)).join(' · '),
    ])
  )}
  <h3>Helpers</h3>
  ${chips([
    ['Second Dog', `${Math.round(helperMods.helperSpeed * 100)}% of the dog's speed and reach ${n(HELPER.threatRadius * helperMods.helperThreat, 2)} at first; reacts to wolves within ${HELPER.reactRadius} of the flock; rests ${HELPER.rest} s after each scare`],
    ['Scarecrow', `scares ordinary wolves within ${SCARECROW.radius}; brutes ignore it`],
  ])}`;

$('livestock-body').innerHTML = `
  <p>One of the four shop cards offers an animal. It joins at the start of the next wave. Only animals already met in the run are offered (a lamb always is); each one you own makes the next of its kind cost 50% more.</p>
  ${table(
    ['Animal', 'Price', 'Then', 'Shorn for', 'Notes'],
    LIVESTOCK.map((a) => [
      esc(ENTRIES.find((e) => e.id === a.kind).name),
      String(a.price),
      `${animalPrice(a.kind, 1)} · ${animalPrice(a.kind, 2)}`,
      a.kind === 'goat' ? '—' : `${SHEEP_TYPES[a.kind].wool} a wave`,
      esc(a.text) + (a.unique ? ' <small>(one at a time)</small>' : ''),
    ])
  )}`;

// --- Wardrobe -------------------------------------------------------------------

$('wardrobe-body').innerHTML = table(
  ['Slot', 'Item', 'Unlocked by'],
  SLOTS.flatMap((slot) =>
    WARDROBE[slot].items.map((it) => [
      WARDROBE[slot].title,
      esc(it.name),
      it.unlock ? `${ACHIEVEMENT[it.unlock].icon} ${esc(ACHIEVEMENT[it.unlock].name)} <small>(${esc(ACHIEVEMENT[it.unlock].text)})</small>` : '<small>available from the start</small>',
    ])
  )
);

// --- Achievements ------------------------------------------------------------

const groups = [...new Set(ACHIEVEMENTS.map((a) => a.group))];
$('achievements-body').innerHTML =
  `<p>${ACHIEVEMENTS.length} achievements.</p>` +
  groups
    .map(
      (g) =>
        `<h3>${esc(g)}</h3><ul class="achievements">${ACHIEVEMENTS.filter((a) => a.group === g)
          .map((a) => `<li><span>${a.icon}</span><strong>${esc(a.name)}</strong> ${esc(a.text)}${rewardFor(a.id) ? ` <small>🎁 ${esc(rewardFor(a.id).name)}</small>` : ''}</li>`)
          .join('')}</ul>`
    )
    .join('');

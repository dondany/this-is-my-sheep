// Two ways to grow during a run. The dog levels up by scaring wolves (XP): each level is a perk,
// picked at the end of the wave. Wool buys upgrades for the shepherd and the flock in the shop.
// `modifiers()` turns both into the multipliers the rest of the game reads (ctx.mods).

// --- Dog perks ------------------------------------------------------------------
// Each pick adds 1, 2 or 3 points (common / rare / legendary); `per` is the effect of one point and
// `max` the most points a perk can hold. `requires` keeps a perk out of the draw until an upgrade
// is owned.

const pct = (v) => `${Math.round(v * 100)}%`;
export const PERKS = [
  { id: 'swift', icon: '⚡', name: 'Swift Paws', per: 0.06, max: 10, text: (v) => `The dog runs and turns ${pct(v)} faster.` },
  { id: 'loud', icon: '🎯', name: "Dog's Reach", per: 0.5, max: 12, weight: 2, text: (v) => `Reach +${v}: wolves get scared and sheep herded from further away.` },
  { id: 'scary', icon: '😱', name: 'Scary Bark', per: 0.12, max: 8, text: (v) => `Scared wolves run ${pct(v)} longer before coming back.` },
  { id: 'brave', icon: '🦴', name: 'Brave Heart', per: 0.12, max: 6, text: (v) => `Brutes and the boss give up ${pct(v)} sooner.` },
  { id: 'lungs', icon: '🌬️', name: 'Deep Lungs', per: 0.12, max: 8, text: (v) => `The Big Bark refills ${pct(v)} faster on its own.` },
  { id: 'booming', icon: '💥', name: 'Booming Bark', per: 0.08, max: 8, text: (v) => `The Big Bark reaches ${pct(v)} further.` },
  { id: 'nose', icon: '👃', name: 'Nose for Wolves', per: 0.25, max: 6, text: (v) => `Sneaky wolves show up ${pct(v)} sooner and disguises are sniffed out faster.` },
  { id: 'fetch', icon: '🎾', name: 'Fetch!', per: 0.25, max: 6, text: (v) => `Bounty tufts last ${pct(v)} longer and are easier to grab.` },
  { id: 'pupSpeed', icon: '🐾', name: 'Pup Training', per: 0.05, max: 8, requires: 'helper', text: (v) => `The second dog runs ${pct(v)} faster (of your dog's speed).` },
  { id: 'pupBark', icon: '🔊', name: "Pup's Bark", per: 0.04, max: 8, requires: 'helper', text: (v) => `The second dog's reach +${pct(v)}.` },
];

export const PERK = Object.fromEntries(PERKS.map((p) => [p.id, p]));

export const RARITY = [
  { id: 'common', name: 'Common', points: 1, weight: 70 },
  { id: 'rare', name: 'Rare', points: 2, weight: 24 },
  { id: 'legendary', name: 'Legendary', points: 3, weight: 6 },
];

// The effect of `points` of a perk, as shown on its card.
export function perkText(id, points) {
  const p = PERK[id];
  return p.text(Math.round(p.per * points * 100) / 100);
}

// Three different perks to choose from on a level-up, each with a rarity roll. Maxed perks (and
// ones whose requirement isn't owned) are left out; a roll never goes past a perk's max.
export function drawPerks(perks, levels, n = 3) {
  const pool = PERKS.filter((p) => (perks[p.id] ?? 0) < p.max && (!p.requires || levels[p.requires]));
  const offer = [];
  while (offer.length < n && pool.length) {
    const i = pickWeighted(pool.map((p) => p.weight ?? 1));
    const p = pool.splice(i, 1)[0];
    const rarity = RARITY[pickWeighted(RARITY.map((r) => r.weight))];
    const points = Math.min(rarity.points, p.max - (perks[p.id] ?? 0));
    offer.push({ id: p.id, rarity: RARITY.find((r) => r.points === points)?.id ?? 'common', points });
  }
  return offer;
}

function pickWeighted(weights) {
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  let i = 0;
  while (i < weights.length - 1 && r > weights[i]) r -= weights[i++];
  return i;
}

// --- Shop upgrades (wool) ---------------------------------------------------------
// Each one has levels. `requires` keeps a card out of the draw until another upgrade is owned.

export const UPGRADES = [
  // --- Dog
  { id: 'helper', group: 'dog', icon: '🐕', name: 'Second Dog', text: 'A young dog joins you and guards the flock on its own. Slow and easily winded at first: train it with pup perks when your dog levels up.', max: 1, cost: 40, rare: true },
  // --- Shepherd
  { id: 'calm', group: 'shepherd', icon: '🎶', name: 'Calming Song', text: 'Sheep panic 15% less around wolves.', max: 3, cost: 6 },
  { id: 'herding', group: 'shepherd', icon: '🪄', name: 'Herding Instinct', text: 'The flock sticks together 20% more tightly, and sheep can stand 10% closer to each other.', max: 3, cost: 6 },
  { id: 'whistle', group: 'shepherd', icon: '📯', name: "Shepherd's Whistle", text: 'The shepherd whistles the whole flock back to him every 20 s (5 s sooner per level).', max: 3, cost: 20, rare: true },
  { id: 'crook', group: 'shepherd', icon: '🦯', name: "Shepherd's Crook", text: 'The shepherd swats wolves that come within 3 units of him (+1 per level).', max: 3, cost: 10 },
  { id: 'scarecrow', group: 'shepherd', icon: '🌾', name: 'Scarecrow', text: 'Place a scarecrow that scares off ordinary wolves (not brutes) that come close.', max: 2, cost: 20, rare: true },
  // --- Flock
  { id: 'fleece', group: 'flock', icon: '🧶', name: 'Thick Fleece', text: 'Wolves need 20% longer to take a sheep.', max: 5, cost: 8 },
  { id: 'more', group: 'flock', icon: '🐑', name: 'Bigger Flock', text: '+1 sheep joins every wave.', max: 3, cost: 6 },
  { id: 'lambing', group: 'flock', icon: '🍼', name: 'Lambing Season', text: '+1 lamb every wave (they pay double).', max: 2, cost: 6 },
  { id: 'shears', group: 'flock', icon: '✂️', name: 'Sharp Shears', text: '+10% wool from shearing.', max: 3, cost: 10 },
  { id: 'piggy', group: 'flock', icon: '🐷', name: 'Piggy Bank', text: 'Interest on unspent wool can go 2 higher.', max: 2, cost: 8 },
];

export const UPGRADE = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export const SHOP = {
  cards: 4, // three upgrades and one livestock card
  levelCostGrowth: 1, // level n costs base × (n + 1)
  reroll: 2, // first reroll of a wave; each further reroll costs this much more
  rareWeight: 0.35, // how often rare cards come up relative to common ones
  maxFrozen: 2, // cards you can freeze to keep them for the next wave's shop
};

export function cost(upgrade, level) {
  return Math.round(upgrade.cost * (1 + SHOP.levelCostGrowth * level));
}

export function modifiers(levels, perks = {}) {
  const l = (id) => levels[id] ?? 0;
  const p = (id) => (perks[id] ?? 0) * PERK[id].per; // a perk's total effect
  return {
    dogSpeed: 1 + p('swift'),
    barkRange: p('loud'), // added to DOG.threatRadius
    flee: 1 + p('scary'),
    courage: 1 - Math.min(0.75, p('brave')),
    panic: 0.85 ** l('calm'),
    cohesion: 1 + 0.2 * l('herding'),
    spacing: 1 - 0.1 * l('herding'), // × SHEEP.minDistance
    grab: 1 + 0.2 * l('fleece'),
    extraSheep: l('more'),
    lambs: l('lambing'),
    bigBarkCooldown: 1 / (1 + p('lungs')), // × the Big Bark's refill time
    whistle: l('whistle') ? 25 - 5 * l('whistle') : 0, // seconds between whistles (0 = none)
    scarecrows: l('scarecrow'),
    helper: l('helper') > 0,
    helperSpeed: 0.55 + p('pupSpeed'), // fraction of the player's dog
    helperThreat: 0.55 + p('pupBark'), // × HELPER.threatRadius
    bigBarkRadius: 1 + p('booming'),
    reveal: 1 + p('nose'), // sneaky wolves' reveal distance
    sniff: 1 / (1 + 2 * p('nose')), // time to expose a disguise
    tuftLife: 1 + p('fetch'),
    tuftRadius: 1 + 0.6 * p('fetch'),
    crook: l('crook') ? 2 + l('crook') : 0, // shepherd's swat radius (0 = none)
    shears: 1 + 0.1 * l('shears'),
    interest: 2 * l('piggy'), // extra interest cap
  };
}

export function canOffer(upgrade, levels) {
  return (levels[upgrade.id] ?? 0) < upgrade.max && (!upgrade.requires || levels[upgrade.requires]);
}

// Up to `n` different upgrades that aren't maxed out yet (and not in `exclude`), rare ones less often.
export function drawCards(levels, n = SHOP.cards, exclude = []) {
  const pool = UPGRADES.filter((u) => canOffer(u, levels) && !exclude.includes(u.id));
  const cards = [];
  while (cards.length < n && pool.length) {
    const i = pickWeighted(pool.map((u) => u.weight ?? (u.rare ? SHOP.rareWeight : 1)));
    cards.push(pool.splice(i, 1)[0].id);
  }
  return cards;
}

// Livestock: one of the shop's cards offers an animal to buy. It joins the flock at the start of the
// next wave and pays back through shearing, as long as you keep it alive. Only animals that have
// already turned up in the run are offered (a lamb always is). Each one you already own makes the
// next of its kind pricier.
export const LIVESTOCK = [
  { kind: 'lamb', price: 6, weight: 3, text: 'Joins a mother in the flock. Wolves love lambs.' },
  { kind: 'bellwether', price: 10, weight: 1.5, unique: true, text: 'Its bell regroups the sheep around it.' },
  { kind: 'ram', price: 12, weight: 1.5, unique: true, text: 'Big, calm and hard for wolves to take.' },
  { kind: 'goat', price: 18, weight: 1.2, unique: true, text: 'Charges and head-butts wolves near the flock. Gives no wool.' },
  { kind: 'golden', price: 35, weight: 1, text: 'Every wolf wants it. A big investment if you can keep it.' },
];

export const ANIMAL = Object.fromEntries(LIVESTOCK.map((a) => [a.kind, a]));

export function animalPrice(kind, owned) {
  const a = ANIMAL[kind];
  return a.price + owned * Math.ceil(a.price / 2);
}

// available(kind) says whether an animal can be offered right now.
export function drawAnimal(available) {
  const pool = LIVESTOCK.filter((a) => available(a.kind));
  if (!pool.length) return null;
  let r = Math.random() * pool.reduce((sum, a) => sum + a.weight, 0);
  for (const a of pool) if ((r -= a.weight) <= 0) return a.kind;
  return pool[pool.length - 1].kind;
}


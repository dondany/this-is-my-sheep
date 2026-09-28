// Two ways to grow during a run. The dog levels up by scaring wolves (XP): each level is a perk,
// picked at the end of the wave. Wool buys charms in the shop, hung on the dog's collar (up to 5).
// `modifiers()` turns both into the multipliers the rest of the game reads (ctx.mods).

// --- Dog perks ------------------------------------------------------------------
// Each pick adds 1, 2 or 3 points (common / rare / legendary); `per` is the effect of one point and
// `max` the most points a perk can hold. `requires` keeps a perk out of the draw until that charm
// is on the collar.

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
export function drawPerks(perks, charms, n = 3) {
  const pool = PERKS.filter((p) => (perks[p.id] ?? 0) < p.max && (!p.requires || charms.includes(p.requires)));
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

// --- Charms (wool) -------------------------------------------------------------------
// Bought in the shop and hung on the dog's collar: up to SHOP.slots at once, one of each kind. Sell
// one for half its price to make room. `rarity` sets how often it's offered.

export const CHARMS = [
  // --- Dog
  { id: 'helper', group: 'dog', icon: '🐕', name: 'Second Dog', rarity: 'rare', price: 35, text: 'A young dog joins you and guards the flock on its own. Slow and easily winded at first: train it with pup perks when your dog levels up.' },
  // --- Shepherd
  { id: 'crook', group: 'shepherd', icon: '🦯', name: "Shepherd's Crook", rarity: 'common', price: 10, text: 'The shepherd swats wolves that come within 4 units of him.' },
  { id: 'calm', group: 'shepherd', icon: '🎶', name: 'Calming Song', rarity: 'common', price: 8, text: 'Sheep panic 35% less around wolves.' },
  { id: 'herding', group: 'shepherd', icon: '🪄', name: 'Herding Instinct', rarity: 'common', price: 8, text: 'The flock sticks together 40% more tightly, and sheep can stand 20% closer to each other.' },
  { id: 'whistle', group: 'shepherd', icon: '📯', name: "Shepherd's Whistle", rarity: 'rare', price: 20, text: 'Every 15 s the shepherd whistles the whole flock back to him.' },
  { id: 'scarecrow', group: 'shepherd', icon: '🌾', name: 'Scarecrows', rarity: 'rare', price: 20, text: 'Place two scarecrows that scare off ordinary wolves (not brutes). They go if you sell this charm.' },
  // --- Flock
  { id: 'fleece', group: 'flock', icon: '🧶', name: 'Thick Fleece', rarity: 'uncommon', price: 14, text: 'Wolves need 60% longer to take a sheep.' },
  { id: 'more', group: 'flock', icon: '🐑', name: 'Bigger Flock', rarity: 'common', price: 8, text: '+2 sheep join every wave.' },
  { id: 'lambing', group: 'flock', icon: '🍼', name: 'Lambing Season', rarity: 'common', price: 8, text: '+2 lambs every wave (they pay double).' },
  { id: 'shears', group: 'flock', icon: '✂️', name: 'Sharp Shears', rarity: 'uncommon', price: 12, text: '+30% wool from shearing.' },
  { id: 'piggy', group: 'flock', icon: '🐷', name: 'Piggy Bank', rarity: 'common', price: 8, text: 'Interest on unspent wool can go 3 higher.' },
];

export const CHARM = Object.fromEntries(CHARMS.map((c) => [c.id, c]));

export const SHOP = {
  cards: 4, // three charms and one livestock card
  slots: 5, // charms on the collar at once
  sellBack: 0.5, // a sold charm returns this share of its price
  reroll: 2, // first reroll of a wave; each further reroll costs this much more
  rarityWeight: { common: 1, uncommon: 0.6, rare: 0.35 }, // how often each rarity is offered
  maxFrozen: 2, // cards you can freeze to keep them for the next wave's shop
};

export function modifiers(charms = [], perks = {}) {
  const has = (id) => charms.includes(id);
  const p = (id) => (perks[id] ?? 0) * PERK[id].per; // a perk's total effect
  return {
    // Dog perks
    dogSpeed: 1 + p('swift'),
    barkRange: p('loud'), // added to DOG.threatRadius
    flee: 1 + p('scary'),
    courage: 1 - Math.min(0.75, p('brave')),
    bigBarkCooldown: 1 / (1 + p('lungs')), // × the Big Bark's refill time
    bigBarkRadius: 1 + p('booming'),
    reveal: 1 + p('nose'), // sneaky wolves' reveal distance
    sniff: 1 / (1 + 2 * p('nose')), // time to expose a disguise
    tuftLife: 1 + p('fetch'),
    tuftRadius: 1 + 0.6 * p('fetch'),
    helperSpeed: 0.55 + p('pupSpeed'), // fraction of the player's dog
    helperThreat: 0.55 + p('pupBark'), // × HELPER.threatRadius
    // Charms
    helper: has('helper'),
    crook: has('crook') ? 4 : 0, // shepherd's swat radius (0 = none)
    panic: has('calm') ? 0.65 : 1,
    cohesion: has('herding') ? 1.4 : 1,
    spacing: has('herding') ? 0.8 : 1, // × SHEEP.minDistance
    whistle: has('whistle') ? 15 : 0, // seconds between whistles (0 = none)
    scarecrows: has('scarecrow') ? 2 : 0,
    grab: has('fleece') ? 1.6 : 1,
    extraSheep: has('more') ? 2 : 0,
    lambs: has('lambing') ? 2 : 0,
    shears: has('shears') ? 1.3 : 1,
    interest: has('piggy') ? 3 : 0, // extra interest cap
  };
}

// Up to `n` different charms not on the collar yet (and not in `exclude`), rarer ones less often.
export function drawCards(owned, n = SHOP.cards, exclude = []) {
  const pool = CHARMS.filter((c) => !owned.includes(c.id) && !exclude.includes(c.id));
  const cards = [];
  while (cards.length < n && pool.length) {
    const i = pickWeighted(pool.map((c) => SHOP.rarityWeight[c.rarity]));
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


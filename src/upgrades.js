// Upgrades bought with wool between waves. Each one has levels; `modifiers()` turns the levels
// owned into the multipliers the rest of the game reads (ctx.mods). `requires` keeps a card out of
// the draw until another upgrade is owned.

export const UPGRADES = [
  // --- Dog
  { id: 'swift', group: 'dog', icon: '⚡', name: 'Swift Paws', text: 'The dog runs and turns 10% faster.', max: 5, cost: 8 },
  { id: 'loud', group: 'dog', icon: '🎯', name: "Dog's Reach", text: "The dog's reach +1: wolves get scared and sheep herded from further away (2.5 at the start, up to 8.5).", max: 6, cost: 6, weight: 2 },
  { id: 'scary', group: 'dog', icon: '😱', name: 'Scary Bark', text: 'Scared wolves run 20% longer before coming back.', max: 3, cost: 6 },
  { id: 'brave', group: 'dog', icon: '🦴', name: 'Brave Heart', text: 'Brutes give up 25% sooner.', max: 3, cost: 8 },
  { id: 'lungs', group: 'dog', icon: '🌬️', name: 'Deep Lungs', text: 'The Big Bark recharges 20% faster.', max: 3, cost: 8 },
  { id: 'booming', group: 'dog', icon: '💥', name: 'Booming Bark', text: 'The Big Bark reaches 15% further.', max: 3, cost: 8 },
  { id: 'nose', group: 'dog', icon: '👃', name: 'Nose for Wolves', text: 'Sneaky wolves show up sooner, and a wolf in sheep\'s clothing is sniffed out twice as fast.', max: 2, cost: 6 },
  { id: 'fetch', group: 'dog', icon: '🎾', name: 'Fetch!', text: 'Bounty tufts last 50% longer and are easier to grab.', max: 2, cost: 6 },
  { id: 'helper', group: 'dog', icon: '🐕', name: 'Second Dog', text: 'A young dog joins you and guards the flock on its own. Slow and easily winded at first: train it with pup upgrades.', max: 1, cost: 40, rare: true },
  { id: 'pupSpeed', group: 'dog', icon: '🐾', name: 'Pup Training', text: 'The second dog runs 10% faster (of your dog\'s speed).', max: 4, cost: 8, requires: 'helper' },
  { id: 'pupBark', group: 'dog', icon: '🔊', name: "Pup's Bark", text: 'The second dog scares wolves from further away.', max: 3, cost: 8, requires: 'helper' },
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

export function modifiers(levels) {
  const l = (id) => levels[id] ?? 0;
  return {
    dogSpeed: 1 + 0.1 * l('swift'),
    barkRange: l('loud'), // added to DOG.threatRadius
    flee: 1 + 0.2 * l('scary'),
    courage: 0.75 ** l('brave'),
    panic: 0.85 ** l('calm'),
    cohesion: 1 + 0.2 * l('herding'),
    spacing: 1 - 0.1 * l('herding'), // × SHEEP.minDistance
    grab: 1 + 0.2 * l('fleece'),
    extraSheep: l('more'),
    lambs: l('lambing'),
    bigBarkCooldown: 0.8 ** l('lungs'),
    whistle: l('whistle') ? 25 - 5 * l('whistle') : 0, // seconds between whistles (0 = none)
    scarecrows: l('scarecrow'),
    helper: l('helper') > 0,
    helperSpeed: 0.55 + 0.1 * l('pupSpeed'), // fraction of the player's dog
    helperThreat: 0.55 + 0.08 * l('pupBark'), // × HELPER.threatRadius
    bigBarkRadius: 1 + 0.15 * l('booming'),
    reveal: 1 + 0.5 * l('nose'), // sneaky wolves' reveal distance
    sniff: 0.5 ** l('nose'), // time to expose a disguise
    tuftLife: 1 + 0.5 * l('fetch'),
    tuftRadius: 1 + 0.3 * l('fetch'),
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
    const weights = pool.map((u) => u.weight ?? (u.rare ? SHOP.rareWeight : 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while (r > weights[i]) r -= weights[i++];
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


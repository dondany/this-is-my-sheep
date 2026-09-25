// Upgrades bought with wool between waves. Each one has levels; `modifiers()` turns the levels
// owned into the multipliers the rest of the game reads (ctx.mods).

export const UPGRADES = [
  // --- Dog
  { id: 'swift', group: 'dog', icon: '⚡', name: 'Swift Paws', text: 'The dog runs and turns 10% faster.', max: 5, cost: 150 },
  { id: 'loud', group: 'dog', icon: '📣', name: 'Loud Bark', text: 'Scares wolves from 12% further away.', max: 5, cost: 165 },
  { id: 'scary', group: 'dog', icon: '😱', name: 'Scary Bark', text: 'Scared wolves run 20% longer before coming back.', max: 3, cost: 135 },
  { id: 'brave', group: 'dog', icon: '🦴', name: 'Brave Heart', text: 'Brutes give up 25% sooner.', max: 3, cost: 180 },
  { id: 'helper', group: 'dog', icon: '🐕', name: 'Second Dog', text: 'A young dog joins you and guards the flock on its own.', max: 1, cost: 525, rare: true },
  // --- Shepherd
  { id: 'calm', group: 'shepherd', icon: '🎶', name: 'Calming Song', text: 'Sheep panic 15% less around wolves.', max: 3, cost: 150 },
  { id: 'herding', group: 'shepherd', icon: '🪄', name: 'Herding Instinct', text: 'The flock sticks together 20% more tightly.', max: 3, cost: 135 },
  { id: 'whistle', group: 'shepherd', icon: '📯', name: "Shepherd's Whistle", text: 'The shepherd whistles the whole flock back to him every 20 s (5 s sooner per level).', max: 3, cost: 330, rare: true },
  { id: 'scarecrow', group: 'shepherd', icon: '🌾', name: 'Scarecrow', text: 'Place a scarecrow that scares off ordinary wolves (not brutes) that come close.', max: 2, cost: 300, rare: true },
  // --- Flock
  { id: 'fleece', group: 'flock', icon: '🧶', name: 'Thick Fleece', text: 'Wolves need 20% longer to take a sheep.', max: 5, cost: 150 },
  { id: 'more', group: 'flock', icon: '🐑', name: 'Bigger Flock', text: '+2 sheep join every wave.', max: 3, cost: 120 },
  { id: 'lambing', group: 'flock', icon: '🍼', name: 'Lambing Season', text: '+1 lamb every wave (they pay double).', max: 2, cost: 135 },
];

export const UPGRADE = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export const SHOP = {
  cards: 3,
  levelCostGrowth: 1, // each level costs the base price more than the last
  reroll: 25, // first reroll of a wave; each further reroll costs this much more
  rareWeight: 0.35, // how often rare cards come up relative to common ones
};

export function cost(upgrade, level) {
  return Math.round((upgrade.cost * (1 + SHOP.levelCostGrowth * level)) / 5) * 5;
}

export function modifiers(levels) {
  const l = (id) => levels[id] ?? 0;
  return {
    dogSpeed: 1 + 0.1 * l('swift'),
    threat: 1 + 0.12 * l('loud'),
    flee: 1 + 0.2 * l('scary'),
    courage: 0.75 ** l('brave'),
    panic: 0.85 ** l('calm'),
    cohesion: 1 + 0.2 * l('herding'),
    grab: 1 + 0.2 * l('fleece'),
    extraSheep: 2 * l('more'),
    lambs: l('lambing'),
    whistle: l('whistle') ? 25 - 5 * l('whistle') : 0, // seconds between whistles (0 = none)
    scarecrows: l('scarecrow'),
    helper: l('helper') > 0,
  };
}

// Up to `n` different upgrades that aren't maxed out yet, rare ones less often.
export function drawCards(levels, n = SHOP.cards) {
  const pool = UPGRADES.filter((u) => (levels[u.id] ?? 0) < u.max);
  const cards = [];
  while (cards.length < n && pool.length) {
    const weights = pool.map((u) => (u.rare ? SHOP.rareWeight : 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while (r > weights[i]) r -= weights[i++];
    cards.push(pool.splice(i, 1)[0].id);
  }
  return cards;
}

// Everything bought with wool in the end-of-wave shop, Balatro style. Charms are the jokers: hung on
// the dog's collar (up to 5), they make the build. Training cards are the planet cards: used up on
// the spot, each one raises one of the dog's stats by a level for the rest of the run. Livestock
// joins the flock. `modifiers()` turns charms and training into the multipliers the rest of the
// game reads (ctx.mods).

import { SPECIAL, BARK } from './config.js';

// --- Training (the dog's levels) ------------------------------------------------------
// `per` is what one level adds and `max` the highest level. Each level costs more than the last.
// `requires` keeps a card out of the shop until that charm is on the collar.

const pct = (v) => `${Math.round(v * 100)}%`;
export const TRAINING = [
  { id: 'swift', icon: '⚡', name: 'Sprints', stat: 'Speed', per: 0.08, max: 8, text: (v) => `The dog runs and turns ${pct(v)} faster.` },
  { id: 'loud', icon: '🎯', name: 'Reach', stat: 'Reach', per: 0.5, max: 10, weight: 2, text: (v) => `Reach +${v}: wolves get scared and sheep herded from further away.` },
  { id: 'scary', icon: '😱', name: 'Stare Down', stat: 'Scare', per: 0.15, max: 6, text: (v) => `Scared wolves stay away ${pct(v)} longer.` },
  { id: 'brave', icon: '🦴', name: 'Brave Heart', stat: 'Grit', per: 0.12, max: 6, text: (v) => `Brutes and the boss give up ${pct(v)} sooner.` },
  { id: 'nose', icon: '👃', name: 'Nose Work', stat: 'Nose', per: 0.25, max: 4, text: (v) => `Sneaky wolves show up ${pct(v)} sooner and disguises are sniffed out faster.` },
  { id: 'pupSpeed', icon: '🐾', name: 'Pup Sprints', stat: 'Pup speed', per: 0.05, max: 8, requires: 'helper', text: (v) => `The second dog runs ${pct(v)} faster (of your dog's speed).` },
  { id: 'pupBark', icon: '🔊', name: "Pup's Bark", stat: 'Pup reach', per: 0.04, max: 8, requires: 'helper', text: (v) => `The second dog's reach +${pct(v)}.` },
];

export const TRAIN = Object.fromEntries(TRAINING.map((t) => [t.id, t]));

// The price of the next level: `base` + `step` per level already trained.
export const TRAINING_PRICE = { base: 5, step: 3 };

export function trainingPrice(id, level) {
  return TRAINING_PRICE.base + TRAINING_PRICE.step * level;
}

// The effect of `levels` levels of a training, as shown on its card.
export function trainingText(id, levels = 1) {
  const t = TRAIN[id];
  return t.text(Math.round(t.per * levels * 100) / 100);
}

// One training card the dog can still take (not maxed, requirement on the collar), Reach twice as
// often; null if none.
export function drawTraining(levels, charms, exclude = []) {
  const pool = TRAINING.filter((t) => (levels[t.id] ?? 0) < t.max && (!t.requires || charms.includes(t.requires)) && !exclude.includes(t.id));
  if (!pool.length) return null;
  return pool[pickWeighted(pool.map((t) => t.weight ?? 1))].id;
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
  // --- Dog: the Second Dog and the rule changes for your own dog
  { id: 'zoomies', group: 'dog', icon: '🏃', name: 'Zoomies', rarity: 'rare', price: 20, text: '+40% speed. Dashing through a wolf at full speed scares it, brutes included.', catch: '-30% reach.' },
  { id: 'nightWatch', group: 'dog', icon: '🌙', name: 'Night Watch', rarity: 'rare', price: 20, text: 'Reach ×1.8.', catch: '-30% speed.' },
  { id: 'sentinel', group: 'dog', icon: '🗿', name: 'Sentinel', rarity: 'uncommon', price: 14, text: "Standing still, the dog's reach grows to ×2 over 2 s.", catch: '-20% reach while moving.' },
  { id: 'hotStreak', group: 'dog', icon: '🔥', name: 'Hot Streak', rarity: 'uncommon', price: 14, text: 'Every combo step gives +6% speed and reach until the chain breaks (up to +30%).', catch: 'The combo window is 30% shorter.' },
  { id: 'alphaDog', group: 'dog', icon: '🐺', name: 'Alpha Dog', rarity: 'rare', price: 22, text: "Plain wolves and pups flee on sight, from 1.8× the dog's reach.", catch: 'Brutes and the boss hold out 50% longer.' },
  { id: 'helper', group: 'dog', icon: '🐕', name: 'Second Dog', rarity: 'rare', price: 35, text: 'A young dog joins you and guards the flock on its own. Slow and easily winded at first: Pup Sprints and Pup\'s Bark training make it better.' },
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
  // --- Tricks: charms that change the rules, each with a catch
  { id: 'proud', group: 'trick', icon: '🏆', name: 'Proud Shepherd', rarity: 'uncommon', price: 14, text: 'Every combo that reaches ×3 makes the shepherd prouder: +8% wool from that wave\'s shearing (up to +80%).' },
  { id: 'goldenChild', group: 'trick', icon: '✨', name: 'Golden Child', rarity: 'rare', price: 22, text: 'A golden fleece (10 wool a wave) joins every wave.', catch: 'Every wolf wants them.' },
  // --- Bark: charms that make the dog let out Big Barks (there's no manual one)
  { id: 'watchdog', group: 'bark', icon: '📢', name: 'Watchdog', rarity: 'common', price: 8, text: 'The dog lets out a Big Bark every 15 s: every wolf nearby flees, brutes included.' },
  { id: 'shortFuse', group: 'bark', icon: '🧨', name: 'Short Fuse', rarity: 'common', price: 6, requires: 'watchdog', text: "Watchdog's Big Barks come twice as often.", catch: 'Big Barks reach 40% less far.' },
  { id: 'booming', group: 'bark', icon: '💥', name: 'Booming Bark', rarity: 'common', price: 8, text: 'Big Barks reach 40% further.' },
  { id: 'alarm', group: 'bark', icon: '🔔', name: 'Alarm Bell', rarity: 'uncommon', price: 12, text: 'A Big Bark whenever a wolf grabs a sheep near the dog.' },
  { id: 'comboBark', group: 'bark', icon: '⚡', name: 'Combo Bark', rarity: 'uncommon', price: 14, text: 'Every ×4 combo sets off a Big Bark.' },
  { id: 'howlBack', group: 'bark', icon: '😤', name: 'Howl Back', rarity: 'uncommon', price: 10, text: 'The dog barks back at every howl: the howler flees before the flock panics.' },
  { id: 'echo', group: 'bark', icon: '🗣️', name: 'Echo', rarity: 'rare', price: 20, text: 'Every Big Bark echoes from the shepherd a second later.' },
  { id: 'thunder', group: 'bark', icon: '🌩️', name: 'Thunderclap', rarity: 'rare', price: 24, text: 'Big Barks knock wolves dizzy for a moment, then they run twice as far.' },
  { id: 'pentUp', group: 'bark', icon: '🔋', name: 'Pent Up', rarity: 'rare', price: 22, text: 'Every 4th Big Bark is a Mega Bark: double the range, and it calms the whole flock.' },
  { id: 'lastLight', group: 'bark', icon: '🕯️', name: 'Last Light', rarity: 'uncommon', price: 12, text: 'On the line, a Big Bark every 4 s.' },
  { id: 'horn', group: 'bark', icon: '📯', name: 'Herding Horn', rarity: 'common', price: 10, text: 'The Big Bark calls every sheep in its range to the dog instead of startling them.', catch: 'Wolves only flee from half the range.' },
  { id: 'chain', group: 'trick', icon: '💥', name: 'Chain Reaction', rarity: 'rare', price: 20, text: 'A fleeing wolf scares every wolf it runs past (not the boss). Each one extends the combo.', catch: 'Scared wolves come back 30% sooner.' },
  { id: 'brink', group: 'trick', icon: '❤️‍🔥', name: 'On the Brink', rarity: 'uncommon', price: 12, text: 'Last Sheep Standing starts one sheep above the line and is twice as strong.', catch: 'The shepherd spares one sheep fewer.' },
  { id: 'veteran', group: 'trick', icon: '📈', name: 'Veteran', rarity: 'uncommon', price: 14, text: 'Every wave you finish without losing a sheep gives the dog +5% reach, for good.', catch: 'Losing 3 or more sheep in a wave resets it.' },
  { id: 'stayPut', group: 'trick', icon: '🏕️', name: 'Staying Put', rarity: 'common', price: 8, text: 'The shepherd never moves the flock to new grass.', catch: 'Wolves learn the spot: they stalk 30% less.' },
];

export const CHARM = Object.fromEntries(CHARMS.map((c) => [c.id, c]));

export const SHOP = {
  charms: 2, // charm cards in each shop (plus one training card and one animal)
  slots: 5, // charms on the collar at once
  sellBack: 0.5, // a sold charm returns this share of its price
  reroll: 2, // first reroll of a wave; each further reroll costs this much more
  rarityWeight: { common: 1, uncommon: 0.6, rare: 0.35 }, // how often each rarity is offered
  maxFrozen: 2, // cards you can freeze to keep them for the next wave's shop
};

export function modifiers(charms = [], training = {}) {
  const has = (id) => charms.includes(id);
  const t = (id) => (training[id] ?? 0) * TRAIN[id].per; // a training's total effect
  return {
    // Training
    dogSpeed: (1 + t('swift')) * (has('zoomies') ? SPECIAL.zoomies.speed : 1) * (has('nightWatch') ? SPECIAL.nightWatch.speed : 1),
    barkRange: t('loud'), // added to DOG.threatRadius
    flee: (1 + t('scary')) * (has('chain') ? 0.7 : 1),
    courage: (1 - Math.min(0.75, t('brave'))) * (has('alphaDog') ? SPECIAL.alphaDog.courage : 1),
    reveal: 1 + t('nose'), // sneaky wolves' reveal distance
    sniff: 1 / (1 + 2 * t('nose')), // time to expose a disguise
    helperSpeed: 0.55 + t('pupSpeed'), // fraction of the player's dog
    helperThreat: 0.55 + t('pupBark'), // × HELPER.threatRadius
    // Big Barks: which charms set them off, and how far they reach
    barkEvery: has('watchdog') ? BARK.watchdog / (has('shortFuse') ? 2 : 1) : 0, // seconds between timed barks (0 = none)
    bigBarkRadius: (has('booming') ? 1.4 : 1) * (has('shortFuse') ? 0.6 : 1),
    alarm: has('alarm'),
    comboBark: has('comboBark') ? 4 : 0, // a Big Bark every this many combo steps
    howlBack: has('howlBack'),
    echo: has('echo'),
    thunder: has('thunder'),
    pentUp: has('pentUp') ? 4 : 0, // every this many Big Barks is a Mega Bark
    lastLight: has('lastLight') ? BARK.lastLight : 0, // seconds between Big Barks on the line
    // Charms: your dog
    reachScale: (has('zoomies') ? SPECIAL.zoomies.reach : 1) * (has('nightWatch') ? SPECIAL.nightWatch.reach : 1),
    zoomies: has('zoomies'),
    sentinel: has('sentinel'),
    hotStreak: has('hotStreak'),
    comboWindow: has('hotStreak') ? SPECIAL.hotStreak.window : 1,
    alphaDog: has('alphaDog'),
    // Charms: helpers, the shepherd, the flock
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
    // Charms: tricks
    proud: has('proud') ? 0.08 : 0, // extra shearing per ×3 combo this wave (up to 10 of them)
    extraGolden: has('goldenChild') ? 1 : 0,
    horn: has('horn'),
    chain: has('chain') ? 2.5 : 0, // how close a fleeing wolf must pass to scare another
    brink: has('brink'),
    veteran: has('veteran'),
    stayPut: has('stayPut'),
    stalk: has('stayPut') ? 0.7 : 1, // × wolves' stalking time
  };
}

// Up to `n` different charms not on the collar yet (and not in `exclude`), rarer ones less often.
// `requires` keeps a charm out until another one is on the collar.
export function drawCards(owned, n = SHOP.charms, exclude = []) {
  const pool = CHARMS.filter((c) => !owned.includes(c.id) && !exclude.includes(c.id) && (!c.requires || owned.includes(c.requires)));
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


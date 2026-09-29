// Everything bought with wool at the end of a wave. Charms are the jokers: cards in the shop, hung on
// the dog's collar (up to 5), they make the build. The dog's stats are upgraded directly in the shop's
// sidebar, a level at a time, each level costing more. Livestock joins the flock. `modifiers()` turns
// charms and the dog's levels into the multipliers the rest of the game reads (ctx.mods).

import { SPECIAL, BARK } from './config.js';

// --- The dog's stats ---------------------------------------------------------------------
// `per` is what one level adds and `max` the highest level. Each level costs more than the last.
// `requires` hides a stat until that charm is on the collar (the pup's stats need the Second Dog).

const pct = (v) => `${Math.round(v * 100)}%`;
export const TRAINING = [
  { id: 'swift', icon: '⚡', name: 'Speed', stat: 'Speed', unit: '%', per: 0.08, max: 5, text: (v) => `The dog runs and turns ${pct(v)} faster.` },
  { id: 'loud', icon: '🎯', name: 'Reach', stat: 'Reach', unit: '', per: 0.5, max: 5, text: (v) => `Reach +${v}: wolves get scared and sheep herded from further away.` },
  { id: 'scary', icon: '😱', name: 'Scare', stat: 'Scare', unit: '%', per: 0.15, max: 5, text: (v) => `Scared wolves stay away ${pct(v)} longer.` },
  { id: 'brave', icon: '🦴', name: 'Grit', stat: 'Grit', unit: '%', per: 0.12, max: 5, text: (v) => `Brutes and the boss give up ${pct(v)} sooner.` },
  { id: 'nose', icon: '👃', name: 'Nose', stat: 'Nose', unit: '%', per: 0.25, max: 5, text: (v) => `Sneaky wolves show up ${pct(v)} sooner and disguises are sniffed out faster.` },
  { id: 'pupSpeed', icon: '🐾', name: 'Pup speed', stat: 'Pup speed', unit: '%', per: 0.08, max: 5, requires: 'helper', priceScale: 1.5, text: (v) => `The second dog runs ${pct(v)} faster (of your dog's speed).` },
  { id: 'pupBark', icon: '🔊', name: 'Pup reach', stat: 'Pup reach', unit: '%', per: 0.08, max: 5, requires: 'helper', priceScale: 1.5, text: (v) => `The second dog's reach +${pct(v)}.` },
];

export const TRAIN = Object.fromEntries(TRAINING.map((t) => [t.id, t]));

// The price of the next level: `base`, doubling with every level already bought (15, 30, 60, 120,
// 240), so maxing everything is out of reach and each level is a choice.
export const TRAINING_PRICE = { base: 15, growth: 2 };

export function trainingPrice(id, level) {
  return Math.round(TRAINING_PRICE.base * TRAINING_PRICE.growth ** level * (TRAIN[id].priceScale ?? 1)); // the pup's stats cost more
}

// A stat's bonus at `levels` levels, short: "+20%" or "+1.2".
export function trainingValue(id, levels) {
  const t = TRAIN[id];
  const v = t.per * levels;
  return t.unit === '%' ? `+${Math.round(v * 100)}%` : `+${Math.round(v * 10) / 10}`;
}

// The effect of `levels` levels of a training, as a sentence.
export function trainingText(id, levels = 1) {
  const t = TRAIN[id];
  return t.text(Math.round(t.per * levels * 100) / 100);
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
  { id: 'nightWatch', group: 'dog', icon: '🌙', name: 'Night Watch', rarity: 'rare', price: 20, text: 'Reach ×2.', catch: '-20% speed.' },
  { id: 'sentinel', group: 'dog', icon: '🗿', name: 'Sentinel', rarity: 'uncommon', price: 14, text: "Standing still, the dog's reach grows to ×2 over 1.2 s.", catch: '-20% reach while moving.' },
  { id: 'hotStreak', group: 'dog', icon: '🔥', name: 'Hot Streak', rarity: 'uncommon', price: 14, text: 'Every combo step gives +6% speed and reach until the chain breaks (up to +30%).', catch: 'The combo window is 30% shorter.' },
  { id: 'alphaDog', group: 'dog', icon: '🐺', name: 'Alpha Dog', rarity: 'rare', price: 22, text: "Plain wolves and pups flee on sight, from 1.8× the dog's reach.", catch: 'Brutes and the boss hold out 50% longer.' },
  { id: 'tracker', group: 'dog', icon: '🐾', name: 'Tracker', rarity: 'common', price: 8, text: 'The dog runs 20% faster while a wolf is going for the flock.', catch: '10% slower the rest of the time.' },
  { id: 'helper', group: 'dog', icon: '🐕', name: 'Second Dog', rarity: 'rare', price: 40, text: 'A young dog joins you and guards the flock on its own. Slow and easily winded at first: upgrade its speed and reach in the shop.' },
  { id: 'chorus', group: 'dog', icon: '🎵', name: 'Chorus', rarity: 'uncommon', price: 12, requires: 'helper', text: 'The second dog lets out a Big Bark of its own (60% of the range) whenever yours does.' },
  // --- Shepherd
  { id: 'crook', group: 'shepherd', icon: '🦯', name: "Shepherd's Crook", rarity: 'common', price: 10, text: 'The shepherd swats wolves that come within 3.5 units of him.' },
  { id: 'calm', group: 'shepherd', icon: '🎶', name: 'Calming Song', rarity: 'common', price: 8, text: 'Sheep panic 35% less around wolves.' },
  { id: 'herding', group: 'shepherd', icon: '🪄', name: 'Herding Instinct', rarity: 'common', price: 8, text: 'The flock sticks together 40% more tightly, and sheep can stand 20% closer to each other.' },
  { id: 'whistle', group: 'shepherd', icon: '📯', name: "Shepherd's Whistle", rarity: 'rare', price: 20, text: 'Every 20 s the shepherd whistles the whole flock back to him.' },
  { id: 'scarecrow', group: 'shepherd', icon: '🌾', name: 'Scarecrows', rarity: 'rare', price: 20, text: 'Place two scarecrows that scare off ordinary wolves (not brutes). They go if you sell this charm.' },
  { id: 'grumpy', group: 'shepherd', icon: '👴', name: 'Grumpy Old Man', rarity: 'uncommon', price: 14, text: 'The shepherd goes after wolves near the flock himself and swats them with his crook.', catch: 'The flock trails after him.' },
  { id: 'snares', group: 'shepherd', icon: '🪤', name: 'Snares', rarity: 'uncommon', price: 12, requires: 'scarecrow', text: 'Each scarecrow holds the first wolf that comes near it every wave for 5 s.' },
  // --- Flock
  { id: 'fleece', group: 'flock', icon: '🧶', name: 'Thick Fleece', rarity: 'uncommon', price: 14, text: 'Wolves need 90% longer to take a sheep.' },
  { id: 'more', group: 'flock', icon: '🐑', name: 'Bigger Flock', rarity: 'common', price: 8, text: '+3 sheep join every wave.' },
  { id: 'lambing', group: 'flock', icon: '🍼', name: 'Lambing Season', rarity: 'common', price: 8, text: '+3 lambs every wave (they pay double).' },
  { id: 'shears', group: 'flock', icon: '✂️', name: 'Sharp Shears', rarity: 'uncommon', price: 12, text: '+30% wool from shearing.' },
  { id: 'piggy', group: 'flock', icon: '🐷', name: 'Piggy Bank', rarity: 'common', price: 8, text: 'Interest on unspent wool can go 3 higher.' },
  { id: 'rams', group: 'flock', icon: '🐏', name: 'Battering Rams', rarity: 'uncommon', price: 14, text: 'Rams head-butt wolves that come near them, like the goat. A ram joins every 4 waves.', catch: 'Rams give no wool.' },
  { id: 'safety', group: 'flock', icon: '🛡️', name: 'Safety in Numbers', rarity: 'uncommon', price: 14, text: "Wolves can't take a sheep that has 4 or more others close around it.", catch: 'Stragglers (fewer than 2 close by) are taken twice as fast.' },
  { id: 'oath', group: 'flock', icon: '🤞', name: "Sheepdog's Oath", rarity: 'rare', price: 22, text: 'The first three times a wolf grabs a sheep each wave, it lets go and runs.' },
  { id: 'bellCall', group: 'flock', icon: '🔔', name: "Bellwether's Call", rarity: 'uncommon', price: 12, text: 'A bellwether joins the flock (if there isn\'t one), and its bell rings twice as often and reaches 50% further.' },
  { id: 'pastures', group: 'flock', icon: '🌻', name: 'Greener Pastures', rarity: 'uncommon', price: 12, text: 'Calm sheep take wolves 60% longer to grab, and the calm bonus at shearing is doubled.' },
  { id: 'strength', group: 'flock', icon: '💪', name: 'Strength in Numbers', rarity: 'rare', price: 22, text: 'The dog gets +1% speed and reach for every sheep in the flock (up to +50%).' },
  // --- Wool: the shop and shearing (wool only ever comes from the flock)
  { id: 'nestEgg', group: 'wool', icon: '🥚', name: 'Nest Egg', rarity: 'common', price: 4, text: 'Sells for 4 more wool for every wave it stays on the collar.' },
  { id: 'haggler', group: 'wool', icon: '🏷️', name: 'Haggler', rarity: 'uncommon', price: 12, text: 'Everything in the shop costs 30% less, and rerolls always cost 1.' },
  { id: 'market', group: 'wool', icon: '🧺', name: 'Wool Market', rarity: 'uncommon', price: 10, text: 'Animals cost half, and the shop offers two of them.' },
  { id: 'savings', group: 'wool', icon: '🏦', name: 'Savings Account', rarity: 'rare', price: 18, text: 'Interest on unspent wool has no cap.', catch: "You can't reroll the shop." },
  { id: 'wellFed', group: 'wool', icon: '🍖', name: 'Well Fed', rarity: 'uncommon', price: 14, text: 'The dog gets +1% speed and reach for every 4 wool you keep unspent (up to +60%).' },
  { id: 'fair', group: 'wool', icon: '🎪', name: 'County Fair', rarity: 'rare', price: 20, text: 'Shearing pays +1 wool for every 2 sheep, and +5 for a wave with no losses.' },
  // --- Edge: risk for reward
  { id: 'blood', group: 'edge', icon: '🩸', name: 'Blood Price', rarity: 'uncommon', price: 10, text: 'Every sheep lost leaves its fleece behind: +3 wool each at shearing.', catch: 'Sheep panic 25% more.' },
  { id: 'double', group: 'edge', icon: '🎲', name: 'Double or Nothing', rarity: 'common', price: 6, text: 'A wave with no losses shears double.', catch: 'Any loss and it shears half.' },
  { id: 'wolfMoon', group: 'edge', icon: '🌑', name: 'Wolf Moon', rarity: 'rare', price: 18, text: 'Shearing pays 40% more.', catch: 'One more wolf every wave.' },
  // --- Collar: slots and position
  { id: 'mimic', group: 'collar', icon: '🪞', name: 'Mimic Bell', rarity: 'legendary', price: 40, text: 'Copies the charm to its right (drag charms along the collar to reorder them). Charms with a number stack; the rest can\'t be doubled.' },
  { id: 'lucky', group: 'collar', icon: '🍀', name: 'Lucky Collar', rarity: 'uncommon', price: 10, text: 'Rare and legendary charms, and augments, turn up twice as often.' },
  { id: 'pack', group: 'collar', icon: '🧠', name: 'Pack Mentality', rarity: 'rare', price: 24, text: 'Copies the leftmost charm on the collar. Charms with a number stack; the rest can\'t be doubled.' },
  { id: 'loneDog', group: 'collar', icon: '🎯', name: 'Lone Dog', rarity: 'uncommon', price: 12, text: '+12% speed and reach for every empty collar slot (its own counts).' },
  { id: 'oldScar', group: 'collar', icon: '🗡️', name: 'Old Scar', rarity: 'rare', price: 18, text: 'At the start of every wave it destroys the charm to its right and gains +5% reach for good for every 10 wool that charm cost.' },
  { id: 'buddy', group: 'collar', icon: '🔗', name: 'Buddy System', rarity: 'uncommon', price: 12, text: '+8% speed and reach for every charm in your biggest group (bark, flock, shepherd…) beyond the first.' },
  // --- Decaying: strong now, less every wave, then gone
  { id: 'freshBone', group: 'dog', icon: '🥩', name: 'Fresh Bone', rarity: 'common', price: 6, text: '+40% reach, 8% less every wave; gone after 5 waves.' },
  { id: 'snack', group: 'dog', icon: '🍿', name: 'Snack Pack', rarity: 'common', price: 6, text: '+40% speed, 8% less every wave; gone after 5 waves.' },
  { id: 'fizzy', group: 'flock', icon: '🥤', name: 'Fizzy Water', rarity: 'common', price: 8, text: 'Wolves need twice as long to take a sheep, for the next 3 waves. Then it\'s gone.' },
  // --- Growing: better the more you do it
  { id: 'trophy', group: 'dog', icon: '🎖️', name: 'Trophy Wall', rarity: 'uncommon', price: 12, text: '+1% reach for every 10 wolves scared this run (up to +40%).' },
  { id: 'campfire', group: 'dog', icon: '🔥', name: 'Campfire', rarity: 'uncommon', price: 12, text: '+8% speed for every charm you sell (up to +48%). Burns out after the boss.' },
  { id: 'nightOwl', group: 'dog', icon: '🦉', name: 'Night Owl', rarity: 'common', price: 8, text: '+25% reach in the second half of every wave.' },
  // --- More for the bark and the shepherd
  { id: 'barkCollector', group: 'bark', icon: '📣', name: 'Bark Collector', rarity: 'uncommon', price: 10, text: 'Big Barks reach 10% further for every bark charm on the collar.' },
  { id: 'magnet', group: 'bark', icon: '🧲', name: 'Magnet Collar', rarity: 'common', price: 8, text: 'Big Barks also send straying sheep back to the flock.' },
  { id: 'luckyBone', group: 'shepherd', icon: '🦴', name: 'Lucky Bone', rarity: 'rare', price: 18, text: 'Once, when the flock drops below the line, the shepherd lets it go. Then the bone breaks.' },
  { id: 'favor', group: 'shepherd', icon: '🙏', name: "Shepherd's Favor", rarity: 'uncommon', price: 12, text: 'The shepherd spares 2 more sheep every wave.', catch: 'Shearing pays 25% less.' },
  { id: 'supper', group: 'shepherd', icon: '⏳', name: 'Early Supper', rarity: 'common', price: 6, text: 'Waves are 20% shorter.', catch: 'Shearing pays 20% less.' },
  // --- More for the wool
  { id: 'marketDay', group: 'wool', icon: '🚀', name: 'Market Day', rarity: 'uncommon', price: 10, text: '+1 wool at shearing, and 1 more for every 2 waves it stays on the collar.' },
  { id: 'dice', group: 'wool', icon: '🎲', name: 'Loaded Dice', rarity: 'common', price: 6, text: 'The first reroll in every shop is free.' },
  { id: 'polish', group: 'wool', icon: '🎁', name: 'Collar Polish', rarity: 'uncommon', price: 8, text: 'Every wave, your other charms sell for 1 more.' },
  // --- Tricks: charms that change the rules, each with a catch
  { id: 'proud', group: 'trick', icon: '🏆', name: 'Proud Shepherd', rarity: 'uncommon', price: 14, text: 'Every combo that reaches ×3 makes the shepherd prouder: +8% wool from that wave\'s shearing (up to +80%).' },
  { id: 'goldenChild', group: 'trick', icon: '✨', name: 'Golden Child', rarity: 'rare', price: 22, text: 'A golden fleece (10 wool a wave) joins every wave.', catch: 'Every wolf wants them.' },
  // --- Bark: charms that make the dog let out Big Barks (there's no manual one)
  { id: 'watchdog', group: 'bark', icon: '📢', name: 'Watchdog', rarity: 'common', price: 8, text: 'The dog lets out a Big Bark every 8 s: every wolf nearby flees, brutes included, and stays away 60% longer.' },
  { id: 'shortFuse', group: 'bark', icon: '🧨', name: 'Short Fuse', rarity: 'common', price: 6, requires: 'watchdog', text: "Watchdog's Big Barks come twice as often.", catch: 'Big Barks reach 40% less far.' },
  { id: 'booming', group: 'bark', icon: '💥', name: 'Booming Bark', rarity: 'common', price: 8, text: 'Big Barks reach 40% further.' },
  { id: 'alarm', group: 'bark', icon: '🔔', name: 'Alarm Bell', rarity: 'uncommon', price: 12, text: 'A Big Bark whenever a wolf grabs a sheep (at most every 2 s).' },
  { id: 'comboBark', group: 'bark', icon: '⚡', name: 'Combo Bark', rarity: 'uncommon', price: 14, text: 'Every ×4 combo sets off a Big Bark.' },
  { id: 'howlBack', group: 'bark', icon: '😤', name: 'Howl Back', rarity: 'uncommon', price: 10, text: 'The dog barks back at every howl: the howler flees before the flock panics.' },
  { id: 'echo', group: 'bark', icon: '🗣️', name: 'Echo', rarity: 'rare', price: 20, text: 'Every Big Bark echoes from the shepherd a second later.' },
  { id: 'thunder', group: 'bark', icon: '🌩️', name: 'Thunderclap', rarity: 'rare', price: 24, text: 'Big Barks knock wolves dizzy for a moment, then they run twice as far.' },
  { id: 'pentUp', group: 'bark', icon: '🔋', name: 'Pent Up', rarity: 'rare', price: 22, text: 'Every 4th Big Bark is a Mega Bark: double the range, and it calms the whole flock.' },
  { id: 'lastLight', group: 'bark', icon: '🕯️', name: 'Last Light', rarity: 'uncommon', price: 12, text: 'On the line, a Big Bark every 5 s.' },
  { id: 'horn', group: 'bark', icon: '📯', name: 'Herding Horn', rarity: 'common', price: 10, text: 'The Big Bark calls every sheep in its range to the dog instead of startling them.', catch: 'Wolves only flee from half the range.' },
  { id: 'chain', group: 'trick', icon: '💥', name: 'Chain Reaction', rarity: 'rare', price: 20, text: 'A fleeing wolf scares every wolf it runs past (not the boss). Each one extends the combo.', catch: 'Scared wolves come back 30% sooner.' },
  { id: 'brink', group: 'trick', icon: '❤️‍🔥', name: 'On the Brink', rarity: 'uncommon', price: 12, text: 'Last Sheep Standing starts one sheep above the line and is twice as strong.', catch: 'The shepherd spares one sheep fewer.' },
  { id: 'veteran', group: 'trick', icon: '📈', name: 'Veteran', rarity: 'uncommon', price: 14, text: 'Every wave you finish without losing a sheep gives the dog +5% reach, for good.', catch: 'Losing 3 or more sheep in a wave resets it.' },
  { id: 'stayPut', group: 'trick', icon: '🏕️', name: 'Staying Put', rarity: 'common', price: 8, text: 'The shepherd never moves the flock to new grass.', catch: 'Wolves learn the spot: they stalk 30% less.' },
];

export const CHARM = Object.fromEntries(CHARMS.map((c) => [c.id, c]));

// Augments (Balatro's editions): a rare extra on a charm card in the shop, kept for the run. `chance`
// is per card, `price` the extra cost. Ghostly is the only way to get more collar slots.
export const AUGMENTS = {
  ghostly: { icon: '🌫️', name: 'Ghostly', chance: 0.03, price: 0.5, text: 'Takes no collar slot.' },
  gilded: { icon: '✨', name: 'Gilded', chance: 0.06, price: 0.3, text: '+2 wool at every shearing, and sells for its full price.' },
  polished: { icon: '🌈', name: 'Polished', chance: 0.02, price: 0.8, text: 'Counts twice (like a Mimic Bell copy), plus 5% speed and reach.' },
  blessed: { icon: '🕊️', name: 'Blessed', chance: 0.02, price: 0.5, text: 'Once, when the flock drops below the line, the shepherd lets it go. Then the blessing wears off.' },
};

// Maybe an augment for a charm card (Lucky Collar doubles the chances per copy).
export function rollAugment(lucky = 0) {
  let r = Math.random();
  for (const [id, a] of Object.entries(AUGMENTS)) {
    if ((r -= a.chance * 2 ** lucky) < 0) return id;
  }
  return null;
}

export const SHOP = {
  charms: 2, // charm cards in each shop (plus one animal)
  slots: 5, // charms on the collar at once
  sellBack: 0.5, // a sold charm returns this share of its price
  reroll: 2, // first reroll of a wave; each further reroll costs this much more
  rarityWeight: { common: 1, uncommon: 0.6, rare: 0.35, legendary: 0.06 }, // how often each rarity is offered
  maxFrozen: 2, // cards you can freeze to keep them for the next wave's shop
};

// The collar as it counts: every charm, plus a copy of whatever sits right of a Mimic Bell, of the
// leftmost charm for Pack Mentality, and of every Polished charm.
const COPIERS = new Set(['mimic', 'pack']);
export function effectiveCharms(charms, augments = {}) {
  const eff = [...charms];
  charms.forEach((c, i) => {
    const next = charms[i + 1];
    if (c === 'mimic' && next && !COPIERS.has(next)) eff.push(next);
    if (c === 'pack' && !COPIERS.has(charms[0])) eff.push(charms[0]);
    if (augments[c] === 'polished') eff.push(c);
  });
  return eff;
}

export function modifiers(charms = [], training = {}, augments = {}) {
  const eff = effectiveCharms(charms, augments);
  const n = (id) => eff.filter((c) => c === id).length; // copies (a Mimic Bell makes two)
  const has = (id) => n(id) > 0;
  const pow = (id, k) => k ** n(id); // multiplicative charms stack by multiplying again
  const t = (id) => (training[id] ?? 0) * TRAIN[id].per; // a training's total effect
  return {
    // Training, and the dog's own charms
    dogSpeed: (1 + t('swift')) * pow('zoomies', SPECIAL.zoomies.speed) * pow('nightWatch', SPECIAL.nightWatch.speed),
    barkRange: t('loud'), // added to DOG.threatRadius
    reachScale: pow('zoomies', SPECIAL.zoomies.reach) * pow('nightWatch', SPECIAL.nightWatch.reach),
    flee: (1 + t('scary')) * pow('chain', 0.7),
    courage: (1 - Math.min(0.75, t('brave'))) * pow('alphaDog', SPECIAL.alphaDog.courage),
    reveal: 1 + t('nose'), // sneaky wolves' reveal distance
    sniff: 1 / (1 + 2 * t('nose')), // time to expose a disguise
    helperSpeed: 0.5 + t('pupSpeed'), // fraction of the player's dog
    helperThreat: 0.5 + t('pupBark'), // × HELPER.threatRadius
    zoomies: has('zoomies'),
    sentinel: n('sentinel'), // standing reach grows to ×(1 + this)
    hotStreak: n('hotStreak'), // × the per-step boost
    comboWindow: pow('hotStreak', SPECIAL.hotStreak.window),
    alphaDog: has('alphaDog'),
    tracker: n('tracker'),
    // Big Barks: which charms set them off, and how far they reach
    barkEvery: has('watchdog') ? BARK.watchdog / n('watchdog') / 2 ** n('shortFuse') : 0, // seconds between timed barks (0 = none)
    bigBarkRadius: pow('booming', 1.4) * pow('shortFuse', 0.6) * (1 + 0.1 * n('barkCollector') * eff.filter((c) => CHARM[c]?.group === 'bark').length),
    magnet: has('magnet'),
    alarm: has('alarm'),
    comboBark: has('comboBark') ? Math.max(2, 5 - n('comboBark')) : 0, // a Big Bark every this many combo steps
    howlBack: has('howlBack'),
    echo: has('echo'),
    thunder: has('thunder'),
    pentUp: has('pentUp') ? Math.max(2, 5 - n('pentUp')) : 0, // every this many Big Barks is a Mega Bark
    lastLight: has('lastLight') ? BARK.lastLight / n('lastLight') : 0, // seconds between Big Barks on the line
    horn: has('horn'),
    // Helpers and the shepherd
    helper: has('helper'),
    chorus: has('chorus'),
    crook: has('crook') ? 1.5 + 2 * n('crook') : has('grumpy') ? 3 : 0, // shepherd's swat radius (0 = none)
    grumpy: has('grumpy'),
    whistle: has('whistle') ? 20 / n('whistle') : 0, // seconds between whistles (0 = none)
    scarecrows: 2 * n('scarecrow'),
    snares: has('snares'),
    stayPut: has('stayPut'),
    stalk: pow('stayPut', 0.7), // × wolves' stalking time
    // The flock
    panic: pow('calm', 0.65) * pow('blood', 1.25),
    cohesion: 1 + 0.4 * n('herding'),
    spacing: pow('herding', 0.8), // × SHEEP.minDistance
    grab: (1 + 0.9 * n('fleece')) * 2 ** n('fizzy'),
    extraSheep: 3 * n('more'),
    lambs: 3 * n('lambing'),
    extraGolden: n('goldenChild'),
    rams: has('rams'),
    safety: has('safety'),
    oath: 3 * n('oath'), // grabs that fail each wave
    bellRate: 1 + n('bellCall'), // × how often the bellwether rings
    bellRadius: 1 + 0.5 * n('bellCall'),
    pastures: has('pastures'),
    strength: n('strength'), // +1% speed and reach per sheep, per copy (up to +50%)
    // Wool
    shears: (1 + 0.3 * n('shears')) * (1 + 0.4 * n('wolfMoon')) * pow('favor', 0.75) * pow('supper', 0.8),
    waveLength: pow('supper', 0.8), // × a wave's duration
    marketDay: n('marketDay'),
    freeReroll: has('dice'),
    polish: n('polish'), // sell value added to the other charms every wave
    interest: 3 * n('piggy'), // extra interest cap
    noInterestCap: has('savings'),
    noReroll: has('savings'),
    proud: 0.08 * n('proud'), // extra shearing per ×3 combo this wave (up to 10 of them)
    fair: n('fair'),
    wellFed: n('wellFed'), // +1% speed and reach per 4 unspent wool, per copy (up to +60%)
    blood: 3 * n('blood'), // wool per sheep lost, at shearing
    double: has('double'),
    wolfMoon: n('wolfMoon'), // extra wolves per wave
    discount: pow('haggler', 0.7), // × shop prices
    cheapReroll: has('haggler'),
    market: has('market'),
    nestEgg: has('nestEgg'),
    // The collar and the line
    spareFewer: n('brink') - 2 * n('favor'), // sheep the shepherd won't spare (Shepherd's Favor: more)
    luckyBone: has('luckyBone'),
    // Charms whose effect changes during the run (numbers in the game: see applyDogStats)
    freshBone: n('freshBone'),
    snack: n('snack'),
    trophy: n('trophy'),
    campfire: n('campfire'),
    nightOwl: n('nightOwl'),
    loneDog: n('loneDog'),
    buddy: n('buddy'),
    oldScar: has('oldScar'),
    brink: has('brink'),
    veteran: n('veteran'), // × the reach per clean wave
    chain: has('chain') ? 2 : 0, // how close a fleeing wolf must pass to scare another
    lucky: n('lucky'), // rare and legendary charms turn up 2^this as often
  };
}

// Up to `n` different charms not on the collar yet (and not in `exclude`), rarer ones less often
// (Lucky Collar: `lucky` doubles rare and legendary odds per copy). `requires` keeps a charm out
// until another one is on the collar.
export function drawCards(owned, n = SHOP.charms, exclude = [], lucky = 0) {
  const pool = CHARMS.filter((c) => !owned.includes(c.id) && !exclude.includes(c.id) && (!c.requires || owned.includes(c.requires)));
  const weight = (c) => SHOP.rarityWeight[c.rarity] * (c.rarity === 'rare' || c.rarity === 'legendary' ? 2 ** lucky : 1);
  const cards = [];
  while (cards.length < n && pool.length) {
    const i = pickWeighted(pool.map(weight));
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


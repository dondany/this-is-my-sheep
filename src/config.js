// Palette and tuning constants. Anything likely to be tweaked (or upgraded later) lives here.

export const COLORS = {
  sky: 0xf6d7a7,
  grass: 0xa8c96f,
  grass2: 0x91b85e,
  grassDark: 0x7fa853,

  sheep: 0xfff7e6,
  sheepFace: 0x2b2826,
  wandererWool: 0xd9c9ae,
  ramFace: 0x3b3029,
  horn: 0xd9c7a0,
  lambWool: 0xfffcf4,
  blackWool: 0x3d3836,
  blackFace: 0x1c1a19,
  goldWool: 0xf2c14e,
  bell: 0xe0b040,
  collar: 0x8a4b2f,
  goat: 0xe8e2d6,
  goatDark: 0x8c7f70,
  eye: 0xfffaf0,

  dog: 0x222222,
  dogLight: 0xf4e8d0,
  tongue: 0xe07a7a,

  wolf: 0x66635e,
  wolfLight: 0x9a958c,
  wolfEye: 0xf2c14e,
  runner: 0xb89c78,
  runnerLight: 0xdcc8a6,
  brute: 0x2f2c2a,
  bruteLight: 0x4d4844,
  bruteScar: 0x7a716a,
  bruteEye: 0xff7a3d,
  sneaky: 0x3e4441,
  sneakyLight: 0x5d635f,
  sneakyEye: 0xc9b25a,
  alpha: 0x55524d,
  alphaMane: 0xd8d2c6,
  alphaEye: 0xffd35c,
  fox: 0xd9793a,
  foxLight: 0xf4e8d0,
  foxDark: 0x2b2826,
  howler: 0x7d7a8a,
  howlerLight: 0xb4b0c0,
  pup: 0x8a867e,
  pupLight: 0xbdb8ae,

  wood: 0xa96f45,
  brown: 0x76513a,
  hatBand: 0x4a3426,
  shirt: 0xe8d4a8,
  skin: 0xe9b48a,
  beard: 0xd8d2c4,

  trunk: 0x8a5a3b,
  leaves: [0x7fae5a, 0x6f9f4f, 0x8dba62, 0x9cbf5f],
  rock: 0xa39a8c,
  tuft: 0x7fa853,
  flowers: [0xfff7e6, 0xf2c14e, 0xe8a0b4, 0xf4e8d0],

  dust: 0xd9c29a,
  ui: 0xfff0d0,
  accent: 0xe58a4b,
  danger: 0xc95745,
};

export const WORLD = {
  playRadius: 28, // dog and sheep stay inside this circle
  lurkRadius: 34, // wolves prowl along this ring before attacking
  spawnRadius: 38, // wolves enter (and leave) the map here
};

export const DOG = {
  maxSpeed: 13,
  acceleration: 55,
  turnSpeed: 14,
  // The dog's reach: wolves inside it get scared, and sheep react to the dog in proportion to it.
  // Starts at half the original 5; the Dog's Reach upgrade adds +1 per level (up to 8.5).
  threatRadius: 2.5,
  baseReach: 5, // sheep dogFearRadius values in SHEEP_TYPES are tuned for this reach
  barkCooldown: 0.45,
  fleeTime: 2.2, // how long scared wolves keep running ("bark power")
};

// Shearing Day: wool comes from the flock. At the end of each wave every surviving sheep is sheared
// for its type's `wool`, plus a calm bonus; scaring wolves only earns score.
export const SHEARING = {
  calmBonus: 1 / 3, // extra wool per calm sheep (never grabbed, never panicked for long), rounded down
  calmStress: 2, // seconds of panic a sheep can take and still count as calm
  perfect: 2, // bonus when no sheep was lost
  interestPer: 5, // +1 wool for every this much left unspent at the end of a wave...
  interestMax: 3, // ...up to this much
};

// Big wolves drop a tuft of fur the first time they're scared off: run the dog over it for wool.
export const BOUNTY = {
  wool: { brute: 3, alpha: 3, trickster: 2 },
  life: 8, // seconds before it blows away
  blink: 2.5, // blinks for this long before it goes
  pickupRadius: 1.6,
};

// During a wave the shepherd leads the flock to new grazing spots now and then, so the flock
// (and the dog's guard position) keeps moving.
export const ROAM = {
  interval: [20, 35], // seconds between moves
  speed: 1.3,
  minMove: 6, // each new spot is at least this far from the last
  maxRadius: 14, // and within this distance of the middle of the meadow
};

// Juice: a dog running through the flock knocks sheep into a little bounce.
export const BUMP = {
  minSpeed: 6, // the dog has to be running at least this fast
  radius: 1.4, // × the sheep's size
  push: 4.5, // sideways shove out of the dog's path
  height: 0.9,
  cooldown: 0.6,
};

// Shared flocking constants; per-type values live in SHEEP_TYPES.
// The dog's special move: right-click, Space, or the HUD button.
export const BIG_BARK = {
  radius: 12, // every wolf this close flees, brutes included
  cooldown: 15,
  startleRadius: 6, // sheep this close to the dog get startled too
  hitstop: 0.12,
};

export const SHEEP = {
  cap: 60,
  separationRadius: 1.6,
  // Personal space: sheep closer than this (for two normal-sized sheep; scaled by size) are gently
  // pushed apart every frame, so the flock can't clog into one heap. Herding Instinct shrinks it.
  minDistance: 1.8,
  minDistanceStiffness: 0.35, // fraction of the overlap corrected per frame
  grazeSpacing: 1.5, // grazing sheep want this much more room than walking ones
  separation: 2.2,
  neighbourRadius: 4,
  alignment: 0.3,
  flockRadius: 5, // soft boundary around the shepherd: base + sqrt(count) * perSqrt
  flockRadiusPerSqrt: 1.1,
  // A dog that parks among the sheep makes them uneasy: the longer it sits still near them, the
  // further they keep away (up to `pressureMax` × their usual distance).
  pressureRange: 1.8, // × dogFearRadius
  pressureSpeed: 3, // the dog counts as "parked" below this speed
  pressureTime: 5, // seconds to reach full unease
  pressureMax: 1.8,
  wolfFearRadius: 7,
  wolfFear: 6,
  calmRate: 0.5,
};

// Per-type overrides on top of SHEEP. Multipliers (…Scale) are relative to a normal sheep.
export const SHEEP_TYPES = {
  normal: {
    scale: 1.15,
    walkSpeed: 1.3,
    walkTime: [1.5, 4],
    grazeTime: [1.5, 5],
    fidget: 1, // how often it looks around / hops
    cohesion: 0.25,
    boundary: 0.8,
    radiusScale: 1, // soft boundary around the shepherd
    dogFearRadius: 4,
    dogFear: 3.5,
    panic: 1, // how much nearby wolves scare it
    panicSpeed: 5.5,
    grabTime: 1, // multiplier on how long a wolf needs to take it
    attractRadius: 0,
    attract: 0,
    lure: 0, // how much more wolves want it
    wool: 1, // sheared at the end of each wave it survives
  },
  // Curious and easily distracted: drifts off, but a quick pass by the dog sends it home.
  wanderer: {
    scale: 1.0,
    walkSpeed: 1.7,
    walkTime: [2, 5],
    grazeTime: [1, 3],
    fidget: 2.5,
    cohesion: 0.1,
    boundary: 0.45,
    radiusScale: 1.6,
    dogFearRadius: 8,
    dogFear: 7,
    panic: 1,
    panicSpeed: 6,
    grabTime: 1,
    attractRadius: 0,
    attract: 0,
    lure: 0,
    wool: 1,
  },
  // Big, calm and stubborn. Anchors the flock and keeps nearby sheep calmer.
  ram: {
    scale: 1.5,
    walkSpeed: 0.8,
    walkTime: [0.8, 2],
    grazeTime: [4, 9],
    fidget: 0.5,
    cohesion: 0.4,
    boundary: 0.8,
    radiusScale: 0.6,
    dogFearRadius: 2.5,
    dogFear: 1.5,
    panic: 0.3,
    panicSpeed: 3,
    grabTime: 2,
    attractRadius: 7,
    attract: 0.6,
    lure: 0,
    wool: 3,
  },
  // Starts stampedes (see BLACK); otherwise a regular sheep.
  black: {
    scale: 1.1,
    walkSpeed: 1.3,
    walkTime: [1, 3.5],
    grazeTime: [2, 6],
    fidget: 1.5,
    cohesion: 0.3,
    boundary: 0.8,
    radiusScale: 1,
    dogFearRadius: 4,
    dogFear: 3.5,
    panic: 1,
    panicSpeed: 5.5,
    grabTime: 1,
    attractRadius: 0,
    attract: 0,
    lure: 0,
    wool: 1,
  },
  // Follows its mother everywhere. Wolves love lambs; they're worth double at the end of a wave.
  // If the mother is taken, it bolts off alone until the dog brings it back to the flock.
  lamb: {
    scale: 0.7,
    walkSpeed: 1.4,
    walkTime: [0.5, 1.5],
    grazeTime: [1, 3],
    fidget: 2,
    cohesion: 0.2,
    boundary: 0.8,
    radiusScale: 1,
    dogFearRadius: 4,
    dogFear: 3.5,
    panic: 1.2,
    panicSpeed: 6,
    grabTime: 0.6,
    attractRadius: 0,
    attract: 0,
    lure: 4,
    wool: 2,
  },
};

// The troublemaker: every so often it charges off in a straight line and drags a few sheep with it.
export const BLACK = {
  interval: [12, 18], // seconds between stampedes
  windup: 1.2, // stamping and snorting before it goes: time to get in the way
  duration: 6, // max length of a stampede
  speed: 4.5,
  followers: 3,
  recruitRadius: 6,
  cutOffRadius: 3.5, // the dog this close to the black sheep ends the stampede
  points: 10,
};

// The rest of the flock-side types start from a normal sheep and override a few values.
Object.assign(SHEEP_TYPES, {
  // Dozes on the spot: won't wander off, but won't flee from wolves either.
  sleepy: { ...SHEEP_TYPES.normal, fidget: 0.4, lure: 2 },
  // Rare. Every wolf wants it; worth a fortune if it survives the wave.
  golden: { ...SHEEP_TYPES.normal, lure: 8, wool: 10 },
  // Rings its bell to regroup the sheep around it.
  bellwether: { ...SHEEP_TYPES.normal, scale: 1.2, cohesion: 0.45, radiusScale: 0.8, panic: 0.8, wool: 2 },
  // A wolf in a sheepskin. Not a real sheep: wolves ignore it and it doesn't count.
  disguised: { ...SHEEP_TYPES.normal, fake: true, fidget: 0.6, wool: 0 },
});

export const SLEEPY = {
  wakeRadius: 3, // the dog this close wakes it up...
  startleRadius: 5, // ...and the sheep this close to it scatter
  awake: [18, 30], // seconds before it dozes off again
};

export const BELL = {
  interval: [5, 7],
  radius: 10, // sheep this close regroup around the bellwether
  pull: 2.2,
  regroupTime: 1.6,
  lostCohesion: 0.4, // flock cohesion multiplier for the rest of the wave once it's taken
};

export const GOLDEN = {
  firstWave: 6,
  chance: 0.35, // later waves: chance of a golden fleece joining if there isn't one
};

export const GOAT = {
  walkSpeed: 2,
  chargeSpeed: 8,
  sightRadius: 10, // goes for wolves this close
  buttRadius: 1.8,
  cooldown: 3.5,
  stun: 2,
  knockback: 2.5, // a head-butt shoves the wolf this far
  leash: 11, // wanders at most about this far from the flock
};

export const DISGUISE = {
  reveal: [15, 25], // seconds into the wave before it throws off the sheepskin
  sniffRadius: 2.5, // the dog this close for `sniffTime` exposes it early
  sniffTime: 0.5,
  points: 40,
};

// Rare upgrades (see src/upgrades.js)
export const WHISTLE = {
  regroupTime: 2.5, // seconds every sheep spends heading back to the shepherd
};

export const SCARECROW = {
  radius: 4.5, // ordinary wolves this close get scared
};

export const HELPER = {
  // Speed (relative to the player's dog) and reach come from upgrades (mods.helperSpeed etc.).
  threatRadius: 5, // × mods.helperThreat: 3 when bought, up to 4.5 with Pup's Bark
  barkCooldown: 0.6,
  guardRadius: 7, // patrols this far from the shepherd (plus a bit for big flocks)
  reactRadius: 16, // goes after threatening wolves this close to the flock
};

export const LAMB = {
  followDistance: 1.4, // how close it stays to its mother
  follow: 1.5,
  orphanSpeed: 2.4, // wandering speed while lost
  orphanBoundary: 0.12, // much weaker pull back to the flock while lost
};

export const RAM_CALM = 0.6; // wolf panic multiplier for sheep near the ram

export const WOLF = {
  wanderSpeed: 3,
  approachSpeed: 4.2,
  chaseSpeed: 7.5,
  fleeSpeed: 11,
  chaseDistance: 7,
  grabDistance: 1.2,
  grabTime: 1.2, // seconds the dog has to rescue a grabbed sheep
  scarePause: 0.14,
  dogAvoidRadius: 11,
  stragglerBias: 0.6,
};

// Per-type overrides for wolves. Speeds and times multiply the WOLF / DOG values above.
export const WOLF_TYPES = {
  normal: {
    scale: 1.2,
    speed: 1,
    stalk: 1,
    threatScale: 1, // multiplier on the dog's threat radius
    fleeTime: 1,
    courage: 0, // seconds the dog must stay close before it flees (0 = one bark is enough)
    grabTime: 1,
    stragglerBias: 1, // 0 = always go for the nearest sheep
    skittish: false, // gives up a chase when the dog is near its target
    shove: false, // pushes sheep out of its way
    points: 15,
  },
  // Small and fast: raids the edge of the flock, bolts at the first sign of the dog, comes back quickly.
  runner: {
    scale: 0.95,
    speed: 1.6,
    stalk: 0.4,
    threatScale: 1.3,
    fleeTime: 0.6,
    courage: 0,
    grabTime: 1,
    stragglerBias: 0,
    skittish: true,
    shove: false,
    points: 20,
  },
  // Big and slow: one bark isn't enough, the dog has to hold its ground next to it.
  brute: {
    scale: 1.8,
    speed: 0.7,
    stalk: 1.2,
    threatScale: 1,
    fleeTime: 1.3,
    courage: 1.5,
    grabTime: 0.6,
    stragglerBias: 1,
    skittish: false,
    shove: true,
    points: 40,
  },
  // Dark and low: no off-screen arrow until it's close, and it circles round to the side away from the dog.
  sneaky: {
    scale: 1.1,
    speed: 1.05,
    stalk: 1.3,
    threatScale: 1,
    fleeTime: 1,
    courage: 0,
    grabTime: 1,
    stragglerBias: 1,
    skittish: false,
    shove: false,
    hidden: true,
    flank: true,
    points: 25,
  },
  // Leads the pack: shorter stalking for everyone, attacks together on its howl.
  // Scare it and the wolves around it run too (see ALPHA).
  alpha: {
    scale: 1.4,
    speed: 1.05,
    stalk: 1.2,
    threatScale: 1,
    fleeTime: 1.3,
    courage: 0,
    grabTime: 1,
    stragglerBias: 1,
    skittish: false,
    shove: false,
    leader: true,
    points: 50,
  },
};

Object.assign(WOLF_TYPES, {
  // Tiny, arrives in threes. Weak on its own, but the group splits up when the dog comes close.
  pup: { ...WOLF_TYPES.normal, scale: 0.65, speed: 1.1, threatScale: 1.2, fleeTime: 1.5, grabTime: 1.6, points: 5 },
  // Never attacks. Howls from the tree line and makes the flock panic.
  howler: { ...WOLF_TYPES.normal, scale: 1.15, speed: 0.9, howler: true, points: 20 },
  // Fox-like feinter: fakes an attack on one side, then switches to the far side once the dog commits.
  trickster: { ...WOLF_TYPES.normal, scale: 0.95, speed: 1.3, stalk: 0.8, threatScale: 1.4, fleeTime: 1.2, feint: true, points: 30 },
  // What's under the sheepskin (see DISGUISE).
  disguised: { ...WOLF_TYPES.normal, points: 40 },
});

export const PUPS = {
  count: 3,
  splitRadius: 8, // the dog this close for `reaction` seconds makes the group split up
  reaction: 0.35,
  comboWindow: 0.6, // scare all three within this many seconds for the bonus
  comboPoints: 30,
};

export const HOWLER = {
  ringOffset: 7, // prowls this much inside the lurk ring, so the dog can reach it
  interval: [6, 9],
  windup: 1,
  radius: 36, // sheep this close panic on a howl: from the edge of the meadow that's the whole flock
};

export const TRICKSTER = {
  commitRadius: 16, // the dog heading its way from this close counts as "committed"
  commitAim: 0.75, // how directly the dog must be heading at it (cosine)
};

export const ALPHA = {
  stalk: 0.5, // other wolves' stalking time while an alpha is on the field
  panicRadius: 10, // scaring the alpha also scares every wolf this close to it
};

export const SNEAKY = {
  revealDistance: 15, // its indicator appears once it's this close to the flock
  flankAngle: 0.7, // radians: how close to "directly behind the flock" before it attacks
  giveUpFlank: 6, // seconds past its stalk time before it attacks from wherever it is
};

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// When each kind first appears. One new flock-side and one new wolf-side animal per wave, 2 to 9.
export const FIRST_WAVE = {
  wanderer: 2, pups: 2,
  lamb: 3, runner: 3,
  sleepy: 4, howler: 4,
  ram: 5, sneaky: 5,
  golden: 6, brute: 6,
  black: 7, trickster: 7,
  bellwether: 8, alpha: 8,
  disguised: 9,
  goat: 3, // only ever bought in the shop (livestock card), from this wave on
};

// Which wolves make up a wave's pack ('pups' is a group of three pups taking one slot).
// Listed in priority order: when the pack is full, the later kinds are left out.
export function wolfPack(wave, count) {
  const from = (kind, n) => (wave >= FIRST_WAVE[kind] ? n : 0);
  const wanted = [
    ['alpha', from('alpha', 1)],
    ['brute', from('brute', wave < 8 ? 1 : Math.min(3, Math.floor((wave - 4) / 2)))],
    ['sneaky', from('sneaky', wave < 9 ? 1 : Math.min(3, Math.floor((wave - 5) / 2)))],
    ['trickster', from('trickster', wave < 10 ? 1 : 2)],
    ['runner', from('runner', wave < 8 ? 1 : Math.min(5, Math.floor((wave - 2) / 2)))],
    ['howler', from('howler', wave < 9 ? 1 : 2)],
    ['pups', from('pups', wave < 6 ? 1 : 2)],
  ];
  const pack = [];
  for (const [kind, n] of wanted) for (let i = 0; i < n && pack.length < count; i++) pack.push(kind);
  while (pack.length < count) pack.push('normal');
  shuffle(pack);
  // Lead with a normal wolf so the special ones arrive mid-wave.
  const first = pack.indexOf('normal');
  if (first > 0) [pack[0], pack[first]] = [pack[first], pack[0]];
  return pack;
}

export function waveConfig(wave) {
  const difficulty = 1 + (wave - 1) * 0.15;
  return {
    wave,
    difficulty,
    // New arrivals each wave. The flock starts small, and later waves bring fewer plain sheep and
    // more troublemakers (wanderers, sleepy sheep, black sheep), so it gets harder to manage
    // rather than just bigger.
    newSheep: wave === 1 ? 6 : wave < 5 ? 2 : 1, // plain sheep
    wanderers: wave < FIRST_WAVE.wanderer ? 0 : wave < 6 ? 1 : 2,
    lambs: wave < FIRST_WAVE.lamb ? 0 : 1, // each is paired with a mother
    sleepy: wave < FIRST_WAVE.sleepy ? 0 : wave < 7 ? 1 : 2,
    golden: wave === GOLDEN.firstWave || (wave > GOLDEN.firstWave && Math.random() < GOLDEN.chance),
    // How many of these the flock should have: new ones join to make up the number.
    ram: wave >= FIRST_WAVE.ram ? 1 : 0,
    black: wave < FIRST_WAVE.black ? 0 : wave < 10 ? 1 : 2,
    bellwether: wave >= FIRST_WAVE.bellwether ? 1 : 0,
    disguised: wave >= FIRST_WAVE.disguised ? 1 : 0,
    wolves: Math.min(1 + wave, 15),
    duration: Math.min(40 + wave * 5, 90),
    spawnInterval: Math.max(2, 9 - wave * 0.6),
    // Pressure comes mostly from more wolves and shorter stalking, not raw speed.
    wolfSpeed: Math.min(1 + (wave - 1) * 0.05, 1.5),
    stalkMin: 2.5 / difficulty,
    stalkMax: 5.5 / difficulty,
    pack: wolfPack(wave, Math.min(1 + wave, 15)),
  };
}

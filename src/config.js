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
  threatRadius: 5, // wolves inside this radius get scared
  barkCooldown: 0.45,
  fleeTime: 2.2, // how long scared wolves keep running ("bark power")
};

// Shared flocking constants; per-type values live in SHEEP_TYPES.
export const SHEEP = {
  cap: 80,
  separationRadius: 1.6,
  separation: 2.2,
  neighbourRadius: 4,
  alignment: 0.3,
  flockRadius: 4, // soft boundary around the shepherd: base + sqrt(count) * perSqrt
  flockRadiusPerSqrt: 0.9,
  wolfFearRadius: 7,
  wolfFear: 6,
  calmRate: 0.5,
};

// Per-type overrides on top of SHEEP. Multipliers (…Scale) are relative to a normal sheep.
export const SHEEP_TYPES = {
  normal: {
    scale: 1.15,
    walkSpeed: 1.3,
    walkTime: [1, 3.5],
    grazeTime: [2, 7],
    fidget: 1, // how often it looks around / hops
    cohesion: 0.35,
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
    wool: 1, // survivor reward multiplier at the end of a wave
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
    wool: 1,
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

// Which wolves make up a wave's pack: runners from wave 3, brutes from wave 6, sneaky from 7,
// mixed packs from 8, one alpha per wave from 9.
export function wolfPack(wave, count) {
  const runners = wave < 3 ? 0 : wave < 8 ? 1 : Math.min(5, Math.floor((wave - 2) / 2));
  const brutes = wave < 6 ? 0 : wave < 8 ? 1 : Math.min(3, Math.floor((wave - 4) / 2));
  const sneaky = wave < 7 ? 0 : wave < 9 ? 1 : Math.min(3, Math.floor((wave - 5) / 2));
  const alphas = wave < 9 ? 0 : 1;
  const pack = [];
  for (let i = 0; i < alphas && pack.length < count; i++) pack.push('alpha');
  for (let i = 0; i < runners && pack.length < count; i++) pack.push('runner');
  for (let i = 0; i < brutes && pack.length < count; i++) pack.push('brute');
  for (let i = 0; i < sneaky && pack.length < count; i++) pack.push('sneaky');
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
    newSheep: wave === 1 ? 10 : 4,
    wanderers: wave >= 2 ? 1 : 0, // of the new sheep
    ram: wave >= 5, // an Old Ram joins if the flock doesn't have one
    lambs: wave < 4 ? 0 : wave < 8 ? 1 : 2, // of the new sheep; each is paired with a mother
    black: wave >= 8, // a Black Sheep joins if the flock doesn't have one
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

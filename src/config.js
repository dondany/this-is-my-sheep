// Palette and tuning constants. Anything likely to be tweaked (or upgraded later) lives here.

export const COLORS = {
  sky: 0xf6d7a7,
  grass: 0xa8c96f,
  grass2: 0x91b85e,
  grassDark: 0x7fa853,

  sheep: 0xfff7e6,
  sheepFace: 0x2b2826,
  eye: 0xfffaf0,

  dog: 0x222222,
  dogLight: 0xf4e8d0,
  tongue: 0xe07a7a,

  wolf: 0x66635e,
  wolfLight: 0x9a958c,
  wolfEye: 0xf2c14e,

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

export const SHEEP = {
  cap: 80,
  walkSpeed: 1.3,
  panicSpeed: 5.5,
  separationRadius: 1.6,
  separation: 2.2,
  neighbourRadius: 4,
  alignment: 0.3,
  cohesion: 0.35,
  boundary: 0.8,
  flockRadius: 4, // soft boundary around the shepherd: base + sqrt(count) * perSqrt
  flockRadiusPerSqrt: 0.9,
  dogFearRadius: 4,
  dogFear: 3.5,
  wolfFearRadius: 7,
  wolfFear: 6,
  calmRate: 0.5,
};

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

export function waveConfig(wave) {
  const difficulty = 1 + (wave - 1) * 0.15;
  return {
    wave,
    difficulty,
    newSheep: wave === 1 ? 10 : 4,
    wolves: Math.min(1 + wave, 15),
    duration: Math.min(40 + wave * 5, 90),
    spawnInterval: Math.max(2, 9 - wave * 0.6),
    // Pressure comes mostly from more wolves and shorter stalking, not raw speed.
    wolfSpeed: Math.min(1 + (wave - 1) * 0.05, 1.5),
    stalkMin: 2.5 / difficulty,
    stalkMax: 5.5 / difficulty,
  };
}

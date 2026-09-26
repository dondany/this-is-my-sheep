// Cosmetics: dog coats, neckwear, hats and meadow themes. Each one is unlocked by an achievement
// (nothing to grind), picked in the Wardrobe screen and saved in localStorage.

import * as THREE from 'three';
import { COLORS } from './config.js';
import { GEO, mesh } from './materials.js';

const STORAGE_KEY = 'this-is-my-sheep.wardrobe';

export const WARDROBE = {
  coat: {
    title: 'Coat',
    items: [
      { id: 'collie', name: 'Border Collie', look: { body: COLORS.dog, light: COLORS.dogLight } },
      { id: 'merle', name: 'Blue Merle', unlock: 'wave15', look: { body: 0x6f7885, light: 0xeeeae2 } },
      { id: 'red', name: 'Red Collie', unlock: 'scare250', look: { body: 0x8a4a2c, light: 0xf4e8d0 } },
      { id: 'golden', name: 'Golden', unlock: 'threeStars', look: { body: 0xd9a25a, light: 0xf3dcae } },
      { id: 'corgi', name: 'Corgi', unlock: 'naturalist', look: { body: 0xd68a3c, light: 0xf8efe0, legs: 0.55, pointyEars: true } },
    ],
  },
  neck: {
    title: 'Neckwear',
    items: [
      { id: 'none', name: 'Nothing' },
      { id: 'redBandana', name: 'Red Bandana', unlock: 'firstShift' },
      { id: 'blueBandana', name: 'Blue Bandana', unlock: 'scare10' },
      { id: 'tartan', name: 'Tartan Scarf', unlock: 'wave10' },
      { id: 'bell', name: 'Bell Collar', unlock: 'goat' },
      { id: 'garland', name: 'Flower Garland', unlock: 'reunion' },
    ],
  },
  hat: {
    title: 'Hat',
    items: [
      { id: 'none', name: 'Nothing' },
      { id: 'straw', name: 'Straw Hat', unlock: 'wave5' },
      { id: 'flowers', name: 'Flower Crown', unlock: 'perfect' },
      { id: 'shepherd', name: "Shepherd's Hat", unlock: 'flock30' },
      { id: 'beanie', name: 'Winter Beanie', unlock: 'endless25' },
      { id: 'crown', name: 'Golden Crown', unlock: 'summer8' },
    ],
  },
  meadow: {
    title: 'Meadow',
    items: [
      { id: 'summer', name: 'Summer', theme: { leaves: COLORS.leaves, flowers: COLORS.flowers } },
      { id: 'blossom', name: 'Blossom', unlock: 'combo5', theme: { leaves: [0xf2b8c6, 0xf7d4dc, 0xfff4f4, 0x8dba62], flowers: [0xf4a7bb, 0xffffff, 0xf7d4dc] } },
      { id: 'autumn', name: 'Autumn', unlock: 'summer3', theme: { leaves: [0xd9793a, 0xc9532f, 0xe8b04a, 0x9c6b3a], flowers: [0xe8b04a, 0xd9793a, 0xfff7e6], grass: 0xc2b270, tufts: [0xa89a5a, 0x8f8a4e] } },
      { id: 'lavender', name: 'Lavender', unlock: 'wool100', theme: { leaves: COLORS.leaves, flowers: [0x9b7fd0, 0xb79ce0, 0x7d62b8, 0xfff7e6], grass: 0xa9bf7a } },
    ],
  },
};

export const SLOTS = Object.keys(WARDROBE);
const DEFAULTS = { coat: 'collie', neck: 'none', hat: 'none', meadow: 'summer' };

export function item(slot, id) {
  return WARDROBE[slot].items.find((i) => i.id === id) ?? WARDROBE[slot].items[0];
}

// The cosmetic an achievement unlocks, if any (for the achievements screen).
export function rewardFor(achievementId) {
  for (const slot of SLOTS) {
    const it = WARDROBE[slot].items.find((i) => i.unlock === achievementId);
    if (it) return it;
  }
  return null;
}

export class Wardrobe {
  constructor(isUnlocked) {
    this.isUnlocked = isUnlocked; // (achievementId) => boolean
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    } catch {}
    this.picked = { ...DEFAULTS };
    for (const slot of SLOTS) if (saved[slot] && this.available(slot, saved[slot])) this.picked[slot] = saved[slot];
  }

  available(slot, id) {
    const it = WARDROBE[slot].items.find((i) => i.id === id);
    return !!it && (!it.unlock || this.isUnlocked(it.unlock));
  }

  pick(slot, id) {
    if (!this.available(slot, id)) return false;
    this.picked[slot] = id;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.picked));
    } catch {}
    return true;
  }

  // The dog's look (colours, legs) plus its accessories.
  dogStyle(overrides = {}) {
    const picked = { ...this.picked, ...overrides };
    return { ...item('coat', picked.coat).look, hat: picked.hat, neck: picked.neck };
  }

  theme() {
    return item('meadow', this.picked.meadow).theme;
  }
}

// --- Accessory models ----------------------------------------------------------

const RING = new THREE.TorusGeometry(0.2, 0.035, 6, 18);
const BELL = new THREE.CylinderGeometry(0.05, 0.1, 0.13, 8);

function flowerRing(parent, { y, z = 0, radius, count, size, colors, tilt = 0 }) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    parent.add(mesh(GEO.lowSphere, colors[i % colors.length], { position: [Math.cos(a) * radius, y + Math.sin(a) * radius * Math.sin(tilt), z + Math.sin(a) * radius * Math.cos(tilt)], scale: size }));
  }
}

const NECKWEAR = {
  redBandana: (body) => bandana(body, COLORS.bandana),
  blueBandana: (body) => bandana(body, 0x3f6fb0),
  tartan: (body) => {
    body.add(mesh(GEO.box, 0xb8403a, { position: [0, 0.14, 0.44], scale: [0.5, 0.13, 0.24], rotation: [0.3, 0, 0] }));
    body.add(mesh(GEO.box, 0x2f6b45, { position: [0, 0.14, 0.44], scale: [0.51, 0.04, 0.25], rotation: [0.3, 0, 0] }));
    body.add(mesh(GEO.box, 0xb8403a, { position: [0.14, 0.0, 0.55], scale: [0.1, 0.26, 0.05], rotation: [0.2, 0, -0.2] }));
  },
  bell: (body) => {
    body.add(mesh(RING, COLORS.collar, { position: [0, 0.16, 0.45], scale: [1.2, 1.2, 1], rotation: [Math.PI / 2 - 0.4, 0, 0] }));
    body.add(mesh(BELL, COLORS.bell, { position: [0, -0.06, 0.6], shadow: true }));
  },
  garland: (body) => flowerRing(body, { y: 0.15, z: 0.44, radius: 0.24, count: 10, size: 0.07, colors: [0xf4a7bb, 0xfff7e6, 0xf2c14e], tilt: 1.1 }),
};

function bandana(body, color) {
  body.add(mesh(GEO.box, color, { position: [0, 0.13, 0.46], scale: [0.48, 0.12, 0.22], rotation: [0.35, 0, 0] }));
  body.add(mesh(GEO.cone, color, { position: [0, -0.02, 0.56], scale: [0.14, 0.22, 0.06], rotation: [Math.PI - 0.3, Math.PI / 4, 0] }));
}

const HATS = {
  straw: (head) => {
    head.add(mesh(GEO.cylinder, 0xe8c85a, { position: [0, 0.23, 0], scale: [0.38, 0.03, 0.38], shadow: true }));
    head.add(mesh(GEO.cylinder, 0xe8c85a, { position: [0, 0.31, 0], scale: [0.18, 0.14, 0.18] }));
    head.add(mesh(GEO.cylinder, COLORS.bandana, { position: [0, 0.27, 0], scale: [0.185, 0.04, 0.185] }));
  },
  flowers: (head) => flowerRing(head, { y: 0.22, radius: 0.2, count: 8, size: 0.065, colors: [0xf4a7bb, 0xf2c14e, 0xfff7e6, 0x9b7fd0] }),
  shepherd: (head) => {
    head.add(mesh(GEO.cylinder, COLORS.brown, { position: [0, 0.24, 0], scale: [0.3, 0.03, 0.3], shadow: true }));
    head.add(mesh(GEO.cylinder, COLORS.brown, { position: [0, 0.33, 0], scale: [0.16, 0.16, 0.16] }));
    head.add(mesh(GEO.cylinder, COLORS.hatBand, { position: [0, 0.28, 0], scale: [0.165, 0.04, 0.165] }));
  },
  beanie: (head) => {
    head.add(mesh(GEO.sphere, 0x5b7fb5, { position: [0, 0.17, -0.02], scale: [0.27, 0.19, 0.27], shadow: true }));
    head.add(mesh(GEO.cylinder, 0xeeeae2, { position: [0, 0.1, -0.02], scale: [0.275, 0.05, 0.275] }));
    head.add(mesh(GEO.lowSphere, 0xfffaf0, { position: [0, 0.37, -0.02], scale: 0.07 }));
  },
  crown: (head) => {
    head.add(mesh(GEO.cylinder, COLORS.goldWool, { position: [0, 0.27, 0], scale: [0.17, 0.09, 0.17], shadow: true }));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      head.add(mesh(GEO.cone, COLORS.goldWool, { position: [Math.cos(a) * 0.14, 0.36, Math.sin(a) * 0.14], scale: [0.04, 0.1, 0.04] }));
    }
    head.add(mesh(GEO.lowSphere, COLORS.danger, { position: [0, 0.28, 0.17], scale: 0.035 }));
  },
};

// Put the chosen hat and neckwear on a dog (called from the Dog constructor).
export function dressDog(dog, { hat, neck }) {
  HATS[hat]?.(dog.head);
  NECKWEAR[neck]?.(dog.body);
}

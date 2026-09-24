import * as THREE from 'three';
import { Sheep, Wolf, Goat } from './entities.js';
import { FIRST_WAVE } from './config.js';

const STORAGE_KEY = 'this-is-my-sheep.bestiary';

// Every animal in the game, flock side then wolf side. `make` builds the model for its portrait.
export const ENTRIES = [
  {
    id: 'sheep',
    side: 'flock',
    name: 'Sheep',
    text: 'The heart of the flock. Grazes, strolls a little and sticks close to the others and the shepherd.',
    tip: 'Keep them together and they are easy to guard.',
    make: (scene) => [new Sheep(scene)],
  },
  {
    id: 'wanderer',
    side: 'flock',
    name: 'Wanderer',
    text: 'Curious and easily distracted. It drifts far from the flock (watch for the "?") and attracts wolves.',
    tip: 'It notices the dog from far away: one quick pass sends it home.',
    make: (scene) => [new Sheep(scene, 'wanderer')],
  },
  {
    id: 'lamb',
    side: 'flock',
    name: 'Lamb',
    text: 'Follows its mother everywhere. Wolves go for lambs first, but every lamb that survives a wave pays double wool.',
    tip: 'If its mother is taken it runs off alone. Get behind it and walk it home, and it will adopt a new mother.',
    make: (scene) => {
      const mother = new Sheep(scene).setPosition(-0.9, 0, -0.6);
      return [mother, new Sheep(scene, 'lamb').setPosition(0.7, 0, 0.5)];
    },
  },
  {
    id: 'sleepy',
    side: 'flock',
    name: 'Sleepy Sheep',
    text: "Dozes on the spot. It won't wander off, but it won't run from wolves either.",
    tip: "Running past wakes it up, and the sheep around it scatter. Sometimes it's better to let it sleep.",
    make: (scene) => [new Sheep(scene, 'sleepy')],
  },
  {
    id: 'ram',
    side: 'flock',
    name: 'Old Ram',
    text: 'Big, calm and stubborn. Ignores the dog, barely panics, and the sheep around him stay calmer.',
    tip: 'Wolves need twice as long to take him. Losing him makes the flock jumpier.',
    make: (scene) => [new Sheep(scene, 'ram')],
  },
  {
    id: 'golden',
    side: 'flock',
    name: 'Golden Fleece',
    text: 'A rare sheep with a shining coat. Every wolf in the meadow wants it.',
    tip: 'Worth 100 wool at the end of each wave it survives.',
    make: (scene) => [new Sheep(scene, 'golden')],
  },
  {
    id: 'black',
    side: 'flock',
    name: 'Black Sheep',
    text: 'The troublemaker. Every so often it stamps, snorts and stampedes away with a few sheep in tow.',
    tip: 'Get the dog close to head it off, or stand in its way while it stamps.',
    make: (scene) => [new Sheep(scene, 'black')],
  },
  {
    id: 'bellwether',
    side: 'flock',
    name: 'Bellwether',
    text: 'Wears a bell. Every few seconds it rings, and the sheep nearby regroup around it.',
    tip: 'If a wolf takes it, the flock loses its cohesion for the rest of the wave.',
    make: (scene) => [new Sheep(scene, 'bellwether')],
  },
  {
    id: 'goat',
    side: 'flock',
    name: 'Goat',
    text: 'Not a sheep, and it knows it. Goes wherever it likes.',
    tip: 'Head-butts wolves that come close, dazing them and freeing any sheep they were holding.',
    make: (scene) => [new Goat(scene)],
  },
  {
    id: 'wolf',
    side: 'wolves',
    name: 'Wolf',
    text: 'Prowls the tree line, then goes for the sheep at the edge of the flock.',
    tip: 'Get close and it runs. 15 wool.',
    make: (scene) => [new Wolf(scene)],
  },
  {
    id: 'pup',
    side: 'wolves',
    name: 'Pup Pack',
    text: 'Three tiny wolves that hunt together. Each one is weak on its own.',
    tip: 'Dash through them while they are bunched up: they split up when the dog comes near. Scare all three at once for a bonus.',
    make: (scene) => [
      new Wolf(scene, 'pup').setPosition(0, 0, 0.6),
      new Wolf(scene, 'pup').setPosition(-1, 0, -0.5),
      new Wolf(scene, 'pup').setPosition(1, 0, -0.6),
    ],
  },
  {
    id: 'runner',
    side: 'wolves',
    name: 'Runner',
    text: 'Small and very fast. It barely stalks and goes straight for the nearest sheep.',
    tip: 'It gives up if the dog gets close to its target, but it comes back quickly. 20 wool.',
    make: (scene) => [new Wolf(scene, 'runner')],
  },
  {
    id: 'howler',
    side: 'wolves',
    name: 'Howler',
    text: 'Never attacks. It sits just inside the tree line and howls, and the flock panics and scatters.',
    tip: 'Chase it off before the other wolves take advantage. 20 wool.',
    make: (scene) => {
      const w = new Wolf(scene, 'howler');
      w.howling = 1;
      return [w];
    },
  },
  {
    id: 'sneaky',
    side: 'wolves',
    name: 'Sneaky Wolf',
    text: 'Silent and low to the ground. No arrow warns you until it is close to the flock.',
    tip: 'It circles round to the side of the flock away from the dog. Watch your blind spot. 25 wool.',
    make: (scene) => [new Wolf(scene, 'sneaky')],
  },
  {
    id: 'brute',
    side: 'wolves',
    name: 'Brute',
    text: 'Big, slow and scarred. One bark is not enough to scare it.',
    tip: "Stay next to it until its fear meter fills. It can't finish a grab while you do. 40 wool.",
    make: (scene) => [new Wolf(scene, 'brute')],
  },
  {
    id: 'trickster',
    side: 'wolves',
    name: 'Trickster',
    text: 'A fox-like wolf that feints: it charges one side of the flock, then switches to the far side once the dog commits.',
    tip: "Don't over-commit. Wait until it is really going in. 30 wool.",
    make: (scene) => [new Wolf(scene, 'trickster')],
  },
  {
    id: 'alpha',
    side: 'wolves',
    name: 'Alpha',
    text: 'Leads the pack. While it is around the others attack sooner, and its howl sends them in together.',
    tip: 'Scare it and every wolf inside its ring runs too. 50 wool.',
    make: (scene) => [new Wolf(scene, 'alpha')],
  },
  {
    id: 'disguised',
    side: 'wolves',
    name: "Wolf in Sheep's Clothing",
    text: 'Hides in the flock looking like a sheep, then throws off the fleece and grabs the nearest one.',
    tip: 'Look for the grey tail, grey legs and flat walk. Run the dog next to it to expose it early. 40 wool.',
    make: (scene) => [new Sheep(scene, 'disguised')],
  },
];

for (const e of ENTRIES) e.wave = FIRST_WAVE[e.id === 'pup' ? 'pups' : e.id] ?? 1;

export const ENTRY = Object.fromEntries(ENTRIES.map((e) => [e.id, e]));

// Which bestiary entry an animal belongs to.
export function entryId(animal) {
  if (animal.kind === 'normal') return animal instanceof Wolf ? 'wolf' : 'sheep';
  return animal.kind;
}

export class Bestiary {
  constructor() {
    this.unlocked = new Set();
    try {
      for (const id of JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) this.unlocked.add(id);
    } catch {}
    this.portraits = new Map();
    this.renderer = null;
  }

  has(id) {
    return this.unlocked.has(id);
  }

  // Returns true the first time an entry is unlocked.
  unlock(id) {
    if (!ENTRY[id] || this.unlocked.has(id)) return false;
    this.unlocked.add(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.unlocked]));
    } catch {}
    return true;
  }

  // A PNG data URL of the entry's model, rendered once and cached.
  portrait(id) {
    if (this.portraits.has(id)) return this.portraits.get(id);
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(256, 256);
      this.scene = new THREE.Scene();
      this.scene.add(new THREE.HemisphereLight(0xfff2dc, 0x9bb06a, 1.6));
      const sun = new THREE.DirectionalLight(0xfff0d6, 2.2);
      sun.position.set(-3, 6, 5);
      this.scene.add(sun);
      this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    }
    const stage = new THREE.Group();
    this.scene.add(stage);
    const animals = ENTRY[id].make(stage);
    for (const a of animals) {
      a.root.rotation.y = a.heading = 0.6; // three-quarter view
      for (let i = 0; i < 30; i++) a.animate?.(1 / 30, i / 30); // settle poses (sleeping, howling…)
    }
    // Ground rings (the alpha's) would make the framing far too wide.
    const rings = [];
    stage.traverse((o) => o.isMesh && o.material.isMeshBasicMaterial && rings.push(o));
    for (const r of rings) r.removeFromParent();

    const box = new THREE.Box3().setFromObject(stage);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const dist = size / (2 * Math.tan(THREE.MathUtils.degToRad(15))) * 0.95;
    this.camera.position.set(center.x + dist * 0.2, center.y + dist * 0.35, center.z + dist * 0.92);
    this.camera.lookAt(center);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.scene.remove(stage);
    this.portraits.set(id, url);
    return url;
  }
}

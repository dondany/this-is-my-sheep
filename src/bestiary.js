import * as THREE from 'three';
import { Sheep, Wolf, Goat, Catapult } from './entities.js';
import { FIRST_WAVE, BOSS_BY_ID } from './config.js';

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
    text: 'Follows its mother everywhere. Wolves go for lambs first, but every lamb that survives a wave is shorn for double wool.',
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
    tip: 'Wolves need twice as long to take him, and he is shorn for 3 wool. Losing him makes the flock jumpier.',
    make: (scene) => [new Sheep(scene, 'ram')],
  },
  {
    id: 'golden',
    side: 'flock',
    name: 'Golden Fleece',
    text: 'A rare sheep with a shining coat. Every wolf in the meadow wants it.',
    tip: 'Shorn for 10 wool at the end of each wave it survives.',
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
    text: 'Not a sheep, and it knows it. Only comes from the shop, counts as part of the flock, and gives no wool.',
    tip: 'Charges wolves that come near the flock, head-butts them away and frees any sheep they were holding.',
    make: (scene) => [new Goat(scene)],
  },
  {
    id: 'wolf',
    side: 'wolves',
    name: 'Wolf',
    text: 'Prowls the tree line, then goes for the sheep at the edge of the flock.',
    tip: 'Get close and it runs.',
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
    tip: 'It gives up if the dog gets close to its target, but it comes back quickly.',
    make: (scene) => [new Wolf(scene, 'runner')],
  },
  {
    id: 'rascal',
    side: 'wolves',
    name: 'Rascal',
    text: "A young wolf that doesn't hunt, it plays. It sprints straight through the flock again and again, tossing sheep in every direction.",
    tip: 'Cut across its path to scare it off before the flock is scattered all over the meadow.',
    make: (scene) => [new Wolf(scene, 'rascal')],
  },
  {
    id: 'howler',
    side: 'wolves',
    name: 'Howler',
    text: 'Never attacks. It sits just inside the tree line and howls, and the flock panics and scatters.',
    tip: 'Chase it off before the other wolves take advantage.',
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
    tip: 'It circles round to the side of the flock away from the dog. Watch your blind spot.',
    make: (scene) => [new Wolf(scene, 'sneaky')],
  },
  {
    id: 'brute',
    side: 'wolves',
    name: 'Brute',
    text: 'Big, slow and scarred. One bark is not enough to scare it.',
    tip: "Stay next to it until its fear meter fills. It can't finish a grab while you do.",
    make: (scene) => [new Wolf(scene, 'brute')],
  },
  {
    id: 'trickster',
    side: 'wolves',
    name: 'Trickster',
    text: 'A fox-like wolf that feints: it charges one side of the flock, then switches to the far side once the dog commits.',
    tip: "Don't over-commit. Wait until it is really going in.",
    make: (scene) => [new Wolf(scene, 'trickster')],
  },
  {
    id: 'alpha',
    side: 'wolves',
    name: 'Alpha',
    text: 'Leads the pack. While it is around the others attack sooner, and its howl sends them in together.',
    tip: 'Scare it and every wolf inside its ring runs too.',
    make: (scene) => [new Wolf(scene, 'alpha')],
  },
  {
    id: 'siege',
    side: 'wolves',
    name: 'Siege Crew',
    text: "A wolf drags a catapult in from the left or right to the edge of your meadow, winds it up and fires the wolf sitting in its bucket, crash helmet and all, into the middle of the flock. The landing throws sheep everywhere; the fired wolf runs off dizzy. It keeps firing every so often until you chase the crew off. It first comes as a boss, the Siege Engine (a bigger one whose crew can't be chased off at all), in runs that draw it for wave 5; only those runs see siege crews later on.",
    tip: 'Get to the catapult before it fires and the crew bolts. The red ring shows where the next wolf will land.',
    make: (scene) => {
      const c = new Catapult(scene).setPosition(-1.6, 0, -1.6);
      c.arm = -0.45;
      c.load(new Wolf(scene, 'flyer'));
      return [new Wolf(scene, 'siege'), c];
    },
  },
  {
    id: 'greymuzzle',
    side: 'wolves',
    name: 'Old Greymuzzle',
    text: 'The old leader of the pack, grey around the muzzle and bigger than any wolf you have seen. It comes for the flock at the end of summer.',
    tip: 'Stay next to it until its fear meter fills, three times. Each time it retreats it comes back with fresh wolves.',
    make: (scene) => [new Wolf(scene, 'greymuzzle')],
  },
  {
    id: 'piper',
    side: 'wolves',
    name: 'The Pied Piper',
    text: 'A boss in motley and a feathered hat. It stands at the edge of the meadow and plays its pipe every few seconds, and every sheep that hears it walks towards it. One that gets there is lured away for good. It pays no attention to the dog.',
    tip: 'Sheep still shy away from the dog, so put the dog between the piper and the flock while it plays.',
    make: (scene) => [new Wolf(scene, 'piper')],
  },
  {
    id: 'twins',
    side: 'wolves',
    name: 'The Twins',
    text: "A boss in two halves, one dark and one pale, coming from opposite sides. Scare one and it's back in a few seconds, unless its twin is scared before then too.",
    tip: 'Scare one, then race to the other before the line between them stops flashing.',
    make: (scene) => {
      const a = new Wolf(scene, 'twinDark').setPosition(-1.2, 0, 0);
      const b = new Wolf(scene, 'twinLight').setPosition(1.2, 0, 0);
      return [a, b];
    },
  },
  {
    id: 'burrower',
    side: 'wolves',
    name: 'The Burrower',
    text: "A boss in a miner's helmet. It travels under the meadow as a mound of earth, and comes up right beneath a sheep to take it. Sheep don't see it coming.",
    tip: 'Run the dog onto the mound to dig it out. It has to be dug out three times.',
    make: (scene) => [new Wolf(scene, 'burrower')],
  },
  {
    id: 'denMother',
    side: 'wolves',
    name: 'The Den Mother',
    text: "A boss who never takes a sheep herself. She prowls the edge of the meadow and calls a pack of pups every few seconds. When she runs, her pups scatter.",
    tip: 'Stand next to her until her fear meter fills, twice. The second time, all her pups go home with her.',
    make: (scene) => [new Wolf(scene, 'denMother')],
  },
  {
    id: 'disguised',
    side: 'wolves',
    name: "Wolf in Sheep's Clothing",
    text: 'Hides in the flock looking like a sheep, then throws off the fleece and grabs the nearest one.',
    tip: 'Look for the grey tail, grey legs and flat walk. Run the dog next to it to expose it early.',
    make: (scene) => [new Sheep(scene, 'disguised')],
  },
];

// When each one first turns up (a boss: its boss wave, even if a run draws another).
for (const e of ENTRIES) e.wave = e.id === 'siege' ? BOSS_BY_ID.siegeEngine.wave : BOSS_BY_ID[e.id]?.wave ?? FIRST_WAVE[e.id === 'pup' ? 'pups' : e.id] ?? 1;

export const ENTRY = Object.fromEntries(ENTRIES.map((e) => [e.id, e]));

// Which bestiary entry an animal belongs to.
export function entryId(animal) {
  if (animal.kind === 'normal') return animal instanceof Wolf ? 'wolf' : 'sheep';
  if (animal.kind === 'flyer') return 'siege'; // the fired wolf belongs to the siege crew's entry
  if (animal.kind === 'twinDark' || animal.kind === 'twinLight') return 'twins';
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
    return this.render(id, ENTRY[id].make);
  }

  // Render any set of models (`make(scene)` returns them) to a cached portrait.
  render(key, make) {
    if (this.portraits.has(key)) return this.portraits.get(key);
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
    const animals = make(stage);
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
    for (const a of animals) a.destroy?.(); // the dog's ring is added to the stage's scene
    this.portraits.set(key, url);
    return url;
  }
}

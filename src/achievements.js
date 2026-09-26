import { ENTRIES } from './bestiary.js';

// Achievements: 37 goals across runs. Lifetime counters (`life`) and this run's records (`run`) are
// updated by the game; `check()` unlocks anything newly met. Unlocks and lifetime counters are saved
// in localStorage.

const UNLOCKED_KEY = 'this-is-my-sheep.achievements';
const STATS_KEY = 'this-is-my-sheep.stats';

export const ACHIEVEMENTS = [
  // --- Waves
  { id: 'firstShift', group: 'Waves', icon: '🌅', name: 'First Shift', text: 'Finish wave 1.', done: (l, r) => r.wave >= 1 },
  { id: 'wave5', group: 'Waves', icon: '🐕', name: 'Good Boy', text: 'Finish wave 5.', done: (l, r) => r.wave >= 5 },
  { id: 'wave10', group: 'Waves', icon: '🏅', name: 'Veteran Sheepdog', text: 'Finish wave 10.', done: (l, r) => r.wave >= 10 },
  { id: 'wave15', group: 'Waves', icon: '👑', name: "Summer's End", text: 'Win a run: keep sheep alive to the end of the final wave (15).', done: (l, r) => r.won },
  { id: 'threeStars', group: 'Waves', icon: '🌟', name: 'Three-Star Summer', text: 'Win a run with ★★★ (30 or more sheep).', done: (l, r) => r.stars >= 3 },
  { id: 'fullOrders', group: 'Waves', icon: '📋', name: 'Full Orders', text: "Win a run without missing a single quota.", done: (l, r) => r.won && r.noStrikes },
  { id: 'goldenSummer', group: 'Waves', icon: '🏆', name: 'Golden Summer', text: 'Win a run with a golden fleece still in the flock.', done: (l, r) => r.goldenAtWin },
  { id: 'summer3', group: 'Waves', icon: '🍂', name: 'Seasoned Shepherd', text: 'Win Summer 3.', done: (l, r) => r.summerWon >= 3 },
  { id: 'summer8', group: 'Waves', icon: '🌲', name: 'Evergreen', text: 'Win Summer 8, the hardest summer.', done: (l, r) => r.summerWon >= 8 },
  { id: 'endless20', group: 'Waves', icon: '🌙', name: 'Indian Summer', text: 'Finish wave 20 (endless).', done: (l, r) => r.wave >= 20 },
  { id: 'endless25', group: 'Waves', icon: '❄️', name: 'First Frost', text: 'Finish wave 25 (endless).', done: (l, r) => r.wave >= 25 },
  { id: 'perfect', group: 'Waves', icon: '✨', name: 'Not One Lost', text: 'Finish a wave (from wave 2 on) without losing a sheep.', done: (l, r) => r.perfectWave },
  { id: 'flawless5', group: 'Waves', icon: '💎', name: 'Flawless Five', text: 'Finish waves 1 to 5 without losing a single sheep.', done: (l, r) => r.wave >= 5 && r.lostBy5 === 0 },
  // --- Wolves
  { id: 'scare10', group: 'Wolves', icon: '🐺', name: 'Shoo!', text: 'Scare off 10 wolves.', done: (l) => l.scares >= 10 },
  { id: 'scare250', group: 'Wolves', icon: '🌕', name: 'Wolf Whisperer', text: 'Scare off 250 wolves in total.', done: (l) => l.scares >= 250 },
  { id: 'combo5', group: 'Wolves', icon: '🔥', name: 'On a Roll', text: 'Reach a ×5 combo.', done: (l, r) => r.bestCombo >= 5 },
  { id: 'combo10', group: 'Wolves', icon: '⚡', name: 'Unstoppable', text: 'Reach a ×10 combo.', done: (l, r) => r.bestCombo >= 10 },
  { id: 'closeCall', group: 'Wolves', icon: '😅', name: 'Close One', text: 'Save a sheep at the very last moment.', done: (l) => l.closeCalls >= 1 },
  { id: 'rescuer', group: 'Wolves', icon: '🛟', name: 'Rescuer', text: 'Save 25 grabbed sheep in total.', done: (l) => l.saves >= 25 },
  { id: 'bigBark4', group: 'Wolves', icon: '📢', name: 'WOOOF!!', text: 'Scare 4 or more wolves with one Big Bark.', done: (l, r) => r.bestBigBark >= 4 },
  { id: 'packBreaker', group: 'Wolves', icon: '🐾', name: 'Pack Breaker', text: "Scatter an alpha's pack.", done: (l) => l.packScatters >= 1 },
  { id: 'pupPack', group: 'Wolves', icon: '🐶', name: 'Puppy Sweep', text: 'Scare a whole pup pack in one go.', done: (l) => l.pupCombos >= 1 },
  { id: 'brutes', group: 'Wolves', icon: '💪', name: 'Brute Force', text: 'Scare off 10 brutes in total.', done: (l) => l.brutes >= 10 },
  { id: 'exposed', group: 'Wolves', icon: '🕵️', name: 'Seen Through', text: "Sniff out a wolf in sheep's clothing before it strikes.", done: (l) => l.exposed >= 1 },
  { id: 'hush', group: 'Wolves', icon: '🤫', name: 'Hush', text: 'Scare off 5 howlers in total.', done: (l) => l.howlers >= 5 },
  // --- Flock
  { id: 'stampede', group: 'Flock', icon: '🛑', name: 'Stampede Stopper', text: 'Head off 10 stampedes in total.', done: (l) => l.stampedes >= 10 },
  { id: 'reunion', group: 'Flock', icon: '💞', name: 'Family Reunion', text: 'Bring an orphaned lamb back to the flock.', done: (l) => l.reunions >= 1 },
  { id: 'wakeUp', group: 'Flock', icon: '⏰', name: 'Rude Awakening', text: 'Wake up a sleepy sheep.', done: (l) => l.wakeUps >= 1 },
  { id: 'flock30', group: 'Flock', icon: '🐑', name: "Shepherd's Pride", text: 'Have 30 animals in the flock at once.', done: (l, r) => r.maxFlock >= 30 },
  { id: 'flock50', group: 'Flock', icon: '☁️', name: 'Sea of Wool', text: 'Have 50 animals in the flock at once.', done: (l, r) => r.maxFlock >= 50 },
  { id: 'golden3', group: 'Flock', icon: '🌟', name: 'Golden Years', text: 'Keep a golden fleece alive for 3 waves.', done: (l, r) => r.goldenStreak >= 3 },
  // --- Economy
  { id: 'wool100', group: 'Economy', icon: '🧶', name: 'Shearing Day', text: 'Earn 100 wool in one wave.', done: (l, r) => r.bestWaveWool >= 100 },
  { id: 'interest', group: 'Economy', icon: '🐷', name: 'Nest Egg', text: 'Collect the maximum interest on your savings.', done: (l, r) => r.maxInterest },
  { id: 'tufts', group: 'Economy', icon: '🎾', name: 'Bounty Hunter', text: 'Collect 20 bounty tufts in total.', done: (l) => l.tufts >= 20 },
  { id: 'goat', group: 'Economy', icon: '🐐', name: 'Good Goat', text: 'Have the goat head-butt 10 wolves in total.', done: (l) => l.goatButts >= 10 },
  { id: 'loudMax', group: 'Economy', icon: '🎯', name: 'Long Reach', text: "Max out the Dog's Reach upgrade.", done: (l, r) => r.loudMax },
  // --- Collection
  { id: 'naturalist', group: 'Collection', icon: '📖', name: 'Naturalist', text: 'Discover every animal in the bestiary.', done: (l) => l.discovered >= ENTRIES.length },
];

export const ACHIEVEMENT = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export class Achievements {
  constructor() {
    this.unlocked = new Set(load(UNLOCKED_KEY, []));
    this.life = load(STATS_KEY, {});
    this.enabled = false; // only real games count, not the menu's background scene
    this.newRun();
  }

  newRun() {
    this.run = {
      wave: 0,
      lostBy5: 0,
      perfectWave: false,
      bestCombo: 0,
      bestBigBark: 0,
      maxFlock: 0,
      goldenStreak: 0,
      bestWaveWool: 0,
      maxInterest: false,
      loudMax: false,
      won: false,
      stars: 0,
      goldenAtWin: false,
      summerWon: 0,
      noStrikes: false,
    };
  }

  has(id) {
    return this.unlocked.has(id);
  }

  // Lifetime counter.
  add(stat, amount = 1) {
    if (!this.enabled) return;
    this.life[stat] = (this.life[stat] ?? 0) + amount;
    this.dirty = true;
  }

  // Run record that only goes up.
  best(stat, value) {
    if (this.enabled && value > (this.run[stat] ?? 0)) this.run[stat] = value;
  }

  // Returns the achievements unlocked by this call.
  check() {
    const fresh = [];
    const life = new Proxy(this.life, { get: (t, k) => t[k] ?? 0 });
    for (const a of ACHIEVEMENTS) {
      if (!this.unlocked.has(a.id) && a.done(life, this.run)) {
        this.unlocked.add(a.id);
        fresh.push(a);
      }
    }
    if (fresh.length) save(UNLOCKED_KEY, [...this.unlocked]);
    if (this.dirty || fresh.length) save(STATS_KEY, this.life);
    this.dirty = false;
    return fresh;
  }
}

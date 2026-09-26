// First-time hints: a short tip the first time something happens in a game, shown once per player
// (remembered in localStorage).

const STORAGE_KEY = 'this-is-my-sheep.tips';

export const TIPS = {
  move: '🖱️ Click or tap the meadow to send your dog. Wolves inside the ring around it get scared off.',
  wolfComing: '🐺 A wolf is heading for the flock. Run your dog at it!',
  grabbed: '😱 A wolf grabbed a sheep! Get your dog there fast and it lets go.',
  bigBark: '🐕 Right-click, press Space or tap the 🐕 button for a Big Bark: it scares every wolf nearby. It recharges in 15 s.',
  shop: '🧶 Wool comes from shearing the sheep that survive. Spend it on upgrades and animals, or save some for interest.',
  tuft: '🎾 That wolf dropped a tuft of fur. Grab it with the dog for wool before it blows away!',
  stray: '❓ A sheep has wandered off. Get behind it and walk it back to the flock.',
  orphan: '🍼 A lamb lost its mother and ran off. Get behind it and walk it home.',
  brute: "💪 Brutes don't scare easily. Stay next to it until its meter fills.",
  stampede: '🛑 The black sheep is about to stampede! Get the dog in its way.',
  sleepy: '💤 Sleepy sheep won\'t run from wolves. Running past wakes them, but startles the sheep around them.',
  roam: '👨‍🌾 The shepherd is leading the flock to fresh grass. Keep up!',
  howl: '🌕 A howler panics the whole flock from the edge of the meadow. Chase it off.',
  rascal: '🎒 That rascal just wants to play. Cut across its path before it scatters the flock.',
  boss: '👑 Old Greymuzzle! Stay next to him until his meter fills. He has to be driven off three times.',
};

export class Tips {
  constructor() {
    try {
      this.seen = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch {
      this.seen = new Set();
    }
    this.enabled = false; // only during real games, not the menu's background scene
  }

  // Returns the tip's text the first time it's asked for, and null after that.
  take(id) {
    if (!this.enabled || this.seen.has(id) || !TIPS[id]) return null;
    this.seen.add(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.seen]));
    } catch {}
    return TIPS[id];
  }

  reset() {
    this.seen.clear();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}

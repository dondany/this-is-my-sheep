// First-time hints: a short tip the first time something happens in a game, shown once per player
// (remembered in localStorage).

const STORAGE_KEY = 'this-is-my-sheep.tips';

export const TIPS = {
  move: '🖱️ Click or tap the meadow to send your dog. Wolves inside the ring around it get scared off.',
  wolfComing: '🐺 A wolf is heading for the flock. Run your dog at it!',
  grabbed: '😱 A wolf grabbed a sheep! Get your dog there fast and it lets go.',
  bigBark: '📢 A Big Bark! Every wolf nearby flees, brutes included. There\'s no button for it: bark charms on the collar decide when your dog lets one out.',
  line: "📋 From now on the shepherd can spare only a few sheep each wave: three, plus a quarter of the flock. The number after the slash is the line (🐑 12 / 9): drop below it and the summer's over.",
  lastStand: "❤️‍🔥 You're on the line: one more lost sheep ends the summer. Your dog has found a second wind: faster, with a bigger reach. Hold on!",
  shop: "🧶 Drag a charm onto the collar to buy it (5 at most; drag one off to sell it), an animal onto your flock. Upgrade your dog's stats with the + buttons in the Your dog panel. Click a card for its details, or to ❄️ freeze it for the next wave.",
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

# Future ideas

Things proposed but not built yet. For what's already in the game see [`README.md`](README.md)
and the [design doc](shepherd_dog_threejs_game_plan.md) (sections 60 onwards cover everything built
since the original plan).

## More charms and specialties
Tricks brainstormed but not built yet (charms that change the rules, each with a catch):
- 🗣️ Echo: every Big Bark echoes from the shepherd a second later. Catch: the meter refills 40% slower.
- 🐾 Pack Leader: when you scare a wolf, the second dog dashes to the nearest threat and its scares
  count for your combo. Catch: needs the Second Dog; your reach −15%.
- 🐑 Safety in Numbers: a sheep with 5+ others close by can't be grabbed. Catch: stragglers are
  grabbed twice as fast.
- 🍼 Nursery: 2 extra lambs every wave. Catch: lambs are grabbed 50% faster (overlaps Lambing Season).
- 🖤 Stampede!: black sheep stampedes bowl over wolves, twice as often. Catch: they drag up to 5.
- 🐏 Battering Rams: rams and the goat head-butt wolves that come near; a ram joins every 3 waves.
  Catch: rams give no wool.
- 👴 Grumpy Old Man: the shepherd chases wolves near the flock with his crook. Catch: the flock
  follows him.
- 🪤 Snares: scarecrows hold the first wolf that walks in for 5 s. Catch: it howls for the pack.
- 🪆 Decoy: a straw sheep by the flock that wolves go for first; it can't be eaten and falls apart
  after two grabs a wave. Needs a sheep kind that wolves chase but that doesn't count anywhere.
- 💍 Jeweller (waiting for a decision): at the start of every wave, gives the charm to its left a
  random augment (Ghostly rarest, 10%), skipping charms that have one; crumbles after 3 uses. The
  one way to aim an augment. Alternatives: a one-shot "Jeweller's Loupe" that lets you pick the
  augment, or none (augments stay pure shop luck, like Balatro's base shop).
- A charm that takes two slots but is very strong.
- Fence posts along one side of the meadow. More cosmetics: shepherd outfits, sheep with bows or
  bells, more meadow themes (snow for endless mode).

## Roguelike roadmap (from the roguelike review, design doc sections 93-97)
- Starting dogs: Collie (balanced), Corgi (small reach, sheep react more), Great Pyrenees (slow,
  huge reach), Kelpie (fast, small reach). Unlocked by achievements; could bias the specialties
  offered.
- Choose your wave (Slay the Spire's map, Hades' doors): before a wave, "🌾 quiet wave" or "🌕 Wolf
  Moon: +2 wolves, a rare charm in the shop". Later: wave modifiers (fog: no arrows; rain: sheep
  bunch up; wind).
- Events between waves instead of the shop now and then: "a neighbour offers 3 sheep for your golden
  fleece", "a stray dog asks to join", "travelling merchant: a charm at half price".
- A second boss (random at wave 15), meadow layouts (river, fences), the seeded daily run.

## Balance
- Needs checking with real players. Build bots (design doc section 104) win 33-53% with each of the
  six builds and 0% without a plan, but they shop from a fixed list and don't read the meadow, so
  real runs will feel different. The strongest-looking combos to watch: Shepherd's Whistle + Crook
  (Crew), Tracker + Hot Streak (Hunter), On the Brink + Last Light (Edge).
- Wanderers, black sheep and golden fleeces are usually lost within a wave or two when nobody herds
  them. That may be fine; worth watching in real play.

## Replay value
- Daily run: the same waves and shop for everyone each day (a shared random seed), to compare
  how far everyone got.

## Presentation
- Outlines on the animals (design doc section 17), e.g. an inverted-hull outline for wolves.
- Music: a light countryside loop, with a tension layer while wolves attack and a boss theme.
- Seasons across a run: colours shift from spring to autumn over the waves, and endless mode turns
  to winter (snow, night, glowing wolf eyes). Would make "End of Summer" visible.

## Quality of life
- Settings: volume slider, camera sensitivity.
- A committed dev mode behind a URL flag (`?dev`): jump to a wave, spawn any animal, give wool.

## Tech
- Performance with big endless flocks (up to 90 sheep and 25 wolves): flocking is O(n²); check on
  phones and slower laptops, and add a low-quality option if needed.
- Split `src/game.js` (about 1,400 lines): the shop, the goal/boss logic and saving could each be
  their own module.

## Open design questions

Things we looked at and deliberately parked, with the options considered, so the decision can be
picked up later without redoing the thinking.

### Save scumming: quitting mid-wave restarts the wave

**Problem.** The run is saved at the start of each wave and on the end-of-wave screen (design doc
section 80). Quitting (or closing the browser) mid-wave and pressing Continue restarts that wave
from its beginning, so a wave that's going badly can be replayed. Slay the Spire has the same
behaviour and tolerates it because replaying is tedious; Balatro saves the exact moment instead.

**Options considered:**

1. **Keep it as it is.** Simple and robust; replaying costs you the whole wave again. *(Current
   behaviour.)*
2. **Make losses stick without restoring the fight.** *(Recommended if this becomes a problem.)*
   Keep the wave-start checkpoint, but also save every few seconds and immediately on every sheep
   lost: the flock as it is, the time left in the wave, how many wolves have arrived, and the
   score, wool and stats so far. On Continue the wave resumes with its remaining time; wolves that
   had arrived come back prowling at the tree line (not mid-attack) and a sheep being grabbed is
   let go. Quitting can't undo a loss, at most it buys a breather. Low risk: it doesn't try to
   restore wolf targets, fear meters, the boss's progress or stampedes.
   - Where it would go: `saveRun()` / `continueRun()` in `src/game.js`; save from `onSheepLost()`
     and on a timer during `STATE.PLAYING`; store `waveTime`, `wolvesSpawned`, the wolves' kinds
     and positions (and the boss's drive-offs left); on restore, spawn them with `toWander()`.
3. **Save the exact moment, like Balatro.** Every wolf's state and target, grabs in progress, the
   boss's progress, stampedes, tufts and the combo. The fairest, but the most fragile: lots of
   state to keep in sync, and a bug means a broken save.

### Going mobile: wrap the web game, or port to Godot?

**Goal.** Release on iOS / Android. The game is ~7,000 lines of JS plus ~2,000 of HTML/CSS UI,
all plain code (procedural models, synthesized audio, data in config modules).

**Options considered:**

1. **Wrap the web game (Capacitor), ~1-2 weeks.** *(Recommended first step.)* Ship the existing
   game in a native shell. Work: touch controls (thumb-sized Big Bark button), safe areas, pause
   on app background, low-end Android performance (big endless flocks), icons and store listings.
   Cheapest way to test the market; a PWA (installable web app) is an even cheaper step before it.
   Risk: three.js in a mobile webview is slower than native.
2. **Port to Godot 4, ~4-6 weeks.** A rewrite (no JS → GDScript conversion):
   - Data (config, upgrades, bestiary, achievements, cosmetics) → exported to JSON once. Small.
   - Simulation (flock, wolves, waves, economy, saves) → GDScript, mostly mechanical. Medium.
   - Models and procedural animation → rebuilt from primitives. Medium.
   - Toon shading, shadows, particles, instanced decor → shader, built-ins, MultiMesh. Medium.
   - UI (HUD, shop, bestiary, wardrobe, achievements, tips, summaries) → Control nodes and a
     Theme; nothing carries over. **Largest part.**
   - Audio → render the synthesized sounds to WAV once (OfflineAudioContext). Small.
   - Saves → `user://` files. Mobile export, signing, Game Center / Play Games. Medium.

**Suggested path.** Start with option 1. Before any port: split `game.js` so game logic is
separate from rendering/UI, move all tuning data into JSON both versions can read, and record the
sounds to files. Then port in this order: data → headless simulation checked against the same
strong/average bots (they become the port's regression test) → visuals → UI → mobile export.
Godot over Unity (licensing, weight) or Defold (2D-focused).


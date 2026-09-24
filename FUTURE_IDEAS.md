# Future ideas

Ideas proposed but not built yet. For what's already in the game, see the Animals table in
[`README.md`](README.md) and section 60 of the [design doc](shepherd_dog_threejs_game_plan.md).

Each idea lists what the player has to decide because of it, and a rough effort estimate against
the current code. Most sheep are a new entry in `SHEEP_TYPES` plus a model tweak in `Sheep`; most
wolves are a new entry in `WOLF_TYPES` plus a hook in `src/wolves.js`.

## Sheep

### Sleepy Sheep
- Lies down and doesn't move. It won't wander off, but it won't flee from wolves either.
- The dog wakes it by running past (a bark), but that also scatters the sheep around it.
- **Decision:** leave it asleep and guard it, or wake it up and deal with the scatter.
- **Effort:** small. A `sleeping` flag that skips wander and wolf fear in `flock.js`, a lying-down
  pose in `Sheep.animate`, and a wake-up when the dog comes within its fear radius.

### Golden Fleece (rare)
- Appears occasionally. Worth +100 wool if it's still alive at the end of the wave.
- Every wolf prefers it as a target.
- **Decision:** risk and reward. Wolves converge on one spot, which pulls the dog away from
  everything else.
- **Effort:** tiny. A type with a large `lure` and `wool`, a gold wool color, maybe a sparkle trail.

### Bellwether
- Wears a bell and rings it every few seconds; nearby sheep regroup around it.
- If it's taken, the flock loses cohesion for the rest of the wave.
- **Decision:** a second anchor, like the ram. It overlaps with the Old Ram, so pick one or make them
  mutually exclusive.
- **Effort:** tiny. It reuses the ram's `attract` / `attractRadius`, adds a periodic pulse and a bell
  sound, and applies a flock-wide cohesion penalty when it's lost.

### Goat (joke unit)
- Not a sheep, and it goes wherever it likes.
- Head-butts wolves that come close, stunning them for about a second.
- **Decision:** a small helper you can't control. Fun, but it makes the game easier.
- **Effort:** medium. It needs a new model (horns, beard, thinner body), its own wander logic, and a
  new wolf `STUNNED` state.

## Wolves

### Trickster (fox-like, orange)
- Feints: it charges one side of the flock, then swings round to the far side once the dog commits.
- Fragile: it flees from anything.
- **Decision:** it punishes over-reacting. Read its intent before moving the dog.
- **Effort:** medium. A `FEINT` state that watches the dog's velocity: once the dog heads its way,
  it retargets a sheep on the opposite side of the flock.

### Howler
- Stays at the tree line and howls. Each howl makes nearby sheep panic and scatter, feeding the other
  wolves.
- Never attacks itself.
- **Decision:** leave the flock to chase off something that isn't directly dangerous.
- **Effort:** small. A periodic panic pulse (raise `fear` and push sheep within a radius) and a
  `WANDER` that never switches to `APPROACH`.

### Pup Pack
- Three tiny wolves arrive together. Each is weak, and the dog scares them all in one pass if they're
  bunched up.
- They split up when the dog approaches.
- **Decision:** catch them while they're still grouped.
- **Effort:** small. Spawn three at once with a shared target, keep them together with a cohesion
  pull, and scatter them in different directions when the dog gets within about 8 units.

### Wolf in Sheep's Clothing (boss or late-game event)
- Looks exactly like a sheep and joins the flock at the start of the wave.
- After a while it throws off the disguise and grabs the nearest sheep.
- A tell gives it away: it walks slightly wrong, or its tail pokes out. Running the dog next to it
  exposes it early.
- **Decision:** paying attention inside the flock, not just around it.
- **Effort:** medium. A `Sheep` model with a hidden wolf tail, a reveal timer, a swap to a `Wolf`
  at the same position (with a puff and "IT'S A WOLF!"), and an early reveal when the dog is close.
  Could be the game's signature twist, perhaps a boss wave every 5 waves.

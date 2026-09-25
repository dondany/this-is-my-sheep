# This Is My Sheep

A small three.js arcade game: you're the shepherd's dog, and wolves are coming for the flock.
Click the meadow to send the dog running; wolves that get too close to it turn tail.

Design doc: [`shepherd_dog_threejs_game_plan.md`](shepherd_dog_threejs_game_plan.md) ·
What's next: [`FUTURE_IDEAS.md`](FUTURE_IDEAS.md)

## Controls

| Input | Action |
| --- | --- |
| Click / tap the meadow | Send the dog there (hold and drag to steer) |
| Right-click, Space, or the 🐕 button | **Big Bark**: every wolf within 12 units flees, brutes included, but sheep within 6 units get startled too. 15 s cooldown, shown on the button |
| Scroll, pinch, `+` / `-` | Zoom |
| Esc / P | Pause |
| B | Bestiary |

## Animals

The flock and the wolf pack get more varied as the waves go on: one new flock-side and one new
wolf-side animal per wave from wave 2 to 9 (`FIRST_WAVE` in `src/config.js`). Each type is a set of
numbers in `SHEEP_TYPES` / `WOLF_TYPES`, so balancing is mostly editing values there.

### The flock

| | Type | From wave | Behaviour |
| --- | --- | --- | --- |
| 🐑 | **Sheep** | 1 | Grazes, strolls, sticks with the flock. |
| 🐑 | **Wanderer** (beige fleece) | 2, one per wave | Strays far from the flock (a "?" pops up) and attracts wolves, but notices the dog from twice as far and runs home easily. |
| 🐑 | **Lamb** (small, big head) | 3, one or two per wave | Follows its mother. Wolves go for lambs first, but each surviving lamb pays double wool. If its mother is taken it bolts off alone ("MAMA?!"): herd it back to the flock and it adopts a new mother (♥). |
| 🐑 | **Sleepy Sheep** (lies down, eyes shut) | 4, one per wave | Dozes on the spot: never wanders, but never flees from wolves either, and wolves like an easy target. The dog running past wakes it with a start, scattering the sheep around it. It nods off again after 20–30 s. |
| 🐏 | **Old Ram** (horns) | 5, one per flock | Big, slow, ignores the dog and barely panics. Nearby sheep gather round him and panic less. Wolves need twice as long to take him, and he's shorn for 3 wool. If he's lost, a new ram joins next wave. |
| 🐑 | **Golden Fleece** (gold, sparkles) | 6, then sometimes | Rare. Every wolf prefers it. Shorn for 10 wool at the end of each wave it survives. |
| 🐑 | **Black Sheep** (dark fleece) | 7, one per flock | Every 12–18 s it stamps and snorts ("!"), then stampedes away from the flock, dragging up to 3 sheep along. Get the dog close to head it off (★ +10); otherwise it runs for 6 s or to the edge of the meadow. |
| 🐑 | **Bellwether** (collar and bell) | 8, one per flock | Rings its bell every 5–7 s and sheep within 10 units regroup around it. If a wolf takes it, the whole flock loses cohesion for the rest of the wave. |
| 🐐 | **Goat** | 9, one per game | Not a sheep. Ambles wherever it likes and head-butts wolves that come within 7 units ("BONK!"): they're dazed for 1.3 s and drop any sheep they were holding. Wolves ignore it. |

### The wolves

| | Type | From wave | Behaviour |
| --- | --- | --- | --- |
| 🐺 | **Wolf** | 1 | Prowls the tree line, goes for stragglers, flees from one bark. ★ 15. |
| 🐺 | **Pup Pack** (three tiny wolves) | 2 | Arrive and hunt as a group. Each pup is weak (★ 5, slow to take a sheep), and they split up once the dog has been within 8 units for a moment, so dash through them. Scare all three within 0.6 s for a ★ +30 bonus. They regroup later. |
| 🐺 | **Runner** (tan, big ears) | 3 | 1.6× faster, barely stalks, goes for the nearest sheep. Scared from further away, gives up a chase if the dog gets near its target, and comes back quickly. ★ 20. |
| 🐺 | **Howler** (blue-grey) | 4 | Never attacks. Prowls just inside the tree line and every 6–9 s sits back and howls: the whole flock panics and scatters away from it. Chase it off (★ 20). |
| 🐺 | **Sneaky Wolf** (dark, low to the ground) | 5 | Silent (no howl) and has no off-screen arrow until it's about 15 units from the flock. Circles the tree line to the side of the flock away from the dog before it moves in. ★ 25. |
| 🐺 | **Brute** (big, black, scarred) | 6 | Slow, and one bark isn't enough: keep the dog next to it for 1.5 s (fear meter over its head) and it flees. While resisting it backs off snarling and can't finish a grab. Shoves sheep aside and takes them faster. ★ 40. |
| 🦊 | **Trickster** (orange, fox-like) | 7 | Feints: once the dog is running at it, it switches to the sheep furthest from the dog ("HEH!"). Fragile: scared from further away. ★ 30. |
| 🐺 | **Alpha** (big, pale mane, ring on the ground) | 8, one per wave | While it's around, the other wolves stalk half as long; when it attacks it howls and every prowling wolf attacks with it. Scare it and every wolf inside its ring (10 units) flees too. ★ 50. |
| 🐺 | **Wolf in Sheep's Clothing** | 9, one per wave | Joins the flock as a new "sheep" (it doesn't count in the flock total). 15–25 s into the wave it throws off the fleece and goes for the nearest sheep. Tells: grey tail, grey legs, flat walk. Keep the dog next to it for half a second to expose it early (★ 40). |

Sheep walk on away from the dog when it comes close, which is what makes herding strays back work.
Later waves mix several of each (`wolfPack()` in `src/config.js`). The wave banner names the
newcomers each wave.

## Game feel

- **Hit-stop:** every wolf scared off the flock freezes the game for 50 ms (100 ms when an alpha's
  pack scatters).
- **Close calls:** rescuing a sheep with less than 0.4 s of grab time left triggers 0.6 s of
  slow motion, a camera push-in and "CLOSE ONE!".
- **Combos:** scares within 2.5 s of each other chain up: "COMBO ×N" grows with the chain, scores
  +10 per step (×2 = +10, ×3 = +20, …, capped at +90), plays a rising chime, and a badge under
  the top bar shows the chain and how long you have to extend it.

All the numbers are in `FEEL` at the top of `src/game.js`.

## Economy: Shearing Day

Two separate numbers:

- **★ Score** is for bragging: scaring wolves (★ 5–50 by type), rescues (★ 25), combos, heading off
  stampedes and so on. Your best score is saved and shown on the menu and game-over screens.
- **🧶 Wool** is what you spend, and it only comes from the flock. At the end of each wave the
  shepherd shears every surviving sheep:

| Source | Wool |
| --- | --- |
| Sheep, wanderer, sleepy, black sheep | 1 each |
| Lamb, bellwether | 2 each |
| Old Ram | 3 |
| Golden Fleece | 10 |
| Calm bonus: sheep never grabbed and not panicking for more than 2 s | +1 per 2 calm sheep |
| Perfect flock (nobody lost) | +2 |
| Interest: wool you didn't spend | +1 per 5, up to +3 |

**Bounty tufts:** the first time a brute (3), alpha (3) or trickster (2) is scared off it drops
a glowing tuft of fur worth that much wool. Run the dog over it within 8 s (it blinks before it
blows away). It's the only wool you can earn during a wave, and it's a detour away from the flock.

The end-of-wave screen breaks the total down. Tuning: `SHEARING` and `BOUNTY` in `src/config.js`.

## Upgrades

Wool buys upgrades on the end-of-wave screen: three random cards (two upgrades and one animal),
each with a price; buy any you can afford, or reroll the cards (1 wool, +1 per extra reroll that
wave). Level n of an upgrade
costs its base price × (n + 1), and everything resets when a run ends. Rare cards (gold border)
come up about a third as often.

| Card | Group | Base price | Effect per level | Max |
| --- | --- | --- | --- | --- |
| ⚡ Swift Paws | Dog | 4 | Dog runs and turns 10% faster | 5 |
| 📣 Loud Bark | Dog | 4 | Threat radius +12% | 5 |
| 😱 Scary Bark | Dog | 3 | Scared wolves run 20% longer | 3 |
| 🦴 Brave Heart | Dog | 4 | Brutes give up 25% sooner | 3 |
| 🌬️ Deep Lungs | Dog | 4 | Big Bark recharges 20% faster | 3 |
| 🎶 Calming Song | Shepherd | 3 | Sheep panic 15% less around wolves | 3 |
| 🪄 Herding Instinct | Shepherd | 3 | Flock cohesion +20% | 3 |
| 🧶 Thick Fleece | Flock | 4 | Wolves need 20% longer to take a sheep | 5 |
| 🐑 Bigger Flock | Flock | 3 | +2 sheep every wave | 3 |
| 🍼 Lambing Season | Flock | 3 | +1 lamb every wave | 2 |
| 🐕 Second Dog *(rare)* | Dog | 15 | A brown helper dog patrols around the shepherd and runs at wolves threatening the flock (80% speed, 70% threat radius) | 1 |
| 📯 Shepherd's Whistle *(rare)* | Shepherd | 10 | Every 20 / 15 / 10 s the shepherd whistles and every sheep heads back to him | 3 |
| 🌾 Scarecrow *(rare)* | Shepherd | 10 | Click the meadow to place it; ordinary wolves within 4.5 units get scared (brutes ignore it). Stays for the rest of the run | 2 |

### Livestock

One of the three cards offers an animal. It joins the flock at the start of the next wave and pays
for itself through shearing, as long as you keep it alive. Only animals that have already turned
up in the run are offered (a lamb always is), and each one you own makes the next of its kind
cost 50% more.

| Animal | Price | Shorn for | Notes |
| --- | --- | --- | --- |
| Lamb | 4 | 2 a wave | Joins a mother; wolves love lambs |
| Bellwether | 6 | 2 a wave | One per flock; its bell regroups the sheep |
| Old Ram | 8 | 3 a wave | One per flock; hard for wolves to take |
| Goat | 12 | — | One per game; head-butts wolves |
| Golden Fleece | 25 | 10 a wave | Every wolf wants it |

Definitions, prices and the card draw live in `src/upgrades.js`; `modifiers()` turns levels into
the multipliers the game reads (`ctx.mods`).

### Bestiary

Open it with 📖 (top bar, menu, pause and end-of-wave screens) or the **B** key; opening it mid-wave
pauses the game. Every animal starts as a dark silhouette with "???" and unlocks the first time it
shows up in a game (sneaky wolves once they come close, the disguised wolf once it's revealed), with
a card popping up in the corner. Portraits are rendered from the in-game models (`src/bestiary.js`).
Unlocks are saved in the browser's `localStorage`.

## Run locally

ES modules need an HTTP server (opening `index.html` via `file://` won't work):

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

No build step. Push to `main`, then in the repo's **Settings → Pages** set the source to
**Deploy from a branch → `main` / `(root)`**.

three.js is loaded from jsDelivr via the import map in `index.html`; all sounds are synthesized
with WebAudio, so there are no asset files.

## Code map

| File | What it does |
| --- | --- |
| `src/game.js` | State machine (menu → intro → playing → wave complete / game over), waves, main loop |
| `src/config.js` | Palette, tuning constants, per-wave difficulty |
| `src/entities.js` | Dog, Sheep, Wolf, Goat, Shepherd — primitive models + procedural animation |
| `src/flock.js` | Sheep steering (wander, separation, alignment, cohesion, fear), stampedes, bells, sleep, the goat |
| `src/wolves.js` | Wolf AI: WANDER → APPROACH → CHASE → ATTACK, FLEE, LEAVE, plus per-type twists |
| `src/juice.js` | Feedback for game events: rings, floating text, shake, flashes |
| `src/particles.js` | Single pooled `Points` particle system + presets |
| `src/audio.js` | Synthesized sound effects and ambience |
| `src/world.js` | Renderer, lights, camera rig, meadow, trees and decorations |
| `src/input.js` | Pointer → ground-plane raycast |
| `src/ui.js` | HUD, screens, bestiary screen, unlock cards, off-screen wolf indicators |
| `src/bestiary.js` | Bestiary entries, unlock persistence, portraits rendered from the models |
| `src/upgrades.js` | Upgrade cards: definitions, prices, card draws, stat multipliers |
| `src/helper.js` | AI for the Second Dog upgrade |

`window.game` is exposed in the console for debugging.

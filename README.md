# This Is My Sheep

A small three.js arcade game: you're the shepherd's dog, and wolves are coming for the flock.
Click the meadow to send the dog running; wolves that get too close to it turn tail.

Design doc: [`shepherd_dog_threejs_game_plan.md`](shepherd_dog_threejs_game_plan.md) ·
Ideas for later: [`FUTURE_IDEAS.md`](FUTURE_IDEAS.md)

## Animals

The flock and the wolf pack get more varied as the waves go on. Each type is a set of numbers in
`SHEEP_TYPES` / `WOLF_TYPES` in `src/config.js`, so balancing is mostly editing values there.

| | Type | From wave | Behaviour |
| --- | --- | --- | --- |
| 🐑 | **Sheep** | 1 | Grazes, strolls, sticks with the flock. |
| 🐑 | **Wanderer** (beige fleece) | 2, one per wave | Strays far from the flock (a "?" pops up) and attracts wolves, but notices the dog from twice as far and runs home easily. |
| 🐑 | **Lamb** (small, big head) | 4, one or two per wave | Follows its mother. Wolves go for lambs first, but each surviving lamb pays double wool. If its mother is taken it bolts off alone ("MAMA?!"): herd it back to the flock and it adopts a new mother (♥). |
| 🐑 | **Black Sheep** (dark fleece) | 8, one per flock | Every 12–18 s it stamps and snorts ("!") for a moment, then stampedes in a straight line away from the flock, dragging up to 3 nearby sheep along. Get the dog close to it to head it off (+10 wool); otherwise it runs for 6 s or to the edge of the meadow. |
| 🐏 | **Old Ram** (horns) | 5, one per flock | Big, slow, ignores the dog and barely panics. Nearby sheep gather round him and panic less. Wolves need twice as long to take him. If he's lost, a new ram joins next wave. |
| 🐺 | **Wolf** | 1 | Prowls the tree line, goes for stragglers, flees from one bark. 15 wool. |
| 🐺 | **Runner** (tan, big ears) | 3 | 1.6× faster, barely stalks, goes for the nearest sheep. Scared from further away, gives up a chase if the dog gets near its target, and comes back quickly. 20 wool. |
| 🐺 | **Sneaky Wolf** (dark, low to the ground) | 7 | Silent (no howl) and has no off-screen arrow until it's about 15 units from the flock. Circles the tree line to the side of the flock away from the dog before it moves in. 25 wool. |
| 🐺 | **Alpha** (big, pale mane, ring on the ground) | 9, one per wave | While it's around, the other wolves stalk half as long; when it attacks it howls and every prowling wolf attacks with it. Scare it and every wolf inside its ring (10 units) flees too. 50 wool. |
| 🐺 | **Brute** (big, black, scarred) | 6 | Slow, and one bark isn't enough: keep the dog next to it for 1.5 s (fear meter over its head) and it flees. While resisting it backs off snarling and can't finish a grab. Shoves sheep aside and takes them faster. 40 wool. |

Sheep walk on away from the dog when it comes close, which is what makes herding strays back work.
From wave 8 packs mix several Runners, Brutes and Sneaky Wolves, plus an Alpha from wave 9 (`wolfPack()` in `src/config.js`). The wave banner
introduces each new type the first time it appears.

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
| `src/entities.js` | Dog, Sheep, Wolf, Shepherd — primitive models + procedural animation |
| `src/flock.js` | Sheep steering: wander, separation, alignment, cohesion, fear |
| `src/wolves.js` | Wolf AI: WANDER → APPROACH → CHASE → ATTACK, FLEE, LEAVE |
| `src/juice.js` | Feedback for game events: rings, floating text, shake, flashes |
| `src/particles.js` | Single pooled `Points` particle system + presets |
| `src/audio.js` | Synthesized sound effects and ambience |
| `src/world.js` | Renderer, lights, camera rig, meadow, trees and decorations |
| `src/input.js` | Pointer → ground-plane raycast |
| `src/ui.js` | HUD, screens, off-screen wolf indicators |

`window.game` is exposed in the console for debugging.

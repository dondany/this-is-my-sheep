# This Is My Sheep

A small three.js arcade game: you're the shepherd's dog, and wolves are coming for the flock.
Click the meadow to send the dog running; wolves that get too close to it turn tail.

Design doc: [`shepherd_dog_threejs_game_plan.md`](shepherd_dog_threejs_game_plan.md) ·
What's next: [`FUTURE_IDEAS.md`](FUTURE_IDEAS.md) (including open design questions we've parked)

## Goal: End of Summer

Keep the flock safe until the end of summer: **survive wave 15**, and drive off the boss, Old
Greymuzzle, with at least one sheep left, and you win the run (the top bar shows "Wave 7 / 15"). The win screen rates the flock you brought home:
★ for any survivors, ★★ for 15 or more, ★★★ for 30 or more. Wins and your best star rating are
saved and shown on the menu.

**The line.** From wave 2 the shepherd can spare 2 sheep plus one in five of the flock a wave starts
with (3 of 9, 6 of 20, 10 of 40; the goat doesn't count). That draws the line, the number after the slash on the flock counter:
🐑 12 / 6. The bar under it shows how many you can still lose, and turns red on the line. The moment
the flock drops below it, the run is over ("The shepherd called it off"): no waiting out a lost
wave. Every wave draws a fresh line, so scraping through one wave doesn't doom the next (like a
Balatro blind). The margin is small on purpose: every lost sheep matters. Wave 1 is free, to learn the controls.

**Last Sheep Standing.** On the line, one more loss ends the run, so the dog finds a second wind:
+15% speed and +20% reach, the screen edge pulses red with a heartbeat ("HOLD THE LINE!"), and every
grab plays in slow motion so you can see it coming (`LAST_STAND` in `src/config.js`). Finishing a
wave on the line earns *Held the Line*.

**Few numbers.** The top bar shows just the flock (against the line), the wave, your wool and the
charms on the collar. There's no score: the result of a run is how far you got ("7 waves survived", the summer and
the stars), and that's what the menu remembers as your best.

Then choose **Menu** or **Keep grazing** for endless mode (like Balatro after the last ante):

- one more wolf every wave (up to 25), the extra slots all special wolves, and a second alpha;
- the flock cap rises from 60 to 90, and newcomers that don't fit are sold at market for 1 wool each.

### Summers (difficulty levels)

Winning unlocks the next summer, like Balatro's stakes; pick it with ◀ ▶ on the menu. Each one adds
a rule on top of all the earlier ones:

| Summer | Adds |
| --- | --- |
| 1 | The standard run |
| 2 | The flock starts with 4 sheep instead of 6 |
| 3 | One more wolf every wave |
| 4 | Wolves stalk 25% less before they attack |
| 5 | Shop prices +25% |
| 6 | No Big Bark until wave 5 |
| 7 | Brutes, sneaky wolves and the alpha turn up two waves earlier |
| 8 | Old Greymuzzle needs one more drive-off and comes early |

The highest summer unlocked and won are saved; achievements for winning Summer 3 and Summer 8.

Tuning: `GOAL`, `ENDLESS` and `SUMMERS` in `src/config.js`.

## Controls

| Input | Action |
| --- | --- |
| Click / tap the meadow | Send the dog there (hold and drag to steer) |
| Right-click, Space, or the 🐕 button | **Big Bark**: every wolf within 12 units flees, brutes included, but sheep within 6 units get startled too. The button is a meter: it refills in 25 s on its own, and every wolf you scare charges it, more the longer the combo |
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
| 🐑 | **Black Sheep** (dark fleece) | 7, one per flock | Every 12–18 s it stamps and snorts ("!"), then stampedes away from the flock, dragging up to 3 sheep along. Get the dog close to head it off; otherwise it runs for 6 s or to the edge of the meadow. |
| 🐑 | **Bellwether** (collar and bell) | 8, one per flock | Rings its bell every 5–7 s and sheep within 10 units regroup around it. If a wolf takes it, the whole flock loses cohesion for the rest of the wave. |
| 🐐 | **Goat** | 3, shop only | Only ever bought from the livestock card (one per run). Counts in the flock counter and takes a flock slot, but gives no wool. Charges wolves within 10 units of it and head-butts them ("BONK!"): knocked back 2.5 units, dazed for 2 s, and any sheep they were holding is freed. Stays near the flock. Wolves ignore it, and it can't keep the game going on its own. |

### The wolves

| | Type | From wave | Behaviour |
| --- | --- | --- | --- |
| 🐺 | **Wolf** | 1 | Prowls the tree line, goes for stragglers, flees from one bark. |
| 🐺 | **Pup Pack** (three tiny wolves) | 2 | Arrive and hunt as a group. Each pup is weak (slow to take a sheep), and they split up once the dog has been within 8 units for a moment, so dash through them. Scare all three within 0.6 s for a "PUP PACK!". They regroup later. |
| 🐺 | **Runner** (tan, big ears) | 3 | 1.6× faster, barely stalks, goes for the nearest sheep. Scared from further away, gives up a chase if the dog gets near its target, and comes back quickly. |
| 🐺 | **Rascal** (young, red bandana) | 3 | Doesn't take sheep. Yells "WHEEE!" and sprints straight through the middle of the flock 2–3 times, tossing sheep it hits high and wide; sheep only notice it at the last moment. Cut across its path to scare it off. |
| 🐺 | **Howler** (blue-grey) | 4 | Never attacks. Prowls just inside the tree line and every 6–9 s sits back and howls: the whole flock panics and scatters away from it. Chase it off. |
| 🐺 | **Sneaky Wolf** (dark, low to the ground) | 5 | Silent (no howl) and has no off-screen arrow until it's about 15 units from the flock. Circles the tree line to the side of the flock away from the dog before it moves in. |
| 🐺 | **Brute** (big, black, scarred) | 6 | Slow, and one bark isn't enough: keep the dog next to it for 1.5 s (fear meter over its head) and it flees. While resisting it backs off snarling and can't finish a grab. Shoves sheep aside and takes them faster. |
| 🦊 | **Trickster** (orange, fox-like) | 7 | Feints: once the dog is running at it, it switches to the sheep furthest from the dog ("HEH!"). Fragile: scared from further away. |
| 🐺 | **Alpha** (big, pale mane, ring on the ground) | 8, one per wave | While it's around, the other wolves stalk half as long; when it attacks it howls and every prowling wolf attacks with it. Scare it and every wolf inside its ring (10 units) flees too. |
| 🐺 | **Wolf in Sheep's Clothing** | 9, one per wave | Joins the flock as a new "sheep" (it doesn't count in the flock total). 15–25 s into the wave it throws off the fleece and goes for the nearest sheep. Tells: grey tail, grey legs, flat walk. Keep the dog next to it for half a second to expose it early. |
| 👑 | **Old Greymuzzle** (boss: huge, grey muzzle, mane and scars) | 15, and every 5 endless waves | Arrives a quarter of the way into the final wave with a low howl. Needs the dog next to it for 3 s (fear meter) and leads the pack like an alpha. Must be driven off 3 times (+1 per return in endless): after each of the first ones it comes back with two fresh wolves; the last time it leaves for good and drops a 10-wool tuft. The wave can't end until it's gone (overtime). Walks slow and heavy: every footfall thuds, puffs dust, shakes the screen a little and makes sheep within 12 units jump (higher the closer). |

Wolves arrive in pairs from opposite sides of the meadow: 3 in wave 1 and one more every other wave
(6 in wave 8, 10 in the final wave). Fewer wolves, but meaner: a growing share of the pack (35% early,
up to 80%) is special wolves, drawn at random from the kinds seen so far, each up to a cap. The kinds
new to a wave always come, and so does the alpha once it's around.
Sheep walk on away from the dog when it comes close, which is what makes herding strays back work.
Sheep keep a little personal space: two sheep closer than 1.8 units (scaled by size) are gently
pushed apart every frame, so the flock can't clog into one heap (Herding Instinct lets them stand
closer). The flock starts with 6 sheep and grows by a handful each wave (one plain sheep a wave plus the
troublemakers; capped at 60), so a big flock is something you earn. Later waves bring
fewer plain sheep and more troublemakers: wanderers and sleepy sheep go up to two a wave, and a
second black sheep joins from wave 10. The flock doesn't stay put: every 20–35 s the shepherd leads it to a new grazing spot ("This way,
girls!"), grazing sheep spread out, and sheep grow uneasy around a dog that parks among them (the
longer it sits still, the further they keep away), so camping in the middle of the flock doesn't
work.
See `wolfPack()` and `PACK` in `src/config.js`. The wave banner names the
newcomers each wave.

## Game feel

- **Scare jolt:** a scared wolf freezes for a beat with a startled jump and puff-up, and the dog
  recoils a little. The whole game only freezes (80 ms) for big moments: a Big Bark and a scattered
  alpha pack, at most once every 0.5 s.
- **Close calls:** rescuing a sheep with less than 0.4 s of grab time left triggers 0.4 s of
  slow motion (40% speed), a camera push-in and "CLOSE ONE!", at most once every 5 s.
- **Combos:** scares within 2.5 s of each other chain up: "COMBO ×N" grows with the chain, plays a
  rising chime, and a badge under the top bar shows the chain and how long you have to extend it.
  Combos charge the Big Bark: each scare adds 8% × the combo, so a ×4 chain fills most of it.

- **Bowling through the flock:** sheep the dog runs through at speed get knocked into a little
  bounce, tilt away from it and get nudged out of its path, with a puff of wool and a "boing"
  (`BUMP` in `src/config.js`).

- **Screen effects setting** (menu and pause screens): Full, Reduced (no freezes or slow motion,
  half-strength shakes and flashes) or Off. Saved in the browser.

All the numbers are in `FEEL` at the top of `src/game.js`.

## Economy: Shearing Day

**🧶 Wool** is the only currency, and it only comes from the flock. At the end of each wave the
shepherd shears every surviving sheep:

| Source | Wool |
| --- | --- |
| Sheep, wanderer, sleepy, black sheep | 1 each |
| Lamb, bellwether | 2 each |
| Old Ram | 3 |
| Golden Fleece | 10 |
| Calm bonus: sheep never grabbed and not panicking for more than 2 s | +1 per 3 calm sheep |
| Perfect flock (nobody lost) | +2 |
| Interest: wool you didn't spend | +1 per 5, up to +3 |

**Bounty tufts:** the first time a brute (3), alpha (3) or trickster (2) is scared off it drops
a glowing tuft of fur worth that much wool. Run the dog over it within 8 s (it blinks before it
blows away). It's the only wool you can earn during a wave, and it's a detour away from the flock.

The end-of-wave screen breaks the total down. Tuning: `SHEARING` and `BOUNTY` in `src/config.js`.

## The shop: charms and training (Balatro style)

Everything is bought with wool from the flock in the end-of-wave shop: **charms** are the jokers
(the build, hung on the dog's collar) and **training cards** are the planet cards (used up on the
spot, each raising one of the dog's stats by a level for the rest of the run). Every shop has two
charms, one training card and one animal.

### Training (the dog's levels)

A training card goes onto the dog (drag it onto "Your dog" in the sidebar, or click it and Buy).
It doesn't take a collar slot. The next level costs 5 + 3 per level already trained (5, 8, 11…).
The sidebar lists the dog's levels, like Balatro's hand levels.

| Training | Stat | Per level | Top level |
| --- | --- | --- | --- |
| ⚡ Sprints | Speed | The dog runs and turns 8% faster | 8 |
| 🎯 Reach | Reach | +0.5 (the ring: wolves inside it get scared, sheep react from proportionally further away); 2.5 at the start. Offered twice as often | 10 |
| 😱 Stare Down | Scare | Scared wolves stay away 15% longer | 6 |
| 🦴 Brave Heart | Grit | Brutes and the boss give up 12% sooner | 6 |
| 👃 Nose Work | Nose | Sneaky wolves show up 25% sooner; disguises sniffed out faster | 4 |
| 🐾 Pup Sprints *(needs Second Dog)* | Pup speed | Second dog +5% of your dog's speed | 8 |
| 🔊 Pup's Bark *(needs Second Dog)* | Pup reach | Second dog's reach +4% | 8 |

### Charms (wool)

Wool buys **charms** on the end-of-wave screen, hung on the dog's collar: up to **5** at once, one of
each. The shop shows four random cards (two charms, a training card and an animal); buy any you can afford, or
reroll them (2 wool, +2 per extra reroll that wave). With a full collar, sell a charm for half its
price to make room. During a wave the collar's charms show at the end of the top bar. Uncommon
charms (blue border) come up 60% as often as common ones, rare ones (gold) 35%.

**The shop screen** (Balatro style): the collar across the top with your wool, the wave's result
on the left (sheep home, the line, the wool it made, the dog's training), and the tray in the middle:
the shop with 🎲 Reroll and ▶ Next wave. Cards only show an icon and a
name; hover (or tap) one for the tooltip with its effect, catch and price.

- **Drag and drop:** drag a charm onto the collar to buy it, a training card onto your dog, an
  animal onto your flock (the sheep count on the left); drag a charm off the collar onto the red sell
  zone to sell it.
- **Click / tap:** selects a card, pins its tooltip and shows its buttons in place of the price:
  Buy, ❄️ Freeze or Sell. Click the background to put it back.

| Charm | Group | Rarity | Price | Effect |
| --- | --- | --- | --- | --- |
| 🏃 Zoomies | Dog | rare | 20 | +40% speed; dashing through a wolf at full speed scares it, brutes included. Catch: −30% reach |
| 🌙 Night Watch | Dog | rare | 20 | Reach ×1.8. Catch: −30% speed |
| 🗿 Sentinel | Dog | uncommon | 14 | Standing still, reach grows to ×2 over 2 s. Catch: −20% reach while moving |
| 🔥 Hot Streak | Dog | uncommon | 14 | Every combo step gives +6% speed and reach until the chain breaks (up to +30%). Catch: combo window 30% shorter |
| 🐺 Alpha Dog | Dog | rare | 22 | Plain wolves and pups flee on sight, from 1.8× the dog's reach. Catch: brutes and the boss hold out 50% longer |
| 🐕 Second Dog | Dog | rare | 35 | A brown helper dog patrols around the shepherd and runs at wolves threatening the flock. Starts slow: 55% of your dog's speed, reach 2.75, and it catches its breath for 1 s after each scare. Train it with pup training. Sold: it goes home |
| 🦯 Shepherd's Crook | Shepherd | common | 10 | The shepherd swats wolves within 4 units of him ("BONK!") |
| 🎶 Calming Song | Shepherd | common | 8 | Sheep panic 35% less around wolves |
| 🪄 Herding Instinct | Shepherd | common | 8 | Flock cohesion +40%, and sheep can stand 20% closer to each other |
| 📯 Shepherd's Whistle | Shepherd | rare | 20 | Every 15 s the shepherd whistles and every sheep heads back to him |
| 🌾 Scarecrows | Shepherd | rare | 20 | Click the meadow to place two; ordinary wolves within 4.5 units get scared (brutes ignore them). Taken down if sold |
| 🧶 Thick Fleece | Flock | uncommon | 14 | Wolves need 60% longer to take a sheep |
| 🐑 Bigger Flock | Flock | common | 8 | +2 sheep every wave |
| 🍼 Lambing Season | Flock | common | 8 | +2 lambs every wave |
| ✂️ Sharp Shears | Flock | uncommon | 12 | +30% wool from shearing |
| 🐷 Piggy Bank | Flock | common | 8 | Interest cap +3 |

**Tricks** are charms that change the rules, each with a catch (shown in red on the card):

| Charm | Rarity | Price | Effect | Catch |
| --- | --- | --- | --- | --- |
| 💰 Bounty Hunter | uncommon | 14 | Every wolf scared pays wool: 1, or the combo count in a combo (up to 5) | Shearing pays half |
| ✨ Golden Child | rare | 22 | A golden fleece joins every wave | Every wolf wants them |
| 🔋 Overcharge | uncommon | 14 | The Big Bark meter holds two barks ("×2" on the button) | It only fills from scares |
| 📯 Herding Horn | common | 10 | The Big Bark calls every sheep in its range to the dog instead of startling them | Wolves only flee from half the range |
| 💥 Chain Reaction | rare | 20 | A fleeing wolf scares every wolf it runs past ("DOMINO!", not the boss); each extends the combo | Scared wolves come back 30% sooner |
| ❤️‍🔥 On the Brink | uncommon | 12 | Last Sheep Standing starts one sheep above the line and is twice as strong | The shepherd spares one sheep fewer |
| 📈 Veteran | uncommon | 14 | Every wave finished without a loss gives +5% reach for good | Losing 3+ sheep in a wave resets it (so does selling it) |
| 🏕️ Staying Put | common | 8 | The shepherd never moves the flock to new grass | Wolves stalk 30% less |

### Freezing cards

Can't afford a card yet? Select it and choose ❄️ Freeze: a frozen card (blue, with a ❄️) stays in the
shop for the next wave (rerolls don't touch it) until you buy it or unfreeze it. Up to 2 cards can be frozen,
so saving up (with interest) for something specific is a real plan. Frozen cards are saved with
the run.

### Livestock

One of the three cards offers an animal. It joins the flock at the start of the next wave and pays
for itself through shearing, as long as you keep it alive. Only animals that have already turned
up in the run are offered (a lamb always is), and each one you own makes the next of its kind
cost 50% more.

| Animal | Price | Shorn for | Notes |
| --- | --- | --- | --- |
| Lamb | 6 | 2 a wave | Joins a mother; wolves love lambs |
| Bellwether | 10 | 2 a wave | One per flock; its bell regroups the sheep |
| Old Ram | 12 | 3 a wave | One per flock; hard for wolves to take |
| Goat | 18 | — | One per run, from wave 3; counts in the flock; head-butts wolves |
| Golden Fleece | 35 | 10 a wave | Every wolf wants it |

Definitions, prices and the card draw live in `src/upgrades.js`; `modifiers()` turns levels into
the multipliers the game reads (`ctx.mods`).

### Bestiary

Open it with 📖 (top bar, menu, pause and end-of-wave screens) or the **B** key; opening it mid-wave
pauses the game. Every animal starts as a dark silhouette with "???" and unlocks the first time it
shows up in a game (sneaky wolves once they come close, the disguised wolf once it's revealed), with
a card popping up in the corner. Portraits are rendered from the in-game models (`src/bestiary.js`).
Unlocks are saved in the browser's `localStorage`.

### Saving and continuing

The run in progress is saved in `localStorage` at two checkpoints: the start of each wave, and the
end-of-wave screen (updated as you buy or reroll). With a saved run the menu shows **Continue ·
wave 7** (or "wave 7 done") and **New Game**, which asks for a second click before overwriting the
save. Continuing after quitting or closing the browser mid-wave restarts that wave from its
beginning with the flock as it was; continuing from the end-of-wave screen brings back the same
shop (or the win screen). Losing deletes the save.

### Run summary

The win and game-over screens sum up the run: wolves scared, sheep saved (and close calls), sheep
lost and what took them ("Lost to: Runner ×3 · Brute ×2…"), best combo, Big Barks, wool earned
and spent, bounty tufts, the upgrades you owned and the animals you bought.

### First-time tips

The first time something happens in a game (a wolf closes in, a sheep is grabbed, the first shop,
a tuft drops, a brute resists, a stampede winds up, the boss arrives…) a short tip slides in above
the Big Bark button. Each tip shows once per player (saved in `localStorage`); "Show the first-time
tips again" on the menu resets them. The texts are in `src/tips.js`.

### Wardrobe

🎀 on the menu: cosmetics for the dog and the meadow, each unlocked by an achievement (nothing to
grind). Coats (Border Collie, Blue Merle, Red Collie, Golden, and a short-legged Corgi), neckwear
(bandanas, a tartan scarf, a bell collar, a flower garland), hats (straw hat, flower crown, a tiny
shepherd's hat, winter beanie, golden crown) and meadow themes (Summer, Blossom, Autumn, Lavender).
Each item shows a preview of the dog wearing it; locked ones show the achievement that unlocks
them, and the achievements screen shows each one's 🎁 reward. Choices are saved in `localStorage`;
the list is in `src/cosmetics.js`.

### Achievements

37 achievements in five groups (waves, wolves, flock, economy, collection), from "Finish wave 1"
to "Scare off 250 wolves in total" and "Keep a golden fleece alive for 3 waves". Open them with
🏆 on the menu, pause, end-of-wave and game-over screens (opening mid-wave pauses). A card pops up
in the corner when one unlocks. Unlocks and lifetime counters are saved in `localStorage`; the
list lives in `src/achievements.js`.

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

## Field guide (internal)

`guide.html` is a reference page describing everything in the game: how to play, the goal and
Summers, the economy, every animal (with its in-game portrait and stats), a wave-by-wave table, all
upgrades with prices per level, livestock and achievements. It's generated in the browser from the
game's own data (`src/guide.js` reads `config.js`, `upgrades.js`, `bestiary.js` and
`achievements.js`), so it stays in sync with the code.

It's deliberately **not linked from the game** and asks search engines not to index it. It's still
public: anyone with the URL (`…/this-is-my-sheep/guide.html`) can open it. Locally:
http://localhost:8000/guide.html.

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
| `src/guide.js` | Builds the internal field guide (`guide.html`) from the game's data |
| `src/cosmetics.js` | Wardrobe items, how accessories are built, and the saved choices |
| `src/tips.js` | First-time tips and which ones the player has seen |
| `src/achievements.js` | The 37 achievements, lifetime counters and unlock checks |
| `src/upgrades.js` | Training (the dog's levels), charms, livestock; card draws and the multipliers they add up to |
| `src/cards.js` | Shop cards: the card element, its tooltip, drag and drop onto drop zones |
| `src/helper.js` | AI for the Second Dog upgrade |

`window.game` is exposed in the console for debugging.

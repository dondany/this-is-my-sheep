# This Is My Sheep

A small three.js arcade game: you're the shepherd's dog, and wolves are coming for the flock.
Click the meadow to send the dog running; wolves that get too close to it turn tail.

Design doc: [`shepherd_dog_threejs_game_plan.md`](shepherd_dog_threejs_game_plan.md) ·
What's next: [`FUTURE_IDEAS.md`](FUTURE_IDEAS.md) (including open design questions we've parked), and the plan to
release it on phones: [`ROADMAP.md`](ROADMAP.md) (refinement, next steps, monetization, mobile).

## Goal: End of Summer

Keep the flock safe until the end of summer: **survive wave 15**, and drive off the boss, Old
Greymuzzle, with at least one sheep left, and you win the run (the top bar shows "Wave 7 / 15"). The win screen rates the flock you brought home:
★ for any survivors, ★★ for 15 or more, ★★★ for 30 or more. Wins and your best star rating are
saved and shown on the menu.

**The line.** From wave 2 the shepherd can spare 3 sheep plus a quarter of the flock a wave starts
with (5 of 9, 8 of 20, 13 of 40; the goat doesn't count). That draws the line, the number after the slash on the flock counter:
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
| 6 | The collar has one slot fewer (4) |
| 7 | Brutes, sneaky wolves and the alpha turn up two waves earlier |
| 8 | Old Greymuzzle needs one more drive-off and comes early |

The highest summer unlocked and won are saved; achievements for winning Summer 3 and Summer 8.

Tuning: `GOAL`, `ENDLESS` and `SUMMERS` in `src/config.js`.

## Controls

| Input | Action |
| --- | --- |
| Click / tap the meadow | Send the dog there (hold and drag to steer) |
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
| 🏰 | **Siege Crew** (drags a catapult; the wolf it fires wears a white-and-red crash helmet) | 5 (boss), 10 | Only in runs whose wave-5 boss was the Siege Engine (it first shows up as that boss); in the others there are no catapults. Comes on top of the wave's pack, always halfway through the wave. Arrives from the left or right only (the top and bottom of the screen show too little of the meadow's edge) and hauls a wooden catapult, with the next wolf curled up in the bucket, towards the edge of the dog's meadow, straight in from where it came, stopping at the edge of the screen if that comes first (the camera doesn't move for it). Never more than one a wave, whatever sends it. Fires a wolf into the flock 2 s after it stops ("LOADING…"), then another every 6 s for the rest of the wave: a red ring marks the landing spot 1.6 s before, the wolf tumbles through the air ("WHEEE!") and lands with a "KA-THUNK!" that throws every sheep within 8 far outward. The fired wolf stands dizzy, then runs off. Get the dog to the crew and it bolts for good; the catapult falls apart (*Siege Breaker* if it hadn't fired yet). **The Siege Engine, one of the wave-5 bosses:** a bigger catapult flying a red banner that rolls in at the very start of the wave, same firing timing, but its crew can't be scared at all ("NOT BUDGING!"), so it fires until the wave ends. |
| 👑 | **Old Greymuzzle** (boss: huge, grey muzzle, mane and scars) | 15, and every 5 endless waves | Arrives a quarter of the way into the final wave with a low howl. Needs the dog next to it for 3 s (fear meter) and leads the pack like an alpha. Must be driven off 3 times (+1 per return in endless): after each of the first ones it comes back with a fresh wolf; the last time it leaves for good. The wave can't end until it's gone (overtime). Walks slow and heavy: every footfall thuds, puffs dust, shakes the screen a little and makes sheep within 12 units jump (higher the closer). |

**Bosses** (`BOSSES` in `config.js`) all come the same way, on top of their wave's pack: a red
BOSS card slams in with the boss's icon, name and what to do, over a war horn, a red flash and a
shout over the boss; the wave's intro says "Wave N · Boss"; a red bar under the HUD shows the boss
and its status while it's around; and its marker at the edge of the screen is bigger, with its
icon. Waves 5, 10 and 15 are boss waves, like Balatro's boss blinds: each run draws its wave-5 boss
from a *survive* pool (can't be beaten, only lasted out; 🧶 10 bounty at shearing) and its wave-10
boss from a *fight* pool (can be beaten; 🧶 15 if it is), and the shop before a boss wave says which
boss is coming.

| Wave | Boss | What it does |
|---|---|---|
| 5 | 🏰 **The Siege Engine** | A bigger catapult with a red banner, from the start of the wave. Its crew can't be scared ("NOT BUDGING!"), so it fires until the wave ends. |
| 5 | 🎶 **The Pied Piper** (purple and yellow motley, pointed green hat with a red feather, a pipe) | Walks to the edge of the screen (left or right) at the start of the wave, then plays a 4 s tune every 14 s (notes float up, a lilting pipe). While it plays, every awake sheep is pulled towards it on top of its usual urges, so the flock stretches its way, held back by the growing pull home to the shepherd; the first sheep to reach the piper is "LURED AWAY!" for good (one a tune), and the stretched flock is easy pickings for the other wolves. Can't be scared, and sheep don't fear it; they still shy away from the dog, so the dog standing in the way holds them back. Sleeping sheep sleep through it. |
| 10 | 🌗 **The Twins** (one near-black, one pale) | Two big fast wolves from opposite sides, 10% into the wave, joined by a thin red line. Scare one and it runs for 5 s ("NOW THE OTHER ONE!", the line flashes, the bar counts down) and comes straight back, unless the other is scared in that time too: then both leave for good ("TWINS BEATEN!"). |
| 10 | 🕳️ **The Burrower** (miner's helmet with a lamp) | Travels under the meadow as a mound of earth towards a sheep; underground it can't be barked at, scarecrows don't work, and sheep don't notice it. Under its sheep it comes up ("SURPRISE!"), throwing the sheep around it aside, and grabs it (save it as usual). Run the dog onto the mound to dig it out ("DUG OUT!"), which counts as a drive-off: 3 of them, then it's gone. |
| 10 | 🐾 **The Den Mother** (big, reddish, cream ruff) | Prowls just inside the meadow's edge and never takes a sheep herself; every 25 s she calls a pup pack that runs straight for the flock (one pack at a time). A fear meter like a brute's (1.8 s): every drive-off scatters all the pups, and the second sends them home with her. |
| 15, every 5th endless | 👑 **Old Greymuzzle** | A quarter of the way in; driven off 3 times; the wave goes into overtime until he is. |

A new boss needs an entry in `BOSSES`, its spawn in `Game.spawnBoss()` and its bar status in
`Game.bossStatus()`.

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
  On their own combos are just celebration; charms like Hot Streak and Combo Bark build on them.

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

**Wool only comes from the flock.** Wolves drop nothing; charms can only multiply what the flock
gives (Sharp Shears, Proud Shepherd, Golden Child…).

The end-of-wave screen breaks the total down. Tuning: `SHEARING` in `src/config.js`.

## The shop: charms and the dog (Balatro style)

Everything is bought with wool from the flock at the end of a wave, in two separate ways:
**charms** are the jokers (cards in the shop, hung on the dog's collar: the build), and the
**dog's stats** are upgraded directly in the "Your dog" panel (no cards, no luck). Every shop
has two charms and one animal.

### The dog's stats

The "Your dog" panel, right of the shop, lists the dog's stats: each with its level in dots
(●●○○○) and a **+ 🧶price** button that raises it one level. Any number of levels can be bought in
one shop. Every stat has 5 levels, and each level costs twice the last (15, 30, 60, 120, 240), so
a run can't max everything: each level is a choice. Hover (or tap) a stat for its effect, the
current bonus and the next one. Haggler's discount applies; Summer 5+ adds 25%.

| Stat | Each level | At level 5 |
| --- | --- | --- |
| ⚡ Speed | The dog runs and turns 8% faster | +40% |
| 🎯 Reach | +0.5 (the ring: wolves inside it get scared, sheep react from proportionally further away); 2.5 at the start | +2.5 |
| 😱 Scare | Scared wolves stay away 15% longer | +75% |
| 🦴 Grit | Brutes and the boss give up 12% sooner | 60% sooner |
| 👃 Nose | Sneaky wolves show up 25% sooner; disguises sniffed out faster | +125% |
| 🐾 Pup speed *(with the Second Dog; prices ×1.5)* | Second dog +8% of your dog's speed | 55% → 95% |
| 🔊 Pup reach *(with the Second Dog; prices ×1.5)* | Second dog's reach +8% | 55% → 95% |

### Charms (wool)

Wool buys **charms** on the end-of-wave screen, hung on the dog's collar: up to **5** at once, one of
each. The shop shows three random cards (two charms and an animal); buy any you can afford, or
reroll them (2 wool, +2 per extra reroll that wave). With a full collar, sell a charm for half its
price to make room. During a wave the collar's charms show at the end of the top bar. Uncommon
charms (blue border) come up 60% as often as common ones, rare ones (gold) 35%, the legendary
Mimic Bell 6%. Some charms change over a run: decaying ones (Fresh Bone, Snack Pack, Fizzy Water)
fade and are used up, growing ones (Trophy Wall, Campfire, Market Day) get better, and Old Scar eats
the charm to its right at the start of every wave.

**The shop screen** (Balatro style): the collar across the top with your wool, the wave's result
on the left (sheep home, the line, the wool it made), the tray in the middle (the shop with 🎲
Reroll and ▶ Next wave), and "Your dog" on the right. Cards only show an icon and a
name; hover (or tap) one for the tooltip with its effect, catch and price.

- **Drag and drop:** drag a charm onto the collar to buy it, an animal onto your flock (the sheep count on the left); drag a charm off the collar onto the red sell
  zone to sell it, or along the collar to reorder (Mimic Bell copies the charm to its right).
- **Click / tap:** selects a card, pins its tooltip and shows its buttons in place of the price:
  Buy, ❄️ Freeze or Sell. Click the background to put it back.

**72 charms.** Each is a rule change or a boost, many with a catch (in red on the card). Charms with
a number stack if a Mimic Bell copies them; on/off ones can't be doubled. Big Barks only come from
bark charms (there's no button). Wool only comes from the flock: charms can make shearing pay more,
never wolves.

**🐕 Your dog**

| Charm | Rarity | Price | Effect | Catch |
| --- | --- | --- | --- | --- |
| 🏃 Zoomies | rare | 20 | +40% speed. Dashing through a wolf at full speed scares it, brutes included. | -30% reach. |
| 🌙 Night Watch | rare | 20 | Reach ×2. | -20% speed. |
| 🗿 Sentinel | uncommon | 14 | Standing still, the dog's reach grows to ×2 over 1.2 s. | -20% reach while moving. |
| 🔥 Hot Streak | uncommon | 14 | Every combo step gives +6% speed and reach until the chain breaks (up to +30%). | The combo window is 30% shorter. |
| 🐺 Alpha Dog | rare | 22 | Plain wolves and pups flee on sight, from 1.8× the dog's reach. | Brutes and the boss hold out 50% longer. |
| 🐾 Tracker | common | 8 | The dog runs 20% faster while a wolf is going for the flock. | 10% slower the rest of the time. |
| 🐕 Second Dog | rare | 40 | A young dog joins you and guards the flock on its own. Slow and easily winded at first: upgrade its speed and reach in the shop. |  |
| 🎵 Chorus | uncommon | 12 | The second dog lets out a Big Bark of its own (60% of the range) whenever yours does. (needs Second Dog) |  |
| 🥩 Fresh Bone | common | 6 | +40% reach, 8% less every wave; gone after 5 waves. |  |
| 🍿 Snack Pack | common | 6 | +40% speed, 8% less every wave; gone after 5 waves. |  |
| 🎖️ Trophy Wall | uncommon | 12 | +1% reach for every 10 wolves scared this run (up to +40%). |  |
| 🔥 Campfire | uncommon | 12 | +8% speed for every charm you sell (up to +48%). Burns out after the boss. |  |
| 🦉 Night Owl | common | 8 | +25% reach in the second half of every wave. |  |

**📢 Bark**

| Charm | Rarity | Price | Effect | Catch |
| --- | --- | --- | --- | --- |
| 📣 Bark Collector | uncommon | 10 | Big Barks reach 10% further for every bark charm on the collar. |  |
| 🧲 Magnet Collar | common | 8 | Big Barks also send straying sheep back to the flock. |  |
| 📢 Watchdog | common | 8 | The dog lets out a Big Bark every 8 s: every wolf nearby flees, brutes included, and stays away 60% longer. |  |
| 🧨 Short Fuse | common | 6 | Watchdog's Big Barks come twice as often. (needs Watchdog) | Big Barks reach 40% less far. |
| 💥 Booming Bark | common | 8 | Big Barks reach 40% further. |  |
| 🔔 Alarm Bell | uncommon | 12 | A Big Bark whenever a wolf grabs a sheep (at most every 2 s). |  |
| ⚡ Combo Bark | uncommon | 14 | Every ×4 combo sets off a Big Bark. |  |
| 😤 Howl Back | uncommon | 10 | The dog barks back at every howl: the howler flees before the flock panics. |  |
| 🗣️ Echo | rare | 20 | Every Big Bark echoes from the shepherd a second later. |  |
| 🌩️ Thunderclap | rare | 24 | Big Barks knock wolves dizzy for a moment, then they run twice as far. |  |
| 🔋 Pent Up | rare | 22 | Every 4th Big Bark is a Mega Bark: double the range, and it calms the whole flock. |  |
| 🕯️ Last Light | uncommon | 12 | On the line, a Big Bark every 5 s. |  |
| 📯 Herding Horn | common | 10 | The Big Bark calls every sheep in its range to the dog instead of startling them. | Wolves only flee from half the range. |

**👨‍🌾 Shepherd and helpers**

| Charm | Rarity | Price | Effect | Catch |
| --- | --- | --- | --- | --- |
| 🦯 Shepherd's Crook | common | 10 | The shepherd swats wolves that come within 3.5 units of him. |  |
| 🎶 Calming Song | common | 8 | Sheep panic 35% less around wolves. |  |
| 🪄 Herding Instinct | common | 8 | The flock sticks together 40% more tightly, and sheep can stand 20% closer to each other. |  |
| 📯 Shepherd's Whistle | rare | 20 | Every 20 s the shepherd whistles the whole flock back to him. |  |
| 🌾 Scarecrows | rare | 20 | Place two scarecrows that scare off ordinary wolves (not brutes). They go if you sell this charm. |  |
| 👴 Grumpy Old Man | uncommon | 14 | The shepherd goes after wolves near the flock himself and swats them with his crook. | The flock trails after him. |
| 🪤 Snares | uncommon | 12 | Each scarecrow holds the first wolf that comes near it every wave for 5 s. (needs Scarecrows) |  |
| 🦴 Lucky Bone | rare | 18 | Once, when the flock drops below the line, the shepherd lets it go. Then the bone breaks. |  |
| 🙏 Shepherd's Favor | uncommon | 12 | The shepherd spares 2 more sheep every wave. | Shearing pays 25% less. |
| ⏳ Early Supper | common | 6 | Waves are 20% shorter. | Shearing pays 20% less. |

**🐑 The flock**

| Charm | Rarity | Price | Effect | Catch |
| --- | --- | --- | --- | --- |
| 🧶 Thick Fleece | uncommon | 14 | Wolves need 90% longer to take a sheep. |  |
| 🐑 Bigger Flock | common | 8 | +3 sheep join every wave. |  |
| 🍼 Lambing Season | common | 8 | +3 lambs every wave (they pay double). |  |
| ✂️ Sharp Shears | uncommon | 12 | +30% wool from shearing. |  |
| 🐷 Piggy Bank | common | 8 | Interest on unspent wool can go 3 higher. |  |
| 🐏 Battering Rams | uncommon | 14 | Rams head-butt wolves that come near them, like the goat. A ram joins every 4 waves. | Rams give no wool. |
| 🛡️ Safety in Numbers | uncommon | 14 | Wolves can't take a sheep that has 4 or more others close around it. | Stragglers (fewer than 2 close by) are taken twice as fast. |
| 🤞 Sheepdog's Oath | rare | 22 | The first three times a wolf grabs a sheep each wave, it lets go and runs. |  |
| 🔔 Bellwether's Call | uncommon | 12 | A bellwether joins the flock (if there isn't one), and its bell rings twice as often and reaches 50% further. |  |
| 🌻 Greener Pastures | uncommon | 12 | Calm sheep take wolves 60% longer to grab, and the calm bonus at shearing is doubled. |  |
| 💪 Strength in Numbers | rare | 22 | The dog gets +1% speed and reach for every sheep in the flock (up to +50%). |  |
| 🥤 Fizzy Water | common | 8 | Wolves need twice as long to take a sheep, for the next 3 waves. Then it's gone. |  |

**🧶 Wool**

| Charm | Rarity | Price | Effect | Catch |
| --- | --- | --- | --- | --- |
| 🥚 Nest Egg | common | 4 | Sells for 4 more wool for every wave it stays on the collar. |  |
| 🏷️ Haggler | uncommon | 12 | Everything in the shop costs 30% less, and rerolls always cost 1. |  |
| 🧺 Wool Market | uncommon | 10 | Animals cost half, and the shop offers two of them. |  |
| 🏦 Savings Account | rare | 18 | Interest on unspent wool has no cap. | You can't reroll the shop. |
| 🍖 Well Fed | uncommon | 14 | The dog gets +1% speed and reach for every 4 wool you keep unspent (up to +60%). |  |
| 🎪 County Fair | rare | 20 | Shearing pays +1 wool for every 2 sheep, and +5 for a wave with no losses. |  |
| 🚀 Market Day | uncommon | 10 | +1 wool at shearing, and 1 more for every 2 waves it stays on the collar. |  |
| 🎲 Loaded Dice | common | 6 | The first reroll in every shop is free. |  |
| 🎁 Collar Polish | uncommon | 8 | Every wave, your other charms sell for 1 more. |  |

**🎭 Tricks**

| Charm | Rarity | Price | Effect | Catch |
| --- | --- | --- | --- | --- |
| 🏆 Proud Shepherd | uncommon | 14 | Every combo that reaches ×3 makes the shepherd prouder: +8% wool from that wave's shearing (up to +80%). |  |
| ✨ Golden Child | rare | 22 | A golden fleece (10 wool a wave) joins every wave. | Every wolf wants them. |
| 💥 Chain Reaction | rare | 20 | A fleeing wolf scares every wolf it runs past (not the boss). Each one extends the combo. | Scared wolves come back 30% sooner. |
| ❤️‍🔥 On the Brink | uncommon | 12 | Last Sheep Standing starts one sheep above the line and is twice as strong. | The shepherd spares one sheep fewer. |
| 📈 Veteran | uncommon | 14 | Every wave you finish without losing a sheep gives the dog +5% reach, for good. | Losing 3 or more sheep in a wave resets it. |
| 🏕️ Staying Put | common | 8 | The shepherd never moves the flock to new grass. | Wolves learn the spot: they stalk 30% less. |

**❤️‍🔥 Edge**

| Charm | Rarity | Price | Effect | Catch |
| --- | --- | --- | --- | --- |
| 🩸 Blood Price | uncommon | 10 | Every sheep lost leaves its fleece behind: +3 wool each at shearing. | Sheep panic 25% more. |
| 🎲 Double or Nothing | common | 6 | A wave with no losses shears double. | Any loss and it shears half. |
| 🌑 Wolf Moon | rare | 18 | Shearing pays 40% more. | One more wolf every wave. |

**🧿 Collar**

| Charm | Rarity | Price | Effect | Catch |
| --- | --- | --- | --- | --- |
| 🪞 Mimic Bell | legendary | 40 | Copies the charm to its right (drag charms along the collar to reorder them). Charms with a number stack; the rest can't be doubled. |  |
| 🍀 Lucky Collar | uncommon | 10 | Rare and legendary charms, and augments, turn up twice as often. |  |
| 🧠 Pack Mentality | rare | 24 | Copies the leftmost charm on the collar. Charms with a number stack; the rest can't be doubled. |  |
| 🎯 Lone Dog | uncommon | 12 | +12% speed and reach for every empty collar slot (its own counts). |  |
| 🗡️ Old Scar | rare | 18 | At the start of every wave it destroys the charm to its right and gains +5% reach for good for every 10 wool that charm cost. |  |
| 🔗 Buddy System | uncommon | 12 | +8% speed and reach for every charm in your biggest group (bark, flock, shepherd…) beyond the first. |  |

### Augments

Now and then a charm in the shop comes with an **augment** (like Balatro's editions): a sheen on the
card, a line in its tooltip, kept for the rest of the run. It costs more.

| Augment | Look | Effect | Chance per card | Price |
| --- | --- | --- | --- | --- |
| 🌫️ Ghostly | see-through, dashed | Takes no collar slot (the only way past 5) | 3% | +50% |
| ✨ Gilded | gold sheen | +2 wool at every shearing; sells for its full price | 6% | +30% |
| 🌈 Polished | rainbow edge | Counts twice (like a Mimic Bell copy), +5% speed and reach | 2% | +80% |
| 🕊️ Blessed | soft glow | Once, when the flock drops below the line, the shepherd lets it go; then the blessing wears off | 2% | +50% |

Lucky Collar doubles the chances. Mimic Bell and Pack Mentality copy a charm's effect, not its
augment. The collar count shows Ghostly charms apart ("5 / 5 +1 🌫️").

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
and spent, the dog's stats, the charms on the collar and the animals you bought.

### First-time tips

The first time something happens in a game (a wolf closes in, a sheep is grabbed, the first shop,
a brute resists, a stampede winds up, the boss arrives…) a short tip slides in at the
bottom right. Each tip shows once per player (saved in `localStorage`); "Show the first-time
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

38 achievements in five groups (waves, wolves, flock, economy, collection), from "Finish wave 1"
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
| `src/achievements.js` | The 38 achievements, lifetime counters and unlock checks |
| `src/upgrades.js` | The dog's stats (and their prices), charms, livestock; card draws and the multipliers they add up to |
| `src/cards.js` | Shop cards: the card element, its tooltip, drag and drop onto drop zones |
| `src/helper.js` | AI for the Second Dog upgrade |

`window.game` is exposed in the console for debugging.

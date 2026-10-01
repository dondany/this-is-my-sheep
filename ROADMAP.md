# Roadmap: from prototype to a released mobile game

Where *This Is My Sheep* stands (October 2026), how to refine it, what to build next, how it could
make money, and how to get it onto phones. Decisions still to make are marked **Decision** with a
recommendation.

## Where it stands

A full roguelite loop, built in a week of fast iteration (76 commits since 24 September):

- 15 waves plus endless; 6 difficulty "summers"; the line (lose too many sheep and the run ends).
- 72 charms with augments, a 5-slot collar, dog stats, a Balatro-style shop with drag and drop.
- 13 wolf kinds, 6 bosses (a survive boss at wave 5, a fight boss at wave 10, Old Greymuzzle at 15).
- Bestiary, 38 achievements with cosmetic rewards, run saves, guide page, error banner.
- About 9,400 lines of JavaScript and 2,600 of HTML/CSS; three.js, no build step, static hosting.

What's missing for a release: real-player data (all balance so far comes from bots), music, an
onboarding pass, phone performance numbers, a fix for mixed old and new files after an update, and
everything store-related.

## 1. The refinement process

Speed came from adding things; quality now comes from cutting and polishing them. A repeatable
weekly loop:

1. **Playtest.** Send a build to 5-10 people every week (the friend who has the link, plus a
   handful from r/roguelites or itch.io). A short form: where did you die, what confused you, what
   was the best moment, would you play again.
2. **Measure.** Optional, anonymous run data, so balance stops being a guess: the wave and cause of
   each death, charms on the collar, the boss drawn, wool earned, session length. A free tier of a
   hosted analytics tool is enough. Also wanted later for the store's privacy questions.
3. **Decide.** Judge every feature against three pillars:
   - *Herding feels great.* The dog, the flock and the scare are the core; everything else serves
     them.
   - *Readable chaos.* Busy is good, confusing is not (the earlier "fake-hard" feedback).
   - *Builds that change how you play.* A charm that only adds +5% is a cut candidate.
4. **Polish.** One area per week (the order below), checked with the build bots so nothing
   regresses.

**Polish passes, in order:**

| Week | Area | What "done" looks like |
|---|---|---|
| 1 | Stability | Version-stamped files so an update never mixes old and new code (the iPad crash); no errors in a 20-run bot batch; mid-wave save that can't be abused (FUTURE_IDEAS has the options). |
| 2 | First 10 minutes | A new player understands moving, scaring, the line and the shop without reading. Fewer tips, shown at the right moment; the first boss telegraphed in the shop. |
| 3 | Readability | Every threat has its own silhouette, colour, sound and telegraph; markers at the screen edge never cover the flock; a "too much at once" check at wave 10. |
| 4 | Economy and charms | Cut or merge the weakest ~20 of the 72 charms (based on real pick and win rates); every remaining charm has a clear "build" it belongs to. |
| 5 | Audio | Music (a light loop, a tension layer, a boss theme), mixing, a volume slider. The game is silent apart from effects today. |
| 6 | Phone UI | Every screen at phone sizes, landscape; thumb-reachable buttons; long-press tooltips; text sizes. |

## 2. Next steps (content for 1.0)

Roughly in priority order. Each one is a feature commit with docs, tested in headless Chrome and
balanced with the bots, as now.

1. **Version-stamped files** (blocks everything else; also needed inside a mobile app).
2. **Run data and the playtest form** (see above).
3. **Music** (generated in WebAudio like the sound effects, or licensed tracks).
4. **Starting dogs** (Collie, Corgi, Pyrenees, Kelpie): the cheapest big boost to replay value.
5. **Events between waves** now and then, instead of the shop ("a neighbour offers 3 sheep for your
   golden fleece").
6. **Daily run** (a shared seed), shareable result card.
7. **Two more bosses** from the FUTURE_IDEAS list (the Eagle and the Bear fit the core best).
8. **Seasons**: colours shifting from spring to autumn across a run; winter in endless.
9. **Dev mode** behind `?dev` (commit the local test hook properly).
10. **Split `game.js`** (about 2,400 lines) into shop, bosses and saves before the mobile work.

Cut from 1.0: meadow layouts, a second final boss, online leaderboards beyond the daily run.

## 3. Mobile release

**Decision: wrap the web game, or port to Godot.** *Recommendation: wrap it.* FUTURE_IDEAS ("Going
mobile") has the full comparison. A wrapper ships in about 2-3 weeks of work, the port in 4-6
weeks plus re-testing everything. Port only if the wrapped version proves too slow on mid-range
phones.

**Steps:**

1. **Installable web app first (2-3 days).** A web app manifest, icons and an offline cache. It
   installs from the browser to the home screen on iOS and Android, and is the first real test on
   phones.
2. **Performance budget.** 60 fps on an iPhone 11 and a mid-range Android (around a Pixel 6a) at
   wave 15 with 40 sheep. Likely work: a spatial grid for flocking (it's O(n²) now), shadows and
   particles cut on a low-quality setting, fewer draw calls for decor.
3. **Capacitor shell (1-2 weeks).**
   - Landscape only at first (**Decision**: portrait is friendlier for one hand but needs a new
     camera and UI; recommend landscape for 1.0).
   - Safe areas, pause when the app goes to the background, audio unlock on first tap.
   - Haptics on scares, Big Barks and lost sheep.
   - Saves in native storage (iOS can clear a web view's storage).
   - Stores' privacy forms, age rating (likely 4+ / PEGI 3: cartoon wolves).
4. **Store setup.** Apple Developer Program (99 USD a year), Google Play (25 USD once), a store
   listing (icon, 6-8 screenshots, a 20-30 s trailer of the catapult and boss moments), a privacy
   policy page.
5. **Closed testing (2 weeks).** TestFlight and Play internal testing with the playtest group;
   fix crashes and performance.
6. **Launch.** Both stores the same week, with the web version as a free demo pointing to them.

## 4. Monetization

**Decision: the business model.** *Recommendation: free to try, one purchase for the full game.*

| Model | For | Against |
|---|---|---|
| **Free + "Full Flock" unlock, ~3.99 USD** *(recommended)* | Free downloads are far easier to get than paid ones on mobile; the first summer up to wave 5 is a real demo; one fair price, no ads; Balatro-style players accept it. | One store purchase to build and a restore button; needs a good first 10 minutes. |
| Paid up front, 2.99-4.99 USD | Simplest; no purchase code. | Very few people buy an unknown paid game on mobile. |
| Ads (rewarded or interstitial) | No purchase needed. | Rewarded ads (an extra reroll, a revive) undermine a roguelite's balance; interstitials hurt the feel; low earnings for a small audience. Not recommended. |
| Cosmetic purchases (dog hats, coats, meadow themes) | The wardrobe already exists. | Small earnings on their own; fine as an extra after launch, never pay-to-win. |

**What sells this genre best is Steam.** Roguelites like this (Balatro, Vampire Survivors) earn most
of their money on PC. The same wrapper approach (Tauri or Electron) gives a Steam build for little
extra work, and a Steam page with a wishlist button can go up months before launch. Worth deciding
alongside mobile. **Decision:** Steam too? *Recommendation:* yes, a Steam page early, release on
Steam and mobile together or Steam first.

**Realistic expectations.** Without marketing, most small paid or unlock-based games sell in the
hundreds to low thousands. What moves the needle here: short clips of the chaos (the catapult
launching wolves into the flock is made for TikTok and Shorts), the free web demo, and posting on
r/roguelites and r/IndieGaming.

**Admin to sort out before money comes in** (not legal advice):
- Check that the name "This Is My Sheep" is free in both stores and as a trademark.
- Both stores collect and pay VAT on sales; the income still needs to be declared (for example as a
  sole trader in Poland).
- A privacy policy is required, and is simpler if the run data stays anonymous and optional.

## 5. Timeline

| Weeks | Work |
|---|---|
| 1 | Stability: versioned files, mid-wave save, run data, installable web app. |
| 2-6 | Weekly playtests; the polish passes; music; starting dogs; events. |
| 7-8 | Phone performance, Capacitor shell, store accounts, Steam page. |
| 9-10 | Closed testing (TestFlight, Play internal), trailer, store listings. |
| 11 | Launch (mobile, and Steam if chosen); the web demo stays free. |

## Decisions to make

1. **Business model**: free + one unlock (recommended), paid, or ads.
2. **Steam**: add a Steam release (recommended) or mobile only.
3. **Orientation**: landscape for 1.0 (recommended) or portrait.
4. **Run data**: anonymous and optional run statistics (recommended), or none.
5. **Wrapper or port**: Capacitor wrapper first (recommended), Godot only if phones are too slow.

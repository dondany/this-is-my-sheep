# Future ideas

Things proposed but not built yet. Every animal proposed so far is in the game: see the Animals
table in [`README.md`](README.md) and sections 60–61 of the
[design doc](shepherd_dog_threejs_game_plan.md).

What's left from the original plan, plus notes from playtesting:

## Upgrades (design doc sections 24–28)
Wool is already counted but can't be spent yet. An upgrade screen between waves could offer:
- **Dog:** speed, acceleration, bark radius (`DOG.threatRadius`), bark power (`DOG.fleeTime`).
- **Shepherd:** a whistle that pulls the flock in now and then, calmer sheep (lower `panic`), fence
  posts.
- **Flock:** tougher sheep (longer `grabTime`), more sheep per wave.

Most of these are already single numbers in `src/config.js`, so an upgrade can just be a multiplier
on one of them.

## Balance
- Waves 10+ get very hard very fast (brutes, sneaky wolves and the alpha together). Consider a
  gentler pack growth, or letting upgrades carry the late game.
- Wanderers, black sheep and golden fleeces are usually lost within a wave or two when nobody herds
  them. That may be fine; worth watching in real play.

## Presentation
- Outlines on the animals (design doc section 17), e.g. an inverted-hull outline for wolves.
- Music: a light countryside loop, with a tension layer while wolves are attacking (section 45).
- Day/night progression over the waves, with fireflies and more wolves at night (section 46).

## Quality of life
- Save and continue a run (currently only the best wave and the bestiary are saved).
- Settings: volume slider, camera sensitivity, reduced screen shake.

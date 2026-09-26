# Shepherd's Dog --- Three.js Game Design Plan

## 1. Core Game Concept

**Working titles:** *Shepherd's Dog*, *Good Dog!*, *Flock Guard*

A small stylized 3D arcade/strategy game set in a warm, illustrated
meadow.

-   🐑 Sheep naturally wander around the flock.
-   🐕 The player controls the dog exclusively with the mouse.
-   🖱️ Click anywhere on the ground → dog runs there.
-   🐺 Wolves approach from the edges and try to reach the sheep.
-   🐕 The player's job is to position/circle the dog around the flock
    and intercept wolves.
-   👨‍🌾 The shepherd stays near the flock and provides upgrades/context.
-   As time passes:
    -   more sheep appear,
    -   more wolves appear,
    -   wolves become faster/more aggressive,
    -   the flock becomes harder to contain.
-   Between rounds/waves, the player spends resources upgrading the dog,
    shepherd, and flock.

### Core fantasy

> **I am the shepherd's dog, and I have to physically patrol around the
> flock to keep wolves away.**

The game should be simple to understand immediately, with exaggerated
movement, clear colors, chunky geometry, particles, sound cues, and
obvious animal behavior.

------------------------------------------------------------------------

# 2. Core Gameplay Loop

``` text
START WAVE
    ↓
Sheep wander
    ↓
Wolves spawn
    ↓
Player moves dog around flock
    ↓
Dog scares/intercepts wolves
    ↓
Sheep remain safe
    ↓
Wave gets progressively harder
    ↓
Wave complete
    ↓
Rewards
    ↓
Upgrade screen
    ↓
Next wave
```

The interesting part is that **the dog should not simply attack
wolves**.

Instead, the dog's primary ability is a **threat radius**.

When the dog gets close to a wolf, the wolf becomes frightened and runs
away.

This turns the dog into a moving defensive barrier.

------------------------------------------------------------------------

# 3. Flock Behavior

Avoid complicated realistic sheep simulation. Use a few simple rules.

Each sheep has:

``` js
position
velocity
wanderDirection
fear
```

## Separation

Sheep avoid overlapping.

## Cohesion

Sheep try to remain near the flock center.

## Alignment

Sheep generally move in roughly the same direction as nearby sheep.

## Dog fear

If the dog gets close, sheep move away.

## Wolf fear

If a wolf approaches, nearby sheep scatter slightly.

## Flock boundary

Give the flock an invisible soft boundary around the shepherd so
individual sheep cannot wander absurdly far away.

------------------------------------------------------------------------

# 4. Wolves

Wolves should have extremely simple AI.

Possible states:

``` js
WANDER
APPROACH
CHASE
FLEE
ATTACK
```

### WANDER

Wolf hangs around the edge of the map.

### APPROACH

Wolf selects a sheep or flock position and moves toward it.

### CHASE

If close enough to sheep, commits to attacking.

### FLEE

If the dog enters its threat radius, the wolf runs away.

### ATTACK

If a wolf reaches a sheep, it grabs/attacks it.

Keep this non-graphic. Use a dust puff, sheep bleat, short red/orange
flash, and then have the sheep disappear or become injured.

------------------------------------------------------------------------

# 5. Dog Controls

The control scheme should be extremely responsive.

The player does not use WASD.

Move the cursor over the terrain and click.

``` js
dog.target = mouseWorldPosition
```

Show a small ground marker where the player clicked:

-   glowing circle
-   paw icon
-   expanding ring

This provides immediate feedback.

------------------------------------------------------------------------

# 6. Dog Movement

The dog should accelerate rather than instantly teleport to a fixed
speed.

``` js
direction = target - dog.position

dog.velocity += direction.normalize() * acceleration
dog.velocity *= friction

dog.position += dog.velocity * delta
```

Useful parameters:

``` js
maxSpeed
acceleration
turnSpeed
```

These can later be upgraded.

------------------------------------------------------------------------

# 7. Dog Animation

Keep animation simple and procedural.

## Running

Rotate four leg meshes:

``` js
frontLeft.rotation.x = Math.sin(t)
frontRight.rotation.x = -Math.sin(t)

backLeft.rotation.x = -Math.sin(t)
backRight.rotation.x = Math.sin(t)
```

## Body bob

``` js
dog.position.y =
    baseHeight + Math.sin(time * runFrequency) * runAmplitude
```

## Other animation

-   ears move slightly
-   tail swings
-   dog pants when idle
-   occasional sit/shake/scratch behavior

No complex skeletal rig is necessary.

------------------------------------------------------------------------

# 8. Sheep Model and Animation

Each sheep can be built from primitive geometry:

``` text
          head
           ●
       ┌───────┐
       │ body  │
       └───────┘
       │ │ │ │
       │ │ │ │
```

### Geometry

-   Body: white low-poly sphere/ellipsoid
-   Head: black sphere
-   Legs: four tiny black cylinders

### Animation

Use the same simple alternating leg motion as the dog.

Also add a tiny body bounce:

``` js
body.position.y += Math.sin(time * 10) * 0.03
```

The result should feel like a cute little "flop-flop-flop" walk.

------------------------------------------------------------------------

# 9. Dog Model

Simple primitive-based silhouette:

-   black body
-   white muzzle
-   white chest
-   four legs
-   floppy ears
-   tail

The dog should be visually recognizable from a distance.

------------------------------------------------------------------------

# 10. Wolf Model

Wolves:

-   dark grey body
-   lighter grey muzzle
-   four legs
-   pointed ears
-   long tail

Give them a more angular silhouette than the sheep and dog.

Visual language:

``` text
sheep = rounded
dog   = rounded
wolf  = angular
```

This makes threats immediately readable.

------------------------------------------------------------------------

# 11. Shepherd

The shepherd does not need sophisticated interaction.

Simple model:

``` text
      hat
       ●
      /|\
      / \
```

Possible details:

-   brown hat
-   beige shirt
-   brown pants
-   walking stick

Occasional animations:

-   wave
-   point toward wolves
-   clap when a wave ends
-   adjust hat
-   lean on stick

------------------------------------------------------------------------

# 12. Camera

Use an orthographic camera or a perspective camera with a long focal
length.

Recommended angle:

**55--65° downward**

The result should feel like a 3D diorama/board game while retaining
depth.

The camera should subtly follow the flock center rather than constantly
following the dog.

The flock is the important thing.

------------------------------------------------------------------------

# 13. World

Keep the environment simple.

## Ground

Large meadow plane with:

-   warm yellow-green grass
-   subtle color variation
-   small darker grass patches

## Decorations

Optional:

-   low-poly trees around the perimeter
-   rocks
-   tiny flowers
-   grass tufts

Do not clutter the playable area.

------------------------------------------------------------------------

# 14. Warm Color Palette

Suggested palette:

``` text
Sky       #F6D7A7
Grass     #A8C96F
Grass 2   #91B85E

Sheep     #FFF7E6
Black     #252525

Dog       #222222 / #F4E8D0
Wolf      #66635E

Wood      #A96F45
Brown     #76513A

UI        #FFF0D0
Accent    #E58A4B
Danger    #C95745
```

Avoid highly saturated neon colors.

The game should feel like a warm illustrated storybook.

------------------------------------------------------------------------

# 15. Cel Shading

Use Three.js toon materials rather than complex physically based
materials.

``` js
new THREE.MeshToonMaterial({
    color: 0xffffff
})
```

Use a directional light and soft ambient lighting.

The visual target is low-poly cel shading with clear light/dark regions.

------------------------------------------------------------------------

# 16. Lighting

Use one large warm directional light:

``` js
const sun = new THREE.DirectionalLight(...)
```

Add soft ambient lighting.

Subtle shadows are valuable because they ground the primitive shapes.

------------------------------------------------------------------------

# 17. Stylized Outlines

If performance permits, add a lightweight outline effect.

However, do not make the entire game dependent on a complicated
post-processing pipeline.

The main visual ingredients should already work through:

-   toon materials
-   strong silhouettes
-   shadows
-   warm lighting

Reserve outlines for important objects if needed:

-   dog
-   wolves
-   sheep

------------------------------------------------------------------------

# 18. Particle System

Particles are one of the highest-value features.

Create a generic particle system:

``` js
Particle {
    position
    velocity
    lifetime
    size
    opacity
}
```

Particle types:

### Dust

Behind running animals.

### Grass particles

Occasionally when sheep move quickly.

### Wolf scare

When a wolf flees.

### Dog arrival

Small sparkle/dust burst when the dog reaches its destination.

### Sheep panic

Small dust cloud when multiple sheep scatter.

### Wave completion

Confetti, leaves, or sparkles.

------------------------------------------------------------------------

# 19. Make the Dog Feel Powerful

When the dog enters a wolf's threat radius, make it a strong visual
event:

1.  Wolf pauses for \~0.1 sec.
2.  Wolf looks toward dog.
3.  Exclamation mark appears.
4.  Tiny screen shake.
5.  Dust burst.
6.  Wolf turns around.
7.  Wolf runs away.

The dog can also trigger a bark.

Use an expanding visual bark ring:

``` text
       (     )
    (    🐕    )
       (     )
```

This communicates the fear radius.

------------------------------------------------------------------------

# 20. Wolf Attack Feedback

Avoid graphic violence.

When a wolf reaches a sheep:

``` text
🐺 → 🐑
     💥
```

Use:

-   quick red/orange flash
-   dust puff
-   sheep bleat
-   wolf growl
-   sheep disappears or becomes injured

------------------------------------------------------------------------

# 21. Sheep Count HUD

Make the main objective immediately visible.

Example:

``` text
🐑 24 / 30
```

or:

``` text
FLOCK
████████████░░░
24 / 30
```

This communicates how many sheep are currently safe.

------------------------------------------------------------------------

# 22. Wave Progression

Example:

### Wave 1

``` text
10 sheep
2 wolves
slow wolves
```

### Wave 2

``` text
14 sheep
3 wolves
```

### Wave 3

``` text
18 sheep
4 wolves
```

Eventually:

``` text
80 sheep
15 wolves
```

Use a soft population cap if necessary for performance.

------------------------------------------------------------------------

# 23. Difficulty Scaling

Do not only increase enemy count.

Scale several parameters:

``` js
difficulty = 1 + wave * 0.15
```

Possible effects:

``` js
wolfSpeed *= difficulty
wolfSpawnRate /= difficulty
wolfAggression *= difficulty
sheepWanderSpeed *= ...
```

The player should feel increasing spatial pressure rather than arbitrary
unfairness.

------------------------------------------------------------------------

# 24. Upgrades

Divide upgrades into three categories.

## Dog

### Speed

Dog moves faster.

### Acceleration

Dog reaches full speed quicker.

### Bark Radius

Larger wolf fear radius.

### Bark Power

Wolves flee farther.

### Stamina

If stamina is implemented, the dog can sprint for longer.

### Brave Dog

Wolf fear lasts longer.

### Dust Trail

Cosmetic upgrade.

------------------------------------------------------------------------

# 25. Shepherd Upgrades

### Shepherd's Whistle

Periodically pulls sheep toward the shepherd.

### Better Herding

Sheep naturally stay closer together.

### Calm Flock

Sheep panic less.

### Fence Posts

Creates an invisible or visible boundary.

### Bell

Periodically attracts sheep toward the center.

These upgrades make flock management easier without directly making the
dog stronger.

------------------------------------------------------------------------

# 26. Flock Upgrades

### Stronger Sheep

Wolves need more time to capture them.

### Herding Instinct

Sheep stay closer together.

### Calm Sheep

Sheep scatter less.

### More Sheep

Start each wave with additional sheep.

------------------------------------------------------------------------

# 27. Meta Progression

Keep the initial progression small.

Example:

``` text
DOG
⚡ Speed       Lv 3
🔊 Bark        Lv 2
🏃 Stamina     Lv 4

SHEPHERD
🔔 Herding     Lv 2
❤️ Flock       Lv 3

FLOCK
🐑 Population  Lv 2
🧠 Cohesion    Lv 1
```

Use one simple resource.

Suggested names:

-   Wool
-   Shepherd's Coins
-   Good Boy Points

**Wool** fits the theme particularly well.

------------------------------------------------------------------------

# 28. Between-Wave Screen

Example:

``` text
        WAVE 7 COMPLETE!

           🐑 34/36

       + 120 WOOL

    ┌───────────────────┐
    │ 🐕 DOG             │
    │ Speed       +1     │
    │                   │
    │ Cost: 80 Wool     │
    └───────────────────┘

         [ NEXT WAVE ]
```

Keep it simple and readable.

------------------------------------------------------------------------

# 29. Personality Layer

Tiny random behaviors make simple geometry feel alive.

## Sheep

Occasionally:

-   stop and look around
-   scratch themselves
-   bounce
-   look at the dog
-   sneeze

## Dog

Occasionally:

-   sit
-   shake itself
-   pant
-   look toward shepherd
-   scratch ear

## Shepherd

Occasionally:

-   adjust hat
-   lean on stick
-   wave
-   point

All of these can be simple transform animations.

------------------------------------------------------------------------

# 30. Game States

Use an explicit state machine:

``` js
GAME_STATES = {
    MENU,
    INTRO,
    PLAYING,
    WAVE_COMPLETE,
    UPGRADES,
    PAUSED,
    GAME_OVER
}
```

This will keep the game logic manageable.

------------------------------------------------------------------------

# 31. Three.js Architecture

A reasonable structure:

``` text
src/
│
├── main.js
│
├── game/
│   ├── Game.js
│   ├── GameState.js
│   ├── WaveManager.js
│   ├── Difficulty.js
│   └── ScoreManager.js
│
├── entities/
│   ├── Dog.js
│   ├── Sheep.js
│   ├── Wolf.js
│   └── Shepherd.js
│
├── systems/
│   ├── FlockSystem.js
│   ├── WolfSystem.js
│   ├── ParticleSystem.js
│   ├── MovementSystem.js
│   └── UpgradeSystem.js
│
├── world/
│   ├── Terrain.js
│   ├── Environment.js
│   └── Decorations.js
│
├── rendering/
│   ├── Lighting.js
│   ├── Materials.js
│   └── Camera.js
│
├── input/
│   └── MouseController.js
│
└── ui/
    ├── HUD.js
    ├── UpgradeScreen.js
    └── GameOver.js
```

For a vibe-coded prototype, this is enough structure without becoming
over-engineered.

------------------------------------------------------------------------

# 32. Entity Design

Make every animal expose roughly the same interface:

``` js
class Animal {
    constructor(scene) {}

    update(delta, world) {}

    setPosition(x, y, z) {}

    destroy() {}
}
```

Then:

``` js
class Sheep extends Animal
class Dog extends Animal
class Wolf extends Animal
```

This simplifies spawning and cleanup.

------------------------------------------------------------------------

# 33. Avoid Expensive Physics

You do not need a physics engine.

Avoid:

-   rigid bodies
-   collision meshes
-   complicated pathfinding

Use simple distance calculations.

Example:

``` js
const distance = dog.position.distanceTo(wolf.position)

if (distance < dog.barkRadius) {
    wolf.flee()
}
```

This is a perfect use case for lightweight custom game logic.

------------------------------------------------------------------------

# 34. World Coordinates

Keep the game world on an X/Z plane.

``` text
          Z
          ↑
          │
          │
          │
          └────────→ X
```

Animals use:

``` js
x
y
z
```

but movement is primarily on:

``` js
x / z
```

This keeps movement logic simple.

------------------------------------------------------------------------

# 35. Mouse → World Position

This is a key technical component.

Use a raycaster:

``` js
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
```

On click:

``` js
raycaster.setFromCamera(mouse, camera)

const hits = raycaster.intersectObject(ground)

if (hits.length) {
    dog.setTarget(hits[0].point)
}
```

This converts a mouse click into an exact position on the meadow.

------------------------------------------------------------------------

# 36. Dog Pathfinding

Do not implement pathfinding initially.

The meadow is open.

The dog simply runs toward the clicked position:

``` js
direction = target - dog.position
```

If trees/rocks are later added as obstacles, simple avoidance can be
introduced.

------------------------------------------------------------------------

# 37. Sheep AI Algorithm

A basic flocking update can combine:

``` js
separation
+ cohesion
+ alignment
+ randomWander
+ fearFromDog
+ fearFromWolf
```

Then:

``` js
velocity += acceleration * delta
velocity.clampLength(0, maxSpeed)
position += velocity * delta
```

This should look surprisingly convincing.

------------------------------------------------------------------------

# 38. Optimization

The game could potentially contain:

``` text
100 sheep
30 wolves
1 dog
1 shepherd
```

without needing a heavy engine.

Important optimizations:

-   reuse geometries
-   reuse materials
-   avoid generating new geometry per sheep
-   use instancing or a shared particle system for large particle counts

Example shared geometry:

``` js
const sheepBodyGeometry = ...
const sheepHeadGeometry = ...
```

------------------------------------------------------------------------

# 39. Geometry Generation

Build a small library of reusable primitive geometries:

``` js
SphereGeometry
BoxGeometry
CylinderGeometry
ConeGeometry
```

## Sheep

``` text
Body → scaled sphere
Head → sphere
Leg → cylinder
Ear → tiny cone
```

## Wolf

``` text
Body → scaled box/sphere
Head → box
Snout → smaller box
Ear → cone
Tail → cylinder
```

The entire visual style can be built from primitives.

------------------------------------------------------------------------

# 40. Juice System

Create a centralized `JuiceManager`.

Example:

``` js
juice.dogArrival(position)
juice.wolfScared(position)
juice.sheepSaved(position)
juice.sheepLost(position)
juice.waveComplete()
```

Each event can combine:

-   particle burst
-   sound
-   camera shake
-   scale animation
-   floating text
-   screen flash

This creates polish without complicated underlying mechanics.

------------------------------------------------------------------------

# 41. Camera Shake

Keep it subtle.

Wolf scare:

``` js
cameraShake(0.05, 100)
```

Wave completion:

``` js
cameraShake(0.12, 200)
```

Sheep loss:

``` js
cameraShake(0.03, 100)
```

------------------------------------------------------------------------

# 42. Floating Feedback

Examples:

``` text
        +10
         ✦
        🐑
```

Saving a sheep:

``` text
+10 WOOL
```

Scaring a wolf:

``` text
GOOD DOG!
```

Wave completion:

``` text
FLOCK SAFE!
```

Use scaling and fade-out animations.

------------------------------------------------------------------------

# 43. UI Design

The UI should feel like the game world.

Use:

-   rounded panels
-   warm paper-like colors
-   chunky typography
-   simple icons

Example:

``` text
┌───────────────────────────────────────────┐
│ 🐑 31/35              WAVE 08     🧶 420 │
└───────────────────────────────────────────┘


                 GAME WORLD


                                🐺
                           🐕


             🐑 🐑 🐑
          🐑 🐑 🐑 🐑 🐑
             🐑 🐑 🐑

                   👨‍🌾
```

------------------------------------------------------------------------

# 44. Audio

Use a small sound library.

## Dog

-   bark
-   running
-   panting

## Sheep

-   bleat
-   panic bleat
-   footsteps

## Wolf

-   howl
-   growl
-   scared yelp

## Environment

-   wind
-   birds
-   grass

## UI

-   click
-   upgrade
-   wave complete

Sound design can make the primitive visuals feel much more
sophisticated.

------------------------------------------------------------------------

# 45. Music

Use a light looping countryside/adventure track.

When wolves appear, introduce subtle tension:

``` text
normal
  ↓
wolves detected
  ↓
slightly faster percussion
  ↓
wolf attack
  ↓
short tension sting
```

Avoid overly dramatic orchestral music.

------------------------------------------------------------------------

# 46. Optional Day/Night Progression

Potential later feature:

``` text
morning
  ↓
afternoon
  ↓
sunset
  ↓
night
```

At night:

-   darker warm lighting
-   fireflies
-   moon
-   more wolves
-   slightly more tense music

Do not implement this in the first prototype.

------------------------------------------------------------------------

# 47. Boss Wolves

Later additions could include:

### Big Wolf

Large, slow, harder to scare.

### Fast Wolf

Small and extremely fast.

### Sneaky Wolf

Approaches from behind the flock.

### Alpha Wolf

Can temporarily encourage nearby wolves.

These are expansion mechanics, not MVP requirements.

------------------------------------------------------------------------

# 48. Late-Game Spatial Pressure

The core strategy should eventually look like:

``` text
             🐺
              ↓

🐕                 🐺

       🐑🐑🐑
     🐑🐑🐑🐑🐑

        👨‍🌾

             🐺
```

The player can only be in one place.

The interesting decision becomes:

**Which wolf do I intercept?**

That is where the strategic depth comes from.

------------------------------------------------------------------------

# 49. Difficulty Philosophy

Do not make the game difficult primarily by making wolves extremely
fast.

Instead increase spatial pressure.

### Early

``` text
🐺       🐑🐑🐑       🐺
             🐕
```

### Later

``` text
🐺 →      🐑🐑🐑      ← 🐺

        🐑🐑🐑🐑

🐺 →                 🐺
             🐕
```

Eventually the player is constantly deciding where the dog needs to be.

------------------------------------------------------------------------

# 50. MVP

For the first playable version, aggressively cut scope.

## World

-   meadow
-   camera
-   lighting

## Entities

-   dog
-   sheep
-   wolves
-   shepherd

## Mechanics

-   mouse click movement
-   sheep wandering
-   basic flock cohesion
-   wolves approach flock
-   dog scares wolves
-   sheep can be lost
-   wave timer
-   wave completion

## Juice

-   dog animation
-   sheep animation
-   wolf animation
-   dust
-   bark effect
-   basic sound

## UI

-   sheep count
-   wave number
-   game-over screen
-   next-wave button

**No upgrades yet.**

Get the core interaction feeling good first.

------------------------------------------------------------------------

# 51. MVP Development Order

## Phase 1 --- Empty World

Get these working:

``` text
Three.js
↓
camera
↓
ground
↓
lighting
```

## Phase 2 --- Dog

Implement:

``` text
mouse click
→ raycast
→ target position
→ dog movement
```

Make the dog feel excellent.

## Phase 3 --- Sheep

Spawn about 10 sheep.

Give them simple wandering and flock cohesion.

## Phase 4 --- Wolves

Spawn 2 wolves.

Implement:

``` text
approach flock
→ dog nearby
→ flee
```

## Phase 5 --- Game Loop

Add:

-   wave
-   timer
-   sheep loss
-   wave completion

## Phase 6 --- Juice

Add:

-   dust
-   animation
-   bark
-   particles
-   camera shake
-   floating feedback

## Phase 7 --- Progression

Add:

-   currency
-   upgrade screen
-   dog upgrades
-   shepherd upgrades

## Phase 8 --- Polish

Add:

-   better environment
-   audio
-   menu
-   save state
-   more wolf types

------------------------------------------------------------------------

# 52. Initial Technical Stack

Keep the stack deliberately simple:

``` text
Three.js
Vite
JavaScript
HTML/CSS
```

Initial dependency:

``` text
three
```

No React is required for the game itself.

The UI can be ordinary HTML/CSS layered over the Three.js canvas.

------------------------------------------------------------------------

# 53. Vibe-Coding-Friendly Project Structure

For the first version, keep the project simpler than a full production
architecture:

``` text
shepherd-game/
│
├── index.html
├── package.json
│
└── src/
    ├── main.js
    ├── game.js
    ├── entities.js
    ├── flock.js
    ├── wolves.js
    ├── particles.js
    ├── world.js
    ├── upgrades.js
    └── style.css
```

Do not over-engineer the codebase before the game proves itself.

------------------------------------------------------------------------

# 54. Visual Readability Rule

The animals need to be large enough to read.

Do not make them physically realistic.

The player should instantly understand:

> "That's my dog."

Strong silhouettes matter more than detailed geometry.

------------------------------------------------------------------------

# 55. Visual Target

The overall visual target is:

**storybook + low-poly diorama + arcade game**

Not photorealistic.

Think:

-   warm countryside
-   chunky primitive geometry
-   cel shading
-   soft shadows
-   cute animals
-   strong silhouettes
-   lots of tiny movement

------------------------------------------------------------------------

# 56. The Feel Target

A good 10-second interaction should look like this:

``` text
🐺
 ↓
🐑 🐑 🐑
🐑 🐑 🐑
     👨‍🌾

        🐕
```

Player clicks behind the wolf:

``` text
             ✦
             ↓
          🐕 → → →
```

Dog arrives:

``` text
          🐕
        (WOOF!)
           )))

       🐺 → → → 💨
```

Dog stops.

``` text
          🐕
        ✦  ✦
```

Sheep continue wandering.

A small "+15" pops up.

That interaction should feel satisfying before anything else is added.

------------------------------------------------------------------------

# 57. Core Design Philosophy

Keep returning to these five rules:

### 1. Simple simulation

The animals only need to *look* intelligent.

### 2. Strong silhouettes

Recognize dog, sheep, and wolf immediately.

### 3. Huge feedback

Every meaningful action gets particles, movement, sound, or animation.

### 4. Spatial strategy

The challenge comes from deciding where to put the dog.

### 5. Cute, not realistic

This is a playful game about protecting sheep, not a sheep farming
simulator.

------------------------------------------------------------------------

# 58. First Milestone

The first genuinely playable build should look like:

``` text
                 WAVE 1

      🐺                         🐺


                🐑
           🐑    🐑    🐑
             🐑 🐑 🐑
                👨‍🌾


                         🐕

                  ✦ CLICK ✦
```

Click somewhere:

``` text
                         ✦
                         ↓
                      🐕💨💨
```

Dog arrives:

``` text
                      🐕
                    (WOOF!)
                       )))

                🐺 → → → 💨
```

And the flock continues happily.

------------------------------------------------------------------------

# 59. Recommended Next Step

Turn this design into a **concrete Three.js implementation
specification** containing:

1.  Exact classes and data structures.
2.  The main game/update loop.
3.  Flocking equations and implementation.
4.  Wolf state machine.
5.  Mouse raycasting.
6.  Dog movement and animation.
7.  Particle architecture.
8.  Upgrade data structures.
9.  UI structure.
10. Wave-generation algorithm.
11. Performance considerations.
12. A staged sequence of coding-agent prompts.

The coding prompts should be designed so a vibe-coding agent can build
the game incrementally without producing an over-engineered or
unmanageable codebase.

------------------------------------------------------------------------

# 60. Sheep and Wolf Variants (implemented)

Each variant is a set of overrides (`SHEEP_TYPES` / `WOLF_TYPES` in
`src/config.js`) applied to the shared flocking and wolf AI, plus a few
behaviour hooks. The goal is to change *decisions*, not just numbers.

## Wanderer sheep (wave 2+, one per wave)

-   Walks more often, further and faster; weak cohesion and a looser
    boundary (1.6× flock radius), so it drifts to the edge.
-   Notices the dog from 8 units (normal: 4) and reacts twice as
    strongly: one quick pass herds it home.
-   Wolves prefer stragglers, so it acts as wolf bait.
-   Look: beige fleece, smaller, fidgets and looks around a lot; a "?"
    pops up when it strays.
-   Adds a second job for the dog: herding vs guarding.

## Lamb (wave 3+, one per wave; two from wave 8)

-   Paired with an adult sheep (its mother) and follows her, staying
    about 1.4 units away.
-   Wolves strongly prefer lambs (`lure`), and lambs are taken faster,
    but each surviving lamb pays double wool at the end of a wave.
-   If its mother is taken, the lamb bolts away from the flock
    ("MAMA?!") with only a weak pull back home. Once the dog herds it
    back inside the flock it adopts the nearest adult without a lamb (♥).
-   Look: small, extra-white fleece, big head, hops a lot, high-pitched
    bleat.
-   Decision: protect lamb pairs, and choose between chasing a lost lamb
    and guarding the edge.

## Black Sheep (wave 7+, one per flock)

-   A regular sheep most of the time, but every 12-18 s it winds up for
    1.2 s (stamping, snorting, "!") and then stampedes: it charges in a
    straight line away from the flock at 4.5 u/s.
-   Up to 3 sheep within 6 units (never the ram) join in and run after
    it.
-   The dog getting within 3.5 units of the black sheep heads it off
    (+10 wool); otherwise the stampede lasts 6 s or until it reaches the
    edge of the meadow, leaving a little group out in the open.
-   Look: dark charcoal fleece, black face; hops while winding up.
-   Decision: herding right now versus guarding the edge. Standing in
    its path during the wind-up stops it before it starts.

## Old Ram (wave 5+, one per flock)

-   Slow, mostly ignores the dog, barely panics at wolves (30%).
-   Sheep within 7 units are drawn toward him and panic 40% less.
-   Wolves need twice as long to take him.
-   Look: bigger, curled horns, darker face; lowers his head at nearby
    wolves.
-   Losing him makes the flock jumpier; a new ram joins next wave.

## Runner wolf (wave 3+)

-   1.6× speed, stalks for 40% as long, targets the nearest sheep.
-   Scared from 1.3× the dog's threat radius, flees for a shorter time
    and comes back sooner.
-   Skittish: abandons a chase if the dog gets near its target.
-   Look: small tan wolf with big ears and a heavy dust trail; its
    off-screen indicator pulses faster. Worth 20 wool.

## Sneaky wolf (wave 5+)

-   Spawns silently (no howl) on the side of the flock away from the dog.
-   No off-screen indicator until it is within 15 units of the flock
    (or chasing / attacking).
-   While prowling it circles toward the side of the flock facing away
    from the dog and only moves in once it's within ~40° of that spot
    (or after waiting 6 s longer than its stalk time).
-   Look: dark grey-green, short legs, head held low. Worth 25 wool.
-   Decision: scan the edges instead of only reacting to arrows; the
    dog's position creates a blind spot.

## Alpha wolf (wave 8+, one per wave)

-   While an alpha is on the field, every other wolf stalks for half as
    long.
-   When the alpha moves in, it howls ("AWOOO!") and every prowling wolf
    attacks at the same time.
-   Scaring the alpha also scares every wolf within 10 units of it (a
    faint red ring on the ground shows the range): "PACK SCATTERED!".
    Wolves caught that way flee even if they are brutes, and any sheep
    they were holding is saved.
-   Look: bigger grey wolf with a pale mane, gold eyes, gold off-screen
    indicator. Worth 50 wool.
-   Decision: a priority target; catching it at the right moment breaks
    a whole coordinated attack.

## Brute wolf (wave 6+)

-   0.7× speed, but a single bark isn't enough: a fear meter fills while
    the dog stays within its threat radius, and it flees after 1.5 s.
-   While resisting it snarls and backs away slowly facing the dog, and
    a grab in progress is put on hold.
-   Shoves sheep out of its way; completes a grab in 60% of the time.
-   Look: 1.5× bigger, near-black with pale scars and orange eyes,
    lower howl, larger indicator. Worth 40 wool.

## Sleepy Sheep (wave 4+, one per wave)

-   Lies down and dozes (eyes shut, "z" floating up): no wandering, no
    fear of wolves, and wolves find it a slightly more tempting target.
-   The dog coming within 3 units wakes it with a start: it bleats and
    every sheep within 5 units panics and scatters.
-   Awake for 20-30 s, then it nods off again once it's calm.
-   Decision: leave it asleep and guard it where it lies, or wake it up
    and deal with the scatter.

## Golden Fleece (wave 6, then a 35% chance per wave if there isn't one)

-   Gold fleece that glitters. Every wolf strongly prefers it (`lure`).
-   Worth 100 wool (20× the normal survivor reward) at the end of every
    wave it survives.
-   Decision: risk and reward; wolves converge on one spot.

## Bellwether (wave 8+, one per flock)

-   Collar and bell. Every 5-7 s it rings: a gold ring pulses out and
    sheep within 10 units are pulled back toward it for 1.6 s.
-   If a wolf takes it, flock cohesion drops to 40% (and the boundary
    pull weakens) for the rest of the wave: "The flock loses heart…".
-   Decision: a second anchor alongside the ram, and a priority to
    protect.

## Goat (wave 9+, one per game)

-   Not a sheep: separate entity, not counted in the flock, ignored by
    wolves. Ambles about near the flock.
-   Charges any wolf within 7 units and head-butts it ("BONK!"): the
    wolf is dazed for 1.3 s and drops any sheep it was holding (counts
    as a save). 5 s cooldown.
-   Decision: none really: a helper you can't control. Fun, and a small
    late-game relief.

## Pup Pack (wave 2+)

-   Three tiny wolves spawned together as a group. Followers copy the
    lead pup's state and target and stay close to it.
-   Weak: 5 wool each, take 1.6× longer to finish a grab.
-   When the dog has been within 8 units for 0.35 s they split up and
    scatter in different directions ("YIP!"), then hunt individually.
    Once all of them are prowling again they regroup.
-   Scaring all three within 0.6 s pays a +30 bonus ("PUP PACK!").
-   Decision: dash through them while they're still bunched up.

## Howler (wave 4+)

-   Never attacks. Prowls 7 units inside the lurk ring (reachable by
    the dog) and every 6-9 s sits back and howls for a second.
-   The howl makes every sheep within 36 units (the whole flock, from
    the edge) panic and get pushed away from the howler.
-   Its off-screen indicator is dashed; scaring it pays 20 wool.
-   Decision: leave the flock to chase off something that isn't
    directly dangerous.

## Trickster (wave 7+)

-   Orange fox-like wolf. While approaching, if the dog is running
    toward it (within 16 units, heading within ~40°), it switches its
    target to the sheep furthest from the dog ("HEH!"). Once per
    attack.
-   Fragile: scared from 1.4× the threat radius. 30 wool.
-   Decision: don't over-commit; read its intent first.

## Wolf in Sheep's Clothing (wave 9+, one per wave)

-   Joins the flock as a new "sheep" at the start of the wave. It isn't
    counted in the flock total, wolves ignore it and it never joins a
    stampede.
-   Tells: grey wolf tail poking out, grey legs, no bounce in its walk.
-   15-25 s into the wave it throws off the fleece ("IT'S A WOLF!") and
    goes straight for the nearest sheep.
-   Keeping the dog within 2.5 units of it for 0.5 s exposes it early
    ("EXPOSED!"); it's scared on the spot for 40 wool.
-   At the end of the wave an unrevealed one slinks off.
-   Decision: paying attention inside the flock, not just around it.

## Pack composition

``` text
wave 2+    + pup packs (1, 2 from wave 6)
wave 3+    + runners   (1, then min(5, (wave-2)/2) from wave 8)
wave 4+    + howlers   (1, 2 from wave 9)
wave 5+    + sneaky    (1, then min(3, (wave-5)/2) from wave 9)
wave 6+    + brutes    (1, then min(3, (wave-4)/2) from wave 8)
wave 7+    + tricksters(1, 2 from wave 10)
wave 8+    + 1 alpha
```

The pack has `min(1 + wave, 15)` slots (a pup pack takes one). When
there are more special wolves than slots, the priority is alpha, brute,
sneaky, trickster, runner, howler, pups.

Herding: a sheep within the dog's fear radius also turns its wander
direction away from the dog, so a dog placed behind a stray walks it home.

The first wolf of each wave is always a normal one (when there's room),
so special wolves arrive mid-wave. One new flock-side and one new
wolf-side animal appears each wave (`FIRST_WAVE`):

``` text
wave 2   wanderer       pup pack
wave 3   lamb           runner, rascal
wave 4   sleepy sheep   howler
wave 5   old ram        sneaky wolf
wave 6   golden fleece  brute
wave 7   black sheep    trickster
wave 8   bellwether     alpha
wave 9                  wolf in sheep's clothing
```

The wave banner names the newcomers ("New: Sleepy Sheep & Howler").

------------------------------------------------------------------------

# 61. Bestiary (implemented)

-   A collection screen with two sections, the flock and the wolves:
    18 entries in total.
-   Each entry has a portrait rendered from the in-game model (a
    separate small WebGL renderer, cached as images), a name, a short
    description and a tip.
-   Locked entries show the portrait as a dark silhouette with "???"
    and "turns up from wave N".
-   An entry unlocks the first time the animal is on the field during a
    game (sneaky wolves once they come close, the disguised wolf once
    it's revealed). A card slides in from the corner ("New in the
    bestiary"); clicking it opens the entry.
-   Opened from the 📖 button, the menu, pause, end-of-wave and game-over
    screens, or the B key. Opening it mid-wave pauses the game.
-   Unlocks persist in `localStorage`.

------------------------------------------------------------------------

# 62. Upgrade Cards (implemented)

Implements the progression from sections 24-28 as a card shop on the
end-of-wave screen.

-   Three random cards per wave, drawn without duplicates from upgrades
    that aren't maxed yet (rare cards are drawn at 35% weight).
-   Each card shows its group (dog / shepherd / flock), icon, level pips,
    effect and price. Buy any number you can afford; each card can be
    bought once per offer.
-   Reroll: 25 wool, +25 for each further reroll in the same wave.
-   Price = base × (1 + 0.6 × current level), rounded to 5.
-   Levels reset when a run ends.
-   `modifiers(levels)` in `src/upgrades.js` produces the multipliers
    (`ctx.mods`) read by the dog's stats, flock steering (panic,
    cohesion) and wolf AI (brute courage, grab time), plus extra sheep
    and lambs per wave.

## Rare upgrades

-   **Second Dog** (max 1): a brown-and-cream dog (`Dog` with a
    different look) added to `ctx.guards`, so wolves treat it like the
    player's dog. AI in `src/helper.js`: every 0.25 s it picks the
    threatening wolf closest to the flock (within 16 units, howlers
    included) that the player's dog isn't already nearer to; otherwise
    it patrols a slow circle around the shepherd. 80% of the dog's
    speed, 70% of its threat radius, never sits.
-   **Shepherd's Whistle** (max 3): every 20/15/10 s the shepherd puts
    his fingers to his mouth ("FWEET!") and every sheep that isn't
    asleep or held regroups toward him for 2.5 s (reuses the
    bellwether's regroup pull).
-   **Scarecrow** (max 2): after buying, the next wave shows "Click the
    meadow to place your scarecrow"; that click places it instead of
    moving the dog. Ordinary wolves (no `courage`) within 4.5 units are
    scared by it ("BOO!", "SCARED OFF! +15"). Brutes ignore it. Sheep
    walk around it. Scarecrows last for the rest of the run.

## Economy (superseded by section 65)

-   Base prices 120-180 wool for common cards, 300-525 for rare ones;
    level n costs base × (1 + n).
-   Survivors pay 2 wool each at the end of a wave (lambs 4, golden
    fleece 100), plus 50 for a perfect wave; scaring wolves pays 5-50.
-   With a bot that always chases the most urgent wolf, upgrades carry
    the flock to wave 10 almost intact (76/80), versus a collapse at
    wave 10 without them. Human players earn less from scares.

------------------------------------------------------------------------

# 63. Hit-stop, Close Calls and Combos (implemented)

-   Hit-stop: `Game.freeze(seconds)` skips simulation for a few frames
    while still rendering. 50 ms per scored scare, 100 ms when the
    alpha's pack scatters.
-   Close call: a rescue (dog scare or goat head-butt) with less than
    0.4 s of the wolf's grab timer left gives 0.6 real seconds of slow
    motion (time × 0.25), a camera push-in of 10% and "CLOSE ONE!".
-   Combo: every scored scare within 2.5 s of the previous one extends
    the chain. From ×2 each step pays 5 × (n - 1) bonus wool (capped at
    30 from ×7, so long chains in busy late waves don't break the
    economy), shows
    "COMBO ×N! +bonus" with the text growing, and a chime that rises a
    whole tone per step. Scares by the helper dog and scarecrows count
    too. A HUD badge under the top bar shows ×N and a draining timer.
-   Tuning lives in `FEEL` at the top of `src/game.js`.

------------------------------------------------------------------------

# 64. Big Bark (implemented)

The dog's one active ability, for when a pack converges.

-   Input: right-click (mouse), Space, or a round 🐕 button in the
    bottom-right corner (the touch control).
-   Every wolf within 12 units of the dog flees immediately, brutes
    included (`forceScare` skips their fear meter). Scares score and
    chain combos as usual.
-   Trade-off: sheep within 6 units are startled and pushed away, and a
    sleepy sheep nearby wakes up.
-   Juice: 120 ms hit-stop, a double shockwave ring, "WOOOF!!",
    "×N SCATTERED!", ring of dust, flash, strong screen shake, a deep
    synthesized bark.
-   15 s cooldown, shown as a sweep on the button, which glows orange
    when ready and shakes if pressed too early. The Deep Lungs upgrade
    makes it recharge 20% faster per level (max 3).
-   Tuning: `BIG_BARK` in `src/config.js`.

------------------------------------------------------------------------

# 65. Shearing Day Economy (implemented)

Replaces the first upgrade economy, where scaring wolves paid wool and
a strong player could farm it (wolves come back after every scare).
Inspired by Balatro / TFT (small numbers, interest) and arcade games
that keep score and money separate.

-   **Score** (★) comes from everything that used to pay wool: wolf
    scares (★ 5-50 by type), rescues (★ 25), combos (+10 per step,
    capped at +90), stampede head-offs, pup-pack bonuses. Best score is
    saved.
-   **Wool** comes only from shearing the survivors at the end of a
    wave: `wool` per sheep type (1 normal; 2 lamb and bellwether; 3 old
    ram; 10 golden fleece), plus +1 per 2 calm sheep (never grabbed,
    under 2 s of panic this wave), +2 for a perfect flock, and interest
    of +1 per 5 unspent wool (max +3).
-   Prices are small: common upgrades 3-4 wool base, rare 10-15, level
    n costs base × (n + 1); rerolls cost 1 (+1 each).
-   Bot numbers: 17 wool after wave 1, ~60 by wave 5, ~110 per wave
    once the flock hits its cap of 80.
-   **Bounty tufts** (from Brotato-style pickups): the first time a
    brute, alpha or trickster is scared off (and scores), it drops a
    tuft of its fur worth 3 / 3 / 2 wool. It bobs and glows for 8 s,
    blinking for the last 2.5, then blows away. The player's dog picks
    it up by running within 1.6 units. One per wolf, so it can't be
    farmed; the point is the detour away from the flock. Collected
    tufts are listed separately on the end-of-wave screen.
-   **Livestock card**: one of the three shop cards offers an animal to
    buy (lamb 4, bellwether 6, ram 8, goat 12, golden fleece 25 wool),
    turning wool into an investment that pays back through shearing
    if you keep it alive. Only animals already met in the run are
    offered (lambs always), unique ones (ram, bellwether, goat) only if
    you don't have one, never beyond the flock cap, and each one owned
    raises the next one's price by 50%. Bought animals join at the start
    of the next wave. The card shows the bestiary portrait and "Shorn
    for N a wave".

------------------------------------------------------------------------

# 66. More Upgrades (implemented)

The shop now shows four cards (three upgrades, one livestock) from a
pool of 21 upgrades:

-   Dog: Booming Bark (Big Bark radius +15%), Nose for Wolves (sneaky
    reveal distance ×1.5 per level, disguise sniff time halved), Fetch!
    (tufts last 50% longer, pickup radius +30%).
-   Second Dog is now 30 wool and starts slow (60% of the dog's speed
    and bark range). Pup Training (+10% speed, max 4) and Pup's Bark
    (+10% range, max 3) only appear once it's owned (`requires`).
-   Shepherd's Crook: the shepherd joins `ctx.guards` with a 3/4/5-unit
    threat radius and swats wolves that get that close.
-   Flock/economy: Sharp Shears (+10% shearing wool), Piggy Bank
    (interest cap +2).
-   Livestock bought in the shop spawns before the wave's regular
    sheep, so it's never lost to the flock cap.

------------------------------------------------------------------------

# 67. A Flock That Moves (implemented)

Playtest finding: the flock clumped in one spot and a dog parked in the
middle covered every sheep with its bark radius. Three changes:

-   **Roaming shepherd:** during a wave, every 20-35 s the shepherd
    walks (1.3 u/s) to a new spot at least 6 units away and within 14
    of the middle of the meadow ("This way, girls!"). The flock's soft
    boundary is centred on him, so the whole flock drifts after him.
    `ROAM` in `src/config.js`.
-   **Looser grazing:** sheep that are both grazing keep 1.5× the usual
    separation; plain sheep stroll more often (walk 1.5-4 s, graze
    1.5-5 s) with weaker cohesion (0.25); the flock radius is
    5 + 1.1 × √count.
-   **Dog pressure:** each sheep builds unease while the dog is slower
    than 3 u/s within 1.8× its fear radius, reaching full unease after
    5 s; its fear radius grows up to 1.8×. A parked dog pushes the flock
    outward into a ring the wolves can pick at.
-   Bot comparison (waves 1-7): a dog parked on the flock centre went
    from keeping 9/10 → 6/10 in wave 1 and collapses by wave 3; a dog
    that does nothing now loses the game in wave 3; an active bot still
    keeps ~85-100% of the flock.

------------------------------------------------------------------------

# 68. Economy Balance Pass

Goal: early waves afford about one purchase, a strong player owns
roughly half of all upgrade levels by wave 12, and the flock gets
harder to manage rather than just bigger.

-   Flock: starts with 6 sheep (was 10); plain arrivals 2 per wave, 1
    from wave 5 (was 3); wanderers 1, 2 from wave 6; sleepy sheep 1, 2
    from wave 7; lambs 1; black sheep up to 2 from wave 10; cap 60 (was
    80). Bigger Flock is +1 sheep per level (was +2).
-   Prices roughly doubled: common upgrades 6-10 base, rare 20-40
    (Second Dog 40); livestock lamb 6, bellwether 10, ram 12, goat 18,
    golden fleece 35; rerolls 2 (+2).
-   Calm bonus +1 per 3 calm sheep (was per 2).
-   Bot results over 12 waves (strong: reacts every 0.5 s, Big Bark,
    fetches tufts; average: reacts every 1.2 s, no Big Bark; both buy
    the cheapest cards they can afford):

``` text
            wave 1   wave 8   wave 12   earned   spent   levels
strong      +10      +60      +65       486      448     28 / 63
average     +10      +72      +55       526      505     28 / 63
```

    The flock peaks around 30-40 sheep; from wave 9 both bots lose
    5-15 sheep a wave.

------------------------------------------------------------------------

# 69. Goat Rework (implemented)

-   The goat is now only available from the shop's livestock card
    (18 wool, one per run), from wave 3. It no longer arrives by itself
    in wave 9.
-   It counts in the flock counter and takes a flock slot, but gives no
    wool. The game still ends when the last real sheep is lost.
-   Buffs: sight radius 10 (was 7), charge speed 8 (was 6), cooldown
    3.5 s (was 5), stun 2 s (was 1.3), and a 2.5-unit knockback; it
    stays within about 11 units of the flock.

------------------------------------------------------------------------

# 70. Bark Range Progression (implemented)

-   The dog's threat radius starts at 2.5 (half the old 5). Loud Bark
    adds +1 per level for 6 levels, up to 8.5 (1.7× the old radius);
    base price 6, and it's drawn at twice the normal weight
    (`weight: 2`) since it's the core early purchase.
-   The second dog has its own bark range (5 × 0.6 = 3, up to 4.5 with
    Pup's Bark), independent of the player's dog.
-   Bots over 12 waves: the strong bot is barely affected (flock 30-36,
    549 wool earned); the average bot starts losing sheep from wave 2,
    peaks around 22 sheep and earns ~310 wool. Skill matters more.

------------------------------------------------------------------------

# 71. Achievements (implemented)

-   30 achievements in five groups: Waves (6), Wolves (12), Flock (6),
    Economy (5), Collection (1). Defined in `src/achievements.js` as
    `{ id, group, icon, name, text, done(life, run) }`.
-   Two kinds of progress: lifetime counters (`life`: scares, saves,
    close calls, brutes, howlers, tufts, goat butts, stampedes...,
    saved in localStorage) and this run's records (`run`: wave reached,
    best combo, best Big Bark, biggest flock, golden fleece streak, best
    wave's wool, max interest, Dog's Reach maxed).
-   The game calls `achievements.add()` / `best()` at the matching
    events and `check()` every 0.5 s during play, at the end of each
    wave, after buying and at game over. New unlocks show a gold card
    in the corner ("Achievement unlocked") that opens the list.
-   Screen: 🏆 button on the menu, pause, end-of-wave and game-over
    screens; locked achievements are greyed out but their goal is shown.

## Dog's Reach (follow-up)

-   "Bark range" was a confusing name: this is the dog's reach, the
    faint ring around it (not the Big Bark, which stays at 12). The
    upgrade is renamed Loud Bark → Dog's Reach (🎯), and the matching
    achievement is now "Long Reach".
-   The reach now also drives how far sheep react to the dog: each
    type's `dogFearRadius` is scaled by reach / 5 (`DOG.baseReach`), so
    at the start sheep react from half as far and herding needs a
    closer pass; at max reach they react from 1.7× as far.

------------------------------------------------------------------------

# 72. Sheep Personal Space (implemented)

-   After the flock update, `keepApart()` in `src/flock.js` pushes any
    two sheep closer than `SHEEP.minDistance` (1.8 for two normal
    sheep, scaled by both sizes) apart by 35% of the overlap per frame:
    a soft positional correction, not a collision. A sheep a wolf is
    holding doesn't move; the other takes the whole push.
-   Herding Instinct shrinks the minimum distance by 10% per level
    (`mods.spacing`), so a tighter, easier-to-guard flock is something
    you buy.
-   In a 40-sheep flock the closest pair sits at 1.75 with no overlaps
    (1.22 with Herding Instinct 3).

## Second Dog nerf

-   Untrained and on its own (player's dog parked away) it used to keep
    65-70% of the flock through waves 3-6 and scare 15-44 wolves a wave:
    too strong for one card.
-   Now: 55% of the dog's speed (+10% per Pup Training, max 95%), reach
    2.75 (+0.4 per Pup's Bark, max ~4), only reacts to wolves within 13
    units of the flock, decides every 0.4 s, and rests 1 s after each
    scare before chasing again (`HELPER` in `src/config.js`).
-   Alone it now keeps ~55% in waves 3-4 and can't hold later waves by
    itself: a helper, not a replacement.

------------------------------------------------------------------------

# 73. Rascal Wolf (implemented)

-   A young wolf (lighter coat, red bandana) from wave 3, one per pack
    (two from wave 8). It never grabs a sheep.
-   After stalking it enters a `DASH` state: it aims through the flock
    centre and 7 units out the other side at 10.5 u/s ("WHEEE!"),
    2-3 runs in a row, then goes back to prowling.
-   Sheep within 2.2 × their size of its path are tossed: a sideways
    and forward shove (8), a 1.7× bounce (reuses the dog-bump
    animation with `bumpPower`), panic, and sleepy sheep wake up.
-   Sheep notice a rascal from only 45% of the usual wolf-fear distance,
    so it actually hits them instead of just scaring them away.
-   Counts as threatening (indicators, helper dog, score ★ 15). Test:
    4 runs toss ~10 sheep and spread the flock from 6.5 to 10.9 units.
-   The Naturalist achievement now compares against the bestiary's
    length instead of a hard-coded 18.

------------------------------------------------------------------------

# 74. Freeze Rework (implemented)

Playtest: the 50 ms whole-game freeze on every scare made busy waves
stutter.

-   Ordinary scares no longer freeze the game. The scared wolf's own
    0.14 s startle pause is the hit: a bigger jump and a squash-and-
    stretch puff-up; the player's dog recoils (a quick squash).
-   Whole-game freezes (80 ms) remain only for the Big Bark and a
    scattered alpha pack, rate-limited to one per 0.5 s.
-   Close-call slow motion: 0.4 s at 40% speed (was 0.6 s at 25%), at
    most once every 5 s.
-   Screen effects setting (Full / Reduced / Off) on the menu and pause
    screens, saved in localStorage: Reduced drops freezes, slow motion
    and the camera push-in and halves shakes and flashes; Off removes
    them all.

------------------------------------------------------------------------

# 75. End of Summer: Goal and Endless Mode (implemented, part 1)

The run now has a goal (design options in the agent proposal; option A
with star grading was chosen).

-   Goal: survive wave 15 (`GOAL.finalWave`). The HUD shows "n / 15";
    wave 1's banner states the goal, wave 15's is "Final wave".
-   Winning (in `completeWave()` of wave 15): a "Summer's End!" screen
    with 1-3 stars by flock size (any / 15+ / 30+), the flock count,
    score, wool left and upgrades bought. Wins, best stars, best score
    and best wave are saved. Buttons: Keep grazing (endless) or Menu.
-   Endless (`ENDLESS`): +1 wolf per endless wave up to 25, extra pack
    slots filled with random special wolves plus a second alpha; score
    ×(1 + 0.1 × endless waves); flock cap 90; newcomers that don't fit
    are sold at market for 1 wool each. The HUD shows "17 ∞".
-   Achievements: the wave-15 one is now "Summer's End" (win a run);
    new: Three-Star Summer, Golden Summer (win with a golden fleece),
    Indian Summer (wave 20) and First Frost (wave 25). 35 in total.
-   Part 2 adds the final boss.

# 76. End of Summer: the Boss (implemented, part 2)

-   **Old Greymuzzle** (`greymuzzle` in `WOLF_TYPES`, `BOSS` in
    config): scale 2.3, near-black coat with a pale muzzle, the alpha's
    mane and ring, the brute's scars, red eyes. Courage 3 s (fear meter,
    affected by Brave Heart), leader (shorter stalking for the pack,
    scaring it scatters wolves within 10 units), shoves sheep, grabs
    fast. ★ 150.
-   Arrives at 25% of the final wave's duration, on the far side of the
    flock from the dog. A red HUD bar shows its drive-offs (●○○).
-   Needs `BOSS.driveOffs` (3) drive-offs; after each of the first ones
    it retreats twice as long and two normal wolves spawn; the last one
    sends it away for good (`defeated`, LEAVE → gone) and drops a
    10-wool tuft that lasts 1.5× longer.
-   The boss wave can't end while it's still around: "Overtime" banner
    until it's driven off.
-   Endless: it returns every 5 endless waves (20, 25...) with one more
    drive-off each time.
-   Bestiary entry 20 (Naturalist counts the bestiary, so it still
    works).
-   Bots through wave 15: the strong bot wins with ★★ (26 sheep), the
    average bot wins with ★ (14 sheep). Both go straight for a resisting
    boss, so humans will likely find it harder.

------------------------------------------------------------------------

# 77. First-time Tips (implemented)

-   15 tips (`src/tips.js`), each shown the first time its moment
    happens in a real game (not the menu scene): moving the dog (wave 1),
    a wolf approaching, a sheep grabbed, the Big Bark (wave 2), the
    shop, bounty tufts, strays, orphaned lambs, brutes resisting,
    stampedes, sleepy sheep, the shepherd moving, howls, rascal dashes
    and the boss.
-   One at a time in a card above the Big Bark button (out of the dog's
    way), queued if several fire together, 4 s + reading time, click to
    dismiss. Seen tips are stored in localStorage; the menu has "Show
    the first-time tips again".

------------------------------------------------------------------------

# 78. Run Summary (implemented)

-   `Game.stats` (reset in `startGame()`) counts, per run: wolves scared
    (scored scares), sheep saved and close calls, sheep lost and which
    wolf type took each one (`onSheepLost(sheep, wolf)`), best combo,
    Big Barks, bounty tufts, wool earned (shearing + tufts) and spent,
    and animals bought.
-   `runSummary()` adds the upgrades owned; the win and game-over
    screens render it as six stat tiles plus "Lost to", "Upgrades",
    "Bought" and "Bounty tufts" lines.
-   Also fixed alongside: starting a new run now resets endless mode,
    the pending win screen, the boss and the per-run achievement records.

------------------------------------------------------------------------

# 79. Summers: Difficulty Levels (implemented)

Phase 3 of the goal proposal, like Balatro's stakes.

-   `SUMMERS` in `src/config.js`: 8 levels, each adding one rule to all
    the earlier ones (`summerRules(n)` merges them): 4 starting sheep,
    +1 wolf per wave, 25% shorter stalking, prices +25%, no Big Bark
    before wave 5, brutes/sneaky wolves/alpha two waves earlier, and a
    boss with one more drive-off that arrives at 10% of the wave.
-   `waveConfig(wave, rules)` and `wolfPack(wave, count, rules)` apply
    them; the game applies prices, the Big Bark lock (the button stays
    empty until then) and the boss rules.
-   Winning the highest unlocked summer unlocks the next one ("🔓 Summer
    N unlocked: ..." on the win screen). The menu shows a ◀ Summer N ▶
    picker with the level's rules once Summer 2 is unlocked; highest
    unlocked and won are saved in localStorage.
-   Achievements: Seasoned Shepherd (win Summer 3), Evergreen (win
    Summer 8). 37 in total.

------------------------------------------------------------------------

# 80. Save and Continue (implemented)

-   `saveRun()` writes the run to localStorage (`this-is-my-sheep.run`,
    versioned) at checkpoints: at the end of `beginWave()` (the start of
    every wave, after arrivals) and on the end-of-wave screen (after
    shearing, and again after every purchase, reroll and "Keep
    grazing").
-   Saved: wave, summer, endless flag, wool, score, upgrade levels, run
    stats and achievement run records; every sheep's kind, position,
    heading, mother link, sleep state, golden streak and (for the
    disguised wolf) reveal timer; the goat; scarecrows; the shepherd's
    position; and at the shop, the cards, purchases, reroll cost,
    pending livestock, the end-of-wave panel and any pending win screen.
-   `continueRun()` rebuilds all of that (`resetRun()` + restore) and
    either restarts the wave via `beginWave()` or reopens the end-of-
    wave screen. Mid-wave state (wolves, timers) isn't saved: a wave
    you left restarts from its beginning.
-   Menu: "Continue · wave N (done)" plus "New Game", which needs a
    second click ("Start over? Your saved run will be lost"). Game over
    deletes the save.
-   `nextWave()` was split into spawning arrivals and `beginWave()`, and
    the reset part of `startGame()` became `resetRun()`, so New Game and
    Continue share them.

------------------------------------------------------------------------

# 81. Early-Wave Pressure (implemented)

Playtest: the first few waves were easy to get through without losing a
sheep. Bots agreed: a strong bot lost nothing until wave 4.

-   From wave 2 wolves arrive in pairs from opposite sides of the meadow
    (`cfg.pairs`), so the dog can't cover both at once; the next pair
    comes 1.6 × the spawn interval later.
-   One extra wolf per wave from wave 3 (`1 + wave` → `2 + wave`, still
    capped at 15); waves 1-2 stay as the intro.
-   Faster arrivals early: spawn interval `7 - 0.5 × wave` (was
    `9 - 0.6 × wave`), minimum 2 s.
-   Shorter stalking: 2-4.5 s before difficulty scaling (was 2.5-5.5 s).
-   Bots, waves 1-5 (3 runs each): strong keeps waves 1-2 clean and loses
    1-4 sheep a wave from wave 3; average from wave 3 with the odd bad
    wave; a very slow casual bot (reacting every 2 s) struggles and died
    in 1 of 3 runs by wave 5.


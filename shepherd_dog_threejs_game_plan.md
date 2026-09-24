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

## Lamb (wave 4+, one per wave; two from wave 8)

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

## Black Sheep (wave 8+, one per flock)

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

## Sneaky wolf (wave 7+)

-   Spawns silently (no howl) on the side of the flock away from the dog.
-   No off-screen indicator until it is within 15 units of the flock
    (or chasing / attacking).
-   While prowling it circles toward the side of the flock facing away
    from the dog and only moves in once it's within ~40° of that spot
    (or after waiting 6 s longer than its stalk time).
-   Look: dark grey-green, short legs, head held low. Worth 25 wool.
-   Decision: scan the edges instead of only reacting to arrows; the
    dog's position creates a blind spot.

## Alpha wolf (wave 9+, one per wave)

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

## Pack composition

``` text
wave 1-2   wolves only
wave 3-5   + 1 runner
wave 6     + 1 runner, 1 brute
wave 7-8   + 1 sneaky
wave 8+    runners = min(5, (wave-2)/2), brutes = min(3, (wave-4)/2)
wave 9+    sneaky  = min(3, (wave-5)/2), + 1 alpha
```

Herding: a sheep within the dog's fear radius also turns its wander
direction away from the dog, so a dog placed behind a stray walks it home.

The first wolf of each wave is always a normal one, so special wolves
arrive mid-wave. New types are introduced one per wave: wanderer (2),
runner (3), lamb (4), ram (5), brute (6), sneaky (7), black sheep (8),
alpha (9). The wave banner introduces each new type the first
time it appears.

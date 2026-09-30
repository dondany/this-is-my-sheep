import { WOLF, WORLD, SNEAKY, ALPHA, PUPS, HOWLER, TRICKSTER, SCARECROW, RASCAL, SHEARING, FLOCK_CHARMS, SIEGE, PIPER, TWINS, BURROWER, DEN } from './config.js';
import { angleTo } from './entities.js';

// Wolf states:
//   WANDER   prowl along the edge of the meadow
//   APPROACH pick a sheep and trot toward it, sidestepping the dog
//   CHASE    close enough: commit and sprint
//   ATTACK   holding a sheep; the dog has a moment to save it
//   FLEE     scared by the dog: freeze for a beat, then bolt away
//   LEAVE    run off the map (after a catch, or when the wave ends)
//
// Wolf types (WOLF_TYPES in config.js) scale speeds and timings, and add a few twists:
//   runner  targets the nearest sheep and gives up a chase when the dog gets near its target
//   brute   has a fear meter (`courage`): the dog must stay close for a while before it flees.
//           While resisting it backs off slowly, and a grab in progress is put on hold.
//           It also shoves sheep out of its way.
//   sneaky  has no off-screen indicator until it's near the flock, and circles the edge until it's
//           on the far side of the flock from the dog before moving in.
//   alpha   while it's around, the others stalk for less time; when it attacks, every prowling
//           wolf attacks with it. Scaring it scares all wolves within ALPHA.panicRadius too.
//   howler  never attacks: prowls a little inside the tree line and howls, panicking the flock.
//   trickster  once the dog heads its way, switches to a sheep on the far side of the flock.
//   pup     comes in groups of three that move together and split up when the dog gets close.
//   rascal  never takes a sheep: DASHes straight through the flock a few times, tossing sheep aside.
//
// Bosses (BOSSES in config.js):
//   piper      STROLLs to its spot at the edge of the screen, then PIPEs: a tune now and then lures
//              the flock towards it. Can't be scared.
//   twin       two of them; a scared twin only stays gone if its twin is scared within TWINS.window.
//   burrower   DIGs underground (a mound of earth) and comes up under a sheep to grab it. The dog on
//              the mound digs it out.
//   mother     the Den Mother: prowls the meadow's edge like a howler, never attacks, and calls pups.
// Bosses with `drivesLeft` have to be driven off that many times.
//
// Any wolf can be stunned by the goat for a moment (`stun`).
// Besides the player's dog, a helper dog (ctx.guards) and scarecrows (ctx.scarecrows) can scare wolves.

const between = ([min, max]) => min + Math.random() * (max - min);

const THREATENING = new Set(['APPROACH', 'CHASE', 'ATTACK', 'DASH', 'HAUL', 'SETUP', 'RELOAD', 'STROLL', 'PIPE', 'DIG']);

export function toWander(w, ctx) {
  const cfg = ctx.cfg;
  // A fired wolf has had enough; a siege crew goes back to its catapult (or home, if it gave up).
  if (w.type.flyer || (w.type.siege && w.abandoned)) {
    w.state = 'LEAVE';
    return;
  }
  if (w.type.siege) {
    w.state = 'HAUL';
    return;
  }
  if (w.type.piper) {
    w.state = 'STROLL';
    return;
  }
  // The burrower dives back under and rests a moment before it moves on.
  if (w.type.burrower) {
    w.state = 'DIG';
    w.target = null;
    w.retarget = 0;
    w.stateTimer = BURROWER.rest;
    ctx.onBurrowerDive?.(w);
    return;
  }
  w.state = 'WANDER';
  w.target = null;
  w.orbitDir = Math.random() < 0.5 ? -1 : 1;
  const stalk = cfg ? cfg.stalkMin + Math.random() * (cfg.stalkMax - cfg.stalkMin) : 4;
  const alphaAround = ctx.wolves.some((o) => o.type.leader && o.state !== 'LEAVE');
  const led = alphaAround && !w.type.leader ? ALPHA.stalk : 1;
  w.stateTimer = stalk * w.type.stalk * led * (ctx.mods.stalk ?? 1);
  w.feinted = false;
}

// Scare a wolf no matter what (the Big Bark): brutes don't get to resist.
export function forceScare(w, ctx, by) {
  if (w.state === 'FLEE' || w.state === 'LEAVE' || w.state === 'DIG' || w.gone || w.fearless) return false;
  const dx = w.position.x - by.position.x;
  const dz = w.position.z - by.position.z;
  scare(w, ctx, dx, dz, Math.hypot(dx, dz) || 1e-3, by);
  return true;
}

// Goat head-butt: dazed for a moment, and it lets go of any sheep it was holding.
export function stunWolf(w, ctx, seconds) {
  if (w.state === 'ATTACK' && w.target?.grabbedBy === w) {
    w.target.grabbedBy = null;
    w.target.fear = 1;
    ctx.onSheepSaved(w.target, w);
  }
  if (w.state === 'ATTACK' || w.state === 'CHASE') {
    w.state = 'APPROACH';
    w.retarget = 0;
  }
  w.target = null;
  w.stun = seconds;
  w.velocity.set(0, 0, 0);
}

// Aim a rascal's dash through the middle of the flock and out the other side.
function startDash(w, ctx) {
  const dx = ctx.center.x - w.position.x;
  const dz = ctx.center.z - w.position.z;
  const d = Math.hypot(dx, dz) || 1;
  let tx = w.position.x + (dx / d) * (d + RASCAL.overshoot);
  let tz = w.position.z + (dz / d) * (d + RASCAL.overshoot);
  const r = Math.hypot(tx, tz);
  const max = WORLD.playRadius + 2;
  if (r > max) {
    tx *= max / r;
    tz *= max / r;
  }
  w.state = 'DASH';
  w.dashTo = { x: tx, z: tz };
  w.dashesLeft = (w.dashesLeft || RASCAL.passes[0] + Math.round(Math.random() * (RASCAL.passes[1] - RASCAL.passes[0]))) - 1;
  ctx.onRascalDash?.(w);
}

// Sheep in the rascal's path get tossed aside with a big bounce.
function tossSheep(w, ctx) {
  const vx = w.velocity.x;
  const vz = w.velocity.z;
  const v = Math.hypot(vx, vz) || 1;
  for (const s of ctx.sheep) {
    if (s.grabbedBy || s.bumpCooldown > 0) continue;
    const sx = s.position.x - w.position.x;
    const sz = s.position.z - w.position.z;
    if (Math.hypot(sx, sz) > RASCAL.tossRadius * s.type.scale) continue;
    const side = Math.sign(sx * (vz / v) - sz * (vx / v)) || 1;
    s.velocity.x += (vz / v) * side * RASCAL.toss + (vx / v) * RASCAL.toss * 0.5;
    s.velocity.z += (-vx / v) * side * RASCAL.toss + (vz / v) * RASCAL.toss * 0.5;
    s.bump = 1;
    s.bumpSide = side;
    s.bumpPower = RASCAL.tossHeight;
    s.bumpCooldown = 0.8;
    s.fear = Math.max(s.fear, 0.8);
    s.asleep = false;
    ctx.onSheepTossed?.(s, w);
  }
}

// A wolf flying out of a catapult: a spinning arc from `w.flight.from` to `w.flight.to`. On landing
// it throws the sheep around it, stands dizzy for a moment, then runs off.
function fly(w, ctx, dt) {
  const f = w.flight;
  f.t = Math.min(1, f.t + dt / SIEGE.flight);
  w.position.x = f.from.x + (f.to.x - f.from.x) * f.t;
  w.position.z = f.from.z + (f.to.z - f.from.z) * f.t;
  w.position.y = f.from.y * (1 - f.t) + 4 * SIEGE.arc * f.t * (1 - f.t);
  w.root.rotation.x += dt * 9; // tumbling head over heels
  w.velocity.set(0, 0, 0);
  if (f.t < 1) return;
  w.position.y = 0;
  w.root.rotation.x = 0;
  blast(w, ctx);
  ctx.onSiegeLand?.(w);
  const cx = w.position.x - ctx.center.x;
  const cz = w.position.z - ctx.center.z;
  const cd = Math.hypot(cx, cz) || 1;
  w.fleeDir.set(cx / cd, 0, cz / cd);
  w.state = 'FLEE';
  w.pause = SIEGE.daze;
  w.stateTimer = 2;
}

// The landing: every sheep nearby is thrown outward, high, and panics. (Also the burrower coming up.)
function blast(w, ctx, { radius = SIEGE.blastRadius, push = SIEGE.blastPush, height = SIEGE.blastHeight } = {}) {
  for (const s of ctx.sheep) {
    if (s.grabbedBy) continue;
    const sx = s.position.x - w.position.x;
    const sz = s.position.z - w.position.z;
    const d = Math.hypot(sx, sz);
    if (d > radius) continue;
    const k = 1 - d / radius;
    const nx = d > 1e-3 ? sx / d : Math.random() - 0.5;
    const nz = d > 1e-3 ? sz / d : Math.random() - 0.5;
    s.velocity.x += nx * push * (0.4 + k);
    s.velocity.z += nz * push * (0.4 + k);
    s.bump = 1;
    s.bumpSide = Math.sign(nx) || 1;
    s.bumpPower = height * (0.5 + k);
    s.bumpCooldown = 0.8;
    s.fear = 1;
    s.asleep = false;
    ctx.onSheepTossed?.(s, w);
  }
}

export function isThreatening(w) {
  return THREATENING.has(w.state);
}

// How many sheep stand close around this one (Safety in Numbers charm).
function crowd(s, ctx) {
  let n = 0;
  for (const o of ctx.sheep) if (o !== s && !o.type.fake && o.position.distanceTo(s.position) < FLOCK_CHARMS.crowdRadius) n++;
  return n;
}

const safe = (s, ctx) => ctx.mods.safety && crowd(s, ctx) >= FLOCK_CHARMS.crowd;

// How long this sheep takes to grab, × the usual: stragglers go fast with Safety in Numbers, calm
// sheep slowly with Greener Pastures.
function grabFactor(s, ctx) {
  let k = 1;
  if (ctx.mods.safety && crowd(s, ctx) < FLOCK_CHARMS.straggler) k *= 0.5;
  if (ctx.mods.pastures && s.stress < SHEARING.calmStress && !s.wasGrabbed) k *= FLOCK_CHARMS.pastures;
  return k;
}

function pickTarget(w, ctx) {
  const bias = WOLF.stragglerBias * w.type.stragglerBias;
  let best = null;
  let bestScore = Infinity;
  for (const s of ctx.sheep) {
    if (s.grabbedBy || s.type.fake || safe(s, ctx)) continue;
    const d = w.position.distanceTo(s.position);
    const straggle = s.position.distanceTo(ctx.center);
    const score = d - straggle * bias - s.type.lure + Math.random() * 2;
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

// Point the wolf away from the dog, biased outward so it doesn't bolt through the flock.
function aimAway(w, ddx, ddz, dd) {
  const px = w.position.x;
  const pz = w.position.z;
  const r = Math.hypot(px, pz) || 1;
  const fx = ddx / dd + (px / r) * 0.9;
  const fz = ddz / dd + (pz / r) * 0.9;
  const fl = Math.hypot(fx, fz) || 1;
  w.fleeDir.set(fx / fl, 0, fz / fl);
}

// `by` is whatever did the scaring: a dog, or a scarecrow.
function scare(w, ctx, ddx, ddz, dd, by = ctx.dog) {
  if (w.fearless) return; // the Siege Engine's crew and the Pied Piper won't budge
  const threatening = isThreatening(w) || !!w.type.howler || !!w.type.mother;
  if (w.state === 'DIG') ctx.onBurrowerDugOut?.(w);
  w.howling = 0;
  w.stun = 0;
  if (w.state === 'ATTACK' && w.target) {
    const s = w.target;
    s.grabbedBy = null;
    s.fear = 1;
    ctx.onSheepSaved(s, w);
  }
  w.target = null;
  if (w.type.siege && !w.abandoned) {
    w.abandoned = true;
    ctx.onSiegeBroken?.(w);
  }
  w.state = 'FLEE';
  w.fear = 0;
  w.resisting = false;
  w.pause = WOLF.scarePause;
  w.stateTimer = ctx.dog.stats.fleeTime * w.type.fleeTime;
  aimAway(w, ddx, ddz, dd);
  ctx.onWolfScared(w, threatening, by);

  // The Twins: only scared together (within TWINS.window of each other) do they leave for good.
  if (w.type.twin) {
    const twin = w.twin;
    if (twin && !twin.defeated && twin.downUntil > ctx.time) {
      for (const t of [w, twin]) {
        t.defeated = true;
        t.state = 'LEAVE';
        t.downUntil = 0;
      }
      ctx.onTwinsBeaten?.(w, twin);
    } else {
      w.downUntil = ctx.time + TWINS.window;
      w.stateTimer = TWINS.window; // then it's straight back
      ctx.onTwinDown?.(w);
    }
  }

  // Bosses with drive-offs have to be driven off several times; the last time they leave for good.
  if (w.drivesLeft != null) {
    w.drivesLeft = (w.drivesLeft ?? 1) - 1;
    if (w.drivesLeft <= 0) {
      w.defeated = true;
      w.state = 'LEAVE';
    } else w.stateTimer *= 2; // a longer retreat before it comes back
    ctx.onBossDriven?.(w, w.drivesLeft);
  }

  // Pups: scaring the whole group in one pass earns a bonus.
  const g = w.group;
  if (g) {
    g.scares = g.scares.filter((t) => ctx.time - t < PUPS.comboWindow);
    g.scares.push(ctx.time);
    if (g.scares.length === g.pups.filter((p) => p.alive).length && g.scares.length > 1) {
      g.scares = [];
      ctx.onPupCombo?.(w);
    }
  }

  // The pack follows its leader's lead.
  if (w.type.leader) {
    let scattered = 0;
    for (const o of ctx.wolves) {
      if (o === w || o.state === 'FLEE' || o.state === 'LEAVE') continue;
      if (o.position.distanceTo(w.position) > ALPHA.panicRadius) continue;
      const ox = o.position.x - ctx.dog.position.x;
      const oz = o.position.z - ctx.dog.position.z;
      scare(o, ctx, ox, oz, Math.hypot(ox, oz) || 1e-3, by);
      scattered++;
    }
    if (scattered) ctx.onPackScattered?.(w, scattered);
  }
}

// A skittish wolf abandoning its chase: no freeze, no reward, just a quick retreat.
function giveUp(w, ddx, ddz, dd) {
  w.target = null;
  w.state = 'FLEE';
  w.pause = 0;
  w.stateTimer = 0.8;
  aimAway(w, ddx, ddz, dd);
}

// Pups move as a group until the dog gets close; then they scatter and act alone.
function updatePupGroups(wolves, ctx, dt) {
  const groups = new Set(wolves.map((w) => w.group).filter(Boolean));
  for (const g of groups) {
    const pups = g.pups.filter((p) => p.alive && !p.gone);
    if (g.split) {
      // Regroup once they're all prowling again.
      if (pups.every((p) => p.state === 'WANDER')) g.split = false;
      continue;
    }
    const near = pups.some((p) => p.state !== 'FLEE' && p.position.distanceTo(ctx.dog.position) < PUPS.splitRadius);
    g.alarm = near ? g.alarm + dt : 0;
    if (g.alarm < PUPS.reaction) continue;
    g.split = true;
    g.alarm = 0;
    pups.forEach((p, i) => {
      if (p.state === 'FLEE' || p.state === 'ATTACK') return;
      const ax = p.position.x - ctx.dog.position.x;
      const az = p.position.z - ctx.dog.position.z;
      const a = Math.atan2(az, ax) + (i - 1) * 0.9; // fan out in different directions
      p.state = 'FLEE';
      p.pause = 0;
      p.stateTimer = 0.7;
      p.target = null;
      p.fleeDir.set(Math.cos(a), 0, Math.sin(a));
    });
    ctx.onPupsSplit?.(pups[0]);
  }
}

// The Pied Piper's tune: every sheep that can hear it (awake, not held) walks towards the piper
// for a moment (see flock.js); the first to reach it is lured away (one a tune).
function lure(w, ctx) {
  for (const s of [...ctx.sheep]) {
    if (s.grabbedBy || s.asleep || s.type.fake) continue;
    s.lured = 0.25;
    s.lureTo = w;
    if (!w.snatched && s.position.distanceTo(w.position) < PIPER.snatch) {
      w.snatched = true;
      ctx.onPiperSnatch?.(s, w);
    }
  }
}

// A howl: every sheep in range panics and scatters away from the howler.
function howl(w, ctx) {
  for (const s of ctx.sheep) {
    if (s.grabbedBy || s.asleep) continue;
    const sx = s.position.x - w.position.x;
    const sz = s.position.z - w.position.z;
    const d = Math.hypot(sx, sz);
    if (d > HOWLER.radius || d < 1e-3) continue;
    const k = 1 - d / HOWLER.radius;
    s.fear = Math.max(s.fear, 0.9);
    s.velocity.x += (sx / d) * (1.5 + 3 * k);
    s.velocity.z += (sz / d) * (1.5 + 3 * k);
  }
  ctx.onHowl?.(w);
}

export function updateWolves(wolves, ctx, dt) {
  const { dog, cfg } = ctx;
  const waveSpeed = cfg ? cfg.wolfSpeed : 1;
  updatePupGroups(wolves, ctx, dt);

  for (const w of wolves) {
    if (w.state === 'FLY') {
      fly(w, ctx, dt);
      continue;
    }
    const T = w.type;
    const speedScale = waveSpeed * T.speed;
    const px = w.position.x;
    const pz = w.position.z;
    const ddx = px - dog.position.x;
    const ddz = pz - dog.position.z;
    const dd = Math.hypot(ddx, ddz) || 1e-3;
    let vx = 0;
    let vz = 0;
    let snap = false; // stop dead instead of easing

    w.revealed = !T.hidden || w.state === 'CHASE' || w.state === 'ATTACK' || (w.state === 'APPROACH' && w.position.distanceTo(ctx.center) < SNEAKY.revealDistance * ctx.mods.reveal);

    // A dog's threat radius beats everything else. Brave wolves hold out until their fear meter fills.
    const canScare = w.state !== 'FLEE' && w.state !== 'LEAVE';
    let by = null;
    let bx = 0;
    let bz = 0;
    if (canScare) {
      for (const g of ctx.guards) {
        const gx = px - g.position.x;
        const gz = pz - g.position.z;
        if (Math.hypot(gx, gz) < g.stats.threatRadius * T.threatScale) {
          [by, bx, bz] = [g, gx, gz];
          break;
        }
      }
    }
    // The siege engine's crew just shrugs the dog off.
    if (by && w.fearless) {
      if (!(w.shrugAt > ctx.time)) ctx.onSiegeShrug?.(w);
      w.shrugAt = ctx.time + 3;
      by = null;
    }
    const courage = T.courage * ctx.mods.courage;
    if (by && courage > 0) {
      if (!w.resisting) ctx.onWolfResist?.(w);
      w.resisting = true;
      w.fear += dt;
      if (w.fear >= courage) scare(w, ctx, bx, bz, Math.hypot(bx, bz) || 1e-3, by);
    } else {
      w.resisting = false;
      if (by) scare(w, ctx, bx, bz, Math.hypot(bx, bz) || 1e-3, by);
      else if (w.fear > 0) w.fear = Math.max(0, w.fear - dt * 0.5);
    }
    // Scarecrows only fool ordinary wolves: brutes see right through them.
    if (w.state !== 'FLEE' && w.state !== 'LEAVE' && w.state !== 'DIG' && !courage) {
      for (const sc of ctx.scarecrows) {
        const sx = px - sc.position.x;
        const sz = pz - sc.position.z;
        const sd = Math.hypot(sx, sz);
        if (sd < SCARECROW.radius * T.threatScale) {
          // Snares charm: the first wolf each wave is held fast for a while instead.
          if (ctx.mods.snares && !sc.snared && !T.boss) {
            sc.snared = true;
            stunWolf(w, ctx, FLOCK_CHARMS.snare);
            ctx.onSnare?.(sc, w);
            break;
          }
          scare(w, ctx, sx, sz, sd || 1e-3, sc);
          break;
        }
      }
    }

    // Dazed by the goat: stand still (the dog can still scare it).
    if (w.stun > 0 && w.state !== 'FLEE') {
      w.stun -= dt;
      w.velocity.set(0, 0, 0);
      w.resisting = false;
      continue;
    }

    // Grouped pups follow the first pup's lead.
    const lead = w.group && !w.group.split ? w.group.pups.find((p) => p.alive && !p.gone) : null;
    if (lead && lead !== w) {
      w.orbitDir = lead.orbitDir;
      if (w.state === 'WANDER' && (lead.state === 'APPROACH' || lead.state === 'CHASE')) {
        w.state = 'APPROACH';
        w.target = lead.target;
        w.retarget = 1.5;
      }
    }

    switch (w.state) {
      case 'WANDER': {
        w.stateTimer -= dt;
        const r = Math.hypot(px, pz) || 1;
        const ox = px / r;
        const oz = pz / r;
        // Flankers circle toward the side of the flock facing away from the dog.
        let inPosition = true;
        let orbitSpeed = WOLF.wanderSpeed;
        if (T.flank) {
          const cx = ctx.center.x - dog.position.x;
          const cz = ctx.center.z - dog.position.z;
          const behind = Math.atan2(cz, cx);
          const off = angleTo(Math.atan2(pz, px), behind);
          w.orbitDir = off >= 0 ? 1 : -1;
          inPosition = Math.abs(off) < SNEAKY.flankAngle || w.stateTimer < -SNEAKY.giveUpFlank;
          orbitSpeed = inPosition ? WOLF.wanderSpeed * 0.3 : WOLF.wanderSpeed * 1.6;
        }
        vx = -oz * w.orbitDir * orbitSpeed;
        vz = ox * w.orbitDir * orbitSpeed;
        const ring = T.mother ? WORLD.playRadius - DEN.inset : WORLD.lurkRadius - (T.howler ? HOWLER.ringOffset : 0);
        const radial = (ring - r) * 1.2;
        vx += ox * radial;
        vz += oz * radial;
        const vl = Math.hypot(vx, vz);
        const max = WOLF.approachSpeed * speedScale;
        if (vl > max) {
          vx *= max / vl;
          vz *= max / vl;
        }
        // Howlers never attack: they stop now and then to howl at the flock.
        if (T.howler) {
          if (w.howling > 0) {
            snap = true;
            w.turnToward(Math.atan2(ctx.center.x - px, ctx.center.z - pz), 6, dt);
            w.howling -= dt;
            if (w.howling <= 0) howl(w, ctx);
          } else if (ctx.huntingAllowed && (w.howlTimer -= dt) <= 0) {
            w.howlTimer = between(HOWLER.interval);
            w.howling = HOWLER.windup;
            ctx.onHowlStart?.(w);
          }
          break;
        }
        // The Den Mother never attacks: she prowls and calls her pups.
        if (T.mother) {
          if (ctx.huntingAllowed && (w.callTimer = (w.callTimer ?? DEN.first) - dt) <= 0) {
            w.callTimer = DEN.interval;
            ctx.onDenCall?.(w);
          }
          break;
        }
        if (w.stateTimer <= 0 && T.rascal && ctx.huntingAllowed && ctx.sheep.length) {
          startDash(w, ctx);
          break;
        }
        if (w.stateTimer <= 0 && inPosition && ctx.huntingAllowed && ctx.sheep.length) {
          w.state = 'APPROACH';
          w.retarget = 0;
          if (T.leader) {
            // The alpha's howl sends every prowling wolf in at once.
            for (const o of wolves) if (o !== w && o.state === 'WANDER') o.stateTimer = Math.min(o.stateTimer, Math.random() * 0.8);
            ctx.onAlphaCall?.(w);
          }
        }
        break;
      }

      case 'APPROACH': {
        w.retarget -= dt;
        if (!w.target || !w.target.alive || w.target.grabbedBy || (w.retarget <= 0 && !w.feinted)) {
          w.target = pickTarget(w, ctx);
          w.retarget = 1.5;
        }
        if (!w.target) {
          toWander(w, ctx);
          break;
        }
        // Trickster: once the dog commits to it, switch to the far side of the flock.
        if (T.feint && !w.feinted && dd < TRICKSTER.commitRadius && dog.speed > 4) {
          // Cosine between the dog's heading and the direction from the dog to this wolf.
          const heading = (dog.velocity.x * ddx + dog.velocity.z * ddz) / (dog.speed * dd);
          if (heading > TRICKSTER.commitAim) {
            let far = null;
            let farD = -1;
            for (const s of ctx.sheep) {
              if (s.grabbedBy || s.type.fake) continue;
              const d = s.position.distanceTo(dog.position);
              if (d > farD) {
                farD = d;
                far = s;
              }
            }
            if (far) {
              w.target = far;
              w.feinted = true;
              ctx.onFeint?.(w);
            }
          }
        }
        const tx = w.target.position.x - px;
        const tz = w.target.position.z - pz;
        const td = Math.hypot(tx, tz) || 1e-3;
        const speed = WOLF.approachSpeed * speedScale;
        vx = (tx / td) * speed;
        vz = (tz / td) * speed;
        // Sidestep the dog while still out of reach.
        if (dd < WOLF.dogAvoidRadius) {
          const k = (1 - dd / WOLF.dogAvoidRadius) * speed * 0.9;
          vx += (ddx / dd) * k;
          vz += (ddz / dd) * k;
        }
        if (td < WOLF.chaseDistance) {
          w.state = 'CHASE';
          ctx.onWolfCharge?.(w);
        }
        break;
      }

      case 'DASH': {
        const tx = w.dashTo.x - px;
        const tz = w.dashTo.z - pz;
        const td = Math.hypot(tx, tz);
        if (td < 1.5) {
          if (w.dashesLeft > 0 && ctx.huntingAllowed && ctx.sheep.length) startDash(w, ctx);
          else {
            w.dashesLeft = 0;
            toWander(w, ctx);
          }
          break;
        }
        vx = (tx / td) * RASCAL.speed * speedScale;
        vz = (tz / td) * RASCAL.speed * speedScale;
        tossSheep(w, ctx);
        break;
      }

      case 'CHASE': {
        const s = w.target;
        if (!s || !s.alive || s.grabbedBy) {
          w.state = 'APPROACH';
          w.retarget = 0;
          break;
        }
        if (T.skittish && s.position.distanceTo(dog.position) < dog.stats.threatRadius * 1.6) {
          giveUp(w, ddx, ddz, dd);
          break;
        }
        const tx = s.position.x - px;
        const tz = s.position.z - pz;
        const td = Math.hypot(tx, tz) || 1e-3;
        vx = (tx / td) * WOLF.chaseSpeed * speedScale;
        vz = (tz / td) * WOLF.chaseSpeed * speedScale;
        if (td < WOLF.grabDistance * (T.scale / 1.2) && safe(s, ctx)) {
          // Safety in Numbers: too many sheep around it; look for another.
          w.state = 'APPROACH';
          w.retarget = 0;
          break;
        }
        if (td < WOLF.grabDistance * (T.scale / 1.2)) {
          w.state = 'ATTACK';
          w.stateTimer = WOLF.grabTime * T.grabTime * s.type.grabTime * ctx.mods.grab * grabFactor(s, ctx);
          s.grabbedBy = w;
          s.wasGrabbed = true;
          ctx.onSheepGrabbed(s, w);
        } else if (td > WOLF.chaseDistance * 1.8) {
          w.state = 'APPROACH';
        }
        break;
      }

      case 'ATTACK': {
        const s = w.target;
        if (!s || !s.alive || s.grabbedBy !== w) {
          if (T.burrower) toWander(w, ctx); // lost its grip: back under
          else {
            w.state = 'APPROACH';
            w.retarget = 0;
          }
          break;
        }
        snap = true;
        w.turnToward(Math.atan2(s.position.x - px, s.position.z - pz), 10, dt);
        // A resisting brute is busy with the dog and can't finish the job.
        if (!w.resisting) w.stateTimer -= dt;
        if (w.stateTimer <= 0) {
          w.target = null;
          w.state = 'LEAVE';
          ctx.onSheepLost(s, w);
        }
        break;
      }

      case 'FLEE': {
        if (w.pause > 0) {
          // Freeze and stare at the dog for a beat before bolting.
          w.pause -= dt;
          snap = true;
          w.turnToward(Math.atan2(-ddx, -ddz), 25, dt);
          break;
        }
        w.stateTimer -= dt;
        // Chain Reaction charm: a fleeing wolf knocks the fright into any wolf it runs past.
        if (ctx.mods.chain) {
          for (const o of wolves) {
            if (o === w || o.type.boss || o.state === 'FLEE' || o.state === 'LEAVE' || o.gone) continue;
            if (o.position.distanceTo(w.position) < ctx.mods.chain) forceScare(o, ctx, w);
          }
        }
        const fleeSpeed = WOLF.fleeSpeed * Math.max(T.speed, 0.85);
        vx = w.fleeDir.x * fleeSpeed;
        vz = w.fleeDir.z * fleeSpeed;
        if (w.stateTimer <= 0) {
          if (ctx.huntingAllowed) toWander(w, ctx);
          else w.state = 'LEAVE';
        }
        break;
      }

      // Siege crew: drag the catapult to its spot, wind it up, fire, reload.
      case 'HAUL': {
        const tx = w.site.x - px;
        const tz = w.site.z - pz;
        const td = Math.hypot(tx, tz);
        if (td < 0.6) {
          w.state = 'SETUP';
          w.stateTimer = w.shotsFired ? SIEGE.reload : SIEGE.setup;
          w.aimed = false;
          ctx.onSiegeSetup?.(w);
          break;
        }
        const sp = WOLF.approachSpeed * speedScale * SIEGE.haulSpeed;
        vx = (tx / td) * sp;
        vz = (tz / td) * sp;
        break;
      }

      case 'SETUP':
      case 'RELOAD': {
        snap = true;
        w.turnToward(Math.atan2(ctx.center.x - px, ctx.center.z - pz), 6, dt);
        if (!ctx.huntingAllowed) {
          w.state = 'LEAVE';
          break;
        }
        w.stateTimer -= dt;
        if (!w.aimed && w.stateTimer <= SIEGE.aimWarning) {
          w.aimed = true;
          w.aim = { x: ctx.center.x, z: ctx.center.z };
          ctx.onSiegeAim?.(w, w.aim);
        }
        if (w.stateTimer <= 0) {
          w.shotsFired = (w.shotsFired ?? 0) + 1;
          ctx.onSiegeFire?.(w, w.aim);
          // Keeps firing for the rest of the wave, until the dog chases the crew off.
          w.state = 'RELOAD';
          w.stateTimer = SIEGE.reload;
          w.aimed = false;
        }
        break;
      }

      // The Pied Piper: walk to its spot (w.site, kept on screen by the game), then play.
      case 'STROLL': {
        const tx = w.site.x - px;
        const tz = w.site.z - pz;
        const td = Math.hypot(tx, tz);
        if (td < 0.6) {
          w.state = 'PIPE';
          w.playing = false;
          w.stateTimer = PIPER.first;
          break;
        }
        const sp = WOLF.approachSpeed * speedScale;
        vx = (tx / td) * sp;
        vz = (tz / td) * sp;
        break;
      }

      case 'PIPE': {
        snap = true;
        w.turnToward(Math.atan2(ctx.center.x - px, ctx.center.z - pz), 6, dt);
        if (!ctx.huntingAllowed) {
          w.state = 'LEAVE';
          w.playing = false;
          break;
        }
        w.stateTimer -= dt;
        if (w.stateTimer <= 0) {
          w.playing = !w.playing;
          w.snatched = false;
          w.stateTimer = w.playing ? PIPER.tune : PIPER.rest;
          ctx.onPiperTune?.(w, w.playing);
        }
        if (w.playing) lure(w, ctx);
        break;
      }

      // The burrower underground: head for a sheep and come up beneath it.
      case 'DIG': {
        if ((w.stateTimer -= dt) > 0 || !ctx.huntingAllowed) break;
        w.retarget -= dt;
        if (!w.target || !w.target.alive || w.target.grabbedBy || w.retarget <= 0) {
          w.target = pickTarget(w, ctx);
          w.retarget = 2;
        }
        const s = w.target;
        if (!s) break;
        const tx = s.position.x - px;
        const tz = s.position.z - pz;
        const td = Math.hypot(tx, tz) || 1e-3;
        if (td < BURROWER.reach) {
          w.state = 'ATTACK';
          w.stateTimer = WOLF.grabTime * T.grabTime * s.type.grabTime * ctx.mods.grab * grabFactor(s, ctx);
          s.grabbedBy = w;
          s.wasGrabbed = true;
          blast(w, ctx, { radius: BURROWER.burst, push: BURROWER.push, height: 1.6 });
          ctx.onBurrowerSurface?.(w);
          ctx.onSheepGrabbed(s, w);
          break;
        }
        vx = (tx / td) * BURROWER.digSpeed * speedScale;
        vz = (tz / td) * BURROWER.digSpeed * speedScale;
        break;
      }

      case 'LEAVE': {
        const r = Math.hypot(px, pz) || 1;
        vx = (px / r) * WOLF.fleeSpeed * 0.8;
        vz = (pz / r) * WOLF.fleeSpeed * 0.8;
        if (r > WORLD.spawnRadius) {
          if (ctx.huntingAllowed && !w.defeated && !T.flyer && !T.siege) toWander(w, ctx);
          else w.gone = true;
        }
        break;
      }
    }

    // Resisting (outside a grab): back away slowly, still facing the dog.
    const backingOff = w.resisting && w.state !== 'ATTACK';
    if (backingOff) {
      vx = (ddx / dd) * 1.2;
      vz = (ddz / dd) * 1.2;
    }

    // Grouped pups stick close to their lead pup.
    if (lead && lead !== w && !snap && w.state !== 'FLEE' && w.state !== 'LEAVE') {
      const lx = lead.position.x - px;
      const lz = lead.position.z - pz;
      const ld = Math.hypot(lx, lz);
      if (ld > 1.4) {
        vx += (lx / ld) * Math.min(ld - 1.4, 3) * 1.5;
        vz += (lz / ld) * Math.min(ld - 1.4, 3) * 1.5;
      }
    }

    // Keep a little space between wolves.
    if (!snap) {
      for (const o of wolves) {
        if (o === w) continue;
        const ox = px - o.position.x;
        const oz = pz - o.position.z;
        const d = Math.hypot(ox, oz);
        const room = 1.5 * (T.scale + o.type.scale) / 2.4 + 0.3;
        if (d < room && d > 1e-3) {
          vx += (ox / d) * (room - d) * 3;
          vz += (oz / d) * (room - d) * 3;
        }
      }
    }

    if (snap) w.velocity.set(0, 0, 0);
    else {
      const resp = 1 - Math.exp(-6 * dt);
      w.velocity.x += (vx - w.velocity.x) * resp;
      w.velocity.z += (vz - w.velocity.z) * resp;
      if (backingOff) w.turnToward(Math.atan2(-ddx, -ddz), 12, dt);
      else w.faceVelocity(9, dt, 0.3);
    }
    w.position.x += w.velocity.x * dt;
    w.position.z += w.velocity.z * dt;

    // Brutes bulldoze through the flock.
    if (T.shove) {
      for (const s of ctx.sheep) {
        if (s.grabbedBy) continue;
        const sx = s.position.x - w.position.x;
        const sz = s.position.z - w.position.z;
        const d = Math.hypot(sx, sz);
        if (d < 2 && d > 1e-3) {
          const k = (2 - d) * 5;
          s.velocity.x += (sx / d) * k * dt * 10;
          s.velocity.z += (sz / d) * k * dt * 10;
          s.fear = Math.max(s.fear, 0.6);
        }
      }
    }
  }
}

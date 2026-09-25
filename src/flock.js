import { DOG, SHEEP, WORLD, RAM_CALM, LAMB, BLACK, SLEEPY, BELL, GOAT, BUMP } from './config.js';
import { angleTo } from './entities.js';

const NEIGH2 = SHEEP.neighbourRadius ** 2;

const between = ([min, max]) => min + Math.random() * (max - min);

function findMother(sheep, lamb) {
  let best = null;
  let bestD = Infinity;
  for (const o of sheep) {
    if (o.kind !== 'normal' || o.child || o.grabbedBy) continue;
    const d = o.position.distanceTo(lamb.position);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

// --- Black sheep stampedes -------------------------------------------------

function startStampede(s, sheep, ctx) {
  const ax = s.position.x - ctx.center.x;
  const az = s.position.z - ctx.center.z;
  // Charge outward from the flock, give or take.
  const a = (Math.hypot(ax, az) > 0.5 ? Math.atan2(ax, az) : Math.random() * Math.PI * 2) + (Math.random() - 0.5);
  s.stampedeDir.set(Math.sin(a), 0, Math.cos(a));
  s.stampede = BLACK.duration;
  const recruits = sheep
    .filter((o) => o !== s && !o.grabbedBy && !o.leader && !o.asleep && !o.type.fake && o.kind !== 'ram' && o.position.distanceTo(s.position) < BLACK.recruitRadius)
    .sort((a, b) => a.position.distanceTo(s.position) - b.position.distanceTo(s.position))
    .slice(0, BLACK.followers);
  for (const o of recruits) {
    o.leader = s;
    o.fear = Math.max(o.fear, 0.6);
  }
  ctx.onStampede?.(s);
}

function endStampede(s, sheep, ctx, headedOff) {
  s.stampede = 0;
  s.windup = 0;
  s.nextStampede = between(BLACK.interval);
  for (const o of sheep) if (o.leader === s) o.leader = null;
  if (headedOff) ctx.onStampedeStopped?.(s);
}

function updateStampedes(sheep, ctx, dt) {
  for (const s of sheep) {
    if (s.leader && (!s.leader.alive || s.leader.stampede <= 0)) s.leader = null;
    if (s.kind !== 'black') continue;
    const active = s.stampede > 0 || s.windup > 0;
    if (s.grabbedBy || !ctx.stampedes) {
      if (active) endStampede(s, sheep, ctx, false);
      continue;
    }
    const dd = s.position.distanceTo(ctx.dog.position);
    if (s.stampede > 0) {
      s.stampede -= dt;
      if (dd < BLACK.cutOffRadius) endStampede(s, sheep, ctx, true);
      else if (s.stampede <= 0 || Math.hypot(s.position.x, s.position.z) > WORLD.playRadius - 2) endStampede(s, sheep, ctx, false);
    } else if (s.windup > 0) {
      s.windup -= dt;
      if (s.windup <= 0) startStampede(s, sheep, ctx);
    } else {
      s.nextStampede -= dt;
      if (s.nextStampede <= 0) {
        s.windup = BLACK.windup;
        ctx.onStampedeWarning?.(s);
      }
    }
  }
}

// --- Sleepy sheep and the bellwether -----------------------------------------

function wakeUp(s, sheep, ctx) {
  s.asleep = false;
  s.wakeTimer = between(SLEEPY.awake);
  s.fear = 0.6;
  // Startled awake: it bleats and the sheep around it scatter.
  for (const o of sheep) {
    if (o === s || o.grabbedBy || o.asleep) continue;
    const ox = o.position.x - s.position.x;
    const oz = o.position.z - s.position.z;
    const d = Math.hypot(ox, oz);
    if (d < SLEEPY.startleRadius && d > 1e-3) {
      o.fear = Math.max(o.fear, 0.8);
      o.velocity.x += (ox / d) * 4;
      o.velocity.z += (oz / d) * 4;
    }
  }
  ctx.onSheepWoke?.(s);
}

function ringBell(s, sheep, ctx) {
  s.bellSwing = 1;
  for (const o of sheep) {
    if (o === s || o.grabbedBy || o.asleep || o.leader) continue;
    if (o.position.distanceTo(s.position) < BELL.radius) {
      o.regroup = BELL.regroupTime;
      o.regroupTo = s;
    }
  }
  ctx.onBell?.(s);
}

// The goat does its own thing: ambles about and charges wolves that come close.
export function updateGoat(g, ctx, dt) {
  const { wolves, center } = ctx;
  g.cooldown -= dt;
  const busy = (w) => w.gone || w.state === 'FLEE' || w.state === 'LEAVE' || w.stun > 0;
  if (g.target && (busy(g.target) || g.target.position.distanceTo(g.position) > GOAT.sightRadius * 1.5)) g.target = null;
  if (!g.target && g.cooldown <= 0) {
    let best = GOAT.sightRadius;
    for (const w of wolves) {
      const d = w.position.distanceTo(g.position);
      if (!busy(w) && d < best) {
        best = d;
        g.target = w;
      }
    }
  }

  let dx = 0;
  let dz = 0;
  if (g.target) {
    const tx = g.target.position.x - g.position.x;
    const tz = g.target.position.z - g.position.z;
    const td = Math.hypot(tx, tz) || 1e-3;
    dx = (tx / td) * GOAT.chargeSpeed;
    dz = (tz / td) * GOAT.chargeSpeed;
    if (td < GOAT.buttRadius * g.target.type.scale) {
      ctx.onGoatButt?.(g, g.target);
      g.butt = 1;
      g.cooldown = GOAT.cooldown;
      g.target = null;
    }
  } else {
    g.turnTimer -= dt;
    if (g.turnTimer <= 0) {
      g.turnTimer = 2 + Math.random() * 4;
      g.wanderAngle += (Math.random() - 0.5) * 2.5;
      g.idle = Math.random() < 0.35;
    }
    if (!g.idle) {
      dx = Math.sin(g.wanderAngle) * GOAT.walkSpeed;
      dz = Math.cos(g.wanderAngle) * GOAT.walkSpeed;
    }
    // Loosely stays in the same part of the meadow as the flock.
    const cx = center.x - g.position.x;
    const cz = center.z - g.position.z;
    const cd = Math.hypot(cx, cz);
    if (cd > GOAT.leash) {
      dx += (cx / cd) * (cd - GOAT.leash) * 0.4;
      dz += (cz / cd) * (cd - GOAT.leash) * 0.4;
    }
  }
  const r = Math.hypot(g.position.x, g.position.z);
  if (r > WORLD.playRadius - 2) {
    dx -= (g.position.x / r) * 3;
    dz -= (g.position.z / r) * 3;
  }
  const resp = 1 - Math.exp(-4 * dt);
  g.velocity.x += (dx - g.velocity.x) * resp;
  g.velocity.z += (dz - g.velocity.z) * resp;
  g.position.x += g.velocity.x * dt;
  g.position.z += g.velocity.z * dt;
  g.faceVelocity(8, dt, 0.3);
}

export function flockCenter(sheep, out) {
  out.set(0, 0, 0);
  if (!sheep.length) return out;
  for (const s of sheep) out.add(s.position);
  return out.divideScalar(sheep.length);
}

// Each sheep sums a few simple steering urges into a desired velocity and eases toward it:
// wander + follow mother (lambs) + separation + alignment + cohesion + boundary + ram pull
// + fear of dog + fear of wolves. A stampede overrides all of that.
// How strong each urge is depends on the sheep's type (SHEEP_TYPES in config.js).
export function updateFlock(sheep, ctx, dt) {
  const { dog, wolves, shepherd, center } = ctx;
  const n = sheep.length;
  const baseRadius = SHEEP.flockRadius + Math.sqrt(n) * SHEEP.flockRadiusPerSqrt;
  const home = shepherd.position;
  const mods = ctx.mods;
  // Drops once the bellwether is lost; Herding Instinct raises it.
  const cohesionScale = (ctx.cohesionScale ?? 1) * mods.cohesion;
  // Sheep react to the dog from further away as its reach grows (half as far at the start).
  const reach = dog.stats.threatRadius / DOG.baseReach;
  updateStampedes(sheep, ctx, dt);

  for (let i = 0; i < n; i++) {
    const s = sheep[i];
    const t = s.type;
    if (s.grabbedBy) {
      s.velocity.set(0, 0, 0);
      continue;
    }
    const px = s.position.x;
    const pz = s.position.z;
    const radius = baseRadius * t.radiusScale;
    let dx = 0;
    let dz = 0;

    // Sleepy sheep: doze on the spot until the dog comes by, then nod off again later.
    if (s.kind === 'sleepy') {
      if (s.asleep) {
        if (s.position.distanceTo(dog.position) < SLEEPY.wakeRadius) wakeUp(s, sheep, ctx);
        else {
          s.velocity.set(0, 0, 0);
          s.snore = (s.snore ?? Math.random() * 3) - dt;
          if (s.snore <= 0) {
            s.snore = 3 + Math.random() * 2;
            ctx.onSnore?.(s);
          }
          continue;
        }
      } else if ((s.wakeTimer -= dt) <= 0 && s.fear < 0.1 && !s.leader) {
        s.asleep = true;
        ctx.onSheepDozed?.(s);
      }
    }

    // Bellwether: rings every few seconds, calling nearby sheep back to it.
    if (s.kind === 'bellwether') {
      s.ringTimer = (s.ringTimer ?? between(BELL.interval)) - dt;
      if (s.ringTimer <= 0) {
        s.ringTimer = between(BELL.interval);
        ringBell(s, sheep, ctx);
      }
    }
    if (s.regroup > 0) {
      s.regroup -= dt;
      const b = s.regroupTo;
      if (b?.alive) {
        const bx = b.position.x - px;
        const bz = b.position.z - pz;
        const bd = Math.hypot(bx, bz);
        if (bd > 2) {
          dx += (bx / bd) * BELL.pull;
          dz += (bz / bd) * BELL.pull;
        }
      }
    }

    // Lambs: lose the mother → bolt off alone; brought back to the flock → adopt a new one.
    if (s.kind === 'lamb') {
      if (s.parent && !s.parent.alive) {
        s.parent = null;
        s.orphan = true;
        s.orphanOut = false; // it has to actually run off before it can be brought back
        s.fear = 1;
        s.wanderAngle = Math.atan2(px - center.x, pz - center.z); // away from the flock
        ctx.onLambOrphaned?.(s);
      } else if (s.orphan) {
        const hd = Math.hypot(home.x - px, home.z - pz);
        if (hd > baseRadius * 1.3) s.orphanOut = true;
      }
      if (s.orphan && s.orphanOut && Math.hypot(home.x - px, home.z - pz) < baseRadius) {
        s.orphan = false;
        s.parent = findMother(sheep, s);
        if (s.parent) s.parent.child = s;
        ctx.onLambReunited?.(s);
      }
    }
    if (s.orphan) {
      s.mode = 'walk';
      s.modeTimer = 1;
    }
    const walkSpeed = s.orphan ? LAMB.orphanSpeed : t.walkSpeed;

    // Graze for a while, then take a stroll.
    s.modeTimer -= dt;
    if (s.modeTimer <= 0) {
      if (s.mode === 'graze') {
        s.mode = 'walk';
        s.modeTimer = between(t.walkTime);
        s.wanderAngle += (Math.random() - 0.5) * 2.5;
      } else {
        s.mode = 'graze';
        s.modeTimer = between(t.grazeTime);
      }
    }
    s.wanderAngle += (Math.random() - 0.5) * 3 * dt;
    if (s.mode === 'walk') {
      dx += Math.sin(s.wanderAngle) * walkSpeed;
      dz += Math.cos(s.wanderAngle) * walkSpeed;
    }
    if (s.parent) {
      const fx = s.parent.position.x - px;
      const fz = s.parent.position.z - pz;
      const fd = Math.hypot(fx, fz);
      if (fd > LAMB.followDistance) {
        const pull = Math.min(fd - LAMB.followDistance, 3) * LAMB.follow;
        dx += (fx / fd) * pull;
        dz += (fz / fd) * pull;
      }
    }

    // Separation and alignment with neighbours; the ram draws sheep toward it.
    let ax = 0;
    let az = 0;
    let count = 0;
    let nearRam = false;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const o = sheep[j];
      const ox = px - o.position.x;
      const oz = pz - o.position.z;
      const d2 = ox * ox + oz * oz;
      if (d2 < 1e-6) continue;
      // Bigger sheep need more room: scale the separation by both sizes (normal + normal = 1×).
      // Grazing sheep spread out more.
      const graze = s.mode === 'graze' && o.mode === 'graze' ? SHEEP.grazeSpacing : 1;
      const sep = (SHEEP.separationRadius * graze * (t.scale + o.type.scale)) / 2.3;
      if (d2 < sep * sep) {
        const d = Math.sqrt(d2);
        const push = (1 - d / sep) * SHEEP.separation;
        dx += (ox / d) * push;
        dz += (oz / d) * push;
      }
      if (d2 < NEIGH2) {
        ax += o.velocity.x;
        az += o.velocity.z;
        count++;
      }
      if (o.type.attract && d2 < o.type.attractRadius ** 2) {
        const d = Math.sqrt(d2);
        nearRam = true;
        if (d > sep) {
          dx -= (ox / d) * o.type.attract;
          dz -= (oz / d) * o.type.attract;
        }
      }
    }
    if (count) {
      dx += (ax / count) * SHEEP.alignment;
      dz += (az / count) * SHEEP.alignment;
    }

    // Gentle pull toward the flock, firm pull back once too far from the shepherd.
    const cx = center.x - px;
    const cz = center.z - pz;
    const cd = Math.hypot(cx, cz);
    if (cd > 1e-3) {
      const pull = Math.min(cd / radius, 1) * (s.orphan ? 0 : t.cohesion) * cohesionScale;
      dx += (cx / cd) * pull;
      dz += (cz / cd) * pull;
    }
    const hx = home.x - px;
    const hz = home.z - pz;
    const hd = Math.hypot(hx, hz);
    if (hd > radius) {
      const pull = (hd - radius) * (s.orphan ? LAMB.orphanBoundary : t.boundary) * (0.5 + 0.5 * cohesionScale);
      dx += (hx / hd) * pull;
      dz += (hz / hd) * pull;
    } else if (hd < 1.6 && hd > 1e-3) {
      const push = (1.6 - hd) * 3; // don't trample the shepherd
      dx -= (hx / hd) * push;
      dz -= (hz / hd) * push;
    }
    for (const sc of ctx.scarecrows) {
      const sx = px - sc.position.x;
      const sz = pz - sc.position.z;
      const sd = Math.hypot(sx, sz);
      if (sd < 1.3 && sd > 1e-3) {
        dx += (sx / sd) * (1.3 - sd) * 3;
        dz += (sz / sd) * (1.3 - sd) * 3;
      }
    }

    // Wanderers that stray well past the flock get a "?".
    if (s.kind === 'wanderer') {
      if (!s.strayed && hd > baseRadius * 1.25) {
        s.strayed = true;
        ctx.onSheepStray?.(s);
      } else if (s.strayed && hd < baseRadius) s.strayed = false;
    }

    // Fear: the dog nudges, wolves scatter.
    let fear = 0;
    const ddx = px - dog.position.x;
    const ddz = pz - dog.position.z;
    const dd = Math.hypot(ddx, ddz) || 1e-3;
    // A running dog bowling through the flock bounces sheep out of its way.
    s.bumpCooldown -= dt;
    if (dog.speed > BUMP.minSpeed && dd < BUMP.radius * t.scale && s.bumpCooldown <= 0) {
      // Shove sideways, away from the line the dog is running along.
      const vx = dog.velocity.x / dog.speed;
      const vz = dog.velocity.z / dog.speed;
      const side = Math.sign(ddx * vz - ddz * vx) || 1;
      s.velocity.x += vz * side * BUMP.push;
      s.velocity.z += -vx * side * BUMP.push;
      s.bump = 1;
      s.bumpSide = side;
      s.bumpCooldown = BUMP.cooldown;
      ctx.onSheepBump?.(s);
    }

    // Unease builds while the dog sits still nearby, widening the distance the sheep keep.
    const dogFearRadius = t.dogFearRadius * reach;
    const parked = dog.speed < SHEEP.pressureSpeed && dd < dogFearRadius * SHEEP.pressureRange;
    s.pressure = Math.max(0, Math.min(1, (s.pressure ?? 0) + (parked ? dt : -dt * 0.5) / SHEEP.pressureTime));
    const fearRadius = dogFearRadius * (1 + (SHEEP.pressureMax - 1) * s.pressure);
    if (dd < fearRadius) {
      const k = 1 - dd / fearRadius;
      dx += (ddx / dd) * k * t.dogFear;
      dz += (ddz / dd) * k * t.dogFear;
      fear = k * 0.4;
      s.wanderAngle = Math.atan2(ddx, ddz); // walk on away from the dog: that's what makes herding work
    }
    const panic = t.panic * mods.panic * (nearRam && !t.attract ? RAM_CALM : 1);
    s.wolfNear = false;
    for (const w of wolves) {
      const wx = px - w.position.x;
      const wz = pz - w.position.z;
      const wd = Math.hypot(wx, wz) || 1e-3;
      if (wd < SHEEP.wolfFearRadius) {
        const k = 1 - wd / SHEEP.wolfFearRadius;
        dx += (wx / wd) * k * SHEEP.wolfFear * panic;
        dz += (wz / wd) * k * SHEEP.wolfFear * panic;
        fear = Math.max(fear, k * 1.5 * panic);
        s.wolfNear = true;
      }
    }

    // Stay inside the meadow.
    const r = Math.hypot(px, pz);
    const edge = WORLD.playRadius - 1;
    if (r > edge) {
      const k = (r - edge) * 2;
      dx -= (px / r) * k;
      dz -= (pz / r) * k;
    }

    // Stampede: the black sheep charges in a straight line; its followers run after it.
    let stampeding = true;
    if (s.stampede > 0) {
      dx = s.stampedeDir.x * BLACK.speed;
      dz = s.stampedeDir.z * BLACK.speed;
    } else if (s.windup > 0) {
      dx = dz = 0; // stamping on the spot
    } else if (s.leader) {
      const l = s.leader;
      const lx = l.position.x - px;
      const lz = l.position.z - pz;
      const ld = Math.hypot(lx, lz) || 1e-3;
      const pull = Math.min(ld, 4) * 1.2;
      dx = dx * 0.3 + l.stampedeDir.x * BLACK.speed * 0.9 + (lx / ld) * pull;
      dz = dz * 0.3 + l.stampedeDir.z * BLACK.speed * 0.9 + (lz / ld) * pull;
      fear = Math.max(fear, 0.6);
    } else stampeding = false;

    const wasCalm = s.fear < 0.5;
    s.fear = Math.min(1, Math.max(fear, s.fear - dt * SHEEP.calmRate));
    if (s.fear > 0.5) s.stress += dt; // too much panic costs the calm bonus at shearing time
    if (wasCalm && s.fear >= 0.5) ctx.onSheepPanic?.(s);

    const calmMax = walkSpeed * 1.6;
    const maxSpeed = stampeding ? BLACK.speed * 1.2 : calmMax + Math.max(0, t.panicSpeed - calmMax) * s.fear;
    const dl = Math.hypot(dx, dz);
    if (dl > maxSpeed) {
      dx *= maxSpeed / dl;
      dz *= maxSpeed / dl;
    }
    const resp = 1 - Math.exp(-(2.5 + s.fear * 5) * dt);
    s.velocity.x += (dx - s.velocity.x) * resp;
    s.velocity.z += (dz - s.velocity.z) * resp;
    s.position.x += s.velocity.x * dt;
    s.position.z += s.velocity.z * dt;

    s.faceVelocity(4 + s.fear * 6, dt, 0.25);
    if (dd < 8) s.lookYaw = Math.max(-1.1, Math.min(1.1, angleTo(s.heading, Math.atan2(-ddx, -ddz))));
  }
}

import { WOLF, WORLD } from './config.js';

// Wolf states:
//   WANDER   prowl along the edge of the meadow
//   APPROACH pick a sheep and trot toward it, sidestepping the dog
//   CHASE    close enough: commit and sprint
//   ATTACK   holding a sheep; the dog has `grabTime` seconds to save it
//   FLEE     scared by the dog: freeze for a beat, then bolt away
//   LEAVE    run off the map (after a catch, or when the wave ends)

const THREATENING = new Set(['APPROACH', 'CHASE', 'ATTACK']);

export function toWander(w, ctx) {
  const cfg = ctx.cfg;
  w.state = 'WANDER';
  w.target = null;
  w.orbitDir = Math.random() < 0.5 ? -1 : 1;
  w.stateTimer = cfg ? cfg.stalkMin + Math.random() * (cfg.stalkMax - cfg.stalkMin) : 4;
}

export function isThreatening(w) {
  return THREATENING.has(w.state);
}

function pickTarget(w, ctx) {
  let best = null;
  let bestScore = Infinity;
  for (const s of ctx.sheep) {
    if (s.grabbedBy) continue;
    const d = w.position.distanceTo(s.position);
    const straggle = s.position.distanceTo(ctx.center);
    const score = d - straggle * WOLF.stragglerBias + Math.random() * 2;
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

function scare(w, ctx, ddx, ddz, dd) {
  const threatening = isThreatening(w);
  if (w.state === 'ATTACK' && w.target) {
    const s = w.target;
    s.grabbedBy = null;
    s.fear = 1;
    ctx.onSheepSaved(s, w);
  }
  w.target = null;
  w.state = 'FLEE';
  w.pause = WOLF.scarePause;
  w.stateTimer = ctx.dog.stats.fleeTime;

  // Run away from the dog, biased outward so it doesn't bolt through the flock.
  const px = w.position.x;
  const pz = w.position.z;
  const r = Math.hypot(px, pz) || 1;
  const fx = ddx / dd + (px / r) * 0.9;
  const fz = ddz / dd + (pz / r) * 0.9;
  const fl = Math.hypot(fx, fz) || 1;
  w.fleeDir.set(fx / fl, 0, fz / fl);
  ctx.onWolfScared(w, threatening);
}

export function updateWolves(wolves, ctx, dt) {
  const { dog, cfg } = ctx;
  const speedScale = cfg ? cfg.wolfSpeed : 1;

  for (const w of wolves) {
    const px = w.position.x;
    const pz = w.position.z;
    const ddx = px - dog.position.x;
    const ddz = pz - dog.position.z;
    const dd = Math.hypot(ddx, ddz) || 1e-3;
    let vx = 0;
    let vz = 0;
    let snap = false; // stop dead instead of easing

    // The dog's threat radius beats everything else.
    if (w.state !== 'FLEE' && w.state !== 'LEAVE' && dd < dog.stats.threatRadius) scare(w, ctx, ddx, ddz, dd);

    switch (w.state) {
      case 'WANDER': {
        w.stateTimer -= dt;
        const r = Math.hypot(px, pz) || 1;
        const ox = px / r;
        const oz = pz / r;
        vx = -oz * w.orbitDir * WOLF.wanderSpeed;
        vz = ox * w.orbitDir * WOLF.wanderSpeed;
        const radial = (WORLD.lurkRadius - r) * 1.2;
        vx += ox * radial;
        vz += oz * radial;
        const vl = Math.hypot(vx, vz);
        const max = WOLF.approachSpeed * speedScale;
        if (vl > max) {
          vx *= max / vl;
          vz *= max / vl;
        }
        if (w.stateTimer <= 0 && ctx.huntingAllowed && ctx.sheep.length) {
          w.state = 'APPROACH';
          w.retarget = 0;
        }
        break;
      }

      case 'APPROACH': {
        w.retarget -= dt;
        if (!w.target || !w.target.alive || w.target.grabbedBy || w.retarget <= 0) {
          w.target = pickTarget(w, ctx);
          w.retarget = 1.5;
        }
        if (!w.target) {
          toWander(w, ctx);
          break;
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

      case 'CHASE': {
        const s = w.target;
        if (!s || !s.alive || s.grabbedBy) {
          w.state = 'APPROACH';
          w.retarget = 0;
          break;
        }
        const tx = s.position.x - px;
        const tz = s.position.z - pz;
        const td = Math.hypot(tx, tz) || 1e-3;
        vx = (tx / td) * WOLF.chaseSpeed * speedScale;
        vz = (tz / td) * WOLF.chaseSpeed * speedScale;
        if (td < WOLF.grabDistance) {
          w.state = 'ATTACK';
          w.stateTimer = WOLF.grabTime;
          s.grabbedBy = w;
          ctx.onSheepGrabbed(s, w);
        } else if (td > WOLF.chaseDistance * 1.8) {
          w.state = 'APPROACH';
        }
        break;
      }

      case 'ATTACK': {
        const s = w.target;
        if (!s || !s.alive || s.grabbedBy !== w) {
          w.state = 'APPROACH';
          w.retarget = 0;
          break;
        }
        snap = true;
        w.turnToward(Math.atan2(s.position.x - px, s.position.z - pz), 10, dt);
        w.stateTimer -= dt;
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
        vx = w.fleeDir.x * WOLF.fleeSpeed;
        vz = w.fleeDir.z * WOLF.fleeSpeed;
        if (w.stateTimer <= 0) {
          if (ctx.huntingAllowed) toWander(w, ctx);
          else w.state = 'LEAVE';
        }
        break;
      }

      case 'LEAVE': {
        const r = Math.hypot(px, pz) || 1;
        vx = (px / r) * WOLF.fleeSpeed * 0.8;
        vz = (pz / r) * WOLF.fleeSpeed * 0.8;
        if (r > WORLD.spawnRadius) {
          if (ctx.huntingAllowed) toWander(w, ctx);
          else w.gone = true;
        }
        break;
      }
    }

    // Keep a little space between wolves.
    if (!snap) {
      for (const o of wolves) {
        if (o === w) continue;
        const ox = px - o.position.x;
        const oz = pz - o.position.z;
        const d = Math.hypot(ox, oz);
        if (d < 1.8 && d > 1e-3) {
          vx += (ox / d) * (1.8 - d) * 3;
          vz += (oz / d) * (1.8 - d) * 3;
        }
      }
    }

    if (snap) w.velocity.set(0, 0, 0);
    else {
      const resp = 1 - Math.exp(-6 * dt);
      w.velocity.x += (vx - w.velocity.x) * resp;
      w.velocity.z += (vz - w.velocity.z) * resp;
      w.faceVelocity(9, dt, 0.3);
    }
    w.position.x += w.velocity.x * dt;
    w.position.z += w.velocity.z * dt;
  }
}

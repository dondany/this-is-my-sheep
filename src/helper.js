import { HELPER, SHEEP } from './config.js';
import { isThreatening } from './wolves.js';

// The Second Dog upgrade: patrols a ring around the shepherd and runs at any wolf that threatens
// the flock, leaving the ones the player's dog is already closer to.
export function updateHelper(helper, ctx, dt, time) {
  const { dog, wolves, center, shepherd, sheep } = ctx;
  helper.think = (helper.think ?? 0) - dt;
  helper.rest = Math.max(0, (helper.rest ?? 0) - dt);
  if (helper.think <= 0) {
    helper.think = HELPER.thinkInterval;
    let best = null;
    let bestD = HELPER.reactRadius;
    for (const w of wolves) {
      if (!(isThreatening(w) || w.resisting || w.type.howler) || w.state === 'FLEE') continue;
      // Howlers stay at the edge, so they count as just inside the reaction radius.
      const toFlock = w.type.howler ? HELPER.reactRadius - 0.01 : w.position.distanceTo(center);
      if (toFlock >= bestD) continue;
      if (dog.position.distanceTo(w.position) < helper.position.distanceTo(w.position) - 2) continue;
      bestD = toFlock;
      best = w;
    }
    if (best && !helper.rest) helper.setTarget(best.position);
    else {
      // Patrol: walk a slow circle around the shepherd.
      helper.patrol = (helper.patrol ?? 0) + HELPER.thinkInterval * 0.35;
      const r = HELPER.guardRadius + Math.sqrt(sheep.length) * SHEEP.flockRadiusPerSqrt * 0.6;
      helper.setTarget({ x: shepherd.position.x + Math.cos(helper.patrol) * r, z: shepherd.position.z + Math.sin(helper.patrol) * r });
    }
  }
  helper.alert = true; // never sits down on the job
  helper.update(dt, time);
}

import { SHEEP, WORLD, RAM_CALM } from './config.js';
import { angleTo } from './entities.js';

const NEIGH2 = SHEEP.neighbourRadius ** 2;

const between = ([min, max]) => min + Math.random() * (max - min);

export function flockCenter(sheep, out) {
  out.set(0, 0, 0);
  if (!sheep.length) return out;
  for (const s of sheep) out.add(s.position);
  return out.divideScalar(sheep.length);
}

// Each sheep sums a few simple steering urges into a desired velocity and eases toward it:
// wander + separation + alignment + cohesion + boundary + ram pull + fear of dog + fear of wolves.
// How strong each urge is depends on the sheep's type (SHEEP_TYPES in config.js).
export function updateFlock(sheep, ctx, dt) {
  const { dog, wolves, shepherd, center } = ctx;
  const n = sheep.length;
  const baseRadius = SHEEP.flockRadius + Math.sqrt(n) * SHEEP.flockRadiusPerSqrt;
  const home = shepherd.position;

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
      dx += Math.sin(s.wanderAngle) * t.walkSpeed;
      dz += Math.cos(s.wanderAngle) * t.walkSpeed;
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
      const sep = (SHEEP.separationRadius * (t.scale + o.type.scale)) / 2.3;
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
      const pull = Math.min(cd / radius, 1) * t.cohesion;
      dx += (cx / cd) * pull;
      dz += (cz / cd) * pull;
    }
    const hx = home.x - px;
    const hz = home.z - pz;
    const hd = Math.hypot(hx, hz);
    if (hd > radius) {
      const pull = (hd - radius) * t.boundary;
      dx += (hx / hd) * pull;
      dz += (hz / hd) * pull;
    } else if (hd < 1.6 && hd > 1e-3) {
      const push = (1.6 - hd) * 3; // don't trample the shepherd
      dx -= (hx / hd) * push;
      dz -= (hz / hd) * push;
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
    if (dd < t.dogFearRadius) {
      const k = 1 - dd / t.dogFearRadius;
      dx += (ddx / dd) * k * t.dogFear;
      dz += (ddz / dd) * k * t.dogFear;
      fear = k * 0.4;
    }
    const panic = t.panic * (nearRam && !t.attract ? RAM_CALM : 1);
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

    const wasCalm = s.fear < 0.5;
    s.fear = Math.min(1, Math.max(fear, s.fear - dt * SHEEP.calmRate));
    if (wasCalm && s.fear >= 0.5) ctx.onSheepPanic?.(s);

    const calmMax = t.walkSpeed * 1.6;
    const maxSpeed = calmMax + Math.max(0, t.panicSpeed - calmMax) * s.fear;
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

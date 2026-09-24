import * as THREE from 'three';
import { COLORS } from './config.js';

const MAX = 1500;
const color = new THREE.Color();

const vertexShader = /* glsl */ `
  attribute float size;
  attribute float alpha;
  attribute vec3 tint;
  uniform float uScale;
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    vAlpha = alpha;
    vTint = tint;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vTint, vAlpha * smoothstep(0.5, 0.38, d));
    #include <colorspace_fragment>
  }
`;

// One shared Points object for every particle in the game. Live particles are packed
// at the front of the arrays; dead ones are swapped with the last live one.
export class ParticleSystem {
  constructor(scene) {
    this.count = 0;
    this.pos = new Float32Array(MAX * 3);
    this.tint = new Float32Array(MAX * 3);
    this.size = new Float32Array(MAX);
    this.alpha = new Float32Array(MAX);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.size0 = new Float32Array(MAX);
    this.size1 = new Float32Array(MAX);
    this.alpha0 = new Float32Array(MAX);
    this.gravity = new Float32Array(MAX);
    this.drag = new Float32Array(MAX);

    const geo = (this.geometry = new THREE.BufferGeometry());
    const attr = (name, array, itemSize) => {
      const a = new THREE.BufferAttribute(array, itemSize);
      a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, a);
    };
    attr('position', this.pos, 3);
    attr('tint', this.tint, 3);
    attr('size', this.size, 1);
    attr('alpha', this.alpha, 1);
    geo.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 500 } },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    scene.add(this.points);
  }

  // Makes `size` a world-space diameter for the current viewport and field of view.
  setViewport(heightPx, fovDeg) {
    this.material.uniforms.uScale.value = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
  }

  emit({
    position,
    count = 8,
    colors = [COLORS.dust],
    speed = 2,
    up = 1,
    spread = 0.3,
    life = 0.6,
    size = 0.5,
    endSize = size,
    gravity = 0,
    drag = 2,
    alpha = 1,
  }) {
    for (let k = 0; k < count && this.count < MAX; k++) {
      const i = this.count++;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.pos[i * 3] = position.x + (Math.random() - 0.5) * spread * 2;
      this.pos[i * 3 + 1] = Math.max(0.1, position.y + Math.random() * spread);
      this.pos[i * 3 + 2] = position.z + (Math.random() - 0.5) * spread * 2;
      this.vel[i * 3] = Math.cos(a) * s;
      this.vel[i * 3 + 1] = up * (0.5 + Math.random() * 0.5);
      this.vel[i * 3 + 2] = Math.sin(a) * s;
      color.setHex(colors[(Math.random() * colors.length) | 0]);
      this.tint[i * 3] = color.r;
      this.tint[i * 3 + 1] = color.g;
      this.tint[i * 3 + 2] = color.b;
      this.maxLife[i] = this.life[i] = life * (0.7 + Math.random() * 0.6);
      this.size0[i] = size * (0.7 + Math.random() * 0.6);
      this.size1[i] = endSize * (0.7 + Math.random() * 0.6);
      this.alpha0[i] = alpha;
      this.gravity[i] = gravity;
      this.drag[i] = drag;
      this.size[i] = 0;
      this.alpha[i] = 0;
    }
  }

  update(dt) {
    let i = 0;
    while (i < this.count) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.move(--this.count, i);
        continue;
      }
      const damping = Math.exp(-this.drag[i] * dt);
      const j = i * 3;
      this.vel[j] *= damping;
      this.vel[j + 1] = this.vel[j + 1] * damping - this.gravity[i] * dt;
      this.vel[j + 2] *= damping;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      if (this.pos[j + 1] < 0.05) {
        this.pos[j + 1] = 0.05;
        this.vel[j + 1] *= -0.3;
      }
      const t = 1 - this.life[i] / this.maxLife[i];
      this.size[i] = this.size0[i] + (this.size1[i] - this.size0[i]) * t;
      this.alpha[i] = this.alpha0[i] * Math.min(1, t * 10) * (1 - t) ** 1.5;
      i++;
    }
    const a = this.geometry.attributes;
    a.position.needsUpdate = a.tint.needsUpdate = a.size.needsUpdate = a.alpha.needsUpdate = true;
    this.geometry.setDrawRange(0, this.count);
  }

  move(from, to) {
    if (from === to) return;
    for (const arr of [this.pos, this.vel, this.tint]) {
      arr[to * 3] = arr[from * 3];
      arr[to * 3 + 1] = arr[from * 3 + 1];
      arr[to * 3 + 2] = arr[from * 3 + 2];
    }
    for (const arr of [this.size, this.alpha, this.life, this.maxLife, this.size0, this.size1, this.alpha0, this.gravity, this.drag]) {
      arr[to] = arr[from];
    }
  }

  // --- Presets -------------------------------------------------------------

  dust(position, count = 6, scale = 1) {
    this.emit({ position, count, colors: [COLORS.dust, 0xe6d3ad], speed: 1.5 * scale, up: 0.8, spread: 0.3, life: 0.7, size: 0.5 * scale, endSize: 1.3 * scale, drag: 3, alpha: 0.7 });
  }

  grass(position, count = 4) {
    this.emit({ position, count, colors: [COLORS.grass2, COLORS.grassDark, COLORS.grass], speed: 2, up: 3, spread: 0.2, life: 0.6, size: 0.18, endSize: 0.12, gravity: 9, drag: 1 });
  }

  sparkle(position, count = 8, colors = [0xfff3b0, 0xffffff, COLORS.ui]) {
    this.emit({ position, count, colors, speed: 3, up: 3, spread: 0.3, life: 0.6, size: 0.28, endSize: 0.05, gravity: 3, drag: 2 });
  }

  puff(position, count = 16) {
    this.emit({ position, count, colors: [COLORS.sheep, 0xffffff, 0xf4e8d0], speed: 3, up: 2, spread: 0.5, life: 0.9, size: 0.7, endSize: 1.4, drag: 3, alpha: 0.9 });
  }

  hit(position) {
    this.emit({ position, count: 10, colors: [COLORS.accent, COLORS.danger, 0xf2c14e], speed: 5, up: 3, spread: 0.3, life: 0.4, size: 0.4, endSize: 0.1, gravity: 4, drag: 3 });
  }

  confetti(position, count = 60) {
    this.emit({ position, count, colors: [COLORS.accent, 0xf2c14e, 0xe8a0b4, 0x8dba62, 0xfff7e6, 0x7fb3d5], speed: 7, up: 9, spread: 2, life: 2.2, size: 0.35, endSize: 0.3, gravity: 7, drag: 1.2 });
  }
}

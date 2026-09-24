import * as THREE from 'three';
import { COLORS, WORLD } from './config.js';
import { toon, toonGradient } from './materials.js';

const FOV = 36;
const PITCH = THREE.MathUtils.degToRad(58);
const SUN_OFFSET = new THREE.Vector3(-18, 36, 14);

// Cheap layered-sine "noise" for grass color variation.
function field(x, z) {
  return (
    Math.sin(x * 0.08 + Math.sin(z * 0.05) * 2) * 0.5 +
    Math.sin(z * 0.07 - x * 0.03) * 0.5 +
    Math.sin((x + z) * 0.23) * 0.25 +
    Math.sin(x * 0.51 - z * 0.37) * 0.12
  );
}

function patches(x, z) {
  return Math.sin(x * 0.19 + 1.3) * Math.sin(z * 0.17 - 0.7) + Math.sin(x * 0.41 + z * 0.33) * 0.3;
}

function createGround() {
  const geo = new THREE.PlaneGeometry(260, 260, 130, 130).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Color(COLORS.grass);
  const b = new THREE.Color(COLORS.grass2);
  const dark = new THREE.Color(COLORS.grassDark);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    c.copy(a).lerp(b, THREE.MathUtils.clamp(field(x, z) * 0.5 + 0.5, 0, 1));
    const p = patches(x, z);
    if (p > 0.55) c.lerp(dark, Math.min(1, (p - 0.55) * 3) * 0.6);
    c.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const ground = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient }));
  ground.receiveShadow = true;
  return ground;
}

function scatter(count, minR, maxR, fn) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    // sqrt keeps the distribution even over the area
    const r = Math.sqrt(minR * minR + Math.random() * (maxR * maxR - minR * minR));
    fn(Math.cos(a) * r, Math.sin(a) * r, i);
  }
}

function instanced(geometry, material, count, { shadow = false, receive = false } = {}) {
  const m = new THREE.InstancedMesh(geometry, material, count);
  m.castShadow = shadow;
  m.receiveShadow = receive;
  return m;
}

function createDecorations() {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const white = toon(0xffffff);

  // Trees ring the meadow; wolves emerge from between them.
  const TREES = 110;
  const trunks = instanced(new THREE.CylinderGeometry(0.22, 0.34, 1.8, 6).translate(0, 0.9, 0), toon(COLORS.trunk), TREES, { shadow: true });
  const leaves = instanced(new THREE.IcosahedronGeometry(1, 0), white, TREES * 2, { shadow: true });
  scatter(TREES, WORLD.lurkRadius + 5, 80, (x, z, i) => {
    const s = 1 + Math.random() * 0.9;
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, Math.random() * Math.PI, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    for (let k = 0; k < 2; k++) {
      dummy.position.set(x + (Math.random() - 0.5) * 0.5 * s, (2.2 + k * 1.1) * s, z + (Math.random() - 0.5) * 0.5 * s);
      dummy.scale.setScalar((1.5 - k * 0.45) * s);
      dummy.rotation.set(Math.random(), Math.random() * 3, Math.random());
      dummy.updateMatrix();
      leaves.setMatrixAt(i * 2 + k, dummy.matrix);
      leaves.setColorAt(i * 2 + k, color.setHex(COLORS.leaves[(Math.random() * COLORS.leaves.length) | 0]));
    }
  });
  group.add(trunks, leaves);

  // Rocks near the edge.
  const ROCKS = 30;
  const rocks = instanced(new THREE.IcosahedronGeometry(1, 0), toon(COLORS.rock), ROCKS, { shadow: true });
  scatter(ROCKS, WORLD.playRadius + 2, 70, (x, z, i) => {
    dummy.position.set(x, 0.1, z);
    dummy.rotation.set(Math.random(), Math.random() * 3, Math.random());
    const s = 0.4 + Math.random() * 1.1;
    dummy.scale.set(s * 1.3, s * 0.7, s);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  });
  group.add(rocks);

  // Grass tufts and flowers are small enough to sprinkle over the play area.
  const TUFTS = 900;
  const tufts = instanced(new THREE.ConeGeometry(0.1, 0.5, 3).translate(0, 0.25, 0), white, TUFTS);
  scatter(TUFTS, 0, 75, (x, z, i) => {
    dummy.position.set(x, 0, z);
    dummy.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 3, (Math.random() - 0.5) * 0.5);
    dummy.scale.setScalar(0.6 + Math.random() * 0.8);
    dummy.updateMatrix();
    tufts.setMatrixAt(i, dummy.matrix);
    tufts.setColorAt(i, color.setHex(Math.random() < 0.5 ? COLORS.grassDark : COLORS.grass2));
  });
  group.add(tufts);

  const FLOWERS = 350;
  const flowers = instanced(new THREE.IcosahedronGeometry(0.1, 0), white, FLOWERS);
  scatter(FLOWERS, 0, 75, (x, z, i) => {
    dummy.position.set(x, 0.12, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(0.8 + Math.random() * 0.6);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    flowers.setColorAt(i, color.setHex(COLORS.flowers[(Math.random() * COLORS.flowers.length) | 0]));
  });
  group.add(flowers);

  return group;
}

export function createWorld(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.sky, 70, 140);

  const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 1, 300);

  scene.add(new THREE.HemisphereLight(0xfff2dc, 0x9bb06a, 1.3));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -34;
  sc.right = sc.top = 34;
  sc.near = 1;
  sc.far = 110;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  scene.add(createGround());
  scene.add(createDecorations());

  // Camera rig: looks down at ~58° from the +Z side and eases toward a focus point.
  const focus = new THREE.Vector3(0, 0, 0);
  let distance = 36;
  const updateCamera = (targetFocus, targetDistance, dt, shake) => {
    const k = 1 - Math.exp(-2.5 * dt);
    focus.lerp(targetFocus, k);
    distance += (targetDistance - distance) * k;
    camera.position.set(focus.x, Math.sin(PITCH) * distance, focus.z + Math.cos(PITCH) * distance).add(shake);
    camera.lookAt(focus.x + shake.x, shake.y, focus.z + shake.z);
    sun.position.copy(focus).add(SUN_OFFSET);
    sun.target.position.copy(focus);
  };

  const resizeHandlers = [];
  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    // Keep the meadow in view on tall (portrait) screens.
    camera.fov = camera.aspect < 1 ? FOV / Math.max(camera.aspect, 0.55) : FOV;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    for (const fn of resizeHandlers) fn();
  };
  window.addEventListener('resize', resize);

  return {
    renderer,
    scene,
    camera,
    updateCamera,
    onResize(fn) {
      resizeHandlers.push(fn);
      fn();
    },
  };
}

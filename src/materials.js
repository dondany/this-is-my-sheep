import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Three-step ramp gives the cel-shaded light/shadow bands.
export const toonGradient = (() => {
  const data = new Uint8Array([120, 195, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
})();

const materials = new Map();

// One shared material per color.
export function toon(color) {
  let mat = materials.get(color);
  if (!mat) {
    mat = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient });
    materials.set(color, mat);
  }
  return mat;
}

function woolBody() {
  const puffs = [
    [0, 0, 0, 0.62],
    [0, 0.22, 0.3, 0.45],
    [0, 0.22, -0.3, 0.45],
    [0.3, 0.05, 0.25, 0.38],
    [-0.3, 0.05, 0.25, 0.38],
    [0.3, 0.05, -0.25, 0.38],
    [-0.3, 0.05, -0.25, 0.38],
    [0, 0.32, 0, 0.42],
  ];
  return mergeGeometries(
    puffs.map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, 1).translate(x, y, z))
  );
}

// Unit-sized geometries shared by every mesh; meshes scale them into shape.
export const GEO = {
  sphere: new THREE.SphereGeometry(1, 14, 10),
  lowSphere: new THREE.IcosahedronGeometry(1, 1),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 4),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
  // Limbs hang down from their pivot, so rotation.x swings them like a hip joint.
  leg: new THREE.CylinderGeometry(1, 0.8, 1, 6).translate(0, -0.5, 0),
  boxLeg: new THREE.BoxGeometry(1, 1, 1).translate(0, -0.5, 0),
  tail: new THREE.ConeGeometry(1, 1, 5).rotateX(Math.PI).translate(0, -0.5, 0),
  woolBody: woolBody(),
};

export function mesh(geometry, color, { position, scale, rotation, shadow = false } = {}) {
  const m = new THREE.Mesh(geometry, toon(color));
  if (position) m.position.set(...position);
  if (typeof scale === 'number') m.scale.setScalar(scale);
  else if (scale) m.scale.set(...scale);
  if (rotation) m.rotation.set(...rotation);
  m.castShadow = shadow;
  return m;
}

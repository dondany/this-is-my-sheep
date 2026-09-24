import * as THREE from 'three';

// Mouse/touch → point on the ground plane (y = 0). Press sets a target; holding and dragging steers.
export class MouseController {
  constructor(element, camera, { onPress, onDrag }) {
    this.element = element;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.down = false;
    this.enabled = false;

    element.style.touchAction = 'none';
    element.addEventListener('contextmenu', (e) => e.preventDefault());
    element.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.down = true;
      element.setPointerCapture(e.pointerId);
      const p = this.pick(e);
      if (p && this.enabled) onPress(p);
    });
    element.addEventListener('pointermove', (e) => {
      if (!this.down || !this.enabled) return;
      const p = this.pick(e);
      if (p) onDrag(p);
    });
    const release = () => (this.down = false);
    element.addEventListener('pointerup', release);
    element.addEventListener('pointercancel', release);
  }

  pick(e) {
    const rect = this.element.getBoundingClientRect();
    this.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    return this.raycaster.ray.intersectPlane(this.plane, new THREE.Vector3());
  }
}

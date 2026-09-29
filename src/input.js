import * as THREE from 'three';

// Mouse/touch → point on the ground plane (y = 0). Press sets a target; holding and dragging steers.
// Wheel, trackpad pinch and two-finger pinch zoom; onZoom gets a distance multiplier (> 1 = zoom out).
export class MouseController {
  constructor(element, camera, { onPress, onDrag, onZoom }) {
    this.element = element;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.pointers = new Map();
    this.pinchDistance = 0;
    this.enabled = false;

    element.style.touchAction = 'none';
    element.addEventListener('contextmenu', (e) => e.preventDefault());

    element.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      element.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        this.pinchDistance = this.spread();
        return;
      }
      const p = this.pick(e);
      if (p && this.enabled) onPress(p);
    });

    element.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size >= 2) {
        const d = this.spread();
        if (this.pinchDistance > 0 && d > 0) onZoom(this.pinchDistance / d);
        this.pinchDistance = d;
        return;
      }
      if (!this.enabled) return;
      const p = this.pick(e);
      if (p) onDrag(p);
    });

    const release = (e) => {
      this.pointers.delete(e.pointerId);
      this.pinchDistance = 0;
    };
    element.addEventListener('pointerup', release);
    element.addEventListener('pointercancel', release);

    element.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const lines = e.deltaMode === 1 ? 16 : 1;
        // Trackpad pinch arrives as ctrl+wheel with small deltas.
        const sensitivity = e.ctrlKey ? 0.01 : 0.0015;
        onZoom(Math.exp(e.deltaY * lines * sensitivity));
      },
      { passive: false }
    );
  }

  spread() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  pick(e) {
    const rect = this.element.getBoundingClientRect();
    this.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    return this.raycaster.ray.intersectPlane(this.plane, new THREE.Vector3());
  }
}

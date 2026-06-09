import * as THREE from 'three';
import { randomInRange } from './utils';

interface Fragment {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export class SupernovaInstance {
  public position: THREE.Vector3;
  public startTime: number;
  public duration: number;
  public sphere: THREE.Mesh;
  public fragments: Fragment[] = [];
  public fragmentPoints: THREE.Points | null = null;
  public fragmentGeometry: THREE.BufferGeometry | null = null;
  public isComplete: boolean = false;
  private readonly EXPAND_DURATION = 0.3;
  private readonly FRAGMENT_DURATION = 2.0;
  private readonly FRAGMENT_COUNT = 100;

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.startTime = performance.now();
    this.duration = this.EXPAND_DURATION + this.FRAGMENT_DURATION;

    const sphereGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.sphere.position.copy(this.position);

    this.createFragments();
  }

  private createFragments(): void {
    const colors = [
      new THREE.Color('#FF4500'),
      new THREE.Color('#FF8C00'),
      new THREE.Color('#FFD700')
    ];

    const positions = new Float32Array(this.FRAGMENT_COUNT * 3);
    const colorsArray = new Float32Array(this.FRAGMENT_COUNT * 3);
    const sizes = new Float32Array(this.FRAGMENT_COUNT);

    for (let i = 0; i < this.FRAGMENT_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = randomInRange(0.2, 0.8);

      const velocity = new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta),
        speed * Math.cos(phi)
      );

      const colorT = Math.random();
      const colorIdx = Math.floor(colorT * (colors.length - 1));
      const nextColorIdx = Math.min(colorIdx + 1, colors.length - 1);
      const localT = (colorT * (colors.length - 1)) % 1;
      const color = colors[colorIdx].clone().lerp(colors[nextColorIdx], localT);

      this.fragments.push({
        position: this.position.clone(),
        velocity,
        color,
        size: randomInRange(0.03, 0.08),
        opacity: 1.0,
        life: this.FRAGMENT_DURATION,
        maxLife: this.FRAGMENT_DURATION
      });

      positions[i * 3] = this.position.x;
      positions[i * 3 + 1] = this.position.y;
      positions[i * 3 + 2] = this.position.z;

      colorsArray[i * 3] = color.r;
      colorsArray[i * 3 + 1] = color.g;
      colorsArray[i * 3 + 2] = color.b;

      sizes[i] = randomInRange(0.03, 0.08);
    }

    this.fragmentGeometry = new THREE.BufferGeometry();
    this.fragmentGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.fragmentGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

    const fragmentMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.fragmentPoints = new THREE.Points(this.fragmentGeometry, fragmentMaterial);
  }

  public update(time: number, deltaTime: number): void {
    const elapsed = (time - this.startTime) / 1000;

    if (elapsed < this.EXPAND_DURATION) {
      const t = elapsed / this.EXPAND_DURATION;
      const scale = 0.15 + t * (1.5 - 0.15);
      this.sphere.scale.setScalar(scale / 0.15);
      const mat = this.sphere.material as THREE.MeshBasicMaterial;
      mat.opacity = 1.0 - t * 0.3;
    } else {
      this.sphere.visible = false;
    }

    if (elapsed >= this.EXPAND_DURATION && this.fragmentPoints && this.fragmentGeometry) {
      const fragmentElapsed = elapsed - this.EXPAND_DURATION;
      const positions = this.fragmentGeometry.attributes.position.array as Float32Array;

      for (let i = 0; i < this.fragments.length; i++) {
        const frag = this.fragments[i];
        frag.position.add(frag.velocity.clone().multiplyScalar(deltaTime));
        frag.life -= deltaTime;
        frag.opacity = Math.max(0, frag.life / frag.maxLife);

        positions[i * 3] = frag.position.x;
        positions[i * 3 + 1] = frag.position.y;
        positions[i * 3 + 2] = frag.position.z;
      }

      (this.fragmentGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.fragmentPoints.material as THREE.PointsMaterial).opacity = 1.0;

      if (fragmentElapsed >= this.FRAGMENT_DURATION) {
        this.isComplete = true;
      }
    }
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.sphere);
    if (this.fragmentPoints) {
      scene.add(this.fragmentPoints);
    }
  }

  public removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.sphere);
    if (this.fragmentPoints) {
      scene.remove(this.fragmentPoints);
    }
    if (this.fragmentGeometry) {
      this.fragmentGeometry.dispose();
    }
    this.sphere.geometry.dispose();
    (this.sphere.material as THREE.Material).dispose();
  }

  public getFragmentsVisible(): boolean {
    const elapsed = (performance.now() - this.startTime) / 1000;
    return elapsed >= this.EXPAND_DURATION;
  }
}

export class SupernovaManager {
  public instances: SupernovaInstance[] = [];
  public count: number = 0;
  public lastPosition: THREE.Vector3 | null = null;

  public trigger(position: THREE.Vector3, scene: THREE.Scene): SupernovaInstance {
    const instance = new SupernovaInstance(position);
    instance.addToScene(scene);
    this.instances.push(instance);
    this.count++;
    this.lastPosition = position.clone();
    return instance;
  }

  public update(time: number, deltaTime: number, scene: THREE.Scene): void {
    for (let i = this.instances.length - 1; i >= 0; i--) {
      const instance = this.instances[i];
      instance.update(time, deltaTime);

      if (instance.isComplete) {
        instance.removeFromScene(scene);
        this.instances.splice(i, 1);
      }
    }
  }
}

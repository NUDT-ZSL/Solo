import * as THREE from 'three';

const OCEAN_SIZE = 150;
const OCEAN_SEGMENTS = 80;
const FOAM_COUNT = 800;

export class OceanScene {
  private oceanMesh: THREE.Mesh;
  private oceanGeometry: THREE.PlaneGeometry;
  private moonLight: THREE.DirectionalLight;
  private moonMesh: THREE.Mesh;
  private foamParticles: THREE.Points;
  private foamPositions: Float32Array;
  private foamVelocities: Float32Array;
  private scene: THREE.Scene;
  private rippleRings: {
    mesh: THREE.Mesh;
    age: number;
    maxAge: number;
  }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.oceanGeometry = new THREE.PlaneGeometry(
      OCEAN_SIZE,
      OCEAN_SIZE,
      OCEAN_SEGMENTS,
      OCEAN_SEGMENTS
    );
    this.oceanGeometry.rotateX(-Math.PI / 2);

    const oceanMaterial = new THREE.MeshPhongMaterial({
      color: 0x0a2a4a,
      specular: 0x4488aa,
      shininess: 80,
      transparent: true,
      opacity: 0.85,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    this.oceanMesh = new THREE.Mesh(this.oceanGeometry, oceanMaterial);
    scene.add(this.oceanMesh);

    const moonGeometry = new THREE.SphereGeometry(3, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xeeeeff });
    this.moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    this.moonMesh.position.set(20, 60, -30);
    scene.add(this.moonMesh);

    this.moonLight = new THREE.DirectionalLight(0x8899cc, 1.5);
    this.moonLight.position.copy(this.moonMesh.position);
    scene.add(this.moonLight);

    const ambientLight = new THREE.AmbientLight(0x1a1a3e, 0.5);
    scene.add(ambientLight);

    this.foamPositions = new Float32Array(FOAM_COUNT * 3);
    this.foamVelocities = new Float32Array(FOAM_COUNT * 3);
    for (let i = 0; i < FOAM_COUNT; i++) {
      this.foamPositions[i * 3] = (Math.random() - 0.5) * OCEAN_SIZE;
      this.foamPositions[i * 3 + 1] = Math.random() * 0.5 + 0.1;
      this.foamPositions[i * 3 + 2] = (Math.random() - 0.5) * OCEAN_SIZE;
      this.foamVelocities[i * 3] = (Math.random() - 0.5) * 0.02;
      this.foamVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      this.foamVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    const foamGeometry = new THREE.BufferGeometry();
    foamGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.foamPositions, 3)
    );
    const foamMaterial = new THREE.PointsMaterial({
      color: 0xaaddff,
      size: 0.3,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.foamParticles = new THREE.Points(foamGeometry, foamMaterial);
    scene.add(this.foamParticles);
  }

  getWaveHeight(x: number, z: number, elapsed: number, tideSpeed: number): number {
    const t = elapsed * tideSpeed;
    return (
      Math.sin(x * 0.1 + t * 0.5) * 1.5 +
      Math.sin(z * 0.08 + t * 0.3) * 1.2 +
      Math.sin((x + z) * 0.05 + t * 0.7) * 0.8 +
      Math.sin(x * 0.2 - t * 0.4) * 0.5
    );
  }

  update(elapsed: number, delta: number, tideSpeed: number) {
    const positions = this.oceanGeometry.attributes.position as THREE.BufferAttribute;
    const t = elapsed * tideSpeed;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = this.getWaveHeight(x, z, elapsed, tideSpeed);
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
    this.oceanGeometry.computeVertexNormals();

    for (let i = 0; i < FOAM_COUNT; i++) {
      const i3 = i * 3;
      this.foamPositions[i3] += this.foamVelocities[i3];
      this.foamPositions[i3 + 1] += Math.sin(elapsed + i) * 0.002;
      this.foamPositions[i3 + 2] += this.foamVelocities[i3 + 2];
      if (Math.abs(this.foamPositions[i3]) > OCEAN_SIZE / 2)
        this.foamPositions[i3] = (Math.random() - 0.5) * OCEAN_SIZE;
      if (Math.abs(this.foamPositions[i3 + 2]) > OCEAN_SIZE / 2)
        this.foamPositions[i3 + 2] = (Math.random() - 0.5) * OCEAN_SIZE;
    }
    (
      this.foamParticles.geometry.attributes.position as THREE.BufferAttribute
    ).needsUpdate = true;

    for (let i = this.rippleRings.length - 1; i >= 0; i--) {
      const ring = this.rippleRings[i];
      ring.age += delta;
      if (ring.age >= ring.maxAge) {
        this.scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        (ring.mesh.material as THREE.Material).dispose();
        this.rippleRings.splice(i, 1);
        continue;
      }
      const progress = ring.age / ring.maxAge;
      const scale = 1 + progress * 15;
      ring.mesh.scale.set(scale, 1, scale);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity =
        (1 - progress) * 0.5;
    }
  }

  addRipple(x: number, z: number) {
    const ringGeometry = new THREE.RingGeometry(0.5, 0.8, 64);
    ringGeometry.rotateX(-Math.PI / 2);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(x, 1.5, z);
    this.scene.add(ring);
    this.rippleRings.push({ mesh: ring, age: 0, maxAge: 2.0 });
  }
}

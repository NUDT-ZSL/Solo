import * as THREE from 'three';

export class SceneManager {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildScene();
  }

  private buildScene(): void {
    this.createBackground();
    this.createStarfield();
    this.createCorridorRibs();
    this.createLights();
    this.scene.fog = new THREE.FogExp2(0x030010, 0.004);
  }

  private createBackground(): void {
    const geo = new THREE.SphereGeometry(200, 32, 32);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {},
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        void main() {
          float y = normalize(vWorldPos).y;
          vec3 spaceBlue = vec3(0.02, 0.02, 0.14);
          vec3 purpleBlack = vec3(0.06, 0.0, 0.1);
          vec3 col = mix(purpleBlack, spaceBlue, smoothstep(-1.0, 1.0, y));
          float dist = length(vWorldPos.xz) * 0.003;
          col *= 1.0 - dist * 0.3;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  private createStarfield(): void {
    const count = 6000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 120 + Math.random() * 80;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xaaaacc,
      size: 0.25,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.scene.add(new THREE.Points(geo, mat));
  }

  private createCorridorRibs(): void {
    const hw = 10;
    const hh = 7;
    const spacing = 8;
    const numRibs = 25;
    const startZ = -80;
    const verts: number[] = [];

    for (let i = 0; i < numRibs; i++) {
      const z = startZ + i * spacing;
      verts.push(-hw, -hh, z, hw, -hh, z);
      verts.push(hw, -hh, z, hw, hh, z);
      verts.push(hw, hh, z, -hw, hh, z);
      verts.push(-hw, hh, z, -hw, -hh, z);
    }

    const endZ = startZ + (numRibs - 1) * spacing;
    verts.push(-hw, -hh, startZ, -hw, -hh, endZ);
    verts.push(hw, -hh, startZ, hw, -hh, endZ);
    verts.push(hw, hh, startZ, hw, hh, endZ);
    verts.push(-hw, hh, startZ, -hw, hh, endZ);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(verts, 3)
    );
    const mat = new THREE.LineBasicMaterial({
      color: 0x1a1a4e,
      transparent: true,
      opacity: 0.25,
    });
    this.scene.add(new THREE.LineSegments(geo, mat));
  }

  private createLights(): void {
    this.scene.add(new THREE.AmbientLight(0x111133, 0.4));

    const p1 = new THREE.PointLight(0x3344aa, 0.6, 80);
    p1.position.set(0, 5, -20);
    this.scene.add(p1);

    const p2 = new THREE.PointLight(0x5533aa, 0.5, 80);
    p2.position.set(0, -3, 20);
    this.scene.add(p2);

    const p3 = new THREE.PointLight(0x223366, 0.4, 100);
    p3.position.set(0, 0, -50);
    this.scene.add(p3);
  }
}

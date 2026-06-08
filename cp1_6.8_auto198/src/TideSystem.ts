import * as THREE from 'three';
import shaderSource from './card.shader?raw';

const MAX_CLICK_POINTS = 5;

export class TideSystem {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  private clickPoints: { position: THREE.Vector3; time: number }[] = [];

  constructor() {
    const parts = shaderSource.split('// ===FRAGMENT===');
    const vertexShader = parts[0].replace('// ===VERTEX===\n', '').trim();
    const fragmentShader = parts[1].trim();

    const geometry = new THREE.PlaneGeometry(200, 200, 200, 200);
    geometry.rotateX(-Math.PI / 2);

    const clickUniforms: THREE.Vector4[] = [];
    for (let i = 0; i < MAX_CLICK_POINTS; i++) {
      clickUniforms.push(new THREE.Vector4(0, 0, 0, -100));
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uTideSpeed: { value: 1.0 },
        uClickPoints: { value: clickUniforms },
        uClickCount: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  addClickPoint(position: THREE.Vector3, time: number): void {
    this.clickPoints.push({ position: position.clone(), time });
    if (this.clickPoints.length > MAX_CLICK_POINTS) {
      this.clickPoints.shift();
    }
    this.syncClickUniforms();
  }

  private syncClickUniforms(): void {
    const arr = this.material.uniforms.uClickPoints.value as THREE.Vector4[];
    for (let i = 0; i < MAX_CLICK_POINTS; i++) {
      if (i < this.clickPoints.length) {
        const cp = this.clickPoints[i];
        arr[i].set(cp.position.x, cp.position.y, cp.position.z, cp.time);
      } else {
        arr[i].set(0, 0, 0, -100);
      }
    }
    this.material.uniforms.uClickCount.value = this.clickPoints.length;
  }

  update(time: number): void {
    this.material.uniforms.uTime.value = time;
  }

  setTideSpeed(speed: number): void {
    this.material.uniforms.uTideSpeed.value = speed;
  }
}

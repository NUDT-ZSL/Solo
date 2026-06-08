import * as THREE from 'three';
import { randomRange, randomSphere, easeOutCubic, clamp } from './utils';

interface ParticleBurst {
  mesh: THREE.Points;
  positions: Float32Array;
  velocities: THREE.Vector3[];
  ages: Float32Array;
  maxAge: number;
  spiralAxes: THREE.Vector3[];
  spiralSpeeds: Float32Array;
  baseColor: THREE.Color;
  count: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private bursts: ParticleBurst[] = [];
  private spreadSpeed: number = 1.0;
  private sharedGeo: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sharedGeo = new THREE.BufferGeometry();
  }

  setSpreadSpeed(speed: number): void {
    this.spreadSpeed = speed;
  }

  emit(positions: THREE.Vector3[], baseColor: THREE.Color, countPerPoint: number = 12): void {
    const totalParticles = positions.length * countPerPoint;
    if (totalParticles === 0) return;

    const posArr = new Float32Array(totalParticles * 3);
    const colorArr = new Float32Array(totalParticles * 3);
    const sizeArr = new Float32Array(totalParticles);
    const velocities: THREE.Vector3[] = [];
    const ages = new Float32Array(totalParticles);
    const spiralAxes: THREE.Vector3[] = [];
    const spiralSpeeds = new Float32Array(totalParticles);

    let idx = 0;
    for (const pos of positions) {
      for (let i = 0; i < countPerPoint; i++) {
        const pi = idx * 3;
        posArr[pi] = pos.x;
        posArr[pi + 1] = pos.y;
        posArr[pi + 2] = pos.z;

        const vel = randomSphere(1.0).normalize().multiplyScalar(randomRange(0.5, 2.5));
        velocities.push(vel);

        const hueShift = randomRange(-0.1, 0.1);
        const c = baseColor.clone();
        c.offsetHSL(hueShift, 0, randomRange(-0.1, 0.1));
        colorArr[pi] = c.r;
        colorArr[pi + 1] = c.g;
        colorArr[pi + 2] = c.b;

        sizeArr[idx] = randomRange(2.0, 5.0);
        ages[idx] = 0;

        const axis = randomSphere(1.0).normalize();
        spiralAxes.push(axis);
        spiralSpeeds[idx] = randomRange(2.0, 6.0) * (Math.random() > 0.5 ? 1 : -1);

        idx++;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colorArr, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizeArr, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 aColor;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (200.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.1, 0.5, d);
          float glow = exp(-d * 4.0) * 0.5;
          vec3 col = vColor + glow;
          gl_FragColor = vec4(col, alpha * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.bursts.push({
      mesh: points,
      positions: posArr,
      velocities,
      ages,
      maxAge: 2.5,
      spiralAxes,
      spiralSpeeds,
      baseColor,
      count: totalParticles,
    });
  }

  update(delta: number): void {
    const toRemove: number[] = [];

    for (let b = 0; b < this.bursts.length; b++) {
      const burst = this.bursts[b];
      let allDead = true;

      for (let i = 0; i < burst.count; i++) {
        burst.ages[i] += delta;
        const age = burst.ages[i];
        const lifeT = clamp(age / burst.maxAge, 0, 1);

        if (lifeT < 1.0) {
          allDead = false;
          const pi = i * 3;

          const speed = burst.velocities[i].length() * this.spreadSpeed;
          const spiralAngle = burst.spiralSpeeds[i] * age;
          const spiralRadius = easeOutCubic(lifeT) * 1.5;
          const axis = burst.spiralAxes[i];

          const spiralOffset = new THREE.Vector3()
            .copy(axis)
            .applyAxisAngle(burst.velocities[i].clone().normalize(), spiralAngle)
            .multiplyScalar(spiralRadius);

          const radialOffset = burst.velocities[i].clone().normalize().multiplyScalar(
            speed * age * this.spreadSpeed
          );

          const pos = new THREE.Vector3(
            burst.positions[pi],
            burst.positions[pi + 1],
            burst.positions[pi + 2]
          ).add(radialOffset).add(spiralOffset);

          burst.positions[pi] = pos.x;
          burst.positions[pi + 1] = pos.y;
          burst.positions[pi + 2] = pos.z;
        }
      }

      const posAttr = burst.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      posAttr.array = burst.positions;
      posAttr.needsUpdate = true;

      const opacity = 1.0 - easeOutCubic(clamp(
        Math.max(...Array.from(burst.ages).slice(0, Math.min(burst.count, 20))) / burst.maxAge,
        0, 1
      ));
      (burst.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity = {
        value: opacity,
      };

      if (allDead) {
        toRemove.push(b);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const burst = this.bursts[toRemove[i]];
      this.scene.remove(burst.mesh);
      burst.mesh.geometry.dispose();
      (burst.mesh.material as THREE.Material).dispose();
      this.bursts.splice(toRemove[i], 1);
    }
  }

  clear(): void {
    for (const burst of this.bursts) {
      this.scene.remove(burst.mesh);
      burst.mesh.geometry.dispose();
      (burst.mesh.material as THREE.Material).dispose();
    }
    this.bursts = [];
  }
}

import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private ambientParticles: Particle[] = [];
  private ambientGeo: THREE.BufferGeometry;
  private ambientMat: THREE.PointsMaterial;
  private ambientPoints: THREE.Points;
  private pulseParticles: Particle[] = [];
  private pulseGeo: THREE.BufferGeometry;
  private pulseMat: THREE.PointsMaterial;
  private pulsePoints: THREE.Points;

  currentDensity: number = 1.0;
  targetDensity: number = 1.0;
  private densityLerp: number = 0;

  constructor(scene: THREE.Scene, maxParticles: number = 800) {
    this.maxParticles = maxParticles;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);

    const ambientCount = 300;
    for (let i = 0; i < ambientCount; i++) {
      this.ambientParticles.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          Math.random() * 16,
          (Math.random() - 0.5) * 14
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        life: Math.random() * 100,
        maxLife: 100,
        size: 0.03 + Math.random() * 0.04,
        color: new THREE.Color().setHSL(0.1 + Math.random() * 0.5, 0.7, 0.7),
      });
    }

    this.ambientGeo = new THREE.BufferGeometry();
    const aPos = new Float32Array(ambientCount * 3);
    const aCol = new Float32Array(ambientCount * 3);
    this.ambientGeo.setAttribute('position', new THREE.BufferAttribute(aPos, 3));
    this.ambientGeo.setAttribute('color', new THREE.BufferAttribute(aCol, 3));

    this.ambientMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.ambientPoints = new THREE.Points(this.ambientGeo, this.ambientMat);
    scene.add(this.ambientPoints);

    const pulseMax = 200;
    this.pulseGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pulseMax * 3);
    const pCol = new Float32Array(pulseMax * 3);
    this.pulseGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    this.pulseGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));

    this.pulseMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.pulsePoints = new THREE.Points(this.pulseGeo, this.pulseMat);
    scene.add(this.pulsePoints);
  }

  emitFromPoint(origin: THREE.Vector3, color: THREE.Color, count: number = 15) {
    for (let i = 0; i < count; i++) {
      if (this.pulseParticles.length >= 200) break;
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      const speed = 0.02 + Math.random() * 0.04;
      this.pulseParticles.push({
        position: origin.clone(),
        velocity: dir.multiplyScalar(speed),
        life: 1.0,
        maxLife: 1.0,
        size: 0.04 + Math.random() * 0.06,
        color: color.clone(),
      });
    }
  }

  update(time: number, flowSpeed: number, delta: number) {
    this.densityLerp += (this.targetDensity - this.currentDensity) * 0.05;
    this.currentDensity += this.densityLerp;
    this.densityLerp *= 0.9;

    const activeCount = Math.floor(this.maxParticles * this.currentDensity);
    while (this.particles.length < activeCount) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 4;
      const y = Math.random() * 15;
      this.particles.push({
        position: new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          0.01 + Math.random() * 0.02,
          (Math.random() - 0.5) * 0.01
        ),
        life: 1.0,
        maxLife: 1.0,
        size: 0.03 + Math.random() * 0.05,
        color: new THREE.Color().setHSL(0.1 + (y / 15) * 0.5, 0.8, 0.65),
      });
    }
    while (this.particles.length > activeCount) {
      this.particles.pop();
    }

    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        p.position.add(p.velocity.clone().multiplyScalar(flowSpeed));
        p.life -= 0.003 * flowSpeed;
        if (p.life <= 0 || p.position.y > 16) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * 4;
          p.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
          p.life = 1.0;
          p.color.setHSL(0.1, 0.8, 0.65);
        }
        const fade = Math.min(p.life * 3, 1.0);
        posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
        colAttr.setXYZ(i, p.color.r * fade, p.color.g * fade, p.color.b * fade);
      } else {
        posAttr.setXYZ(i, 0, -100, 0);
        colAttr.setXYZ(i, 0, 0, 0);
      }
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    const aPosAttr = this.ambientGeo.attributes.position as THREE.BufferAttribute;
    const aColAttr = this.ambientGeo.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < this.ambientParticles.length; i++) {
      const p = this.ambientParticles[i];
      p.position.add(p.velocity);
      p.life += 0.01;

      if (p.position.x > 7) p.position.x = -7;
      if (p.position.x < -7) p.position.x = 7;
      if (p.position.y > 16) p.position.y = 0;
      if (p.position.y < 0) p.position.y = 16;
      if (p.position.z > 7) p.position.z = -7;
      if (p.position.z < -7) p.position.z = 7;

      const flicker = 0.5 + 0.5 * Math.sin(p.life * 2 + i);
      aPosAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
      aColAttr.setXYZ(i, p.color.r * flicker, p.color.g * flicker, p.color.b * flicker);
    }
    aPosAttr.needsUpdate = true;
    aColAttr.needsUpdate = true;

    const pPosAttr = this.pulseGeo.attributes.position as THREE.BufferAttribute;
    const pColAttr = this.pulseGeo.attributes.color as THREE.BufferAttribute;

    for (let i = this.pulseParticles.length - 1; i >= 0; i--) {
      const p = this.pulseParticles[i];
      p.position.add(p.velocity);
      p.velocity.multiplyScalar(0.97);
      p.life -= 0.02;
      if (p.life <= 0) {
        this.pulseParticles.splice(i, 1);
      }
    }

    for (let i = 0; i < 200; i++) {
      if (i < this.pulseParticles.length) {
        const p = this.pulseParticles[i];
        const fade = Math.max(p.life, 0);
        pPosAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
        pColAttr.setXYZ(i, p.color.r * fade, p.color.g * fade, p.color.b * fade);
      } else {
        pPosAttr.setXYZ(i, 0, -100, 0);
        pColAttr.setXYZ(i, 0, 0, 0);
      }
    }
    pPosAttr.needsUpdate = true;
    pColAttr.needsUpdate = true;
  }
}

import * as THREE from 'three';

interface ClickEffect {
  ring: THREE.Mesh;
  particles: THREE.Points;
  startTime: number;
  origin: THREE.Vector3;
  particleVelocities: Float32Array;
}

export class BeamEffect {
  private scene: THREE.Scene;
  private beamGroup: THREE.Group;
  private beamMaterial: THREE.ShaderMaterial;
  private haloMaterial: THREE.ShaderMaterial;
  private dustParticles: THREE.Points;
  private dustMaterial: THREE.ShaderMaterial;
  private clickEffects: ClickEffect[] = [];
  private beamIntensity: number;
  private audioCtx: AudioContext | null = null;

  constructor(scene: THREE.Scene, beamIntensity: number) {
    this.scene = scene;
    this.beamIntensity = beamIntensity;
    this.beamGroup = new THREE.Group();

    this.beamMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        varying float vY;
        void main() {
          vUv = uv;
          vY = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        varying float vY;

        void main() {
          float gradient = smoothstep(-10.0, 30.0, vY);
          float pulse = 0.7 + sin(uTime * 0.8) * 0.15 + sin(uTime * 1.3) * 0.1;
          float edgeFade = 1.0 - abs(vUv.x - 0.5) * 2.0;
          edgeFade = pow(edgeFade, 0.5);
          float alpha = gradient * edgeFade * pulse * uIntensity * 0.25;

          vec3 colorTop = vec3(1.0, 0.95, 0.85);
          vec3 colorBot = vec3(0.7, 0.82, 1.0);
          vec3 color = mix(colorBot, colorTop, gradient);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: beamIntensity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const beamGeo = new THREE.CylinderGeometry(0.5, 4.0, 50, 32, 1, true);
    const beamMesh = new THREE.Mesh(beamGeo, this.beamMaterial);
    beamMesh.position.set(8, 15, 2);
    this.beamGroup.add(beamMesh);

    this.haloMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;

        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center);
          float ring = smoothstep(0.35, 0.38, dist) * smoothstep(0.42, 0.38, dist);
          float glow = exp(-dist * 5.0) * 0.3;
          float pulse = 0.8 + sin(uTime * 1.2) * 0.2;

          vec3 color = vec3(1.0, 0.92, 0.8) * ring + vec3(0.8, 0.85, 1.0) * glow;
          float alpha = (ring * 0.5 + glow) * pulse * uIntensity;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: beamIntensity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const haloGeo = new THREE.PlaneGeometry(20, 20);
    const haloMesh = new THREE.Mesh(haloGeo, this.haloMaterial);
    haloMesh.position.set(8, 20, 2);
    haloMesh.lookAt(8, 40, 2);
    this.beamGroup.add(haloMesh);

    const dustCount = 300;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);
    const dustPhases = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 5;
      dustPositions[i3] = 8 + Math.cos(angle) * r;
      dustPositions[i3 + 1] = Math.random() * 40 - 5;
      dustPositions[i3 + 2] = 2 + Math.sin(angle) * r;
      dustSizes[i] = Math.random() * 2 + 0.5;
      dustPhases[i] = Math.random() * Math.PI * 2;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1));
    dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(dustPhases, 1));

    this.dustMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        varying float vAlpha;

        void main() {
          vec3 pos = position;
          pos.y += sin(uTime * 0.4 + aPhase) * 0.5;
          pos.x += cos(uTime * 0.3 + aPhase * 1.5) * 0.3;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float sizeAtten = 200.0 / -mvPosition.z;
          gl_PointSize = aSize * sizeAtten;
          gl_PointSize = clamp(gl_PointSize, 0.5, 16.0);

          vAlpha = smoothstep(-5.0, 5.0, pos.y) * smoothstep(40.0, 20.0, pos.y);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha * 0.6;
          gl_FragColor = vec4(1.0, 0.95, 0.85, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.dustParticles = new THREE.Points(dustGeo, this.dustMaterial);
    this.beamGroup.add(this.dustParticles);

    this.beamGroup.rotation.y = 0.3;
    scene.add(this.beamGroup);
  }

  triggerClick(worldPos: THREE.Vector3) {
    const ringGeo = new THREE.RingGeometry(0.1, 0.5, 64);
    const ringMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform float uIntensity;
        varying vec2 vUv;

        void main() {
          float alpha = (1.0 - uProgress) * uIntensity;
          vec3 color = mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 0.95, 0.85), uProgress);
          gl_FragColor = vec4(color, alpha * 0.8);
        }
      `,
      uniforms: {
        uProgress: { value: 0 },
        uIntensity: { value: this.beamIntensity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(worldPos);
    ring.lookAt(worldPos.x, worldPos.y + 10, worldPos.z);
    this.scene.add(ring);

    const particleCount = 80;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    const pSizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      pPositions[i3] = worldPos.x + (Math.random() - 0.5) * 2;
      pPositions[i3 + 1] = worldPos.y;
      pPositions[i3 + 2] = worldPos.z + (Math.random() - 0.5) * 2;
      pSizes[i] = Math.random() * 3 + 1;

      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 2;
      velocities[i3] = Math.cos(angle) * spread;
      velocities[i3 + 1] = Math.random() * 8 + 4;
      velocities[i3 + 2] = Math.sin(angle) * spread;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));

    const pMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        varying float vAlpha;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float sizeAtten = 250.0 / -mvPosition.z;
          gl_PointSize = aSize * sizeAtten;
          gl_PointSize = clamp(gl_PointSize, 0.5, 32.0);
          vAlpha = 1.0;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * (1.0 - uProgress) * vAlpha;
          vec3 color = mix(vec3(1.0, 0.95, 0.85), vec3(0.85, 0.9, 1.0), uProgress);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uProgress: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(pGeo, pMat);
    this.scene.add(particles);

    this.clickEffects.push({
      ring,
      particles,
      startTime: performance.now() / 1000,
      origin: worldPos.clone(),
      particleVelocities: velocities,
    });

    this.playClickSound();
  }

  private playClickSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(440, now + 0.8);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now);
      osc2.frequency.exponentialRampToValueAtTime(660, now + 0.6);
      gain2.gain.setValueAtTime(0.08, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.9);

      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(220, now);
      osc3.frequency.exponentialRampToValueAtTime(110, now + 1.5);
      gain3.gain.setValueAtTime(0.06, now);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now);
      osc3.stop(now + 1.5);
    } catch (_e) {
      // audio context not available
    }
  }

  update(time: number) {
    this.beamMaterial.uniforms.uTime.value = time;
    this.haloMaterial.uniforms.uTime.value = time;
    this.dustMaterial.uniforms.uTime.value = time;

    this.beamGroup.rotation.y = 0.3 + Math.sin(time * 0.05) * 0.1;

    const toRemove: number[] = [];

    for (let i = 0; i < this.clickEffects.length; i++) {
      const effect = this.clickEffects[i];
      const elapsed = time - effect.startTime;
      const duration = 1.5;
      const progress = Math.min(elapsed / duration, 1.0);

      const scale = 1 + progress * 15;
      effect.ring.scale.set(scale, scale, scale);
      (effect.ring.material as THREE.ShaderMaterial).uniforms.uProgress.value = progress;

      (effect.particles.material as THREE.ShaderMaterial).uniforms.uProgress.value = progress;

      const posAttr = effect.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      const dt = 0.016;

      for (let j = 0; j < posArray.length / 3; j++) {
        const j3 = j * 3;
        posArray[j3] += effect.particleVelocities[j3] * dt;
        posArray[j3 + 1] += effect.particleVelocities[j3 + 1] * dt;
        posArray[j3 + 2] += effect.particleVelocities[j3 + 2] * dt;
        effect.particleVelocities[j3 + 1] -= 2.0 * dt;
      }
      posAttr.needsUpdate = true;

      if (progress >= 1.0) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const effect = this.clickEffects[idx];
      this.scene.remove(effect.ring);
      this.scene.remove(effect.particles);
      effect.ring.geometry.dispose();
      (effect.ring.material as THREE.ShaderMaterial).dispose();
      effect.particles.geometry.dispose();
      (effect.particles.material as THREE.ShaderMaterial).dispose();
      this.clickEffects.splice(idx, 1);
    }
  }

  setBeamIntensity(intensity: number) {
    this.beamIntensity = intensity;
    this.beamMaterial.uniforms.uIntensity.value = intensity;
    this.haloMaterial.uniforms.uIntensity.value = intensity;
  }
}

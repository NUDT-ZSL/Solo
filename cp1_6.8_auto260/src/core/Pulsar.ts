import * as THREE from 'three';

export interface PulsarOptions {
  radius?: number;
  rotationSpeed?: number;
  pulseFrequency?: number;
  beamWidth?: number;
}

export class Pulsar {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  ringMeshes: THREE.Mesh[];
  rotationSpeed: number;
  pulseFrequency: number;
  beamWidth: number;
  pulseTimer: number;
  pulseIntensity: number;
  onPulse?: () => void;

  private coreMat: THREE.ShaderMaterial;
  private glowMat: THREE.ShaderMaterial;
  private ringMats: THREE.ShaderMaterial[];

  constructor(opts: PulsarOptions = {}) {
    this.rotationSpeed = opts.rotationSpeed ?? 2.0;
    this.pulseFrequency = opts.pulseFrequency ?? 1.0;
    this.beamWidth = opts.beamWidth ?? 0.4;
    this.pulseTimer = 0;
    this.pulseIntensity = 0;
    this.ringMeshes = [];
    this.ringMats = [];

    this.group = new THREE.Group();

    this.coreMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPulse: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPulse;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          vec3 baseColor = mix(vec3(0.5, 0.3, 1.0), vec3(1.0, 1.0, 1.0), fresnel);
          float lat = asin(clamp(vPosition.y / 1.0, -1.0, 1.0));
          float speedLine = smoothstep(0.02, 0.0, abs(fract(lat * 6.0 + uTime * 2.0) - 0.5) - 0.45);
          vec3 color = mix(baseColor, vec3(0.7, 0.5, 1.0), speedLine * 0.6);
          color += vec3(0.3, 0.2, 0.8) * uPulse;
          float brightness = 1.0 + uPulse * 1.5;
          gl_FragColor = vec4(color * brightness, 1.0);
        }
      `,
    });

    const radius = opts.radius ?? 1.2;
    this.coreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 64, 64),
      this.coreMat
    );
    this.group.add(this.coreMesh);

    this.glowMat = new THREE.ShaderMaterial({
      uniforms: {
        uPulse: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uPulse;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          vec3 glowColor = mix(vec3(0.4, 0.2, 1.0), vec3(0.8, 0.6, 1.0), uPulse);
          float alpha = intensity * (0.6 + uPulse * 0.8);
          gl_FragColor = vec4(glowColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.glowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.6, 32, 32),
      this.glowMat
    );
    this.group.add(this.glowMesh);

    for (let i = 0; i < 3; i++) {
      const ringMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPulse: { value: 0 },
          uIndex: { value: i },
        },
        vertexShader: `
          uniform float uIndex;
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec3 pos = position;
            float scale = 1.0 + uIndex * 0.3;
            pos *= scale;
            pos.x += sin(uTime * 1.5 + uIndex * 2.0) * 0.1;
            pos.y += cos(uTime * 1.2 + uIndex * 1.5) * 0.1;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uPulse;
          uniform float uIndex;
          varying vec2 vUv;
          void main() {
            float alpha = (0.15 + uPulse * 0.3) * (1.0 - abs(vUv.y - 0.5) * 2.0);
            alpha *= 0.7 - uIndex * 0.15;
            vec3 color = mix(vec3(0.5, 0.3, 1.0), vec3(0.9, 0.7, 1.0), uPulse);
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ringGeom = new THREE.TorusGeometry(radius * (1.8 + i * 0.5), 0.04, 16, 100);
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI / 2 + i * 0.3;
      ringMesh.rotation.z = i * 0.5;
      this.ringMeshes.push(ringMesh);
      this.ringMats.push(ringMat);
      this.group.add(ringMesh);
    }
  }

  triggerSuperPulse() {
    this.pulseIntensity = Math.max(this.pulseIntensity, 2.0);
    this.onPulse?.();
  }

  update(delta: number, elapsed: number) {
    this.coreMesh.rotation.y += this.rotationSpeed * delta;
    this.coreMesh.rotation.x += this.rotationSpeed * 0.3 * delta;

    this.pulseTimer += delta;
    const pulseInterval = 1.0 / Math.max(0.1, this.pulseFrequency);
    if (this.pulseTimer >= pulseInterval) {
      this.pulseTimer -= pulseInterval;
      this.pulseIntensity = Math.max(this.pulseIntensity, 1.0);
      this.onPulse?.();
    }

    this.pulseIntensity *= 0.92;
    if (this.pulseIntensity < 0.01) this.pulseIntensity = 0;

    this.coreMat.uniforms.uTime.value = elapsed;
    this.coreMat.uniforms.uPulse.value = this.pulseIntensity;
    this.glowMat.uniforms.uPulse.value = this.pulseIntensity;

    for (let i = 0; i < this.ringMeshes.length; i++) {
      this.ringMeshes[i].rotation.y += (this.rotationSpeed * 0.5 + i * 0.2) * delta;
      this.ringMats[i].uniforms.uTime.value = elapsed;
      this.ringMats[i].uniforms.uPulse.value = this.pulseIntensity;
    }
  }

  setPulseFrequency(freq: number) {
    this.pulseFrequency = freq;
  }

  setBeamWidth(width: number) {
    this.beamWidth = width;
  }

  setRotationSpeed(speed: number) {
    this.rotationSpeed = speed;
  }

  dispose() {
    this.coreMesh.geometry.dispose();
    this.coreMat.dispose();
    this.glowMesh.geometry.dispose();
    this.glowMat.dispose();
    this.ringMeshes.forEach((m, i) => {
      m.geometry.dispose();
      this.ringMats[i].dispose();
    });
  }
}

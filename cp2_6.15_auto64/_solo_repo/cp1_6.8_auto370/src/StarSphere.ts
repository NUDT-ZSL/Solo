import * as THREE from 'three';
import { StarTypeData, LifeStage } from './StarData';

export class StarSphere {
  public group: THREE.Group;
  public data: StarTypeData;
  public currentStage: LifeStage = 'main_sequence';

  private particleMesh: THREE.Points;
  private glowMesh: THREE.Mesh;
  private positions: Float32Array;
  private basePositions: Float32Array;
  private targetColor: THREE.Color;
  private currentColor: THREE.Color;
  private clock: THREE.Clock;
  private hitSphere: THREE.Mesh;
  private onStarClick: (star: StarSphere) => void;

  constructor(
    data: StarTypeData,
    position: THREE.Vector3,
    onStarClick: (star: StarSphere) => void
  ) {
    this.data = data;
    this.onStarClick = onStarClick;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.clock = new THREE.Clock();

    this.currentColor = data.colors.main_sequence.clone();
    this.targetColor = data.colors.main_sequence.clone();

    const count = data.particleCount;
    this.positions = new Float32Array(count * 3);
    this.basePositions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = data.baseRadius * (0.85 + Math.random() * 0.3);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;
      colors[i * 3] = this.currentColor.r;
      colors[i * 3 + 1] = this.currentColor.g;
      colors[i * 3 + 2] = this.currentColor.b;
      sizes[i] = 2.0 + Math.random() * 3.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFlicker: { value: data.flickerIntensity },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uFlicker;
        void main() {
          vColor = color;
          float flick = 1.0 - uFlicker * 0.5 * (1.0 + sin(uTime * 8.0 + position.x * 10.0));
          vAlpha = flick;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z) * flick;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particleMesh = new THREE.Points(geometry, material);
    this.group.add(this.particleMesh);

    const glowGeo = new THREE.SphereGeometry(data.baseRadius * 1.6, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: this.currentColor.clone() },
        uTime: { value: 0 },
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
        uniform vec3 uColor;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          float pulse = 1.0 + 0.1 * sin(uTime * 1.5);
          gl_FragColor = vec4(uColor * intensity * pulse, intensity * 0.6);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.group.add(this.glowMesh);

    const hitGeo = new THREE.SphereGeometry(data.baseRadius * 1.2, 16, 16);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitSphere = new THREE.Mesh(hitGeo, hitMat);
    this.hitSphere.userData = { starSphere: this };
    this.group.add(this.hitSphere);
  }

  public setStage(stage: LifeStage) {
    this.currentStage = stage;
    this.targetColor = this.data.colors[stage].clone();
  }

  public getHitObject(): THREE.Mesh {
    return this.hitSphere;
  }

  public handleClick() {
    this.onStarClick(this);
  }

  public update(delta: number) {
    const elapsed = this.clock.getElapsedTime();
    const posAttr = this.particleMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.particleMesh.geometry.getAttribute('color') as THREE.BufferAttribute;

    this.currentColor.lerp(this.targetColor, delta * 2.0);

    const pulsePhase = (elapsed / this.data.pulsationPeriod) * Math.PI * 2;
    const pulseFactor = 1.0 + this.data.pulsationAmplitude * Math.sin(pulsePhase);

    for (let i = 0; i < this.data.particleCount; i++) {
      const bx = this.basePositions[i * 3];
      const by = this.basePositions[i * 3 + 1];
      const bz = this.basePositions[i * 3 + 2];

      const angle = elapsed * this.data.rotationSpeed;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const rx = bx * cosA - bz * sinA;
      const rz = bx * sinA + bz * cosA;

      this.positions[i * 3] = rx * pulseFactor;
      this.positions[i * 3 + 1] = by * pulseFactor;
      this.positions[i * 3 + 2] = rz * pulseFactor;

      colAttr.setXYZ(i, this.currentColor.r, this.currentColor.g, this.currentColor.b);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    (this.particleMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    (this.glowMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    (this.glowMesh.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(this.currentColor);

    const glowScale = pulseFactor * 1.05;
    this.glowMesh.scale.setScalar(glowScale);

    this.group.rotation.y += this.data.rotationSpeed * delta * 0.1;
  }

  public dispose() {
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.ShaderMaterial).dispose();
    this.glowMesh.geometry.dispose();
    (this.glowMesh.material as THREE.ShaderMaterial).dispose();
    this.hitSphere.geometry.dispose();
    (this.hitSphere.material as THREE.MeshBasicMaterial).dispose();
  }
}

import * as THREE from 'three';

export interface CrystalParams {
  position: THREE.Vector3;
  height: number;
  radius: number;
  colorRatio: number;
  rotationY: number;
  sides: number;
  isPillar: boolean;
}

const COLOR_START = new THREE.Color(0xff66cc);
const COLOR_END = new THREE.Color(0x33ccff);

export class Crystal {
  mesh: THREE.Mesh;
  params: CrystalParams;
  currentHeight: number = 0;
  targetHeight: number;
  growthSpeed: number = 0.5;
  baseRotationY: number;
  resonanceIntensity: number = 0;
  resonanceDecay: number = 2.0;
  shockwaveOffset: THREE.Vector3 = new THREE.Vector3();
  shockwaveDecay: number = 1.5;
  pulsePhase: number = Math.random() * Math.PI * 2;
  material: THREE.ShaderMaterial;

  private _time: number = 0;

  constructor(params: CrystalParams) {
    this.params = params;
    this.targetHeight = params.height;
    this.baseRotationY = params.rotationY;

    const geometry = params.isPillar
      ? this.createPillarGeometry(params.radius, params.height, params.sides)
      : this.createConeGeometry(params.radius, params.height, params.sides);

    this.material = this.createMaterial(params.colorRatio);

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(params.position);
    this.mesh.rotation.y = params.rotationY;
    this.mesh.scale.y = 0.001;

    this.mesh.userData.crystal = this;
  }

  private createPillarGeometry(radius: number, height: number, sides: number): THREE.BufferGeometry {
    const geo = new THREE.CylinderGeometry(radius * 0.7, radius, height, sides, 8, false);
    return geo;
  }

  private createConeGeometry(radius: number, height: number, sides: number): THREE.BufferGeometry {
    const geo = new THREE.ConeGeometry(radius, height, sides, 8, false);
    return geo;
  }

  private createMaterial(colorRatio: number): THREE.ShaderMaterial {
    const baseColor = new THREE.Color().lerpColors(COLOR_START, COLOR_END, colorRatio);
    const glowColor = baseColor.clone().multiplyScalar(1.5);

    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: baseColor },
        uGlowColor: { value: glowColor },
        uResonance: { value: 0 },
        uOpacity: { value: 0.65 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec2 vUvCoord;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vUvCoord = uv;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uBaseColor;
        uniform vec3 uGlowColor;
        uniform float uResonance;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec2 vUvCoord;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

          float flow = sin(vUvCoord.y * 8.0 + uTime * 0.8) * 0.5 + 0.5;
          float flow2 = cos(vUvCoord.y * 5.0 - uTime * 0.5 + vUvCoord.x * 3.0) * 0.5 + 0.5;
          float flowMix = mix(flow, flow2, 0.4);

          vec3 color = mix(uBaseColor, uGlowColor, fresnel * 0.6 + flowMix * 0.3);
          color += uGlowColor * uResonance * 0.8;
          color += uBaseColor * flowMix * 0.15;

          float alpha = uOpacity + fresnel * 0.25 + uResonance * 0.2;
          alpha = clamp(alpha, 0.0, 0.95);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  triggerResonance(intensity: number) {
    this.resonanceIntensity = Math.min(this.resonanceIntensity + intensity, 1.5);
  }

  applyShockwave(direction: THREE.Vector3, strength: number) {
    this.shockwaveOffset.copy(direction.multiplyScalar(strength));
    this.growthSpeed = 2.5;
  }

  update(delta: number, growthSpeed: number, resonanceStrength: number) {
    this._time += delta;

    this.currentHeight += (this.targetHeight - this.currentHeight) * delta * this.growthSpeed * growthSpeed;
    this.mesh.scale.y = Math.max(0.001, this.currentHeight / this.targetHeight);

    this.resonanceIntensity = Math.max(0, this.resonanceIntensity - delta * this.resonanceDecay);
    this.growthSpeed = THREE.MathUtils.lerp(this.growthSpeed, 0.5, delta * this.shockwaveDecay);

    this.shockwaveOffset.lerp(new THREE.Vector3(), delta * this.shockwaveDecay);

    const pulse = Math.sin(this._time * 2.0 + this.pulsePhase) * 0.02;
    this.mesh.rotation.y = this.baseRotationY + this._time * 0.05 + pulse;

    this.mesh.position.x = this.params.position.x + this.shockwaveOffset.x;
    this.mesh.position.z = this.params.position.z + this.shockwaveOffset.z;

    this.material.uniforms.uTime.value = this._time;
    this.material.uniforms.uResonance.value = this.resonanceIntensity * resonanceStrength;

    const scalePulse = 1 + this.resonanceIntensity * resonanceStrength * 0.08 * Math.sin(this._time * 6.0);
    this.mesh.scale.x = scalePulse;
    this.mesh.scale.z = scalePulse;
  }

  getColor(): THREE.Color {
    return this.material.uniforms.uBaseColor.value.clone();
  }

  getWorldPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

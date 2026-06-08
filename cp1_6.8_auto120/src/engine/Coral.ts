import * as THREE from 'three';

export interface CoralData {
  id: string;
  species: string;
  depth: number;
  health: string;
  colorType: 'pink' | 'purple' | 'orange' | 'green';
  position: [number, number, number];
  scale: number;
  tentaclePhase: number;
}

const CORAL_COLORS: Record<string, { base: THREE.Color; tip: THREE.Color; glow: THREE.Color }> = {
  pink: {
    base: new THREE.Color(0xff2d78),
    tip: new THREE.Color(0xff6b9d),
    glow: new THREE.Color(0xff6b9d),
  },
  purple: {
    base: new THREE.Color(0x7c3aed),
    tip: new THREE.Color(0xb06bff),
    glow: new THREE.Color(0xb06bff),
  },
  orange: {
    base: new THREE.Color(0xd45500),
    tip: new THREE.Color(0xff8c42),
    glow: new THREE.Color(0xff8c42),
  },
  green: {
    base: new THREE.Color(0x0d9488),
    tip: new THREE.Color(0x4ecdc4),
    glow: new THREE.Color(0x4ecdc4),
  },
};

const coralVertexShader = `
  uniform float uTime;
  uniform float uCurrentSpeed;
  uniform float uInteractPhase;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vHeight;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec3 pos = position;

    float swayAmount = uCurrentSpeed * 0.3;
    float sway = sin(uTime * uCurrentSpeed + pos.y * 2.0 + uInteractPhase) * swayAmount * pos.y;
    pos.x += sway;
    pos.z += sway * 0.5;

    float interactScale = 1.0;
    if (uInteractPhase > 0.0) {
      float t = uInteractPhase;
      if (t < 0.3) {
        interactScale = 1.0 - 0.3 * sin(t / 0.3 * 3.14159);
      } else {
        interactScale = 1.0 + 0.15 * sin((t - 0.3) / 0.7 * 3.14159);
      }
    }
    if (pos.y > 0.0) {
      pos.y *= interactScale;
      pos.xz *= (1.0 + (interactScale - 1.0) * 0.5);
    }

    vHeight = pos.y;
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const coralFragmentShader = `
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform vec3 uGlowColor;
  uniform float uTime;
  uniform float uInteractPhase;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vHeight;

  void main() {
    float heightFactor = clamp(vHeight / 3.0, 0.0, 1.0);
    vec3 baseColor = mix(uBaseColor, uTipColor, heightFactor);

    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

    float breathPulse = 0.5 + 0.5 * sin(uTime * 1.5);
    float glowIntensity = fresnel * (0.4 + 0.2 * breathPulse);

    if (uInteractPhase > 0.0) {
      glowIntensity += 0.3 * uInteractPhase;
    }

    vec3 finalColor = baseColor + uGlowColor * glowIntensity;

    float ambient = 0.3;
    float diffuse = max(dot(vNormal, normalize(vec3(1.0, 2.0, 1.0))), 0.0);
    float light = ambient + diffuse * 0.7;
    finalColor *= light;

    gl_FragColor = vec4(finalColor, 0.95);
  }
`;

export class Coral {
  mesh: THREE.Mesh;
  data: CoralData;
  private material: THREE.ShaderMaterial;
  private interactTimer: number = 0;
  private isInteracting: boolean = false;

  constructor(data: CoralData) {
    this.data = data;
    const geometry = this.buildGeometry();
    const colors = CORAL_COLORS[data.colorType];

    this.material = new THREE.ShaderMaterial({
      vertexShader: coralVertexShader,
      fragmentShader: coralFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uCurrentSpeed: { value: 1.0 },
        uBaseColor: { value: colors.base },
        uTipColor: { value: colors.tip },
        uGlowColor: { value: colors.glow },
        uInteractPhase: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(...data.position);
    this.mesh.scale.setScalar(data.scale);
    this.mesh.userData = { coralId: data.id };
  }

  private buildGeometry(): THREE.BufferGeometry {
    const group = new THREE.Group();

    const trunkGeom = new THREE.CylinderGeometry(0.08, 0.15, 2.0, 8, 6);
    group.add(new THREE.Mesh(trunkGeom));

    const tentacleCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2 + Math.random() * 0.3;
      const tilt = 0.3 + Math.random() * 0.5;
      const length = 0.6 + Math.random() * 0.8;

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.8, 0),
        new THREE.Vector3(
          Math.cos(angle) * tilt * length * 0.5,
          1.8 + length * 0.3,
          Math.sin(angle) * tilt * length * 0.5
        ),
        new THREE.Vector3(
          Math.cos(angle) * tilt * length,
          2.0 + length * 0.5,
          Math.sin(angle) * tilt * length
        ),
      ]);

      const tubeGeom = new THREE.TubeGeometry(curve, 8, 0.03 + Math.random() * 0.02, 6, false);
      group.add(new THREE.Mesh(tubeGeom));

      const tipGeom = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 6, 6);
      tipGeom.translate(
        Math.cos(angle) * tilt * length,
        2.0 + length * 0.5,
        Math.sin(angle) * tilt * length
      );
      group.add(new THREE.Mesh(tipGeom));
    }

    const branchCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < branchCount; i++) {
      const y = 0.4 + Math.random() * 1.0;
      const angle = Math.random() * Math.PI * 2;
      const branchLen = 0.4 + Math.random() * 0.6;
      const tilt = 0.5 + Math.random() * 0.3;

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, y, 0),
        new THREE.Vector3(
          Math.cos(angle) * tilt * branchLen * 0.5,
          y + branchLen * 0.3,
          Math.sin(angle) * tilt * branchLen * 0.5
        ),
        new THREE.Vector3(
          Math.cos(angle) * tilt * branchLen,
          y + branchLen * 0.5,
          Math.sin(angle) * tilt * branchLen
        ),
      ]);

      const tubeGeom = new THREE.TubeGeometry(curve, 6, 0.025, 5, false);
      group.add(new THREE.Mesh(tubeGeom));
    }

    return this.mergeGeometries(group);
  }

  private mergeGeometries(group: THREE.Group): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];
    group.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        geometries.push(child.geometry);
      }
    });

    if (geometries.length === 0) {
      return new THREE.CylinderGeometry(0.1, 0.15, 2.0, 8);
    }

    const mergedPositions: number[] = [];
    const mergedNormals: number[] = [];
    const mergedIndices: number[] = [];
    let indexOffset = 0;

    for (const geom of geometries) {
      const pos = geom.attributes.position;
      const norm = geom.attributes.normal;
      const idx = geom.index;

      if (!pos || !norm) continue;

      for (let i = 0; i < pos.count; i++) {
        mergedPositions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        mergedNormals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      }

      if (idx) {
        for (let i = 0; i < idx.count; i++) {
          mergedIndices.push(idx.getX(i) + indexOffset);
        }
      }

      indexOffset += pos.count;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(mergedPositions, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(mergedNormals, 3));
    if (mergedIndices.length > 0) {
      merged.setIndex(mergedIndices);
    }
    merged.computeVertexNormals();
    return merged;
  }

  triggerInteraction() {
    this.isInteracting = true;
    this.interactTimer = 0;
  }

  update(delta: number, currentSpeed: number) {
    this.material.uniforms.uTime.value += delta;
    this.material.uniforms.uCurrentSpeed.value = currentSpeed;

    if (this.isInteracting) {
      this.interactTimer += delta;
      const duration = 1.5;
      if (this.interactTimer >= duration) {
        this.isInteracting = false;
        this.material.uniforms.uInteractPhase.value = 0;
      } else {
        this.material.uniforms.uInteractPhase.value = this.interactTimer / duration;
      }
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

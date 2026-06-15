import * as THREE from 'three';

export type ColorTheme = 'dawn' | 'dusk' | 'aurora' | 'neon';

interface ThemeColors {
  top: THREE.Color;
  mid: THREE.Color;
  bottom: THREE.Color;
  bgTop: number;
  bgBottom: number;
}

const THEMES: Record<ColorTheme, ThemeColors> = {
  dawn: {
    top: new THREE.Color(0xffe0a0),
    mid: new THREE.Color(0xff88aa),
    bottom: new THREE.Color(0x8866cc),
    bgTop: 0x1a0820,
    bgBottom: 0x0a0014
  },
  dusk: {
    top: new THREE.Color(0xffaa66),
    mid: new THREE.Color(0xff4466),
    bottom: new THREE.Color(0x553388),
    bgTop: 0x200810,
    bgBottom: 0x0a0408
  },
  aurora: {
    top: new THREE.Color(0x88ffcc),
    mid: new THREE.Color(0x66aaff),
    bottom: new THREE.Color(0xaa66cc),
    bgTop: 0x081a20,
    bgBottom: 0x040a14
  },
  neon: {
    top: new THREE.Color(0xff88ff),
    mid: new THREE.Color(0x66ffff),
    bottom: new THREE.Color(0x8866ff),
    bgTop: 0x180020,
    bgBottom: 0x0a0018
  }
};

const BRIDGE_HALF_SPAN = 20;
const BRIDGE_HEIGHT = 10;
const BRIDGE_WIDTH = 3.5;

export class RainbowBridge {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private points!: THREE.Points;
  private pointsGeometry!: THREE.BufferGeometry;
  private pointsMaterial!: THREE.ShaderMaterial;
  private webLines!: THREE.LineSegments;
  private webGeometry!: THREE.BufferGeometry;
  private webMaterial!: THREE.LineBasicMaterial;
  private hitMesh!: THREE.Mesh;

  private granularity = 0.5;
  private waveSpeed = 1.5;
  private currentTheme: ColorTheme = 'aurora';
  private time = 0;

  private basePositions!: Float32Array;
  private offsets!: Float32Array;
  private phases!: Float32Array;
  private pointColors!: Float32Array;
  private numArcPoints = 200;
  private numWidthPoints = 12;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.build();
  }

  getHitMesh(): THREE.Mesh {
    return this.hitMesh;
  }

  setGranularity(v: number) {
    this.granularity = v;
    this.updatePointSize();
  }

  setWaveSpeed(v: number) {
    this.waveSpeed = v;
  }

  setTheme(theme: ColorTheme) {
    this.currentTheme = theme;
    this.updateColors();
    this.updateFog();
  }

  getThemeColors(): ThemeColors {
    return THEMES[this.currentTheme];
  }

  sampleArch(t: number): THREE.Vector3 {
    const x = (t - 0.5) * 2 * BRIDGE_HALF_SPAN;
    const y = BRIDGE_HEIGHT * (1 - Math.pow(x / BRIDGE_HALF_SPAN, 2));
    return new THREE.Vector3(x, y, 0);
  }

  sampleArchTangent(t: number): THREE.Vector3 {
    const x = (t - 0.5) * 2 * BRIDGE_HALF_SPAN;
    const dy = -2 * BRIDGE_HEIGHT * x / (BRIDGE_HALF_SPAN * BRIDGE_HALF_SPAN);
    const tangent = new THREE.Vector3(BRIDGE_HALF_SPAN, dy, 0).normalize();
    return tangent;
  }

  sampleSurface(arcT: number, widthT: number): THREE.Vector3 {
    const center = this.sampleArch(arcT);
    const tangent = this.sampleArchTangent(arcT);
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const width = (widthT - 0.5) * BRIDGE_WIDTH;
    return center.clone().add(normal.multiplyScalar(width));
  }

  private build() {
    const numArcPoints = this.numArcPoints;
    const numWidthPoints = this.numWidthPoints;
    const total = numArcPoints * numWidthPoints;

    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const sizes = new Float32Array(total);
    const offsets = new Float32Array(total * 3);
    const phases = new Float32Array(total);
    const basePositions = new Float32Array(total * 3);

    let idx = 0;
    for (let a = 0; a < numArcPoints; a++) {
      const arcT = a / (numArcPoints - 1);
      for (let w = 0; w < numWidthPoints; w++) {
        const widthT = w / (numWidthPoints - 1);
        const p = this.sampleSurface(arcT, widthT);
        const jitter = 0.04;
        const jx = (Math.random() - 0.5) * jitter;
        const jy = (Math.random() - 0.5) * jitter;
        const jz = (Math.random() - 0.5) * jitter;

        positions[idx * 3] = p.x + jx;
        positions[idx * 3 + 1] = p.y + jy;
        positions[idx * 3 + 2] = p.z + jz;

        basePositions[idx * 3] = p.x;
        basePositions[idx * 3 + 1] = p.y;
        basePositions[idx * 3 + 2] = p.z;

        offsets[idx * 3] = Math.random() * 100;
        offsets[idx * 3 + 1] = Math.random() * 100;
        offsets[idx * 3 + 2] = Math.random() * 100;

        phases[idx] = Math.random() * Math.PI * 2;

        const color = this.getBridgeColor(arcT, widthT);
        colors[idx * 3] = color.r;
        colors[idx * 3 + 1] = color.g;
        colors[idx * 3 + 2] = color.b;

        sizes[idx] = 0.6 + Math.random() * 0.4;
        idx++;
      }
    }

    this.basePositions = basePositions;
    this.offsets = offsets;
    this.phases = phases;
    this.pointColors = colors;

    this.pointsGeometry = new THREE.BufferGeometry();
    this.pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.pointsGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.pointsGeometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 3));
    this.pointsGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    this.pointsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseSize: { value: 0.18 },
        uWaveSpeed: { value: this.waveSpeed },
        uCameraAngle: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `
        attribute float aSize;
        attribute vec3 aOffset;
        attribute float aPhase;
        uniform float uTime;
        uniform float uBaseSize;
        uniform float uWaveSpeed;
        uniform float uCameraAngle;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vGlow;
        void main() {
          vColor = color;
          float t = uTime * uWaveSpeed;
          float flowX = sin(t + aPhase + aOffset.x * 0.1);
          float flowY = cos(t * 0.8 + aPhase + aOffset.y * 0.1);
          float flowZ = sin(t * 1.2 + aPhase + aOffset.z * 0.1);
          float angleInfluence = sin(uCameraAngle + aOffset.x * 0.05) * 0.5 + 0.5;
          vec3 pos = position;
          pos.x += flowX * 0.08 * (0.5 + angleInfluence);
          pos.y += flowY * 0.06;
          pos.z += flowZ * 0.1 * angleInfluence;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float dist = -mvPosition.z;
          float size = uBaseSize * aSize * (300.0 / dist) * uPixelRatio;
          float pulse = sin(t * 2.0 + aPhase) * 0.2 + 0.8;
          gl_PointSize = size * pulse;
          vGlow = pulse;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vGlow;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist);
          float core = smoothstep(0.5, 0.15, dist);
          vec3 finalColor = vColor * (0.6 + core * 0.8 * vGlow);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    });

    this.points = new THREE.Points(this.pointsGeometry, this.pointsMaterial);
    this.group.add(this.points);

    this.buildWeb();
    this.buildHitMesh();
    this.updatePointSize();
  }

  private buildWeb() {
    const numArc = this.numArcPoints;
    const numW = this.numWidthPoints;
    const lineIndices: number[] = [];

    for (let a = 0; a < numArc; a++) {
      for (let w = 0; w < numW; w++) {
        const i = a * numW + w;
        if (w < numW - 1) {
          lineIndices.push(i, i + 1);
        }
        if (a < numArc - 1) {
          lineIndices.push(i, i + numW);
        }
        if (a < numArc - 1 && w < numW - 1 && (a + w) % 3 === 0) {
          lineIndices.push(i, i + numW + 1);
        }
      }
    }

    const linePositions = new Float32Array(lineIndices.length * 3);
    const lineColors = new Float32Array(lineIndices.length * 3);

    for (let i = 0; i < lineIndices.length; i++) {
      const idx = lineIndices[i];
      const a = Math.floor(idx / numW);
      const w = idx % numW;
      const arcT = a / (numArc - 1);
      const p = this.sampleSurface(arcT, w / (numW - 1));
      linePositions[i * 3] = p.x;
      linePositions[i * 3 + 1] = p.y;
      linePositions[i * 3 + 2] = p.z;
      const color = this.getBridgeColor(arcT, w / (numW - 1));
      lineColors[i * 3] = color.r;
      lineColors[i * 3 + 1] = color.g;
      lineColors[i * 3 + 2] = color.b;
    }

    this.webGeometry = new THREE.BufferGeometry();
    this.webGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    this.webGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    this.webMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.webLines = new THREE.LineSegments(this.webGeometry, this.webMaterial);
    this.group.add(this.webLines);
  }

  private buildHitMesh() {
    const numArc = 80;
    const numW = 10;
    const geometry = new THREE.PlaneGeometry(
      BRIDGE_HALF_SPAN * 2,
      BRIDGE_WIDTH * 1.5,
      numArc,
      numW
    );

    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const h = BRIDGE_HEIGHT * (1 - Math.pow(x / BRIDGE_HALF_SPAN, 2));
      const tangent = new THREE.Vector3(
        BRIDGE_HALF_SPAN,
        -2 * BRIDGE_HEIGHT * x / (BRIDGE_HALF_SPAN * BRIDGE_HALF_SPAN),
        0
      ).normalize();
      const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
      pos.setXYZ(i, x + normal.x * y, h + normal.y * y, 0);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.hitMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.hitMesh);
  }

  private getBridgeColor(arcT: number, widthT: number): THREE.Color {
    const theme = THEMES[this.currentTheme];
    let baseColor: THREE.Color;
    if (arcT < 0.5) {
      const t = arcT * 2;
      baseColor = theme.bottom.clone().lerp(theme.mid, t);
    } else {
      const t = (arcT - 0.5) * 2;
      baseColor = theme.mid.clone().lerp(theme.top, t);
    }
    const edgeFade = Math.pow(Math.abs(widthT - 0.5) * 2, 0.6);
    baseColor.lerp(new THREE.Color(0x403060), edgeFade * 0.5);
    const hueShift = (Math.random() - 0.5) * 0.03;
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    baseColor.setHSL(hsl.h + hueShift, Math.min(hsl.s + 0.05, 1), hsl.l);
    return baseColor;
  }

  private updatePointSize() {
    const baseSize = 0.08 + this.granularity * 0.28;
    if (this.pointsMaterial) {
      this.pointsMaterial.uniforms.uBaseSize.value = baseSize;
    }
  }

  private updateColors() {
    const numArc = this.numArcPoints;
    const numW = this.numWidthPoints;
    const colors = this.pointColors;
    for (let a = 0; a < numArc; a++) {
      const arcT = a / (numArc - 1);
      for (let w = 0; w < numW; w++) {
        const idx = a * numW + w;
        const widthT = w / (numW - 1);
        const color = this.getBridgeColor(arcT, widthT);
        colors[idx * 3] = color.r;
        colors[idx * 3 + 1] = color.g;
        colors[idx * 3 + 2] = color.b;
      }
    }
    (this.pointsGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    const lineColors = this.webGeometry.attributes.color as THREE.BufferAttribute;
    const linePos = this.webGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < lineColors.count; i += 2) {
      const lvPos = new THREE.Vector3(
        linePos.getX(i),
        linePos.getY(i),
        linePos.getZ(i)
      );
      const arcT = THREE.MathUtils.clamp(
        (lvPos.x / (BRIDGE_HALF_SPAN * 2)) + 0.5,
        0,
        1
      );
      const color = this.getBridgeColor(arcT, 0.5);
      lineColors.setXYZ(i, color.r, color.g, color.b);
      lineColors.setXYZ(i + 1, color.r, color.g, color.b);
    }
    lineColors.needsUpdate = true;
  }

  private updateFog() {
    const theme = THEMES[this.currentTheme];
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(theme.bgBottom);
    }
  }

  update(delta: number, cameraAngleY: number) {
    this.time += delta;
    this.pointsMaterial.uniforms.uTime.value = this.time;
    this.pointsMaterial.uniforms.uWaveSpeed.value = this.waveSpeed;
    this.pointsMaterial.uniforms.uCameraAngle.value = cameraAngleY;

    const numArc = this.numArcPoints;
    const numW = this.numWidthPoints;
    const total = numArc * numW;
    const pos = this.pointsGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < total; i++) {
      const t = this.time * this.waveSpeed;
      const ox = this.offsets[i * 3];
      const oy = this.offsets[i * 3 + 1];
      const oz = this.offsets[i * 3 + 2];
      const phase = this.phases[i];
      const bx = this.basePositions[i * 3];
      const by = this.basePositions[i * 3 + 1];
      const bz = this.basePositions[i * 3 + 2];
      const flowX = Math.sin(t + phase + ox * 0.1);
      const flowY = Math.cos(t * 0.8 + phase + oy * 0.1);
      const flowZ = Math.sin(t * 1.2 + phase + oz * 0.1);
      const camInfluence = Math.sin(cameraAngleY + ox * 0.05) * 0.5 + 0.5;
      pos.setXYZ(
        i,
        bx + flowX * 0.08 * (0.5 + camInfluence),
        by + flowY * 0.06,
        bz + flowZ * 0.1 * camInfluence
      );
    }
    pos.needsUpdate = true;
  }
}

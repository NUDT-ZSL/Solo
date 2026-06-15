import * as THREE from 'three';

export enum FragmentState {
  Idle = 'idle',
  FlyingToCenter = 'flying_to_center',
  Bursting = 'bursting',
  Coalescing = 'coalescing',
  FlyingBack = 'flying_back',
  Repaired = 'repaired',
}

export interface FragmentConfig {
  index: number;
  arcAngle: number;
  ringInnerRadius: number;
  ringOuterRadius: number;
  thickness: number;
  outerHeight: number;
  innerHeight: number;
}

export class Fragment {
  group: THREE.Group;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  state: FragmentState = FragmentState.Idle;
  config: FragmentConfig;
  originalWorldPos: THREE.Vector3 = new THREE.Vector3();
  originalWorldQuat: THREE.Quaternion = new THREE.Quaternion();
  originalLocalPos: THREE.Vector3 = new THREE.Vector3();
  originalLocalRot: THREE.Euler = new THREE.Euler();
  private stoneMaterial: THREE.MeshStandardMaterial;
  private edgesMaterial: THREE.ShaderMaterial;
  private isRepairedFlag = false;
  private edgeTimeOffset: number;

  get centerPosition(): THREE.Vector3 {
    this.mesh.getWorldPosition(this.originalWorldPos);
    return this.originalWorldPos.clone();
  }

  get isRepaired(): boolean {
    return this.isRepairedFlag;
  }

  constructor(parent: THREE.Object3D, config: FragmentConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.edgeTimeOffset = Math.random() * 10;
    const geometry = this.buildGeometry();
    this.stoneMaterial = this.createStoneMaterial(false);
    this.mesh = new THREE.Mesh(geometry, this.stoneMaterial);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.group.add(this.mesh);
    const edgesGeo = new THREE.EdgesGeometry(geometry, 25);
    this.edgesMaterial = this.createEdgesMaterial(false);
    this.edges = new THREE.LineSegments(edgesGeo, this.edgesMaterial);
    this.group.add(this.edges);
    this.positionInRing();
    this.mesh.updateMatrixWorld(true);
    this.mesh.getWorldPosition(this.originalWorldPos);
    this.mesh.getWorldQuaternion(this.originalWorldQuat);
    this.originalLocalPos.copy(this.group.position);
    this.originalLocalRot.copy(this.group.rotation);
    parent.add(this.group);
  }

  private buildGeometry(): THREE.BufferGeometry {
    const { arcAngle, ringInnerRadius: r1, ringOuterRadius: r2, thickness, outerHeight: h2, innerHeight: h1, index } = this.config;
    const radialSeg = 16;
    const angleSeg = 12;
    const thickSeg = 2;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const thetaStart = index * arcAngle - arcAngle / 2;
    const halfThick = thickness / 2;
    const rand = (i: number, j: number, k: number, s = 1) => {
      const x = Math.sin(i * 12.9898 + j * 78.233 + k * 37.719 + index * 13.37) * 43758.5453;
      return (x - Math.floor(x) - 0.5) * 2 * s;
    };
    const isBrokenEdge = (iSeg: number, jSeg: number, kSeg: number) => {
      const onLeftAngle = iSeg === 0;
      const onRightAngle = iSeg === angleSeg;
      const onInner = jSeg === 0;
      const onOuter = jSeg === radialSeg;
      return onLeftAngle || onRightAngle || onInner || onOuter;
    };
    const vertIdx = new Map<string, number>();
    const getOrAdd = (x: number, y: number, z: number, u: number, v: number, nx: number, ny: number, nz: number, key: string) => {
      if (vertIdx.has(key)) return vertIdx.get(key)!;
      const idx = positions.length / 3;
      positions.push(x, y, z);
      normals.push(nx, ny, nz);
      uvs.push(u, v);
      vertIdx.set(key, idx);
      return idx;
    };
    for (let t = 0; t <= thickSeg; t++) {
      const depth = -halfThick + (t / thickSeg) * thickness;
      const nz = t === 0 ? -1 : t === thickSeg ? 1 : 0;
      for (let i = 0; i <= angleSeg; i++) {
        const theta = thetaStart + (i / angleSeg) * arcAngle;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        for (let j = 0; j <= radialSeg; j++) {
          const r = r1 + (j / radialSeg) * (r2 - r1);
          const normR = (r - r1) / (r2 - r1);
          const height = h1 + normR * (h2 - h1);
          let x = cos * r;
          let y = 0;
          let z = sin * r + depth;
          let amp = 0;
          if (isBrokenEdge(i, j, t)) amp = 0.05;
          x += rand(i, j, t, amp);
          y += rand(i + 3, j + 5, t + 2, amp);
          z += rand(i + 7, j + 11, t + 3, amp);
          const stoneNoise = rand(i * 2.3, j * 1.7, t * 3.1, 0.015);
          x += stoneNoise * cos;
          z += stoneNoise * sin;
          y += Math.sin(i * 0.8 + j * 1.2 + index) * 0.012;
          const u = i / angleSeg;
          const v = j / radialSeg;
          const nTheta = theta;
          const nR = -Math.sin(nTheta);
          const nS = Math.cos(nTheta);
          const nx = nR;
          const ny = 0;
          const nzz = nS;
          const key = `${i}_${j}_${t}`;
          getOrAdd(x, y + height / 2, z, u, v, nx, ny, nzz, key + '_t');
        }
      }
    }
    const angleP = angleSeg + 1;
    const radP = radialSeg + 1;
    const topIdx = (i: number, j: number, t: number) => t * angleP * radP + i * radP + j;
    for (let t = 0; t < thickSeg; t++) {
      for (let i = 0; i < angleSeg; i++) {
        for (let j = 0; j < radialSeg; j++) {
          const a = topIdx(i, j, t);
          const b = topIdx(i + 1, j, t);
          const c = topIdx(i + 1, j + 1, t);
          const d = topIdx(i, j + 1, t);
          indices.push(a, b, c, a, c, d);
          const a2 = topIdx(i, j, t + 1);
          const b2 = topIdx(i + 1, j, t + 1);
          const c2 = topIdx(i + 1, j + 1, t + 1);
          const d2 = topIdx(i, j + 1, t + 1);
          indices.push(a2, c2, b2, a2, d2, c2);
        }
      }
    }
    for (let i = 0; i < angleSeg; i++) {
      for (let j = 0; j < radialSeg; j++) {
        const a = topIdx(i, j, 0);
        const b = topIdx(i, j, 1);
        const c = topIdx(i + 1, j, 1);
        const d = topIdx(i + 1, j, 0);
        indices.push(a, b, c, a, c, d);
        const a2 = topIdx(i, j + 1, 0);
        const b2 = topIdx(i, j + 1, 1);
        const c2 = topIdx(i + 1, j + 1, 1);
        const d2 = topIdx(i + 1, j + 1, 0);
        indices.push(a2, c2, b2, a2, d2, c2);
      }
    }
    for (let t = 0; t < thickSeg; t++) {
      for (let i = 0; i < angleSeg; i++) {
        const a = topIdx(i, 0, t);
        const b = topIdx(i, 0, t + 1);
        const c = topIdx(i + 1, 0, t + 1);
        const d = topIdx(i + 1, 0, t);
        indices.push(a, c, b, a, d, c);
        const a2 = topIdx(i, radialSeg, t);
        const b2 = topIdx(i, radialSeg, t + 1);
        const c2 = topIdx(i + 1, radialSeg, t + 1);
        const d2 = topIdx(i + 1, radialSeg, t);
        indices.push(a2, b2, c2, a2, c2, d2);
      }
    }
    for (let t = 0; t < thickSeg; t++) {
      for (let j = 0; j < radialSeg; j++) {
        const a = topIdx(0, j, t);
        const b = topIdx(0, j, t + 1);
        const c = topIdx(0, j + 1, t + 1);
        const d = topIdx(0, j + 1, t);
        indices.push(a, b, c, a, c, d);
        const a2 = topIdx(angleSeg, j, t);
        const b2 = topIdx(angleSeg, j, t + 1);
        const c2 = topIdx(angleSeg, j + 1, t + 1);
        const d2 = topIdx(angleSeg, j + 1, t);
        indices.push(a2, c2, b2, a2, d2, c2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  private createStoneMaterial(repaired: boolean): THREE.MeshStandardMaterial {
    if (repaired) {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(45 / 360, 0.35, 0.42),
        roughness: 0.75,
        metalness: 0.15,
        emissive: new THREE.Color().setHSL(50 / 360, 0.8, 0.35),
        emissiveIntensity: 0.35,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x3a3a42),
      roughness: 0.92,
      metalness: 0.08,
    });
  }

  private createEdgesMaterial(repaired: boolean): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRepaired: { value: repaired ? 1.0 : 0.0 },
        uPulseFreq: { value: 0.5 },
      },
      vertexShader: `
        varying float vProgress;
        attribute float lineDistance;
        void main() {
          vProgress = position.x * 0.01 + position.y * 0.02 + position.z * 0.015;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uRepaired;
        uniform float uPulseFreq;
        varying float vProgress;
        vec3 hsl2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        void main() {
          float hueMix = fract(vProgress * 2.5 + uTime * 0.3);
          float hueBroken = mix(15.0 / 360.0, 40.0 / 360.0, hueMix);
          float hueFixed = 50.0 / 360.0;
          float hue = mix(hueBroken, hueFixed, uRepaired);
          float pulse = 0.7 + 0.3 * sin(uTime * 6.2831 * uPulseFreq + vProgress * 8.0);
          float brightness = mix(0.6, 0.2, uRepaired) * pulse;
          float sat = mix(0.95, 0.85, uRepaired);
          vec3 col = hsl2rgb(vec3(hue, sat, brightness));
          float alpha = mix(0.9, 0.6, uRepaired);
          gl_FragColor = vec4(col * 1.5, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  private positionInRing() {
    const { arcAngle, index } = this.config;
    const midAngle = index * arcAngle;
    const rMid = (this.config.ringInnerRadius + this.config.ringOuterRadius) / 2;
    this.group.position.set(
      Math.cos(midAngle) * rMid,
      0,
      Math.sin(midAngle) * rMid,
    );
    this.group.rotation.set(0, -midAngle + Math.PI / 2, 0);
  }

  updateShaderTime(time: number) {
    if (this.edgesMaterial && 'uTime' in this.edgesMaterial.uniforms) {
      this.edgesMaterial.uniforms.uTime.value = time + this.edgeTimeOffset;
    }
  }

  setVisible(v: boolean) {
    this.mesh.visible = v;
    this.edges.visible = v;
  }

  markAsRepaired() {
    this.isRepairedFlag = true;
    this.state = FragmentState.Repaired;
    const newMat = this.createStoneMaterial(true);
    const old = this.mesh.material as THREE.MeshStandardMaterial;
    old.dispose();
    this.mesh.material = newMat;
    this.stoneMaterial = newMat;
    const newEdgeMat = this.createEdgesMaterial(true);
    if (this.edgesMaterial && 'uRepaired' in this.edgesMaterial.uniforms) {
      this.edgesMaterial.uniforms.uRepaired.value = 1.0;
    }
    (this.edges.material as THREE.ShaderMaterial).dispose();
    this.edges.material = newEdgeMat;
    this.edgesMaterial = newEdgeMat;
  }

  resetToOriginalTransform() {
    this.group.position.copy(this.originalLocalPos);
    this.group.rotation.copy(this.originalLocalRot);
    this.group.scale.setScalar(1);
  }

  dispose() {
    (this.mesh.geometry as THREE.BufferGeometry).dispose();
    (this.stoneMaterial as THREE.Material).dispose();
    (this.edges.geometry as THREE.BufferGeometry).dispose();
    (this.edgesMaterial as THREE.Material).dispose();
  }
}

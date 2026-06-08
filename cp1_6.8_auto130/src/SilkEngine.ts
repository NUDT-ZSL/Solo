import * as THREE from 'three';

interface SilkNode {
  position: THREE.Vector3;
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  index: number;
  row: number;
  col: number;
}

interface ExplosionParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

export interface SilkInfo {
  id: number;
  color: string;
  tension: number;
  nodeIndex: number;
  screenPos: { x: number; y: number };
}

export class SilkEngine {
  private scene: THREE.Scene;
  private rows: number;
  private cols: number;
  private spacing: number;
  private nodes: SilkNode[] = [];
  private silkMesh!: THREE.LineSegments;
  private silkMaterial!: THREE.ShaderMaterial;
  private explosionParticles: ExplosionParticle[] = [];
  private explosionMesh!: THREE.Points;
  private explosionMaterial!: THREE.ShaderMaterial;
  private highlightNodeIndex: number = -1;
  private windSpeed: number = 1.0;
  private density: number = 20;
  private glowIntensity: number = 1.0;
  private time: number = 0;
  private hoveredLineIndex: number = -1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.rows = 20;
    this.cols = 20;
    this.spacing = 0.5;
    this.buildSilkMesh();
    this.buildExplosionSystem();
  }

  private buildSilkMesh() {
    if (this.silkMesh) {
      this.scene.remove(this.silkMesh);
      this.silkMesh.geometry.dispose();
    }

    this.nodes = [];
    this.rows = this.density;
    this.cols = this.density;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = (c - (this.cols - 1) / 2) * this.spacing;
        const y = (r - (this.rows - 1) / 2) * this.spacing;
        const z = 0;
        const pos = new THREE.Vector3(x, y, z);
        this.nodes.push({
          position: pos.clone(),
          basePosition: pos.clone(),
          velocity: new THREE.Vector3(),
          index: r * this.cols + c,
          row: r,
          col: c,
        });
      }
    }

    const lineCount =
      (this.rows - 1) * this.cols + this.rows * (this.cols - 1);
    const positions = new Float32Array(lineCount * 6);
    const colors = new Float32Array(lineCount * 6);
    const aLineWidths = new Float32Array(lineCount * 2);

    let idx = 0;
    const addEdge = (a: SilkNode, b: SilkNode) => {
      positions[idx * 6 + 0] = a.position.x;
      positions[idx * 6 + 1] = a.position.y;
      positions[idx * 6 + 2] = a.position.z;
      positions[idx * 6 + 3] = b.position.x;
      positions[idx * 6 + 4] = b.position.y;
      positions[idx * 6 + 5] = b.position.z;
      aLineWidths[idx * 2] = 1.0;
      aLineWidths[idx * 2 + 1] = 1.0;
      idx++;
    };

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const node = this.nodes[r * this.cols + c];
        if (c < this.cols - 1) {
          addEdge(node, this.nodes[r * this.cols + c + 1]);
        }
        if (r < this.rows - 1) {
          addEdge(node, this.nodes[(r + 1) * this.cols + c]);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aLineWidth', new THREE.BufferAttribute(aLineWidths, 1));

    this.silkMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aLineWidth;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vLineWidth;
        void main() {
          vColor = color;
          vLineWidth = aLineWidth;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uGlow;
        varying vec3 vColor;
        varying float vLineWidth;
        void main() {
          float brightness = uGlow * (0.6 + 0.4 * vLineWidth);
          gl_FragColor = vec4(vColor * brightness, 0.9);
        }
      `,
      uniforms: {
        uGlow: { value: this.glowIntensity },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.silkMesh = new THREE.LineSegments(geometry, this.silkMaterial);
    this.scene.add(this.silkMesh);
    this.updateColors();
  }

  private updateColors() {
    const colors = this.silkMesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    const lineCount = colors.count / 2;

    for (let i = 0; i < lineCount; i++) {
      const t = i / lineCount;
      const nodeA = this.findNodeForLine(i);
      const isHovered = i === this.hoveredLineIndex;

      const baseColor = new THREE.Color();
      if (t < 0.5) {
        baseColor.setHSL(0.08 + t * 0.04, 0.95, isHovered ? 0.85 : 0.6);
      } else {
        baseColor.setHSL(0.75 - (t - 0.5) * 0.1, 0.8, isHovered ? 0.85 : 0.55);
      }

      const r = baseColor.r;
      const g = baseColor.g;
      const b = baseColor.b;

      colors.setXYZ(i * 2, r, g, b);
      colors.setXYZ(i * 2 + 1, r, g, b);
    }

    colors.needsUpdate = true;
  }

  private findNodeForLine(lineIndex: number): SilkNode {
    const idx = Math.min(lineIndex, this.nodes.length - 1);
    return this.nodes[idx];
  }

  private buildExplosionSystem() {
    const maxParticles = 500;
    const positions = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);
    const alphas = new Float32Array(maxParticles);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    this.explosionMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float glow = 1.0 - d * 2.0;
          glow = pow(glow, 1.5);
          vec3 col = mix(vec3(1.0, 0.7, 0.2), vec3(1.0, 0.95, 0.8), glow);
          gl_FragColor = vec4(col, vAlpha * glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    this.explosionMesh = new THREE.Points(geometry, this.explosionMaterial);
    this.scene.add(this.explosionMesh);
  }

  update(dt: number) {
    this.time += dt;
    this.updateDynamics(dt);
    this.updateGeometry();
    this.updateExplosion(dt);
  }

  private updateDynamics(dt: number) {
    const windAmp = this.windSpeed * 0.8;
    const freq = 0.5;

    for (const node of this.nodes) {
      const r = node.row;
      const c = node.col;

      const waveX =
        Math.sin(this.time * freq + r * 0.3 + c * 0.15) * windAmp * 0.5;
      const waveY =
        Math.cos(this.time * freq * 0.7 + c * 0.25 + r * 0.1) * windAmp * 0.3;
      const waveZ =
        Math.sin(this.time * freq * 1.2 + r * 0.2 + c * 0.35) * windAmp * 0.6;

      const targetX = node.basePosition.x + waveX;
      const targetY = node.basePosition.y + waveY;
      const targetZ = node.basePosition.z + waveZ;

      const spring = 2.0;
      const damping = 0.85;

      node.velocity.x += (targetX - node.position.x) * spring * dt;
      node.velocity.y += (targetY - node.position.y) * spring * dt;
      node.velocity.z += (targetZ - node.position.z) * spring * dt;

      node.velocity.multiplyScalar(damping);

      node.position.x += node.velocity.x;
      node.position.y += node.velocity.y;
      node.position.z += node.velocity.z;
    }
  }

  private updateGeometry() {
    const positions = this.silkMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const aLineWidths = this.silkMesh.geometry.getAttribute('aLineWidth') as THREE.BufferAttribute;

    let idx = 0;
    const setLineVerts = (a: SilkNode, b: SilkNode) => {
      positions.setXYZ(idx * 2, a.position.x, a.position.y, a.position.z);
      positions.setXYZ(idx * 2 + 1, b.position.x, b.position.y, b.position.z);

      const isHovered = idx === this.hoveredLineIndex;
      aLineWidths.setX(idx * 2, isHovered ? 2.0 : 1.0);
      aLineWidths.setX(idx * 2 + 1, isHovered ? 2.0 : 1.0);
      idx++;
    };

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const node = this.nodes[r * this.cols + c];
        if (c < this.cols - 1) {
          setLineVerts(node, this.nodes[r * this.cols + c + 1]);
        }
        if (r < this.rows - 1) {
          setLineVerts(node, this.nodes[(r + 1) * this.cols + c]);
        }
      }
    }

    positions.needsUpdate = true;
    aLineWidths.needsUpdate = true;

    if (this.silkMaterial.uniforms.uGlow) {
      this.silkMaterial.uniforms.uGlow.value = this.glowIntensity;
    }
  }

  private updateExplosion(dt: number) {
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const p = this.explosionParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.explosionParticles.splice(i, 1);
        continue;
      }
      p.position.add(p.velocity.clone().multiplyScalar(dt));
      p.velocity.multiplyScalar(0.96);
    }

    const posAttr = this.explosionMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const sizeAttr = this.explosionMesh.geometry.getAttribute('size') as THREE.BufferAttribute;
    const alphaAttr = this.explosionMesh.geometry.getAttribute('alpha') as THREE.BufferAttribute;

    for (let i = 0; i < posAttr.count; i++) {
      if (i < this.explosionParticles.length) {
        const p = this.explosionParticles[i];
        posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
        const lifeRatio = p.life / p.maxLife;
        sizeAttr.setX(i, p.size * (1.0 + (1.0 - lifeRatio) * 2.0));
        alphaAttr.setX(i, lifeRatio);
      } else {
        posAttr.setXYZ(i, 0, 0, -9999);
        sizeAttr.setX(i, 0);
        alphaAttr.setX(i, 0);
      }
    }

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }

  triggerExplosion(worldPos: THREE.Vector3, nodeIndex: number) {
    const count = 50;
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      const speed = 1.5 + Math.random() * 3.0;
      this.explosionParticles.push({
        position: worldPos.clone(),
        velocity: dir.multiplyScalar(speed),
        life: 0.5,
        maxLife: 0.5,
        size: 0.2 + Math.random() * 0.4,
      });
    }

    this.highlightNodeIndex = nodeIndex;
  }

  performHitTest(
    mouseNDC: THREE.Vector2,
    camera: THREE.PerspectiveCamera
  ): { nodeIndex: number; worldPos: THREE.Vector3; lineIndex: number } | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseNDC, camera);

    const positions = this.silkMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const lineCount = positions.count / 2;

    let closestDist = Infinity;
    let closestLine = -1;
    let closestPoint = new THREE.Vector3();

    const v0 = new THREE.Vector3();
    const v1 = new THREE.Vector3();

    for (let i = 0; i < lineCount; i++) {
      v0.fromBufferAttribute(positions, i * 2);
      v1.fromBufferAttribute(positions, i * 2 + 1);

      const line = new THREE.Line3(v0, v1);
      const point = new THREE.Vector3();
      raycaster.ray.distanceSqToSegment(line.start, line.end, undefined, point);

      const dist = raycaster.ray.distanceToPoint(point);
      if (dist < closestDist && dist < 0.3) {
        closestDist = dist;
        closestLine = i;
        closestPoint = point.clone();
      }
    }

    if (closestLine === -1) return null;

    const nodeIndex = Math.min(
      Math.floor(closestLine / 2),
      this.nodes.length - 1
    );
    return { nodeIndex, worldPos: closestPoint, lineIndex: closestLine };
  }

  performHoverTest(
    mouseNDC: THREE.Vector2,
    camera: THREE.PerspectiveCamera
  ): number {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseNDC, camera);

    const positions = this.silkMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const lineCount = positions.count / 2;

    let closestLine = -1;
    let closestDist = Infinity;

    const v0 = new THREE.Vector3();
    const v1 = new THREE.Vector3();

    for (let i = 0; i < lineCount; i++) {
      v0.fromBufferAttribute(positions, i * 2);
      v1.fromBufferAttribute(positions, i * 2 + 1);

      const line = new THREE.Line3(v0, v1);
      const point = new THREE.Vector3();
      raycaster.ray.distanceSqToSegment(line.start, line.end, undefined, point);

      const dist = raycaster.ray.distanceToPoint(point);
      if (dist < closestDist && dist < 0.25) {
        closestDist = dist;
        closestLine = i;
      }
    }

    if (this.hoveredLineIndex !== closestLine) {
      this.hoveredLineIndex = closestLine;
      this.updateColors();
    }

    return closestLine;
  }

  getSilkInfo(nodeIndex: number): SilkInfo {
    const node = this.nodes[nodeIndex] || this.nodes[0];
    const t = nodeIndex / this.nodes.length;
    let color: string;
    if (t < 0.5) {
      color = `hsl(${Math.round(28 + t * 14)}, 95%, 60%)`;
    } else {
      color = `hsl(${Math.round(270 - (t - 0.5) * 36)}, 80%, 55%)`;
    }
    const tension = parseFloat(
      (node.velocity.length() * 10 + Math.random() * 2).toFixed(2)
    );
    return {
      id: nodeIndex,
      color,
      tension,
      nodeIndex,
      screenPos: { x: 0, y: 0 },
    };
  }

  setWindSpeed(v: number) {
    this.windSpeed = v;
  }

  setDensity(v: number) {
    if (v !== this.density) {
      this.density = Math.max(5, Math.min(40, v));
      this.buildSilkMesh();
    }
  }

  setGlowIntensity(v: number) {
    this.glowIntensity = v;
  }

  getDensity(): number {
    return this.density;
  }

  dispose() {
    this.silkMesh.geometry.dispose();
    this.silkMaterial.dispose();
    this.explosionMesh.geometry.dispose();
    this.explosionMaterial.dispose();
    this.scene.remove(this.silkMesh);
    this.scene.remove(this.explosionMesh);
  }
}

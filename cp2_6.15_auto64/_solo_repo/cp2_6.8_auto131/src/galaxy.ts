import * as THREE from 'three';

export interface GalaxyParams {
  particleCount: number;
  rotationSpeed: number;
  armWidth: number;
  outerColor: string;
}

export interface SelectedParticle {
  index: number;
  position: THREE.Vector3;
  color: THREE.Color;
  originalSize: number;
}

interface ParticleData {
  targetPositions: Float32Array;
  targetColors: Float32Array;
  targetSizes: Float32Array;
  currentPositions: Float32Array;
  currentColors: Float32Array;
  currentSizes: Float32Array;
  radiusFactors: Float32Array;
}

export class Galaxy {
  public points: THREE.Points;
  public highlightSprite: THREE.Sprite;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;
  public params: GalaxyParams;
  public selectedParticle: SelectedParticle | null = null;

  private particleData: ParticleData | null = null;
  private transitionProgress: number = 1;
  private isTransitioning: boolean = false;
  private readonly transitionDuration: number = 0.5;
  private readonly armCount: number = 3;
  private readonly centerColor: THREE.Color = new THREE.Color(0xFFFFFF);
  private readonly midColor: THREE.Color = new THREE.Color(0xB794F4);
  private outerColorObj: THREE.Color = new THREE.Color(0xFC8181);
  private rotationAngle: number = 0;

  constructor(params: GalaxyParams) {
    this.params = { ...params };
    this.outerColorObj = new THREE.Color(params.outerColor);

    this.geometry = new THREE.BufferGeometry();
    this.material = this.createShaderMaterial();

    this.points = new THREE.Points(this.geometry, this.material);

    this.highlightSprite = this.createHighlightSprite();
    this.highlightSprite.visible = false;
    this.points.add(this.highlightSprite);

    this.generateParticles();
  }

  private createShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 120.0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uPixelRatio;
        uniform float uSize;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * uSize * uPixelRatio / -mvPosition.z;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false,
    });
  }

  private createHighlightSprite(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(246, 224, 94, 1)');
    gradient.addColorStop(0.3, 'rgba(246, 224, 94, 0.8)');
    gradient.addColorStop(0.6, 'rgba(246, 224, 94, 0.3)');
    gradient.addColorStop(1, 'rgba(246, 224, 94, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.8, 0.8, 0.8);
    return sprite;
  }

  private lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
    return new THREE.Color().lerpColors(a, b, t);
  }

  private getColorForRadius(radiusFactor: number): THREE.Color {
    if (radiusFactor < 0.5) {
      const t = radiusFactor / 0.5;
      return this.lerpColor(this.centerColor, this.midColor, t);
    } else {
      const t = (radiusFactor - 0.5) / 0.5;
      return this.lerpColor(this.midColor, this.outerColorObj, t);
    }
  }

  public generateParticles(): void {
    const count = this.params.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const targetPositions = new Float32Array(count * 3);
    const targetColors = new Float32Array(count * 3);
    const targetSizes = new Float32Array(count);
    const radiusFactors = new Float32Array(count);

    const maxRadius = 6;

    for (let i = 0; i < count; i++) {
      const armIndex = i % this.armCount;
      const radiusFactor = Math.pow(Math.random(), 0.5);
      const radius = radiusFactor * maxRadius;

      const armAngle = (armIndex / this.armCount) * Math.PI * 2;
      const spiralAngle = radiusFactor * 4.5;
      const baseAngle = armAngle + spiralAngle;

      const widthOffset = (Math.random() - 0.5) * this.params.armWidth * 2;
      const angleOffset = widthOffset * 0.3;

      const finalAngle = baseAngle + angleOffset;
      const finalRadius = radius + widthOffset * 0.5;

      const x = Math.cos(finalAngle) * finalRadius;
      const z = Math.sin(finalAngle) * finalRadius;
      const height = (Math.random() - 0.5) * 0.5 * (1 - radiusFactor * 0.7);

      positions[i * 3] = x;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = z;

      const color = this.getColorForRadius(radiusFactor);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const size = 0.2 + Math.random() * 0.6;
      sizes[i] = size;

      targetPositions[i * 3] = x;
      targetPositions[i * 3 + 1] = height;
      targetPositions[i * 3 + 2] = z;

      targetColors[i * 3] = color.r;
      targetColors[i * 3 + 1] = color.g;
      targetColors[i * 3 + 2] = color.b;

      targetSizes[i] = size;
      radiusFactors[i] = radiusFactor;
    }

    this.particleData = {
      targetPositions,
      targetColors,
      targetSizes,
      currentPositions: positions,
      currentColors: colors,
      currentSizes: sizes,
      radiusFactors,
    };

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setDrawRange(0, count);
  }

  public updateParams(newParams: Partial<GalaxyParams>): void {
    const needsRegenerate =
      (newParams.particleCount !== undefined && newParams.particleCount !== this.params.particleCount) ||
      (newParams.armWidth !== undefined && newParams.armWidth !== this.params.armWidth) ||
      (newParams.outerColor !== undefined && newParams.outerColor !== this.params.outerColor);

    if (newParams.outerColor !== undefined) {
      this.outerColorObj = new THREE.Color(newParams.outerColor);
    }

    Object.assign(this.params, newParams);

    if (needsRegenerate) {
      this.regenerateTargets();
      this.isTransitioning = true;
      this.transitionProgress = 0;
    }
  }

  private regenerateTargets(): void {
    if (!this.particleData) return;

    const count = this.params.particleCount;
    const maxRadius = 6;
    const prevCount = this.particleData.targetPositions.length / 3;

    const targetPositions = new Float32Array(count * 3);
    const targetColors = new Float32Array(count * 3);
    const targetSizes = new Float32Array(count);
    const radiusFactors = new Float32Array(count);

    const currentPositions = new Float32Array(count * 3);
    const currentColors = new Float32Array(count * 3);
    const currentSizes = new Float32Array(count);

    const minCount = Math.min(count, prevCount);

    for (let i = 0; i < minCount; i++) {
      currentPositions[i * 3] = this.particleData.currentPositions[i * 3];
      currentPositions[i * 3 + 1] = this.particleData.currentPositions[i * 3 + 1];
      currentPositions[i * 3 + 2] = this.particleData.currentPositions[i * 3 + 2];

      currentColors[i * 3] = this.particleData.currentColors[i * 3];
      currentColors[i * 3 + 1] = this.particleData.currentColors[i * 3 + 1];
      currentColors[i * 3 + 2] = this.particleData.currentColors[i * 3 + 2];

      currentSizes[i] = this.particleData.currentSizes[i];
    }

    for (let i = 0; i < count; i++) {
      const armIndex = i % this.armCount;
      const radiusFactor = Math.pow(Math.random(), 0.5);
      const radius = radiusFactor * maxRadius;

      const armAngle = (armIndex / this.armCount) * Math.PI * 2;
      const spiralAngle = radiusFactor * 4.5;
      const baseAngle = armAngle + spiralAngle;

      const widthOffset = (Math.random() - 0.5) * this.params.armWidth * 2;
      const angleOffset = widthOffset * 0.3;

      const finalAngle = baseAngle + angleOffset;
      const finalRadius = radius + widthOffset * 0.5;

      const x = Math.cos(finalAngle) * finalRadius;
      const z = Math.sin(finalAngle) * finalRadius;
      const height = (Math.random() - 0.5) * 0.5 * (1 - radiusFactor * 0.7);

      targetPositions[i * 3] = x;
      targetPositions[i * 3 + 1] = height;
      targetPositions[i * 3 + 2] = z;

      const color = this.getColorForRadius(radiusFactor);
      targetColors[i * 3] = color.r;
      targetColors[i * 3 + 1] = color.g;
      targetColors[i * 3 + 2] = color.b;

      const size = 0.2 + Math.random() * 0.6;
      targetSizes[i] = size;
      radiusFactors[i] = radiusFactor;

      if (i >= minCount) {
        currentPositions[i * 3] = 0;
        currentPositions[i * 3 + 1] = 0;
        currentPositions[i * 3 + 2] = 0;
        currentColors[i * 3] = 0;
        currentColors[i * 3 + 1] = 0;
        currentColors[i * 3 + 2] = 0;
        currentSizes[i] = 0;
      }
    }

    this.particleData = {
      targetPositions,
      targetColors,
      targetSizes,
      currentPositions,
      currentColors,
      currentSizes,
      radiusFactors,
    };

    this.geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(currentColors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(currentSizes, 1));
    this.geometry.setDrawRange(0, count);

    this.selectParticle(-1);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public update(delta: number): void {
    if (!this.particleData) return;

    this.rotationAngle += this.params.rotationSpeed * delta;

    if (this.isTransitioning) {
      this.transitionProgress = Math.min(1, this.transitionProgress + delta / this.transitionDuration);
      if (this.transitionProgress >= 1) {
        this.isTransitioning = false;
        this.transitionProgress = 1;
      }
    }

    const t = this.easeInOutCubic(this.transitionProgress);
    const count = this.params.particleCount;
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    const pd = this.particleData;
    const cosR = Math.cos(this.rotationAngle);
    const sinR = Math.sin(this.rotationAngle);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      let targetX = pd.targetPositions[i3];
      let targetY = pd.targetPositions[i3 + 1];
      let targetZ = pd.targetPositions[i3 + 2];

      const rotX = targetX * cosR - targetZ * sinR;
      const rotZ = targetX * sinR + targetZ * cosR;
      targetX = rotX;
      targetZ = rotZ;

      const cx = pd.currentPositions[i3];
      const cy = pd.currentPositions[i3 + 1];
      const cz = pd.currentPositions[i3 + 2];

      const finalX = cx + (targetX - cx) * t;
      const finalY = cy + (targetY - cy) * t;
      const finalZ = cz + (targetZ - cz) * t;

      positions[i3] = finalX;
      positions[i3 + 1] = finalY;
      positions[i3 + 2] = finalZ;

      const cr = pd.currentColors[i3];
      const cg = pd.currentColors[i3 + 1];
      const cb = pd.currentColors[i3 + 2];

      const tr = pd.targetColors[i3];
      const tg = pd.targetColors[i3 + 1];
      const tb = pd.targetColors[i3 + 2];

      const finalR = cr + (tr - cr) * t;
      const finalG = cg + (tg - cg) * t;
      const finalB = cb + (tb - cb) * t;

      colors[i3] = finalR;
      colors[i3 + 1] = finalG;
      colors[i3 + 2] = finalB;

      const cs = pd.currentSizes[i];
      const ts = pd.targetSizes[i];
      sizes[i] = cs + (ts - cs) * t;

      pd.currentPositions[i3] = finalX;
      pd.currentPositions[i3 + 1] = finalY;
      pd.currentPositions[i3 + 2] = finalZ;
      pd.currentColors[i3] = finalR;
      pd.currentColors[i3 + 1] = finalG;
      pd.currentColors[i3 + 2] = finalB;
      pd.currentSizes[i] = sizes[i];

      if (this.selectedParticle && this.selectedParticle.index === i) {
        this.selectedParticle.position.set(finalX, finalY, finalZ);
        this.highlightSprite.position.set(finalX, finalY, finalZ);
        const baseScale = 0.4 + sizes[i] * 0.8;
        this.highlightSprite.scale.set(baseScale * 2, baseScale * 2, baseScale * 2);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public selectParticle(index: number): void {
    if (!this.particleData) return;

    if (index < 0) {
      this.selectedParticle = null;
      this.highlightSprite.visible = false;
      return;
    }

    if (this.selectedParticle && this.selectedParticle.index === index) {
      this.selectedParticle = null;
      this.highlightSprite.visible = false;
      return;
    }

    const i3 = index * 3;
    const positions = this.geometry.attributes.position.array as Float32Array;

    const colorR = this.particleData.targetColors[i3];
    const colorG = this.particleData.targetColors[i3 + 1];
    const colorB = this.particleData.targetColors[i3 + 2];

    this.selectedParticle = {
      index,
      position: new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      ),
      color: new THREE.Color(colorR, colorG, colorB),
      originalSize: this.particleData.targetSizes[index],
    };

    this.highlightSprite.position.copy(this.selectedParticle.position);
    const baseScale = 0.4 + this.selectedParticle.originalSize * 0.8;
    this.highlightSprite.scale.set(baseScale * 2, baseScale * 2, baseScale * 2);
    this.highlightSprite.visible = true;
  }

  public getParticleWorldPosition(index: number): THREE.Vector3 {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const i3 = index * 3;
    const localPos = new THREE.Vector3(
      positions[i3],
      positions[i3 + 1],
      positions[i3 + 2]
    );
    return localPos.applyMatrix4(this.points.matrixWorld);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.highlightSprite.material instanceof THREE.SpriteMaterial) {
      this.highlightSprite.material.dispose();
      if (this.highlightSprite.material.map) {
        this.highlightSprite.material.map.dispose();
      }
    }
  }
}

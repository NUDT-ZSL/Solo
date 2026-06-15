import * as THREE from 'three';
import {
  SilhouetteState,
  SilhouetteShapeType,
  ParticleData,
  COLOR_PALETTES,
  ALL_PALETTE_KEYS,
  ColorPalette,
  GlobalSettings,
} from './DataModel';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const SILHOUETTE_VERTEX_DATA: Record<SilhouetteShapeType, THREE.Vector2[]> = {
  humanoid: [
    new THREE.Vector2(0, 1.6),
    new THREE.Vector2(0.25, 1.6),
    new THREE.Vector2(0.3, 1.35),
    new THREE.Vector2(0.2, 1.1),
    new THREE.Vector2(0.45, 0.8),
    new THREE.Vector2(0.5, 0.3),
    new THREE.Vector2(0.35, -0.2),
    new THREE.Vector2(0.3, -0.9),
    new THREE.Vector2(0.4, -1.0),
    new THREE.Vector2(0.35, -1.6),
    new THREE.Vector2(0.15, -1.6),
    new THREE.Vector2(0.1, -1.0),
    new THREE.Vector2(0, -0.5),
    new THREE.Vector2(-0.1, -1.0),
    new THREE.Vector2(-0.15, -1.6),
    new THREE.Vector2(-0.35, -1.6),
    new THREE.Vector2(-0.4, -1.0),
    new THREE.Vector2(-0.3, -0.9),
    new THREE.Vector2(-0.35, -0.2),
    new THREE.Vector2(-0.5, 0.3),
    new THREE.Vector2(-0.45, 0.8),
    new THREE.Vector2(-0.2, 1.1),
    new THREE.Vector2(-0.3, 1.35),
    new THREE.Vector2(-0.25, 1.6),
  ],
  bird: [
    new THREE.Vector2(-1.2, 0.05),
    new THREE.Vector2(-1.0, -0.1),
    new THREE.Vector2(-0.7, 0.0),
    new THREE.Vector2(-0.4, -0.15),
    new THREE.Vector2(-0.15, -0.1),
    new THREE.Vector2(0.05, -0.35),
    new THREE.Vector2(0.15, -0.55),
    new THREE.Vector2(0.1, -0.6),
    new THREE.Vector2(0.25, -0.45),
    new THREE.Vector2(0.45, -0.2),
    new THREE.Vector2(0.7, -0.05),
    new THREE.Vector2(1.0, 0.0),
    new THREE.Vector2(1.2, 0.1),
    new THREE.Vector2(1.0, 0.15),
    new THREE.Vector2(0.7, 0.1),
    new THREE.Vector2(0.45, 0.2),
    new THREE.Vector2(0.25, 0.35),
    new THREE.Vector2(0.1, 0.4),
    new THREE.Vector2(0.05, 0.35),
    new THREE.Vector2(-0.15, 0.2),
    new THREE.Vector2(-0.4, 0.15),
    new THREE.Vector2(-0.7, 0.1),
    new THREE.Vector2(-1.0, 0.1),
  ],
  geometric: [
    new THREE.Vector2(0, 1.1),
    new THREE.Vector2(0.5, 0.7),
    new THREE.Vector2(0.9, 0.9),
    new THREE.Vector2(1.0, 0.4),
    new THREE.Vector2(0.7, 0.1),
    new THREE.Vector2(0.95, -0.3),
    new THREE.Vector2(0.6, -0.6),
    new THREE.Vector2(0.3, -0.4),
    new THREE.Vector2(0.0, -0.8),
    new THREE.Vector2(-0.3, -0.4),
    new THREE.Vector2(-0.6, -0.6),
    new THREE.Vector2(-0.95, -0.3),
    new THREE.Vector2(-0.7, 0.1),
    new THREE.Vector2(-1.0, 0.4),
    new THREE.Vector2(-0.9, 0.9),
    new THREE.Vector2(-0.5, 0.7),
  ],
};

const SILHOUETTE_CONFIGS: Array<{
  shapeType: SilhouetteShapeType;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  palette: ColorPalette;
}> = [
  {
    shapeType: 'humanoid',
    position: new THREE.Vector3(-3.5, 0.5, 0),
    rotation: new THREE.Euler(0, 0.3, 0),
    scale: 1.2,
    palette: 'bluePurple',
  },
  {
    shapeType: 'bird',
    position: new THREE.Vector3(2.5, 1.0, -1),
    rotation: new THREE.Euler(0, -0.2, 0.1),
    scale: 1.0,
    palette: 'pinkPurple',
  },
  {
    shapeType: 'geometric',
    position: new THREE.Vector3(0, -0.8, 1),
    rotation: new THREE.Euler(0.1, 0.5, 0),
    scale: 1.3,
    palette: 'goldOrange',
  },
];

export class SilhouetteSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private silhouettes: SilhouetteState[] = [];
  private silhouetteMeshes: Map<string, THREE.Mesh> = new Map();
  private silhouetteGroups: Map<string, THREE.Group> = new Map();
  private glowMeshes: Map<string, THREE.Mesh> = new Map();
  private particles: ParticleData[] = [];
  private particlePoints: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private globalSettings: GlobalSettings = {
    rotationSpeedMultiplier: 1.0,
    particleSpreadMultiplier: 1.0,
  };
  private hoveredId: string | null = null;
  private expandAnimations: Map<string, { startTime: number; duration: number }> = new Map();
  private autoRotationAngles: Map<string, number> = new Map();
  private canvas: HTMLCanvasElement;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.initParticleGeometry();
    this.createSilhouettes();
    this.setupInteraction();
  }

  private initParticleGeometry(): void {
    const maxParticles = 2000;
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);
    const opacities = new Float32Array(maxParticles);

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aOpacity;
        attribute vec3 aColor;
        varying float vOpacity;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vOpacity = aOpacity;
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particlePoints = new THREE.Points(this.particleGeometry, particleMaterial);
    this.scene.add(this.particlePoints);
  }

  private createSilhouettes(): void {
    SILHOUETTE_CONFIGS.forEach((config, index) => {
      const id = `silhouette_${index}`;
      const vertices = SILHOUETTE_VERTEX_DATA[config.shapeType];

      const state: SilhouetteState = {
        id,
        shapeType: config.shapeType,
        vertices,
        position: config.position.clone(),
        rotation: config.rotation.clone(),
        scale: config.scale,
        baseColor: new THREE.Color(0x2a2a3a),
        glowColor: new THREE.Color(0x4a4a6a),
        palette: config.palette,
        isHovered: false,
        isExpanded: false,
        expandProgress: 0,
        rotationSpeed: 0.2,
        particleSpreadSpeed: 1.0,
      };

      this.silhouettes.push(state);
      this.autoRotationAngles.set(id, 0);

      const group = new THREE.Group();
      group.position.copy(config.position);
      group.rotation.copy(config.rotation);
      group.scale.setScalar(config.scale);

      const shape = new THREE.Shape();
      shape.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        shape.lineTo(vertices[i].x, vertices[i].y);
      }
      shape.closePath();

      const shapeGeometry = new THREE.ShapeGeometry(shape);

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uBaseColor: { value: state.baseColor },
          uGlowColor: { value: state.glowColor },
          uGlowIntensity: { value: 0.15 },
          uExpandProgress: { value: 0 },
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vUv = uv;
            vNormal = normal;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uBaseColor;
          uniform vec3 uGlowColor;
          uniform float uGlowIntensity;
          uniform float uExpandProgress;
          uniform float uTime;
          varying vec2 vUv;
          varying vec3 vPosition;
          void main() {
            vec2 center = vec2(0.5);
            float dist = length(vUv - center);

            vec3 color = mix(uBaseColor, uGlowColor, dist * 0.5 + uGlowIntensity);

            float edgeGlow = smoothstep(0.4, 0.5, dist) * (0.3 + uGlowIntensity * 2.0);
            color += uGlowColor * edgeGlow;

            float pulse = sin(uTime * 2.0) * 0.03;
            color += uGlowColor * pulse;

            float alpha = 1.0 - uExpandProgress * 0.6;

            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(shapeGeometry, material);
      mesh.userData.silhouetteId = id;
      group.add(mesh);

      const glowGeometry = new THREE.ShapeGeometry(shape);
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uGlowColor: { value: new THREE.Color(0x6366f1) },
          uIntensity: { value: 0.1 },
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uGlowColor;
          uniform float uIntensity;
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            vec2 center = vec2(0.5);
            float dist = length(vUv - center);
            float glow = smoothstep(0.3, 0.5, dist) * uIntensity;
            float pulse = sin(uTime * 3.0) * 0.02;
            gl_FragColor = vec4(uGlowColor, glow + pulse);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.scale.setScalar(1.05);
      group.add(glowMesh);

      this.scene.add(group);
      this.silhouetteMeshes.set(id, mesh);
      this.silhouetteGroups.set(id, group);
      this.glowMeshes.set(id, glowMesh);
    });
  }

  private setupInteraction(): void {
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('click', this.onClick.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = Array.from(this.silhouetteMeshes.values());
    const intersects = this.raycaster.intersectObjects(meshes, false);

    let newHoveredId: string | null = null;
    if (intersects.length > 0) {
      newHoveredId = intersects[0].object.userData.silhouetteId as string;
    }

    if (newHoveredId !== this.hoveredId) {
      if (this.hoveredId) {
        const state = this.silhouettes.find((s) => s.id === this.hoveredId);
        if (state) state.isHovered = false;
      }
      this.hoveredId = newHoveredId;
      if (this.hoveredId) {
        const state = this.silhouettes.find((s) => s.id === this.hoveredId);
        if (state) state.isHovered = true;
      }
      this.canvas.style.cursor = this.hoveredId ? 'pointer' : 'default';
    }
  }

  private onClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = Array.from(this.silhouetteMeshes.values());
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const id = intersects[0].object.userData.silhouetteId as string;
      const state = this.silhouettes.find((s) => s.id === id);
      if (state && !state.isExpanded) {
        this.triggerExpand(state);
      }
    }
  }

  private triggerExpand(state: SilhouetteState): void {
    state.isExpanded = true;
    state.expandProgress = 0;
    this.expandAnimations.set(state.id, {
      startTime: performance.now(),
      duration: 1500,
    });

    this.spawnParticles(state);
  }

  private spawnParticles(state: SilhouetteState): void {
    const palette = COLOR_PALETTES[state.palette];
    const group = this.silhouetteGroups.get(state.id);
    if (!group) return;

    const worldPosition = new THREE.Vector3();
    group.getWorldPosition(worldPosition);

    const particleCount = 120;
    for (let i = 0; i < particleCount; i++) {
      const vertexIndex = Math.floor(Math.random() * state.vertices.length);
      const vertex = state.vertices[vertexIndex];

      const localPos = new THREE.Vector3(vertex.x, vertex.y, 0);
      const worldPos = localPos.clone().applyMatrix4(group.matrixWorld);

      const color = palette[Math.floor(Math.random() * palette.length)].clone();
      color.offsetHSL(0, -0.1, (Math.random() - 0.5) * 0.1);

      const angle = Math.random() * Math.PI * 2;
      const spread = 0.3 + Math.random() * 0.8;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * spread,
        Math.sin(angle) * spread,
        (Math.random() - 0.5) * 0.3
      );

      this.particles.push({
        position: worldPos,
        velocity,
        color,
        size: 1.5 + Math.random() * 2.5,
        opacity: 0.6 + Math.random() * 0.4,
        life: 0,
        maxLife: 1.0 + Math.random() * 0.8,
        originPosition: worldPos.clone(),
      });
    }

    if (this.particles.length > 2000) {
      this.particles = this.particles.slice(-2000);
    }
  }

  update(time: number, deltaTime: number): void {
    this.updateSilhouettes(time, deltaTime);
    this.updateParticles(deltaTime);
    this.updateParticleGeometry();
  }

  private updateSilhouettes(time: number, deltaTime: number): void {
    for (const state of this.silhouettes) {
      const mesh = this.silhouetteMeshes.get(state.id);
      const glowMesh = this.glowMeshes.get(state.id);
      const group = this.silhouetteGroups.get(state.id);
      if (!mesh || !glowMesh || !group) continue;

      const material = mesh.material as THREE.ShaderMaterial;
      const glowMaterial = glowMesh.material as THREE.ShaderMaterial;

      const targetGlowIntensity = state.isHovered ? 0.5 : 0.15;
      const currentGlow = material.uniforms.uGlowIntensity.value as number;
      material.uniforms.uGlowIntensity.value = THREE.MathUtils.lerp(
        currentGlow,
        targetGlowIntensity,
        0.1
      );

      material.uniforms.uTime.value = time;
      glowMaterial.uniforms.uTime.value = time;

      if (state.isHovered) {
        glowMaterial.uniforms.uIntensity.value = THREE.MathUtils.lerp(
          glowMaterial.uniforms.uIntensity.value as number,
          0.4,
          0.1
        );
      } else {
        glowMaterial.uniforms.uIntensity.value = THREE.MathUtils.lerp(
          glowMaterial.uniforms.uIntensity.value as number,
          0.1,
          0.05
        );
      }

      const anim = this.expandAnimations.get(state.id);
      if (anim && state.isExpanded) {
        const elapsed = performance.now() - anim.startTime;
        const rawProgress = Math.min(elapsed / anim.duration, 1.0);
        state.expandProgress = easeOutCubic(rawProgress);
        material.uniforms.uExpandProgress.value = state.expandProgress;

        const expandScale = 1 + state.expandProgress * 0.3;
        mesh.scale.setScalar(expandScale);
        glowMesh.scale.setScalar(expandScale * 1.05);

        if (rawProgress >= 1.0) {
          this.expandAnimations.delete(state.id);
        }
      }

      const currentAngle = this.autoRotationAngles.get(state.id) || 0;
      const rotSpeed = state.rotationSpeed * this.globalSettings.rotationSpeedMultiplier;
      const newAngle = currentAngle + rotSpeed * deltaTime;
      this.autoRotationAngles.set(state.id, newAngle);

      group.rotation.y = state.rotation.y + Math.sin(newAngle) * 0.15;
      group.rotation.x = state.rotation.x + Math.cos(newAngle * 0.7) * 0.05;
    }
  }

  private updateParticles(deltaTime: number): void {
    const spreadMul = this.globalSettings.particleSpreadMultiplier;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime * spreadMul;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      const lifeRatio = p.life / p.maxLife;

      p.position.x += p.velocity.x * deltaTime * spreadMul;
      p.position.y += p.velocity.y * deltaTime * spreadMul;
      p.position.z += p.velocity.z * deltaTime * spreadMul;

      p.velocity.multiplyScalar(0.98);

      p.opacity = (1 - easeOutCubic(lifeRatio)) * 0.7;
      p.size *= 0.995;
    }
  }

  private updateParticleGeometry(): void {
    if (!this.particleGeometry) return;

    const positions = this.particleGeometry.attributes.position as THREE.BufferAttribute;
    const colors = this.particleGeometry.attributes.aColor as THREE.BufferAttribute;
    const sizes = this.particleGeometry.attributes.aSize as THREE.BufferAttribute;
    const opacities = this.particleGeometry.attributes.aOpacity as THREE.BufferAttribute;

    const maxParticles = 2000;

    for (let i = 0; i < maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        positions.setXYZ(i, p.position.x, p.position.y, p.position.z);
        colors.setXYZ(i, p.color.r, p.color.g, p.color.b);
        sizes.setX(i, p.size);
        opacities.setX(i, p.opacity);
      } else {
        positions.setXYZ(i, 0, 0, -1000);
        sizes.setX(i, 0);
        opacities.setX(i, 0);
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    opacities.needsUpdate = true;

    this.particleGeometry.setDrawRange(0, Math.min(this.particles.length, maxParticles));
  }

  setRotationSpeedMultiplier(value: number): void {
    this.globalSettings.rotationSpeedMultiplier = value;
  }

  setParticleSpreadMultiplier(value: number): void {
    this.globalSettings.particleSpreadMultiplier = value;
  }

  resetSilhouettes(): void {
    for (const state of this.silhouettes) {
      state.isExpanded = false;
      state.expandProgress = 0;
      state.isHovered = false;

      const mesh = this.silhouetteMeshes.get(state.id);
      if (mesh) {
        mesh.scale.setScalar(1);
        const material = mesh.material as THREE.ShaderMaterial;
        material.uniforms.uExpandProgress.value = 0;
        material.uniforms.uGlowIntensity.value = 0.15;
      }

      const glowMesh = this.glowMeshes.get(state.id);
      if (glowMesh) {
        glowMesh.scale.setScalar(1.05);
        const glowMaterial = glowMesh.material as THREE.ShaderMaterial;
        glowMaterial.uniforms.uIntensity.value = 0.1;
      }
    }

    this.expandAnimations.clear();
    this.particles = [];
  }

  dispose(): void {
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('click', this.onClick.bind(this));

    this.silhouetteMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.ShaderMaterial).dispose();
    });
    this.glowMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.ShaderMaterial).dispose();
    });
    this.particleGeometry?.dispose();
    if (this.particlePoints) {
      (this.particlePoints.material as THREE.ShaderMaterial).dispose();
    }
  }
}

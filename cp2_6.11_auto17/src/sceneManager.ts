import * as THREE from 'three';
import {
  COLORS,
  DIMENSIONS,
  TIMING,
  SYMBOL_COUNT,
  PARTICLES,
  CAMERA,
} from './config';

export interface GlyphSymbol {
  id: number;
  group: THREE.Group;
  pathProgress: number;
  spawnDelay: number;
  active: boolean;
  hovered: boolean;
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  curvePath: THREE.CatmullRomCurve3;
  beam?: THREE.Mesh;
}

export interface ParticleData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface ArcData {
  line: THREE.Line;
  progress: number;
  life: number;
  maxLife: number;
  flowOffset: number;
}

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public steleGroup: THREE.Group;
  public baseGroup: THREE.Group;
  public symbolsContainer: THREE.Group;
  public particlesContainer: THREE.Group;
  public arcsContainer: THREE.Group;
  public symbols: GlyphSymbol[] = [];
  public particles: ParticleData[] = [];
  public arcs: ArcData[] = [];
  public steleWidth = 0;
  public steleHeight = 0;
  public edgeGlowMaterials: THREE.Material[] = [];
  public energyMaterials: THREE.Material[] = [];
  public currentRotationY = 0;
  public targetRotationY = 0;
  public currentScale = 1;
  public targetScale = 1;
  public shakeOffset = 0;
  public shakeTime = 0;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.steleGroup = new THREE.Group();
    this.baseGroup = new THREE.Group();
    this.symbolsContainer = new THREE.Group();
    this.particlesContainer = new THREE.Group();
    this.arcsContainer = new THREE.Group();

    this.scene.add(this.steleGroup);
    this.scene.add(this.baseGroup);
    this.scene.add(this.symbolsContainer);
    this.scene.add(this.particlesContainer);
    this.scene.add(this.arcsContainer);

    this.setupLighting();
    this.createStele();
    this.createBase();
    this.createSymbols();
    this.bindEvents();
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 3, 5);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6FA3D9, 0.6);
    rimLight.position.set(-3, -2, -5);
    this.scene.add(rimLight);

    const goldPoint = new THREE.PointLight(0xD4AF37, 0.5, 20);
    goldPoint.position.set(0, 2, 3);
    this.scene.add(goldPoint);
  }

  private createStele(): void {
    this.steleWidth = window.innerWidth * DIMENSIONS.STELE_WIDTH_RATIO / 100;
    this.steleHeight = window.innerHeight * DIMENSIONS.STELE_HEIGHT_RATIO / 100;
    const depth = 0.4;

    const shape = new THREE.Shape();
    const w = this.steleWidth;
    const h = this.steleHeight;
    const r = 0.15;

    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.quadraticCurveTo(w / 4, h / 2 + 0.1, 0, h / 2 + 0.15);
    shape.quadraticCurveTo(-w / 4, h / 2 + 0.1, -w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

    const extrudeSettings = {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
    };

    const bodyGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    bodyGeo.center();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
    gradient.addColorStop(0, '#6a6a75');
    gradient.addColorStop(0.5, '#4a4a55');
    gradient.addColorStop(1, '#5a5a65');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 1024);

    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(30, 30, 40, ${Math.random() * 0.4 + 0.1})`;
      ctx.lineWidth = Math.random() * 2 + 0.5;
      ctx.beginPath();
      let x = Math.random() * 512;
      let y = Math.random() * 1024;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const bodyMat = new THREE.MeshPhysicalMaterial({
      map: texture,
      color: COLORS.STELE_MAIN,
      metalness: 0.1,
      roughness: 0.7,
      transparent: true,
      opacity: 0.92,
      transmission: 0.15,
      thickness: 0.5,
      clearcoat: 0.3,
    });

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.z = -depth / 2;
    this.steleGroup.add(body);

    const edgesGeo = new THREE.EdgesGeometry(bodyGeo, 15);
    const edgeMat = new THREE.LineBasicMaterial({
      color: COLORS.STELE_EDGE,
      transparent: true,
      opacity: 0.6,
    });
    const edges = new THREE.LineSegments(edgesGeo, edgeMat);
    edges.position.z = -depth / 2;
    this.steleGroup.add(edges);

    const glowEdgeShape = new THREE.Shape();
    glowEdgeShape.moveTo(-w / 2 + r, -h / 2);
    glowEdgeShape.lineTo(w / 2 - r, -h / 2);
    glowEdgeShape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    glowEdgeShape.lineTo(w / 2, h / 2 - r);
    glowEdgeShape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    glowEdgeShape.quadraticCurveTo(w / 4, h / 2 + 0.1, 0, h / 2 + 0.15);
    glowEdgeShape.quadraticCurveTo(-w / 4, h / 2 + 0.1, -w / 2 + r, h / 2);
    glowEdgeShape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    glowEdgeShape.lineTo(-w / 2, -h / 2 + r);
    glowEdgeShape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

    const glowPoints = glowEdgeShape.getPoints(200);
    const glowGeo = new THREE.BufferGeometry().setFromPoints(glowPoints);
    const glowMat = new THREE.PointsMaterial({
      color: COLORS.STELE_EDGE,
      size: 0.015,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const glowPointsMesh = new THREE.Points(glowGeo, glowMat);
    glowPointsMesh.position.z = -depth / 2 + 0.01;
    this.edgeGlowMaterials.push(glowMat);
    this.steleGroup.add(glowPointsMesh);

    this.steleGroup.rotation.x = THREE.MathUtils.degToRad(DIMENSIONS.STELE_TILT);
  }

  private createBase(): void {
    const baseRadius = DIMENSIONS.BASE_RADIUS;
    const baseHeight = DIMENSIONS.BASE_HEIGHT;

    const baseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius * 1.2, baseHeight, 64);
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a2a35,
      metalness: 0.6,
      roughness: 0.4,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -this.steleHeight / 2 - baseHeight / 2 - 0.1;
    this.baseGroup.add(base);

    const ringGeo = new THREE.TorusGeometry(baseRadius * 0.85, 0.03, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.ENERGY_BRIGHT,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -this.steleHeight / 2 - baseHeight + 0.02;
    this.energyMaterials.push(ringMat);
    this.baseGroup.add(ring);

    const lineCount = 8;
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      const segments = 30;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const r = baseRadius * (1 - t * 0.5);
        const x = Math.cos(angle + t * 0.3) * r;
        const y = -this.steleHeight / 2 - baseHeight + t * (this.steleHeight * 0.6);
        const z = Math.sin(angle + t * 0.3) * r;
        points.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const curvePoints = curve.getPoints(60);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);

      const colors: number[] = [];
      for (let j = 0; j <= 60; j++) {
        const t = j / 60;
        const c = new THREE.Color(COLORS.ENERGY_DEEP).lerp(
          new THREE.Color(COLORS.ENERGY_BRIGHT),
          t
        );
        colors.push(c.r, c.g, c.b);
      }
      lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const lineMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      this.baseGroup.add(line);
    }
  }

  private createGlyphShape(seed: number): THREE.Shape {
    const shape = new THREE.Shape();
    const rand = (min: number, max: number) => {
      const x = Math.sin(seed * 12.9898 + min * 78.233 + max * 37.719) * 43758.5453;
      return min + (x - Math.floor(x)) * (max - min);
    };

    const segCount = Math.floor(rand(3, 6));
    const scale = 0.35;

    let startX = rand(-1, 1) * scale;
    let startY = rand(-1, 1) * scale;
    shape.moveTo(startX, startY);

    let cx = startX;
    let cy = startY;

    for (let i = 0; i < segCount; i++) {
      const isArc = rand(0, 1) > 0.4;
      if (isArc) {
        const endX = rand(-1, 1) * scale;
        const endY = rand(-1, 1) * scale;
        const cpX = rand(-1.5, 1.5) * scale;
        const cpY = rand(-1.5, 1.5) * scale;
        shape.quadraticCurveTo(cpX, cpY, endX, endY);
        cx = endX;
        cy = endY;
      } else {
        const endX = rand(-1, 1) * scale;
        const endY = rand(-1, 1) * scale;
        shape.lineTo(endX, endY);
        cx = endX;
        cy = endY;
      }
    }

    if (rand(0, 1) > 0.5) {
      shape.lineTo(startX, startY);
    }

    return shape;
  }

  private createSymbols(): void {
    for (let i = 0; i < SYMBOL_COUNT; i++) {
      const glyphShape = this.createGlyphShape(i + 1);
      const extrudeSettings = { depth: 0.02, bevelEnabled: false };
      const geo = new THREE.ExtrudeGeometry(glyphShape, extrudeSettings);
      geo.center();

      const mat = new THREE.MeshBasicMaterial({
        color: COLORS.SYMBOL_BASE,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { symbolId: i };

      const glowGeo = geo.clone();
      const glowMat = new THREE.MeshBasicMaterial({
        color: COLORS.SYMBOL_BASE,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.scale.set(2, 2, 2);

      const group = new THREE.Group();
      group.add(glowMesh);
      group.add(mesh);

      const points: THREE.Vector3[] = [];
      const startX = (Math.random() - 0.5) * this.steleWidth * 0.6;
      const endX = startX + (Math.random() - 0.5) * this.steleWidth * 0.3;
      const cpX = (startX + endX) / 2 + (Math.random() - 0.5) * this.steleWidth * 0.4;
      const cpY = 0;

      points.push(new THREE.Vector3(startX, -this.steleHeight * 0.5, 0.05));
      points.push(new THREE.Vector3(cpX, cpY, 0.05));
      points.push(new THREE.Vector3(endX, this.steleHeight * 0.5, 0.05));

      const curve = new THREE.CatmullRomCurve3(points);

      const symbol: GlyphSymbol = {
        id: i,
        group,
        pathProgress: 0,
        spawnDelay: Math.random() * 3,
        active: false,
        hovered: false,
        basePosition: new THREE.Vector3(),
        currentPosition: new THREE.Vector3(),
        curvePath: curve,
      };

      this.symbols.push(symbol);
      this.symbolsContainer.add(group);
    }
  }

  public spawnResonanceParticles(): void {
    const colors = [0xff6b35, 0xffd93d, 0xff9f1c, 0xff4757, 0xffa502, 0xff6348];

    for (let i = 0; i < PARTICLES.RESONANCE_COUNT; i++) {
      if (this.particles.length >= PARTICLES.MAX_TOTAL) break;

      const size = (PARTICLES.MIN_SIZE + Math.random() * (PARTICLES.MAX_SIZE - PARTICLES.MIN_SIZE)) / 100;
      const geo = new THREE.SphereGeometry(size, 8, 8);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(
        (Math.random() - 0.5) * 0.3,
        this.steleHeight / 2,
        (Math.random() - 0.5) * 0.3
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.04;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        0.01 + Math.random() * 0.03,
        Math.sin(angle) * speed
      );

      this.particles.push({
        mesh,
        velocity,
        life: TIMING.PARTICLE_DURATION,
        maxLife: TIMING.PARTICLE_DURATION,
      });
      this.particlesContainer.add(mesh);
    }
  }

  public createArc(symbols: GlyphSymbol[]): void {
    for (let i = 0; i < symbols.length - 1; i++) {
      const start = symbols[i].currentPosition.clone();
      const end = symbols[i + 1].currentPosition.clone();
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mid.y += 0.8;
      mid.z -= 0.3;

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(100);
      const geo = new THREE.BufferGeometry().setFromPoints(points);

      const colors: number[] = [];
      const rainbow = [
        new THREE.Color(0xff0000),
        new THREE.Color(0xff7f00),
        new THREE.Color(0xffff00),
        new THREE.Color(0x00ff00),
        new THREE.Color(0x0000ff),
        new THREE.Color(0x4b0082),
        new THREE.Color(0x9400d3),
      ];
      for (let j = 0; j <= 100; j++) {
        const idx = Math.floor((j / 100) * (rainbow.length - 1));
        const t = (j / 100) * (rainbow.length - 1) - idx;
        const c = rainbow[idx].clone().lerp(rainbow[Math.min(idx + 1, rainbow.length - 1)], t);
        colors.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 1,
        linewidth: 2,
        blending: THREE.AdditiveBlending,
      });

      const line = new THREE.Line(geo, mat);
      this.arcsContainer.add(line);

      this.arcs.push({
        line,
        progress: 0,
        life: TIMING.ARC_DURATION,
        maxLife: TIMING.ARC_DURATION,
        flowOffset: 0,
      });
    }
  }

  public createBeam(symbol: GlyphSymbol): void {
    if (symbol.beam) return;

    const height = DIMENSIONS.BEAM_HEIGHT / 100;
    const geo = new THREE.CylinderGeometry(0.01, 0.04, height, 16, 1, true);
    geo.translate(0, height / 2, 0);

    const mat = new THREE.MeshBasicMaterial({
      color: COLORS.LIGHT_BEAM,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const beam = new THREE.Mesh(geo, mat);
    beam.position.copy(symbol.currentPosition);
    beam.position.y += 0.05;
    symbol.beam = beam;
    this.symbolsContainer.add(beam);
  }

  public triggerShake(): void {
    this.shakeTime = TIMING.SHAKE_DURATION;
  }

  public pickSymbol(clientX: number, clientY: number): GlyphSymbol | null {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes: THREE.Object3D[] = [];
    for (const sym of this.symbols) {
      if (sym.group.visible) {
        sym.group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshes.push(child);
          }
        });
      }
    }

    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !('userData' in obj && obj.userData.symbolId !== undefined)) {
        obj = obj.parent;
      }
      const id = (obj as any).userData?.symbolId;
      if (id !== undefined) {
        return this.symbols[id];
      }
    }
    return null;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public setHoveredSymbol(symbol: GlyphSymbol | null): void {
    for (const s of this.symbols) {
      const wasHovered = s.hovered;
      s.hovered = (s === symbol);

      s.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshBasicMaterial;
          if (s.hovered) {
            mat.color.setHex(COLORS.SYMBOL_HOVER);
            child.scale.setScalar(1.3);
          } else if (!s.active) {
            mat.color.setHex(COLORS.SYMBOL_BASE);
            child.scale.setScalar(1);
          } else {
            mat.color.setHex(COLORS.SYMBOL_HOVER);
            child.scale.setScalar(1.15);
          }
        }
      });
    }
  }

  public update(delta: number, elapsed: number): void {
    const breath = 0.5 + 0.5 * Math.sin((elapsed / TIMING.EDGE_BREATH_PERIOD) * Math.PI * 2);
    for (const mat of this.edgeGlowMaterials) {
      (mat as THREE.MeshBasicMaterial | THREE.PointsMaterial).opacity = 0.4 + breath * 0.6;
    }
    for (const mat of this.energyMaterials) {
      (mat as THREE.MeshBasicMaterial).opacity = 0.5 + breath * 0.5;
    }

    for (const symbol of this.symbols) {
      if (symbol.spawnDelay > 0) {
        symbol.spawnDelay -= delta;
        symbol.group.visible = false;
        continue;
      }

      if (!symbol.active) {
        symbol.pathProgress += delta * 0.15;
        if (symbol.pathProgress >= 1) {
          symbol.pathProgress = 0;
          symbol.spawnDelay = TIMING.SYMBOL_MIN_INTERVAL +
            Math.random() * (TIMING.SYMBOL_MAX_INTERVAL - TIMING.SYMBOL_MIN_INTERVAL);
          continue;
        }

        const pos = symbol.curvePath.getPoint(symbol.pathProgress);
        symbol.currentPosition.copy(pos);
        symbol.group.position.copy(pos);

        const opacity = symbol.pathProgress < 0.1
          ? symbol.pathProgress * 10
          : symbol.pathProgress > 0.9
            ? (1 - symbol.pathProgress) * 10
            : 1;

        symbol.group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            (child.material as THREE.MeshBasicMaterial).opacity = opacity * (symbol.hovered ? 1 : 0.85);
          }
        });
        symbol.group.visible = true;
      } else {
        symbol.group.position.copy(symbol.currentPosition);
      }

      if (symbol.beam) {
        symbol.beam.position.copy(symbol.currentPosition);
        symbol.beam.position.y += 0.05;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.particlesContainer.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.mesh.position.add(p.velocity);
      p.velocity.y -= 0.0005;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife;
    }

    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const arc = this.arcs[i];
      arc.life -= delta;
      arc.flowOffset += delta * TIMING.ARC_SPEED / 100;
      if (arc.life <= 0) {
        this.arcsContainer.remove(arc.line);
        arc.line.geometry.dispose();
        (arc.line.material as THREE.Material).dispose();
        this.arcs.splice(i, 1);
        continue;
      }
      (arc.line.material as THREE.LineBasicMaterial).opacity =
        Math.min(1, arc.life / arc.maxLife * 2);
    }

    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.08;
    this.currentScale += (this.targetScale - this.currentScale) * 0.08;

    let shakeX = 0;
    if (this.shakeTime > 0) {
      this.shakeTime -= delta * 1000;
      const shakeAmt = (this.shakeTime / TIMING.SHAKE_DURATION) * TIMING.SHAKE_INTENSITY / 100;
      shakeX = (Math.random() - 0.5) * 2 * shakeAmt;
    }

    this.steleGroup.rotation.y = this.currentRotationY;
    this.steleGroup.scale.setScalar(this.currentScale);
    this.steleGroup.position.x = shakeX;

    this.baseGroup.rotation.y = this.currentRotationY;
    this.baseGroup.scale.setScalar(this.currentScale);
    this.baseGroup.position.x = shakeX;

    this.symbolsContainer.rotation.y = this.currentRotationY;
    this.symbolsContainer.scale.setScalar(this.currentScale);
    this.symbolsContainer.position.x = shakeX;

    this.particlesContainer.rotation.y = this.currentRotationY;
    this.particlesContainer.scale.setScalar(this.currentScale);

    this.arcsContainer.rotation.y = this.currentRotationY;
    this.arcsContainer.scale.setScalar(this.currentScale);
    this.arcsContainer.position.x = shakeX;

    this.renderer.render(this.scene, this.camera);
  }

  public addRotation(delta: number): void {
    this.targetRotationY = THREE.MathUtils.clamp(
      this.targetRotationY + delta,
      CAMERA.MIN_ROTATION,
      CAMERA.MAX_ROTATION
    );
  }

  public addScale(delta: number): void {
    this.targetScale = THREE.MathUtils.clamp(
      this.targetScale + delta,
      CAMERA.MIN_SCALE,
      CAMERA.MAX_SCALE
    );
  }
}

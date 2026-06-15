import * as THREE from 'three';
import { ParticleSystem, LayerType, ParticleData } from './ParticleSystem';

export interface OceanSceneConfig {
  shallowCount: number;
  midCount: number;
  deepCount: number;
  boundsX: number;
  boundsZ: number;
  minDepth: number;
  maxDepth: number;
}

export interface ParticleInfo {
  layer: LayerType;
  name: string;
  depthRange: string;
  position: THREE.Vector3;
  count: number;
  index: number;
}

export interface EscapePulse {
  position: THREE.Vector3;
  frame: number;
  mesh: THREE.Mesh;
}

export class OceanScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  private shallowSystem: ParticleSystem;
  private midSystem: ParticleSystem;
  private deepSystem: ParticleSystem;

  private speedMultiplier: number = 1;
  private frame: number = 0;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private selectedLayer: LayerType | null = null;
  private selectedIndex: number = -1;
  private highlightRing: THREE.Line | null = null;

  private oceanSurface: THREE.Mesh;
  private oceanGeometry: THREE.PlaneGeometry;
  private oceanOriginalPositions: Float32Array;

  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;

  private escapePulses: EscapePulse[] = [];

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    config: OceanSceneConfig
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 20, 10);
    this.scene.add(this.directionalLight);

    this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.008);

    this.shallowSystem = new ParticleSystem({
      count: config.shallowCount,
      layer: 'shallow',
      yMin: -10,
      yMax: 0,
      behavior: 'wander',
      colorStart: new THREE.Color(0x3fdb5a),
      colorEnd: new THREE.Color(0x1a8a3a),
      boundsX: config.boundsX,
      boundsZ: config.boundsZ,
    });

    this.midSystem = new ParticleSystem({
      count: config.midCount,
      layer: 'mid',
      yMin: -20,
      yMax: -10,
      behavior: 'wander',
      colorStart: new THREE.Color(0x2a7aff),
      colorEnd: new THREE.Color(0x1a3a7a),
      boundsX: config.boundsX,
      boundsZ: config.boundsZ,
    });

    this.deepSystem = new ParticleSystem({
      count: config.deepCount,
      layer: 'deep',
      yMin: -30,
      yMax: -20,
      behavior: 'chase',
      colorStart: new THREE.Color(0x1a2a5a),
      colorEnd: new THREE.Color(0x0a1a3a),
      boundsX: config.boundsX,
      boundsZ: config.boundsZ,
    });

    this.scene.add(this.shallowSystem.points);
    this.scene.add(this.midSystem.points);
    this.scene.add(this.deepSystem.points);

    this.oceanGeometry = new THREE.PlaneGeometry(80, 80, 20, 20);
    this.oceanGeometry.rotateX(-Math.PI / 2);

    const posAttr = this.oceanGeometry.getAttribute('position') as THREE.BufferAttribute;
    this.oceanOriginalPositions = new Float32Array(posAttr.array as Float32Array);

    const oceanMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a6b6b,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      shininess: 30,
      depthWrite: false,
    });

    this.oceanSurface = new THREE.Mesh(this.oceanGeometry, oceanMaterial);
    this.oceanSurface.position.y = 0.5;
    this.scene.add(this.oceanSurface);

    this.addBoundaryPlanes(config);
  }

  private addBoundaryPlanes(config: OceanSceneConfig): void {
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x1a6b6b,
      transparent: true,
      opacity: 0.15,
    });

    const shallowPlane = new THREE.PlaneGeometry(config.boundsX * 2, config.boundsZ * 2);
    shallowPlane.rotateX(-Math.PI / 2);
    const shallowEdges = new THREE.EdgesGeometry(shallowPlane);
    const shallowLine = new THREE.LineSegments(shallowEdges, edgeMaterial);
    shallowLine.position.y = 0;
    this.scene.add(shallowLine);

    const mid1Plane = new THREE.PlaneGeometry(config.boundsX * 2, config.boundsZ * 2);
    mid1Plane.rotateX(-Math.PI / 2);
    const mid1Edges = new THREE.EdgesGeometry(mid1Plane);
    const mid1Line = new THREE.LineSegments(mid1Edges, edgeMaterial);
    mid1Line.position.y = -10;
    this.scene.add(mid1Line);

    const mid2Plane = new THREE.PlaneGeometry(config.boundsX * 2, config.boundsZ * 2);
    mid2Plane.rotateX(-Math.PI / 2);
    const mid2Edges = new THREE.EdgesGeometry(mid2Plane);
    const mid2Line = new THREE.LineSegments(mid2Edges, edgeMaterial);
    mid2Line.position.y = -20;
    this.scene.add(mid2Line);

    const deepPlane = new THREE.PlaneGeometry(config.boundsX * 2, config.boundsZ * 2);
    deepPlane.rotateX(-Math.PI / 2);
    const deepEdges = new THREE.EdgesGeometry(deepPlane);
    const deepLine = new THREE.LineSegments(deepEdges, edgeMaterial);
    deepLine.position.y = -30;
    this.scene.add(deepLine);

    const verticalMaterial = new THREE.LineBasicMaterial({
      color: 0x1a6b6b,
      transparent: true,
      opacity: 0.1,
    });

    const corners = [
      [-config.boundsX, -config.boundsZ],
      [config.boundsX, -config.boundsZ],
      [config.boundsX, config.boundsZ],
      [-config.boundsX, config.boundsZ],
    ];

    for (const [cx, cz] of corners) {
      const points: THREE.Vector3[] = [];
      points.push(new THREE.Vector3(cx, 0, cz));
      points.push(new THREE.Vector3(cx, -30, cz));
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, verticalMaterial);
      this.scene.add(line);
    }
  }

  public update(delta: number): void {
    this.frame++;

    this.shallowSystem.update(delta, this.speedMultiplier, this.frame);
    this.midSystem.update(delta, this.speedMultiplier, this.frame);
    this.deepSystem.update(delta, this.speedMultiplier, this.frame, this.midSystem.particles);

    this.updateOceanSurface();
    this.updateEscapePulses();

    if (this.selectedLayer !== null && this.selectedIndex >= 0) {
      const sys = this.getSystemByLayer(this.selectedLayer);
      if (sys && this.highlightRing) {
        const pos = sys.getParticlePosition(this.selectedIndex);
        this.highlightRing.position.copy(pos);
        this.highlightRing.rotation.y += 0.01;
      }
    }
  }

  private updateOceanSurface(): void {
    const posAttr = this.oceanGeometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const time = this.frame * 0.02;

    for (let i = 0; i < positions.length; i += 3) {
      const x = this.oceanOriginalPositions[i];
      const z = this.oceanOriginalPositions[i + 2];
      const waveY = Math.sin(x * 0.3 + time) * 0.3 + Math.cos(z * 0.3 + time * 0.7) * 0.15;
      positions[i + 1] = waveY;
    }

    posAttr.needsUpdate = true;
    this.oceanGeometry.computeVertexNormals();
  }

  private updateEscapePulses(): void {
    const allPulses = [
      ...this.midSystem.getEscapePulses(),
      ...this.shallowSystem.getEscapePulses(),
    ];

    for (const pulse of allPulses) {
      const exists = this.escapePulses.some(
        (ep) =>
          Math.abs(ep.position.x - pulse.position.x) < 0.5 &&
          Math.abs(ep.position.y - pulse.position.y) < 0.5 &&
          Math.abs(ep.position.z - pulse.position.z) < 0.5
      );

      if (!exists && pulse.frame === 1) {
        const geo = new THREE.RingGeometry(0.1, 0.3, 32);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x4a8aff,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pulse.position);
        mesh.lookAt(this.camera.position);
        this.scene.add(mesh);

        this.escapePulses.push({
          position: pulse.position.clone(),
          frame: 0,
          mesh,
        });
      }
    }

    for (let i = this.escapePulses.length - 1; i >= 0; i--) {
      const ep = this.escapePulses[i];
      ep.frame++;

      const t = ep.frame / 10;
      const scale = 1 + t * 8;
      ep.mesh.scale.set(scale, scale, 1);
      (ep.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
      ep.mesh.lookAt(this.camera.position);

      if (ep.frame >= 10) {
        this.scene.remove(ep.mesh);
        (ep.mesh.geometry as THREE.RingGeometry).dispose();
        (ep.mesh.material as THREE.MeshBasicMaterial).dispose();
        this.escapePulses.splice(i, 1);
      }
    }
  }

  public setSpeedMultiplier(speed: number): void {
    this.speedMultiplier = speed;
  }

  public toggleLayerVisibility(layer: LayerType): boolean {
    const system = this.getSystemByLayer(layer);
    if (system) {
      const newVisible = !system.getVisible();
      system.setVisible(newVisible);
      return newVisible;
    }
    return false;
  }

  public setLayerVisibility(layer: LayerType, visible: boolean): void {
    const system = this.getSystemByLayer(layer);
    if (system) {
      system.setVisible(visible);
    }
  }

  private getSystemByLayer(layer: LayerType): ParticleSystem | null {
    switch (layer) {
      case 'shallow':
        return this.shallowSystem;
      case 'mid':
        return this.midSystem;
      case 'deep':
        return this.deepSystem;
      default:
        return null;
    }
  }

  public handleClick(clientX: number, clientY: number, rect: DOMRect): ParticleInfo | null {
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.selectedLayer !== null && this.selectedIndex >= 0) {
      const sys = this.getSystemByLayer(this.selectedLayer);
      if (sys) {
        sys.resetParticle(this.selectedIndex);
      }
      this.removeHighlightRing();
      this.selectedLayer = null;
      this.selectedIndex = -1;
    }

    const systems: { system: ParticleSystem; layer: LayerType }[] = [
      { system: this.shallowSystem, layer: 'shallow' },
      { system: this.midSystem, layer: 'mid' },
      { system: this.deepSystem, layer: 'deep' },
    ];

    for (const { system, layer } of systems) {
      if (!system.getVisible()) continue;

      const intersects = this.raycaster.intersectObject(system.points);
      if (intersects.length > 0) {
        const idx = intersects[0].index ?? -1;
        if (idx >= 0) {
          system.highlightParticle(idx);
          this.selectedLayer = layer;
          this.selectedIndex = idx;
          this.createHighlightRing(system.getParticlePosition(idx));

          const pos = system.getParticlePosition(idx);
          const layerInfo = this.getLayerInfo(layer);
          return {
            layer,
            name: layerInfo.name,
            depthRange: layerInfo.depthRange,
            position: pos,
            count: system.config.count,
            index: idx,
          };
        }
      }
    }

    return null;
  }

  private createHighlightRing(position: THREE.Vector3): void {
    const geo = new THREE.TorusGeometry(8, 0.05, 8, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4a8aff,
      transparent: true,
      opacity: 0.4,
      wireframe: true,
    });
    this.highlightRing = new THREE.LineSegments(new THREE.WireframeGeometry(geo), mat);
    this.highlightRing.position.copy(position);
    this.scene.add(this.highlightRing);
  }

  private removeHighlightRing(): void {
    if (this.highlightRing) {
      this.scene.remove(this.highlightRing);
      (this.highlightRing.geometry as THREE.BufferGeometry).dispose();
      (this.highlightRing.material as THREE.MeshBasicMaterial).dispose();
      this.highlightRing = null;
    }
  }

  private getLayerInfo(layer: LayerType): { name: string; depthRange: string } {
    switch (layer) {
      case 'shallow':
        return { name: '磷虾 (Krill)', depthRange: '0 ~ -10 单位' };
      case 'mid':
        return { name: '水母 (Jellyfish)', depthRange: '-10 ~ -20 单位' };
      case 'deep':
        return { name: '鲨鱼 (Shark)', depthRange: '-20 ~ -30 单位' };
      default:
        return { name: '未知', depthRange: '-' };
    }
  }

  public getLayerName(layer: LayerType): string {
    return this.getLayerInfo(layer).name;
  }

  public dispose(): void {
    this.shallowSystem.dispose();
    this.midSystem.dispose();
    this.deepSystem.dispose();
    this.removeHighlightRing();

    this.oceanGeometry.dispose();
    (this.oceanSurface.material as THREE.Material).dispose();

    for (const ep of this.escapePulses) {
      this.scene.remove(ep.mesh);
      ep.mesh.geometry.dispose();
      (ep.mesh.material as THREE.Material).dispose();
    }
  }
}

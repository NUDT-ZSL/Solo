import * as THREE from 'three';
import { BuildingGenerator } from '@/building/BuildingGenerator';
import { ToolControls } from '@/interaction/ToolControls';
import { TimeCycle } from '@/environment/TimeCycle';
import { ConfigPanel } from '@/ui/ConfigPanel';
import { eventBus } from '@/core/EventBus';

class SkylineSculptApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private buildingGenerator: BuildingGenerator;
  private toolControls: ToolControls;
  private timeCycle: TimeCycle;
  private configPanel: ConfigPanel;
  private clock: THREE.Clock;
  private buildingGroup: THREE.Group;
  private ground: THREE.Mesh;

  constructor() {
    this.clock = new THREE.Clock();
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(150, 120, 150);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.buildingGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);

    this.ground = this.createGround();
    this.scene.add(this.ground);

    this.buildingGenerator = new BuildingGenerator(this.scene, this.buildingGroup);
    this.toolControls = new ToolControls(this.camera, this.renderer.domElement, this.scene);
    this.timeCycle = new TimeCycle(this.scene, this.camera, this.renderer, this.buildingGroup);
    this.timeCycle.setBuildingGenerator(this.buildingGenerator);

    this.configPanel = new ConfigPanel(document.getElementById('app')!);

    this.setupEventListeners();
    this.init();
  }

  private createGround(): THREE.Mesh {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    return ground;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    eventBus.on('action:export', () => {
      this.exportSkylineSVG();
    });
  }

  private init(): void {
    this.buildingGenerator.generate({
      density: 0.5,
      minHeight: 50,
      maxHeight: 200,
      randomness: 0.3
    });
    this.animate();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private exportSkylineSVG(): void {
    const buildingGroups = this.buildingGenerator.getBuildingGroups();
    if (buildingGroups.length === 0) return;

    const width = 512;
    const height = 256;
    const margin = 20;

    let minX = Infinity;
    let maxX = -Infinity;
    let maxH = 0;

    const silhouettes: Array<{
      x: number;
      w: number;
      h: number;
      roofStyle: string;
    }> = [];

    buildingGroups.forEach((group) => {
      const worldPos = new THREE.Vector3();
      group.getWorldPosition(worldPos);

      const bbox = new THREE.Box3().setFromObject(group);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      const x = worldPos.x;
      const w = size.x;
      const h = size.y;
      const roofStyle = group.userData.buildingData?.roofStyle || 'flat';

      silhouettes.push({ x, w, h, roofStyle });

      if (x - w / 2 < minX) minX = x - w / 2;
      if (x + w / 2 > maxX) maxX = x + w / 2;
      if (h > maxH) maxH = h;
    });

    silhouettes.sort((a, b) => a.x - b.x);

    const rangeX = maxX - minX || 1;
    const scaleX = (width - margin * 2) / rangeX;
    const scaleY = maxH > 0 ? (height - margin * 2) / maxH : 1;

    const timeHour = this.timeCycle.getCurrentHour();
    let skyTop = '#1a1a2e';
    let skyBot = '#4a4a6e';
    if (timeHour >= 5 && timeHour < 8) {
      skyTop = '#ff9a3c';
      skyBot = '#ffcc80';
    } else if (timeHour >= 8 && timeHour < 17) {
      skyTop = '#4a8ecc';
      skyBot = '#87ceeb';
    } else if (timeHour >= 17 && timeHour < 20) {
      skyTop = '#8b5cf6';
      skyBot = '#c084fc';
    }

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    svg += `<defs>`;
    svg += `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">`;
    svg += `<stop offset="0%" stop-color="${skyTop}"/>`;
    svg += `<stop offset="100%" stop-color="${skyBot}"/>`;
    svg += `</linearGradient>`;
    svg += `</defs>`;
    svg += `<rect width="100%" height="100%" fill="url(#sky)"/>`;

    silhouettes.forEach((s) => {
      const x = margin + (s.x - s.w / 2 - minX) * scaleX;
      const w = Math.max(s.w * scaleX, 1);
      const h = s.h * scaleY;
      const y = height - margin - h;

      svg += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="#0f0f1a" opacity="0.9"/>`;

      if (s.roofStyle === 'spire') {
        const cx = x + w / 2;
        const spireH = h * 0.15;
        svg += `<polygon points="${cx.toFixed(2)},${(y - spireH).toFixed(2)} ${(x + w * 0.7).toFixed(2)},${y.toFixed(2)} ${(x + w * 0.3).toFixed(2)},${y.toFixed(2)}" fill="#0f0f1a" opacity="0.9"/>`;
      } else if (s.roofStyle === 'dome') {
        const cx = x + w / 2;
        const ry = h * 0.08;
        svg += `<ellipse cx="${cx.toFixed(2)}" cy="${y.toFixed(2)}" rx="${(w / 2).toFixed(2)}" ry="${ry.toFixed(2)}" fill="#0f0f1a" opacity="0.9"/>`;
      } else if (s.roofStyle === 'slope') {
        const cx = x + w / 2;
        const slopeH = h * 0.1;
        svg += `<polygon points="${cx.toFixed(2)},${(y - slopeH).toFixed(2)} ${(x + w).toFixed(2)},${y.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}" fill="#0f0f1a" opacity="0.9"/>`;
      }
    });

    svg += `<line x1="${margin}" y1="${height - margin}" x2="${width - margin}" y2="${height - margin}" stroke="#1a1a2e" stroke-width="1" opacity="0.5"/>`;
    svg += `</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'skyline.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();
    this.toolControls.update(delta);
    this.timeCycle.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

new SkylineSculptApp();

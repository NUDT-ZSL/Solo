import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ProcessedCountry, FilterConfig } from './data-processor';

interface BubbleUserData {
  code: string;
  country: ProcessedCountry;
}

interface TradeLineUserData {
  fromCode: string;
  toCode: string;
}

interface BubbleObject {
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  baseScale: number;
  visible: boolean;
  targetOpacity: number;
}

const DEFAULT_LINE_COLOR = 0xa78bfa;
const HIGHLIGHT_LINE_COLOR = 0xf59e0b;
const DEFAULT_LINE_OPACITY = 0.15;
const HIGHLIGHT_LINE_OPACITY = 0.6;
const DIM_LINE_OPACITY = 0.05;

export interface BubbleStatusInfo {
  name: string;
  level: string;
  emission: number;
}

export class BubbleManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private bubbles: Map<string, BubbleObject>;
  private tradeLines: THREE.Line[];
  private bubbleMeshes: THREE.Mesh[];

  private hoveredCode: string | null;
  private selectedCode: string | null;
  private allData: ProcessedCountry[];
  private filteredData: ProcessedCountry[];
  private filterAnimating: boolean;
  private animationProgress: number;
  private filterState: 'idle' | 'fadeOut' | 'fadeIn';

  private pointerDownPos: { x: number; y: number } | null;
  private static readonly CLICK_THRESHOLD = 5;

  private onStatusUpdate?: (info: BubbleStatusInfo | null) => void;
  private containerElement: HTMLElement;
  private clock: THREE.Clock;
  private animationFrameId: number;

  private defaultCameraPosition: THREE.Vector3;
  private defaultTarget: THREE.Vector3;

  constructor(container: HTMLElement, statusCallback?: (info: BubbleStatusInfo | null) => void) {
    this.containerElement = container;
    this.onStatusUpdate = statusCallback;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0f1a);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 18);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 25;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.bubbles = new Map();
    this.tradeLines = [];
    this.bubbleMeshes = [];

    this.hoveredCode = null;
    this.selectedCode = null;
    this.allData = [];
    this.filteredData = [];
    this.filterAnimating = false;
    this.animationProgress = 0;
    this.filterState = 'idle';
    this.pointerDownPos = null;

    this.clock = new THREE.Clock();
    this.animationFrameId = 0;

    this.defaultCameraPosition = this.camera.position.clone();
    this.defaultTarget = new THREE.Vector3(0, 0, 0);

    this.setupLights();
    this.addEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(10, 15, 10);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x8b5cf6, 0.3);
    directionalLight2.position.set(-10, -5, -8);
    this.scene.add(directionalLight2);

    const hemisphereLight = new THREE.HemisphereLight(0x2dd4bf, 0xf43f5e, 0.15);
    this.scene.add(hemisphereLight);
  }

  private addEventListeners(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('resize', this.onResize);
  }

  private onPointerMove = (event: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private onPointerDown = (event: PointerEvent): void => {
    this.pointerDownPos = { x: event.clientX, y: event.clientY };
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.pointerDownPos) return;
    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.pointerDownPos = null;

    if (dist > BubbleManager.CLICK_THRESHOLD) return;

    if (this.hoveredCode) {
      this.selectedCode = this.hoveredCode;
      const evt = new CustomEvent('BubbleSelected', { detail: { code: this.hoveredCode } });
      window.dispatchEvent(evt);
    }
  };

  private onPointerLeave = (): void => {
    this.clearHover();
  };

  private onResize = (): void => {
    const width = this.containerElement.clientWidth;
    const height = this.containerElement.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  loadCountries(data: ProcessedCountry[]): void {
    this.allData = data;
    this.filteredData = [...data];
    this.createBubbles(data);
    this.createTradeLines(data);
  }

  private createBubbles(data: ProcessedCountry[]): void {
    this.clearBubbles();

    for (const country of data) {
      const geometry = new THREE.SphereGeometry(country.emissionRadius, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: country.color,
        transparent: true,
        opacity: 1,
        shininess: 60,
        specular: 0x444466,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(country.position.x, country.position.y, country.position.z);
      (mesh.userData as BubbleUserData).code = country.code;
      (mesh.userData as BubbleUserData).country = country;

      const ringGeo = new THREE.RingGeometry(
        country.emissionRadius * 2.2,
        country.emissionRadius * 2.5,
        64,
      );
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(mesh.position);
      ring.lookAt(0, 0, 0);

      this.scene.add(mesh);
      this.scene.add(ring);

      this.bubbles.set(country.code, {
        mesh,
        ring,
        baseScale: 1,
        visible: true,
        targetOpacity: 1,
      });
      this.bubbleMeshes.push(mesh);
    }
  }

  private clearBubbles(): void {
    for (const [, bubble] of this.bubbles) {
      this.scene.remove(bubble.mesh);
      this.scene.remove(bubble.ring);
      bubble.mesh.geometry.dispose();
      (bubble.mesh.material as THREE.Material).dispose();
      bubble.ring.geometry.dispose();
      (bubble.ring.material as THREE.Material).dispose();
    }
    this.bubbles.clear();
    this.bubbleMeshes = [];
  }

  private createTradeLines(data: ProcessedCountry[]): void {
    this.clearTradeLines();

    const createdPairs = new Set<string>();
    const positionMap = new Map<string, ProcessedCountry>();
    for (const c of data) {
      positionMap.set(c.code, c);
    }

    for (const country of data) {
      for (const partnerCode of country.tradePartners) {
        const pairKey = [country.code, partnerCode].sort().join('-');
        if (createdPairs.has(pairKey)) continue;
        createdPairs.add(pairKey);

        const partner = positionMap.get(partnerCode);
        if (!partner) continue;

        const points = [
          new THREE.Vector3(country.position.x, country.position.y, country.position.z),
          new THREE.Vector3(partner.position.x, partner.position.y, partner.position.z),
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: DEFAULT_LINE_COLOR,
          transparent: true,
          opacity: DEFAULT_LINE_OPACITY,
        });
        const line = new THREE.Line(geometry, material);
        (line.userData as TradeLineUserData).fromCode = country.code;
        (line.userData as TradeLineUserData).toCode = partnerCode;

        this.scene.add(line);
        this.tradeLines.push(line);
      }
    }
  }

  private clearTradeLines(): void {
    for (const line of this.tradeLines) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.tradeLines = [];
  }

  applyFilters(filters: FilterConfig): void {
    if (this.filterAnimating) return;

    const newFiltered = this.allData.filter((c) => {
      if (c.latestEmission < filters.minEmission) return false;
      if (c.latestGdp < filters.minGdpPerCapita) return false;
      return true;
    });

    const newFilteredCodes = new Set(newFiltered.map((c) => c.code));

    this.filteredData = newFiltered;
    this.filterAnimating = true;
    this.animationProgress = 0;
    this.filterState = 'fadeOut';

    for (const [code, bubble] of this.bubbles) {
      const shouldShow = newFilteredCodes.has(code);
      bubble.targetOpacity = shouldShow ? 1 : 0;
    }
  }

  resetView(): void {
    this.camera.position.copy(this.defaultCameraPosition);
    this.controls.target.copy(this.defaultTarget);
    this.controls.update();
  }

  private handleIntersections(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.bubbleMeshes, false);

    let newHovered: string | null = null;

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const userData = mesh.userData as BubbleUserData;
      if (userData.code) {
        newHovered = userData.code;
      }
    }

    if (newHovered !== this.hoveredCode) {
      this.clearHover();
      this.hoveredCode = newHovered;
      if (newHovered) {
        this.applyHover(newHovered);
      }
    }
  }

  private applyHover(code: string): void {
    const bubble = this.bubbles.get(code);
    if (!bubble) return;

    bubble.mesh.scale.setScalar(1.2);
    const ringMat = bubble.ring.material as THREE.MeshBasicMaterial;
    ringMat.opacity = 0.3;

    const country = (bubble.mesh.userData as BubbleUserData).country;
    if (country && this.onStatusUpdate) {
      const level = this.getEmissionLevel(country.latestEmission);
      this.onStatusUpdate({
        name: country.name,
        level,
        emission: country.latestEmission,
      });
    }

    this.highlightTradeNetwork(code);
  }

  private clearHover(): void {
    if (this.hoveredCode) {
      const bubble = this.bubbles.get(this.hoveredCode);
      if (bubble) {
        bubble.mesh.scale.setScalar(1);
        const ringMat = bubble.ring.material as THREE.MeshBasicMaterial;
        ringMat.opacity = 0;
      }
    }
    this.hoveredCode = null;
    if (this.onStatusUpdate) {
      this.onStatusUpdate(null);
    }
    this.resetTradeLines();
  }

  private highlightTradeNetwork(code: string): void {
    const bubble = this.bubbles.get(code);
    if (!bubble) return;

    const country = (bubble.mesh.userData as BubbleUserData).country;
    const relatedCodes = new Set<string>();
    relatedCodes.add(code);
    if (country) {
      for (const p of country.tradePartners) {
        relatedCodes.add(p);
      }
    }

    for (const line of this.tradeLines) {
      const userData = line.userData as TradeLineUserData;
      const isRelated = relatedCodes.has(userData.fromCode) && relatedCodes.has(userData.toCode);
      const mat = line.material as THREE.LineBasicMaterial;
      if (isRelated) {
        mat.color.setHex(HIGHLIGHT_LINE_COLOR);
        mat.opacity = HIGHLIGHT_LINE_OPACITY;
      } else {
        mat.color.setHex(DEFAULT_LINE_COLOR);
        mat.opacity = DIM_LINE_OPACITY;
      }
    }
  }

  private resetTradeLines(): void {
    for (const line of this.tradeLines) {
      if (!line.material) continue;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.color.setHex(DEFAULT_LINE_COLOR);
      mat.opacity = DEFAULT_LINE_OPACITY;
    }
  }

  private getEmissionLevel(emission: number): string {
    if (emission >= 5000) return '极高排放';
    if (emission >= 2000) return '高排放';
    if (emission >= 800) return '中高排放';
    if (emission >= 300) return '中排放';
    if (emission >= 100) return '中低排放';
    return '低排放';
  }

  private updateFilterAnimation(delta: number): void {
    if (!this.filterAnimating) return;

    const duration = 0.5;
    this.animationProgress += delta;
    const t = Math.min(1, this.animationProgress / duration);

    if (this.filterState === 'fadeOut') {
      for (const [, bubble] of this.bubbles) {
        const meshMat = bubble.mesh.material as THREE.MeshPhongMaterial;
        const ringMat = bubble.ring.material as THREE.MeshBasicMaterial;
        const startOpacity = 1;
        const midOpacity = bubble.targetOpacity > 0.5 ? 0.3 : 0;
        meshMat.opacity = startOpacity + (midOpacity - startOpacity) * t;
        ringMat.opacity = meshMat.opacity * 0.3;
      }
      if (t >= 1) {
        this.filterState = 'fadeIn';
        this.animationProgress = 0;
        this.rearrangeBubbles();
      }
    } else if (this.filterState === 'fadeIn') {
      for (const [, bubble] of this.bubbles) {
        const meshMat = bubble.mesh.material as THREE.MeshPhongMaterial;
        const ringMat = bubble.ring.material as THREE.MeshBasicMaterial;
        const midOpacity = bubble.targetOpacity > 0.5 ? 0.3 : 0;
        const endOpacity = bubble.targetOpacity;
        meshMat.opacity = midOpacity + (endOpacity - midOpacity) * t;
        ringMat.opacity = meshMat.opacity > 0 ? 0.3 * (endOpacity > 0.5 ? t : 0) : 0;
      }
      if (t >= 1) {
        this.filterState = 'idle';
        this.filterAnimating = false;
        for (const [, bubble] of this.bubbles) {
          const meshMat = bubble.mesh.material as THREE.MeshPhongMaterial;
          meshMat.opacity = bubble.targetOpacity;
        }
      }
    }
  }

  private rearrangeBubbles(): void {
    const visibleCountries = this.filteredData;
    const n = visibleCountries.length;
    if (n === 0) return;

    const phi = Math.PI * (3 - Math.sqrt(5));
    const radius = 8;

    const positions: Map<string, THREE.Vector3> = new Map();

    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      positions.set(visibleCountries[i].code, new THREE.Vector3(x * radius, y * radius, z * radius));
    }

    for (const [code, bubble] of this.bubbles) {
      const countryData = this.allData.find(c => c.code === code);
      if (!countryData) continue;
      if (positions.has(code)) {
        const pos = positions.get(code)!;
        bubble.mesh.position.copy(pos);
        bubble.ring.position.copy(pos);
        bubble.ring.lookAt(0, 0, 0);
        (bubble.mesh.userData as BubbleUserData).country.position = { x: pos.x, y: pos.y, z: pos.z };
      }
    }

    this.rebuildTradeLines();
  }

  private rebuildTradeLines(): void {
    this.clearTradeLines();
    const userDataMap = new Map<string, ProcessedCountry>();
    const filteredCodes = new Set(this.filteredData.map(c => c.code));

    for (const [code, bubble] of this.bubbles) {
      const opacity = (bubble.mesh.material as THREE.MeshPhongMaterial).opacity;
      if (opacity <= 0.01) continue;
      const ud = bubble.mesh.userData as BubbleUserData;
      if (ud.country) {
        userDataMap.set(code, ud.country);
      }
    }

    const createdPairs = new Set<string>();

    for (const country of this.filteredData) {
      const filteredPartners = country.tradePartners.filter(p => filteredCodes.has(p));
      for (const partnerCode of filteredPartners) {
        const pairKey = [country.code, partnerCode].sort().join('-');
        if (createdPairs.has(pairKey)) continue;
        createdPairs.add(pairKey);

        const partner = userDataMap.get(partnerCode) || this.filteredData.find(c => c.code === partnerCode);
        const fromBubble = this.bubbles.get(country.code);
        const toBubble = this.bubbles.get(partnerCode);
        if (!fromBubble || !toBubble || !partner) continue;

        const points = [
          fromBubble.mesh.position.clone(),
          toBubble.mesh.position.clone(),
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: DEFAULT_LINE_COLOR,
          transparent: true,
          opacity: DEFAULT_LINE_OPACITY,
        });
        const line = new THREE.Line(geometry, material);
        (line.userData as TradeLineUserData).fromCode = country.code;
        (line.userData as TradeLineUserData).toCode = partnerCode;

        this.scene.add(line);
        this.tradeLines.push(line);
      }
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    this.handleIntersections();
    this.updateFilterAnimation(delta);

    for (const [, bubble] of this.bubbles) {
      bubble.ring.lookAt(this.camera.position);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointermove', this.onPointerMove);
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('pointerup', this.onPointerUp);
    dom.removeEventListener('pointerleave', this.onPointerLeave);
    window.removeEventListener('resize', this.onResize);
    this.clearBubbles();
    this.clearTradeLines();
    this.controls.dispose();
    this.renderer.dispose();
    if (dom.parentElement) {
      dom.parentElement.removeChild(dom);
    }
  }
}

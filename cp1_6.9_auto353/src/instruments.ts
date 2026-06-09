import * as THREE from 'three';

export type InstrumentType = 'piano' | 'violin' | 'cello' | 'flute';

export interface Instrument {
  type: InstrumentType;
  key: string;
  group: THREE.Group;
  position: THREE.Vector3;
  trigger: () => void;
  update: (dt: number, time: number) => void;
  onTrigger: (cb: (type: InstrumentType, pos: THREE.Vector3) => void) => void;
}

interface InstrumentConfig {
  position: THREE.Vector3;
  shape: 'rect' | 'diamond' | 'hexagon' | 'triangle';
  color: number;
  key: string;
  label: string;
  noteChar: string;
}

const INSTRUMENT_CONFIGS: Record<InstrumentType, InstrumentConfig> = {
  piano: {
    position: new THREE.Vector3(-20, 15, -30),
    shape: 'rect',
    color: 0xb388ff,
    key: 'p',
    label: 'Piano',
    noteChar: '♩'
  },
  violin: {
    position: new THREE.Vector3(25, 15, -20),
    shape: 'diamond',
    color: 0xffd54f,
    key: 'v',
    label: 'Violin',
    noteChar: '♪'
  },
  cello: {
    position: new THREE.Vector3(-25, 15, 25),
    shape: 'hexagon',
    color: 0x26c6da,
    key: 'c',
    label: 'Cello',
    noteChar: '♫'
  },
  flute: {
    position: new THREE.Vector3(30, 15, 25),
    shape: 'triangle',
    color: 0xf48fb1,
    key: 'f',
    label: 'Flute',
    noteChar: '♬'
  }
};

class InstrumentImpl implements Instrument {
  type: InstrumentType;
  key: string;
  group: THREE.Group;
  position: THREE.Vector3;

  private config: InstrumentConfig;
  private bodyMesh: THREE.Mesh;
  private edgeMesh: THREE.LineSegments;
  private haloMesh: THREE.Mesh;
  private glowRibbon: THREE.Mesh;
  private bodyMaterial: THREE.MeshPhysicalMaterial;
  private triggerCallbacks: Array<(type: InstrumentType, pos: THREE.Vector3) => void> = [];
  private triggerScaleAnim = 0;
  private triggerGlowAnim = 0;
  private glowRibbonVisible = false;
  private glowRibbonAnim = 0;

  constructor(type: InstrumentType) {
    this.type = type;
    this.config = INSTRUMENT_CONFIGS[type];
    this.key = this.config.key;
    this.position = this.config.position.clone();

    this.group = new THREE.Group();
    this.group.position.copy(this.config.position);
    this.group.userData.instrumentType = type;
    this.group.userData.isInstrument = true;

    const bodyGeo = this.createGeometry();
    this.bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2,
      metalness: 0.7,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      emissive: this.config.color,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide
    });

    this.bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    this.bodyMesh.scale.setScalar(1);
    this.group.add(this.bodyMesh);

    this.edgeMesh = this.createEdges(bodyGeo);
    this.group.add(this.edgeMesh);

    this.haloMesh = this.createHalo();
    this.group.add(this.haloMesh);

    const noteIcon = this.createNoteIcon();
    noteIcon.position.y = 12;
    this.group.add(noteIcon);

    this.glowRibbon = this.createGlowRibbon();
    this.glowRibbon.visible = false;
    this.group.add(this.glowRibbon);

    this.group.scale.setScalar(0.95);
  }

  private createGeometry(): THREE.BufferGeometry {
    switch (this.config.shape) {
      case 'rect':
        return new THREE.BoxGeometry(14, 16, 10, 1, 1, 1);
      case 'diamond': {
        const shape = new THREE.Shape();
        shape.moveTo(0, 10);
        shape.lineTo(8, 0);
        shape.lineTo(0, -10);
        shape.lineTo(-8, 0);
        shape.lineTo(0, 10);
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: 4,
          bevelEnabled: true,
          bevelThickness: 0.5,
          bevelSize: 0.5,
          bevelSegments: 2,
          curveSegments: 8
        });
        geo.center();
        return geo;
      }
      case 'hexagon': {
        const geo = new THREE.CylinderGeometry(8, 8, 18, 6, 1, false);
        return geo;
      }
      case 'triangle': {
        const shape = new THREE.Shape();
        shape.moveTo(0, 11);
        shape.lineTo(9.5, -7);
        shape.lineTo(-9.5, -7);
        shape.lineTo(0, 11);
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: 4,
          bevelEnabled: true,
          bevelThickness: 0.5,
          bevelSize: 0.5,
          bevelSegments: 2,
          curveSegments: 8
        });
        geo.center();
        return geo;
      }
      default:
        return new THREE.BoxGeometry(10, 10, 10);
    }
  }

  private createEdges(geometry: THREE.BufferGeometry): THREE.LineSegments {
    const edgesGeo = new THREE.EdgesGeometry(geometry, 20);
    const edgesMat = new THREE.LineBasicMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0.9
    });
    return new THREE.LineSegments(edgesGeo, edgesMat);
  }

  private createHalo(): THREE.Mesh {
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 256;
    haloCanvas.height = 256;
    const ctx = haloCanvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    const c = new THREE.Color(this.config.color);
    gradient.addColorStop(0, `rgba(${c.r * 255},${c.g * 255},${c.b * 255},0.6)`);
    gradient.addColorStop(0.4, `rgba(${c.r * 255},${c.g * 255},${c.b * 255},0.15)`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const haloTex = new THREE.CanvasTexture(haloCanvas);
    const haloGeo = new THREE.CircleGeometry(15, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -15;
    return halo;
  }

  private createNoteIcon(): THREE.Group {
    const group = new THREE.Group();
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 128;
    textCanvas.height = 128;
    const ctx = textCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 128);
    const c = new THREE.Color(this.config.color);
    ctx.shadowColor = `rgba(${c.r * 255},${c.g * 255},${c.b * 255},1)`;
    ctx.shadowBlur = 25;
    ctx.fillStyle = `rgba(${c.r * 255},${c.g * 255},${c.b * 255},0.95)`;
    ctx.font = 'bold 72px "Segoe UI Symbol", "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.config.noteChar, 64, 64);

    const tex = new THREE.CanvasTexture(textCanvas);
    const planeGeo = new THREE.PlaneGeometry(8, 8);
    const planeMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    group.add(plane);

    const bgGeo = new THREE.RingGeometry(5, 5.8, 32);
    const bgMat = new THREE.MeshBasicMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(bgGeo, bgMat);
    group.add(ring);

    group.userData.billboard = true;
    group.userData.plane = plane;
    group.userData.ring = ring;
    return group;
  }

  private createGlowRibbon(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const c = new THREE.Color(this.config.color);
    for (let x = 0; x < 512; x++) {
      const alpha = Math.sin((x / 512) * Math.PI) * 0.8;
      const grad = ctx.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0, `rgba(${c.r * 255},${c.g * 255},${c.b * 255},0)`);
      grad.addColorStop(0.5, `rgba(${c.r * 255},${c.g * 255},${c.b * 255},${alpha})`);
      grad.addColorStop(1, `rgba(${c.r * 255},${c.g * 255},${c.b * 255},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, 1, 64);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.TorusGeometry(12, 1.5, 8, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0.9,
      map: tex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const ribbon = new THREE.Mesh(geo, mat);
    ribbon.rotation.x = Math.PI / 2;
    return ribbon;
  }

  trigger(): void {
    this.triggerScaleAnim = 1;
    this.triggerGlowAnim = 1;
    this.glowRibbonAnim = 1;
    this.glowRibbonVisible = true;
    this.glowRibbon.visible = true;

    for (const cb of this.triggerCallbacks) {
      cb(this.type, this.group.position.clone());
    }
  }

  onTrigger(cb: (type: InstrumentType, pos: THREE.Vector3) => void): void {
    this.triggerCallbacks.push(cb);
  }

  update(dt: number, time: number): void {
    if (this.triggerScaleAnim > 0) {
      const t = this.triggerScaleAnim;
      const scale = 1 + 0.2 * Math.sin(t * Math.PI);
      this.bodyMesh.scale.setScalar(scale);
      this.edgeMesh.scale.setScalar(scale);
      this.triggerScaleAnim = Math.max(0, this.triggerScaleAnim - dt / 0.3);
    } else {
      this.bodyMesh.scale.setScalar(1);
      this.edgeMesh.scale.setScalar(1);
    }

    if (this.triggerGlowAnim > 0) {
      this.bodyMaterial.emissiveIntensity = 0.15 + this.triggerGlowAnim * 0.8;
      this.triggerGlowAnim = Math.max(0, this.triggerGlowAnim - dt / 0.5);
    } else {
      this.bodyMaterial.emissiveIntensity = 0.15 + 0.05 * Math.sin(time * 1.5);
    }

    if (this.glowRibbonAnim > 0) {
      const s = 1 + (1 - this.glowRibbonAnim) * 1.5;
      this.glowRibbon.scale.setScalar(s);
      (this.glowRibbon.material as THREE.MeshBasicMaterial).opacity = this.glowRibbonAnim * 0.9;
      this.glowRibbonAnim = Math.max(0, this.glowRibbonAnim - dt / 0.5);
    } else if (this.glowRibbonVisible) {
      this.glowRibbonVisible = false;
      this.glowRibbon.visible = false;
    }

    this.bodyMaterial.opacity = 0.5 + 0.08 * Math.sin(time * 1.2 + this.position.x);

    const haloMat = this.haloMesh.material as THREE.MeshBasicMaterial;
    haloMat.opacity = 0.25 + 0.1 * Math.sin(time * 0.8 + this.position.z);

    this.group.rotation.y = Math.sin(time * 0.3 + this.position.x * 0.1) * 0.08;
    this.group.position.y = this.position.y + Math.sin(time * 0.6 + this.position.x * 0.05) * 0.8;

    const noteGroup = this.group.children.find(c => c.userData.billboard) as THREE.Group;
    if (noteGroup) {
      noteGroup.rotation.y = -this.group.rotation.y;
      noteGroup.position.y = 12 + Math.sin(time * 2 + this.position.x) * 0.5;
      const ring = noteGroup.userData.ring as THREE.Mesh;
      if (ring) {
        ring.rotation.z = time * 0.5;
      }
    }
  }
}

export interface InstrumentManager {
  instruments: Map<InstrumentType, Instrument>;
  getAllMeshes: () => THREE.Object3D[];
  getInstrumentByKey: (key: string) => Instrument | undefined;
  getInstrumentByObject: (obj: THREE.Object3D) => Instrument | undefined;
  triggerInstrument: (type: InstrumentType) => void;
  update: (dt: number, time: number) => void;
  addToScene: (scene: THREE.Scene) => void;
}

export function createInstrumentManager(): InstrumentManager {
  const instruments = new Map<InstrumentType, Instrument>();
  const types: InstrumentType[] = ['piano', 'violin', 'cello', 'flute'];
  for (const type of types) {
    instruments.set(type, new InstrumentImpl(type));
  }

  return {
    instruments,
    getAllMeshes: () => Array.from(instruments.values()).map(i => i.group),
    getInstrumentByKey: (key: string) => {
      for (const inst of instruments.values()) {
        if (inst.key === key.toLowerCase()) return inst;
      }
      return undefined;
    },
    getInstrumentByObject: (obj: THREE.Object3D) => {
      let current: THREE.Object3D | null = obj;
      while (current) {
        if (current.userData.isInstrument) {
          return instruments.get(current.userData.instrumentType);
        }
        current = current.parent;
      }
      return undefined;
    },
    triggerInstrument: (type: InstrumentType) => {
      const inst = instruments.get(type);
      if (inst) inst.trigger();
    },
    update: (dt: number, time: number) => {
      for (const inst of instruments.values()) {
        inst.update(dt, time);
      }
    },
    addToScene: (scene: THREE.Scene) => {
      for (const inst of instruments.values()) {
        scene.add(inst.group);
      }
    }
  };
}

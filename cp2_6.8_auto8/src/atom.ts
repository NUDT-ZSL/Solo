import * as THREE from 'three';

export interface AtomData {
  id: number;
  element: 'C' | 'O' | 'N' | 'H';
  x: number;
  y: number;
  z: number;
}

const ELEMENT_COLORS: Record<string, number> = {
  C: 0x808080,
  O: 0xff4444,
  N: 0x4466ff,
  H: 0xffffff
};

const ELEMENT_RADIUS: Record<string, number> = {
  C: 0.7,
  O: 0.6,
  N: 0.65,
  H: 0.3
};

export class Atom {
  public data: AtomData;
  public mesh: THREE.Mesh;
  public lod: THREE.LOD;
  public label: THREE.Sprite | null = null;
  public glowMesh: THREE.Mesh;
  private baseScale: number = 1;
  private isHovered: boolean = false;
  private targetScale: number = 1;
  private currentScale: number = 1;

  constructor(data: AtomData) {
    this.data = data;
    this.lod = new THREE.LOD();
    this.mesh = this.createAtomMesh(32, 32);
    const lowDetailMesh = this.createAtomMesh(8, 6);
    this.lod.addLevel(this.mesh, 0);
    this.lod.addLevel(lowDetailMesh, 30);
    this.lod.position.set(data.x, data.y, data.z);
    this.glowMesh = this.createGlowMesh();
    this.mesh.add(this.glowMesh);
    this.glowMesh.visible = false;
  }

  private createAtomMesh(widthSegments: number, heightSegments: number): THREE.Mesh {
    const radius = ELEMENT_RADIUS[this.data.element];
    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    const color = ELEMENT_COLORS[this.data.element];
    const material = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 100,
      specular: 0x333333
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.atom = this;
    return mesh;
  }

  private createGlowMesh(): THREE.Mesh {
    const radius = ELEMENT_RADIUS[this.data.element] * 1.3;
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: ELEMENT_COLORS[this.data.element],
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  public createLabel(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(`${this.data.element}${this.data.id}`, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    this.label = new THREE.Sprite(material);
    this.label.scale.set(2, 1, 1);
    this.label.position.set(0, ELEMENT_RADIUS[this.data.element] + 0.8, 0);
    this.lod.add(this.label);
  }

  public removeLabel(): void {
    if (this.label) {
      this.lod.remove(this.label);
      this.label.material.dispose();
      if (this.label.material.map) {
        this.label.material.map.dispose();
      }
      this.label = null;
    }
  }

  public setHovered(hovered: boolean): void {
    this.isHovered = hovered;
    this.targetScale = hovered ? 1.2 : 1.0;
    this.glowMesh.visible = hovered;
  }

  public getHovered(): boolean {
    return this.isHovered;
  }

  public update(): void {
    const diff = this.targetScale - this.currentScale;
    if (Math.abs(diff) > 0.001) {
      this.currentScale += diff * 0.15;
      this.lod.scale.setScalar(this.currentScale * this.baseScale);
    }
  }

  public getWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.lod.getWorldPosition(pos);
    return pos;
  }

  public getElementColor(): number {
    return ELEMENT_COLORS[this.data.element];
  }

  public dispose(): void {
    this.lod.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.removeLabel();
  }
}

import * as THREE from 'three';
import type { MoleculeData, AtomData, BondData } from './moleculeData';
import { ELEMENT_COLORS, ELEMENT_RADII } from './moleculeData';

export interface AtomObject {
  mesh: THREE.Mesh;
  highlight: THREE.Mesh;
  data: AtomData;
  basePosition: THREE.Vector3;
}

export interface BondObject {
  mesh: THREE.Mesh;
  data: BondData;
}

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public moleculeGroup: THREE.Group;
  public atoms: AtomObject[] = [];
  public bonds: BondObject[] = [];
  public initialCameraPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 8);
  public initialCameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public colorTemperature: number = 0.5;
  public colorTempMesh: THREE.Mesh | null = null;

  private atomGeometryCache: Map<number, THREE.SphereGeometry> = new Map();
  private bondGeometry: THREE.CylinderGeometry;
  private animationId: number | null = null;
  private animationTime: number = 0;
  private isVibrating: boolean = false;
  private isRotating: boolean = false;
  private rotationSpeed: number = 10;
  private vibrationAmplitude: number = 0.05;
  private vibrationFrequency: number = 2;
  private scaleAnimationProgress: number = 1;
  private scaleAnimationDuration: number = 0.5;
  private isScalingIn: boolean = false;
  private fadeOpacity: number = 1;
  private fadeAnimationTarget: number = 1;
  private fadeAnimationSpeed: number = 1 / 0.3;
  private isFading: boolean = false;
  private pendingMolecule: MoleculeData | null = null;
  private onFadeComplete: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);

    this.bondGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 12);

    this.setupBackground();
    this.setupLights();
    this.setupColorTemperatureFilter();
    this.camera.position.copy(this.initialCameraPosition);
    this.camera.lookAt(this.initialCameraTarget);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f0f23');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 5, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, -3, -5);
    this.scene.add(fillLight);
  }

  private setupColorTemperatureFilter(): void {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        temperature: { value: this.colorTemperature },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float temperature;
        varying vec2 vUv;
        void main() {
          vec3 coolColor = vec3(0.3, 0.5, 1.0);
          vec3 warmColor = vec3(1.0, 0.8, 0.3);
          vec3 tint = mix(coolColor, warmColor, temperature);
          float alpha = 0.15 * abs(temperature - 0.5) * 2.0;
          gl_FragColor = vec4(tint, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.colorTempMesh = new THREE.Mesh(geometry, material);
    this.colorTempMesh.position.z = -1;
    this.camera.add(this.colorTempMesh);
    this.scene.add(this.camera);
  }

  private getAtomGeometry(radius: number): THREE.SphereGeometry {
    const key = Math.round(radius * 1000);
    if (!this.atomGeometryCache.has(key)) {
      this.atomGeometryCache.set(key, new THREE.SphereGeometry(radius, 32, 32));
    }
    return this.atomGeometryCache.get(key)!;
  }

  private createAtomMaterial(color: string): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.3,
      roughness: 0.4,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.2,
    });
  }

  private createHighlightMaterial(color: string): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide,
    });
  }

  private createBondMaterial(color1: string, color2: string): THREE.MeshStandardMaterial {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    const mixed = c1.clone().lerp(c2, 0.5);
    return new THREE.MeshStandardMaterial({
      color: mixed,
      transparent: true,
      opacity: 0.7,
      metalness: 0.2,
      roughness: 0.5,
    });
  }

  public loadMolecule(data: MoleculeData): void {
    this.clearMolecule();
    this.createAtoms(data);
    this.createBonds(data);
    this.centerMolecule();
    this.startScaleAnimation();
  }

  public startMoleculeTransition(newData: MoleculeData): void {
    if (this.isFading) return;
    this.pendingMolecule = newData;
    this.fadeAnimationTarget = 0;
    this.isFading = true;
    this.onFadeComplete = () => {
      this.loadMolecule(newData);
      this.fadeAnimationTarget = 1;
      this.onFadeComplete = null;
    };
  }

  private clearMolecule(): void {
    this.atoms.forEach((atom) => {
      this.moleculeGroup.remove(atom.mesh);
      this.moleculeGroup.remove(atom.highlight);
      atom.mesh.geometry.dispose();
      (atom.mesh.material as THREE.Material).dispose();
      atom.highlight.geometry.dispose();
      (atom.highlight.material as THREE.Material).dispose();
    });
    this.bonds.forEach((bond) => {
      this.moleculeGroup.remove(bond.mesh);
      bond.mesh.geometry.dispose();
      (bond.mesh.material as THREE.Material).dispose();
    });
    this.atoms = [];
    this.bonds = [];
  }

  private createAtoms(data: MoleculeData): void {
    data.atoms.forEach((atomData) => {
      const radius = ELEMENT_RADII[atomData.element] || 0.5;
      const color = ELEMENT_COLORS[atomData.element] || '#888888';

      const geometry = this.getAtomGeometry(radius);
      const material = this.createAtomMaterial(color);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(atomData.x, atomData.y, atomData.z);
      mesh.userData = { atomId: atomData.id, type: 'atom' };

      const highlightRadius = radius * 1.5;
      const highlightGeo = new THREE.SphereGeometry(highlightRadius, 32, 32);
      const highlightMat = this.createHighlightMaterial(color);
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.copy(mesh.position);
      highlight.visible = false;

      this.moleculeGroup.add(mesh);
      this.moleculeGroup.add(highlight);

      this.atoms.push({
        mesh,
        highlight,
        data: atomData,
        basePosition: new THREE.Vector3(atomData.x, atomData.y, atomData.z),
      });
    });
  }

  private createBonds(data: MoleculeData): void {
    const atomMap = new Map<string, AtomObject>();
    this.atoms.forEach((atom) => {
      atomMap.set(atom.data.id, atom);
    });

    data.bonds.forEach((bondData) => {
      const atom1 = atomMap.get(bondData.atom1);
      const atom2 = atomMap.get(bondData.atom2);
      if (!atom1 || !atom2) return;

      const color1 = ELEMENT_COLORS[atom1.data.element] || '#888888';
      const color2 = ELEMENT_COLORS[atom2.data.element] || '#888888';
      const material = this.createBondMaterial(color1, color2);

      const start = atom1.mesh.position.clone();
      const end = atom2.mesh.position.clone();
      const direction = end.clone().sub(start);
      const length = direction.length();

      const geometry = this.bondGeometry.clone();
      geometry.scale(1, length, 1);
      geometry.translate(0, length / 2, 0);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(start);
      mesh.lookAt(end);
      mesh.rotateX(Math.PI / 2);

      this.moleculeGroup.add(mesh);
      this.bonds.push({ mesh, data: bondData });
    });
  }

  private centerMolecule(): void {
    const box = new THREE.Box3().setFromObject(this.moleculeGroup);
    const center = box.getCenter(new THREE.Vector3());
    this.moleculeGroup.position.sub(center);

    this.atoms.forEach((atom) => {
      atom.basePosition.sub(center);
    });
  }

  private startScaleAnimation(): void {
    this.scaleAnimationProgress = 0;
    this.isScalingIn = true;
    this.moleculeGroup.scale.setScalar(0);
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public setVibration(active: boolean): void {
    this.isVibrating = active;
  }

  public setRotation(active: boolean): void {
    this.isRotating = active;
  }

  public setColorTemperature(value: number): void {
    this.colorTemperature = THREE.MathUtils.clamp(value, 0, 1);
    if (this.colorTempMesh) {
      const material = this.colorTempMesh.material as THREE.ShaderMaterial;
      material.uniforms.temperature.value = this.colorTemperature;
    }
  }

  public resetCamera(): void {
  }

  public getAtomByMesh(mesh: THREE.Object3D): AtomObject | undefined {
    return this.atoms.find((a) => a.mesh === mesh);
  }

  public highlightAtom(atomId: string | null): void {
    this.atoms.forEach((atom) => {
      atom.highlight.visible = atom.data.id === atomId;
    });
  }

  public update(deltaTime: number): void {
    this.animationTime += deltaTime;

    if (this.isScalingIn) {
      this.scaleAnimationProgress = Math.min(
        this.scaleAnimationProgress + deltaTime / this.scaleAnimationDuration,
        1
      );
      const eased = this.easeOut(this.scaleAnimationProgress);
      this.moleculeGroup.scale.setScalar(eased);
      if (this.scaleAnimationProgress >= 1) {
        this.isScalingIn = false;
      }
    }

    if (this.isFading) {
      const fadeDir = this.fadeAnimationTarget > this.fadeOpacity ? 1 : -1;
      this.fadeOpacity += fadeDir * this.fadeAnimationSpeed * deltaTime;
      this.fadeOpacity = THREE.MathUtils.clamp(this.fadeOpacity, 0, 1);

      this.atoms.forEach((atom) => {
        const mat = atom.mesh.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = this.fadeOpacity;
      });
      this.bonds.forEach((bond) => {
        const mat = bond.mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.7 * this.fadeOpacity;
      });

      if (this.fadeOpacity === this.fadeAnimationTarget) {
        this.isFading = false;
        if (this.onFadeComplete) {
          this.onFadeComplete();
        }
      }
    }

    if (this.isRotating) {
      const angleDelta = (this.rotationSpeed * Math.PI / 180) * deltaTime;
      this.moleculeGroup.rotation.y += angleDelta;
    }

    if (this.isVibrating) {
      this.atoms.forEach((atom, index) => {
        const phase = index * 0.7;
        const offsetX = Math.sin(this.animationTime * this.vibrationFrequency * Math.PI * 2 + phase) * this.vibrationAmplitude;
        const offsetY = Math.cos(this.animationTime * this.vibrationFrequency * Math.PI * 2 * 1.3 + phase) * this.vibrationAmplitude;
        const offsetZ = Math.sin(this.animationTime * this.vibrationFrequency * Math.PI * 2 * 0.8 + phase * 2) * this.vibrationAmplitude;

        atom.mesh.position.set(
          atom.basePosition.x + offsetX,
          atom.basePosition.y + offsetY,
          atom.basePosition.z + offsetZ
        );
        atom.highlight.position.copy(atom.mesh.position);
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    this.clearMolecule();
    this.atomGeometryCache.forEach((geo) => geo.dispose());
    this.bondGeometry.dispose();
    this.renderer.dispose();
  }
}

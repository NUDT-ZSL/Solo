import * as THREE from 'three';
import * as dat from 'dat.gui';
import { MoleculeBuilder } from './MoleculeBuilder';

export interface GUIParams {
  atomRadius: number;
  bondRadius: number;
  rotationSpeed: number;
  autoRotate: boolean;
  showLabels: boolean;
  showAngles: boolean;
  backgroundColor: string;
  resetView: () => void;
  addAtom: () => void;
  clearAll: () => void;
  exportJSON: () => void;
  importJSON: () => void;
}

export class GUIHandler {
  private gui: dat.GUI;
  public params: GUIParams;
  private moleculeBuilder: MoleculeBuilder;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  constructor(
    moleculeBuilder: MoleculeBuilder,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.moleculeBuilder = moleculeBuilder;
    this.camera = camera;
    this.renderer = renderer;

    this.params = {
      atomRadius: 0.6,
      bondRadius: 0.05,
      rotationSpeed: 0.5,
      autoRotate: true,
      showLabels: true,
      showAngles: true,
      backgroundColor: '#0B0E1A',
      resetView: () => this.resetView(),
      addAtom: () => {},
      clearAll: () => this.moleculeBuilder.clearAll(),
      exportJSON: () => {},
      importJSON: () => {},
    };

    this.gui = new dat.GUI({ width: 280 });
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '20px';
    this.gui.domElement.style.right = '20px';
    this.gui.domElement.style.zIndex = '50';

    this.setupGUI();
  }

  private setupGUI(): void {
    const displayFolder = this.gui.addFolder('显示设置');
    displayFolder.open();

    displayFolder.add(this.params, 'showLabels').name('显示原子标签').onChange((v: boolean) => {
      this.moleculeBuilder.atoms.forEach((atom) => {
        atom.labelEl.style.display = v ? 'block' : 'none';
      });
      this.moleculeBuilder.bonds.forEach((bond) => {
        bond.labelEl.style.display = v ? 'block' : 'none';
      });
    });

    displayFolder.add(this.params, 'showAngles').name('显示键角').onChange((v: boolean) => {
      this.moleculeBuilder.angleLabels.forEach((el) => {
        el.style.display = v ? 'block' : 'none';
      });
    });

    displayFolder.addColor(this.params, 'backgroundColor').name('背景颜色').onChange((v: string) => {
      this.renderer.setClearColor(new THREE.Color(v));
      document.body.style.background = `linear-gradient(135deg, ${v} 0%, #1A1F3A 100%)`;
    });

    const moleculeFolder = this.gui.addFolder('分子设置');
    moleculeFolder.open();

    moleculeFolder.add(this.params, 'atomRadius', 0.3, 1.0, 0.05).name('原子半径').onChange((v: number) => {
      this.moleculeBuilder.atoms.forEach((atom) => {
        atom.mesh.scale.setScalar(v / atom.data.radius);
      });
    });

    moleculeFolder.add(this.params, 'bondRadius', 0.02, 0.15, 0.01).name('键半径').onChange((v: number) => {
      this.moleculeBuilder.bonds.forEach((bond) => {
        bond.mesh.scale.x = v / 0.05;
        bond.mesh.scale.y = v / 0.05;
      });
    });

    const viewFolder = this.gui.addFolder('视角控制');
    viewFolder.open();

    viewFolder.add(this.params, 'autoRotate').name('自动旋转');

    viewFolder.add(this.params, 'rotationSpeed', 0, 2, 0.1).name('旋转速度');

    viewFolder.add(this.params, 'resetView').name('重置视角');

    const actionFolder = this.gui.addFolder('操作');
    actionFolder.open();

    actionFolder.add(this.params, 'clearAll').name('清空所有');
  }

  resetView(): void {
    const box = this.moleculeBuilder.getBoundingBox();
    if (box.isEmpty()) {
      this.camera.position.set(0, 0, 5);
      this.camera.lookAt(0, 0, 0);
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8;

    this.camera.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.5,
      center.z + distance * 0.7
    );
    this.camera.lookAt(center);
  }

  setRotationSpeed(speed: number): void {
    this.params.rotationSpeed = speed;
    const ctrl = this.gui.__folders['视角控制'].__controllers.find(
      (c) => (c as unknown as { property: string }).property === 'rotationSpeed'
    );
    if (ctrl) ctrl.updateDisplay();
  }

  setAutoRotate(enabled: boolean): void {
    this.params.autoRotate = enabled;
    const ctrl = this.gui.__folders['视角控制'].__controllers.find(
      (c) => (c as unknown as { property: string }).property === 'autoRotate'
    );
    if (ctrl) ctrl.updateDisplay();
  }

  dispose(): void {
    this.gui.destroy();
  }
}

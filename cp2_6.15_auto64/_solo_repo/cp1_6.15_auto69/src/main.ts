import { SceneManager } from './sceneManager';
import { MoleculeRenderer } from './moleculeRenderer';
import { UIManager } from './UIManager';
import { getMoleculeByName } from './moleculeData';
import * as THREE from 'three';

class App {
  private container: HTMLElement;
  private sceneManager: SceneManager;
  private moleculeRenderer: MoleculeRenderer;
  private uiManager: UIManager;
  private isTransitioning: boolean = false;

  constructor() {
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }
    this.container = container;

    this.sceneManager = new SceneManager(container);
    this.moleculeRenderer = new MoleculeRenderer();

    this.uiManager = new UIManager(document.getElementById('app') || document.body, {
      onMoleculeChange: (name: string) => this.handleMoleculeChange(name),
      onAtomSelect: (atomId: string | null) => this.handleAtomSelect(atomId),
      onBondSelect: (bondId: string | null) => this.handleBondSelect(bondId)
    });

    this.init();
  }

  private init(): void {
    const defaultMolecule = getMoleculeByName('methane');
    if (defaultMolecule) {
      const group = this.moleculeRenderer.buildMolecule(defaultMolecule);
      this.sceneManager.addMolecule(group, true);
      this.uiManager.updateMolecule(defaultMolecule);
    }
  }

  private handleMoleculeChange(name: string): void {
    if (this.isTransitioning) return;

    const moleculeData = getMoleculeByName(name);
    if (!moleculeData) return;

    this.isTransitioning = true;

    const currentGroup = this.sceneManager.getMoleculeGroup();
    if (currentGroup) {
      this.animateScaleOut(currentGroup, () => {
        this.sceneManager.removeMolecule();
        this.moleculeRenderer.clear();

        const newGroup = this.moleculeRenderer.buildMolecule(moleculeData);
        newGroup.scale.setScalar(0);
        this.sceneManager.addMolecule(newGroup, false);
        this.uiManager.updateMolecule(moleculeData);

        this.animateScaleIn(newGroup, () => {
          this.isTransitioning = false;
        });
      });
    } else {
      const newGroup = this.moleculeRenderer.buildMolecule(moleculeData);
      this.sceneManager.addMolecule(newGroup, true);
      this.uiManager.updateMolecule(moleculeData);
      this.isTransitioning = false;
    }
  }

  private animateScaleOut(group: THREE.Group, callback: () => void): void {
    const duration = 500;
    const startTime = performance.now();
    const startScale = group.scale.x;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeInCubic = progress * progress * progress;
      const scale = startScale * (1 - easeInCubic);

      group.scale.setScalar(scale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        callback();
      }
    };

    animate();
  }

  private animateScaleIn(group: THREE.Group, callback: () => void): void {
    const duration = 500;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      group.scale.setScalar(easeOutCubic);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        callback();
      }
    };

    animate();
  }

  private handleAtomSelect(atomId: string | null): void {
    this.moleculeRenderer.highlightAtom(atomId);
  }

  private handleBondSelect(bondId: string | null): void {
    this.moleculeRenderer.highlightBond(bondId);
  }

  public dispose(): void {
    this.sceneManager.dispose();
    this.moleculeRenderer.dispose();
    this.uiManager.dispose();
  }
}

let app: App | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});

export default App;

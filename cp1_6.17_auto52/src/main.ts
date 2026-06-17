import { SceneManager } from './core/SceneManager';
import { MoleculeLoader } from './core/MoleculeLoader';
import { InteractionHandler } from './interaction/InteractionHandler';
import { CollisionDetector } from './interaction/CollisionDetector';
import { DisplayController } from './ui/DisplayController';
import { MOLECULE_PAIRS } from './data/molecules';
import { DockingResult, MoleculePair } from './types';
import * as THREE from 'three';

class ProteinDockingApp {
  private sceneManager: SceneManager;
  private moleculeLoader: MoleculeLoader;
  private interactionHandler: InteractionHandler;
  private collisionDetector: CollisionDetector;
  private displayController: DisplayController;
  
  private currentPair: MoleculePair | null = null;
  private currentTemperature: number = 25;
  
  constructor() {
    this.sceneManager = new SceneManager('scene-container');
    this.moleculeLoader = new MoleculeLoader();
    this.interactionHandler = new InteractionHandler(this.sceneManager);
    this.collisionDetector = new CollisionDetector();
    
    this.displayController = new DisplayController({
      onMoleculeChange: this.handleMoleculeChange.bind(this),
      onTemperatureChange: this.handleTemperatureChange.bind(this),
      onStartDocking: this.handleStartDocking.bind(this),
      onResetView: this.handleResetView.bind(this)
    });
    
    this.setupEventHandlers();
    this.loadMoleculePair('spike-inhibitor');
    this.sceneManager.setTemperature(this.currentTemperature);
    this.sceneManager.startRenderLoop();
  }
  
  private setupEventHandlers(): void {
    this.interactionHandler.setOnLigandDrag((position: THREE.Vector3) => {
      this.collisionDetector.update(position, performance.now());
    });
    
    this.interactionHandler.setOnLigandDragStart(() => {
      this.displayController.setApproaching(false);
    });
    
    this.interactionHandler.setOnLigandDragEnd(() => {
      const ligandPosition = this.sceneManager.getLigandCenter();
      const state = this.collisionDetector.update(ligandPosition, performance.now());
      
      if (state.isDocking) {
        this.performDocking();
      }
    });
    
    this.collisionDetector.setOnDockingStart(() => {
      this.displayController.setDockingInProgress(true);
    });
    
    this.collisionDetector.setOnDockingComplete((result: DockingResult) => {
      this.displayController.setDockingInProgress(false);
      this.displayController.showDockingResults(result);
    });
    
    this.collisionDetector.setOnDistanceUpdate((distance: number) => {
      this.displayController.updateDistance(distance);
    });
    
    this.collisionDetector.setOnApproaching((approaching: boolean) => {
      this.displayController.setApproaching(approaching);
    });
    
    this.sceneManager.setOnFpsUpdate((fps: number) => {
      this.displayController.updateFps(fps);
    });
    
    this.sceneManager.setOnRender((delta: number) => {
      if (!this.interactionHandler.isDragging() && !this.collisionDetector.isDocked()) {
        const ligandPosition = this.sceneManager.getLigandCenter();
        this.collisionDetector.update(ligandPosition, performance.now());
      }
    });
  }
  
  private loadMoleculePair(pairId: string): void {
    const pair = MOLECULE_PAIRS.find(p => p.id === pairId);
    if (!pair) {
      console.error(`Molecule pair "${pairId}" not found`);
      return;
    }
    
    this.currentPair = pair;
    this.collisionDetector.resetState();
    
    const receptorMesh = this.moleculeLoader.createMoleculeMesh(pair.receptor);
    const ligandMesh = this.moleculeLoader.createMoleculeMesh(pair.ligand);
    
    this.sceneManager.setReceptorMesh(receptorMesh);
    this.sceneManager.setLigandMesh(ligandMesh);
    
    this.interactionHandler.setLigandGroup(ligandMesh.group);
    
    if (pair.receptor.activeSite) {
      this.collisionDetector.setActiveSite(pair.receptor.activeSite);
    }
    
    this.displayController.updateMoleculeInfo(pair.name, pair.receptor, pair.ligand);
    this.displayController.updateTemperatureDisplay(this.currentTemperature);
  }
  
  private handleMoleculeChange(pairId: string): void {
    this.loadMoleculePair(pairId);
  }
  
  private handleTemperatureChange(temperature: number): void {
    this.currentTemperature = temperature;
    this.sceneManager.setTemperature(temperature);
  }
  
  private async handleStartDocking(): Promise<void> {
    if (this.collisionDetector.isDocked() || this.collisionDetector.isDocking()) {
      if (this.currentPair) {
        this.loadMoleculePair(this.currentPair.id);
      }
      return;
    }
    
    const result = this.collisionDetector.forceDocking();
    if (result) {
      await this.performDocking();
    }
  }
  
  private async performDocking(): Promise<void> {
    this.displayController.setDockingInProgress(true);
    
    const targetPosition = this.collisionDetector.getDockingTargetPosition();
    if (!targetPosition) {
      this.displayController.setDockingInProgress(false);
      return;
    }
    
    await this.sceneManager.triggerDockingAnimation(targetPosition);
    
    const result = this.collisionDetector.getState().result;
    if (result) {
      setTimeout(() => {
        this.displayController.setDockingInProgress(false);
        this.displayController.showDockingResults(result);
      }, 100);
    }
  }
  
  private handleResetView(): void {
    this.sceneManager.resetView();
  }
  
  public dispose(): void {
    this.sceneManager.dispose();
    this.moleculeLoader.dispose();
    this.interactionHandler.dispose();
    this.displayController.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new ProteinDockingApp();
    
    window.addEventListener('beforeunload', () => {
      app.dispose();
    });
    
    console.log('3D蛋白质分子对接与折叠模拟应用已启动');
  } catch (error) {
    console.error('应用启动失败:', error);
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(30, 30, 46, 0.95);
      color: #FF7043;
      padding: 24px 32px;
      border-radius: 12px;
      font-family: sans-serif;
      text-align: center;
      z-index: 1000;
      max-width: 400px;
    `;
    errorDiv.innerHTML = `
      <h3 style="margin: 0 0 12px 0; color: #fff;">应用启动失败</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.5;">${error}</p>
    `;
    document.body.appendChild(errorDiv);
  }
});

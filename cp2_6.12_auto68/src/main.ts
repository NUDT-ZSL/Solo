import './style.css';
import { SceneRenderer, MoleculeInfo } from './sceneRenderer';
import { ReactionSimulator } from './reactionSimulator';
import { UIController } from './uiController';

class App {
  private sceneRenderer: SceneRenderer;
  private reactionSimulator: ReactionSimulator;
  private uiController: UIController;

  constructor() {
    this.sceneRenderer = new SceneRenderer('scene-container', 'molecule-canvas', {
      onInfoUpdate: (info: MoleculeInfo) => this.onMoleculeInfoUpdate(info)
    });

    this.reactionSimulator = new ReactionSimulator(this.sceneRenderer);

    this.uiController = new UIController(this.sceneRenderer, this.reactionSimulator);

    this.setupWindowEvents();
  }

  private onMoleculeInfoUpdate(info: MoleculeInfo): void {
    this.uiController.updateInfo(info);
  }

  private setupWindowEvents(): void {
    window.addEventListener('beforeunload', () => {
      this.dispose();
    });
  }

  private dispose(): void {
    this.sceneRenderer.dispose();
    this.reactionSimulator.dispose();
    this.uiController.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});

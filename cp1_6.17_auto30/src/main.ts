import { SceneManager } from './moduleA/scene';
import { ExcavationManager } from './moduleA/excavation';
import { ArtifactManager, ArtifactType, ArtifactEra, ArtifactMaterial, ArtifactData } from './moduleA/artifact';
import { DataLogger } from './moduleB/dataLogger';
import { UIManager } from './moduleB/uiPanel';

class App {
  private sceneManager: SceneManager;
  private excavationManager: ExcavationManager;
  private artifactManager: ArtifactManager;
  private dataLogger: DataLogger;
  private uiManager: UIManager;

  constructor() {
    this.sceneManager = new SceneManager('canvas-container');
    this.excavationManager = new ExcavationManager(this.sceneManager);
    this.artifactManager = new ArtifactManager(this.excavationManager);
    this.dataLogger = new DataLogger();
    this.uiManager = new UIManager(this.dataLogger, 'app');

    this.setupEventBindings();
    this.startStatsUpdate();
  }

  private setupEventBindings(): void {
    this.artifactManager.onCleaningStart((artifact) => {
      this.uiManager.showCleaningProgress(true);
      this.uiManager.updateCleaningProgress(0);
    });

    this.artifactManager.onCleaningProgress((artifact, progress) => {
      this.uiManager.updateCleaningProgress(progress);
    });

    this.artifactManager.onCleaningComplete((artifact) => {
      this.uiManager.showCleaningProgress(false);
    });

    this.artifactManager.onIdentificationNeeded((artifact) => {
      this.uiManager.showIdentificationPanel(artifact);
    });

    this.artifactManager.onArtifactRevealed((artifact) => {
      this.uiManager.updateArtifactCount(this.artifactManager.getDiscoveredCount());
    });

    this.uiManager.onSubmit((type, era, material) => {
      const currentArtifact = this.getCurrentArtifact();
      if (!currentArtifact) return;

      const isCorrect = this.artifactManager.submitIdentification(
        currentArtifact.id,
        type,
        era,
        material
      );

      const updatedArtifact = this.artifactManager.getArtifactById(currentArtifact.id);
      if (updatedArtifact) {
        this.dataLogger.addRecord(updatedArtifact, { type, era, material });

        if (isCorrect) {
          this.uiManager.showAchievementPopup();
        }
      }
    });
  }

  private getCurrentArtifact(): ArtifactData | null {
    const artifacts = this.artifactManager.getArtifacts();
    const latest = artifacts.filter(a => a.cleaned && !a.identified);
    return latest.length > 0 ? latest[latest.length - 1] : null;
  }

  private startStatsUpdate(): void {
    setInterval(() => {
      const rate = this.excavationManager.getDigRatePerMinute();
      this.uiManager.updateDigRate(rate);
    }, 1000);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});

import * as THREE from 'three';
import { RuneSystem, Rune } from './RuneSystem';
import { AltarSystem } from './AltarSystem';
import { InteractionSystem } from './InteractionSystem';

const TOTAL_RUNES = 40;

export class AppManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;

  private runeSystem: RuneSystem;
  private altarSystem: AltarSystem;
  private interactionSystem: InteractionSystem;

  private counterElement: HTMLElement;
  private fadeOverlay: HTMLElement;
  private completeMessage: HTMLElement;

  private isComplete: boolean = false;
  private bloomPass: any = null;
  private baseBloomStrength: number = 0.6;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    container: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.container = container;

    this.counterElement = document.getElementById('counter')!;
    this.fadeOverlay = document.getElementById('fade-overlay')!;
    this.completeMessage = document.getElementById('complete-message')!;

    this.runeSystem = new RuneSystem(scene);
    this.altarSystem = new AltarSystem(scene, TOTAL_RUNES);
    this.interactionSystem = new InteractionSystem(container, camera, this.runeSystem);

    this.setupCallbacks();
    this.updateCounter();
  }

  private setupCallbacks(): void {
    this.runeSystem.setSelectionCallback((rune: Rune) => {
      this.onRuneSelected(rune);
    });

    this.runeSystem.setArrivedCallback((rune: Rune) => {
      this.onRuneArrived(rune);
    });

    this.altarSystem.setCompleteCallback(() => {
      this.onAllRunesCollected();
    });

    this.interactionSystem.setRuneClickedCallback((rune: Rune) => {
      this.handleRuneClick(rune);
    });

    this.interactionSystem.setRunesSelectedCallback((runes: Rune[]) => {
      this.handleRuneMultiSelect(runes);
    });

    this.interactionSystem.setEmptyClickCallback(() => {
      this.handleEmptyClick();
    });
  }

  private handleRuneClick(rune: Rune): void {
    if (this.isComplete) return;
    this.runeSystem.selectRune(rune);
  }

  private handleRuneMultiSelect(runes: Rune[]): void {
    if (this.isComplete) return;
    if (runes.length === 1) {
      this.runeSystem.selectRune(runes[0]);
    } else if (runes.length > 1) {
      this.runeSystem.selectRunes(runes);
    }
  }

  private handleEmptyClick(): void {
    // Placeholder for potential reset logic
  }

  private onRuneSelected(rune: Rune): void {
    // Data flow: user interaction -> RuneSystem -> AppManager -> trigger feedback
    // Currently the rune is already selected and queued for flight
    // Additional visual/audio feedback can be added here
  }

  private onRuneArrived(rune: Rune): void {
    // Data flow: RuneSystem animation complete -> AppManager -> AltarSystem
    this.altarSystem.addRune(rune);
    this.updateCounter();

    const collected = this.runeSystem.getCollectedCount();
    if (collected >= TOTAL_RUNES) {
      // Final completion will be triggered by altar fireworks callback
    }
  }

  private onAllRunesCollected(): void {
    if (this.isComplete) return;
    this.isComplete = true;

    setTimeout(() => {
      this.fadeOverlay.style.opacity = '0.85';
    }, 500);

    setTimeout(() => {
      this.completeMessage.style.opacity = '1';
    }, 1800);
  }

  private updateCounter(): void {
    const collected = this.runeSystem.getCollectedCount();
    this.counterElement.textContent = `已收集符文：${collected}/${TOTAL_RUNES}`;
  }

  setBloomPass(bloomPass: any): void {
    this.bloomPass = bloomPass;
  }

  handleLowFps(): void {
    if (this.bloomPass) {
      this.bloomPass.strength = 0.3;
    }
    this.altarSystem.reduceParticleQuality();
  }

  update(deltaTime: number): void {
    this.runeSystem.update(deltaTime);
    this.altarSystem.update(deltaTime);
  }

  getRuneSystem(): RuneSystem {
    return this.runeSystem;
  }

  getAltarSystem(): AltarSystem {
    return this.altarSystem;
  }

  getInteractionSystem(): InteractionSystem {
    return this.interactionSystem;
  }

  dispose(): void {
    this.runeSystem.dispose();
    this.altarSystem.dispose();
    this.interactionSystem.dispose();
  }
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { CrystalCluster } from './CrystalCluster';
import { ControlPanel } from './ui/ControlPanel';

class App {
  private sceneManager: SceneManager;
  private crystalCluster: CrystalCluster;
  private animationId: number = 0;

  constructor() {
    const container = document.getElementById('app')!;
    this.sceneManager = new SceneManager(container);
    this.crystalCluster = new CrystalCluster(this.sceneManager.scene);

    this.setupInteractions();
    this.setupUI(container);
    this.animate();
  }

  private setupInteractions() {
    const canvas = this.sceneManager.renderer.domElement;
    let clickTimer: ReturnType<typeof setTimeout> | null = null;
    let lastClickTime = 0;

    canvas.addEventListener('click', (e) => {
      const now = Date.now();
      if (now - lastClickTime < 300) {
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        this.crystalCluster.handleDoubleClick(
          e,
          this.sceneManager.camera,
          this.sceneManager.renderer,
        );
        lastClickTime = 0;
        return;
      }
      lastClickTime = now;
      clickTimer = setTimeout(() => {
        this.crystalCluster.handleClick(
          e,
          this.sceneManager.camera,
          this.sceneManager.renderer,
        );
        clickTimer = null;
      }, 300);
    });

    canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const fakeEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY,
        } as MouseEvent;

        const now = Date.now();
        if (now - lastClickTime < 300) {
          this.crystalCluster.handleDoubleClick(
            fakeEvent,
            this.sceneManager.camera,
            this.sceneManager.renderer,
          );
          lastClickTime = 0;
        } else {
          lastClickTime = now;
          setTimeout(() => {
            if (Date.now() - lastClickTime >= 280) {
              this.crystalCluster.handleClick(
                fakeEvent,
                this.sceneManager.camera,
                this.sceneManager.renderer,
              );
            }
          }, 300);
        }
      }
    });

    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(180, 130, 255, 0.8);
        cursor: pointer;
        box-shadow: 0 0 8px rgba(150, 100, 255, 0.5);
        transition: transform 0.2s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(180, 130, 255, 0.8);
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px rgba(150, 100, 255, 0.5);
      }
      @media (max-width: 600px) {
        div[style*="position: fixed"][style*="bottom: 24px"] {
          bottom: 12px !important;
          right: 12px !important;
          width: 200px !important;
          padding: 14px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private setupUI(container: HTMLElement) {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'ui-root';
    document.body.appendChild(uiContainer);

    const root = createRoot(uiContainer);
    root.render(
      React.createElement(ControlPanel, {
        onGrowthSpeedChange: (val: number) => this.crystalCluster.setGrowthSpeed(val),
        onResonanceStrengthChange: (val: number) => this.crystalCluster.setResonanceStrength(val),
        onResetView: () => this.sceneManager.resetView(),
      }),
    );
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.sceneManager.clock.getDelta(), 0.05);

    this.crystalCluster.update(delta);
    this.sceneManager.update();
    this.sceneManager.render();
  };

  dispose() {
    cancelAnimationFrame(this.animationId);
    this.crystalCluster.dispose();
    this.sceneManager.dispose();
  }
}

new App();

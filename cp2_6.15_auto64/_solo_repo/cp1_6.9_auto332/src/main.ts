import * as THREE from 'three';
import { SceneManager } from './scene';
import { ParticleSystem } from './particles';
import { InteractionManager } from './interaction';
import { ControlPanel } from './controls';

class ThoughtNebulaApp {
  container: HTMLElement;
  sceneManager: SceneManager;
  particleSystem: ParticleSystem;
  interactionManager: InteractionManager;
  controlPanel: ControlPanel;

  clock: THREE.Clock;
  elapsedTime: number = 0;
  rafId: number = 0;
  running: boolean = false;

  frameCount: number = 0;
  fpsAccumulator: number = 0;
  currentFPS: number = 60;
  showFPS: boolean = false;

  constructor(containerId: string = 'app') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    this.clock = new THREE.Clock();

    this.sceneManager = new SceneManager(this.container);
    this.particleSystem = new ParticleSystem(this.sceneManager.particleGroup, 1000);
    this.interactionManager = new InteractionManager(this.sceneManager, this.particleSystem);
    this.controlPanel = new ControlPanel();

    this.bindControlEvents();
    this.setupDebug();
  }

  bindControlEvents(): void {
    this.controlPanel.onEmotionChange((value) => {
      this.particleSystem.setEmotion(value);
    });

    this.controlPanel.onReset(() => {
      this.particleSystem.startReset();
    });

    this.interactionManager.onParticleClick = (_index) => {
    };
  }

  setupDebug(): void {
    const urlParams = new URLSearchParams(window.location.search);
    this.showFPS = urlParams.has('debug') || urlParams.has('fps');

    if (this.showFPS) {
      const fpsDisplay = document.createElement('div');
      fpsDisplay.id = 'fps-display';
      Object.assign(fpsDisplay.style, {
        position: 'absolute',
        top: '10px',
        left: '10px',
        color: '#00ff88',
        fontFamily: 'monospace',
        fontSize: '12px',
        padding: '6px 10px',
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '4px',
        zIndex: '999',
        pointerEvents: 'none'
      } as CSSStyleDeclaration);
      document.body.appendChild(fpsDisplay);
    }
  }

  updateFPS(delta: number): void {
    if (!this.showFPS) return;
    this.frameCount++;
    this.fpsAccumulator += delta;

    if (this.fpsAccumulator >= 0.5) {
      this.currentFPS = Math.round(this.frameCount / this.fpsAccumulator);
      const display = document.getElementById('fps-display');
      if (display) {
        display.textContent = `FPS: ${this.currentFPS} | Particles: ${this.particleSystem.count}`;
      }
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }
  }

  animate = (): void => {
    if (!this.running) return;

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    this.elapsedTime += deltaTime;

    this.particleSystem.update(deltaTime, this.elapsedTime);
    this.interactionManager.update(deltaTime);
    this.updateFPS(deltaTime);
    this.sceneManager.render();

    this.rafId = requestAnimationFrame(this.animate);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.animate();
    console.log('思绪星云启动 | Thought Nebula started');
    console.log('模块调用关系:');
    console.log('  main.ts -> scene.ts (场景初始化)');
    console.log('          -> particles.ts (粒子系统, 接收scene.ts的group)');
    console.log('          -> interaction.ts (交互, 接收scene和particle系统)');
    console.log('          -> controls.ts (控制面板, 事件发射器通知particles更新)');
    console.log('数据流: controls(事件) -> particleSystem.setEmotion() -> 每帧update() -> GPU渲染');
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  dispose(): void {
    this.stop();
    if (this.sceneManager.renderer.domElement.parentNode) {
      this.sceneManager.renderer.domElement.parentNode.removeChild(
        this.sceneManager.renderer.domElement
      );
    }
    this.sceneManager.renderer.dispose();
  }
}

declare global {
  interface Window {
    thoughtNebula?: ThoughtNebulaApp;
  }
}

function bootstrap(): void {
  try {
    const app = new ThoughtNebulaApp('app');
    window.thoughtNebula = app;
    app.start();
  } catch (error) {
    console.error('思绪星云启动失败:', error);
    const container = document.getElementById('app');
    if (container) {
      container.innerHTML = `<div style="color:#fff;padding:20px;font-family:sans-serif">
        <h2 style="margin-bottom:12px">启动错误</h2>
        <pre style="background:rgba(0,0,0,0.3);padding:12px;border-radius:6px;overflow:auto">${error}</pre>
      </div>`;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

export { ThoughtNebulaApp };

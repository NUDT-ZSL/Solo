import { AudioAnalyzer } from './audioAnalyzer';
import { WaveCore } from './waveCore';
import { ThreeScene } from './threeScene';
import { UIController } from './uiController';

class App {
  private audioAnalyzer: AudioAnalyzer;
  private waveCore: WaveCore;
  private threeScene: ThreeScene;
  private uiController: UIController;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 0;

  constructor() {
    this.audioAnalyzer = new AudioAnalyzer();
    this.waveCore = new WaveCore();
    this.threeScene = new ThreeScene('canvas-container', this.waveCore);
    this.uiController = new UIController(this.audioAnalyzer, this.waveCore, this.threeScene);

    this.threeScene.setOnRenderCallback(this.onRender.bind(this));
    
    window.addEventListener('beforeunload', this.cleanup.bind(this));

    console.log('🎵 3D音乐波形可视化应用已启动');
  }

  private onRender(): void {
    const frequencyData = this.audioAnalyzer.getFrequencyData();
    const waveformData = this.audioAnalyzer.getWaveformData();

    if (frequencyData.length > 0 && waveformData.length > 0) {
      this.waveCore.updateWave(frequencyData, waveformData);
    }

    this.updateFPS();
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
      
      if (this.fps < 45) {
        console.warn(`FPS较低: ${this.fps}, 建议降低粒子数量或波形柱数量`);
      }
    }
  }

  getFPS(): number {
    return this.fps;
  }

  private cleanup(): void {
    this.uiController.cleanup();
    this.threeScene.cleanup();
    this.audioAnalyzer.cleanup();
    this.waveCore.cleanup();
    console.log('应用已清理');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});

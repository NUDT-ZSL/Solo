import { AudioAnalyzer } from './audioAnalyzer';
import { Visualizer } from './visualizer';
import { Controls } from './controls';

class App {
  private analyzer: AudioAnalyzer;
  private visualizer: Visualizer;
  private controls: Controls | null = null;
  private rafId: number = 0;

  constructor() {
    this.analyzer = new AudioAnalyzer();

    const canvas = document.getElementById('visualizerCanvas') as HTMLCanvasElement;
    const previewCanvas = document.getElementById('spectrumPreview') as HTMLCanvasElement;
    this.visualizer = new Visualizer(canvas, previewCanvas);
  }

  async init(): Promise<void> {
    await this.analyzer.init();
    this.controls = new Controls(this.analyzer, this.visualizer);
    window.addEventListener('resize', () => this.visualizer.resize());
    this.animate();
  }

  private animate = (): void => {
    const data = this.analyzer.getAudioData();
    this.visualizer.render(data);
    this.rafId = requestAnimationFrame(this.animate);
  };

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.analyzer.stopAll();
  }
}

const app = new App();
app.init();

import * as THREE from 'three';
import { saveAs } from 'file-saver';
import { StarField } from '../scene/StarField';

export type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

export interface ExportOptions {
  width?: number;
  height?: number;
  filename?: string;
  freezeDuration?: number;
}

type StatusCallback = (status: ExportStatus) => void;

const DEFAULT_OPTIONS: Required<ExportOptions> = {
  width: 1920,
  height: 1080,
  filename: 'nebula-weaver.png',
  freezeDuration: 300
};

export class ExportController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private starField: StarField;
  private statusCallbacks: Set<StatusCallback> = new Set();
  private status: ExportStatus = 'idle';

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    starField: StarField
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.starField = starField;
  }

  private setStatus(status: ExportStatus): void {
    this.status = status;
    this.statusCallbacks.forEach(cb => cb(status));
  }

  getStatus(): ExportStatus {
    return this.status;
  }

  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async exportScreenshot(options: ExportOptions = {}): Promise<boolean> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (this.status === 'exporting') {
      return false;
    }

    this.setStatus('exporting');

    try {
      this.starField.setFrozen(true);

      await this.sleep(opts.freezeDuration);

      this.renderer.render(this.scene, this.camera);

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = opts.width;
      offscreenCanvas.height = opts.height;

      const offscreenRenderer = new THREE.WebGLRenderer({
        canvas: offscreenCanvas,
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: false
      });

      offscreenRenderer.setPixelRatio(1);
      offscreenRenderer.setSize(opts.width, opts.height, false);
      offscreenRenderer.setClearColor(0x000000, 1);
      offscreenRenderer.shadowMap.enabled = this.renderer.shadowMap.enabled;
      offscreenRenderer.toneMapping = this.renderer.toneMapping;
      offscreenRenderer.toneMappingExposure = this.renderer.toneMappingExposure;

      const aspect = opts.width / opts.height;
      const originalAspect = this.camera.aspect;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();

      offscreenRenderer.render(this.scene, this.camera);

      this.camera.aspect = originalAspect;
      this.camera.updateProjectionMatrix();

      const dataUrl = offscreenCanvas.toDataURL('image/png');
      offscreenRenderer.dispose();

      const base64Data = dataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      saveAs(blob, opts.filename);

      this.starField.setFrozen(false);

      this.setStatus('success');

      await this.sleep(500);

      this.setStatus('idle');

      return true;
    } catch (error) {
      console.error('Export failed:', error);
      this.starField.setFrozen(false);
      this.setStatus('error');
      await this.sleep(500);
      this.setStatus('idle');
      return false;
    }
  }
}

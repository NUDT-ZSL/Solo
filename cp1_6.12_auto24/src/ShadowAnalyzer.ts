import * as THREE from 'three';

export class ShadowAnalyzer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private groundPlane: THREE.Mesh;
  private orthoCamera: THREE.OrthographicCamera;
  private renderTarget: THREE.WebGLRenderTarget;
  private pixelBuffer: Uint8Array;
  private analysisInterval: number = 1000;
  private lastAnalysisTime: number = 0;
  private cachedCoverage: number = 0;
  private textureSize: number = 512;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    groundPlane: THREE.Mesh
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.groundPlane = groundPlane;

    const bounds = new THREE.Box3().setFromObject(groundPlane);
    const size = bounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z);

    this.orthoCamera = new THREE.OrthographicCamera(
      -maxDim / 2,
      maxDim / 2,
      maxDim / 2,
      -maxDim / 2,
      0.1,
      1000
    );
    this.orthoCamera.position.set(0, 100, 0);
    this.orthoCamera.lookAt(0, 0, 0);

    this.renderTarget = new THREE.WebGLRenderTarget(
      this.textureSize,
      this.textureSize,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      }
    );

    this.pixelBuffer = new Uint8Array(
      this.textureSize * this.textureSize * 4
    );
  }

  public update(currentTime: number): number {
    if (currentTime - this.lastAnalysisTime >= this.analysisInterval) {
      this.lastAnalysisTime = currentTime;
      this.cachedCoverage = this.calculateCoverage();
    }
    return this.cachedCoverage;
  }

  private calculateCoverage(): number {
    const originalClearAlpha = this.renderer.getClearAlpha();
    const originalAutoClear = this.renderer.autoClear;

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.autoClear = true;
    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.clear();

    const originalVisibility: Map<THREE.Object3D, boolean> = new Map();
    this.scene.traverse((obj) => {
      if (obj !== this.groundPlane && obj.type !== 'DirectionalLight') {
        originalVisibility.set(obj, obj.visible);
        obj.visible = false;
      }
    });

    this.renderer.render(this.scene, this.orthoCamera);

    const gl = this.renderer.getContext();
    gl.readPixels(
      0,
      0,
      this.textureSize,
      this.textureSize,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.pixelBuffer
    );

    originalVisibility.forEach((visible, obj) => {
      obj.visible = visible;
    });

    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(0x1e2a38, originalClearAlpha);
    this.renderer.autoClear = originalAutoClear;

    return this.analyzePixels();
  }

  private analyzePixels(): number {
    let shadowPixels = 0;
    let totalPixels = 0;
    const threshold = 200;

    for (let i = 0; i < this.pixelBuffer.length; i += 4) {
      const r = this.pixelBuffer[i];
      const g = this.pixelBuffer[i + 1];
      const b = this.pixelBuffer[i + 2];
      const a = this.pixelBuffer[i + 3];

      if (a > 0) {
        totalPixels++;
        const brightness = (r + g + b) / 3;
        if (brightness < threshold) {
          shadowPixels++;
        }
      }
    }

    if (totalPixels === 0) return 0;

    const coverage = (shadowPixels / totalPixels) * 100;
    return Math.round(coverage * 10) / 10;
  }

  public getCoverage(): number {
    return this.cachedCoverage;
  }

  public setAnalysisInterval(ms: number): void {
    this.analysisInterval = ms;
  }

  public dispose(): void {
    this.renderTarget.dispose();
  }
}

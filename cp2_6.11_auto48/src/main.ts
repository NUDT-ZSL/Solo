import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';
import { ConnectionLines } from './connectionLines';
import { InteractionManager } from './interaction';
import { UIManager } from './uiManager';
import { ShareManager } from './shareManager';
import type { ClusterData, NebulaState } from './types';

class MemoryNebulaApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private particleSystem: ParticleSystem;
  private connectionLines: ConnectionLines;
  private interactionManager: InteractionManager;
  private uiManager: UIManager;

  private currentText = '';
  private animationId: number | null = null;
  private isInitialized = false;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    this.camera.position.z = 120;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.particleSystem = new ParticleSystem(this.scene);
    this.connectionLines = new ConnectionLines(this.scene);
    this.interactionManager = new InteractionManager(
      this.container,
      this.camera,
      this.particleSystem,
      this.connectionLines
    );
    this.uiManager = new UIManager();

    this.bindUIEvents();
    this.setupResizeHandler();
  }

  private bindUIEvents(): void {
    const generateBtn = this.uiManager.getGenerateButton();
    const input = this.uiManager.getInputElement();

    generateBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (text) {
        this.generateNebula(text);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = input.value.trim();
        if (text) {
          this.generateNebula(text);
        }
      }
    });

    this.uiManager.getSaveButton().addEventListener('click', () => {
      this.saveNebula();
    });

    this.uiManager.getShareButton().addEventListener('click', () => {
      this.shareNebula();
    });

    this.uiManager.getResetButton().addEventListener('click', () => {
      this.interactionManager.resetView();
    });

    this.interactionManager.onClusterClick = (cluster: ClusterData) => {
      const hoverInfo = this.interactionManager.getHoverInfo();
      this.uiManager.showDetailCard(
        cluster,
        hoverInfo.screenX || window.innerWidth / 2,
        hoverInfo.screenY || window.innerHeight / 2
      );
    };

    this.interactionManager.onHoverChange = (hoverInfo) => {
      this.uiManager.updateHoverLabel(hoverInfo);
    };

    this.interactionManager.onClusterDragEnd = () => {
      this.connectionLines.createFromClusters(this.particleSystem.getClusters());
    };
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
    });
  }

  public generateNebula(text: string): void {
    this.currentText = text;
    this.uiManager.hideDetailCard();

    const { clusters } = this.particleSystem.createFromText(text);
    this.connectionLines.createFromClusters(clusters);

    this.interactionManager.resetView();

    if (!this.isInitialized) {
      this.isInitialized = true;
      this.animate();
    }
  }

  private saveNebula(): void {
    if (!this.currentText) {
      this.uiManager.showToast('请先生成一个星云');
      return;
    }

    const state = ShareManager.generateState(
      this.currentText,
      this.particleSystem.getClusters(),
      this.particleSystem.getParticles(),
      this.connectionLines.getConnections(),
      {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      {
        x: this.camera.rotation.x,
        y: this.camera.rotation.y
      }
    );

    ShareManager.saveToFile(state);
    this.uiManager.showToast('星云已保存到本地');
  }

  private shareNebula(): void {
    if (!this.currentText) {
      this.uiManager.showToast('请先生成一个星云');
      return;
    }

    const state = ShareManager.generateState(
      this.currentText,
      this.particleSystem.getClusters(),
      this.particleSystem.getParticles(),
      this.connectionLines.getConnections(),
      {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      {
        x: this.camera.rotation.x,
        y: this.camera.rotation.y
      }
    );

    const shareLink = ShareManager.generateShareLink(state);
    
    ShareManager.copyToClipboard(shareLink).then(() => {
      this.uiManager.showToast('分享链接已复制到剪贴板');
    }).catch(() => {
      this.uiManager.showToast('复制失败，请手动复制链接');
      console.log('Share link:', shareLink);
    });
  }

  public loadState(state: NebulaState): void {
    this.currentText = state.text;
    
    const input = this.uiManager.getInputElement();
    input.value = state.text;

    this.particleSystem.setClusters(state.clusters);
    this.particleSystem.setParticles(state.particles);
    this.connectionLines.setConnections(state.connections);

    this.interactionManager.setCameraState({
      targetRotationX: state.camera.rotation.x,
      targetRotationY: state.camera.rotation.y
    });

    if (!this.isInitialized) {
      this.isInitialized = true;
      this.animate();
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.interactionManager.update(deltaTime);
    this.particleSystem.update(deltaTime);
    this.connectionLines.update(this.particleSystem.getClusters(), deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  public init(): void {
    const savedState = ShareManager.parseShareLink();
    
    if (savedState) {
      this.loadState(savedState);
      this.uiManager.showToast('已加载分享的星云');
    } else {
      const defaultText = '记忆是一片星空，每颗星星都是一段往事 快乐的时候星光温暖 悲伤的时候星辰冷静 而那些平淡的日子 就像散落的星尘 默默守护着我们的宇宙';
      const input = this.uiManager.getInputElement();
      input.value = defaultText;
      this.generateNebula(defaultText);
    }
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    
    this.particleSystem.dispose();
    this.connectionLines.dispose();
    this.interactionManager.dispose();
    this.renderer.dispose();
    
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

let app: MemoryNebulaApp | null = null;

function initApp() {
  app = new MemoryNebulaApp();
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export default MemoryNebulaApp;

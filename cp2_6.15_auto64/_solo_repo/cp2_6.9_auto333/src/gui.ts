import * as THREE from 'three';
import { GUI } from 'dat.gui';
import { LightingManager, LightType, LightConfig } from './lighting';
import { SculptureManager, MaterialType } from './sculpture';
import { ShadowManager } from './shadow';
import { SceneManager } from './scene';

export class GUIManager {
  gui: GUI;
  private lightingManager: LightingManager;
  private sculptureManager: SculptureManager;
  private shadowManager: ShadowManager;
  private sceneManager: SceneManager;
  private fpsElement: HTMLElement;
  private lightInfoElement: HTMLElement;

  constructor(
    lightingManager: LightingManager,
    sculptureManager: SculptureManager,
    shadowManager: ShadowManager,
    sceneManager: SceneManager
  ) {
    this.lightingManager = lightingManager;
    this.sculptureManager = sculptureManager;
    this.shadowManager = shadowManager;
    this.sceneManager = sceneManager;

    this.gui = new GUI({ title: '控制面板', width: 280 });
    this.gui.domElement.style.position = 'fixed';
    this.gui.domElement.style.top = '16px';
    this.gui.domElement.style.right = '16px';
    this.gui.domElement.style.zIndex = '200';
    this.gui.domElement.style.borderRadius = '12px';
    this.gui.domElement.style.overflow = 'hidden';

    this.fpsElement = document.getElementById('fps-value')!;
    this.lightInfoElement = document.getElementById('light-info')!;

    this.init();
  }

  private init(): void {
    this.createLightControls();
    this.createMaterialControls();
    this.createShadowControls();
  }

  private createLightControls(): void {
    const configs = this.lightingManager.getLightConfigs();

    for (const config of configs) {
      const folder = this.gui.addFolder(config.name);
      const pos = {
        x: config.position.x,
        y: config.position.y,
        z: config.position.z
      };

      folder.add(pos, 'x', -5, 5, 0.01)
        .name('位置 X')
        .onChange((v: number) => {
          this.lightingManager.updateLightPosition(config.id, v, pos.y, pos.z);
        });

      folder.add(pos, 'y', -5, 5, 0.01)
        .name('位置 Y')
        .onChange((v: number) => {
          this.lightingManager.updateLightPosition(config.id, pos.x, v, pos.z);
        });

      folder.add(pos, 'z', -5, 5, 0.01)
        .name('位置 Z')
        .onChange((v: number) => {
          this.lightingManager.updateLightPosition(config.id, pos.x, pos.y, v);
        });

      const colorObj = { color: config.color };
      folder.addColor(colorObj, 'color')
        .name('颜色')
        .onChange((v: string) => {
          this.lightingManager.updateLightColor(config.id, v);
        });

      folder.add(config, 'intensity', 0.5, 3.0, 0.01)
        .name('强度')
        .onChange((v: number) => {
          this.lightingManager.updateLightIntensity(config.id, v);
        });

      const typeObj = { type: config.type };
      folder.add(typeObj, 'type', { '点光源': 'point', '方向光': 'directional', '聚光灯': 'spot' } as Record<string, LightType>)
        .name('类型')
        .onChange((v: LightType) => {
          this.lightingManager.changeLightType(config.id, v);
        });

      if (config.type === 'spot' || config.angle !== undefined) {
        const angleObj = { angle: config.angle ?? 30 };
        folder.add(angleObj, 'angle', 10, 90, 1)
          .name('聚光角度')
          .onChange((v: number) => {
            this.lightingManager.updateLightAngle(config.id, v);
          });
      }

      const decayObj = { decay: config.decay ?? 2 };
      folder.add(decayObj, 'decay', 0, 5, 0.1)
        .name('衰减')
        .onChange((v: number) => {
          this.lightingManager.updateLightDecay(config.id, v);
        });

      folder.open();
    }
  }

  private createMaterialControls(): void {
    const folder = this.gui.addFolder('雕塑材质');

    const matObj = { material: this.sculptureManager.materialType as MaterialType };
    folder.add(matObj, 'material', { '磨砂玻璃': 'glass', '高光镀铬': 'chrome' } as Record<string, MaterialType>)
      .name('材质类型')
      .onChange((v: MaterialType) => {
        this.sculptureManager.setMaterialType(v, 0.8);
        this.updateButtonActive(v);
      });

    folder.add({ roughness: this.sculptureManager.material.roughness }, 'roughness', 0, 1, 0.01)
      .name('粗糙度')
      .onChange((v: number) => {
        this.sculptureManager.setRoughness(v);
      });

    const faceObj = { faces: Math.round(this.sculptureManager.getFaceCount()) };
    folder.add(faceObj, 'faces', 20, 200, 1)
      .name('面数')
      .onFinishChange((v: number) => {
        this.sculptureManager.regenerateGeometry(Math.round(v));
      });

    folder.open();
  }

  private createShadowControls(): void {
    const folder = this.gui.addFolder('阴影设置');

    const sizeObj = { size: 2048 };
    folder.add(sizeObj, 'size', { '512': 512, '1024': 1024, '2048': 2048 })
      .name('阴影分辨率')
      .onChange((v: number) => {
        this.shadowManager.setShadowMapSize(v);
        const lights = this.lightingManager.lights;
        this.shadowManager.updateAllShadows(lights);
      });

    folder.open();
  }

  updateButtonActive(type: MaterialType): void {
    const btnGlass = document.getElementById('btn-glass') as HTMLButtonElement;
    const btnChrome = document.getElementById('btn-chrome') as HTMLButtonElement;
    if (btnGlass && btnChrome) {
      btnGlass.classList.toggle('active', type === 'glass');
      btnChrome.classList.toggle('active', type === 'chrome');
    }
  }

  updateInfoPanel(): void {
    if (this.fpsElement) {
      this.fpsElement.textContent = String(this.sceneManager.fps);
    }

    if (this.lightInfoElement) {
      const configs = this.lightingManager.getLightConfigs();
      let html = '';
      for (const config of configs) {
        const typeLabel = this.getTypeLabel(config.type);
        html += `
          <div class="light-item">
            <span class="light-dot" style="background:${config.color}"></span>
            <span>${config.name}</span>
            <span style="opacity:0.6">[${typeLabel}]</span>
            <span style="color:#FFD700">${config.intensity.toFixed(1)}</span>
          </div>
        `;
      }
      this.lightInfoElement.innerHTML = html;
    }
  }

  private getTypeLabel(type: LightType): string {
    switch (type) {
      case 'point': return '点光';
      case 'directional': return '平行';
      case 'spot': return '聚光';
    }
  }
}

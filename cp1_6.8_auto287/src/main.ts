import * as THREE from 'three';
import { SceneSetup } from './SceneSetup';
import { Medium, MediumType } from './Medium';
import { LightBeam } from './LightBeam';
import { ControlPanel } from './ControlPanel';

class App {
  private sceneSetup: SceneSetup;
  private media: Medium[] = [];
  private lightBeam: LightBeam;
  private controlPanel: ControlPanel;
  private selectedMedium: Medium | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;

  constructor() {
    const container = document.getElementById('app')!;
    this.sceneSetup = new SceneSetup(container);
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.media = [
      new Medium('sphere', this.sceneSetup.scene),
      new Medium('cube', this.sceneSetup.scene),
      new Medium('prism', this.sceneSetup.scene),
    ];

    this.lightBeam = new LightBeam(this.sceneSetup.scene);

    this.controlPanel = new ControlPanel({
      refractionIndex: 1.52,
      sourceAngle: 0,
      dispersionStrength: 0.5,
      onRefractionChange: (v) => this.onRefractionChange(v),
      onAngleChange: (v) => this.onAngleChange(v),
      onDispersionChange: (v) => this.onDispersionChange(v),
      onReset: () => this.onReset(),
    });

    this.addGroundGrid();
    this.addBackgroundStars();
    this.setupInteraction();

    this.animate();
  }

  private addGroundGrid(): void {
    const gridHelper = new THREE.GridHelper(30, 30, 0x111133, 0x0a0a22);
    gridHelper.position.y = -2;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    this.sceneSetup.scene.add(gridHelper);
  }

  private addBackgroundStars(): void {
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

      const brightness = 0.3 + Math.random() * 0.4;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness * (1 + Math.random() * 0.3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const stars = new THREE.Points(geometry, material);
    this.sceneSetup.scene.add(stars);
  }

  private setupInteraction(): void {
    const canvas = this.sceneSetup.renderer.domElement;

    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.sceneSetup.camera);

      let clickedMedium: Medium | null = null;
      for (const medium of this.media) {
        const intersects = this.raycaster.intersectObject(medium.mesh);
        if (intersects.length > 0) {
          clickedMedium = medium;
          break;
        }
      }

      for (const medium of this.media) {
        medium.setSelected(medium === clickedMedium);
      }

      this.selectedMedium = clickedMedium;
      this.controlPanel.updateFromMedium(clickedMedium);

      if (clickedMedium) {
        this.cycleMediumColor(clickedMedium);
      }
    });

    canvas.addEventListener('touchend', (event) => {
      if (event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.sceneSetup.camera);

      for (const medium of this.media) {
        const intersects = this.raycaster.intersectObject(medium.mesh);
        if (intersects.length > 0) {
          medium.setSelected(!medium.selected);
          this.selectedMedium = medium.selected ? medium : null;
          this.controlPanel.updateFromMedium(this.selectedMedium);
          if (medium.selected) this.cycleMediumColor(medium);
          break;
        }
      }
    });
  }

  private cycleMediumColor(medium: Medium): void {
    const colorPalette: Record<MediumType, THREE.ColorRepresentation[]> = {
      sphere: [0x88ccff, 0xff88aa, 0x88ffaa, 0xffaa44],
      cube: [0x44aaff, 0xaa44ff, 0x44ffaa, 0xff4488],
      prism: [0xaaddff, 0xffddaa, 0xddaaff, 0xaaffdd],
    };

    const palette = colorPalette[medium.type];
    const currentColorHex = '#' + medium.color.getHexString();
    const currentIndex = palette.findIndex(c => '#' + new THREE.Color(c).getHexString() === currentColorHex);
    const nextIndex = (currentIndex + 1) % palette.length;
    medium.setColor(palette[nextIndex]);
  }

  private onRefractionChange(value: number): void {
    if (this.selectedMedium) {
      this.selectedMedium.setRefractionIndex(value);
    } else {
      for (const medium of this.media) {
        medium.setRefractionIndex(value);
      }
    }
  }

  private onAngleChange(value: number): void {
    this.lightBeam.setSourceAngle(value);
  }

  private onDispersionChange(value: number): void {
    this.lightBeam.setDispersionStrength(value);
  }

  private onReset(): void {
    const defaults: Record<MediumType, { refractionIndex: number; color: THREE.ColorRepresentation }> = {
      sphere: { refractionIndex: 1.52, color: 0x88ccff },
      cube: { refractionIndex: 1.33, color: 0x44aaff },
      prism: { refractionIndex: 1.65, color: 0xaaddff },
    };

    for (const medium of this.media) {
      const d = defaults[medium.type];
      medium.setRefractionIndex(d.refractionIndex);
      medium.setColor(d.color);
      medium.setSelected(false);
    }

    this.selectedMedium = null;
    this.controlPanel.updateFromMedium(null);
    this.lightBeam.setSourceAngle(0);
    this.lightBeam.setDispersionStrength(0.5);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const clampedDelta = Math.min(deltaTime, 0.05);

    for (const medium of this.media) {
      medium.update(clampedDelta);
    }

    this.lightBeam.update(clampedDelta, this.media);
    this.sceneSetup.update();
    this.sceneSetup.render();
  }
}

new App();

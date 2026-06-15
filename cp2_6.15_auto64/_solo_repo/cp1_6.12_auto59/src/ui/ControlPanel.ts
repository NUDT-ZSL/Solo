import GUI from 'lil-gui';
import { CSVLoader } from '@loader/CSVLoader';
import type { DensityMappingMode } from '@/types';
import { eventBus } from '@/utils/EventBus';

export interface ControlPanelSettings {
  resolution: number;
  mappingMode: DensityMappingMode;
  cutXEnabled: boolean;
  cutYEnabled: boolean;
  cutZEnabled: boolean;
  cutXPosition: number;
  cutYPosition: number;
  cutZPosition: number;
  probeRadius: number;
  probeEnabled: boolean;
}

export class ControlPanel {
  public gui: GUI;
  public settings: ControlPanelSettings;
  public csvLoader: CSVLoader;
  private fileInput: HTMLInputElement;
  private onChangeCallbacks: ((settings: ControlPanelSettings) => void)[] = [];
  private onFileLoadedCallbacks: ((points: any[]) => void)[] = [];

  constructor() {
    this.csvLoader = new CSVLoader();
    this.settings = {
      resolution: 32,
      mappingMode: 'linear',
      cutXEnabled: false,
      cutYEnabled: false,
      cutZEnabled: false,
      cutXPosition: 0.5,
      cutYPosition: 0.5,
      cutZPosition: 0.5,
      probeRadius: 1.5,
      probeEnabled: false
    };

    this.gui = new GUI({ title: 'VoxelFlow Controls' });
    this.fileInput = this.createFileInput();
    this.buildUI();
  }

  public onChange(callback: (settings: ControlPanelSettings) => void): void {
    this.onChangeCallbacks.push(callback);
  }

  public onFileLoaded(callback: (points: any[]) => void): void {
    this.onFileLoadedCallbacks.push(callback);
  }

  public setCutPlanePosition(axis: 'x' | 'y' | 'z', position: number): void {
    const key = `cut${axis.toUpperCase()}Position` as keyof ControlPanelSettings;
    (this.settings as any)[key] = position;
    const ctrl = this.gui.controllers.find(c => c.property === key);
    if (ctrl) ctrl.updateDisplay();
  }

  private buildUI(): void {
    const fileFolder = this.gui.addFolder('📂 Data');
    fileFolder.add(this, 'triggerFileSelect').name('Upload CSV');
    fileFolder.add(this, 'loadSampleData').name('Load Sample');

    const vizFolder = this.gui.addFolder('🎨 Visualization');
    vizFolder.add(this.settings, 'resolution', 8, 64, 1)
      .name('Voxel Resolution')
      .onChange(() => this.notifyChange());
    vizFolder.add(this.settings, 'mappingMode', ['linear', 'log', 'exponential'])
      .name('Density Mapping')
      .onChange(() => this.notifyChange());

    const cutFolder = this.gui.addFolder('✂️ Cut Planes');
    cutFolder.add(this.settings, 'cutXEnabled').name('X-Axis Cut')
      .onChange(() => this.notifyChange());
    cutFolder.add(this.settings, 'cutXPosition', 0, 1, 0.01).name('X Position')
      .onChange(() => this.notifyChange()).listen();
    cutFolder.add(this.settings, 'cutYEnabled').name('Y-Axis Cut')
      .onChange(() => this.notifyChange());
    cutFolder.add(this.settings, 'cutYPosition', 0, 1, 0.01).name('Y Position')
      .onChange(() => this.notifyChange()).listen();
    cutFolder.add(this.settings, 'cutZEnabled').name('Z-Axis Cut')
      .onChange(() => this.notifyChange());
    cutFolder.add(this.settings, 'cutZPosition', 0, 1, 0.01).name('Z Position')
      .onChange(() => this.notifyChange()).listen();

    const probeFolder = this.gui.addFolder('🔍 Probe Tool');
    probeFolder.add(this.settings, 'probeEnabled').name('Enable Probe')
      .onChange(() => this.notifyChange());
    probeFolder.add(this.settings, 'probeRadius', 0.5, 3, 0.1).name('Brush Radius')
      .onChange(() => this.notifyChange());

    fileFolder.open();
    vizFolder.open();
  }

  private createFileInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.style.display = 'none';
    input.addEventListener('change', this.onFileSelected.bind(this));
    document.body.appendChild(input);
    return input;
  }

  private triggerFileSelect(): void {
    this.fileInput.click();
  }

  private async onFileSelected(): Promise<void> {
    try {
      const points = await this.csvLoader.loadFromInput(this.fileInput);
      for (const cb of this.onFileLoadedCallbacks) {
        cb(points);
      }
    } catch (e) {
      console.error('[ControlPanel] File load error:', e);
      alert(e instanceof Error ? e.message : 'Failed to load CSV');
    }
    this.fileInput.value = '';
  }

  private loadSampleData(): void {
    const points: { x: number; y: number; z: number; density: number }[] = [];
    const n = 1000;
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.33) * 1.5;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      const density = Math.max(0, (1.5 - r) * 2 + Math.random() * 0.5);
      points.push({ x, y, z, density });
    }
    for (let i = 0; i < 500; i++) {
      const x = (Math.random() - 0.5) * 0.8;
      const y = (Math.random() - 0.5) * 0.8;
      const z = (Math.random() - 0.5) * 0.8;
      const density = Math.random() * 3 + 2;
      points.push({ x, y, z, density });
    }
    eventBus.emit('csv:loaded', points);
    for (const cb of this.onFileLoadedCallbacks) {
      cb(points);
    }
  }

  private notifyChange(): void {
    eventBus.emit('settings:changed');
    for (const cb of this.onChangeCallbacks) {
      cb(this.settings);
    }
  }
}

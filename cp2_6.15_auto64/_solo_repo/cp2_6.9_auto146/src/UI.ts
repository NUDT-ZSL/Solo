import * as THREE from 'three';
import { PipeSystem, PipeSegmentData } from './PipeSystem';
import { ThermalMap } from './ThermalMap';

export interface HoverInfo {
  object: THREE.Object3D | null;
  point: THREE.Vector3 | null;
  temperature: number;
  pipeIndex: number | null;
  type: 'pipe' | 'floor' | 'wall' | 'bath' | 'furnace' | null;
}

export class UI {
  private pipeSystem: PipeSystem;
  private thermalMap: ThermalMap;
  
  private tempValueEl: HTMLElement;
  private pipeStatusEl: HTMLElement;
  private flowStatusEl: HTMLElement;
  private hoverObjectEl: HTMLElement;
  private tooltipEl: HTMLElement;
  private pipeDetailsEl: HTMLElement;
  
  private btnFlow: HTMLButtonElement;
  private btnColor: HTMLButtonElement;
  private btnThermal: HTMLButtonElement;
  private btnReset: HTMLButtonElement;
  private btnCloseDetails: HTMLButtonElement;
  
  private currentHover: HoverInfo = {
    object: null,
    point: null,
    temperature: 20,
    pipeIndex: null,
    type: null
  };

  constructor(pipeSystem: PipeSystem, thermalMap: ThermalMap) {
    this.pipeSystem = pipeSystem;
    this.thermalMap = thermalMap;
    
    this.tempValueEl = document.getElementById('temp-value')!;
    this.pipeStatusEl = document.getElementById('pipe-status')!;
    this.flowStatusEl = document.getElementById('flow-status')!;
    this.hoverObjectEl = document.getElementById('hover-object')!;
    this.tooltipEl = document.getElementById('tooltip')!;
    this.pipeDetailsEl = document.getElementById('pipe-details')!;
    
    this.btnFlow = document.getElementById('btn-flow') as HTMLButtonElement;
    this.btnColor = document.getElementById('btn-color') as HTMLButtonElement;
    this.btnThermal = document.getElementById('btn-thermal') as HTMLButtonElement;
    this.btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    this.btnCloseDetails = document.getElementById('close-details') as HTMLButtonElement;
    
    this.setupEventListeners();
    this.updateInfoPanel();
  }

  private setupEventListeners(): void {
    this.btnFlow.addEventListener('click', () => {
      const enabled = this.pipeSystem.toggleFlow();
      this.btnFlow.classList.toggle('active', enabled);
      this.flowStatusEl.textContent = enabled ? '运行中' : '已停止';
    });

    this.btnColor.addEventListener('click', () => {
      const enabled = this.pipeSystem.toggleTemperatureColoring();
      this.btnColor.classList.toggle('active', enabled);
    });

    this.btnThermal.addEventListener('click', () => {
      const enabled = this.thermalMap.toggle();
      this.btnThermal.classList.toggle('active', enabled);
    });

    this.btnCloseDetails.addEventListener('click', () => {
      this.hidePipeDetails();
    });

    document.addEventListener('mousemove', (e) => {
      this.updateTooltipPosition(e.clientX, e.clientY);
    });
  }

  public setOnResetView(callback: () => void): void {
    this.btnReset.addEventListener('click', callback);
  }

  public updateHover(info: HoverInfo): void {
    this.currentHover = info;
    
    this.updateInfoPanel();
    this.updateTooltip();
    
    if (info.type === 'pipe' && info.pipeIndex !== null) {
      this.pipeSystem.setHighlightedPipe(info.pipeIndex);
    } else {
      this.pipeSystem.setHighlightedPipe(null);
    }
  }

  private updateInfoPanel(): void {
    const temp = this.currentHover.temperature.toFixed(1);
    this.tempValueEl.textContent = `${temp} ℃`;
    
    const typeMap: Record<string, string> = {
      'pipe': '管道',
      'floor': '地板',
      'wall': '墙壁',
      'bath': '浴池',
      'furnace': '炉灶'
    };
    
    this.hoverObjectEl.textContent = this.currentHover.type 
      ? typeMap[this.currentHover.type] || '未知'
      : '无';
    
    this.pipeStatusEl.textContent = this.currentHover.type === 'pipe' ? '选中' : '正常';
  }

  private updateTooltip(): void {
    if (!this.currentHover.point || !this.currentHover.type) {
      this.tooltipEl.style.display = 'none';
      return;
    }

    const temp = this.currentHover.temperature.toFixed(1);
    let text = `温度: ${temp} ℃`;
    
    if (this.currentHover.type === 'pipe' && this.currentHover.pipeIndex !== null) {
      const pipeData = this.pipeSystem.getPipeData(this.currentHover.pipeIndex);
      if (pipeData) {
        text = `${pipeData.material} | 温度: ${temp} ℃`;
      }
    }
    
    this.tooltipEl.textContent = text;
    this.tooltipEl.style.display = 'block';
  }

  private updateTooltipPosition(x: number, y: number): void {
    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
  }

  public showPipeDetails(pipeData: PipeSegmentData): void {
    document.getElementById('detail-length')!.textContent = `${pipeData.length.toFixed(2)} m`;
    document.getElementById('detail-diameter')!.textContent = `${pipeData.diameter.toFixed(2)} m`;
    document.getElementById('detail-material')!.textContent = pipeData.material;
    document.getElementById('detail-temp')!.textContent = 
      `${pipeData.tempRange[0].toFixed(1)} - ${pipeData.tempRange[1].toFixed(1)} ℃`;
    
    this.pipeDetailsEl.style.display = 'block';
  }

  public hidePipeDetails(): void {
    this.pipeDetailsEl.style.display = 'none';
  }

  public isDetailsVisible(): boolean {
    return this.pipeDetailsEl.style.display === 'block';
  }

  public setFlowStatus(enabled: boolean): void {
    this.flowStatusEl.textContent = enabled ? '运行中' : '已停止';
    this.btnFlow.classList.toggle('active', enabled);
  }
}

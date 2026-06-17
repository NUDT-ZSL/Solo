import { DockingResult, MoleculeData } from '../types';
import { calculateMolecularWeight } from '../data/molecules';

export interface UICallbacks {
  onMoleculeChange: (pairId: string) => void;
  onTemperatureChange: (temperature: number) => void;
  onStartDocking: () => void;
  onResetView: () => void;
}

export class DisplayController {
  private callbacks: UICallbacks;
  
  private elements: Record<string, HTMLElement> = {};
  
  private currentPairName: string = '';
  private currentTemperature: number = 25;
  
  private isMobilePanelOpen: boolean = false;
  private mobileMediaQuery: MediaQueryList;
  
  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.mobileMediaQuery = window.matchMedia('(max-width: 768px)');
    
    this.initializeElements();
    this.setupEventListeners();
    this.setupResponsiveBehavior();
  }
  
  private initializeElements(): void {
    const elementIds = [
      'molecule-pair-name',
      'receptor-atom-count',
      'receptor-bond-count',
      'bond-count-text',
      'molecular-weight',
      'ligand-atom-count',
      'docking-results',
      'binding-energy',
      'docking-distance',
      'key-residues',
      'residues-count',
      'docking-status',
      'status-text',
      'molecule-select',
      'temperature-slider',
      'temperature-value',
      'start-docking-btn',
      'reset-view-btn',
      'fps-value',
      'info-panel',
      'mobile-panel-toggle',
      'toolbar'
    ];
    
    elementIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        this.elements[id] = el;
      }
    });
  }
  
  private setupEventListeners(): void {
    const moleculeSelect = this.elements['molecule-select'] as HTMLSelectElement;
    if (moleculeSelect) {
      moleculeSelect.addEventListener('change', (e) => {
        const value = (e.target as HTMLSelectElement).value;
        this.callbacks.onMoleculeChange(value);
      });
    }
    
    const temperatureSlider = this.elements['temperature-slider'] as HTMLInputElement;
    if (temperatureSlider) {
      temperatureSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value, 10);
        this.updateTemperatureDisplay(value);
        this.callbacks.onTemperatureChange(value);
      });
    }
    
    const startDockingBtn = this.elements['start-docking-btn'] as HTMLButtonElement;
    if (startDockingBtn) {
      startDockingBtn.addEventListener('click', () => {
        this.animateButtonPress(startDockingBtn);
        this.callbacks.onStartDocking();
      });
    }
    
    const resetViewBtn = this.elements['reset-view-btn'] as HTMLButtonElement;
    if (resetViewBtn) {
      resetViewBtn.addEventListener('click', () => {
        this.callbacks.onResetView();
      });
    }
    
    const mobilePanelToggle = this.elements['mobile-panel-toggle'] as HTMLButtonElement;
    if (mobilePanelToggle) {
      mobilePanelToggle.addEventListener('click', () => {
        this.toggleMobilePanel();
      });
    }
  }
  
  private setupResponsiveBehavior(): void {
    const updateLayout = () => {
      const infoPanel = this.elements['info-panel'];
      const mobileToggle = this.elements['mobile-panel-toggle'];
      
      if (this.mobileMediaQuery.matches) {
        mobileToggle?.classList.remove('hidden');
        if (!this.isMobilePanelOpen) {
          infoPanel?.classList.add('mobile-collapsed');
        }
      } else {
        mobileToggle?.classList.add('hidden');
        infoPanel?.classList.remove('mobile-collapsed');
        this.isMobilePanelOpen = false;
      }
    };
    
    updateLayout();
    this.mobileMediaQuery.addEventListener('change', updateLayout);
  }
  
  private toggleMobilePanel(): void {
    this.isMobilePanelOpen = !this.isMobilePanelOpen;
    const infoPanel = this.elements['info-panel'];
    
    if (this.isMobilePanelOpen) {
      infoPanel?.classList.remove('mobile-collapsed');
    } else {
      infoPanel?.classList.add('mobile-collapsed');
    }
  }
  
  private animateButtonPress(button: HTMLButtonElement): void {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
      button.style.transform = '';
    }, 100);
  }
  
  public updateMoleculeInfo(
    pairName: string,
    receptorData: MoleculeData,
    ligandData: MoleculeData
  ): void {
    this.currentPairName = pairName;
    
    this.setText('molecule-pair-name', pairName);
    this.setText('receptor-atom-count', receptorData.atoms.length.toLocaleString());
    this.setText('bond-count-text', receptorData.bonds.length.toLocaleString());
    this.setText('ligand-atom-count', ligandData.atoms.length.toString());
    
    const molecularWeight = calculateMolecularWeight(receptorData.atoms);
    this.setText('molecular-weight', `${Math.round(molecularWeight).toLocaleString()} Da`);
    
    this.hideDockingResults();
  }
  
  public updateTemperatureDisplay(temperature: number): void {
    this.currentTemperature = temperature;
    this.setText('temperature-value', temperature.toString());
    
    const slider = this.elements['temperature-slider'] as HTMLInputElement;
    if (slider && parseInt(slider.value, 10) !== temperature) {
      slider.value = temperature.toString();
    }
  }
  
  public updateFps(fps: number): void {
    const fpsElement = this.elements['fps-value'];
    if (fpsElement) {
      fpsElement.textContent = fps.toString();
      
      if (fps >= 55) {
        fpsElement.style.color = '#43A047';
      } else if (fps >= 45) {
        fpsElement.style.color = '#FFD54F';
      } else {
        fpsElement.style.color = '#FF7043';
      }
    }
  }
  
  public updateDistance(distance: number): void {
    this.setText('docking-distance', `${distance.toFixed(2)} Å`);
  }
  
  public updateStatus(status: string, type: 'default' | 'approaching' | 'docking' | 'docked' = 'default'): void {
    const statusText = this.elements['status-text'];
    const statusIndicator = document.querySelector('.status-indicator') as HTMLElement;
    
    if (statusText) {
      statusText.textContent = status;
    }
    
    if (statusIndicator) {
      statusIndicator.className = 'status-indicator';
      statusIndicator.classList.add(`status-${type}`);
    }
  }
  
  public showDockingResults(result: DockingResult): void {
    const dockingResults = this.elements['docking-results'];
    if (dockingResults) {
      dockingResults.classList.remove('hidden');
      dockingResults.style.opacity = '0';
      dockingResults.style.transform = 'translateY(10px)';
      
      requestAnimationFrame(() => {
        dockingResults.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        dockingResults.style.opacity = '1';
        dockingResults.style.transform = 'translateY(0)';
      });
    }
    
    this.animateBindingEnergy(result.bindingEnergy);
    this.updateDistance(result.distance);
    this.showKeyResidues(result.keyResidues);
    
    this.updateStatus('对接成功！', 'docked');
  }
  
  private animateBindingEnergy(targetValue: number): void {
    const element = this.elements['binding-energy'];
    if (!element) return;
    
    const duration = 1000;
    const startTime = performance.now();
    const startValue = -5;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = startValue + (targetValue - startValue) * eased;
      element.textContent = currentValue.toFixed(1);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  private showKeyResidues(residues: string[]): void {
    const list = this.elements['key-residues'] as HTMLOListElement;
    if (!list) return;
    
    list.innerHTML = '';
    
    const residuesCount = this.elements['residues-count'];
    if (residuesCount) {
      residuesCount.textContent = `${residues.length} 个`;
    }
    
    residues.forEach((residue, index) => {
      const li = document.createElement('li');
      li.className = 'residue-tag';
      li.style.animationDelay = `${index * 80 + 200}ms`;
      li.textContent = residue;
      
      list.appendChild(li);
    });
  }
  
  public hideDockingResults(): void {
    const dockingResults = this.elements['docking-results'];
    if (dockingResults) {
      dockingResults.classList.add('hidden');
    }
    
    this.updateStatus('拖拽配体靠近受体活性位点', 'default');
  }
  
  public setDockingInProgress(inProgress: boolean): void {
    const startBtn = this.elements['start-docking-btn'] as HTMLButtonElement;
    if (startBtn) {
      startBtn.disabled = inProgress;
      startBtn.style.opacity = inProgress ? '0.7' : '1';
      startBtn.textContent = inProgress ? '对接中...' : '开始对接';
    }
    
    if (inProgress) {
      this.updateStatus('正在对接...', 'docking');
    }
  }
  
  public setApproaching(approaching: boolean): void {
    if (approaching) {
      this.updateStatus('配体正在接近活性位点...', 'approaching');
    } else if (!this.elements['docking-results']?.classList.contains('hidden')) {
      this.updateStatus('对接成功！', 'docked');
    } else {
      this.updateStatus('拖拽配体靠近受体活性位点', 'default');
    }
  }
  
  private setText(elementId: string, text: string): void {
    const element = this.elements[elementId];
    if (element) {
      element.textContent = text;
    }
  }
  
  public getTemperature(): number {
    return this.currentTemperature;
  }
  
  public getSelectedMoleculePair(): string {
    const select = this.elements['molecule-select'] as HTMLSelectElement;
    return select?.value || 'spike-inhibitor';
  }
  
  public dispose(): void {
    const moleculeSelect = this.elements['molecule-select'] as HTMLSelectElement;
    const temperatureSlider = this.elements['temperature-slider'] as HTMLInputElement;
    const startDockingBtn = this.elements['start-docking-btn'] as HTMLButtonElement;
    const resetViewBtn = this.elements['reset-view-btn'] as HTMLButtonElement;
    const mobilePanelToggle = this.elements['mobile-panel-toggle'] as HTMLButtonElement;
    
    moleculeSelect?.removeEventListener('change', () => {});
    temperatureSlider?.removeEventListener('input', () => {});
    startDockingBtn?.removeEventListener('click', () => {});
    resetViewBtn?.removeEventListener('click', () => {});
    mobilePanelToggle?.removeEventListener('click', () => {});
  }
}

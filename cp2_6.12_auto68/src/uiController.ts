import { SceneRenderer, MoleculeInfo } from './sceneRenderer';
import { ReactionSimulator, ReactionPhase } from './reactionSimulator';
import {
  MoleculeData,
  getAllMolecules,
  getAllReactions,
  getReactionById,
  getMoleculeById
} from './moleculeManager';

export class UIController {
  private sceneRenderer: SceneRenderer;
  private reactionSimulator: ReactionSimulator;
  private molecules: MoleculeData[] = [];
  private currentMoleculeId: string | null = null;
  private currentReactionId: string | null = null;

  private leftPanel: HTMLElement | null = null;
  private rightPanel: HTMLElement | null = null;
  private toggleLeftBtn: HTMLElement | null = null;
  private toggleRightBtn: HTMLElement | null = null;
  private moleculeList: HTMLElement | null = null;

  private infoName: HTMLElement | null = null;
  private infoFormula: HTMLElement | null = null;
  private infoAtoms: HTMLElement | null = null;
  private infoBonds: HTMLElement | null = null;
  private infoMass: HTMLElement | null = null;

  private reactionSelect: HTMLSelectElement | null = null;
  private reactionEquation: HTMLElement | null = null;
  private startBtn: HTMLButtonElement | null = null;
  private pauseBtn: HTMLButtonElement | null = null;
  private resetBtn: HTMLButtonElement | null = null;
  private replayBtn: HTMLButtonElement | null = null;

  private leftPanelOpen = true;
  private rightPanelOpen = true;
  private isMobile = false;

  constructor(sceneRenderer: SceneRenderer, reactionSimulator: ReactionSimulator) {
    this.sceneRenderer = sceneRenderer;
    this.reactionSimulator = reactionSimulator;
    this.molecules = getAllMolecules();

    this.initElements();
    this.buildMoleculeList();
    this.buildReactionList();
    this.bindEvents();
    this.setupResponsive();

    if (this.molecules.length > 0) {
      this.selectMolecule(this.molecules[0].id);
    }
  }

  private initElements(): void {
    this.leftPanel = document.getElementById('left-panel');
    this.rightPanel = document.getElementById('right-panel');
    this.toggleLeftBtn = document.getElementById('toggle-left');
    this.toggleRightBtn = document.getElementById('toggle-right');
    this.moleculeList = document.getElementById('molecule-list');

    this.infoName = document.getElementById('info-name');
    this.infoFormula = document.getElementById('info-formula');
    this.infoAtoms = document.getElementById('info-atoms');
    this.infoBonds = document.getElementById('info-bonds');
    this.infoMass = document.getElementById('info-mass');

    this.reactionSelect = document.getElementById('reaction-select') as HTMLSelectElement;
    this.reactionEquation = document.getElementById('reaction-equation');
    this.startBtn = document.getElementById('start-reaction') as HTMLButtonElement;
    this.pauseBtn = document.getElementById('pause-reaction') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-reaction') as HTMLButtonElement;
  }

  private buildMoleculeList(): void {
    if (!this.moleculeList) return;

    this.moleculeList.innerHTML = '';

    this.molecules.forEach(molecule => {
      const item = document.createElement('div');
      item.className = 'molecule-item';
      item.dataset.id = molecule.id;

      const thumb = document.createElement('div');
      thumb.className = 'molecule-thumb';
      thumb.innerHTML = this.createMoleculeThumbnail(molecule);

      const name = document.createElement('span');
      name.className = 'molecule-name';
      name.textContent = molecule.name;

      const formula = document.createElement('span');
      formula.className = 'molecule-formula';
      formula.textContent = molecule.formula;

      const infoWrapper = document.createElement('div');
      infoWrapper.className = 'molecule-info-wrapper';
      infoWrapper.appendChild(name);
      infoWrapper.appendChild(formula);

      item.appendChild(thumb);
      item.appendChild(infoWrapper);

      item.addEventListener('click', () => {
        this.selectMolecule(molecule.id);
        if (this.isMobile && this.leftPanelOpen) {
          this.toggleLeftPanel();
        }
      });

      this.moleculeList!.appendChild(item);
    });
  }

  private createMoleculeThumbnail(molecule: MoleculeData): string {
    const colors: Record<string, string> = {
      H: '#ffffff', C: '#909090', N: '#3050f8', O: '#ff0d0d',
      F: '#90e050', Cl: '#1ff01f', Br: '#a62929', I: '#940094',
      S: '#ffff30', P: '#ff8000'
    };

    const size = 48;
    const centerX = size / 2;
    const centerY = size / 2;

    let svg = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;

    const scale = 8;
    const atomPositions = molecule.atoms.map(atom => ({
      x: centerX + atom.x * scale,
      y: centerY - atom.y * scale,
      element: atom.element,
      radius: 4
    }));

    molecule.bonds.forEach(bond => {
      const from = atomPositions[bond.from];
      const to = atomPositions[bond.to];
      if (from && to) {
        svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#666" stroke-width="1.5"/>`;
      }
    });

    atomPositions.forEach(atom => {
      const color = colors[atom.element] || '#888';
      svg += `<circle cx="${atom.x}" cy="${atom.y}" r="${atom.radius}" fill="${color}" stroke="#333" stroke-width="0.5"/>`;
    });

    svg += '</svg>';
    return svg;
  }

  private buildReactionList(): void {
    if (!this.reactionSelect) return;

    const reactions = getAllReactions();
    reactions.forEach(reaction => {
      const option = document.createElement('option');
      option.value = reaction.id;
      option.textContent = reaction.name;
      this.reactionSelect!.appendChild(option);
    });
  }

  private bindEvents(): void {
    if (this.toggleLeftBtn) {
      this.toggleLeftBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleLeftPanel();
      });
    }

    if (this.toggleRightBtn) {
      this.toggleRightBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleRightPanel();
      });
    }

    if (this.reactionSelect) {
      this.reactionSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.selectReaction(target.value);
      });
    }

    if (this.startBtn) {
      this.startBtn.addEventListener('click', (e) => {
        this.createRipple(e);
        this.handleStartButton();
      });
    }

    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => {
        this.togglePause();
      });
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        this.resetReaction();
      });
    }

    this.reactionSimulator.setOnPhaseChangeCallback((phase) => {
      this.updateReactionButtons(phase);
    });

    this.reactionSimulator.setOnPauseChangeCallback((paused) => {
      this.updatePauseButton(paused);
    });
  }

  private createRipple(e: MouseEvent): void {
    const btn = e.currentTarget as HTMLElement;
    const ripple = btn.querySelector('.btn-ripple');
    if (!ripple) return;

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';

    ripple.classList.remove('animate');
    void ripple.offsetWidth;
    ripple.classList.add('animate');
  }

  private selectMolecule(id: string): void {
    this.currentMoleculeId = id;
    const molecule = getMoleculeById(id);
    if (!molecule) return;

    this.reactionSimulator.resetReaction();

    this.sceneRenderer.loadMolecule(molecule, true);

    document.querySelectorAll('.molecule-item').forEach(item => {
      item.classList.remove('active');
    });

    const activeItem = document.querySelector(`.molecule-item[data-id="${id}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }

    if (this.reactionSelect) {
      this.reactionSelect.value = '';
    }
    if (this.reactionEquation) {
      this.reactionEquation.textContent = '-';
    }
  }

  public updateInfo(info: MoleculeInfo): void {
    if (this.infoName) this.infoName.textContent = info.name;
    if (this.infoFormula) this.infoFormula.textContent = info.formula;
    if (this.infoAtoms) this.infoAtoms.textContent = info.atomCount.toString();
    if (this.infoBonds) this.infoBonds.textContent = info.bondCount.toString();
    if (this.infoMass) this.infoMass.textContent = info.molecularWeight.toFixed(3) + ' g/mol';
  }

  private selectReaction(id: string): void {
    this.currentReactionId = id;

    if (!id) {
      if (this.reactionEquation) this.reactionEquation.textContent = '-';
      this.reactionSimulator.resetReaction();
      if (this.currentMoleculeId) {
        const mol = getMoleculeById(this.currentMoleculeId);
        if (mol) this.sceneRenderer.loadMolecule(mol, false);
      }
      return;
    }

    const reaction = getReactionById(id);
    if (!reaction) return;

    if (this.reactionEquation) {
      this.reactionEquation.textContent = reaction.equation;
    }

    this.reactionSimulator.setReaction(reaction);
    this.reactionSimulator.startReaction();
  }

  private handleStartButton(): void {
    const phase = this.reactionSimulator.getPhase();

    if (phase === 'idle') {
      if (!this.currentReactionId) {
        if (this.reactionSelect && this.reactionSelect.value) {
          this.currentReactionId = this.reactionSelect.value;
          const reaction = getReactionById(this.currentReactionId);
          if (reaction) {
            this.reactionSimulator.setReaction(reaction);
          }
        } else {
          return;
        }
      }
      this.reactionSimulator.startReaction();
    } else if (phase === 'complete') {
      this.reactionSimulator.replayReaction();
    } else if (this.reactionSimulator.getIsPaused()) {
      this.reactionSimulator.resumeReaction();
    }
  }

  private togglePause(): void {
    if (this.reactionSimulator.getIsPaused()) {
      this.reactionSimulator.resumeReaction();
    } else {
      this.reactionSimulator.pauseReaction();
    }
  }

  private resetReaction(): void {
    this.reactionSimulator.resetReaction();

    if (this.currentMoleculeId) {
      const mol = getMoleculeById(this.currentMoleculeId);
      if (mol) this.sceneRenderer.loadMolecule(mol, true);
    }

    this.updateReactionButtons('idle');
  }

  private updateReactionButtons(phase: ReactionPhase): void {
    if (!this.startBtn || !this.pauseBtn || !this.resetBtn) return;

    const startText = this.startBtn.querySelector('.btn-text');

    const isPlaying = this.reactionSimulator.getIsPlaying();
    const isPaused = this.reactionSimulator.getIsPaused();

    switch (phase) {
      case 'idle':
        if (startText) startText.textContent = '开始反应';
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        break;

      case 'glow':
      case 'break':
      case 'drift':
      case 'combine':
        if (isPaused) {
          if (startText) startText.textContent = '继续';
        } else {
          if (startText) startText.textContent = '反应中...';
        }
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = false;
        break;

      case 'complete':
        if (startText) startText.textContent = '重新播放';
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        break;
    }
  }

  private updatePauseButton(paused: boolean): void {
    if (!this.pauseBtn) return;

    const pauseText = this.pauseBtn.querySelector('.btn-text');
    if (pauseText) {
      pauseText.textContent = paused ? '继续' : '暂停';
    }
  }

  private toggleLeftPanel(): void {
    this.leftPanelOpen = !this.leftPanelOpen;
    this.updatePanelState();
  }

  private toggleRightPanel(): void {
    this.rightPanelOpen = !this.rightPanelOpen;
    this.updatePanelState();
  }

  private updatePanelState(): void {
    if (this.leftPanel) {
      if (this.leftPanelOpen) {
        this.leftPanel.style.transform = 'translateX(0)';
        this.leftPanel.style.opacity = '1';
        this.leftPanel.style.pointerEvents = 'auto';
      } else {
        this.leftPanel.style.transform = 'translateX(-100%)';
        this.leftPanel.style.opacity = '0';
        this.leftPanel.style.pointerEvents = 'none';
      }
    }

    if (this.rightPanel) {
      if (this.rightPanelOpen) {
        this.rightPanel.style.transform = 'translateX(0)';
        this.rightPanel.style.opacity = '1';
        this.rightPanel.style.pointerEvents = 'auto';
      } else {
        this.rightPanel.style.transform = 'translateX(100%)';
        this.rightPanel.style.opacity = '0';
        this.rightPanel.style.pointerEvents = 'none';
      }
    }

    if (this.toggleLeftBtn) {
      this.toggleLeftBtn.style.left = this.leftPanelOpen ? '240px' : '0';
    }
    if (this.toggleRightBtn) {
      this.toggleRightBtn.style.right = this.rightPanelOpen ? '300px' : '0';
    }
  }

  private setupResponsive(): void {
    const checkWidth = () => {
      const width = window.innerWidth;
      this.isMobile = width < 1024;

      if (this.isMobile) {
        this.leftPanelOpen = false;
        this.rightPanelOpen = false;
        if (this.toggleLeftBtn) this.toggleLeftBtn.style.display = 'flex';
        if (this.toggleRightBtn) this.toggleRightBtn.style.display = 'flex';
      } else {
        this.leftPanelOpen = true;
        this.rightPanelOpen = true;
        if (this.toggleLeftBtn) this.toggleLeftBtn.style.display = 'none';
        if (this.toggleRightBtn) this.toggleRightBtn.style.display = 'none';
      }

      this.updatePanelState();
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
  }

  public dispose(): void {
  }
}

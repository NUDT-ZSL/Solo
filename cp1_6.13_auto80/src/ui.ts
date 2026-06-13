import type { GameState, ToolType, Level } from './entities';

export interface UICallbacks {
  onToolSelect: (tool: ToolType | null) => void;
  onStart: () => void;
  onReset: () => void;
  onOverlayClose: () => void;
}

export class UIManager {
  private elements: {
    levelName: HTMLElement;
    stepCount: HTMLElement;
    timeLeft: HTMLElement;
    toolConveyor: HTMLButtonElement;
    toolSorter: HTMLButtonElement;
    toolArm: HTMLButtonElement;
    countConveyor: HTMLElement;
    countSorter: HTMLElement;
    countArm: HTMLElement;
    startBtn: HTMLButtonElement;
    resetBtn: HTMLButtonElement;
    gameOverlay: HTMLElement;
    overlayTitle: HTMLElement;
    overlayMessage: HTMLElement;
    overlayBtn: HTMLButtonElement;
    canvas: HTMLCanvasElement;
  };

  private callbacks: UICallbacks;
  private selectedTool: ToolType | null = null;

  constructor(callbacks: UICallbacks) {
    this.elements = {
      levelName: document.getElementById('levelName')!,
      stepCount: document.getElementById('stepCount')!,
      timeLeft: document.getElementById('timeLeft')!,
      toolConveyor: document.getElementById('toolConveyor') as HTMLButtonElement,
      toolSorter: document.getElementById('toolSorter') as HTMLButtonElement,
      toolArm: document.getElementById('toolArm') as HTMLButtonElement,
      countConveyor: document.getElementById('countConveyor')!,
      countSorter: document.getElementById('countSorter')!,
      countArm: document.getElementById('countArm')!,
      startBtn: document.getElementById('startBtn') as HTMLButtonElement,
      resetBtn: document.getElementById('resetBtn') as HTMLButtonElement,
      gameOverlay: document.getElementById('gameOverlay')!,
      overlayTitle: document.getElementById('overlayTitle')!,
      overlayMessage: document.getElementById('overlayMessage')!,
      overlayBtn: document.getElementById('overlayBtn') as HTMLButtonElement,
      canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
    };

    this.callbacks = callbacks;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.elements.toolConveyor.addEventListener('click', () => {
      this.selectTool('conveyor');
    });

    this.elements.toolSorter.addEventListener('click', () => {
      this.selectTool('sorter');
    });

    this.elements.toolArm.addEventListener('click', () => {
      this.selectTool('arm');
    });

    this.elements.startBtn.addEventListener('click', () => {
      this.callbacks.onStart();
    });

    this.elements.resetBtn.addEventListener('click', () => {
      this.callbacks.onReset();
    });

    this.elements.overlayBtn.addEventListener('click', () => {
      this.callbacks.onOverlayClose();
    });

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.selectedTool) {
        this.selectTool(null);
      }
    });
  }

  private selectTool(tool: ToolType | null): void {
    if (this.selectedTool === tool) {
      tool = null;
    }

    this.selectedTool = tool;

    [this.elements.toolConveyor, this.elements.toolSorter, this.elements.toolArm].forEach(btn => {
      btn.classList.remove('selected');
    });

    if (tool === 'conveyor') {
      this.elements.toolConveyor.classList.add('selected');
    } else if (tool === 'sorter') {
      this.elements.toolSorter.classList.add('selected');
    } else if (tool === 'arm') {
      this.elements.toolArm.classList.add('selected');
    }

    if (tool) {
      this.elements.canvas.classList.add('tool-active');
    } else {
      this.elements.canvas.classList.remove('tool-active');
    }

    this.callbacks.onToolSelect(tool);
  }

  public updateLevelDisplay(level: Level): void {
    this.elements.levelName.textContent = level.name;
    this.updateToolCounts(level.availableTools);
  }

  public updateToolCounts(available: Record<ToolType, number>): void {
    this.elements.countConveyor.textContent = String(available.conveyor);
    this.elements.countSorter.textContent = String(available.sorter);
    this.elements.countArm.textContent = String(available.arm);

    this.elements.toolConveyor.disabled = available.conveyor <= 0;
    this.elements.toolSorter.disabled = available.sorter <= 0;
    this.elements.toolArm.disabled = available.arm <= 0;
  }

  public updateSteps(steps: number): void {
    this.elements.stepCount.textContent = String(steps);
  }

  public updateTime(time: number): void {
    this.elements.timeLeft.textContent = String(time);

    if (time <= 10) {
      this.elements.timeLeft.classList.add('time-warning');
    } else {
      this.elements.timeLeft.classList.remove('time-warning');
    }
  }

  public setRunning(isRunning: boolean): void {
    this.elements.startBtn.disabled = isRunning;
    this.elements.startBtn.textContent = isRunning ? '⏸ 运行中...' : '▶ 启动传送带';

    this.elements.toolConveyor.disabled = isRunning;
    this.elements.toolSorter.disabled = isRunning;
    this.elements.toolArm.disabled = isRunning;

    if (isRunning && this.selectedTool) {
      this.selectTool(null);
    }
  }

  public showWin(levelId: number, hasNextLevel: boolean): void {
    this.elements.gameOverlay.classList.add('show');
    this.elements.overlayTitle.classList.remove('lose');
    this.elements.overlayTitle.classList.add('win');
    this.elements.overlayTitle.textContent = '🎉 关卡通过！';

    if (hasNextLevel) {
      this.elements.overlayMessage.textContent = `恭喜你完成了关卡 ${levelId}！准备好挑战下一关了吗？`;
      this.elements.overlayBtn.textContent = '下一关';
    } else {
      this.elements.overlayMessage.textContent = '太棒了！你已完成所有关卡！';
      this.elements.overlayBtn.textContent = '重新开始';
    }
  }

  public showLose(): void {
    this.elements.gameOverlay.classList.add('show');
    this.elements.overlayTitle.classList.remove('win');
    this.elements.overlayTitle.classList.add('lose');
    this.elements.overlayTitle.textContent = '⏰ 时间到！';
    this.elements.overlayMessage.textContent = '很遗憾，时间不够了。再试一次吧！';
    this.elements.overlayBtn.textContent = '重新挑战';
  }

  public hideOverlay(): void {
    this.elements.gameOverlay.classList.remove('show');
  }

  public getSelectedTool(): ToolType | null {
    return this.selectedTool;
  }

  public clearSelection(): void {
    this.selectTool(null);
  }

  public addBounceAnimation(element: HTMLElement): void {
    element.classList.remove('bounce-in');
    void element.offsetWidth;
    element.classList.add('bounce-in');
    setTimeout(() => {
      element.classList.remove('bounce-in');
    }, 150);
  }
}

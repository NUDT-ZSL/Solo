export type ClearCallback = () => void;
export type ExportCallback = () => string;

export class Controls {
  private clearBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private pathCountEl: HTMLElement;
  private onClear: ClearCallback;
  private onExport: ExportCallback;

  constructor(
    onClear: ClearCallback,
    onExport: ExportCallback
  ) {
    this.onClear = onClear;
    this.onExport = onExport;

    const clearBtn = document.getElementById('clearBtn');
    const exportBtn = document.getElementById('exportBtn');
    const pathCountEl = document.getElementById('pathCount');

    if (!clearBtn || !exportBtn || !pathCountEl) {
      throw new Error('Control elements not found in DOM');
    }

    this.clearBtn = clearBtn as HTMLButtonElement;
    this.exportBtn = exportBtn as HTMLButtonElement;
    this.pathCountEl = pathCountEl;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.clearBtn.addEventListener('click', () => {
      this.onClear();
    });

    this.exportBtn.addEventListener('click', () => {
      const svgContent = this.onExport();
      this.downloadSVG(svgContent);
    });
  }

  updateCount(count: number): void {
    this.pathCountEl.textContent = String(count);
  }

  private downloadSVG(svgContent: string): void {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `mirror-maze-${timestamp}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

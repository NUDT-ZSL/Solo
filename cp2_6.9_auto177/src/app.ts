import { FontRenderer, type RenderState } from './renderer';
import { UIManager } from './ui';

class Application {
  private ui: UIManager;
  private renderer: FontRenderer;
  private state: RenderState;

  constructor() {
    const previewEl = document.getElementById('preview') as HTMLElement;
    const previewTextEl = document.getElementById('preview-text') as HTMLElement;

    this.ui = new UIManager();
    this.renderer = new FontRenderer(previewEl, previewTextEl);
    this.state = this.ui.getState();

    this.bindEventHandlers();
    this.initialRender();
  }

  private bindEventHandlers(): void {
    this.ui.onChange((newState) => {
      this.handleStateChange(newState);
    });

    this.ui.onAction((action) => {
      this.handleAction(action);
    });

    this.renderer.setOnStatsUpdate((stats) => {
      this.ui.updatePerfMonitor(stats);
    });
  }

  private initialRender(): void {
    this.renderer.render(this.state);
    this.ui.updateCodePanel(this.state);
  }

  private handleStateChange(newState: Partial<RenderState>): void {
    this.state = { ...this.state, ...newState };
    this.renderer.render(this.state);
    this.ui.updateCodePanel(this.state);
  }

  private async handleAction(action: 'copy' | 'export'): Promise<void> {
    switch (action) {
      case 'copy':
        await this.copyCode();
        break;
      case 'export':
        await this.exportPNG();
        break;
    }
  }

  private async copyCode(): Promise<void> {
    try {
      const code = this.ui.generatePlainCode(this.state);
      await navigator.clipboard.writeText(code);
      this.ui.showCopiedFeedback();
    } catch (err) {
      console.error('复制失败:', err);
      this.fallbackCopy(this.ui.generatePlainCode(this.state));
    }
  }

  private fallbackCopy(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      this.ui.showCopiedFeedback();
    } catch (err) {
      console.error('回退复制也失败:', err);
    }
    document.body.removeChild(textarea);
  }

  private async exportPNG(): Promise<void> {
    try {
      const dataUrl = await this.renderer.exportPNG();
      const link = document.createElement('a');
      link.download = `font-effect-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('导出PNG失败:', err);
    }
  }

  destroy(): void {
    this.renderer.destroy();
  }
}

function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      (window as unknown as { __app?: Application }).__app = new Application();
    });
  } else {
    (window as unknown as { __app?: Application }).__app = new Application();
  }
}

bootstrap();

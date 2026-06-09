import type { RenderState, FrameStats } from './renderer';

type ChangeHandler = (state: Partial<RenderState>) => void;
type ActionHandler = (action: 'copy' | 'export') => void;

export class UIManager {
  private controls: {
    fontFamily: HTMLSelectElement;
    textInput: HTMLInputElement;
    fontSize: HTMLInputElement;
    textColor: HTMLInputElement;
    bgColor: HTMLInputElement;
    shadowColor: HTMLInputElement;
    shadowOffsetX: HTMLInputElement;
    shadowOffsetY: HTMLInputElement;
    shadowBlur: HTMLInputElement;
    animationRadios: NodeListOf<HTMLInputElement>;
  };

  private displayEls: {
    shadowXVal: HTMLElement;
    shadowYVal: HTMLElement;
    shadowBlurVal: HTMLElement;
    codePanel: HTMLElement;
    perfMonitor: HTMLElement;
    copyBtn: HTMLButtonElement;
    exportBtn: HTMLButtonElement;
    panel: HTMLElement;
  };

  private onChangeHandler: ChangeHandler | null = null;
  private onActionHandler: ActionHandler | null = null;

  constructor() {
    this.controls = {
      fontFamily: document.getElementById('font-family') as HTMLSelectElement,
      textInput: document.getElementById('text-input') as HTMLInputElement,
      fontSize: document.getElementById('font-size') as HTMLInputElement,
      textColor: document.getElementById('text-color') as HTMLInputElement,
      bgColor: document.getElementById('bg-color') as HTMLInputElement,
      shadowColor: document.getElementById('shadow-color') as HTMLInputElement,
      shadowOffsetX: document.getElementById('shadow-offset-x') as HTMLInputElement,
      shadowOffsetY: document.getElementById('shadow-offset-y') as HTMLInputElement,
      shadowBlur: document.getElementById('shadow-blur') as HTMLInputElement,
      animationRadios: document.querySelectorAll('input[name="animation"]') as NodeListOf<HTMLInputElement>
    };

    this.displayEls = {
      shadowXVal: document.getElementById('shadow-x-val') as HTMLElement,
      shadowYVal: document.getElementById('shadow-y-val') as HTMLElement,
      shadowBlurVal: document.getElementById('shadow-blur-val') as HTMLElement,
      codePanel: document.getElementById('code-panel') as HTMLElement,
      perfMonitor: document.getElementById('perf-monitor') as HTMLElement,
      copyBtn: document.getElementById('copy-code') as HTMLButtonElement,
      exportBtn: document.getElementById('export-png') as HTMLButtonElement,
      panel: document.getElementById('panel') as HTMLElement
    };

    this.bindEvents();
    this.setupResponsive();
  }

  onChange(handler: ChangeHandler): void {
    this.onChangeHandler = handler;
  }

  onAction(handler: ActionHandler): void {
    this.onActionHandler = handler;
  }

  getState(): RenderState {
    const selectedAnimation = Array.from(this.controls.animationRadios)
      .find(r => r.checked)?.value || 'none';

    return {
      fontFamily: this.controls.fontFamily.value,
      text: this.controls.textInput.value,
      fontSize: parseInt(this.controls.fontSize.value, 10) || 48,
      textColor: this.controls.textColor.value,
      backgroundColor: this.controls.bgColor.value,
      shadowColor: this.controls.shadowColor.value,
      shadowOffsetX: parseInt(this.controls.shadowOffsetX.value, 10),
      shadowOffsetY: parseInt(this.controls.shadowOffsetY.value, 10),
      shadowBlur: parseInt(this.controls.shadowBlur.value, 10),
      animation: selectedAnimation as RenderState['animation']
    };
  }

  updateCodePanel(state: RenderState): void {
    const animationCss = this.getAnimationCSS(state.animation);
    const html = this.generateCodeHTML(state, animationCss);
    this.displayEls.codePanel.innerHTML = html;
  }

  generatePlainCode(state: RenderState): string {
    const animationCss = this.getAnimationCSS(state.animation);
    let code = `.text-effect {\n`;
    code += `  font-family: ${state.fontFamily};\n`;
    code += `  font-size: ${state.fontSize}px;\n`;
    code += `  color: ${state.textColor};\n`;

    if (state.shadowBlur > 0 || state.shadowOffsetX !== 0 || state.shadowOffsetY !== 0) {
      code += `  text-shadow: ${state.shadowOffsetX}px ${state.shadowOffsetY}px ${state.shadowBlur}px ${state.shadowColor};\n`;
    }

    if (state.animation !== 'none') {
      code += `  ${animationCss.rule}\n`;
    }

    code += `}\n`;

    if (animationCss.keyframes) {
      code += `\n${animationCss.keyframes}\n`;
    }

    return code;
  }

  updatePerfMonitor(stats: FrameStats): void {
    this.displayEls.perfMonitor.textContent = `FPS: ${stats.fps.toFixed(0)} | Frame: ${stats.frameTime.toFixed(1)} ms`;
  }

  showCopiedFeedback(): void {
    const btn = this.displayEls.copyBtn;
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 500);
  }

  private bindEvents(): void {
    this.controls.fontFamily.addEventListener('change', () => this.emitChange());
    this.controls.textInput.addEventListener('input', () => this.emitChange());
    this.controls.fontSize.addEventListener('input', () => this.emitChange());
    this.controls.textColor.addEventListener('input', () => this.emitChange());
    this.controls.bgColor.addEventListener('input', () => this.emitChange());
    this.controls.shadowColor.addEventListener('input', () => this.emitChange());

    this.controls.shadowOffsetX.addEventListener('input', () => {
      this.displayEls.shadowXVal.textContent = `${this.controls.shadowOffsetX.value}px`;
      this.emitChange();
    });

    this.controls.shadowOffsetY.addEventListener('input', () => {
      this.displayEls.shadowYVal.textContent = `${this.controls.shadowOffsetY.value}px`;
      this.emitChange();
    });

    this.controls.shadowBlur.addEventListener('input', () => {
      this.displayEls.shadowBlurVal.textContent = `${this.controls.shadowBlur.value}px`;
      this.emitChange();
    });

    this.controls.animationRadios.forEach(radio => {
      radio.addEventListener('change', () => this.emitChange());
    });

    this.displayEls.copyBtn.addEventListener('click', () => {
      this.onActionHandler?.('copy');
    });

    this.displayEls.exportBtn.addEventListener('click', () => {
      this.onActionHandler?.('export');
    });
  }

  private setupResponsive(): void {
    const panel = this.displayEls.panel;
    const header = panel.querySelector('.panel-header') as HTMLElement;
    let isDragging = false;
    let startY = 0;
    let startHeight = 0;

    const handleResize = () => {
      if (window.innerWidth <= 768) {
        header.addEventListener('mousedown', (e) => {
          isDragging = true;
          startY = e.clientY;
          startHeight = panel.offsetHeight;
          document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          const delta = startY - e.clientY;
          const newHeight = Math.max(48, Math.min(window.innerHeight * 0.8, startHeight + delta));
          panel.style.height = `${newHeight}px`;
        });

        document.addEventListener('mouseup', () => {
          isDragging = false;
          document.body.style.userSelect = '';
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
  }

  private emitChange(): void {
    if (this.onChangeHandler) {
      this.onChangeHandler(this.getState());
    }
  }

  private getAnimationCSS(animation: RenderState['animation']): { rule: string; keyframes: string } {
    switch (animation) {
      case 'blink':
        return {
          rule: 'animation: blink-anim 1s ease-in-out infinite;',
          keyframes: `@keyframes blink-anim {\n  0%, 100% { opacity: 1; }\n  50% { opacity: 0; }\n}`
        };
      case 'float':
        return {
          rule: 'animation: float-anim 2s ease-in-out infinite;',
          keyframes: `@keyframes float-anim {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-10px); }\n}`
        };
      case 'rotate3d':
        return {
          rule: 'animation: rotate3d-anim 3s ease-in-out infinite;',
          keyframes: `@keyframes rotate3d-anim {\n  0% { transform: perspective(400px) rotateY(0deg); }\n  100% { transform: perspective(400px) rotateY(360deg); }\n}`
        };
      default:
        return { rule: '', keyframes: '' };
    }
  }

  private generateCodeHTML(state: RenderState, animationCss: { rule: string; keyframes: string }): string {
    let html = '';

    html += `<span class="code-keyword">.text-effect</span> <span class="code-brace">{</span>\n`;
    html += `  <span class="code-property">font-family</span>: <span class="code-value">${this.escapeHtml(state.fontFamily)}</span>;\n`;
    html += `  <span class="code-property">font-size</span>: <span class="code-value">${state.fontSize}px</span>;\n`;
    html += `  <span class="code-property">color</span>: <span class="code-value">${state.textColor}</span>;\n`;

    if (state.shadowBlur > 0 || state.shadowOffsetX !== 0 || state.shadowOffsetY !== 0) {
      html += `  <span class="code-property">text-shadow</span>: <span class="code-value">${state.shadowOffsetX}px ${state.shadowOffsetY}px ${state.shadowBlur}px ${state.shadowColor}</span>;\n`;
    }

    if (state.animation !== 'none' && animationCss.rule) {
      const match = animationCss.rule.match(/(\S+):\s*(.+);/);
      if (match) {
        html += `  <span class="code-property">${match[1]}</span>: <span class="code-value">${match[2]}</span>;\n`;
      }
    }

    html += `<span class="code-brace">}</span>\n`;

    if (animationCss.keyframes) {
      html += '\n';
      const kfLines = animationCss.keyframes.split('\n');
      kfLines.forEach((line, i) => {
        if (line.startsWith('@keyframes')) {
          const match = line.match(/@keyframes\s+(\S+)\s*\{/);
          if (match) {
            html += `<span class="code-keyword">@keyframes</span> <span class="code-property">${match[1]}</span> <span class="code-brace">{</span>\n`;
          }
        } else if (line.includes('{')) {
          const match = line.match(/\s*([^}]+?)\s*\{\s*([^:]+):\s*([^;]+);?\s*\}/);
          if (match) {
            html += `  <span class="code-value">${match[1].trim()}</span> <span class="code-brace">{</span> <span class="code-property">${match[2].trim()}</span>: <span class="code-value">${match[3].trim()}</span>; <span class="code-brace">}</span>\n`;
          } else {
            html += `${this.escapeHtml(line)}\n`;
          }
        } else if (line.trim() === '}') {
          html += `<span class="code-brace">}</span>\n`;
        } else {
          html += `${this.escapeHtml(line)}\n`;
        }
      });
    }

    return html;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

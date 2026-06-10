import { GardenState } from './particleSystem'

export interface UICallbacks {
  onGenerate: (text: string) => void
  onFreeze: () => GardenState | null
  onReset: () => void
}

export class UIManager {
  private container: HTMLElement
  private callbacks: UICallbacks
  private inputPanel: HTMLDivElement | null = null
  private inputField: HTMLInputElement | null = null
  private generateButton: HTMLButtonElement | null = null
  private freezeButton: HTMLButtonElement | null = null
  private resetButton: HTMLButtonElement | null = null
  private isGenerating: boolean = false

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container
    this.callbacks = callbacks
    this.init()
  }

  private init(): void {
    this.createStyles()
    this.createInputPanel()
    this.createControlButtons()
  }

  private createStyles(): void {
    const style = document.createElement('style')
    style.textContent = `
      .garden-ui-panel {
        position: fixed;
        top: 24px;
        left: 24px;
        z-index: 100;
        padding: 20px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        width: 320px;
        transition: all 0.2s cubic-bezier(0.42, 0, 0.58, 1);
      }

      .garden-ui-panel:hover {
        background: rgba(255, 255, 255, 0.1);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      }

      .garden-ui-title {
        color: rgba(255, 255, 255, 0.9);
        font-size: 18px;
        font-weight: 500;
        margin-bottom: 12px;
        letter-spacing: 0.5px;
      }

      .garden-ui-input {
        width: 100%;
        padding: 12px 14px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(0, 0, 0, 0.2);
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
        font-family: inherit;
        outline: none;
        transition: all 0.2s cubic-bezier(0.42, 0, 0.58, 1);
        box-sizing: border-box;
        margin-bottom: 12px;
      }

      .garden-ui-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }

      .garden-ui-input:focus {
        border-color: rgba(100, 200, 255, 0.5);
        background: rgba(0, 0, 0, 0.3);
        box-shadow: 0 0 0 3px rgba(100, 200, 255, 0.1);
      }

      .garden-ui-generate-btn {
        width: 100%;
        padding: 12px 20px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, rgba(100, 180, 255, 0.8), rgba(150, 120, 255, 0.8));
        color: white;
        font-size: 14px;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.42, 0, 0.58, 1);
        position: relative;
        overflow: hidden;
      }

      .garden-ui-generate-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 20px rgba(100, 180, 255, 0.4);
      }

      .garden-ui-generate-btn:active {
        transform: translateY(0);
      }

      .garden-ui-generate-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .garden-ui-generate-btn.pulse {
        animation: pulse-loading 300ms ease-in-out;
      }

      @keyframes pulse-loading {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(100, 180, 255, 0.6); }
        100% { transform: scale(1); }
      }

      .garden-controls {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 100;
        display: flex;
        gap: 12px;
      }

      .garden-control-btn {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        color: rgba(255, 255, 255, 0.8);
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s cubic-bezier(0.42, 0, 0.58, 1);
        padding: 0;
        position: relative;
      }

      .garden-control-btn:hover {
        width: 56px;
        height: 56px;
        background: rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 1);
        box-shadow: 0 0 16px rgba(100, 200, 255, 0.3);
      }

      .garden-control-btn::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        border-radius: 50%;
        opacity: 0;
        transition: opacity 0.2s ease-out;
        pointer-events: none;
      }

      .garden-control-btn:hover::before {
        opacity: 1;
        box-shadow: 0 0 8px rgba(255, 255, 255, 0.3), inset 0 0 8px rgba(255, 255, 255, 0.1);
      }

      .garden-emotion-label {
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 100;
        padding: 10px 16px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        pointer-events: none;
      }

      .garden-emotion-label .emotion-name {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 500;
        margin-left: 4px;
      }
    `
    document.head.appendChild(style)
  }

  private createInputPanel(): void {
    this.inputPanel = document.createElement('div')
    this.inputPanel.className = 'garden-ui-panel'

    const title = document.createElement('div')
    title.className = 'garden-ui-title'
    title.textContent = '记忆花园'

    this.inputField = document.createElement('input')
    this.inputField.type = 'text'
    this.inputField.className = 'garden-ui-input'
    this.inputField.placeholder = '输入一段文字描述...'
    this.inputField.value = '童年的夏日雨后的街道'

    this.generateButton = document.createElement('button')
    this.generateButton.className = 'garden-ui-generate-btn'
    this.generateButton.textContent = '生成花园'
    this.generateButton.addEventListener('click', () => this.handleGenerate())

    this.inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.isGenerating) {
        this.handleGenerate()
      }
    })

    this.inputPanel.appendChild(title)
    this.inputPanel.appendChild(this.inputField)
    this.inputPanel.appendChild(this.generateButton)
    this.container.appendChild(this.inputPanel)
  }

  private createControlButtons(): void {
    const controlsContainer = document.createElement('div')
    controlsContainer.className = 'garden-controls'

    this.freezeButton = document.createElement('button')
    this.freezeButton.className = 'garden-control-btn'
    this.freezeButton.title = '冻结并导出'
    this.freezeButton.innerHTML = '❄'
    this.freezeButton.addEventListener('click', () => this.handleFreeze())

    this.resetButton = document.createElement('button')
    this.resetButton.className = 'garden-control-btn'
    this.resetButton.title = '重置花园'
    this.resetButton.innerHTML = '↻'
    this.resetButton.addEventListener('click', () => this.handleReset())

    controlsContainer.appendChild(this.freezeButton)
    controlsContainer.appendChild(this.resetButton)
    this.container.appendChild(controlsContainer)

    const emotionLabel = document.createElement('div')
    emotionLabel.className = 'garden-emotion-label'
    emotionLabel.innerHTML = '当前情绪：<span class="emotion-name">宁静</span>'
    emotionLabel.id = 'emotion-label'
    this.container.appendChild(emotionLabel)
  }

  private handleGenerate(): void {
    if (this.isGenerating) return

    const text = this.inputField?.value || ''
    if (!text.trim()) return

    this.isGenerating = true
    this.generateButton?.classList.add('pulse')
    this.generateButton!.disabled = true

    setTimeout(() => {
      this.callbacks.onGenerate(text)
      
      setTimeout(() => {
        this.isGenerating = false
        this.generateButton?.classList.remove('pulse')
        this.generateButton!.disabled = false
      }, 1700)
    }, 300)
  }

  private handleFreeze(): void {
    const state = this.callbacks.onFreeze()
    if (state) {
      this.downloadState(state)
    }
  }

  private handleReset(): void {
    this.callbacks.onReset()
    this.updateEmotionLabel('calm')
  }

  private downloadState(state: GardenState): void {
    const json = JSON.stringify(state, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `garden-state-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  public updateEmotionLabel(emotion: string): void {
    const label = document.getElementById('emotion-label')
    if (!label) return

    const emotionNames: Record<string, string> = {
      joy: '快乐',
      sadness: '忧伤',
      calm: '宁静'
    }

    const name = emotionNames[emotion] || emotion
    label.innerHTML = `当前情绪：<span class="emotion-name">${name}</span>`
  }

  public dispose(): void {
    if (this.inputPanel) {
      this.inputPanel.remove()
    }
  }
}

import { PlantPartInfo, PlantPartType } from './PlantGenerator'

export interface UIParams {
  growthSpeed: number
  branchDensity: number
  bloomSize: number
}

export type UIEventListener = {
  onParamChange: (params: Partial<UIParams>) => void
  onReplay: () => void
}

export class UIHandler {
  private speedSlider: HTMLInputElement
  private speedValue: HTMLElement
  private densitySlider: HTMLInputElement
  private densityValue: HTMLElement
  private bloomSlider: HTMLInputElement
  private bloomValue: HTMLElement
  private replayBtn: HTMLButtonElement
  private infoContent: HTMLElement
  private controlPanel: HTMLElement
  private infoPanel: HTMLElement
  private fabLeft: HTMLButtonElement
  private fabRight: HTMLButtonElement

  private params: UIParams
  private listener: UIEventListener

  constructor(listener: UIEventListener) {
    this.listener = listener
    this.params = {
      growthSpeed: 1,
      branchDensity: 3,
      bloomSize: 1
    }

    this.speedSlider = this.el('speed-slider') as HTMLInputElement
    this.speedValue = this.el('speed-value')
    this.densitySlider = this.el('density-slider') as HTMLInputElement
    this.densityValue = this.el('density-value')
    this.bloomSlider = this.el('bloom-slider') as HTMLInputElement
    this.bloomValue = this.el('bloom-value')
    this.replayBtn = this.el('replay-btn') as HTMLButtonElement
    this.infoContent = this.el('info-content')
    this.controlPanel = this.el('control-panel')
    this.infoPanel = this.el('info-panel')
    this.fabLeft = this.el('fab-left') as HTMLButtonElement
    this.fabRight = this.el('fab-right') as HTMLButtonElement

    this.bindEvents()
    this.updateParamDisplay()
  }

  private el(id: string): HTMLElement {
    const elem = document.getElementById(id)
    if (!elem) throw new Error(`Element #${id} not found`)
    return elem
  }

  private bindEvents(): void {
    this.speedSlider.addEventListener('input', () => {
      const v = parseFloat(this.speedSlider.value)
      this.params.growthSpeed = v
      this.updateParamDisplay()
      this.listener.onParamChange({ growthSpeed: v })
    })

    this.densitySlider.addEventListener('input', () => {
      const v = parseInt(this.densitySlider.value, 10)
      this.params.branchDensity = v
      this.updateParamDisplay()
      this.listener.onParamChange({ branchDensity: v })
    })

    this.bloomSlider.addEventListener('input', () => {
      const v = parseFloat(this.bloomSlider.value)
      this.params.bloomSize = v
      this.updateParamDisplay()
      this.listener.onParamChange({ bloomSize: v })
    })

    this.replayBtn.addEventListener('click', () => {
      this.listener.onReplay()
    })

    this.fabLeft.addEventListener('click', () => {
      this.controlPanel.classList.toggle('open')
      if (window.innerWidth <= 900 && this.infoPanel.classList.contains('open')) {
        this.infoPanel.classList.remove('open')
      }
    })

    this.fabRight.addEventListener('click', () => {
      this.infoPanel.classList.toggle('open')
      if (window.innerWidth <= 900 && this.controlPanel.classList.contains('open')) {
        this.controlPanel.classList.remove('open')
      }
    })

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        this.controlPanel.classList.remove('open')
        this.infoPanel.classList.remove('open')
      }
    })
  }

  private updateParamDisplay(): void {
    this.speedValue.textContent = `${this.params.growthSpeed.toFixed(1)}x`
    this.densityValue.textContent = `${this.params.branchDensity}级`
    this.bloomValue.textContent = this.params.bloomSize.toFixed(1)
  }

  public showPartInfo(info: PlantPartInfo): void {
    const typeLabel = this.getPartTypeLabel(info.type)
    this.infoContent.innerHTML = `
      <div class="info-item">
        <div class="info-label">部位名称</div>
        <div class="info-value">${info.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">类型</div>
        <div class="info-value">${typeLabel}</div>
      </div>
      <div class="info-item">
        <div class="info-label">生长年龄</div>
        <div class="info-value">约 ${info.age} 天</div>
      </div>
      <div class="info-item">
        <div class="info-label">当前颜色</div>
        <div class="info-value">
          ${info.color}
          <span class="color-box" style="background:${info.color}"></span>
        </div>
      </div>
    `

    if (window.innerWidth <= 900) {
      this.infoPanel.classList.add('open')
      this.controlPanel.classList.remove('open')
    }
  }

  private getPartTypeLabel(type: PlantPartType): string {
    const labels: Record<PlantPartType, string> = {
      seed: '种子',
      stem: '主茎',
      branch: '侧枝',
      leaf: '叶片',
      flower: '花朵',
      cotyledon: '子叶'
    }
    return labels[type] || type
  }

  public clearPartInfo(): void {
    this.infoContent.innerHTML = `
      <div class="empty-info">点击植物的任意部位查看详细信息</div>
    `
  }

  public getParams(): UIParams {
    return { ...this.params }
  }
}

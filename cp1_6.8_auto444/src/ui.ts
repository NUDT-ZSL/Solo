export class UIController {
  private densitySlider: HTMLInputElement
  private spreadSlider: HTMLInputElement
  private densityValue: HTMLElement
  private spreadValue: HTMLElement
  private clearBtn: HTMLElement
  private saveBtn: HTMLElement
  private hamburgerBtn: HTMLElement
  private panel: HTMLElement
  private onDensityChange: ((value: number) => void) | null = null
  private onSpreadChange: ((value: number) => void) | null = null
  private onClear: (() => void) | null = null
  private onSave: (() => void) | null = null

  constructor() {
    this.densitySlider = document.getElementById('ink-density') as HTMLInputElement
    this.spreadSlider = document.getElementById('spread-speed') as HTMLInputElement
    this.densityValue = document.getElementById('density-value')!
    this.spreadValue = document.getElementById('spread-value')!
    this.clearBtn = document.getElementById('btn-clear')!
    this.saveBtn = document.getElementById('btn-save')!
    this.hamburgerBtn = document.getElementById('hamburger-btn')!
    this.panel = document.getElementById('control-panel')!

    this.bindEvents()
  }

  private bindEvents(): void {
    this.densitySlider.addEventListener('input', () => {
      const val = parseFloat(this.densitySlider.value)
      this.densityValue.textContent = val.toFixed(2)
      this.onDensityChange?.(val)
    })

    this.spreadSlider.addEventListener('input', () => {
      const val = parseFloat(this.spreadSlider.value)
      this.spreadValue.textContent = val.toFixed(2)
      this.onSpreadChange?.(val)
    })

    this.clearBtn.addEventListener('click', () => {
      this.onClear?.()
    })

    this.saveBtn.addEventListener('click', () => {
      this.onSave?.()
    })

    this.hamburgerBtn.addEventListener('click', () => {
      this.panel.classList.toggle('open')
      this.hamburgerBtn.classList.toggle('active')
    })

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (
        window.innerWidth < 768 &&
        this.panel.classList.contains('open') &&
        !this.panel.contains(target) &&
        !this.hamburgerBtn.contains(target)
      ) {
        this.panel.classList.remove('open')
        this.hamburgerBtn.classList.remove('active')
      }
    })
  }

  setDensityChangeHandler(handler: (value: number) => void): void {
    this.onDensityChange = handler
  }

  setSpreadChangeHandler(handler: (value: number) => void): void {
    this.onSpreadChange = handler
  }

  setClearHandler(handler: () => void): void {
    this.onClear = handler
  }

  setSaveHandler(handler: () => void): void {
    this.onSave = handler
  }
}

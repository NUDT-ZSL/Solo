import { TheaterScene } from './scene'

export interface UICallbacks {
  onEraChange: (era: number) => void
  onPlayToggle: () => void
}

export class TheaterUI {
  private eraSelect: HTMLSelectElement
  private playBtn: HTMLButtonElement
  private reverbValue: HTMLDivElement
  private currentRT60: number = 0
  private displayedRT60: number = 0
  private scene: TheaterScene | null = null

  constructor() {
    this.eraSelect = document.getElementById('era-select') as HTMLSelectElement
    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement
    this.reverbValue = document.getElementById('reverb-value') as HTMLDivElement
    this.bindEvents()
    this.startDisplayLoop()
  }

  public setScene(scene: TheaterScene): void {
    this.scene = scene
  }

  private bindEvents(): void {
    this.eraSelect.addEventListener('change', (e) => {
      const value = parseInt((e.target as HTMLSelectElement).value, 10)
      this.applyTransition(this.eraSelect)
      if (this.scene) {
        this.scene.setEra(value)
      }
    })

    this.playBtn.addEventListener('click', () => {
      this.applyTransition(this.playBtn)
      if (this.scene) {
        this.scene.togglePlay()
      }
    })
  }

  private applyTransition(el: HTMLElement): void {
    el.style.transition = 'opacity 0.15s ease, transform 0.15s ease'
    el.style.opacity = '0.6'
    el.style.transform = 'scale(0.97)'
    setTimeout(() => {
      el.style.opacity = '1'
      el.style.transform = 'scale(1)'
    }, 150)
  }

  public setPlaying(playing: boolean): void {
    if (playing) {
      this.playBtn.textContent = '❚❚'
      this.playBtn.classList.add('playing')
      this.playBtn.title = '暂停'
    } else {
      this.playBtn.textContent = '▶'
      this.playBtn.classList.remove('playing')
      this.playBtn.title = '播放'
    }
  }

  public setRT60(value: number): void {
    this.currentRT60 = value
  }

  private startDisplayLoop(): void {
    const tick = () => {
      const diff = this.currentRT60 - this.displayedRT60
      this.displayedRT60 += diff * 0.15
      if (this.currentRT60 === 0 && Math.abs(this.displayedRT60) < 0.01) {
        this.displayedRT60 = 0
      }
      if (this.displayedRT60 <= 0 && this.currentRT60 <= 0) {
        this.reverbValue.textContent = '--'
      } else {
        this.reverbValue.textContent = this.displayedRT60.toFixed(1)
      }
      requestAnimationFrame(tick)
    }
    tick()
  }

  public setEra(era: number): void {
    this.eraSelect.value = String(era)
  }
}

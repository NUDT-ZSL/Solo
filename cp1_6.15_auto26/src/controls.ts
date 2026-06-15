import { Galaxy, COLOR_SCHEMES, ColorScheme } from './Galaxy'

export interface ControlCallbacks {
  onColorSchemeChange: (index: number) => void
  onSizeChange: (value: number) => void
  onSpeedChange: (value: number) => void
}

export function setupControls(galaxy: Galaxy): void {
  setupColorPresets(galaxy)
  setupSizeSlider(galaxy)
  setupSpeedSlider(galaxy)
}

function setupColorPresets(galaxy: Galaxy): void {
  const container = document.getElementById('colorPresets')
  if (!container) return

  COLOR_SCHEMES.forEach((scheme: ColorScheme, index: number) => {
    const preset = document.createElement('div')
    preset.className = 'color-preset'
    preset.dataset.name = scheme.name
    preset.dataset.index = String(index)

    const gradient = `linear-gradient(135deg,
      #${scheme.innerColor.getHexString()} 0%,
      #${scheme.outerColor.getHexString()} 100%)`
    preset.style.background = gradient

    if (index === galaxy.getCurrentSchemeIndex()) {
      preset.classList.add('active')
    }

    preset.addEventListener('click', () => {
      document.querySelectorAll('.color-preset').forEach(el => {
        el.classList.remove('active')
      })
      preset.classList.add('active')
      galaxy.applyColorScheme(index, true)
    })

    container.appendChild(preset)
  })
}

function setupSizeSlider(galaxy: Galaxy): void {
  const slider = document.getElementById('sizeSlider') as HTMLInputElement
  const valueDisplay = document.getElementById('sizeValue')
  if (!slider || !valueDisplay) return

  const updateValue = (val: number) => {
    valueDisplay.textContent = val.toFixed(2)
  }

  slider.addEventListener('input', () => {
    const value = parseFloat(slider.value)
    updateValue(value)
    galaxy.setSizeMultiplier(value)
  })

  updateValue(parseFloat(slider.value))
}

function setupSpeedSlider(galaxy: Galaxy): void {
  const slider = document.getElementById('speedSlider') as HTMLInputElement
  const valueDisplay = document.getElementById('speedValue')
  if (!slider || !valueDisplay) return

  const updateValue = (val: number) => {
    valueDisplay.textContent = val.toFixed(2)
  }

  slider.addEventListener('input', () => {
    const value = parseFloat(slider.value)
    updateValue(value)
    galaxy.setRotationSpeed(value)
  })

  updateValue(parseFloat(slider.value))
}

export function setupFPSCounter(): (fps: number) => void {
  const counter = document.getElementById('fpsCounter')
  let smoothed = 0

  return (fps: number) => {
    if (!counter) return
    smoothed = smoothed * 0.9 + fps * 0.1
    counter.textContent = `FPS: ${smoothed.toFixed(0)}`
  }
}

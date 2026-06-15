export interface Preset {
  id: string
  name: string
  particleCount: number
  speed: number
  direction: number
  size: number
  color: string
}

const STORAGE_KEY = 'windycanvas_presets'

const defaultPresets: Preset[] = [
  {
    id: 'default-1',
    name: '星空',
    particleCount: 600,
    speed: 1.5,
    direction: 45,
    size: 4,
    color: '#ffffff',
  },
  {
    id: 'default-2',
    name: '火焰',
    particleCount: 500,
    speed: 3,
    direction: 90,
    size: 5,
    color: '#ff6b35',
  },
  {
    id: 'default-3',
    name: '海洋',
    particleCount: 800,
    speed: 1,
    direction: 0,
    size: 3,
    color: '#00d4ff',
  },
  {
    id: 'default-4',
    name: '森林',
    particleCount: 400,
    speed: 0.8,
    direction: 270,
    size: 6,
    color: '#22c55e',
  },
  {
    id: 'default-5',
    name: '极光',
    particleCount: 700,
    speed: 2,
    direction: 180,
    size: 4,
    color: '#a855f7',
  },
]

export function loadPresets(): Preset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const customPresets = JSON.parse(stored) as Preset[]
      return [...defaultPresets, ...customPresets]
    }
  } catch (e) {
    console.error('Failed to load presets:', e)
  }
  return [...defaultPresets]
}

export function savePreset(preset: Omit<Preset, 'id'>): Preset {
  const newPreset: Preset = {
    ...preset,
    id: `custom-${Date.now()}`,
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const customPresets: Preset[] = stored ? JSON.parse(stored) : []
    customPresets.push(newPreset)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets))
  } catch (e) {
    console.error('Failed to save preset:', e)
  }

  return newPreset
}

export function getDefaultPreset(): Preset {
  return defaultPresets[0]
}

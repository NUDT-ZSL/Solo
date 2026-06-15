import type { SandParticle } from './physics'

export interface TerrainData {
  version: string
  savedAt: string
  particles: {
    x: number
    y: number
    z: number
    initialX: number
    initialY: number
    initialZ: number
    radius: number
    color: string
    originalIndex: number
  }[]
}

export function exportTerrain(particles: SandParticle[]): void {
  const data: TerrainData = {
    version: '1.0.0',
    savedAt: new Date().toISOString(),
    particles: particles.map(p => ({
      x: p.x,
      y: p.y,
      z: p.z,
      initialX: p.initialX,
      initialY: p.initialY,
      initialZ: p.initialZ,
      radius: p.radius,
      color: p.color,
      originalIndex: p.originalIndex
    }))
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `terrain-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function importTerrain(file: File): Promise<SandParticle[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as TerrainData
        const particles: SandParticle[] = data.particles.map(p => ({
          x: p.x,
          y: p.y,
          z: p.z,
          initialX: p.initialX,
          initialY: p.initialY,
          initialZ: p.initialZ,
          radius: p.radius,
          color: p.color,
          velocityX: 0,
          velocityY: 0,
          velocityZ: 0,
          displaced: false,
          bouncePhase: 0,
          originalIndex: p.originalIndex,
          merged: false
        }))
        resolve(particles)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function triggerFileInput(): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.style.display = 'none'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) {
        resolve(file)
      } else {
        reject(new Error('No file selected'))
      }
      document.body.removeChild(input)
    }
    document.body.appendChild(input)
    input.click()
  })
}

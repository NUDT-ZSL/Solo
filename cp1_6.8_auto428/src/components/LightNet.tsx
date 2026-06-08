import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore, COLOR_THEMES } from '@/store'

const LINE_DISTANCE_THRESHOLD = 1.8
const MAX_LINES = 4000
const GRID_CELL_SIZE = 2.0

interface GridCell {
  particles: number[]
}

function getGridKey(x: number, z: number): string {
  const gx = Math.floor(x / GRID_CELL_SIZE)
  const gz = Math.floor(z / GRID_CELL_SIZE)
  return `${gx},${gz}`
}

export default function LightNet() {
  const linesRef = useRef<THREE.LineSegments>(null)
  const colorTheme = useSceneStore((s) => s.colorTheme)

  const theme = useMemo(() => {
    return COLOR_THEMES.find((t) => t.name === colorTheme) || COLOR_THEMES[0]
  }, [colorTheme])

  const { geometry, linePositions, lineColors } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(MAX_LINES * 6)
    const colors = new Float32Array(MAX_LINES * 6)

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setDrawRange(0, 0)

    return {
      geometry: geo,
      linePositions: positions,
      lineColors: colors,
    }
  }, [])

  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame(() => {
    if (!linesRef.current) return

    const scene = linesRef.current.parent
    if (!scene) return

    const pointsObj = scene.getObjectByName('particleOcean')
    if (!pointsObj || !(pointsObj instanceof THREE.Points)) return

    const posAttr = pointsObj.geometry.getAttribute('position') as THREE.BufferAttribute
    if (!posAttr) return

    const particleCount = posAttr.count
    const px = posAttr.array as Float32Array

    const grid = new Map<string, GridCell>()

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      const key = getGridKey(px[i3], px[i3 + 2])
      let cell = grid.get(key)
      if (!cell) {
        cell = { particles: [] }
        grid.set(key, cell)
      }
      cell.particles.push(i)
    }

    const lineColor = new THREE.Color(theme.lineColor)
    const brightColor = new THREE.Color(theme.particle1)
    let lineIndex = 0

    for (const [, cell] of grid) {
      if (lineIndex >= MAX_LINES) break

      for (let a = 0; a < cell.particles.length && lineIndex < MAX_LINES; a++) {
        const idxA = cell.particles[a]
        const a3 = idxA * 3

        for (let b = a + 1; b < cell.particles.length && lineIndex < MAX_LINES; b++) {
          const idxB = cell.particles[b]
          const b3 = idxB * 3

          const dx = px[a3] - px[b3]
          const dz = px[a3 + 2] - px[b3 + 2]
          const distSq = dx * dx + dz * dz

          if (distSq < LINE_DISTANCE_THRESHOLD * LINE_DISTANCE_THRESHOLD) {
            const dist = Math.sqrt(distSq)
            const alpha = 1.0 - dist / LINE_DISTANCE_THRESHOLD
            const mixColor = lineColor.clone().lerp(brightColor, alpha * 0.3)

            const li6 = lineIndex * 6
            linePositions[li6] = px[a3]
            linePositions[li6 + 1] = px[a3 + 1]
            linePositions[li6 + 2] = px[a3 + 2]
            linePositions[li6 + 3] = px[b3]
            linePositions[li6 + 4] = px[b3 + 1]
            linePositions[li6 + 5] = px[b3 + 2]

            lineColors[li6] = mixColor.r * alpha
            lineColors[li6 + 1] = mixColor.g * alpha
            lineColors[li6 + 2] = mixColor.b * alpha
            lineColors[li6 + 3] = mixColor.r * alpha
            lineColors[li6 + 4] = mixColor.g * alpha
            lineColors[li6 + 5] = mixColor.b * alpha

            lineIndex++
          }
        }
      }
    }

    geometry.setDrawRange(0, lineIndex * 2)
    const posGeoAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const colorGeoAttr = geometry.getAttribute('color') as THREE.BufferAttribute
    if (posGeoAttr) posGeoAttr.needsUpdate = true
    if (colorGeoAttr) colorGeoAttr.needsUpdate = true
  })

  return <lineSegments ref={linesRef} geometry={geometry} material={material} />
}

import { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getEmotionColors } from '@/utils/emotionColors'
import { dampen } from '@/utils/geometryHelpers'
import { getTextParticlePositions } from '@/utils/textParser'
import type { ConstellationData } from '@/store'
import { useStore } from '@/store'

interface ConstellationProps {
  data: ConstellationData
}

const dummy = new THREE.Object3D()
const tempColor = new THREE.Color()

export default function Constellation({ data }: ConstellationProps) {
  const { stars, lines, emotion, word, center, isBurst, burstProgress } = data
  const spreadSpeed = useStore((s) => s.spreadSpeed)
  const toggleBurst = useStore((s) => s.toggleBurst)

  const meshRef = useRef<THREE.InstancedMesh>(null)
  const lineRef = useRef<THREE.LineSegments>(null)
  const burstRef = useRef({ progress: 0, direction: isBurst ? 1 : -1 })
  const prevBurst = useRef(isBurst)

  const colors = useMemo(() => getEmotionColors(emotion), [emotion])

  const lineGeometry = useMemo(() => {
    if (lines.length === 0) return new THREE.BufferGeometry()
    const positions: number[] = []
    for (const [a, b] of lines) {
      positions.push(stars[a].position.x, stars[a].position.y, stars[a].position.z)
      positions.push(stars[b].position.x, stars[b].position.y, stars[b].position.z)
    }
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geom
  }, [stars, lines])

  const starCount = stars.length

  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.15, 'rgba(255,255,255,0.8)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.3)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  const handleClick = useCallback(
    (e: THREE.Event) => {
      e.stopPropagation()
      toggleBurst(data.id)
    },
    [data.id, toggleBurst]
  )

  useFrame((_, delta) => {
    if (!meshRef.current) return

    if (prevBurst.current !== isBurst) {
      burstRef.current.direction = isBurst ? 1 : -1
      prevBurst.current = isBurst
    }

    burstRef.current.progress += burstRef.current.direction * delta * 0.8
    burstRef.current.progress = THREE.MathUtils.clamp(burstRef.current.progress, 0, 1)

    const bp = burstRef.current.progress

    let textPositions: THREE.Vector3[] = []
    if (bp > 0.01 && word) {
      textPositions = getTextParticlePositions(word, center, 3)
    }

    for (let i = 0; i < starCount; i++) {
      const star = stars[i]

      star.position.x += star.velocity.x * spreadSpeed * delta
      star.position.y += star.velocity.y * spreadSpeed * delta
      star.position.z += star.velocity.z * spreadSpeed * delta

      star.velocity.x += (Math.random() - 0.5) * 0.001
      star.velocity.y += (Math.random() - 0.5) * 0.001
      star.velocity.z += (Math.random() - 0.5) * 0.001

      const returnForce = 0.02
      star.position.x = dampen(star.position.x, star.originalPosition.x, returnForce, delta * 60)
      star.position.y = dampen(star.position.y, star.originalPosition.y, returnForce, delta * 60)
      star.position.z = dampen(star.position.z, star.originalPosition.z, returnForce, delta * 60)

      let finalPos = star.position.clone()

      if (bp > 0.01 && textPositions.length > 0) {
        const textIdx = i % textPositions.length
        const targetTextPos = textPositions[textIdx]
        finalPos = new THREE.Vector3().lerpVectors(star.position, targetTextPos, bp)
      }

      dummy.position.copy(finalPos)
      const scale = star.size * (1 + bp * 2) * (1 + Math.sin(Date.now() * 0.003 + i) * 0.15)
      dummy.scale.setScalar(scale * 15)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      const c = tempColor.lerpColors(colors.primary, colors.secondary, i / starCount)
      meshRef.current.setColorAt(i, c)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true

    if (lineRef.current) {
      const posAttr = lineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      let lineIdx = 0
      for (const [a, b] of lines) {
        posAttr.setXYZ(lineIdx, stars[a].position.x, stars[a].position.y, stars[a].position.z)
        lineIdx++
        posAttr.setXYZ(lineIdx, stars[b].position.x, stars[b].position.y, stars[b].position.z)
        lineIdx++
      }
      posAttr.needsUpdate = true
      lineRef.current.material.opacity = 0.6 * (1 - bp * 0.8)
    }
  })

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, starCount]}
        onClick={handleClick}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={particleTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>

      {lines.length > 0 && (
        <lineSegments ref={lineRef} geometry={lineGeometry}>
          <lineBasicMaterial
            color={colors.line}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  )
}

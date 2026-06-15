import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { WordData, LayoutType } from './App'

interface WordCloud3DProps {
  words: WordData[]
  layout: LayoutType
  rotationSpeed: number
  resetKey: number
}

interface WordItemProps {
  word: WordData
  index: number
  total: number
  layout: LayoutType
  maxCount: number
  minCount: number
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function getTargetPosition(index: number, total: number, layout: LayoutType): THREE.Vector3 {
  const pos = new THREE.Vector3()

  if (layout === 'sphere') {
    const radius = 8
    const phi = Math.acos(-1 + (2 * index) / Math.max(total, 1))
    const theta = Math.sqrt(total * Math.PI) * phi
    pos.x = radius * Math.cos(theta) * Math.sin(phi)
    pos.y = radius * Math.sin(theta) * Math.sin(phi)
    pos.z = radius * Math.cos(phi)
  } else if (layout === 'spiral') {
    const turns = 4
    const height = 16
    const t = index / Math.max(total - 1, 1)
    const angle = t * Math.PI * 2 * turns
    const radius = 2 + t * 6
    pos.x = Math.cos(angle) * radius
    pos.y = (t - 0.5) * height
    pos.z = Math.sin(angle) * radius
  } else {
    const cols = Math.ceil(Math.sqrt(total))
    const rows = Math.ceil(total / cols)
    const spacing = 1.5
    const col = index % cols
    const row = Math.floor(index / cols)
    pos.x = (col - (cols - 1) / 2) * spacing
    pos.y = ((rows - 1) / 2 - row) * spacing
    pos.z = 0
  }

  return pos
}

function createTextTexture(
  text: string,
  fontSize: number,
  color: string,
  isHovered: boolean,
  flash: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.font = font
  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const padding = fontSize * 0.3

  canvas.width = Math.ceil(textWidth + padding * 2)
  canvas.height = Math.ceil(fontSize * 1.4)

  const ctx2 = canvas.getContext('2d')!
  ctx2.clearRect(0, 0, canvas.width, canvas.height)
  ctx2.font = font
  ctx2.textBaseline = 'middle'
  ctx2.textAlign = 'center'

  const drawColor = flash ? '#FFFFFF' : color

  if (isHovered) {
    ctx2.shadowColor = drawColor
    ctx2.shadowBlur = 20
  }

  ctx2.fillStyle = drawColor
  ctx2.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false

  return texture
}

function getFrequencyColor(freqRatio: number): string {
  const r = Math.round(lerp(255, 255, freqRatio))
  const g = Math.round(lerp(255, 107, freqRatio))
  const b = Math.round(lerp(255, 53, freqRatio))
  return `rgb(${r},${g},${b})`
}

function WordItem({ word, index, total, layout, maxCount, minCount }: WordItemProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [targetPos, setTargetPos] = useState<THREE.Vector3>(() => getTargetPosition(index, total, layout))
  const [currentLayout, setCurrentLayout] = useState<LayoutType>(layout)
  const [transitionProgress, setTransitionProgress] = useState(1)
  const [flash, setFlash] = useState(false)

  const phase = useMemo(() => Math.random() * Math.PI * 2, [])
  const baseScale = useMemo(() => {
    const countRange = Math.max(maxCount - minCount, 1)
    const ratio = (word.count - minCount) / countRange
    return 0.6 + ratio * 1.4
  }, [word.count, maxCount, minCount])

  const freqRatio = useMemo(() => {
    const countRange = Math.max(maxCount - minCount, 1)
    return (word.count - minCount) / countRange
  }, [word.count, maxCount, minCount])

  const color = useMemo(() => getFrequencyColor(freqRatio), [freqRatio])

  const fontSize = useMemo(() => {
    const isChinese = /[\u4e00-\u9fa5]/.test(word.text)
    return isChinese ? 80 : 60
  }, [word.text])

  const texture = useMemo(() => {
    return createTextTexture(word.text, fontSize, color, hovered, flash)
  }, [word.text, fontSize, color, hovered, flash])

  const spriteSize = useMemo(() => {
    const aspect = texture.image.width / texture.image.height
    const height = baseScale * (hovered ? 1.3 : 1)
    const width = height * aspect
    return { width, height }
  }, [texture, baseScale, hovered])

  useEffect(() => {
    if (layout !== currentLayout) {
      setTargetPos(getTargetPosition(index, total, layout))
      setTransitionProgress(0)
      setCurrentLayout(layout)
    }
  }, [layout, currentLayout, index, total])

  useEffect(() => {
    if (!hovered) return
    const interval = setInterval(() => {
      setFlash(prev => !prev)
    }, 500)
    return () => clearInterval(interval)
  }, [hovered])

  useFrame((state) => {
    if (!meshRef.current) return

    const elapsed = state.clock.elapsedTime
    const wave = Math.sin(elapsed * Math.PI + phase) * 0.3

    if (transitionProgress < 1) {
      setTransitionProgress(prev => Math.min(prev + state.clock.getDelta() / 2, 1))
    }

    const t = easeInOutCubic(transitionProgress)
    const baseX = lerp(meshRef.current.position.x, targetPos.x, t)
    const baseY = lerp(meshRef.current.position.y, targetPos.y, t)
    const baseZ = lerp(meshRef.current.position.z, targetPos.z, t)

    meshRef.current.position.set(
      baseX + Math.cos(phase) * wave * 0.1,
      baseY + wave,
      baseZ + Math.sin(phase) * wave * 0.1
    )

    meshRef.current.lookAt(state.camera.position)
  })

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(spriteSize.width, spriteSize.height)
    return geo
  }, [spriteSize.width, spriteSize.height])

  return (
    <mesh
      ref={meshRef}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        setFlash(false)
        document.body.style.cursor = 'default'
      }}
      geometry={geometry}
    >
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
      {hovered && (
        <Html
          center
          distanceFactor={10}
          position={[0, spriteSize.height * 0.6 + 0.3, 0]}
          style={{
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          <div style={{
            background: 'rgba(255,255,200,0.95)',
            color: '#1E293B',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,200,100,0.5)'
          }}>
            {word.text} · 词频: {word.count}
          </div>
        </Html>
      )}
    </mesh>
  )
}

function Scene({ words, layout, rotationSpeed }: { words: WordData[]; layout: LayoutType; rotationSpeed: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const controlsRef = useRef<any>(null)
  const isInteractingRef = useRef(false)

  const maxCount = useMemo(() => Math.max(...words.map(w => w.count), 1), [words])
  const minCount = useMemo(() => Math.min(...words.map(w => w.count), 0), [words])

  useFrame((_, delta) => {
    if (groupRef.current && !isInteractingRef.current) {
      groupRef.current.rotation.y += delta * 0.01 * rotationSpeed
    }
  })

  return (
    <>
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      <group ref={groupRef}>
        {words.map((word, index) => (
          <WordItem
            key={`${word.text}-${index}`}
            word={word}
            index={index}
            total={words.length}
            layout={layout}
            maxCount={maxCount}
            minCount={minCount}
          />
        ))}
      </group>

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={15}
        maxDistance={30}
        enablePan={false}
        onStart={() => { isInteractingRef.current = true }}
        onEnd={() => { isInteractingRef.current = false }}
      />
    </>
  )
}

function CameraController({ resetKey }: { resetKey: number }) {
  const { camera, controls } = useThree()
  const animatingRef = useRef(false)
  const startPosRef = useRef(new THREE.Vector3())
  const startTargetRef = useRef(new THREE.Vector3())
  const progressRef = useRef(0)

  useEffect(() => {
    if (resetKey === 0) return

    animatingRef.current = true
    progressRef.current = 0
    startPosRef.current.copy(camera.position)

    if (controls && (controls as any).target) {
      startTargetRef.current.copy((controls as any).target)
    }
  }, [resetKey, camera, controls])

  useFrame((_, delta) => {
    if (!animatingRef.current) return

    progressRef.current = Math.min(progressRef.current + delta, 1)
    const t = easeInOutCubic(progressRef.current)

    const targetPos = new THREE.Vector3(0, 0, 25)
    camera.position.lerpVectors(startPosRef.current, targetPos, t)

    if (controls && (controls as any).target) {
      const targetLook = new THREE.Vector3(0, 0, 0)
      ;(controls as any).target.lerpVectors(startTargetRef.current, targetLook, t)
    }

    if (progressRef.current >= 1) {
      animatingRef.current = false
    }
  })

  return null
}

export default function WordCloud3D({ words, layout, rotationSpeed, resetKey }: WordCloud3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 25], fov: 60, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
      dpr={[1, 2]}
    >
      <CameraController resetKey={resetKey} />
      <Scene words={words} layout={layout} rotationSpeed={rotationSpeed} />
    </Canvas>
  )
}

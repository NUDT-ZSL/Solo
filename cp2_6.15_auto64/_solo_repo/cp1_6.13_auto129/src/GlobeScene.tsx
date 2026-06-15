import { useRef, useMemo, useCallback, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Story } from './App'
import { getCursorStyle, CROSSHAIR_SVG, isTouchDevice } from './cursor'

interface GlobeSceneProps {
  stories: Story[]
  fadedOutIds: Set<string>
  onStorySelect: (id: string) => void
  selectedStoryId: string | null
  onLoadProgress: (count: number, total: number) => void
}

const EARTH_RADIUS = 5
const CAMERA_DEFAULT = new THREE.Vector3(0, 0, 12)

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

function createGlowTexture(color: string): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, color)
  gradient.addColorStop(0.2, color + 'aa')
  gradient.addColorStop(0.5, color + '44')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

const PULSE_RING_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const PULSE_RING_FRAG = `
uniform vec3 uColor;
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float dist = length(vUv - 0.5) * 2.0;
  float edgeSmooth = 0.05;
  float innerEdge = smoothstep(uInnerRadius - edgeSmooth, uInnerRadius + edgeSmooth, dist);
  float outerEdge = smoothstep(uOuterRadius - edgeSmooth, uOuterRadius + edgeSmooth, dist);
  float ring = innerEdge * (1.0 - outerEdge);
  if (ring < 0.01) discard;
  gl_FragColor = vec4(uColor, ring * uOpacity);
}
`

let audioCtx: AudioContext | null = null
function playHoverSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = 1200
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.1)
  } catch {}
}

function EarthMesh() {
  const meshRef = useRef<THREE.Mesh>(null)
  const [earthTexture, setEarthTexture] = useState<THREE.Texture | null>(null)
  const [cloudTexture, setCloudTexture] = useState<THREE.Texture | null>(null)
  const cloudRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.crossOrigin = 'anonymous'
    loader.load(
      'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
      (tex) => { tex.colorSpace = THREE.SRGBColorSpace; setEarthTexture(tex) },
      undefined,
      () => {
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 512
        const ctx = canvas.getContext('2d')!
        const gradient = ctx.createLinearGradient(0, 0, 1024, 512)
        gradient.addColorStop(0, '#1a3a5c')
        gradient.addColorStop(0.5, '#1e5080')
        gradient.addColorStop(1, '#1a3a5c')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 1024, 512)
        const fallback = new THREE.CanvasTexture(canvas)
        fallback.colorSpace = THREE.SRGBColorSpace
        setEarthTexture(fallback)
      }
    )
    loader.load(
      'https://unpkg.com/three-globe@2.31.1/example/img/earth-clouds.png',
      (tex) => { setCloudTexture(tex) },
      undefined,
      () => { setCloudTexture(null) }
    )
  }, [])

  useFrame(() => {
    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.0005
    }
  })

  if (!earthTexture) return null

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial map={earthTexture} roughness={0.8} metalness={0.1} />
      </mesh>
      {cloudTexture && (
        <mesh ref={cloudRef}>
          <sphereGeometry args={[EARTH_RADIUS + 0.05, 64, 64]} />
          <meshStandardMaterial map={cloudTexture} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

function PulseRing({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const pulseTime = useRef(Math.random())

  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uInnerRadius: { value: 0.0 },
    uOuterRadius: { value: 0.2 },
    uOpacity: { value: 0.8 },
  }), [color])

  useFrame((_, delta) => {
    pulseTime.current += delta
    const cycleDuration = 1.0
    const t = (pulseTime.current % cycleDuration) / cycleDuration
    const outerRadius = 0.1 + t * 0.5
    const innerRadius = Math.max(0.0, outerRadius - 0.12)
    uniforms.uInnerRadius.value = innerRadius / outerRadius
    uniforms.uOuterRadius.value = 1.0
    uniforms.uOpacity.value = 0.8 * (1 - t)

    if (meshRef.current) {
      meshRef.current.scale.set(outerRadius, outerRadius, 1)
    }
  })

  return (
    <mesh ref={meshRef} rotation={[0, 0, 0]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={PULSE_RING_VERT}
        fragmentShader={PULSE_RING_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function StoryDot({
  story,
  onSelect,
  isFadedOut,
}: {
  story: Story
  onSelect: (id: string) => void
  isFadedOut: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Sprite>(null)
  const [hovered, setHovered] = useState(false)
  const [scale, setScale] = useState(1)
  const opacityRef = useRef(1)
  const fadeDoneRef = useRef(true)
  const glowTexture = useMemo(() => createGlowTexture(story.dotColor), [story.dotColor])

  const position = useMemo(
    () => latLngToVector3(story.latitude, story.longitude, EARTH_RADIUS + 0.01),
    [story.latitude, story.longitude]
  )

  useFrame((_, delta) => {
    if (hovered && scale < 1.3) {
      setScale(s => Math.min(s + delta * 4, 1.3))
    } else if (!hovered && scale > 1) {
      setScale(s => Math.max(s - delta * 4, 1))
    }

    const prevOpacity = opacityRef.current
    if (isFadedOut && opacityRef.current > 0) {
      opacityRef.current = Math.max(opacityRef.current - delta * 2, 0)
    } else if (!isFadedOut && opacityRef.current < 1) {
      opacityRef.current = Math.min(opacityRef.current + delta * 2, 1)
    }

    if (isFadedOut && prevOpacity > 0 && opacityRef.current === 0) {
      fadeDoneRef.current = true
    }
    if (!isFadedOut && prevOpacity < 1 && opacityRef.current === 1) {
      fadeDoneRef.current = true
    }

    if (groupRef.current) {
      groupRef.current.scale.setScalar(scale)
      groupRef.current.visible = opacityRef.current > 0.01
    }

    if (glowRef.current) {
      const glowMat = glowRef.current.material as THREE.SpriteMaterial
      glowMat.opacity = 0.7 * opacityRef.current
    }
  })

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!isFadedOut && opacityRef.current > 0.5) onSelect(story.id)
  }, [story.id, onSelect, isFadedOut])

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (!isFadedOut && opacityRef.current > 0.5) {
      setHovered(true)
      playHoverSound()
      document.body.style.cursor = 'pointer'
    }
  }, [isFadedOut])

  const handlePointerOut = useCallback(() => {
    setHovered(false)
    if (!isTouchDevice()) {
      document.body.style.cursor = getCursorStyle()
    }
  }, [])

  const dotMat = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ color: story.dotColor, transparent: true })
    return mat
  }, [story.dotColor])

  useFrame(() => {
    dotMat.opacity = opacityRef.current
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        material={dotMat}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
      </mesh>
      <sprite ref={glowRef} scale={[0.5, 0.5, 1]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <PulseRing color={story.dotColor} />
    </group>
  )
}

function CameraController({ target, selectedStoryId }: { target: THREE.Vector3 | null; selectedStoryId: string | null }) {
  const { camera } = useThree()
  const animating = useRef(false)
  const animProgress = useRef(0)
  const startPos = useRef(new THREE.Vector3())
  const endPos = useRef(new THREE.Vector3())
  const startTarget = useRef(new THREE.Vector3())
  const endTarget = useRef(new THREE.Vector3())
  const prevSelectedId = useRef<string | null>(null)
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    if (selectedStoryId && selectedStoryId !== prevSelectedId.current && target) {
      const surfaceDir = target.clone().normalize()
      const targetCameraPos = surfaceDir.clone().multiplyScalar(EARTH_RADIUS + 2)
      const viewDir = new THREE.Vector3()
      camera.getWorldDirection(viewDir)
      const currentPos = camera.position.clone()
      const distToCenter = currentPos.length()
      const currentDistToSurface = distToCenter - EARTH_RADIUS
      const desiredDistToSurface = 2
      const moveDistance = currentDistToSurface - desiredDistToSurface
      const moveDir = currentPos.clone().normalize().negate()
      const cameraEnd = currentPos.clone().add(moveDir.multiplyScalar(moveDistance))
      const toTarget = cameraEnd.clone().sub(target)
      const desiredDist = EARTH_RADIUS + 2
      if (toTarget.length() < desiredDist * 0.5) {
        cameraEnd.copy(targetCameraPos)
      }
      startPos.current.copy(camera.position)
      endPos.current.copy(cameraEnd)
      startTarget.current.copy(controlsRef.current?.target ?? new THREE.Vector3())
      endTarget.current.copy(target)
      animProgress.current = 0
      animating.current = true
    } else if (!selectedStoryId && prevSelectedId.current) {
      startPos.current.copy(camera.position)
      endPos.current.copy(CAMERA_DEFAULT)
      startTarget.current.copy(controlsRef.current?.target ?? new THREE.Vector3())
      endTarget.current.set(0, 0, 0)
      animProgress.current = 0
      animating.current = true
    }
    prevSelectedId.current = selectedStoryId
  }, [selectedStoryId, target, camera])

  useFrame((_, delta) => {
    if (animating.current) {
      animProgress.current += delta / 0.4
      if (animProgress.current >= 1) {
        animProgress.current = 1
        animating.current = false
      }
      const t = 1 - Math.pow(1 - animProgress.current, 3)
      camera.position.lerpVectors(startPos.current, endPos.current, t)
      if (controlsRef.current) {
        const newTarget = new THREE.Vector3().lerpVectors(startTarget.current, endTarget.current, t)
        controlsRef.current.target.copy(newTarget)
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={EARTH_RADIUS + 1}
      maxDistance={25}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.5}
    />
  )
}

function StarField() {
  const positions = useMemo(() => {
    const pos = new Float32Array(2000 * 3)
    for (let i = 0; i < 2000; i++) {
      const r = 50 + Math.random() * 150
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={2000} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={1.5}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function SceneContent({ stories, fadedOutIds, onStorySelect, selectedStoryId, onLoadProgress }: GlobeSceneProps) {
  const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!loadedRef.current && stories.length > 0) {
      loadedRef.current = true
      onLoadProgress(stories.length, stories.length)
    }
  }, [stories, onLoadProgress])

  const handleSelect = useCallback((id: string) => {
    const story = stories.find(s => s.id === id)
    if (story) {
      const pos = latLngToVector3(story.latitude, story.longitude, EARTH_RADIUS)
      setTargetPos(pos)
    }
    onStorySelect(id)
  }, [stories, onStorySelect])

  useEffect(() => {
    if (!selectedStoryId) {
      setTargetPos(null)
    }
  }, [selectedStoryId])

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#6366f1" />
      <EarthMesh />
      <StarField />
      {stories.map(story => (
        <StoryDot
          key={story.id}
          story={story}
          onSelect={handleSelect}
          isFadedOut={fadedOutIds.has(story.id)}
        />
      ))}
      <CameraController target={targetPos} selectedStoryId={selectedStoryId} />
    </>
  )
}

export default function GlobeScene({ stories, fadedOutIds, onStorySelect, selectedStoryId, onLoadProgress }: GlobeSceneProps) {
  const cursorStyle = getCursorStyle()

  useEffect(() => {
    if (!isTouchDevice()) {
      document.body.style.cursor = cursorStyle
    }
    return () => { document.body.style.cursor = 'default' }
  }, [cursorStyle])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        cursor: isTouchDevice() ? 'default' : cursorStyle,
      }}
      onContextMenu={e => e.preventDefault()}
    >
      <Canvas
        camera={{ position: [0, 0, 12], fov: 45, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#0b1120'), 1)
        }}
        style={{ background: 'linear-gradient(180deg, #0b1120 0%, #1a2a40 100%)' }}
      >
        <SceneContent
          stories={stories}
          fadedOutIds={fadedOutIds}
          onStorySelect={onStorySelect}
          selectedStoryId={selectedStoryId}
          onLoadProgress={onLoadProgress}
        />
      </Canvas>
    </div>
  )
}

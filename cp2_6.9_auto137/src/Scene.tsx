import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Tag } from './types'
import { FONT_SIZE, SPIN_SPEED, ANIMATION_DURATION } from './constants'
import { getTagColor } from './utils'

interface SceneProps {
  tags: Tag[]
  selectedTagId: string | null
  showVotes: boolean
  onTagClick: (id: string) => void
  onTagDoubleClick: (id: string) => void
}

interface TagMeshProps {
  tag: Tag
  isSelected: boolean
  showVotes: boolean
  onClick: () => void
  onDoubleClick: () => void
}

function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function TagMesh({ tag, isSelected, showVotes, onClick, onDoubleClick }: TagMeshProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [appearProgress, setAppearProgress] = useState(0)
  const [fadeInProgress, setFadeInProgress] = useState(0)
  const [blinkPhase, setBlinkPhase] = useState(0)
  const startTime = useRef<number>(Date.now())

  const displayColor = getTagColor(tag.color, tag.votes)
  const isGolden = tag.votes >= 21

  useFrame((_, delta) => {
    const elapsed = (Date.now() - startTime.current) / 1000

    if (appearProgress < 1 && elapsed < ANIMATION_DURATION + 0.5) {
      const t = Math.min(1, elapsed / ANIMATION_DURATION)
      setAppearProgress(easeOutBack(t))
    } else if (appearProgress < 1) {
      setAppearProgress(1)
    }

    if (fadeInProgress < 1) {
      setFadeInProgress(Math.min(1, elapsed / 0.2))
    }

    if (isGolden) {
      setBlinkPhase((p) => (p + delta / 0.5) % 1)
    }

    if (groupRef.current) {
      groupRef.current.lookAt(0, groupRef.current.position.y, 0)
    }
  })

  const baseScale = appearProgress * 1.2 > 1.2 ? 1 : appearProgress * 1.2
  const selectedOffset = isSelected ? 0.5 : 0
  const blinkOpacity = isGolden ? 0.8 + 0.2 * Math.abs(Math.sin(blinkPhase * Math.PI * 2)) : 1
  const finalOpacity = Math.min(blinkOpacity, fadeInProgress)
  const effectiveScale = baseScale < 0.3 ? 0.3 : baseScale

  return (
    <group
      ref={groupRef}
      position={[
        tag.position.x * (1 + selectedOffset * 0.05),
        tag.position.y,
        tag.position.z * (1 + selectedOffset * 0.05) - selectedOffset,
      ]}
      scale={effectiveScale}
    >
      <Text
        fontSize={FONT_SIZE}
        color={displayColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={isSelected ? 0.08 : 0.02}
        outlineColor={isSelected ? '#ffffff' : '#000000'}
        outlineBlur={isSelected ? 0.5 : 0.1}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onDoubleClick()
        }}
        material-transparent
        material-opacity={finalOpacity}
        fontWeight={isSelected ? 800 : 500}
      >
        {tag.text}
      </Text>

      {showVotes && tag.votes > 0 && (
        <Html
          position={[0, FONT_SIZE * 0.8 + 0.4, 0]}
          center
          distanceFactor={12}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(0,0,0,0.65)',
            color: tag.votes >= 21 ? '#FFD700' : '#fff',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            border: `1px solid ${tag.votes >= 21 ? '#FFD700' : 'rgba(255,255,255,0.35)'}`,
            backdropFilter: 'blur(4px)',
            opacity: finalOpacity,
            transition: 'all 0.3s ease-in-out',
          }}>
            {tag.votes} 票
          </div>
        </Html>
      )}
    </group>
  )
}

function SceneContent({ tags, selectedTagId, showVotes, onTagClick, onTagDoubleClick }: SceneProps) {
  const containerRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (containerRef.current) {
      containerRef.current.rotation.y += (SPIN_SPEED * Math.PI) / 180
    }
  })

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <directionalLight position={[0, 5, 5]} intensity={0.8} castShadow />

      <group ref={containerRef}>
        {tags.map((tag) => (
          <TagMesh
            key={tag.id}
            tag={tag}
            isSelected={selectedTagId === tag.id}
            showVotes={showVotes}
            onClick={() => onTagClick(tag.id)}
            onDoubleClick={() => onTagDoubleClick(tag.id)}
          />
        ))}
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={8}
        maxDistance={35}
        panSpeed={0.05}
        enablePan
        makeDefault
      />
    </>
  )
}

function Scene(props: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 22], fov: 60 }}
      style={{ background: '#2C3E50', width: '100%', height: '100%' }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  )
}

export default Scene

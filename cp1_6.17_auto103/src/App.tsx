import React, { useRef, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore, Obstacle } from './store'
import { PhysicsEngine } from './physics-engine'
import { CollisionManager } from './collision-manager'
import { PerformanceMonitor } from './performance-monitor'
import { UIControl } from './ui-control'

const generateId = (): string => Math.random().toString(36).substr(2, 9)

const BoundaryBox: React.FC<{ size: [number, number, number] }> = ({ size }) => {
  const edges = useMemo(() => {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2])
    return new THREE.EdgesGeometry(geometry)
  }, [size])

  return (
    <group>
      <lineSegments>
        <bufferGeometry attach="geometry" {...edges} />
        <lineBasicMaterial
          attach="material"
          color="#4A90D9"
          transparent
          opacity={0.2}
          linewidth={1}
        />
      </lineSegments>
      <mesh>
        <boxGeometry attach="geometry" args={size} />
        <meshBasicMaterial
          attach="material"
          color="#4A90D9"
          transparent
          opacity={0.02}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

interface ObstacleMeshProps {
  obstacle: Obstacle
  isSelected: boolean
  onClick: (e: any) => void
  onPointerDown: (e: any) => void
  rippleIntensity: number
}

const ObstacleMesh: React.FC<ObstacleMeshProps> = ({
  obstacle,
  isSelected,
  onClick,
  onPointerDown,
  rippleIntensity,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)

  const getGeometry = () => {
    switch (obstacle.type) {
      case 'cube':
        return <boxGeometry attach="geometry" args={[obstacle.size, obstacle.size, obstacle.size]} />
      case 'sphere':
        return <sphereGeometry attach="geometry" args={[obstacle.size, 32, 32]} />
      case 'torus':
        return <torusGeometry attach="geometry" args={[obstacle.size / 2, obstacle.size * 0.15, 16, 48]} />
      default:
        return <boxGeometry attach="geometry" args={[1, 1, 1]} />
    }
  }

  const getColor = () => {
    switch (obstacle.type) {
      case 'cube':
        return '#8B4513'
      case 'sphere':
        return '#A9A9A9'
      case 'torus':
        return '#FFD700'
      default:
        return '#ffffff'
    }
  }

  const color = useMemo(() => {
    const baseColor = new THREE.Color(getColor())
    if (rippleIntensity > 0) {
      const white = new THREE.Color('#ffffff')
      return baseColor.clone().lerp(white, rippleIntensity * 0.5)
    }
    return baseColor
  }, [obstacle.type, rippleIntensity])

  return (
    <group position={obstacle.position} rotation={obstacle.rotation}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerDown={onPointerDown}
        castShadow
        receiveShadow
      >
        {getGeometry()}
        <meshStandardMaterial
          attach="material"
          color={color}
          metalness={obstacle.type === 'sphere' ? 0.8 : 0.1}
          roughness={obstacle.type === 'sphere' ? 0.2 : 0.8}
          emissive={isSelected ? '#3498DB' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>
      {isSelected && (
        <mesh>
          {getGeometry()}
          <meshBasicMaterial
            attach="material"
            color="#3498DB"
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>
      )}
    </group>
  )
}

interface ObstaclePreviewProps {
  type: string
  position: [number, number, number]
}

const ObstaclePreview: React.FC<ObstaclePreviewProps> = ({ type, position }) => {
  const size = type === 'cube' ? 1.5 : type === 'sphere' ? 1 : 2

  const getGeometry = () => {
    switch (type) {
      case 'cube':
        return <boxGeometry attach="geometry" args={[size, size, size]} />
      case 'sphere':
        return <sphereGeometry attach="geometry" args={[size, 32, 32]} />
      case 'torus':
        return <torusGeometry attach="geometry" args={[size / 2, size * 0.15, 16, 48]} />
      default:
        return <boxGeometry attach="geometry" args={[1, 1, 1]} />
    }
  }

  return (
    <mesh position={position}>
      {getGeometry()}
      <meshBasicMaterial
        attach="material"
        color={type === 'cube' ? '#8B4513' : type === 'sphere' ? '#A9A9A9' : '#FFD700'}
        transparent
        opacity={0.4}
      />
    </mesh>
  )
}

interface ParticlesProps {
  physicsEngine: PhysicsEngine
  collisionManager: CollisionManager
}

const Particles: React.FC<ParticlesProps> = ({ physicsEngine, collisionManager }) => {
  const pointsRef = useRef<THREE.Points>(null)
  const positionsRef = useRef<Float32Array>(new Float32Array(500 * 3))
  const colorsRef = useRef<Float32Array>(new Float32Array(500 * 3))
  const {
    particles,
    obstacles,
    isRunning,
    timeScale,
    emissionRate,
    updateParticles,
    addParticle,
    clearCollisionEvents,
    addRippleEffect,
    addSparkEffect,
    rippleEffects,
    removeRippleEffect,
    sparkEffects,
    removeSparkEffect,
  } = useAppStore()

  useFrame((_state, delta) => {
    if (!isRunning || !pointsRef.current) return

    const dt = Math.min(delta, 0.033)

    collisionManager.setObstacles(obstacles)
    const collisionResult = collisionManager.checkCollisions(particles)

    for (const event of collisionResult.events) {
      if (event.obstacleId) {
        addRippleEffect({
          id: generateId(),
          obstacleId: event.obstacleId,
          timestamp: Date.now(),
          position: event.position,
        })
        addSparkEffect({
          id: generateId(),
          position: event.position,
          timestamp: Date.now(),
        })
      }
    }

    const { updated } = physicsEngine.updateParticles(
      particles,
      dt,
      timeScale,
      collisionResult.events
    )

    const newParticles = physicsEngine.emitParticles(dt * timeScale, emissionRate, particles)

    const allParticles = [...updated, ...newParticles]
    updateParticles(allParticles)

    for (const p of newParticles) {
      addParticle(p)
    }

    clearCollisionEvents()

    const particlePositions = physicsEngine.getParticlePositions(allParticles)
    const particleColors = physicsEngine.getParticleColors(allParticles)

    positionsRef.current.set(particlePositions)
    colorsRef.current.set(particleColors)

    for (let i = allParticles.length * 3; i < 500 * 3; i++) {
      positionsRef.current[i] = 0
      colorsRef.current[i] = 0
    }

    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry
      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
      const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute
      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
      geometry.setDrawRange(0, allParticles.length)
      geometry.computeBoundingSphere()
    }

    const now = Date.now()
    rippleEffects.forEach((r) => {
      if (now - r.timestamp > 200) {
        removeRippleEffect(r.id)
      }
    })
    sparkEffects.forEach((s) => {
      if (now - s.timestamp > 100) {
        removeSparkEffect(s.id)
      }
    })
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={500}
          array={positionsRef.current}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={500}
          array={colorsRef.current}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        size={0.1}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  )
}

interface SparkEffectsProps {}

const SparkEffects: React.FC<SparkEffectsProps> = () => {
  const { sparkEffects } = useAppStore()
  const now = Date.now()

  return (
    <>
      {sparkEffects.map((spark) => {
        const age = now - spark.timestamp
        const opacity = Math.max(0, 1 - age / 100)
        return (
          <mesh key={spark.id} position={spark.position}>
            <sphereGeometry attach="geometry" args={[0.05, 8, 8]} />
            <meshBasicMaterial
              attach="material"
              color="#ffffff"
              transparent
              opacity={opacity}
            />
          </mesh>
        )
      })}
    </>
  )
}

interface SceneInteractionProps {
  physicsEngine: PhysicsEngine
  collisionManager: CollisionManager
}

const SceneInteraction: React.FC<SceneInteractionProps> = ({
  physicsEngine,
  collisionManager,
}) => {
  const { raycaster, camera, mouse } = useThree()
  const groundPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    []
  )

  const {
    obstacles,
    boundarySize,
    placingObstacleType,
    previewPosition,
    setPreviewPosition,
    addObstacle,
    setPlacingObstacleType,
    selectedObstacleId,
    setSelectedObstacle,
    updateObstacle,
    rippleEffects,
  } = useAppStore()

  const draggingObstacle = useRef<string | null>(null)
  const dragOffset = useRef<[number, number, number]>([0, 0, 0])

  useFrame(() => {
    if (!placingObstacleType) {
      if (previewPosition) {
        setPreviewPosition(null)
      }
      return
    }

    raycaster.setFromCamera(mouse, camera)
    const intersect = new THREE.Vector3()
    raycaster.ray.intersectPlane(groundPlane, intersect)

    if (intersect) {
      const halfBounds = boundarySize.map((s) => s / 2) as [number, number, number]
      const clamped: [number, number, number] = [
        Math.max(-halfBounds[0] + 1, Math.min(halfBounds[0] - 1, intersect.x)),
        Math.max(-halfBounds[1] + 1, Math.min(halfBounds[1] - 1, intersect.y)),
        Math.max(-halfBounds[2] + 1, Math.min(halfBounds[2] - 1, intersect.z)),
      ]
      setPreviewPosition(clamped)
    }
  })

  const handleCanvasClick = useCallback(
    (e: any) => {
      e.stopPropagation()

      if (draggingObstacle.current) {
        draggingObstacle.current = null
        return
      }

      if (placingObstacleType && previewPosition) {
        if (obstacles.length < 5) {
          const newObstacle = collisionManager.createObstacle(
            placingObstacleType,
            previewPosition
          )
          addObstacle(newObstacle)
        }
      } else {
        setSelectedObstacle(null)
      }
    },
    [
      placingObstacleType,
      previewPosition,
      obstacles.length,
      addObstacle,
      setSelectedObstacle,
      collisionManager,
    ]
  )

  const handleContextMenu = useCallback(
    (e: any) => {
      e.preventDefault()
      if (placingObstacleType) {
        setPlacingObstacleType(null)
      }
      setSelectedObstacle(null)
      draggingObstacle.current = null
    },
    [placingObstacleType, setPlacingObstacleType, setSelectedObstacle]
  )

  const handleObstacleClick = useCallback(
    (e: any, _obstacle: Obstacle) => {
      e.stopPropagation()
    },
    []
  )

  const handleObstaclePointerDown = useCallback(
    (e: any, obstacle: Obstacle) => {
      e.stopPropagation()
      if (e.button === 2) {
        setSelectedObstacle(obstacle.id)
        draggingObstacle.current = obstacle.id
        raycaster.setFromCamera(mouse, camera)
        const intersect = new THREE.Vector3()
        raycaster.ray.intersectPlane(groundPlane, intersect)
        if (intersect) {
          dragOffset.current = [
            obstacle.position[0] - intersect.x,
            obstacle.position[1] - intersect.y,
            obstacle.position[2] - intersect.z,
          ]
        }
      }
    },
    [setSelectedObstacle, boundarySize, raycaster, mouse, camera, groundPlane]
  )

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingObstacle.current) return

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )

      raycaster.setFromCamera(ndc, camera)
      const intersect = new THREE.Vector3()
      raycaster.ray.intersectPlane(groundPlane, intersect)

      if (intersect) {
        const halfBounds = boundarySize.map((s) => s / 2) as [number, number, number]
        const newPos: [number, number, number] = [
          Math.max(-halfBounds[0] + 1, Math.min(halfBounds[0] - 1, intersect.x + dragOffset.current[0])),
          Math.max(-halfBounds[1] + 1, Math.min(halfBounds[1] - 1, intersect.y + dragOffset.current[1])),
          Math.max(-halfBounds[2] + 1, Math.min(halfBounds[2] - 1, intersect.z + dragOffset.current[2])),
        ]
        updateObstacle(draggingObstacle.current, { position: newPos })
      }
    }

    const handlePointerUp = () => {
      draggingObstacle.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [raycaster, camera, groundPlane, boundarySize, updateObstacle])

  const getRippleIntensity = (obstacleId: string): number => {
    const ripple = rippleEffects.find((r) => r.obstacleId === obstacleId)
    if (!ripple) return 0
    const age = Date.now() - ripple.timestamp
    return Math.max(0, 1 - age / 200)
  }

  return (
    <group onClick={handleCanvasClick} onContextMenu={handleContextMenu}>
      <BoundaryBox size={boundarySize} />

      {obstacles.map((obstacle) => (
        <ObstacleMesh
          key={obstacle.id}
          obstacle={obstacle}
          isSelected={selectedObstacleId === obstacle.id}
          onClick={(e) => handleObstacleClick(e, obstacle)}
          onPointerDown={(e) => handleObstaclePointerDown(e, obstacle)}
          rippleIntensity={getRippleIntensity(obstacle.id)}
        />
      ))}

      {placingObstacleType && previewPosition && (
        <ObstaclePreview type={placingObstacleType} position={previewPosition} />
      )}

      <Particles physicsEngine={physicsEngine} collisionManager={collisionManager} />
      <SparkEffects />
    </group>
  )
}

const Scene: React.FC = () => {
  const {
    gravity,
    damping,
    restitution,
    boundarySize,
    particleLifetime,
    particleRadius,
    maxParticles,
    obstacles,
  } = useAppStore()

  const physicsEngine = useMemo(
    () =>
      new PhysicsEngine({
        gravity,
        damping,
        restitution,
        boundarySize,
        particleLifetime,
        particleRadius,
        maxParticles,
      }),
    [gravity, damping, restitution, boundarySize, particleLifetime, particleRadius, maxParticles]
  )

  const collisionManager = useMemo(() => new CollisionManager(), [])

  useEffect(() => {
    collisionManager.setObstacles(obstacles)
    collisionManager.setParticleRadius(particleRadius)
    collisionManager.setBoundarySize(boundarySize)
  }, [obstacles, particleRadius, boundarySize, collisionManager])

  return (
    <>
      <PerspectiveCamera makeDefault position={[15, 10, 15]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        enablePan={true}
      />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#4A90D9" />
      <pointLight position={[10, -5, 10]} intensity={0.3} color="#1E90FF" />

      <fog attach="fog" args={['#1a1a2e', 20, 50]} />

      <SceneInteraction
        physicsEngine={physicsEngine}
        collisionManager={collisionManager}
      />
    </>
  )
}

const App: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%', background: '#1a1a2e' }}>
      <Canvas
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        shadows
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
      <PerformanceMonitor />
      <UIControl />
    </div>
  )
}

export default App

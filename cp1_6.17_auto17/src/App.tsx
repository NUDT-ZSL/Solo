import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import {
  VoxelWorld,
  BlockType,
  BLOCK_COLORS,
  BLOCK_NAMES,
  BUILDABLE_BLOCK_TYPES,
  WORLD_SIZE_X,
  WORLD_SIZE_Y,
  WORLD_SIZE_Z
} from './voxelWorld'

interface Particle {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: string
  life: number
  maxLife: number
}

interface AnimatedBlock {
  id: number
  x: number
  y: number
  z: number
  type: BlockType
  scale: number
  targetScale: number
  startTime: number
  duration: number
  isRemoving: boolean
}

interface BuildAnimation {
  id: number
  x: number
  y: number
  z: number
  type: BlockType
  startTime: number
  duration: number
}

const easeOutBounce = (t: number): number => {
  const n1 = 7.5625
  const d1 = 2.75
  if (t < 1 / d1) return n1 * t * t
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
  return n1 * (t -= 2.625 / d1) * t + 0.984375
}

const VoxelScene: React.FC<{
  world: VoxelWorld
  selectedBlockType: BlockType
  onCoordinatesChange: (coords: { x: number; y: number; z: number } | null) => void
}> = ({ world, selectedBlockType, onCoordinatesChange }) => {
  const { camera } = useThree()
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const [animatedBlocks, setAnimatedBlocks] = useState<AnimatedBlock[]>([])
  const [buildAnimations, setBuildAnimations] = useState<BuildAnimation[]>([])
  const [version, setVersion] = useState(0)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const particleIdRef = useRef(0)
  const animationIdRef = useRef(0)
  const buildAnimIdRef = useRef(0)

  const blockPositions = useMemo(() => {
    const positions: { x: number; y: number; z: number; type: BlockType }[] = []
    for (let x = 0; x < WORLD_SIZE_X; x++) {
      for (let y = 0; y < WORLD_SIZE_Y; y++) {
        for (let z = 0; z < WORLD_SIZE_Z; z++) {
          const type = world.getVoxel(x, y, z)
          if (type !== BlockType.AIR && !world.isFalling(x, y, z)) {
            positions.push({ x, y, z, type })
          }
        }
      }
    }
    return positions
  }, [version, world])

  useFrame((_state, delta) => {
    const needsUpdate = world.updateFallingBlocks(delta)
    if (needsUpdate) {
      setVersion(v => v + 1)
    }

    setParticles(prev => {
      const updated = prev.map(p => ({
        ...p,
        position: p.position.clone().add(p.velocity.clone().multiplyScalar(delta)),
        velocity: p.velocity.clone().add(new THREE.Vector3(0, -10, 0).multiplyScalar(delta)),
        life: p.life - delta
      })).filter(p => p.life > 0)
      return updated
    })

    const now = performance.now()
    setAnimatedBlocks(prev => {
      return prev.map(ab => {
        const elapsed = (now - ab.startTime) / 1000
        const progress = Math.min(elapsed / ab.duration, 1)
        if (ab.isRemoving) {
          ab.scale = 1 - progress
        } else {
          ab.scale = progress
        }
        return ab
      }).filter(ab => ab.scale > 0.01)
    })

    setBuildAnimations(prev => {
      return prev.filter(ba => {
        const elapsed = (now - ba.startTime) / 1000
        return elapsed < ba.duration
      })
    })
  })

  useEffect(() => {
    if (!meshRef.current) return

    const mesh = meshRef.current
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    blockPositions.forEach((pos, i) => {
      dummy.position.set(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, color.set(BLOCK_COLORS[pos.type]))
    })

    mesh.count = blockPositions.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [blockPositions])

  const spawnParticles = useCallback((x: number, y: number, z: number, color: string, count: number = 30) => {
    const newParticles: Particle[] = []
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        position: new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          Math.random() * 6 + 2,
          (Math.random() - 0.5) * 8
        ),
        color,
        life: 0.5,
        maxLife: 0.5
      })
    }
    setParticles(prev => [...prev, ...newParticles])
  }, [])

  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()

    const rect = (event.currentTarget as unknown as HTMLElement).getBoundingClientRect()
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.current.setFromCamera(mouse.current, camera)

    const hits: THREE.Intersection[] = []
    blockPositions.forEach((pos, i) => {
      const box = new THREE.Box3(
        new THREE.Vector3(pos.x, pos.y, pos.z),
        new THREE.Vector3(pos.x + 1, pos.y + 1, pos.z + 1)
      )
      const intersection = raycaster.current.ray.intersectBox(box, new THREE.Vector3())
      if (intersection) {
        hits.push({
          distance: raycaster.current.ray.origin.distanceTo(intersection),
          point: intersection,
          face: null,
          faceIndex: i,
          object: new THREE.Object3D(),
          instanceId: i
        })
      }
    })

    world.fallingBlocks.forEach(fb => {
      const currentY = fb.y - (fb.y - fb.targetY) * Math.min(fb.progress, 1)
      const box = new THREE.Box3(
        new THREE.Vector3(fb.x, currentY, fb.z),
        new THREE.Vector3(fb.x + 1, currentY + 1, fb.z + 1)
      )
      const intersection = raycaster.current.ray.intersectBox(box, new THREE.Vector3())
      if (intersection) {
        hits.push({
          distance: raycaster.current.ray.origin.distanceTo(intersection),
          point: intersection,
          face: null,
          faceIndex: -1,
          object: new THREE.Object3D(),
          instanceId: -1
        })
      }
    })

    hits.sort((a, b) => a.distance - b.distance)

    if (hits.length === 0) {
      onCoordinatesChange(null)
      return
    }

    const hit = hits[0]
    let hitX: number, hitY: number, hitZ: number
    let isFallingHit = false
    const hitInstanceId = hit.instanceId as number | undefined

    if (hitInstanceId !== undefined && hitInstanceId !== -1 && hitInstanceId < blockPositions.length) {
      const pos = blockPositions[hitInstanceId]
      hitX = pos.x
      hitY = pos.y
      hitZ = pos.z
    } else {
      const fb = hits.find(h => (h.instanceId as number | undefined) === -1)
      if (fb) {
        const fallingBlock = world.fallingBlocks[0]
        hitX = fallingBlock.x
        hitY = fallingBlock.y
        hitZ = fallingBlock.z
        isFallingHit = true
      } else {
        return
      }
    }

    onCoordinatesChange({ x: hitX, y: hitY, z: hitZ })

    const normal = hit.point.clone().sub(new THREE.Vector3(hitX + 0.5, hitY + 0.5, hitZ + 0.5)).normalize()

    if (event.button === 0) {
      const blockType = world.getVoxel(hitX, hitY, hitZ)
      if (blockType === BlockType.BEDROCK) return

      setAnimatedBlocks(prev => [...prev, {
        id: animationIdRef.current++,
        x: hitX,
        y: hitY,
        z: hitZ,
        type: blockType,
        scale: 1,
        targetScale: 0,
        startTime: performance.now(),
        duration: 0.2,
        isRemoving: true
      }])

      spawnParticles(hitX, hitY, hitZ, BLOCK_COLORS[blockType], 30)

      setTimeout(() => {
        if (isFallingHit) {
          world.fallingBlocks = world.fallingBlocks.filter(fb => !(fb.x === hitX && fb.y === hitY && fb.z === hitZ))
        } else {
          world.setVoxel(hitX, hitY, hitZ, BlockType.AIR)
        }
        world.applyGravity()
        setVersion(v => v + 1)
      }, 200)
    } else if (event.button === 2) {
      const placeX = hitX + Math.round(normal.x)
      const placeY = hitY + Math.round(normal.y)
      const placeZ = hitZ + Math.round(normal.z)

      if (world.getVoxel(placeX, placeY, placeZ) !== BlockType.AIR) return

      setBuildAnimations(prev => [...prev, {
        id: buildAnimIdRef.current++,
        x: placeX,
        y: placeY,
        z: placeZ,
        type: selectedBlockType,
        startTime: performance.now(),
        duration: 0.2
      }])

      setTimeout(() => {
        world.setVoxel(placeX, placeY, placeZ, selectedBlockType)
        world.applyGravity()
        setVersion(v => v + 1)
      }, 200)
    }
  }, [camera, blockPositions, world, selectedBlockType, spawnParticles, onCoordinatesChange])

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    const rect = (event.currentTarget as unknown as HTMLElement).getBoundingClientRect()
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.current.setFromCamera(mouse.current, camera)

    let closestHit: { x: number; y: number; z: number } | null = null
    let closestDist = Infinity

    blockPositions.forEach(pos => {
      const box = new THREE.Box3(
        new THREE.Vector3(pos.x, pos.y, pos.z),
        new THREE.Vector3(pos.x + 1, pos.y + 1, pos.z + 1)
      )
      const intersection = raycaster.current.ray.intersectBox(box, new THREE.Vector3())
      if (intersection) {
        const dist = raycaster.current.ray.origin.distanceTo(intersection)
        if (dist < closestDist) {
          closestDist = dist
          closestHit = { x: pos.x, y: pos.y, z: pos.z }
        }
      }
    })

    onCoordinatesChange(closestHit)
  }, [camera, blockPositions, onCoordinatesChange])

  const handleContextMenu = useCallback((_event: ThreeEvent<MouseEvent>) => {
    _event.nativeEvent.preventDefault()
  }, [])

  return (
    <group onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onContextMenu={handleContextMenu}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, 4000]}>
        <boxGeometry args={[0.98, 0.98, 0.98]} />
        <meshLambertMaterial />
      </instancedMesh>

      {world.fallingBlocks.map((fb, idx) => {
        const currentY = fb.y - (fb.y - fb.targetY) * Math.min(fb.progress, 1)
        return (
          <group key={`falling-${idx}`}>
            {fb.trailPositions.map((trail, tidx) => (
              <mesh key={`trail-${tidx}`} position={[trail.x + 0.5, trail.y + 0.5, trail.z + 0.5]}>
                <boxGeometry args={[0.98, 0.98, 0.98]} />
                <meshLambertMaterial
                  color={BLOCK_COLORS[fb.type]}
                  transparent
                  opacity={trail.alpha}
                />
              </mesh>
            ))}
            <mesh position={[fb.x + 0.5, currentY + 0.5, fb.z + 0.5]}>
              <boxGeometry args={[0.98, 0.98, 0.98]} />
              <meshLambertMaterial color={BLOCK_COLORS[fb.type]} />
            </mesh>
          </group>
        )
      })}

      {animatedBlocks.map(ab => (
        <mesh
          key={`anim-${ab.id}`}
          position={[ab.x + 0.5, ab.y + 0.5, ab.z + 0.5]}
          scale={[ab.scale, ab.scale, ab.scale]}
        >
          <boxGeometry args={[0.98, 0.98, 0.98]} />
          <meshLambertMaterial color={BLOCK_COLORS[ab.type]} />
        </mesh>
      ))}

      {buildAnimations.map(ba => {
        const elapsed = (performance.now() - ba.startTime) / 1000
        const progress = Math.min(elapsed / ba.duration, 1)
        const scale = easeOutBounce(progress)
        return (
          <mesh
            key={`build-${ba.id}`}
            position={[ba.x + 0.5, ba.y + 0.5, ba.z + 0.5]}
            scale={[scale, scale, scale]}
          >
            <boxGeometry args={[0.98, 0.98, 0.98]} />
            <meshLambertMaterial color={BLOCK_COLORS[ba.type]} />
          </mesh>
        )
      })}

      {particles.map(p => (
        <mesh
          key={`particle-${p.id}`}
          position={[p.position.x, p.position.y, p.position.z]}
          scale={[0.15 * (p.life / p.maxLife), 0.15 * (p.life / p.maxLife), 0.15 * (p.life / p.maxLife)]}
        >
          <boxGeometry />
          <meshLambertMaterial color={p.color} transparent opacity={p.life / p.maxLife} />
        </mesh>
      ))}
    </group>
  )
}

const App: React.FC = () => {
  const [world] = useState(() => new VoxelWorld())
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>(BlockType.DIRT)
  const [coordinates, setCoordinates] = useState<{ x: number; y: number; z: number } | null>(null)

  const handleSelectBlockType = useCallback((type: BlockType) => {
    setSelectedBlockType(type)
    world.selectedBlockType = type
  }, [world])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [15, 12, 15], fov: 60 }}
        gl={{ antialias: true }}
        style={{ background: 'linear-gradient(to bottom, #87CEEB, #B0E0E6)' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
        <directionalLight position={[-10, 10, -10]} intensity={0.4} />

        <VoxelScene
          world={world}
          selectedBlockType={selectedBlockType}
          onCoordinatesChange={setCoordinates}
        />

        <Grid
          args={[WORLD_SIZE_X, WORLD_SIZE_Z]}
          position={[WORLD_SIZE_X / 2 - 0.5, 0.01, WORLD_SIZE_Z / 2 - 0.5]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#CCCCCC"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#999999"
          fadeDistance={50}
          fadeStrength={1}
          followCamera={false}
        />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'auto'
        }}
      >
        <div
          style={{
            padding: '8px 18px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            backdropFilter: 'blur(8px)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            userSelect: 'none',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}
        >
          <span style={{
            color: '#CCCCCC',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
          }}>当前方块:</span>
          <span
            style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              backgroundColor: BLOCK_COLORS[selectedBlockType],
              borderRadius: '4px',
              border: selectedBlockType === BlockType.BEDROCK
                ? '2px solid #FFD700'
                : '2px solid rgba(255,255,255,0.3)',
              verticalAlign: 'middle',
              boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
            }}
          />
          <span style={{
            color: '#FFFFFF',
            fontWeight: 700,
            textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.5)',
            fontSize: '15px'
          }}>{BLOCK_NAMES[selectedBlockType]}</span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 16px',
            backgroundColor: 'rgba(44, 62, 80, 0.9)',
            borderRadius: '14px',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.35)'
          }}
        >
          {BUILDABLE_BLOCK_TYPES.map(bt => {
            const isSelected = selectedBlockType === bt
            return (
              <button
                key={bt}
                onClick={() => handleSelectBlockType(bt)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 12px',
                  border: isSelected ? '2px solid #FFD700' : '2px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  backgroundColor: isSelected
                    ? 'rgba(255, 215, 0, 0.15)'
                    : 'rgba(255, 255, 255, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isSelected
                    ? '0 0 16px rgba(255, 215, 0, 0.5), inset 0 0 10px rgba(255, 215, 0, 0.12)'
                    : '0 2px 8px rgba(0, 0, 0, 0.2)',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  outline: 'none',
                  userSelect: 'none'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: BLOCK_COLORS[bt],
                    borderRadius: '6px',
                    border: isSelected
                      ? '2px solid #FFD700'
                      : '1px solid rgba(255, 255, 255, 0.18)',
                    boxShadow: isSelected
                      ? '0 0 12px rgba(255, 215, 0, 0.45), 0 2px 8px rgba(0,0,0,0.3)'
                      : '0 2px 6px rgba(0, 0, 0, 0.35)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '42%',
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.22), transparent)',
                      borderRadius: '5px 5px 0 0'
                    }}
                  />
                </div>
                <span
                  style={{
                    color: isSelected ? '#FFD700' : 'rgba(255, 255, 255, 0.8)',
                    fontSize: '12px',
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    fontWeight: isSelected ? 700 : 500,
                    letterSpacing: '0.4px',
                    whiteSpace: 'nowrap',
                    textShadow: isSelected
                      ? '0 0 8px rgba(255, 215, 0, 0.6)'
                      : '0 1px 2px rgba(0,0,0,0.6)'
                  }}
                >
                  {BLOCK_NAMES[bt]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {coordinates && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            padding: '8px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '4px',
            color: 'white',
            fontSize: '14px',
            fontFamily: 'monospace',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'none'
          }}
        >
          X: {coordinates.x}, Y: {coordinates.y}, Z: {coordinates.z}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '4px',
          color: 'white',
          fontSize: '12px',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'none'
        }}
      >
        <div>🖱️ 左键：挖掘方块</div>
        <div>🖱️ 右键：建造方块</div>
        <div>🖱️ 拖拽：旋转视角</div>
        <div>滚轮：缩放</div>
      </div>
    </div>
  )
}

export default App

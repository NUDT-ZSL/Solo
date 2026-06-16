import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Ship } from './ship'
import { createShip, updateShip, moveShip, moveShipWithBezier, getShipFrontPosition, setShipFormationPosition, setShipColorTransition } from './ship'
import { FormationType, formationPositions, FORMATION_NAMES, FORMATION_COLORS } from './formation'
import type { Enemy, ExplosionParticle } from './enemy'
import { spawnEnemy, updateEnemy, damageEnemy } from './enemy'
import { randomPositionInSphere, generateBezierPath, distance } from './utils'

interface Laser {
  id: string
  start: THREE.Vector3
  end: THREE.Vector3
  life: number
}

interface Star {
  position: THREE.Vector3
  size: number
  twinkleSpeed: number
  twinkleOffset: number
}

const SHIP_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe']

function ShipModel({ ship, onClick }: { ship: Ship; onClick: () => void }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(ship.position)
      groupRef.current.rotation.copy(ship.rotation)
    }
  })

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <mesh>
        <ellipsoidGeometry args={[3, 1.5, 8]} />
        <meshStandardMaterial color={ship.color} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 6]}>
        <cylinderGeometry args={[0.8, 1.2, 4, 8]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.6, 1, 3, 8]} />
        <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-4, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.6, 1, 3, 8]} />
        <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -3]}>
        <cylinderGeometry args={[0.5, 0.5, 3, 6]} />
        <meshStandardMaterial color="#222222" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 1, -2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 2, 3, 3]} />
        <meshStandardMaterial color={ship.color} metalness={0.6} roughness={0.4} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, -1, -2]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 2, 3, 3]} />
        <meshStandardMaterial color={ship.color} metalness={0.6} roughness={0.4} transparent opacity={0.9} />
      </mesh>
      {ship.isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
          <torusGeometry args={[15, 0.5, 8, 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  )
}

function EnemyModel({ enemy }: { enemy: Enemy }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (meshRef.current && !enemy.isExploding) {
      meshRef.current.position.copy(enemy.position)
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.5
    }
  })

  if (enemy.isExploding) {
    return (
      <group>
        {enemy.explosionParticles.map((particle) => (
          <ExplosionParticleModel key={particle.id} particle={particle} />
        ))}
      </group>
    )
  }

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[enemy.radius, 16, 16]} />
      <meshStandardMaterial color="#ff0000" emissive="#ff3333" emissiveIntensity={0.5} />
    </mesh>
  )
}

function ExplosionParticleModel({ particle }: { particle: ExplosionParticle }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(particle.position)
      const opacity = particle.life / particle.maxLife
      const material = meshRef.current.material as THREE.MeshBasicMaterial
      material.opacity = opacity
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[particle.size, 8, 8]} />
      <meshBasicMaterial color={particle.color} transparent opacity={1} />
    </mesh>
  )
}

function LaserModel({ laser }: { laser: Laser }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current) {
      const mid = laser.start.clone().add(laser.end).multiplyScalar(0.5)
      meshRef.current.position.copy(mid)
      meshRef.current.lookAt(laser.end)
    }
  })

  const length = laser.start.distanceTo(laser.end)

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[0.3, 0.3, length, 8]} />
      <meshBasicMaterial color="#00aaff" transparent opacity={0.8} />
    </mesh>
  )
}

function Stars() {
  const stars = useMemo<Star[]>(() => {
    const result: Star[] = []
    for (let i = 0; i < 100; i++) {
      result.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 1000,
          (Math.random() - 0.5) * 1000,
          (Math.random() - 0.5) * 1000
        ),
        size: 1 + Math.random() * 1,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        twinkleOffset: Math.random() * Math.PI * 2,
      })
    }
    return result
  }, [])

  const pointsRef = useRef<THREE.Points>(null)

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry as THREE.BufferGeometry
      const colors = geometry.attributes.color as THREE.BufferAttribute
      const sizes = geometry.attributes.size as THREE.BufferAttribute

      for (let i = 0; i < stars.length; i++) {
        const twinkle = Math.sin(clock.getElapsedTime() * stars[i].twinkleSpeed + stars[i].twinkleOffset)
        const brightness = 0.5 + (twinkle + 1) * 0.25
        colors.setXYZ(i, brightness, brightness, brightness)
        sizes.setX(i, stars[i].size * (0.8 + twinkle * 0.2))
      }
      colors.needsUpdate = true
      sizes.needsUpdate = true
    }
  })

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(stars.length * 3)
    const colors = new Float32Array(stars.length * 3)
    const sizes = new Float32Array(stars.length)

    for (let i = 0; i < stars.length; i++) {
      positions[i * 3] = stars[i].position.x
      positions[i * 3 + 1] = stars[i].position.y
      positions[i * 3 + 2] = stars[i].position.z
      colors[i * 3] = 1
      colors[i * 3 + 1] = 1
      colors[i * 3 + 2] = 1
      sizes[i] = stars[i].size
    }

    return { positions, colors, sizes }
  }, [stars])

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={stars.length}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={stars.length}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={stars.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
}

function AutoRotateCamera() {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const autoRotateRef = useRef(true)

  useFrame((_, delta) => {
    if (autoRotateRef.current && controlsRef.current) {
      const spherical = new THREE.Spherical()
      spherical.setFromVector3(camera.position)
      spherical.theta += 0.5 * (Math.PI / 180) * delta
      camera.position.setFromSpherical(spherical)
      camera.lookAt(0, 0, 0)
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={50}
      maxDistance={500}
      onStart={() => { autoRotateRef.current = false }}
      onEnd={() => { autoRotateRef.current = true }}
    />
  )
}

function Scene({
  ships,
  enemy,
  lasers,
  selectedShipId,
  onShipClick,
  onSceneClick,
  onSceneContextMenu,
}: {
  ships: Ship[]
  enemy: Enemy | null
  lasers: Laser[]
  selectedShipId: string | null
  onShipClick: (shipId: string) => void
  onSceneClick: (point: THREE.Vector3) => void
  onSceneContextMenu: (point: THREE.Vector3) => void
}) {
  const handleClick = useCallback((e: any) => {
    if (e.object === e.eventObject) {
      onSceneClick(e.point)
    }
  }, [onSceneClick])

  const handleContextMenu = useCallback((e: any) => {
    e.preventDefault()
    if (e.object === e.eventObject) {
      onSceneContextMenu(e.point)
    }
  }, [onSceneContextMenu])

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[100, 100, 50]} intensity={1} castShadow />
      <directionalLight position={[-50, -50, -50]} intensity={0.3} />

      <Stars />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -100, 0]}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <planeGeometry args={[2000, 2000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {ships.map((ship) => (
        <ShipModel
          key={ship.id}
          ship={ship}
          onClick={() => onShipClick(ship.id)}
        />
      ))}

      {enemy && <EnemyModel enemy={enemy} />}

      {lasers.map((laser) => (
        <LaserModel key={laser.id} laser={laser} />
      ))}

      <AutoRotateCamera />
    </>
  )
}

export default function App() {
  const [ships, setShips] = useState<Ship[]>([])
  const [enemy, setEnemy] = useState<Enemy | null>(null)
  const [lasers, setLasers] = useState<Laser[]>([])
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null)
  const [formationType, setFormationType] = useState<FormationType>(FormationType.TRIANGLE)
  const [totalShips] = useState(5)

  const shipsRef = useRef<Ship[]>([])
  const enemyRef = useRef<Enemy | null>(null)
  const lasersRef = useRef<Laser[]>([])
  const selectedShipIdRef = useRef<string | null>(null)
  const formationTypeRef = useRef<FormationType>(FormationType.TRIANGLE)
  const timeRef = useRef(0)

  useEffect(() => {
    const initialShips: Ship[] = []
    for (let i = 0; i < totalShips; i++) {
      const position = randomPositionInSphere(200)
      const color = SHIP_COLORS[i % SHIP_COLORS.length]
      const ship = createShip(position, color)
      initialShips.push(ship)
    }
    setShips(initialShips)
    shipsRef.current = initialShips

    const initialEnemy = spawnEnemy(0)
    setEnemy(initialEnemy)
    enemyRef.current = initialEnemy
  }, [totalShips])

  useEffect(() => {
    shipsRef.current = ships
  }, [ships])

  useEffect(() => {
    enemyRef.current = enemy
  }, [enemy])

  useEffect(() => {
    lasersRef.current = lasers
  }, [lasers])

  useEffect(() => {
    selectedShipIdRef.current = selectedShipId
  }, [selectedShipId])

  useEffect(() => {
    formationTypeRef.current = formationType
  }, [formationType])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key
      if (key >= '1' && key <= '4') {
        const types: FormationType[] = [
          FormationType.DIAMOND,
          FormationType.V_SHAPE,
          FormationType.COLUMN,
          FormationType.CIRCLE,
        ]
        const index = parseInt(key) - 1
        const newType = types[index]
        setFormationType(newType)

        const currentShips = shipsRef.current
        const leaderId = selectedShipIdRef.current || currentShips[0]?.id
        const leader = currentShips.find(s => s.id === leaderId)

        if (leader && currentShips.length > 1) {
          const positions = formationPositions(newType, currentShips.length, leader.position)
          const targetColor = FORMATION_COLORS[newType]

          const newShips = currentShips.map((ship, idx) => {
            const targetPos = positions[idx]
            const path = generateBezierPath(ship.position, targetPos, { min: 10, max: 30 })
            moveShipWithBezier(ship, targetPos, path, 2)
            setShipColorTransition(ship, targetColor, 1.5)
            return { ...ship }
          })

          setShips(newShips)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const contextMenuHandler = (e: MouseEvent) => {
      e.preventDefault()
    }
    document.addEventListener('contextmenu', contextMenuHandler)
    return () => document.removeEventListener('contextmenu', contextMenuHandler)
  }, [])

  const handleShipClick = useCallback((shipId: string) => {
    const newShips = shipsRef.current.map((ship) => ({
      ...ship,
      isSelected: ship.id === shipId,
    }))
    setShips(newShips)
    setSelectedShipId(shipId)
  }, [])

  const handleSceneClick = useCallback((point: THREE.Vector3) => {
    const selectedId = selectedShipIdRef.current
    if (!selectedId) return

    const newShips = shipsRef.current.map((ship) => {
      if (ship.id === selectedId) {
        moveShip(ship, point)
      }
      return { ...ship }
    })
    setShips(newShips)
  }, [])

  const handleSceneContextMenu = useCallback((point: THREE.Vector3) => {
    const selectedId = selectedShipIdRef.current
    if (!selectedId) return

    const currentShips = shipsRef.current
    const positions = formationPositions(FormationType.TRIANGLE, currentShips.length, point)

    const newShips = currentShips.map((ship, idx) => {
      if (ship.id === selectedId) {
        moveShip(ship, point)
      } else {
        const targetPos = positions[idx]
        setShipFormationPosition(ship, targetPos)
      }
      return { ...ship }
    })

    setShips(newShips)
    setFormationType(FormationType.TRIANGLE)
  }, [])

  useFrame((_, delta) => {
    timeRef.current += delta
    const currentTime = timeRef.current

    let shipsChanged = false
    const currentShips = shipsRef.current
    const newLasers: Laser[] = [...lasersRef.current]

    const attackingShips = currentShips.filter((ship) => {
      const currentEnemy = enemyRef.current
      if (!currentEnemy || currentEnemy.isExploding) return false
      return distance(ship.position, currentEnemy.position) < 50
    })

    const canAttack = attackingShips.length >= 2

    for (let i = 0; i < currentShips.length; i++) {
      const ship = currentShips[i]
      const result = updateShip(ship, delta, currentTime, canAttack ? enemyRef.current : null)

      if (result.shouldFireLaser && result.laserTarget) {
        const laser: Laser = {
          id: `${ship.id}-${Date.now()}-${Math.random()}`,
          start: getShipFrontPosition(ship),
          end: result.laserTarget.clone(),
          life: 0.2,
        }
        newLasers.push(laser)

        if (enemyRef.current) {
          damageEnemy(enemyRef.current, 5)
        }
      }

      shipsChanged = true
    }

    const aliveLasers = newLasers.filter((laser) => {
      laser.life -= delta
      return laser.life > 0
    })

    if (lasersRef.current.length !== aliveLasers.length || lasersRef.current.some((l, i) => l.id !== aliveLasers[i]?.id)) {
      setLasers(aliveLasers)
    }

    const currentEnemy = enemyRef.current
    if (currentEnemy) {
      const result = updateEnemy(currentEnemy, delta, currentTime)
      if (result.shouldRespawn) {
        const newEnemy = spawnEnemy(currentTime)
        setEnemy(newEnemy)
        enemyRef.current = newEnemy
      } else {
        setEnemy({ ...currentEnemy })
      }
    }

    if (shipsChanged) {
      setShips([...currentShips])
    }
  })

  const selectedShipCount = selectedShipId ? 1 : 0
  const aliveShipCount = ships.filter(s => s.hp > 0).length

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a1a' }}>
      <Canvas
        camera={{ position: [150, 150, 150], fov: 60, near: 0.1, far: 2000 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0a1a')
        }}
      >
        <Scene
          ships={ships}
          enemy={enemy}
          lasers={lasers}
          selectedShipId={selectedShipId}
          onShipClick={handleShipClick}
          onSceneClick={handleSceneClick}
          onSceneContextMenu={handleSceneContextMenu}
        />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: 'white',
          fontSize: '14px',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          textShadow: '0 0 10px rgba(0,0,0,0.8)',
        }}
      >
        <div>舰船总数: {totalShips}</div>
        <div>当前存活: {aliveShipCount}</div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          width: '280px',
          height: '200px',
          borderRadius: '12px',
          background: 'rgba(26, 26, 46, 0.8)',
          padding: '20px',
          boxSizing: 'border-box',
          color: '#c8d6e5',
          fontSize: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ marginBottom: '15px', fontSize: '18px', fontWeight: 'bold', color: '#00ffff' }}>
          编队信息
        </div>
        <div style={{ marginBottom: '10px' }}>
          当前阵型: {FORMATION_NAMES[formationType]}
        </div>
        <div style={{ marginBottom: '10px' }}>
          选中舰船: {selectedShipCount}
        </div>
        <div style={{ fontSize: '12px', color: '#8395a7', marginTop: '20px' }}>
          <div>操作说明:</div>
          <div>• 点击舰船选中</div>
          <div>• 左键点击移动选中舰</div>
          <div>• 右键点击编队移动</div>
          <div>• 数字键1-4切换阵型</div>
        </div>
      </div>

      {enemy && !enemy.isExploding && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            color: 'white',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: '0 0 10px rgba(0,0,0,0.8)',
          }}
        >
          <div style={{ color: '#ff6b6b' }}>敌方目标</div>
          <div>HP: {enemy.hp}/{enemy.maxHp}</div>
          <div style={{ width: '150px', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', marginTop: '5px' }}>
            <div
              style={{
                width: `${(enemy.hp / enemy.maxHp) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ff6b6b, #ff0000)',
                borderRadius: '4px',
                transition: 'width 0.2s',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

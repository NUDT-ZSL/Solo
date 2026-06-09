import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { TerrainData, CellData } from './terrainGenerator'

interface TerrainViewProps {
  terrainData: TerrainData
  highlightedCellId: number | null
  onCellClick: (cell: CellData) => void
  zoomLevel: number
  onZoomChange: (zoom: number) => void
}

const AnimatedLights: React.FC = () => {
  const warmLightRef = useRef<THREE.PointLight>(null)
  const coolLightRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const period = 12
    const angle = (t / period) * Math.PI * 2
    const radius = 25

    if (warmLightRef.current) {
      warmLightRef.current.position.set(
        Math.cos(angle) * radius,
        15 + Math.sin(t * 0.5) * 3,
        Math.sin(angle) * radius
      )
    }
    if (coolLightRef.current) {
      coolLightRef.current.position.set(
        Math.cos(angle + Math.PI) * radius,
        12 + Math.cos(t * 0.7) * 3,
        Math.sin(angle + Math.PI) * radius
      )
    }
  })

  return (
    <>
      <ambientLight intensity={0.55} color="#A0AEC0" />
      <hemisphereLight args={['#B8D4E8', '#2D3748', 0.6]} />
      <directionalLight
        position={[15, 35, 15]}
        intensity={0.7}
        color="#FFFFFF"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight
        ref={warmLightRef}
        color="#FFE0B2"
        intensity={1.8}
        distance={80}
        decay={1.8}
      />
      <pointLight
        ref={coolLightRef}
        color="#81D4FA"
        intensity={1.5}
        distance={80}
        decay={1.8}
      />
    </>
  )
}

interface TerrainMeshProps {
  terrainData: TerrainData
  highlightedCellId: number | null
  onCellClick: (cell: CellData) => void
}

const TerrainMesh: React.FC<TerrainMeshProps> = ({
  terrainData,
  highlightedCellId,
  onCellClick,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)
  const [highlightTimer, setHighlightTimer] = useState<number>(0)

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const v = terrainData.vertices
    const scale = 1.0
    const scaledVertices = new Float32Array(v.length)
    for (let i = 0; i < v.length; i += 3) {
      scaledVertices[i] = v[i] * scale
      scaledVertices[i + 1] = v[i + 1] * scale + 0.2
      scaledVertices[i + 2] = v[i + 2] * scale
    }
    geo.setAttribute('position', new THREE.BufferAttribute(scaledVertices, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(terrainData.colors, 3))
    geo.setIndex(new THREE.BufferAttribute(terrainData.indices, 1))
    geo.computeVertexNormals()
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const box = new THREE.Box3().setFromBufferAttribute(posAttr)
    console.log('Terrain Bounds:', box.min.toArray(), box.max.toArray(),
      'Triangles:', terrainData.indices.length / 3,
      'Vertices:', posAttr.count)
    return geo
  }, [terrainData])

  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(geometry, 15)
  }, [geometry])

  const stomataMeshes = useMemo(() => {
    return terrainData.cells
      .filter((c) => c.hasStomata && c.stomataPosition && c.stomataRadius)
      .map((cell) => {
        const pos = cell.stomataPosition!
        const r = cell.stomataRadius!
        return {
          cellId: cell.id,
          position: [pos[0], pos[2], -pos[1]] as [number, number, number],
          baseRadius: r,
        }
      })
  }, [terrainData])

  const StomataPulses: React.FC = () => {
    const pulseRefs = useRef<(THREE.Mesh | null)[]>([])

    useFrame(({ clock }) => {
      const t = clock.getElapsedTime()
      const period = 2
      pulseRefs.current.forEach((ref, idx) => {
        if (ref && stomataMeshes[idx]) {
          const base = stomataMeshes[idx].baseRadius * 0.5
          const scale = 1 + 1 * Math.sin((t + idx * 0.3) * (Math.PI * 2) / period)
          const s = base * (1 + scale) / 2
          const clamped = Math.max(base * 0.5, Math.min(base * 1.5, s))
          ref.scale.set(clamped, 0.8, clamped)
          const mat = ref.material as THREE.MeshBasicMaterial
          mat.opacity = 0.3 + 0.4 * ((scale + 1) / 2)
        }
      })
    })

    return (
      <>
        {stomataMeshes.map((s, idx) => (
          <mesh
            key={`stomata-${s.cellId}`}
            ref={(el) => {
              pulseRefs.current[idx] = el
            }}
            position={s.position}
          >
            <sphereGeometry args={[1, 16, 12]} />
            <meshBasicMaterial
              color="#FF8A65"
              transparent
              opacity={0.5}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </>
    )
  }

  useFrame((_, delta) => {
    if (highlightedCellId !== null) {
      setHighlightTimer((prev) => prev + delta)
      if (highlightTimer >= 1.5) {
        setHighlightTimer(0)
      }
    } else {
      setHighlightTimer(0)
    }
  })

  const handlePointerDown = useCallback(
    (event: any) => {
      event.stopPropagation()
      const face = event.face
      if (!face) return
      const triIndex = face.materialIndex !== undefined ? face.materialIndex : (event as any).faceIndex
      if (triIndex === undefined) return

      const cellId = terrainData.cellIdMap.get(triIndex)
      if (cellId !== undefined) {
        const cell = terrainData.cells.find((c) => c.id === cellId)
        if (cell) {
          onCellClick(cell)
        }
      }
    },
    [terrainData, onCellClick]
  )

  const edgeHighlightIntensity = highlightedCellId !== null && highlightTimer < 1.5
    ? 0.5 + 0.5 * Math.sin((highlightTimer / 1.5) * Math.PI * 4)
    : 0

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerDown={handlePointerDown}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.9}
          metalness={0.15}
          roughness={0.45}
          emissive={new THREE.Color(0x0a1a0a)}
          emissiveIntensity={0.08}
          side={THREE.DoubleSide}
          depthWrite={true}
          flatShading={false}
        />
      </mesh>

      <lineSegments ref={edgesRef} geometry={edgesGeometry}>
        <lineBasicMaterial
          color="#64B5F6"
          transparent
          opacity={0.15 + edgeHighlightIntensity * 0.2}
          depthWrite={false}
        />
      </lineSegments>

      <StomataPulses />
    </group>
  )
}

interface CameraControllerProps {
  zoomLevel: number
  onZoomChange: (z: number) => void
}

const CameraController: React.FC<CameraControllerProps> = ({ zoomLevel, onZoomChange }) => {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const targetZoom = useRef(zoomLevel)
  const currentZoom = useRef(zoomLevel)

  useEffect(() => {
    targetZoom.current = zoomLevel
  }, [zoomLevel])

  useFrame((_, delta) => {
    if (controlsRef.current) {
      const smoothSpeed = 1 - Math.pow(0.001, delta)
      currentZoom.current += (targetZoom.current - currentZoom.current) * smoothSpeed
      const distance = 50 / currentZoom.current
      const spherical = new THREE.Spherical()
      spherical.setFromVector3(camera.position)
      spherical.radius = THREE.MathUtils.lerp(spherical.radius, distance, smoothSpeed)
      camera.position.setFromSpherical(spherical)
      onZoomChange(currentZoom.current)
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      rotateSpeed={0.7}
      zoomSpeed={0.7}
      panSpeed={0.6}
      minDistance={12}
      maxDistance={120}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2 - 0.05}
      dampingFactor={0.06}
      enableDamping={true}
      makeDefault
      target={[0, 0.5, 0]}
    />
  )
}

const ScanlineOverlay: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera, viewport, size } = useThree()

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = clock.getElapsedTime()
      const aspect = size.width / Math.max(1, size.height)
      const dist = camera.position.length()
      const vFov = (camera.fov * Math.PI) / 180
      const h = 2 * Math.tan(vFov / 2) * dist
      const w = h * aspect
      meshRef.current.scale.set(w * 1.02, h * 1.02, 1)
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      meshRef.current.position.copy(camera.position).add(dir.clone().multiplyScalar(dist * 0.95))
      meshRef.current.lookAt(camera.position)
    }
  })

  const scanlineMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          float y = vUv.y * 1200.0;
          float line = fract(y);
          float scan = smoothstep(0.0, 0.15, line) * (1.0 - smoothstep(0.85, 1.0, line));
          float slow = sin(vUv.y * 60.0 + uTime * 0.3) * 0.5 + 0.5;
          vec3 col = mix(vec3(0.25, 0.5, 0.9), vec3(0.35, 0.6, 1.0), slow);
          gl_FragColor = vec4(col * scan * 0.04, scan * 0.04);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
  }, [])

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={999}>
      <planeGeometry args={[1, 1]} />
      <primitive object={scanlineMaterial} attach="material" />
    </mesh>
  )
}

const DebugAxes: React.FC = () => {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) {
      // 可选: 轻微旋转
    }
  })
  return (
    <group ref={ref} position={[0, 0, 0]}>
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#FF6B6B" />
      </mesh>
      <mesh position={[10, 0.5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#FFD93D" />
      </mesh>
      <mesh position={[-10, 0.5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#6BCB77" />
      </mesh>
      <mesh position={[0, 0.5, 10]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#4D96FF" />
      </mesh>
      <mesh position={[0, 0.5, -10]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#C780FA" />
      </mesh>
      <gridHelper args={[60, 30, 0x334455, 0x223344]} position={[0, -0.5, 0]} />
    </group>
  )
}

const Scene: React.FC<TerrainViewProps> = ({
  terrainData,
  highlightedCellId,
  onCellClick,
  zoomLevel,
  onZoomChange,
}) => {
  return (
    <>
      <AnimatedLights />
      <fog attach="fog" args={['#0B0C10', 80, 160]} />
      <DebugAxes />
      <TerrainMesh
        terrainData={terrainData}
        highlightedCellId={highlightedCellId}
        onCellClick={onCellClick}
      />
      <CameraController zoomLevel={zoomLevel} onZoomChange={onZoomChange} />
    </>
  )
}

const TerrainView: React.FC<TerrainViewProps> = (props) => {
  return (
    <Canvas
      shadows
      camera={{ position: [30, 40, 30], fov: 55, near: 0.5, far: 500 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
      onCreated={({ gl, scene, camera }) => {
        gl.setClearColor(0x000000, 0)
        scene.background = null
        camera.lookAt(0, 0.5, 0)
      }}
    >
      <Scene {...props} />
    </Canvas>
  )
}

export default TerrainView

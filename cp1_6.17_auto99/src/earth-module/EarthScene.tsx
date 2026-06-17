import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { getDataForYear, lons, lats, LON_COUNT, LAT_COUNT } from './DataLoader'
import { useClimateStore } from '@/store/useClimateStore'

const EARTH_RADIUS = 5
const BAR_RADIUS = 0.08
const MIN_HEIGHT = 0
const MAX_HEIGHT = 3
const MIN_ANOMALY = -2
const MAX_ANOMALY = 2
const TOTAL_POINTS = LON_COUNT * LAT_COUNT

const BLUE = new THREE.Color('#0077B6')
const RED = new THREE.Color('#D62828')
const tmpColor = new THREE.Color()
const tmpMatrix = new THREE.Matrix4()
const tmpPosition = new THREE.Vector3()
const tmpQuaternion = new THREE.Quaternion()
const tmpScale = new THREE.Vector3()
const tmpEmissive = new THREE.Color()

const barVertexShader = `
  varying vec3 vColor;
  varying float vGradientY;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vColor = instanceColor;
    vGradientY = position.y;

    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const barFragmentShader = `
  uniform vec3 uLightDir;
  uniform vec3 uLightDir2;
  uniform vec3 uCameraPos;

  varying vec3 vColor;
  varying float vGradientY;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    float gradient = 0.55 + 0.45 * vGradientY;

    vec3 n = normalize(vWorldNormal);
    float diff1 = max(dot(n, normalize(uLightDir)), 0.0) * 0.55;
    float diff2 = max(dot(n, normalize(uLightDir2)), 0.0) * 0.25;
    float ambient = 0.35;
    float lighting = ambient + diff1 + diff2;

    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

    vec3 color = vColor * gradient * lighting;
    color += fresnel * 0.2 * vColor * gradient;
    color += vec3(0.06 * vGradientY);

    gl_FragColor = vec4(color, 0.9);
  }
`

function anomalyToHeight(anomaly: number): number {
  const t = (anomaly - MIN_ANOMALY) / (MAX_ANOMALY - MIN_ANOMALY)
  return MIN_HEIGHT + Math.max(0, Math.min(1, t)) * MAX_HEIGHT
}

function anomalyToColor(anomaly: number): THREE.Color {
  const t = (anomaly - MIN_ANOMALY) / (MAX_ANOMALY - MIN_ANOMALY)
  const clamped = Math.max(0, Math.min(1, t))
  tmpColor.copy(BLUE).lerp(RED, clamped)
  return tmpColor.clone()
}

function latLonToPosition(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

function Graticule() {
  const linePoints = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < 24; i++) {
      const lon = -180 + (360 / 24) * i
      for (let lat = -90; lat <= 90; lat += 2) {
        points.push(latLonToPosition(lat, lon, EARTH_RADIUS + 0.01))
      }
      points.push(latLonToPosition(90, lon, EARTH_RADIUS + 0.01))
      points.push(new THREE.Vector3(NaN, NaN, NaN))
    }
    for (let i = 0; i < 12; i++) {
      const lat = -90 + (180 / 12) * i + 180 / 12 / 2
      for (let lon = -180; lon <= 180; lon += 2) {
        points.push(latLonToPosition(lat, lon, EARTH_RADIUS + 0.01))
      }
      points.push(latLonToPosition(lat, 180, EARTH_RADIUS + 0.01))
      points.push(new THREE.Vector3(NaN, NaN, NaN))
    }
    return points
  }, [])

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={linePoints.length}
          array={new Float32Array(linePoints.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#B0B0B0" transparent opacity={0.3} />
    </lineSegments>
  )
}

function TemperatureBars() {
  const barMeshRef = useRef<THREE.InstancedMesh>(null!)
  const topMeshRef = useRef<THREE.InstancedMesh>(null!)
  const glowMeshRef = useRef<THREE.InstancedMesh>(null!)
  const currentYear = useClimateStore((s) => s.currentYear)
  const prevHeights = useRef<Float32Array>(new Float32Array(TOTAL_POINTS).fill(0))
  const targetHeights = useRef<Float32Array>(new Float32Array(TOTAL_POINTS).fill(0))

  const positions = useMemo(() => {
    const pos: THREE.Vector3[] = []
    for (const lat of lats) {
      for (const lon of lons) {
        pos.push(latLonToPosition(lat, lon, EARTH_RADIUS))
      }
    }
    return pos
  }, [])

  const normals = useMemo(() => {
    return positions.map((p) => p.clone().normalize())
  }, [positions])

  const barGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(BAR_RADIUS, BAR_RADIUS, 1, 8)
    geo.translate(0, 0.5, 0)
    return geo
  }, [])

  const sphereGeometry = useMemo(() => {
    return new THREE.SphereGeometry(BAR_RADIUS * 1.8, 10, 8)
  }, [])

  const glowGeometry = useMemo(() => {
    return new THREE.SphereGeometry(BAR_RADIUS * 4.5, 10, 8)
  }, [])

  const barMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      uniforms: {
        uLightDir: { value: new THREE.Vector3(1, 1, 0.5).normalize() },
        uLightDir2: { value: new THREE.Vector3(-0.5, -0.3, -1).normalize() },
        uCameraPos: { value: new THREE.Vector3(0, 0, 15) },
      },
      vertexShader: barVertexShader,
      fragmentShader: barFragmentShader,
    })
  }, [])

  useEffect(() => {
    if (!barMeshRef.current || !topMeshRef.current || !glowMeshRef.current) return
    const data = getDataForYear(currentYear)
    for (let i = 0; i < TOTAL_POINTS; i++) {
      const color = anomalyToColor(data[i].anomaly)
      barMeshRef.current.setColorAt(i, color)
      topMeshRef.current.setColorAt(i, color)
      const glowColor = anomalyToColor(data[i].anomaly)
      glowColor.multiplyScalar(1.5)
      glowMeshRef.current.setColorAt(i, glowColor)
    }
    if (barMeshRef.current.instanceColor) barMeshRef.current.instanceColor.needsUpdate = true
    if (topMeshRef.current.instanceColor) topMeshRef.current.instanceColor.needsUpdate = true
    if (glowMeshRef.current.instanceColor) glowMeshRef.current.instanceColor.needsUpdate = true
  }, [])

  useEffect(() => {
    const data = getDataForYear(currentYear)
    for (let i = 0; i < TOTAL_POINTS; i++) {
      targetHeights.current[i] = anomalyToHeight(data[i].anomaly)
    }
  }, [currentYear])

  useFrame(({ camera }) => {
    if (!barMeshRef.current || !topMeshRef.current || !glowMeshRef.current) return
    const lerpFactor = 1 - Math.pow(0.001, 0.016)

    barMaterial.uniforms.uCameraPos.value.copy(camera.position)

    for (let i = 0; i < TOTAL_POINTS; i++) {
      const prev = prevHeights.current[i]
      const target = targetHeights.current[i]
      const h = prev + (target - prev) * lerpFactor
      prevHeights.current[i] = h

      const pos = positions[i]
      const norm = normals[i]
      const height = Math.max(0.01, h)

      tmpPosition.copy(pos)
      tmpQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm)
      tmpScale.set(1, height, 1)
      tmpMatrix.compose(tmpPosition, tmpQuaternion, tmpScale)
      barMeshRef.current.setMatrixAt(i, tmpMatrix)

      const topPos = pos.clone().add(norm.clone().multiplyScalar(height))
      tmpPosition.copy(topPos)
      tmpScale.set(1, 1, 1)
      tmpMatrix.compose(tmpPosition, tmpQuaternion, tmpScale)
      topMeshRef.current.setMatrixAt(i, tmpMatrix)
      glowMeshRef.current.setMatrixAt(i, tmpMatrix)

      const data = getDataForYear(currentYear)
      const color = anomalyToColor(data[i].anomaly)
      barMeshRef.current.setColorAt(i, color)

      tmpEmissive.copy(color).multiplyScalar(1.3)
      topMeshRef.current.setColorAt(i, tmpEmissive)

      const glowColor = color.clone().multiplyScalar(1.6)
      glowMeshRef.current.setColorAt(i, glowColor)
    }

    barMeshRef.current.instanceMatrix.needsUpdate = true
    topMeshRef.current.instanceMatrix.needsUpdate = true
    glowMeshRef.current.instanceMatrix.needsUpdate = true
    if (barMeshRef.current.instanceColor) barMeshRef.current.instanceColor.needsUpdate = true
    if (topMeshRef.current.instanceColor) topMeshRef.current.instanceColor.needsUpdate = true
    if (glowMeshRef.current.instanceColor) glowMeshRef.current.instanceColor.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={barMeshRef} args={[barGeometry, barMaterial, TOTAL_POINTS]} />
      <instancedMesh ref={topMeshRef} args={[sphereGeometry, undefined, TOTAL_POINTS]}>
        <meshStandardMaterial
          transparent
          opacity={0.95}
          metalness={0.35}
          roughness={0.35}
          emissive="#ffffff"
          emissiveIntensity={0.45}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={glowMeshRef} args={[glowGeometry, undefined, TOTAL_POINTS]}>
        <meshBasicMaterial
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  )
}

function CameraController() {
  const controlsRef = useRef<any>(null)
  const resetCamera = useClimateStore((s) => s.resetCamera)
  const cameraPosition = useClimateStore((s) => s.cameraPosition)
  const setCameraPosition = useClimateStore((s) => s.setCameraPosition)
  const setHoveredCoords = useClimateStore((s) => s.setHoveredCoords)
  const { camera } = useThree()
  const prevResetRef = useRef(cameraPosition)

  useFrame(() => {
    if (controlsRef.current) {
      const az = controlsRef.current.getAzimuthalAngle()
      const po = controlsRef.current.getPolarAngle()
      const dist = camera.position.length()
      setCameraPosition({
        lon: (az * 180) / Math.PI,
        lat: 90 - (po * 180) / Math.PI,
        distance: dist,
      })
      setHoveredCoords({
        lon: Math.round(((az * 180) / Math.PI) * 10) / 10,
        lat: Math.round((90 - (po * 180) / Math.PI) * 10) / 10,
      })
    }
  })

  useEffect(() => {
    if (
      cameraPosition.lon === 0 &&
      cameraPosition.lat === 0 &&
      cameraPosition.distance === 15 &&
      prevResetRef.current !== cameraPosition
    ) {
      if (controlsRef.current) {
        controlsRef.current.reset()
      }
    }
    prevResetRef.current = cameraPosition
  }, [cameraPosition, resetCamera])

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={7}
      maxDistance={30}
      rotateSpeed={0.5}
    />
  )
}

export default function EarthScene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-10, -5, -10]} intensity={0.3} />
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 32, 24]} />
        <meshStandardMaterial
          color="#0A1628"
          transparent
          opacity={0.95}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <Graticule />
      <TemperatureBars />
      <CameraController />
    </>
  )
}

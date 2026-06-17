import { useRef, useMemo, useEffect, useCallback } from 'react'
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

const barVertexShader = `
  varying float vY;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vBarColor;

  void main() {
    vY = position.y;
    vNormal = normal;
    vBarColor = instanceColor;

    vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const barFragmentShader = `
  uniform vec3 uCameraPos;
  uniform vec3 uLightDir1;
  uniform vec3 uLightDir2;

  varying float vY;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vBarColor;

  void main() {
    float gradient = 0.6 + 0.4 * vY;

    vec3 n = normalize(vNormal);
    float lambert1 = max(dot(n, normalize(uLightDir1)), 0.0) * 0.5;
    float lambert2 = max(dot(n, normalize(uLightDir2)), 0.0) * 0.2;
    float ambient = 0.35;
    float lighting = ambient + lambert1 + lambert2;

    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

    vec3 baseColor = vBarColor * gradient;
    vec3 litColor = baseColor * lighting;
    litColor += fresnel * vBarColor * 0.25;
    litColor += vBarColor * 0.08 * vY;

    float metallicGloss = pow(max(dot(reflect(-viewDir, n), normalize(uLightDir1)), 0.0), 32.0);
    litColor += vec3(metallicGloss * 0.15);

    gl_FragColor = vec4(litColor, 0.92);
  }
`

function createGlowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.5)')
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)')
  gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.03)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function anomalyToHeight(anomaly: number): number {
  const t = (anomaly - MIN_ANOMALY) / (MAX_ANOMALY - MIN_ANOMALY)
  return MIN_HEIGHT + Math.max(0, Math.min(1, t)) * MAX_HEIGHT
}

function anomalyToColor(anomaly: number): THREE.Color {
  const t = (anomaly - MIN_ANOMALY) / (MAX_ANOMALY - MIN_ANOMALY)
  const clamped = Math.max(0, Math.min(1, t))
  return tmpColor.copy(BLUE).lerp(RED, clamped).clone()
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
  const glowSpritesRef = useRef<THREE.Group>(null!)
  const currentYear = useClimateStore((s) => s.currentYear)

  const prevHeights = useRef<Float32Array>(new Float32Array(TOTAL_POINTS).fill(0))
  const targetHeights = useRef<Float32Array>(new Float32Array(TOTAL_POINTS).fill(0))
  const glowSprites = useRef<THREE.Sprite[]>([])
  const glowTexture = useMemo(() => createGlowTexture(), [])

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

  const barMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      uniforms: {
        uCameraPos: { value: new THREE.Vector3(0, 0, 15) },
        uLightDir1: { value: new THREE.Vector3(1, 1, 0.5).normalize() },
        uLightDir2: { value: new THREE.Vector3(-0.5, -0.3, -1).normalize() },
      },
      vertexShader: barVertexShader,
      fragmentShader: barFragmentShader,
    })
  }, [])

  const initGlowSprites = useCallback(() => {
    if (!glowSpritesRef.current) return
    glowSprites.current.forEach((s) => s.removeFromParent())
    glowSprites.current = []

    for (let i = 0; i < TOTAL_POINTS; i++) {
      const spriteMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
      const sprite = new THREE.Sprite(spriteMaterial)
      sprite.scale.set(1.2, 1.2, 1.2)
      sprite.userData = { baseColor: new THREE.Color(0xffffff), index: i }
      glowSprites.current.push(sprite)
      glowSpritesRef.current.add(sprite)
    }
  }, [glowTexture])

  useEffect(() => {
    if (!barMeshRef.current || !topMeshRef.current) return
    const data = getDataForYear(currentYear)
    for (let i = 0; i < TOTAL_POINTS; i++) {
      const color = anomalyToColor(data[i].anomaly)
      barMeshRef.current.setColorAt(i, color)
      tmpColor.copy(color).multiplyScalar(1.4)
      topMeshRef.current.setColorAt(i, tmpColor)
    }
    if (barMeshRef.current.instanceColor) barMeshRef.current.instanceColor.needsUpdate = true
    if (topMeshRef.current.instanceColor) topMeshRef.current.instanceColor.needsUpdate = true
  }, [])

  useEffect(() => {
    const data = getDataForYear(currentYear)
    for (let i = 0; i < TOTAL_POINTS; i++) {
      targetHeights.current[i] = anomalyToHeight(data[i].anomaly)
    }
  }, [currentYear])

  useFrame(({ camera }) => {
    if (!barMeshRef.current || !topMeshRef.current || !glowSpritesRef.current) return

    if (glowSprites.current.length === 0) {
      initGlowSprites()
      return
    }

    const lerpFactor = 1 - Math.pow(0.001, 0.016)
    barMaterial.uniforms.uCameraPos.value.copy(camera.position)

    const data = getDataForYear(currentYear)

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

      const color = anomalyToColor(data[i].anomaly)
      barMeshRef.current.setColorAt(i, color)
      tmpColor.copy(color).multiplyScalar(1.4)
      topMeshRef.current.setColorAt(i, tmpColor)

      const sprite = glowSprites.current[i]
      if (sprite) {
        sprite.position.copy(topPos)
        const spriteMat = sprite.material as THREE.SpriteMaterial
        if (spriteMat.color) spriteMat.color.copy(color)
        const size = 0.8 + height * 0.3
        sprite.scale.set(size, size, size)
        spriteMat.opacity = Math.min(0.8, 0.3 + height * 0.25)
      }
    }

    barMeshRef.current.instanceMatrix.needsUpdate = true
    topMeshRef.current.instanceMatrix.needsUpdate = true
    if (barMeshRef.current.instanceColor) barMeshRef.current.instanceColor.needsUpdate = true
    if (topMeshRef.current.instanceColor) topMeshRef.current.instanceColor.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={barMeshRef} args={[barGeometry, barMaterial, TOTAL_POINTS]} />
      <instancedMesh ref={topMeshRef} args={[sphereGeometry, undefined, TOTAL_POINTS]}>
        <meshStandardMaterial
          transparent
          opacity={0.95}
          metalness={0.5}
          roughness={0.3}
          emissive="#ffffff"
          emissiveIntensity={0.55}
          toneMapped={false}
        />
      </instancedMesh>
      <group ref={glowSpritesRef} />
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
      <ambientLight intensity={0.45} />
      <directionalLight position={[10, 10, 5]} intensity={0.9} />
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

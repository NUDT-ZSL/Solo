import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { AuroraBandParams } from '../App'

const AURORA_BAND_COUNT = 6
const PARTICLES_PER_BAND = 200
const STAR_COUNT = 200
const RIPPLE_COUNT = 5
const RIPPLE_PARTICLES = 40
const RIPPLE_MAX_RADIUS = 8
const RIPPLE_DURATION = 1.0
const CURVE_SAMPLE_COUNT = 10

interface AuroraBandProps {
  index: number
  params: AuroraBandParams
  curve: THREE.CubicBezierCurve3
  bandColorRef: React.MutableRefObject<THREE.Color>
}

function hexToRgb(hex: string, out: THREE.Color): THREE.Color {
  return out.set(hex)
}

function bezierPoint(
  t: number,
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  out: THREE.Vector3
): THREE.Vector3 {
  const u = 1 - t
  const tt = t * t
  const uu = u * u
  const uuu = uu * u
  const ttt = tt * t
  out.set(
    uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
    uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z
  )
  return out
}

function AuroraBand({ index, params, curve, bandColorRef }: AuroraBandProps) {
  const pointsRef = useRef<THREE.Points>(null!)
  const geometryRef = useRef<THREE.BufferGeometry>(null!)
  const offsetsRef = useRef<Float32Array>(null!)
  const speedsRef = useRef<Float32Array>(null!)
  const phasesRef = useRef<Float32Array>(null!)
  const sizesRef = useRef<Float32Array>(null!)
  const tempVec = useMemo(() => new THREE.Vector3(), [])
  const tempColor = useMemo(() => new THREE.Color(), [])
  const greenColor = useMemo(() => new THREE.Color('#00ff87'), [])
  const purpleColor = useMemo(() => new THREE.Color('#6f00ff'), [])

  const initData = useCallback(
    (count: number, positionArr: Float32Array, colorArr: Float32Array) => {
      offsetsRef.current = new Float32Array(count)
      speedsRef.current = new Float32Array(count)
      phasesRef.current = new Float32Array(count)
      sizesRef.current = new Float32Array(count)
      for (let i = 0; i < count; i++) {
        offsetsRef.current[i] = Math.random()
        speedsRef.current[i] = 0.8 + Math.random() * 0.4
        phasesRef.current[i] = Math.random() * Math.PI * 2
        sizesRef.current[i] = 3 + Math.random() * 5
        positionArr[i * 3] = 0
        positionArr[i * 3 + 1] = 0
        positionArr[i * 3 + 2] = 0
        colorArr[i * 3] = 0
        colorArr[i * 3 + 1] = 1
        colorArr[i * 3 + 2] = 0.5
      }
    },
    []
  )

  useEffect(() => {
    hexToRgb(params.color, bandColorRef.current)
  }, [params.color, bandColorRef])

  useFrame((_, delta) => {
    const geo = geometryRef.current
    if (!geo) return
    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const colorAttr = geo.attributes.color as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array
    const colorArr = colorAttr.array as Float32Array

    if (!offsetsRef.current) {
      initData(PARTICLES_PER_BAND, posArr, colorArr)
    }

    const flowSpeed = params.flowSpeed
    const amplitude = params.amplitude
    const bandColor = bandColorRef.current
    const p0 = curve.v0
    const p1 = curve.v1
    const p2 = curve.v2
    const p3 = curve.v3

    for (let i = 0; i < PARTICLES_PER_BAND; i++) {
      let t = offsetsRef.current[i] + delta * flowSpeed * speedsRef.current[i] * 0.08
      if (t > 1) t -= 1
      offsetsRef.current[i] = t

      bezierPoint(t, p0, p1, p2, p3, tempVec)
      const phase = phasesRef.current[i]
      const waveT = t * Math.PI * 6 + phase
      tempVec.y += Math.sin(waveT) * amplitude * 0.3
      tempVec.x += Math.cos(waveT * 0.7) * amplitude * 0.15
      tempVec.z += Math.sin(waveT * 1.3) * amplitude * 0.1

      const i3 = i * 3
      posArr[i3] = tempVec.x
      posArr[i3 + 1] = tempVec.y
      posArr[i3 + 2] = tempVec.z

      tempColor.copy(greenColor).lerp(purpleColor, t).lerp(bandColor, 0.5)
      colorArr[i3] = tempColor.r
      colorArr[i3 + 1] = tempColor.g
      colorArr[i3 + 2] = tempColor.b
    }

    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} renderOrder={2}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLES_PER_BAND}
          array={new Float32Array(PARTICLES_PER_BAND * 3)}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLES_PER_BAND}
          array={new Float32Array(PARTICLES_PER_BAND * 3)}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={PARTICLES_PER_BAND}
          array={useMemo(() => {
            const arr = new Float32Array(PARTICLES_PER_BAND)
            for (let i = 0; i < PARTICLES_PER_BAND; i++) arr[i] = 3 + Math.random() * 5
            return arr
          }, [])}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        vertexShader={`
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            vec2 c = gl_PointCoord - vec2(0.5);
            float d = length(c);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(vColor, a * 0.9);
          }
        `}
      />
    </points>
  )
}

function StarField() {
  const pointsRef = useRef<THREE.Points>(null!)
  const geoRef = useRef<THREE.BufferGeometry>(null!)
  const twinkleSpeedsRef = useRef<Float32Array>(null!)
  const twinklePhasesRef = useRef<Float32Array>(null!)
  const baseOpacitiesRef = useRef<Float32Array>(null!)
  const timeRef = useRef(0)

  const { positionArr, sizeArr } = useMemo(() => {
    const p = new Float32Array(STAR_COUNT * 3)
    const s = new Float32Array(STAR_COUNT)
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1) * 0.6 + Math.PI * 0.15
      const r = 40 + Math.random() * 40
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      p[i * 3 + 1] = r * Math.cos(phi) * 0.5
      p[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      s[i] = 1 + Math.random() * 2
    }
    return { positionArr: p, sizeArr: s }
  }, [])

  useFrame((_, delta) => {
    timeRef.current += delta
    const geo = geoRef.current
    if (!geo) return
    const colorAttr = geo.attributes.color as THREE.BufferAttribute
    const colorArr = colorAttr.array as Float32Array

    if (!twinkleSpeedsRef.current) {
      twinkleSpeedsRef.current = new Float32Array(STAR_COUNT)
      twinklePhasesRef.current = new Float32Array(STAR_COUNT)
      baseOpacitiesRef.current = new Float32Array(STAR_COUNT)
      for (let i = 0; i < STAR_COUNT; i++) {
        twinkleSpeedsRef.current[i] = (2 + Math.random() * 3) / (2 * Math.PI)
        twinklePhasesRef.current[i] = Math.random() * Math.PI * 2
        baseOpacitiesRef.current[i] = 0.3 + Math.random() * 0.5
      }
    }

    for (let i = 0; i < STAR_COUNT; i++) {
      const t = timeRef.current * twinkleSpeedsRef.current[i] + twinklePhasesRef.current[i]
      const alpha = baseOpacitiesRef.current[i] * (0.6 + 0.4 * Math.sin(t))
      const i3 = i * 3
      colorArr[i3] = alpha
      colorArr[i3 + 1] = alpha
      colorArr[i3 + 2] = alpha
    }
    colorAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} renderOrder={1}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute
          attach="attributes-position"
          count={STAR_COUNT}
          array={positionArr}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={STAR_COUNT}
          array={new Float32Array(STAR_COUNT * 3).fill(0.8)}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={STAR_COUNT}
          array={sizeArr}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        vertexColors
        vertexShader={`
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            vec2 c = gl_PointCoord - vec2(0.5);
            float d = length(c);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(vColor, a);
          }
        `}
      />
    </points>
  )
}

interface RippleData {
  active: boolean
  life: number
  origin: THREE.Vector3
  color: THREE.Color
}

interface AuroraSceneProps {
  auroraParams: AuroraBandParams[]
}

export default function AuroraScene({ auroraParams }: AuroraSceneProps) {
  const { camera, gl, raycaster, pointer } = useThree()
  const [ripples, setRipples] = useState<RippleData[]>(() =>
    Array.from({ length: RIPPLE_COUNT }, () => ({
      active: false,
      life: 0,
      origin: new THREE.Vector3(),
      color: new THREE.Color('#ffffff'),
    }))
  )
  const ripplesRef = useRef(ripples)
  ripplesRef.current = ripples

  const ripplePointsRef = useRef<THREE.Points>(null!)
  const rippleGeoRef = useRef<THREE.BufferGeometry>(null!)
  const rippleAnglesRef = useRef<Float32Array>(null!)
  const rippleBandIdxRef = useRef<Float32Array>(null!)

  const bandColorsRef = useRef<THREE.Color[]>(
    Array.from({ length: AURORA_BAND_COUNT }, () => new THREE.Color())
  )

  const curves = useMemo<THREE.CubicBezierCurve3[]>(() => {
    const arr: THREE.CubicBezierCurve3[] = []
    for (let i = 0; i < AURORA_BAND_COUNT; i++) {
      const angle = (i / AURORA_BAND_COUNT) * Math.PI * 2
      const r = 6
      const yOffset = (i - 2.5) * 0.8
      const p0 = new THREE.Vector3(
        Math.cos(angle + 0.3) * r,
        yOffset - 2 + Math.sin(i) * 0.5,
        Math.sin(angle + 0.3) * r
      )
      const p3 = new THREE.Vector3(
        Math.cos(angle - 0.3 + Math.PI) * r,
        yOffset + 2 + Math.cos(i) * 0.5,
        Math.sin(angle - 0.3 + Math.PI) * r
      )
      const p1 = new THREE.Vector3(
        p0.x * 0.4 + (Math.random() - 0.5) * 3,
        yOffset + 3 + (Math.random() - 0.5) * 2,
        p0.z * 0.4 + (Math.random() - 0.5) * 3
      )
      const p2 = new THREE.Vector3(
        p3.x * 0.4 + (Math.random() - 0.5) * 3,
        yOffset + 3 + (Math.random() - 0.5) * 2,
        p3.z * 0.4 + (Math.random() - 0.5) * 3
      )
      arr.push(new THREE.CubicBezierCurve3(p0, p1, p2, p3))
    }
    return arr
  }, [])

  const curvesRef = useRef(curves)
  curvesRef.current = curves

  const computeRippleColor = useCallback((point: THREE.Vector3, out: THREE.Color) => {
    const weights = new Float32Array(AURORA_BAND_COUNT)
    let sumW = 0
    const temp = new THREE.Vector3()
    for (let bi = 0; bi < AURORA_BAND_COUNT; bi++) {
      const c = curvesRef.current[bi]
      let minDist = Infinity
      for (let s = 0; s <= CURVE_SAMPLE_COUNT; s++) {
        const t = s / CURVE_SAMPLE_COUNT
        bezierPoint(t, c.v0, c.v1, c.v2, c.v3, temp)
        const dx = temp.x - point.x
        const dy = temp.y - point.y
        const dz = temp.z - point.z
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 < minDist) minDist = d2
      }
      const w = 1 / (minDist + 1.0)
      weights[bi] = w
      sumW += w
    }
    out.setRGB(0, 0, 0)
    if (sumW < 1e-6) {
      out.set('#ffffff')
      return
    }
    for (let bi = 0; bi < AURORA_BAND_COUNT; bi++) {
      const w = weights[bi] / sumW
      const bc = bandColorsRef.current[bi]
      out.r += bc.r * w
      out.g += bc.g * w
      out.b += bc.b * w
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: any) => {
      e.stopPropagation()
      const nx = (e.clientX / gl.domElement.clientWidth) * 2 - 1
      const ny = -((e.clientY / gl.domElement.clientHeight) * 2 - 1)
      raycaster.setFromCamera({ x: nx, y: ny } as THREE.Vector2, camera)
      const dir = raycaster.ray.direction.clone()
      const origin = raycaster.ray.origin.clone()
      const t = 10
      const hitPoint = origin.add(dir.multiplyScalar(t))

      const pool = ripplesRef.current
      let targetIdx = -1
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          targetIdx = i
          break
        }
      }
      if (targetIdx < 0) {
        let minLife = Infinity
        for (let i = 0; i < pool.length; i++) {
          if (pool[i].life < minLife) {
            minLife = pool[i].life
            targetIdx = i
          }
        }
      }
      if (targetIdx >= 0) {
        const newPool = pool.slice()
        const color = new THREE.Color()
        computeRippleColor(hitPoint, color)
        newPool[targetIdx] = {
          active: true,
          life: RIPPLE_DURATION,
          origin: hitPoint.clone(),
          color,
        }
        setRipples(newPool)
      }
    },
    [camera, gl, raycaster, computeRippleColor]
  )

  useEffect(() => {
    gl.domElement.addEventListener('pointerdown', handlePointerDown)
    return () => {
      gl.domElement.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [gl, handlePointerDown])

  useFrame((_, delta) => {
    const geo = rippleGeoRef.current
    if (!geo) return
    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const colorAttr = geo.attributes.color as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array
    const colorArr = colorAttr.array as Float32Array
    const totalParticles = RIPPLE_COUNT * RIPPLE_PARTICLES

    if (!rippleAnglesRef.current) {
      rippleAnglesRef.current = new Float32Array(totalParticles)
      rippleBandIdxRef.current = new Float32Array(totalParticles)
      for (let i = 0; i < totalParticles; i++) {
        rippleAnglesRef.current[i] = (i % RIPPLE_PARTICLES) / RIPPLE_PARTICLES * Math.PI * 2
        rippleBandIdxRef.current[i] = Math.floor(i / RIPPLE_PARTICLES)
      }
    }

    let needsUpdate = false
    for (let ri = 0; ri < RIPPLE_COUNT; ri++) {
      const r = ripplesRef.current[ri]
      const base = ri * RIPPLE_PARTICLES
      if (r.active) {
        r.life -= delta
        if (r.life <= 0) {
          r.active = false
          r.life = 0
          for (let i = 0; i < RIPPLE_PARTICLES; i++) {
            const idx = (base + i) * 3
            posArr[idx] = 0
            posArr[idx + 1] = -1000
            posArr[idx + 2] = 0
            colorArr[idx] = 0
            colorArr[idx + 1] = 0
            colorArr[idx + 2] = 0
          }
        } else {
          const lifeRatio = r.life / RIPPLE_DURATION
          const radius = RIPPLE_MAX_RADIUS * (1 - lifeRatio)
          const alpha = lifeRatio
          for (let i = 0; i < RIPPLE_PARTICLES; i++) {
            const angle = rippleAnglesRef.current[base + i]
            const idx = (base + i) * 3
            posArr[idx] = r.origin.x + Math.cos(angle) * radius
            posArr[idx + 1] = r.origin.y + Math.sin(angle * 0.8) * radius * 0.3
            posArr[idx + 2] = r.origin.z + Math.sin(angle) * radius
            colorArr[idx] = r.color.r * alpha
            colorArr[idx + 1] = r.color.g * alpha
            colorArr[idx + 2] = r.color.b * alpha
          }
        }
        needsUpdate = true
      }
    }
    if (needsUpdate) {
      posAttr.needsUpdate = true
      colorAttr.needsUpdate = true
    }
  })

  return (
    <group>
      <mesh renderOrder={0}>
        <sphereGeometry args={[80, 32, 32]} />
        <meshBasicMaterial
          color="#0a0e27"
          side={THREE.BackSide}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>

      <StarField />

      {curves.map((curve, i) => (
        <AuroraBand
          key={i}
          index={i}
          params={auroraParams[i]}
          curve={curve}
          bandColorRef={{ current: bandColorsRef.current[i] } as React.MutableRefObject<THREE.Color>}
        />
      ))}

      <points ref={ripplePointsRef} renderOrder={3}>
        <bufferGeometry ref={rippleGeoRef}>
          <bufferAttribute
            attach="attributes-position"
            count={RIPPLE_COUNT * RIPPLE_PARTICLES}
            array={new Float32Array(RIPPLE_COUNT * RIPPLE_PARTICLES * 3)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={RIPPLE_COUNT * RIPPLE_PARTICLES}
            array={new Float32Array(RIPPLE_COUNT * RIPPLE_PARTICLES * 3)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={RIPPLE_COUNT * RIPPLE_PARTICLES}
            array={new Float32Array(RIPPLE_COUNT * RIPPLE_PARTICLES).fill(6)}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
          vertexShader={`
            attribute float size;
            varying vec3 vColor;
            void main() {
              vColor = color;
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * (300.0 / -mv.z);
              gl_Position = projectionMatrix * mv;
            }
          `}
          fragmentShader={`
            varying vec3 vColor;
            void main() {
              vec2 c = gl_PointCoord - vec2(0.5);
              float d = length(c);
              if (d > 0.5) discard;
              float a = smoothstep(0.5, 0.0, d);
              gl_FragColor = vec4(vColor, a);
            }
          `}
        />
      </points>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={5}
        maxDistance={30}
        minPolarAngle={Math.PI / 2 - (60 * Math.PI) / 180}
        maxPolarAngle={Math.PI / 2 - (-20 * Math.PI) / 180}
        minAzimuthAngle={0}
        maxAzimuthAngle={Math.PI * 2}
        enableDamping={true}
        dampingFactor={0.1}
      />
    </group>
  )
}

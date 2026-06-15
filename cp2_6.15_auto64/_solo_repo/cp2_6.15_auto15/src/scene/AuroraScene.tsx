import React, { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { ParticleSystem } from './ParticleSystem'

interface AuroraParams {
  intensity: number
  colorOffset: number
  windSpeed: number
}

interface AuroraSceneProps {
  params: AuroraParams
}

interface FlowDisturbance {
  offset: THREE.Vector3
  life: number
  maxLife: number
}

interface VertexDisturbance {
  flowOffset: THREE.Vector3
  colorMix: number
  targetColor: THREE.Color
  flowDisturbances: FlowDisturbance[]
}

interface Disturbance {
  position: THREE.Vector3
  radius: number
  maxRadius: number
  strength: number
  life: number
  maxLife: number
  color: THREE.Color
  direction: THREE.Vector3
}

interface StarData {
  position: THREE.Vector3
  size: number
  phase: number
  period: number
}

const AuroraScene: React.FC<AuroraSceneProps> = ({ params }) => {
  const { camera, gl, scene } = useThree()
  const particleSystemRef = useRef<ParticleSystem | null>(null)
  const auroraMeshesRef = useRef<THREE.Mesh[]>([])
  const disturbancesRef = useRef<Disturbance[]>([])
  const isDraggingRef = useRef(false)
  const lastMousePosRef = useRef(new THREE.Vector2())
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  const [, forceUpdate] = useState(0)

  const starsRef = useRef<StarData[]>([])
  const starGeometryRef = useRef<THREE.BufferGeometry | null>(null)
  const starMaterialRef = useRef<THREE.PointsMaterial | null>(null)
  const starPointsRef = useRef<THREE.Points | null>(null)

  const auroraRibbonCount = 5
  const vertexDisturbancesRef = useRef<Map<THREE.Mesh, VertexDisturbance[]>>(new Map())

  useMemo(() => {
    const stars: StarData[] = []
    for (let i = 0; i < 200; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1) * 0.6 + 0.1
      const radius = 80 + Math.random() * 40

      stars.push({
        position: new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta)
        ),
        size: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        period: 2 + Math.random() * 1,
      })
    }
    starsRef.current = stars

    const positions = new Float32Array(200 * 3)
    const colors = new Float32Array(200 * 3)
    const sizes = new Float32Array(200)

    stars.forEach((star, i) => {
      positions[i * 3] = star.position.x
      positions[i * 3 + 1] = star.position.y
      positions[i * 3 + 2] = star.position.z

      const brightness = 0.7 + Math.random() * 0.3
      colors[i * 3] = brightness
      colors[i * 3 + 1] = brightness
      colors[i * 3 + 2] = brightness * 1.05

      sizes[i] = star.size
    })

    starGeometryRef.current = new THREE.BufferGeometry()
    starGeometryRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    starGeometryRef.current.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    starGeometryRef.current.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    starMaterialRef.current = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    })

    starPointsRef.current = new THREE.Points(starGeometryRef.current, starMaterialRef.current)
  }, [])

  const getAuroraColorPalette = useMemo(() => {
    const offset = params.colorOffset / 50
    return [
      new THREE.Color().setHSL(0.33 - offset * 0.15, 0.85, 0.55),
      new THREE.Color().setHSL(0.5 - offset * 0.15, 0.85, 0.6),
      new THREE.Color().setHSL(0.66 + offset * 0.1, 0.85, 0.65),
      new THREE.Color().setHSL(0.78 + offset * 0.1, 0.85, 0.6),
      new THREE.Color().setHSL(0.9 + offset * 0.1, 0.85, 0.55),
    ]
  }, [params.colorOffset])

  const createAuroraRibbon = useMemo(() => (index: number) => {
    const width = 3 + Math.random() * 2
    const height = 15 + Math.random() * 10
    const segmentsW = 50
    const segmentsH = 20

    const geometry = new THREE.PlaneGeometry(width, height, segmentsW, segmentsH)
    const positions = geometry.attributes.position

    const baseColors = new Float32Array(positions.count * 3)
    const paletteLen = getAuroraColorPalette.length
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i) || 0
      const heightRatio = Math.max(0, Math.min(1, (y + height / 2) / height))
      const colorPos = heightRatio * (paletteLen - 1)
      const colorIdx = Math.max(0, Math.min(paletteLen - 1, Math.floor(colorPos)))
      const nextIdx = Math.min(colorIdx + 1, paletteLen - 1)
      const t = Math.max(0, Math.min(1, colorPos - colorIdx))

      const color = (getAuroraColorPalette[colorIdx] || getAuroraColorPalette[0]).clone()
      color.lerp(
        getAuroraColorPalette[nextIdx] || getAuroraColorPalette[paletteLen - 1],
        t
      )

      baseColors[i * 3] = color.r
      baseColors[i * 3 + 1] = color.g
      baseColors[i * 3 + 2] = color.b
    }

    geometry.setAttribute('baseColor', new THREE.BufferAttribute(baseColors, 3))
    geometry.setAttribute('originalPosition', new THREE.BufferAttribute(new Float32Array(positions.array), 3))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: params.intensity / 100 },
        uOffset: { value: index * 0.7 },
        uWindSpeed: { value: params.windSpeed / 100 },
      },
      vertexShader: `
        attribute vec3 baseColor;
        attribute vec3 originalPosition;
        varying vec3 vColor;
        varying float vHeight;
        uniform float uTime;
        uniform float uIntensity;
        uniform float uOffset;
        uniform float uWindSpeed;

        void main() {
          vec3 pos = originalPosition;

          float flowX = uTime * 0.05 * uWindSpeed * 100.0;
          float wave1 = sin(pos.y * 0.3 - flowX * 0.8 + uOffset) * 0.8;
          float wave2 = sin(pos.y * 0.15 - flowX * 0.5 + uOffset * 1.5) * 1.2;
          float wave3 = cos(pos.x * 0.5 - flowX * 0.6) * 0.4;

          pos.x += wave1 + wave3;
          pos.z += wave2;

          vHeight = (pos.y + 12.5) / 25.0;
          vColor = baseColor;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vHeight;
        uniform float uTime;
        uniform float uIntensity;
        uniform float uOffset;

        void main() {
          float alpha = uIntensity * (0.3 + 0.5 * sin(uTime * 0.7 + uOffset + vHeight * 2.0));
          alpha *= smoothstep(0.0, 0.15, vHeight);
          alpha *= smoothstep(1.0, 0.7, vHeight);
          alpha = clamp(alpha, 0.0, 0.8);

          vec3 finalColor = vColor * (1.0 + 0.3 * sin(uTime * 0.5 + vHeight * 3.0));

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(
      -20 + index * 8 + Math.random() * 4,
      10 + Math.random() * 3,
      -30 - Math.random() * 15
    )
    mesh.rotation.y = (Math.random() - 0.5) * 0.3
    mesh.userData = {
      basePosition: mesh.position.clone(),
      baseRotation: mesh.rotation.clone(),
      baseColors: baseColors.slice(),
      ribbonHeight: height,
    }

    return mesh
  }, [params.intensity, params.windSpeed, getAuroraColorPalette])

  useEffect(() => {
    if (particleSystemRef.current) return

    particleSystemRef.current = new ParticleSystem(500)
    scene.add(particleSystemRef.current.points)

    for (let i = 0; i < auroraRibbonCount; i++) {
      const mesh = createAuroraRibbon(i)
      auroraMeshesRef.current.push(mesh)
      scene.add(mesh)

      const vertexCount = mesh.geometry.attributes.position.count
      const vertexDisturbances: VertexDisturbance[] = []
      for (let v = 0; v < vertexCount; v++) {
        vertexDisturbances.push({
          flowOffset: new THREE.Vector3(0, 0, 0),
          colorMix: 0,
          targetColor: new THREE.Color(0xffffff),
          flowDisturbances: [],
        })
      }
      vertexDisturbancesRef.current.set(mesh, vertexDisturbances)
    }

    if (starPointsRef.current) {
      scene.add(starPointsRef.current)
    }

    forceUpdate(n => n + 1)

    return () => {
      if (particleSystemRef.current) {
        scene.remove(particleSystemRef.current.points)
        particleSystemRef.current.dispose()
      }
      auroraMeshesRef.current.forEach(mesh => {
        scene.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      })
      auroraMeshesRef.current = []
      vertexDisturbancesRef.current.clear()
      if (starPointsRef.current && starGeometryRef.current && starMaterialRef.current) {
        scene.remove(starPointsRef.current)
        starGeometryRef.current.dispose()
        starMaterialRef.current.dispose()
      }
    }
  }, [scene, createAuroraRibbon])

  useEffect(() => {
    auroraMeshesRef.current.forEach(mesh => {
      const material = mesh.material as THREE.ShaderMaterial
      if (material.uniforms) {
        material.uniforms.uIntensity.value = params.intensity / 100
        material.uniforms.uWindSpeed.value = params.windSpeed / 100
      }
    })

    const positions = starGeometryRef.current?.attributes.position as THREE.BufferAttribute | undefined
    if (positions) {
      const colors = starGeometryRef.current?.attributes.color as THREE.BufferAttribute
      starsRef.current.forEach((star, i) => {
        const brightness = 0.6 + 0.4 * (params.intensity / 100)
        if (colors) {
          const twinkle = 0.8 + 0.2 * Math.sin(star.phase)
          colors.array[i * 3] = brightness * twinkle
          colors.array[i * 3 + 1] = brightness * twinkle
          colors.array[i * 3 + 2] = brightness * 1.05 * twinkle
        }
      })
      if (colors) colors.needsUpdate = true
    }
  }, [params.intensity, params.windSpeed])

  useEffect(() => {
    auroraMeshesRef.current.forEach((mesh) => {
      const originalPositions = mesh.geometry.attributes.originalPosition as THREE.BufferAttribute
      const baseColorsAttr = mesh.geometry.attributes.baseColor as THREE.BufferAttribute
      const baseColors = mesh.userData.baseColors as Float32Array
      const ribbonHeight = mesh.userData.ribbonHeight as number
      const paletteLen = getAuroraColorPalette.length

      for (let i = 0; i < originalPositions.count; i++) {
        const y = (originalPositions.getY(i) || 0) + ribbonHeight / 2
        const heightRatio = Math.max(0, Math.min(1, y / ribbonHeight))
        const colorPos = heightRatio * (paletteLen - 1)
        const colorIdx = Math.max(0, Math.min(paletteLen - 1, Math.floor(colorPos)))
        const nextIdx = Math.min(colorIdx + 1, paletteLen - 1)
        const t = Math.max(0, Math.min(1, colorPos - colorIdx))

        const color = (getAuroraColorPalette[colorIdx] || getAuroraColorPalette[0]).clone()
        color.lerp(
          getAuroraColorPalette[nextIdx] || getAuroraColorPalette[paletteLen - 1],
          t
        )

        baseColors[i * 3] = color.r
        baseColors[i * 3 + 1] = color.g
        baseColors[i * 3 + 2] = color.b
      }

      baseColorsAttr.array.set(baseColors)
      baseColorsAttr.needsUpdate = true
    })
  }, [params.colorOffset, getAuroraColorPalette])

  const getAuroraIntersection = useMemo(() => (
    clientX: number,
    clientY: number,
    normalizedMouse: THREE.Vector2
  ): THREE.Vector3 | null => {
    raycaster.current.setFromCamera(normalizedMouse, camera)

    const hits = raycaster.current.intersectObjects(auroraMeshesRef.current, false)
    if (hits.length > 0) {
      return hits[0].point.clone()
    }

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 25)
    const point = new THREE.Vector3()
    raycaster.current.ray.intersectPlane(plane, point)
    return point
  }, [camera])

  useEffect(() => {
    const domElement = gl.domElement

    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true
      const rect = domElement.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      lastMousePosRef.current.set(e.clientX, e.clientY)

      const intersection = getAuroraIntersection(e.clientX, e.clientY, mouse.current)
      if (intersection && particleSystemRef.current) {
        const count = Math.floor(30 + (params.intensity / 100) * 20)
        particleSystemRef.current.emit(intersection, count, getAuroraColorPalette, {
          speed: 3,
          life: 0.8,
          isTrail: false,
        })

        disturbancesRef.current.push({
          position: intersection.clone(),
          radius: 0,
          maxRadius: 8,
          strength: 1,
          life: 3,
          maxLife: 3,
          color: getAuroraColorPalette[Math.floor(Math.random() * getAuroraColorPalette.length)].clone(),
          direction: new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
          ).normalize(),
        })
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return

      const rect = domElement.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      const dx = e.clientX - lastMousePosRef.current.x
      const dy = e.clientY - lastMousePosRef.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 5) {
        const intersection = getAuroraIntersection(e.clientX, e.clientY, mouse.current)
        if (intersection && particleSystemRef.current) {
          particleSystemRef.current.emit(intersection, 3, getAuroraColorPalette, {
            speed: 1.5,
            life: 2,
            isTrail: true,
          })

          disturbancesRef.current.push({
            position: intersection.clone(),
            radius: 0,
            maxRadius: 5,
            strength: 0.6,
            life: 2,
            maxLife: 2,
            color: getAuroraColorPalette[Math.floor(Math.random() * getAuroraColorPalette.length)].clone(),
            direction: new THREE.Vector3(dx * 0.01, -dy * 0.01, 0).normalize(),
          })
        }
        lastMousePosRef.current.set(e.clientX, e.clientY)
      }
    }

    const onPointerUp = () => {
      isDraggingRef.current = false
    }

    domElement.addEventListener('pointerdown', onPointerDown)
    domElement.addEventListener('pointermove', onPointerMove)
    domElement.addEventListener('pointerup', onPointerUp)
    domElement.addEventListener('pointerleave', onPointerUp)

    return () => {
      domElement.removeEventListener('pointerdown', onPointerDown)
      domElement.removeEventListener('pointermove', onPointerMove)
      domElement.removeEventListener('pointerup', onPointerUp)
      domElement.removeEventListener('pointerleave', onPointerUp)
    }
  }, [gl.domElement, getAuroraIntersection, getAuroraColorPalette, params.intensity])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    const windFactor = params.windSpeed / 100
    const baseFlowSpeed = 0.05

    if (particleSystemRef.current) {
      particleSystemRef.current.update(delta)
    }

    if (starPointsRef.current && starGeometryRef.current) {
      const colors = starGeometryRef.current.attributes.color as THREE.BufferAttribute
      starsRef.current.forEach((star, i) => {
        const angularSpeed = (Math.PI * 2) / star.period
        star.phase += delta * angularSpeed
        const brightness = 0.7 + 0.3 * Math.sin(star.phase)
        colors.array[i * 3] = brightness
        colors.array[i * 3 + 1] = brightness
        colors.array[i * 3 + 2] = brightness * 1.05
      })
      colors.needsUpdate = true
    }

    for (let i = disturbancesRef.current.length - 1; i >= 0; i--) {
      const d = disturbancesRef.current[i]
      d.life -= delta
      d.radius = d.maxRadius * (1 - d.life / d.maxLife)
      if (d.life <= 0) {
        disturbancesRef.current.splice(i, 1)
      }
    }

    auroraMeshesRef.current.forEach((mesh, meshIdx) => {
      const material = mesh.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = time
      material.uniforms.uWindSpeed.value = windFactor

      const windOffset = windFactor * baseFlowSpeed * delta
      mesh.position.x -= windOffset
      if (mesh.position.x < -40) {
        mesh.position.x = 40
      }

      const positions = mesh.geometry.attributes.position as THREE.BufferAttribute
      const originalPositions = mesh.geometry.attributes.originalPosition as THREE.BufferAttribute
      const baseColors = mesh.geometry.attributes.baseColor as THREE.BufferAttribute
      const vertexDisturbances = vertexDisturbancesRef.current.get(mesh)

      const baseColorsArray = mesh.userData.baseColors as Float32Array

      for (let i = 0; i < positions.count; i++) {
        const ox = originalPositions.getX(i) ?? 0
        const oy = originalPositions.getY(i) ?? 0
        const oz = originalPositions.getZ(i) ?? 0

        let worldX = ox + mesh.position.x
        let worldY = oy + mesh.position.y
        let worldZ = oz + mesh.position.z

        const vd = vertexDisturbances?.[i]

        if (vd) {
          for (let fi = vd.flowDisturbances.length - 1; fi >= 0; fi--) {
            const fd = vd.flowDisturbances[fi]
            fd.life -= delta
            const recoveryRate = Math.pow(0.01, delta / fd.maxLife)
            fd.offset.multiplyScalar(recoveryRate)
            if (fd.life <= 0 || fd.offset.length() < 0.001) {
              vd.flowDisturbances.splice(fi, 1)
            }
          }

          vd.flowOffset.set(0, 0, 0)
          vd.flowDisturbances.forEach(fd => {
            vd.flowOffset.add(fd.offset)
          })

          if (vd.colorMix > 0) {
            vd.colorMix *= Math.pow(0.01, delta / 3)
            if (vd.colorMix < 0.001) {
              vd.colorMix = 0
            }
          }
        }

        let colorMix = vd?.colorMix ?? 0
        let mixedColor = vd?.targetColor ?? new THREE.Color(0xffffff)

        for (let di = disturbancesRef.current.length - 1; di >= 0; di--) {
          const d = disturbancesRef.current[di]
          if (!d || !d.position || !d.direction || !d.color) continue

          const dx = worldX - d.position.x
          const dy = worldY - d.position.y
          const dz = worldZ - d.position.z
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (dist < d.radius) {
            const influence = (1 - dist / d.radius) * (d.life / d.maxLife) * d.strength

            if (vd) {
              vd.flowDisturbances.push({
                offset: d.direction.clone().multiplyScalar(influence * 3),
                life: d.maxLife,
                maxLife: d.maxLife,
              })
            }

            if (influence > colorMix) {
              colorMix = influence
              mixedColor = d.color.clone()
              if (vd) {
                vd.colorMix = influence
                vd.targetColor = d.color.clone()
              }
            }
          }
        }

        const storedFlowOffset = vd?.flowOffset ?? new THREE.Vector3(0, 0, 0)

        const flowX = time * baseFlowSpeed * windFactor * 100
        const wave1 = Math.sin(oy * 0.3 - flowX * 0.8 + meshIdx * 0.7) * 0.8
        const wave2 = Math.sin(oy * 0.15 - flowX * 0.5 + meshIdx * 1.05) * 1.2
        const wave3 = Math.cos(ox * 0.5 - flowX * 0.6) * 0.4

        positions.setX(i, ox + wave1 + wave3 + storedFlowOffset.x)
        positions.setY(i, oy + storedFlowOffset.y)
        positions.setZ(i, oz + wave2 + storedFlowOffset.z)

        const idx3 = i * 3
        const bcR = baseColorsArray[idx3] ?? 0.5
        const bcG = baseColorsArray[idx3 + 1] ?? 0.5
        const bcB = baseColorsArray[idx3 + 2] ?? 0.5

        if (colorMix > 0) {
          const originalColor = new THREE.Color(bcR, bcG, bcB)
          const finalColor = originalColor.clone().lerp(mixedColor, colorMix * 0.7)

          baseColors.setX(i, finalColor.r)
          baseColors.setY(i, finalColor.g)
          baseColors.setZ(i, finalColor.b)
        } else {
          baseColors.setX(i, bcR)
          baseColors.setY(i, bcG)
          baseColors.setZ(i, bcB)
        }
      }

      positions.needsUpdate = true
      baseColors.needsUpdate = true
    })
  })

  return (
    <group>
      <ambientLight intensity={0.15} />
      <directionalLight position={[10, 20, 10]} intensity={0.3} color="#8899bb" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 1, 1]} />
        <shaderMaterial
          transparent
          side={THREE.DoubleSide}
          uniforms={{
            uTime: { value: 0 },
          }}
          vertexShader={`
            varying vec2 vUv;
            varying vec3 vWorldPos;
            void main() {
              vUv = uv;
              vec4 worldPos = modelMatrix * vec4(position, 1.0);
              vWorldPos = worldPos.xyz;
              gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            varying vec3 vWorldPos;
            void main() {
              vec3 color1 = vec3(0.95, 0.97, 1.0);
              vec3 color2 = vec3(0.7, 0.8, 0.95);

              float dist = length(vWorldPos.xz) / 80.0;
              dist = clamp(dist, 0.0, 1.0);

              vec3 finalColor = mix(color1, color2, dist);

              float reflect = 0.08 + 0.04 * sin(vUv.x * 200.0) * sin(vUv.y * 200.0);
              finalColor += reflect;

              float alpha = 0.7;
              alpha *= smoothstep(100.0, 20.0, length(vWorldPos.xz));

              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>

      <mesh position={[0, 0, -40]}>
        <sphereGeometry args={[100, 32, 32]} />
        <meshBasicMaterial color="#0d0d2b" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

export default AuroraScene

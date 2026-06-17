import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ParticleSystem, Particle, getParticleColor } from '../particle/ParticleSystem'
import { GrowthStage, STAGE_COLORS, STAGE_NAMES } from '../store'

interface GrowthSceneProps {
  particleSystem: ParticleSystem
  stage: GrowthStage
  growthProgress: number
  light: number
  onParticleCountChange?: (count: number) => void
}

export function GrowthScene({ particleSystem, stage, growthProgress, light, onParticleCountChange }: GrowthSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const plantGroupRef = useRef<THREE.Group | null>(null)
  const particlesRef = useRef<THREE.Points | null>(null)
  const flowerParticlesRef = useRef<THREE.Points | null>(null)
  const animationFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const lightRef = useRef<THREE.DirectionalLight | null>(null)
  const stageTextRef = useRef<HTMLDivElement | null>(null)
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<GrowthStage>(stage)
  const growthProgressRef = useRef<number>(growthProgress)
  const lightIntensityRef = useRef<number>(light)
  const initializedRef = useRef<boolean>(false)

  useEffect(() => {
    stageRef.current = stage
    growthProgressRef.current = growthProgress
    if (initializedRef.current && stageTextRef.current && progressBarRef.current) {
      stageTextRef.current.textContent = STAGE_NAMES[stage]
      const stageProgress = getStageProgress(stage, growthProgress)
      progressBarRef.current.style.width = `${stageProgress * 100}%`
      progressBarRef.current.style.backgroundColor = STAGE_COLORS[stage]
    }
  }, [stage, growthProgress])

  useEffect(() => {
    lightIntensityRef.current = light
    if (lightRef.current) {
      lightRef.current.intensity = 0.3 + (light / 100) * 1.2
    }
  }, [light])

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1A1A2E)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 2, 5)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2
    controls.maxDistance = 10
    controls.maxPolarAngle = Math.PI / 2 + 0.3
    controls.target.set(0, 0.5, 0)
    controlsRef.current = controls

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(3, 5, 3)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 1024
    directionalLight.shadow.mapSize.height = 1024
    scene.add(directionalLight)
    lightRef.current = directionalLight

    const potGroup = createPot()
    scene.add(potGroup)

    const soil = createSoil()
    scene.add(soil)

    const plantGroup = new THREE.Group()
    plantGroup.position.y = 0.6
    scene.add(plantGroup)
    plantGroupRef.current = plantGroup

    const particleGeometry = new THREE.BufferGeometry()
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)
    particlesRef.current = particles

    const flowerParticleGeometry = new THREE.BufferGeometry()
    const flowerParticleMaterial = new THREE.PointsMaterial({
      size: 0.15,
      color: 0xF48FB1,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    })
    const flowerParticles = new THREE.Points(flowerParticleGeometry, flowerParticleMaterial)
    scene.add(flowerParticles)
    flowerParticlesRef.current = flowerParticles

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    if (stageTextRef.current) {
      stageTextRef.current.textContent = STAGE_NAMES[stageRef.current]
    }
    if (progressBarRef.current) {
      const stageProgress = getStageProgress(stageRef.current, growthProgressRef.current)
      progressBarRef.current.style.width = `${stageProgress * 100}%`
      progressBarRef.current.style.backgroundColor = STAGE_COLORS[stageRef.current]
    }

    initializedRef.current = true

    lastTimeRef.current = performance.now()
    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate)
      const delta = Math.min((time - lastTimeRef.current) / 16.67, 3)
      lastTimeRef.current = time

      particleSystem.update(delta * 0.016)
      updateParticles(particleSystem.getParticles())
      updatePlant(stageRef.current, growthProgressRef.current)
      updateFlowerParticles(stageRef.current, growthProgressRef.current, time)

      const particleCount = particleSystem.getParticleCount()
      if (onParticleCountChange) {
        onParticleCountChange(particleCount)
      }

      controls.update()
      renderer.render(scene, camera)
    }
    animate(performance.now())

    return () => {
      initializedRef.current = false
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameRef.current)
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  const getStageProgress = (currentStage: GrowthStage, totalProgress: number): number => {
    const thresholds: Record<GrowthStage, number> = {
      seed: 0,
      sprout: 0.2,
      adult: 0.45,
      flowering: 0.7,
      fruiting: 1.0,
    }
    const stageOrder: GrowthStage[] = ['seed', 'sprout', 'adult', 'flowering', 'fruiting']
    const currentIndex = stageOrder.indexOf(currentStage)
    const prevThreshold = currentIndex === 0 ? 0 : thresholds[stageOrder[currentIndex - 1]]
    const currentThreshold = thresholds[currentStage]
    const stageRange = currentThreshold - prevThreshold
    if (stageRange === 0) return 0
    return Math.min(1, (totalProgress - prevThreshold) / stageRange)
  }

  const createPot = (): THREE.Group => {
    const group = new THREE.Group()

    const potGeometry = new THREE.CylinderGeometry(1.6, 1.2, 2.5, 16, 1, false)
    const potMaterial = new THREE.MeshStandardMaterial({
      color: 0xA0522D,
      roughness: 0.8,
      metalness: 0.1,
    })
    const pot = new THREE.Mesh(potGeometry, potMaterial)
    pot.position.y = -0.75
    pot.castShadow = true
    pot.receiveShadow = true
    group.add(pot)

    const rimGeometry = new THREE.TorusGeometry(1.6, 0.1, 8, 16)
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.1,
    })
    const rim = new THREE.Mesh(rimGeometry, rimMaterial)
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.5
    group.add(rim)

    return group
  }

  const createSoil = (): THREE.Mesh => {
    const soilGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 16)
    const soilMaterial = new THREE.MeshStandardMaterial({
      color: 0x4E342E,
      roughness: 0.9,
      metalness: 0,
    })

    const positions = soilGeometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i)
      if (y > 0) {
        positions.setY(i, y + (Math.random() - 0.5) * 0.08)
      }
    }
    soilGeometry.computeVertexNormals()

    const soil = new THREE.Mesh(soilGeometry, soilMaterial)
    soil.position.y = 0.35
    soil.receiveShadow = true
    return soil
  }

  const updatePlant = (stage: GrowthStage, progress: number) => {
    if (!plantGroupRef.current) return

    while (plantGroupRef.current.children.length > 0) {
      const child = plantGroupRef.current.children[0]
      plantGroupRef.current.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (child.material instanceof THREE.Material) {
          child.material.dispose()
        }
      }
    }

    const stageScale = getStageScale(stage, progress)

    switch (stage) {
      case 'seed':
        createSeed(stageScale)
        break
      case 'sprout':
        createSprout(stageScale)
        break
      case 'adult':
        createAdult(stageScale)
        break
      case 'flowering':
        createFlowering(stageScale)
        break
      case 'fruiting':
        createFruiting(stageScale)
        break
    }
  }

  const getStageScale = (stage: GrowthStage, progress: number): number => {
    const scales: Record<GrowthStage, [number, number]> = {
      seed: [0.1, 0.15],
      sprout: [0.15, 0.5],
      adult: [0.5, 1],
      flowering: [1, 1.2],
      fruiting: [1.2, 1.4],
    }
    const [min, max] = scales[stage]
    const stageProgress = getStageProgress(stage, progress)
    return min + (max - min) * stageProgress
  }

  const createSeed = (scale: number) => {
    if (!plantGroupRef.current) return
    const seedGeometry = new THREE.SphereGeometry(0.1 * scale, 8, 6)
    const seedMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.9,
    })
    const seed = new THREE.Mesh(seedGeometry, seedMaterial)
    seed.position.y = 0
    seed.castShadow = true
    plantGroupRef.current.add(seed)
  }

  const createSprout = (scale: number) => {
    if (!plantGroupRef.current) return

    const stemGeometry = new THREE.CylinderGeometry(0.03 * scale, 0.04 * scale, 0.4 * scale, 6)
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x90EE90,
      roughness: 0.7,
    })
    const stem = new THREE.Mesh(stemGeometry, stemMaterial)
    stem.position.y = 0.2 * scale
    stem.castShadow = true
    plantGroupRef.current.add(stem)

    const leafGeometry = new THREE.SphereGeometry(0.12 * scale, 6, 4)
    leafGeometry.scale(1, 0.3, 0.5)
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x98FB98,
      roughness: 0.6,
      side: THREE.DoubleSide,
    })

    const leaf1 = new THREE.Mesh(leafGeometry, leafMaterial)
    leaf1.position.set(0.1 * scale, 0.35 * scale, 0)
    leaf1.rotation.z = -0.5
    leaf1.castShadow = true
    plantGroupRef.current.add(leaf1)

    const leaf2 = new THREE.Mesh(leafGeometry, leafMaterial)
    leaf2.position.set(-0.1 * scale, 0.35 * scale, 0)
    leaf2.rotation.z = 0.5
    leaf2.castShadow = true
    plantGroupRef.current.add(leaf2)
  }

  const createAdult = (scale: number) => {
    const group = plantGroupRef.current
    if (!group) return

    const stemGeometry = new THREE.CylinderGeometry(0.05 * scale, 0.08 * scale, 1.2 * scale, 8)
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x228B22,
      roughness: 0.8,
    })
    const stem = new THREE.Mesh(stemGeometry, stemMaterial)
    stem.position.y = 0.6 * scale
    stem.castShadow = true
    group.add(stem)

    const leafPositions = [
      { x: 0.3, y: 0.9, z: 0, rotY: 0, rotZ: -0.3 },
      { x: -0.3, y: 0.9, z: 0, rotY: Math.PI, rotZ: 0.3 },
      { x: 0, y: 1.1, z: 0.25, rotY: Math.PI / 2, rotZ: -0.2 },
      { x: 0, y: 1.1, z: -0.25, rotY: -Math.PI / 2, rotZ: 0.2 },
      { x: 0.2, y: 0.7, z: 0.15, rotY: Math.PI / 4, rotZ: -0.4 },
      { x: -0.2, y: 0.7, z: -0.15, rotY: -Math.PI * 0.75, rotZ: 0.4 },
    ]

    leafPositions.forEach((pos) => {
      const leafGeometry = new THREE.SphereGeometry(0.2 * scale, 8, 6)
      leafGeometry.scale(1.5, 0.2, 1)
      const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x32CD32,
        roughness: 0.5,
        side: THREE.DoubleSide,
      })
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial)
      leaf.position.set(pos.x * scale, pos.y * scale, pos.z * scale)
      leaf.rotation.set(0, pos.rotY, pos.rotZ)
      leaf.castShadow = true
      group.add(leaf)
    })
  }

  const createFlowering = (scale: number) => {
    if (!plantGroupRef.current) return
    createAdult(scale)

    const flowerColors = [0xFF69B4, 0xFFB6C1, 0xFF1493, 0xF48FB1]

    const flowerPositions = [
      { x: 0, y: 1.3, z: 0 },
      { x: 0.25, y: 1.15, z: 0.1 },
      { x: -0.2, y: 1.2, z: -0.15 },
      { x: 0.15, y: 1.0, z: 0.2 },
      { x: -0.1, y: 1.1, z: -0.1 },
    ]

    flowerPositions.forEach((pos, index) => {
      const flowerGroup = new THREE.Group()

      const petalCount = 5
      for (let i = 0; i < petalCount; i++) {
        const petalGeometry = new THREE.SphereGeometry(0.08 * scale, 6, 4)
        petalGeometry.scale(1, 0.3, 0.6)
        const petalMaterial = new THREE.MeshStandardMaterial({
          color: flowerColors[index % flowerColors.length],
          roughness: 0.4,
          side: THREE.DoubleSide,
        })
        const petal = new THREE.Mesh(petalGeometry, petalMaterial)
        petal.position.y = 0.05 * scale
        petal.rotation.y = (i / petalCount) * Math.PI * 2
        petal.castShadow = true
        flowerGroup.add(petal)
      }

      const centerGeometry = new THREE.SphereGeometry(0.04 * scale, 6, 6)
      const centerMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        roughness: 0.3,
      })
      const center = new THREE.Mesh(centerGeometry, centerMaterial)
      center.castShadow = true
      flowerGroup.add(center)

      flowerGroup.position.set(pos.x * scale, pos.y * scale, pos.z * scale)
      plantGroupRef.current!.add(flowerGroup)
    })
  }

  const createFruiting = (scale: number) => {
    if (!plantGroupRef.current) return
    createAdult(scale)

    const fruitPositions = [
      { x: 0.15, y: 1.0, z: 0.1 },
      { x: -0.12, y: 0.95, z: -0.08 },
      { x: 0.05, y: 0.85, z: 0.15 },
      { x: -0.08, y: 0.9, z: -0.12 },
    ]

    const fruitSizes = [0.12, 0.1, 0.09, 0.08]

    fruitPositions.forEach((pos, index) => {
      const fruitGeometry = new THREE.SphereGeometry(fruitSizes[index] * scale, 8, 6)
      const fruitMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF6347,
        roughness: 0.5,
        metalness: 0.1,
      })
      const fruit = new THREE.Mesh(fruitGeometry, fruitMaterial)
      fruit.position.set(pos.x * scale, pos.y * scale, pos.z * scale)
      fruit.castShadow = true
      plantGroupRef.current!.add(fruit)

      const leafGeometry = new THREE.ConeGeometry(0.03 * scale, 0.06 * scale, 4)
      const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x228B22,
        roughness: 0.7,
      })
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial)
      leaf.position.set(pos.x * scale, (pos.y + fruitSizes[index]) * scale, pos.z * scale)
      leaf.rotation.z = Math.PI
      plantGroupRef.current!.add(leaf)
    })
  }

  const updateParticles = (particles: Particle[]) => {
    if (!particlesRef.current) return

    const geometry = particlesRef.current.geometry
    const positions = new Float32Array(particles.length * 3)
    const colors = new Float32Array(particles.length * 3)

    particles.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z

      const color = getParticleColor(p.concentration, p.type)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    })

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
  }

  const updateFlowerParticles = (stage: GrowthStage, progress: number, time: number) => {
    if (!flowerParticlesRef.current || !plantGroupRef.current) return

    const showFlowers = stage === 'flowering' || stage === 'fruiting'
    flowerParticlesRef.current.visible = showFlowers

    if (!showFlowers) return

    const flowerCount = Math.floor(20 + progress * 30)
    const geometry = flowerParticlesRef.current.geometry
    const positions = new Float32Array(flowerCount * 3)

    for (let i = 0; i < flowerCount; i++) {
      const angle = (i / flowerCount) * Math.PI * 2 + time * 0.0003
      const height = 0.8 + Math.sin(i * 1.5) * 0.3
      const radius = 0.2 + Math.sin(i * 2.3) * 0.1
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = height
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.attributes.position.needsUpdate = true
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        textAlign: 'center',
        pointerEvents: 'none',
      }}>
        <div
          ref={stageTextRef}
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            marginBottom: '8px',
          }}
        >
          种子期
        </div>
        <div style={{
          width: '200px',
          height: '8px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div
            ref={progressBarRef}
            style={{
              height: '100%',
              backgroundColor: '#BDBDBD',
              borderRadius: '4px',
              transition: 'width 0.3s ease, background-color 0.3s ease',
              width: '0%',
            }}
          />
        </div>
      </div>
    </div>
  )
}

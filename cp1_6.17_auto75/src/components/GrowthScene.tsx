import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { ParticleSystem } from '../particle/ParticleSystem'
import type { GrowthStage } from '../store'
import { STAGE_COLORS } from '../store'

interface GrowthSceneProps {
  particleSystem: ParticleSystem | null
  growthProgress: number
  currentStage: GrowthStage
  fruitSize: number
  lightLevel: number
}

export function GrowthScene({ particleSystem, growthProgress, currentStage, fruitSize, lightLevel }: GrowthSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const particlePointsRef = useRef<THREE.Points | null>(null)
  const plantGroupRef = useRef<THREE.Group | null>(null)
  const flowerParticlesRef = useRef<THREE.Points | null>(null)
  const isDraggingRef = useRef(false)
  const previousMouseRef = useRef({ x: 0, y: 0 })
  const rotationRef = useRef({ x: -0.2, y: 0.5 })
  const animationIdRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 1024
    directionalLight.shadow.mapSize.height = 1024
    scene.add(directionalLight)

    const plantGroup = new THREE.Group()
    plantGroup.position.y = 0
    scene.add(plantGroup)
    plantGroupRef.current = plantGroup

    createPot(scene)
    createSoil(scene)
    createPlantMeshes(plantGroup)
    createParticles(scene)
    createFlowerParticles(scene)

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true
      previousMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const deltaX = e.clientX - previousMouseRef.current.x
      const deltaY = e.clientY - previousMouseRef.current.y
      rotationRef.current.y += deltaX * 0.01
      rotationRef.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.x + deltaY * 0.01))
      previousMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    const canvas = renderer.domElement
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('resize', handleResize)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationIdRef.current)
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return

    const animate = (time: number) => {
      const deltaTime = Math.min((time - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = time

      if (particleSystem && particlePointsRef.current) {
        const data = particleSystem.update(deltaTime)
        const positions = particlePointsRef.current.geometry.attributes.position.array as Float32Array
        const colors = particlePointsRef.current.geometry.attributes.color.array as Float32Array

        for (let i = 0; i < data.count * 3; i++) {
          positions[i] = data.positions[i]
          colors[i] = data.colors[i]
        }

        particlePointsRef.current.geometry.attributes.position.needsUpdate = true
        particlePointsRef.current.geometry.attributes.color.needsUpdate = true
        particlePointsRef.current.geometry.setDrawRange(0, data.count)
      }

      updatePlantModel(growthProgress, currentStage, fruitSize)
      updateFlowerParticles(currentStage, time / 1000)

      if (cameraRef.current && plantGroupRef.current) {
        const radius = 3.5
        const x = Math.sin(rotationRef.current.y) * radius * Math.cos(rotationRef.current.x)
        const y = Math.sin(rotationRef.current.x) * radius + 1
        const z = Math.cos(rotationRef.current.y) * radius * Math.cos(rotationRef.current.x)
        cameraRef.current.position.set(x, y, z)
        cameraRef.current.lookAt(0, 1, 0)
      }

      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }

      animationIdRef.current = requestAnimationFrame(animate)
    }

    animationIdRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationIdRef.current)
    }
  }, [particleSystem, growthProgress, currentStage, fruitSize])

  useEffect(() => {
    if (!sceneRef.current) return
    const light = sceneRef.current.children.find(child => child instanceof THREE.DirectionalLight) as THREE.DirectionalLight
    if (light) {
      light.intensity = 0.3 + (lightLevel / 100) * 0.7
    }
  }, [lightLevel])

  const createPot = (scene: THREE.Scene) => {
    const potGroup = new THREE.Group()

    const potGeometry = new THREE.CylinderGeometry(1.5, 1.2, 2, 32, 1, false)
    const potMaterial = new THREE.MeshStandardMaterial({
      color: 0xA0522D,
      roughness: 0.8,
      metalness: 0.1
    })
    const pot = new THREE.Mesh(potGeometry, potMaterial)
    pot.position.y = -0.5
    pot.castShadow = true
    pot.receiveShadow = true
    potGroup.add(pot)

    const rimGeometry = new THREE.TorusGeometry(1.5, 0.1, 8, 32)
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.1
    })
    const rim = new THREE.Mesh(rimGeometry, rimMaterial)
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.5
    potGroup.add(rim)

    scene.add(potGroup)
  }

  const createSoil = (scene: THREE.Scene) => {
    const soilGeometry = new THREE.CylinderGeometry(1.4, 1.3, 0.3, 32)
    const soilMaterial = new THREE.MeshStandardMaterial({
      color: 0x4E342E,
      roughness: 0.9,
      metalness: 0
    })
    const soil = new THREE.Mesh(soilGeometry, soilMaterial)
    soil.position.y = 0.35
    soil.receiveShadow = true
    scene.add(soil)

    const particleCount = 100
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 1.3
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 0.5 + Math.random() * 0.05
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    const soilParticleGeometry = new THREE.BufferGeometry()
    soilParticleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const soilParticleMaterial = new THREE.PointsMaterial({
      color: 0x3E2723,
      size: 0.05,
      sizeAttenuation: true
    })
    const soilParticles = new THREE.Points(soilParticleGeometry, soilParticleMaterial)
    scene.add(soilParticles)
  }

  const createPlantMeshes = (group: THREE.Group) => {
    const seedGeometry = new THREE.SphereGeometry(0.2, 8, 8)
    const seedMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    const seed = new THREE.Mesh(seedGeometry, seedMaterial)
    seed.position.y = 0.6
    seed.name = 'seed'
    seed.visible = true
    group.add(seed)

    const stemGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.5, 8)
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x7CB342 })
    const stem = new THREE.Mesh(stemGeometry, stemMaterial)
    stem.position.y = 0.8
    stem.name = 'stem'
    stem.visible = false
    group.add(stem)

    for (let i = 0; i < 4; i++) {
      const leafGeometry = new THREE.ConeGeometry(0.15, 0.4, 4)
      const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x81C784 })
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial)
      const angle = (i / 4) * Math.PI * 2
      leaf.position.set(Math.cos(angle) * 0.15, 1.0 + i * 0.1, Math.sin(angle) * 0.15)
      leaf.rotation.z = Math.cos(angle) * 0.5
      leaf.rotation.x = Math.sin(angle) * 0.5
      leaf.name = `leaf_${i}`
      leaf.visible = false
      group.add(leaf)
    }

    const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, 2, 8)
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6D4C41 })
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.y = 1.5
    trunk.name = 'trunk'
    trunk.visible = false
    group.add(trunk)

    const foliageGeometry = new THREE.SphereGeometry(0.8, 8, 8)
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50 })
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial)
    foliage.position.y = 2.5
    foliage.name = 'foliage'
    foliage.visible = false
    group.add(foliage)

    for (let i = 0; i < 5; i++) {
      const fruitGeometry = new THREE.SphereGeometry(0.15, 8, 8)
      const fruitMaterial = new THREE.MeshStandardMaterial({ color: 0xFF5722 })
      const fruit = new THREE.Mesh(fruitGeometry, fruitMaterial)
      const angle = (i / 5) * Math.PI * 2
      fruit.position.set(Math.cos(angle) * 0.5, 2.5 + Math.sin(i) * 0.3, Math.sin(angle) * 0.5)
      fruit.name = `fruit_${i}`
      fruit.visible = false
      fruit.scale.setScalar(0)
      group.add(fruit)
    }
  }

  const createParticles = (scene: THREE.Scene) => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(200 * 3)
    const colors = new Float32Array(200 * 3)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setDrawRange(0, 0)

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)
    particlePointsRef.current = points
  }

  const createFlowerParticles = (scene: THREE.Scene) => {
    const flowerCount = 30
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(flowerCount * 3)
    const colors = new Float32Array(flowerCount * 3)

    for (let i = 0; i < flowerCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 0.3 + Math.random() * 0.5
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 2.2 + Math.random() * 0.6
      positions[i * 3 + 2] = Math.sin(angle) * radius
      colors[i * 3] = 1
      colors[i * 3 + 1] = 0.5
      colors[i * 3 + 2] = 0.7
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)
    flowerParticlesRef.current = points
  }

  const updatePlantModel = (progress: number, stage: GrowthStage, fruit: number) => {
    if (!plantGroupRef.current) return

    const group = plantGroupRef.current
    const seed = group.getObjectByName('seed') as THREE.Mesh
    const stem = group.getObjectByName('stem') as THREE.Mesh
    const trunk = group.getObjectByName('trunk') as THREE.Mesh
    const foliage = group.getObjectByName('foliage') as THREE.Mesh

    const sproutStart = 20
    const matureStart = 45
    const floweringStart = 70
    const fruitingStart = 90

    if (seed) {
      if (progress < sproutStart) {
        seed.visible = true
        const scale = 0.5 + (progress / sproutStart) * 0.5
        seed.scale.setScalar(scale)
      } else {
        seed.visible = false
      }
    }

    if (stem) {
      if (progress >= sproutStart && progress < matureStart) {
        stem.visible = true
        const t = (progress - sproutStart) / (matureStart - sproutStart)
        stem.scale.y = 0.5 + t * 1.5
        stem.position.y = 0.5 + (stem.scale.y * 0.25)
      } else {
        stem.visible = false
      }
    }

    for (let i = 0; i < 4; i++) {
      const leaf = group.getObjectByName(`leaf_${i}`) as THREE.Mesh
      if (leaf) {
        if (progress >= sproutStart && progress < floweringStart) {
          leaf.visible = true
          const t = progress < matureStart
            ? (progress - sproutStart) / (matureStart - sproutStart)
            : 1
          leaf.scale.setScalar(0.3 + t * 0.7)
        } else {
          leaf.visible = false
        }
      }
    }

    if (trunk) {
      if (progress >= matureStart) {
        trunk.visible = true
        const t = Math.min(1, (progress - matureStart) / (floweringStart - matureStart))
        trunk.scale.y = 0.5 + t * 1
        trunk.position.y = 0.5 + (trunk.scale.y * 1)
      } else {
        trunk.visible = false
      }
    }

    if (foliage) {
      if (progress >= matureStart) {
        foliage.visible = true
        const t = Math.min(1, (progress - matureStart) / (floweringStart - matureStart))
        const scale = 0.4 + t * 0.8
        foliage.scale.setScalar(scale)
        foliage.position.y = 1.5 + trunk.scale.y * 2 + scale * 0.2
      } else {
        foliage.visible = false
      }
    }

    for (let i = 0; i < 5; i++) {
      const fruitMesh = group.getObjectByName(`fruit_${i}`) as THREE.Mesh
      if (fruitMesh) {
        if (progress >= fruitingStart) {
          fruitMesh.visible = true
          fruitMesh.scale.setScalar(fruit * 0.15)
        } else {
          fruitMesh.visible = false
        }
      }
    }
  }

  const updateFlowerParticles = (stage: GrowthStage, time: number) => {
    if (!flowerParticlesRef.current) return

    const material = flowerParticlesRef.current.material as THREE.PointsMaterial
    const positions = flowerParticlesRef.current.geometry.attributes.position.array as Float32Array

    if (stage === 'flowering' || stage === 'fruiting') {
      material.opacity = Math.min(1, material.opacity + 0.02)

      for (let i = 0; i < 30; i++) {
        const idx = i * 3
        const baseAngle = (i / 30) * Math.PI * 2
        positions[idx] = Math.cos(baseAngle + time * 0.2) * (0.4 + Math.sin(time + i) * 0.1)
        positions[idx + 2] = Math.sin(baseAngle + time * 0.2) * (0.4 + Math.cos(time + i) * 0.1)
      }
      flowerParticlesRef.current.geometry.attributes.position.needsUpdate = true
    } else {
      material.opacity = Math.max(0, material.opacity - 0.02)
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: 'grab'
      }}
    />
  )
}

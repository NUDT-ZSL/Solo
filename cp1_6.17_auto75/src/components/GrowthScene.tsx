import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { ParticleSystem } from '../particle/ParticleSystem'
import type { GrowthStage } from '../store'
import { STAGE_COLORS, STAGE_NAMES } from '../store'

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
  const rotationRef = useRef({ x: -0.3, y: 0.6 })
  const animationIdRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const [displayProgress, setDisplayProgress] = useState(0)
  const [displayColor, setDisplayColor] = useState(STAGE_COLORS.seed)
  const [plantTopY, setPlantTopY] = useState(1)

  useEffect(() => {
    const start = performance.now()
    const startValue = displayProgress
    const targetValue = growthProgress
    const duration = 300

    const animate = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      setDisplayProgress(startValue + (targetValue - startValue) * easeT)
      if (t < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [growthProgress])

  useEffect(() => {
    const targetColor = STAGE_COLORS[currentStage]
    const startColor = displayColor

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 }
    }

    const rgbToHex = (r: number, g: number, b: number) => {
      return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }).join('')
    }

    const start = performance.now()
    const startRgb = hexToRgb(startColor)
    const targetRgb = hexToRgb(targetColor)
    const duration = 300

    const animateColor = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

      const r = startRgb.r + (targetRgb.r - startRgb.r) * easeT
      const g = startRgb.g + (targetRgb.g - startRgb.g) * easeT
      const b = startRgb.b + (targetRgb.b - startRgb.b) * easeT

      setDisplayColor(rgbToHex(r, g, b))

      if (t < 1) {
        requestAnimationFrame(animateColor)
      }
    }

    requestAnimationFrame(animateColor)
  }, [currentStage])

  useEffect(() => {
    const stageThresholds = [0, 20, 45, 70, 90, 100]
    const stageIndex = ['seed', 'sprout', 'mature', 'flowering', 'fruiting'].indexOf(currentStage)
    const nextProgress = stageThresholds[stageIndex + 1] || 100
    const currentProgress = stageThresholds[stageIndex]
    const stageProgress = (displayProgress - currentProgress) / (nextProgress - currentProgress)
    const topY = 0.7 + stageIndex * 0.6 + stageProgress * 0.5
    setPlantTopY(topY)
  }, [displayProgress, currentStage])

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
    createLowPolyPlant(plantGroup)
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

      updateLowPolyPlant(growthProgress, currentStage, fruitSize)
      updateFlowerParticles(currentStage, growthProgress, time / 1000)

      if (cameraRef.current && plantGroupRef.current) {
        const radius = 4.5
        const x = Math.sin(rotationRef.current.y) * radius * Math.cos(rotationRef.current.x)
        const y = Math.sin(rotationRef.current.x) * radius + 1.5
        const z = Math.cos(rotationRef.current.y) * radius * Math.cos(rotationRef.current.x)
        cameraRef.current.position.set(x, y, z)
        cameraRef.current.lookAt(0, 1.2, 0)
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

    const potGeometry = new THREE.CylinderGeometry(1.5, 1.2, 2, 8, 1, false)
    const potMaterial = new THREE.MeshStandardMaterial({
      color: 0xA0522D,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true
    })
    const pot = new THREE.Mesh(potGeometry, potMaterial)
    pot.position.y = -0.5
    pot.castShadow = true
    pot.receiveShadow = true
    potGroup.add(pot)

    const rimGeometry = new THREE.TorusGeometry(1.5, 0.12, 4, 8)
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true
    })
    const rim = new THREE.Mesh(rimGeometry, rimMaterial)
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.5
    potGroup.add(rim)

    scene.add(potGroup)
  }

  const createSoil = (scene: THREE.Scene) => {
    const soilGeometry = new THREE.CylinderGeometry(1.4, 1.3, 0.3, 8)
    const soilMaterial = new THREE.MeshStandardMaterial({
      color: 0x4E342E,
      roughness: 0.9,
      metalness: 0,
      flatShading: true
    })
    const soil = new THREE.Mesh(soilGeometry, soilMaterial)
    soil.position.y = 0.35
    soil.receiveShadow = true
    scene.add(soil)

    const particleCount = 80
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
      size: 0.06,
      sizeAttenuation: true
    })
    const soilParticles = new THREE.Points(soilParticleGeometry, soilParticleMaterial)
    scene.add(soilParticles)
  }

  const createLowPolyPlant = (group: THREE.Group) => {
    const seedGroup = new THREE.Group()
    seedGroup.name = 'seed_group'

    const seedGeometry = new THREE.SphereGeometry(0.2, 6, 5)
    const seedMaterial = new THREE.MeshStandardMaterial({
      color: 0xD2691E,
      flatShading: true,
      roughness: 0.9
    })
    const seed = new THREE.Mesh(seedGeometry, seedMaterial)
    seed.scale.set(1, 0.6, 1)
    seed.name = 'seed'
    seedGroup.add(seed)

    const seedLineGeometry = new THREE.BufferGeometry()
    const seedLinePositions = new Float32Array([
      -0.15, 0.05, 0, 0.15, 0.05, 0,
      0, -0.1, 0, 0, 0.12, 0,
      -0.08, -0.08, 0.1, 0.08, -0.08, -0.1
    ])
    seedLineGeometry.setAttribute('position', new THREE.BufferAttribute(seedLinePositions, 3))
    const seedLineMaterial = new THREE.LineBasicMaterial({ color: 0x8B4513 })
    const seedLines = new THREE.LineSegments(seedLineGeometry, seedLineMaterial)
    seedLines.name = 'seed_lines'
    seedGroup.add(seedLines)

    const seedHighlightGeometry = new THREE.SphereGeometry(0.05, 4, 4)
    const seedHighlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xDEB887,
      flatShading: true,
      emissive: 0x8B4513,
      emissiveIntensity: 0.1
    })
    const seedHighlight = new THREE.Mesh(seedHighlightGeometry, seedHighlightMaterial)
    seedHighlight.position.set(-0.05, 0.03, 0.1)
    seedGroup.add(seedHighlight)

    seedGroup.position.y = 0.65
    seedGroup.visible = true
    group.add(seedGroup)

    const sproutStemGeometry = new THREE.CylinderGeometry(0.04, 0.06, 0.4, 5)
    const sproutStemMaterial = new THREE.MeshStandardMaterial({
      color: 0x8BC34A,
      flatShading: true
    })
    const sproutStem = new THREE.Mesh(sproutStemGeometry, sproutStemMaterial)
    sproutStem.position.y = 0.9
    sproutStem.name = 'sprout_stem'
    sproutStem.visible = false
    group.add(sproutStem)

    for (let i = 0; i < 2; i++) {
      const cotyledonShape = new THREE.Shape()
      cotyledonShape.moveTo(0, 0)
      cotyledonShape.lineTo(0.08, 0.15)
      cotyledonShape.lineTo(0.18, 0.35)
      cotyledonShape.lineTo(0.1, 0.5)
      cotyledonShape.lineTo(0, 0.45)
      cotyledonShape.lineTo(-0.1, 0.5)
      cotyledonShape.lineTo(-0.18, 0.35)
      cotyledonShape.lineTo(-0.08, 0.15)
      cotyledonShape.lineTo(0, 0)

      const cotyledonGeometry = new THREE.ExtrudeGeometry(cotyledonShape, {
        depth: 0.05,
        bevelEnabled: false,
        bevelThickness: 0,
        bevelSize: 0,
        bevelSegments: 0
      })
      const cotyledonMaterial = new THREE.MeshStandardMaterial({
        color: 0xAED581,
        flatShading: true,
        side: THREE.DoubleSide
      })
      const cotyledon = new THREE.Mesh(cotyledonGeometry, cotyledonMaterial)
      const side = i === 0 ? 1 : -1
      cotyledon.position.set(side * 0.05, 1.0, 0)
      cotyledon.rotation.z = side * 0.3
      cotyledon.rotation.x = -Math.PI / 6
      cotyledon.name = `cotyledon_${i}`
      cotyledon.visible = false
      group.add(cotyledon)
    }

    const mainStemGeometry = new THREE.CylinderGeometry(0.06, 0.1, 1.2, 6)
    const mainStemMaterial = new THREE.MeshStandardMaterial({
      color: 0x7CB342,
      flatShading: true
    })
    const mainStem = new THREE.Mesh(mainStemGeometry, mainStemMaterial)
    mainStem.position.y = 1.3
    mainStem.name = 'main_stem'
    mainStem.visible = false
    group.add(mainStem)

    for (let i = 0; i < 6; i++) {
      const leafVertices = new Float32Array([
        0, 0, 0,
        0.08, 0.15, 0.02,
        -0.08, 0.15, -0.02,
        0, 0.5, 0
      ])
      const leafIndices = [
        0, 1, 3,
        0, 3, 2,
        0, 2, 1,
        1, 2, 3
      ]
      const leafGeometry = new THREE.BufferGeometry()
      leafGeometry.setAttribute('position', new THREE.BufferAttribute(leafVertices, 3))
      leafGeometry.setIndex(leafIndices)
      leafGeometry.computeVertexNormals()

      const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x66BB6A,
        flatShading: true,
        side: THREE.DoubleSide
      })
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial)
      const angle = (i / 6) * Math.PI * 2
      const height = 0.9 + (i % 3) * 0.3
      const dist = 0.15
      leaf.position.set(
        Math.cos(angle) * dist,
        height,
        Math.sin(angle) * dist
      )
      leaf.rotation.z = Math.cos(angle) * 0.7
      leaf.rotation.x = Math.sin(angle) * 0.4
      leaf.rotation.y = angle + Math.PI / 2
      leaf.name = `mature_leaf_${i}`
      leaf.visible = false
      group.add(leaf)
    }

    const bigStemGeometry = new THREE.CylinderGeometry(0.1, 0.15, 2, 7)
    const bigStemMaterial = new THREE.MeshStandardMaterial({
      color: 0x558B2F,
      flatShading: true
    })
    const bigStem = new THREE.Mesh(bigStemGeometry, bigStemMaterial)
    bigStem.position.y = 1.8
    bigStem.name = 'big_stem'
    bigStem.visible = false
    group.add(bigStem)

    const foliageGroup = new THREE.Group()
    foliageGroup.name = 'foliage_group'
    foliageGroup.visible = false

    const foliageColors = [0x4CAF50, 0x66BB6A, 0x81C784]
    for (let i = 0; i < 9; i++) {
      const leafSize = 0.35 + Math.random() * 0.25
      const leafGeometry = new THREE.SphereGeometry(leafSize, 5, 5)
      const leafMaterial = new THREE.MeshStandardMaterial({
        color: foliageColors[i % 3],
        flatShading: true
      })
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial)
      const angle = (i / 9) * Math.PI * 2
      const radius = 0.4 + Math.random() * 0.3
      const yOffset = (Math.random() - 0.5) * 0.5
      leaf.position.set(
        Math.cos(angle) * radius,
        yOffset,
        Math.sin(angle) * radius
      )
      leaf.scale.y = 0.7
      foliageGroup.add(leaf)
    }
    foliageGroup.position.y = 2.8
    group.add(foliageGroup)

    const flowerCenter = new THREE.Group()
    flowerCenter.name = 'flower_center'
    flowerCenter.visible = false

    const centerGeometry = new THREE.SphereGeometry(0.1, 5, 5)
    const centerMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD54F,
      flatShading: true
    })
    const center = new THREE.Mesh(centerGeometry, centerMaterial)
    flowerCenter.add(center)

    for (let i = 0; i < 6; i++) {
      const petalGeometry = new THREE.SphereGeometry(0.15, 5, 5)
      const petalMaterial = new THREE.MeshStandardMaterial({
        color: 0xF48FB1,
        flatShading: true
      })
      const petal = new THREE.Mesh(petalGeometry, petalMaterial)
      const angle = (i / 6) * Math.PI * 2
      petal.position.set(
        Math.cos(angle) * 0.2,
        0,
        Math.sin(angle) * 0.2
      )
      petal.scale.y = 0.5
      flowerCenter.add(petal)
    }
    flowerCenter.position.y = 3
    group.add(flowerCenter)

    for (let i = 0; i < 5; i++) {
      const fruitGeometry = new THREE.SphereGeometry(0.2, 6, 6)
      const fruitMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF7043,
        flatShading: true
      })
      const fruit = new THREE.Mesh(fruitGeometry, fruitMaterial)
      const angle = (i / 5) * Math.PI * 2
      fruit.position.set(
        Math.cos(angle) * 0.5,
        2.6 + Math.sin(i * 2.5) * 0.3,
        Math.sin(angle) * 0.5
      )
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
      size: 0.12,
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
    const maxFlowerCount = 60
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(maxFlowerCount * 3)
    const colors = new Float32Array(maxFlowerCount * 3)
    const basePositions = new Float32Array(maxFlowerCount * 3)

    for (let i = 0; i < maxFlowerCount; i++) {
      const angle = (i / maxFlowerCount) * Math.PI * 2
      const radius = 0.15 + (i % 6) * 0.08
      const heightOffset = Math.sin(i * 0.7) * 0.4
      basePositions[i * 3] = Math.cos(angle) * radius
      basePositions[i * 3 + 1] = 2.7 + heightOffset
      basePositions[i * 3 + 2] = Math.sin(angle) * radius
      positions[i * 3] = basePositions[i * 3]
      positions[i * 3 + 1] = basePositions[i * 3 + 1]
      positions[i * 3 + 2] = basePositions[i * 3 + 2]
      colors[i * 3] = 1
      colors[i * 3 + 1] = 0.55 + Math.random() * 0.15
      colors[i * 3 + 2] = 0.7 + Math.random() * 0.15
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('basePosition', new THREE.BufferAttribute(basePositions, 3))
    geometry.setDrawRange(0, 0)

    const material = new THREE.PointsMaterial({
      size: 0.1,
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

  const updateLowPolyPlant = (progress: number, stage: GrowthStage, fruit: number) => {
    if (!plantGroupRef.current) return

    const group = plantGroupRef.current

    const seedGroup = group.getObjectByName('seed_group') as THREE.Group
    const seed = group.getObjectByName('seed') as THREE.Mesh
    const seedLines = group.getObjectByName('seed_lines') as THREE.LineSegments
    const sproutStem = group.getObjectByName('sprout_stem') as THREE.Mesh
    const mainStem = group.getObjectByName('main_stem') as THREE.Mesh
    const bigStem = group.getObjectByName('big_stem') as THREE.Mesh
    const foliageGroup = group.getObjectByName('foliage_group') as THREE.Group
    const flowerCenter = group.getObjectByName('flower_center') as THREE.Group

    const sproutStart = 20
    const matureStart = 45
    const floweringStart = 70
    const fruitingStart = 90

    const FRUIT_INITIAL_SIZE = 0.15
    const FRUIT_GROWTH_RATE = 1.2

    if (seedGroup && seed) {
      if (progress < sproutStart * 0.8) {
        seedGroup.visible = true
        const t = progress / sproutStart
        const scale = 0.4 + t * 0.7
        seedGroup.scale.setScalar(scale)
        seedGroup.scale.y = scale * 0.6
        seedGroup.position.y = 0.62 + t * 0.12

        if (seed.material instanceof THREE.MeshStandardMaterial) {
          const colorProgress = t * 0.3
          seed.material.color.setHSL(0.08 + colorProgress * 0.05, 0.6, 0.45 + colorProgress * 0.1)
        }
        if (seedLines) {
          seedLines.rotation.y = t * Math.PI * 0.5
        }
      } else {
        seedGroup.visible = false
      }
    }

    if (sproutStem) {
      if (progress >= sproutStart * 0.5 && progress < matureStart) {
        sproutStem.visible = true
        const t = progress < sproutStart
          ? (progress - sproutStart * 0.5) / (sproutStart * 0.5)
          : 1
        sproutStem.scale.y = 0.3 + t * 1.2
        sproutStem.position.y = 0.7 + sproutStem.scale.y * 0.2
      } else {
        sproutStem.visible = false
      }
    }

    for (let i = 0; i < 2; i++) {
      const cotyledon = group.getObjectByName(`cotyledon_${i}`) as THREE.Mesh
      if (cotyledon) {
        if (progress >= sproutStart && progress < matureStart * 1.1) {
          cotyledon.visible = true
          const appearT = progress < sproutStart + 3
            ? (progress - sproutStart) / 3
            : 1
          const expandT = progress < sproutStart + 8
            ? (progress - sproutStart) / 8
            : 1

          const scale = 0.1 + appearT * 0.9
          cotyledon.scale.setScalar(scale)

          const side = i === 0 ? 1 : -1
          cotyledon.position.x = side * (0.03 + expandT * 0.1)
          cotyledon.position.y = 0.95 + appearT * 0.15

          cotyledon.rotation.z = side * (0.25 + expandT * 0.55)
          cotyledon.rotation.x = -Math.PI / 4 + expandT * Math.PI / 6
          cotyledon.rotation.y = side * expandT * 0.3

          if (cotyledon.material instanceof THREE.MeshStandardMaterial) {
            const lightenAmount = appearT * 0.2
            cotyledon.material.color.setHSL(0.25, 0.5 + appearT * 0.2, 0.6 + lightenAmount)
          }
        } else {
          cotyledon.visible = false
        }
      }
    }

    if (mainStem) {
      if (progress >= matureStart * 0.7 && progress < floweringStart) {
        mainStem.visible = true
        const t = progress < matureStart
          ? (progress - matureStart * 0.7) / (matureStart * 0.3)
          : 1
        mainStem.scale.y = 0.4 + t * 1.0
        mainStem.position.y = 0.9 + mainStem.scale.y * 0.6
      } else {
        mainStem.visible = false
      }
    }

    for (let i = 0; i < 6; i++) {
      const leaf = group.getObjectByName(`mature_leaf_${i}`) as THREE.Mesh
      if (leaf) {
        if (progress >= matureStart && progress < fruitingStart) {
          leaf.visible = true
          const delay = (i % 3) * 0.05
          const t = Math.max(0, Math.min(1, (progress - matureStart - delay * 100) / 10))
          leaf.scale.setScalar(0.3 + t * 1.1)
        } else {
          leaf.visible = false
        }
      }
    }

    if (bigStem) {
      if (progress >= floweringStart * 0.8) {
        bigStem.visible = true
        const t = progress < floweringStart
          ? (progress - floweringStart * 0.8) / (floweringStart * 0.2)
          : 1
        bigStem.scale.y = 0.5 + t * 0.8
        bigStem.position.y = 1.5 + bigStem.scale.y
      } else {
        bigStem.visible = false
      }
    }

    if (foliageGroup) {
      if (progress >= floweringStart * 0.9) {
        foliageGroup.visible = true
        const t = Math.min(1, (progress - floweringStart * 0.9) / 10)
        const scale = 0.2 + t * 1.1
        foliageGroup.scale.setScalar(scale)
        foliageGroup.position.y = 2.2 + bigStem.scale.y * 2 + 0.3
      } else {
        foliageGroup.visible = false
      }
    }

    if (flowerCenter) {
      if (progress >= floweringStart) {
        flowerCenter.visible = true
        const t = Math.min(1, (progress - floweringStart) / 10)
        flowerCenter.scale.setScalar(0.1 + t * 1.2)
        flowerCenter.position.y = 2.8 + bigStem.scale.y * 2 + 0.2
      } else {
        flowerCenter.visible = false
      }
    }

    for (let i = 0; i < 5; i++) {
      const fruitMesh = group.getObjectByName(`fruit_${i}`) as THREE.Mesh
      if (fruitMesh) {
        if (progress >= fruitingStart) {
          fruitMesh.visible = true
          const stageT = Math.min(1, (progress - fruitingStart) / 10)
          const fruitScale = FRUIT_INITIAL_SIZE * (1 + stageT * FRUIT_GROWTH_RATE) * (0.7 + fruit * 0.8)
          fruitMesh.scale.setScalar(fruitScale)
          const baseY = 2.6 + (bigStem ? bigStem.scale.y * 2 : 0)
          fruitMesh.position.y = baseY + Math.sin(i * 2.5) * 0.3
          if (fruitMesh.material instanceof THREE.MeshStandardMaterial) {
            const ripenT = Math.min(1, (progress - fruitingStart) / 8)
            fruitMesh.material.color.setHSL(0.05 + ripenT * 0.03, 0.8, 0.5 + ripenT * 0.1)
          }
        } else {
          fruitMesh.visible = false
        }
      }
    }
  }

  const updateFlowerParticles = (stage: GrowthStage, progress: number, time: number) => {
    if (!flowerParticlesRef.current) return

    const material = flowerParticlesRef.current.material as THREE.PointsMaterial
    const positions = flowerParticlesRef.current.geometry.attributes.position.array as Float32Array
    const basePositions = flowerParticlesRef.current.geometry.attributes.basePosition.array as Float32Array
    const maxCount = 60

    const floweringStart = 70
    const fruitingStart = 90

    if (stage === 'flowering' || stage === 'fruiting') {
      let progressInStage = 0
      if (stage === 'flowering') {
        progressInStage = Math.min(1, Math.max(0, (progress - floweringStart) / (fruitingStart - floweringStart)))
      } else {
        progressInStage = 1
      }

      const activeParticleCount = Math.floor(15 + progressInStage * 45)

      material.opacity = Math.min(1, material.opacity + 0.03)
      flowerParticlesRef.current.geometry.setDrawRange(0, activeParticleCount)

      for (let i = 0; i < activeParticleCount; i++) {
        const idx = i * 3
        const baseAngle = (i / maxCount) * Math.PI * 2
        const baseRadius = 0.2 + (i % 6) * 0.08
        const wobble = Math.sin(time * 1.5 + i * 0.8) * 0.15
        const floatY = Math.sin(time + i * 0.6) * 0.2
        const spreadRadius = baseRadius + progressInStage * 0.3

        positions[idx] = basePositions[idx] + Math.cos(baseAngle + time * 0.25 + i * 0.4) * (spreadRadius + wobble)
        positions[idx + 1] = basePositions[idx + 1] + floatY + progressInStage * 0.3
        positions[idx + 2] = basePositions[idx + 2] + Math.sin(baseAngle + time * 0.25 + i * 0.4) * (spreadRadius + wobble)
      }
      flowerParticlesRef.current.geometry.attributes.position.needsUpdate = true
    } else {
      material.opacity = Math.max(0, material.opacity - 0.03)
      flowerParticlesRef.current.geometry.setDrawRange(0, 0)
    }
  }

  const progressPercent = Math.min(100, Math.max(0, displayProgress))

  const stageThresholds = [0, 20, 45, 70, 90, 100]
  const stageIndex = ['seed', 'sprout', 'mature', 'flowering', 'fruiting'].indexOf(currentStage)
  const currentStageStart = stageThresholds[stageIndex]
  const nextStageStart = stageThresholds[stageIndex + 1] || 100
  const stageProgress = Math.min(100, Math.max(0, ((displayProgress - currentStageStart) / (nextStageStart - currentStageStart)) * 100))

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%'
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab'
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            padding: '16px 28px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div
            style={{
              color: displayColor,
              fontSize: '22px',
              fontWeight: 'bold',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              marginBottom: '10px',
              transition: 'color 0.1s ease',
              letterSpacing: '1px'
            }}
          >
            {STAGE_NAMES[currentStage]}
          </div>
          <div
            style={{
              width: '220px',
              height: '10px',
              background: 'rgba(42, 42, 74, 0.9)',
              borderRadius: '5px',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: displayColor,
                borderRadius: '5px',
                transition: 'width 0.3s ease, background-color 0.1s ease',
                boxShadow: `0 0 12px ${displayColor}60`
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px',
              padding: '0 4px'
            }}
          >
            <span
              style={{
                color: '#8892b0',
                fontSize: '11px',
                opacity: 0.9
              }}
            >
              阶段进度: {stageProgress.toFixed(0)}%
            </span>
            <span
              style={{
                color: '#ccd6f6',
                fontSize: '11px',
                opacity: 0.9
              }}
            >
              总进度: {progressPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

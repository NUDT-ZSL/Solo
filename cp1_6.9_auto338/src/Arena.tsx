import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import type { Amber, ArenaProps, ParticleLayer } from './types'

interface AmberObject {
  id: string
  group: THREE.Group
  sphere: THREE.Mesh
  layers: {
    system: THREE.Points
    basePositions: Float32Array
    baseSizes: Float32Array
    config: ParticleLayer
    angleOffset: number
  }[]
  audioEl: HTMLAudioElement | null
  audioCtx: AudioContext | null
  analyser: AnalyserNode | null
  sourceNode: MediaElementAudioSourceNode | null
  isSpinning: boolean
  spinStartTime: number
  isHovered: boolean
  mouseOffset: THREE.Vector3
  spawnTime: number
}

const PARTICLE_COUNT_PER_LAYER = 120
const SPHERE_RADIUS = 3
const SPIN_DURATION = 5000

function easeOutElastic(t: number): number {
  const p = 0.3
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1
}

export default function Arena({
  ambers,
  maxVisibleAmbers,
  onAmberClick,
  focusedAmberId,
  onFocusAmber,
  newAmberId,
}: ArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const amberObjectsRef = useRef<Map<string, AmberObject>>(new Map())
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const mouseWorldRef = useRef<THREE.Vector3>(new THREE.Vector3())
  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const cameraAnglesRef = useRef({ theta: 0, phi: Math.PI / 4 })
  const cameraDistanceRef = useRef(18)
  const frameIdRef = useRef<number>(0)
  const ambersRef = useRef<Amber[]>([])

  useEffect(() => {
    ambersRef.current = ambers
  }, [ambers])

  const hoveredAmberIdRef = useRef<string | null>(null)

  const layerDefaults = useMemo(() => ({
    low: { radius: 2.5, speed: 0.3, color: '#1a3c6e' },
    mid: { radius: 3.5, speed: 0.6, color: '#2ecc71' },
    high: { radius: 4.5, speed: 0.9, color: '#ff6b35' },
  }), [])

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0b0b1a, 0.02)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setClearColor(0x000000, 0)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0x404060, 0.6)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0xffd700, 1, 50)
    pointLight1.position.set(10, 10, 10)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0x6666ff, 0.6, 50)
    pointLight2.position.set(-10, -5, 5)
    scene.add(pointLight2)

    const updateCameraPosition = () => {
      const { theta, phi } = cameraAnglesRef.current
      const dist = cameraDistanceRef.current
      camera.position.x = dist * Math.sin(phi) * Math.cos(theta)
      camera.position.y = dist * Math.cos(phi)
      camera.position.z = dist * Math.sin(phi) * Math.sin(theta)
      camera.lookAt(0, 0, 0)
    }
    updateCameraPosition()

    const starsGeometry = new THREE.BufferGeometry()
    const starCount = 500
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 60 + Math.random() * 40
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPositions[i + 2] = r * Math.cos(phi)
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })
    const stars = new THREE.Points(starsGeometry, starsMaterial)
    scene.add(stars)

    const createAmberObject = (amber: Amber): AmberObject => {
      const group = new THREE.Group()
      group.position.set(amber.position.x, amber.position.y, amber.position.z)

      const sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, 48, 48)
      const sphereMat = new THREE.MeshPhongMaterial({
        color: 0x2a2a4a,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        shininess: 100,
        specular: 0xffd700,
      })
      const sphere = new THREE.Mesh(sphereGeo, sphereMat)
      group.add(sphere)

      const wireGeo = new THREE.SphereGeometry(SPHERE_RADIUS * 1.01, 24, 24)
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.08,
        wireframe: true,
      })
      const wire = new THREE.Mesh(wireGeo, wireMat)
      group.add(wire)

      const layers: AmberObject['layers'] = []
      const layerConfigs = [
        { band: 'low' as const, ...layerDefaults.low, data: amber.layers.find(l => l.freqBand === 'low')?.energyData || [] },
        { band: 'mid' as const, ...layerDefaults.mid, data: amber.layers.find(l => l.freqBand === 'mid')?.energyData || [] },
        { band: 'high' as const, ...layerDefaults.high, data: amber.layers.find(l => l.freqBand === 'high')?.energyData || [] },
      ]

      layerConfigs.forEach((cfg, layerIdx) => {
        const positions = new Float32Array(PARTICLE_COUNT_PER_LAYER * 3)
        const colors = new Float32Array(PARTICLE_COUNT_PER_LAYER * 3)
        const sizes = new Float32Array(PARTICLE_COUNT_PER_LAYER)
        const basePositions = new Float32Array(PARTICLE_COUNT_PER_LAYER * 3)

        const colorObj = new THREE.Color(cfg.color)

        for (let i = 0; i < PARTICLE_COUNT_PER_LAYER; i++) {
          const phi = Math.acos(2 * Math.random() - 1)
          const theta = Math.random() * Math.PI * 2

          const x = cfg.radius * Math.sin(phi) * Math.cos(theta)
          const y = cfg.radius * Math.sin(phi) * Math.sin(theta)
          const z = cfg.radius * Math.cos(phi)

          positions[i * 3] = x
          positions[i * 3 + 1] = y
          positions[i * 3 + 2] = z
          basePositions[i * 3] = x
          basePositions[i * 3 + 1] = y
          basePositions[i * 3 + 2] = z

          colors[i * 3] = colorObj.r
          colors[i * 3 + 1] = colorObj.g
          colors[i * 3 + 2] = colorObj.b

          sizes[i] = 2 + Math.random() * 4
        }

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

        const mat = new THREE.PointsMaterial({
          size: 4,
          vertexColors: true,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        })

        const points = new THREE.Points(geo, mat)
        group.add(points)

        layers.push({
          system: points,
          basePositions,
          baseSizes: sizes,
          config: {
            freqBand: cfg.band,
            radius: cfg.radius,
            speed: cfg.speed,
            color: cfg.color,
            particleCount: PARTICLE_COUNT_PER_LAYER,
            energyData: cfg.data,
          },
          angleOffset: layerIdx * 0.7,
        })
      })

      group.scale.set(0, 0, 0)

      return {
        id: amber.id,
        group,
        sphere,
        layers,
        audioEl: null,
        audioCtx: null,
        analyser: null,
        sourceNode: null,
        isSpinning: false,
        spinStartTime: 0,
        isHovered: false,
        mouseOffset: new THREE.Vector3(),
        spawnTime: newAmberId === amber.id ? performance.now() : 0,
      }
    }

    let audioCtxSingleton: AudioContext | null = null

    const getOrCreateAudioCtx = () => {
      if (!audioCtxSingleton) {
        audioCtxSingleton = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      return audioCtxSingleton
    }

    const playAmberAudio = (amber: Amber, obj: AmberObject) => {
      if (!obj.audioEl) {
        const audio = new Audio(amber.audio)
        audio.loop = true
        audio.crossOrigin = 'anonymous'
        obj.audioEl = audio

        try {
          const ctx = getOrCreateAudioCtx()
          const source = ctx.createMediaElementSource(audio)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 256
          source.connect(analyser)
          analyser.connect(ctx.destination)
          obj.audioCtx = ctx
          obj.sourceNode = source
          obj.analyser = analyser
        } catch (e) {
          console.warn('Audio analysis setup failed:', e)
        }
      }

      if (obj.audioCtx?.state === 'suspended') {
        obj.audioCtx.resume()
      }
      obj.audioEl.currentTime = 0
      obj.audioEl.play().catch(console.warn)
    }

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = 0.016

      const currentAmbers = ambersRef.current
      const visibleAmbers = currentAmbers.slice(-maxVisibleAmbers)
      const visibleIds = new Set(visibleAmbers.map(a => a.id))

      currentAmbers.forEach(amber => {
        let obj = amberObjectsRef.current.get(amber.id)
        if (!obj) {
          obj = createAmberObject(amber)
          amberObjectsRef.current.set(amber.id, obj)
          scene.add(obj.group)
        }

        const isVisible = visibleIds.has(amber.id)
        obj.group.visible = isVisible

        if (!isVisible) return

        if (obj.spawnTime > 0) {
          const t = Math.min(1, (now - obj.spawnTime) / 800)
          const scale = easeOutElastic(t)
          obj.group.scale.setScalar(scale)
          if (t >= 1) obj.spawnTime = 0
        }

        if (obj.isSpinning) {
          const spinT = (now - obj.spinStartTime) / SPIN_DURATION
          if (spinT >= 1) {
            obj.isSpinning = false
            obj.group.rotation.y = 0
          } else {
            const eased = 1 - Math.pow(1 - spinT, 3)
            obj.group.rotation.y = eased * Math.PI * 2
          }
        }

        const freqData: Record<string, number> = { low: 0, mid: 0, high: 0 }
        if (obj.analyser) {
          const arr = new Uint8Array(obj.analyser.frequencyBinCount)
          obj.analyser.getByteFrequencyData(arr)
          const third = Math.floor(arr.length / 3)
          let sumL = 0, sumM = 0, sumH = 0
          for (let i = 0; i < third; i++) sumL += arr[i]
          for (let i = third; i < third * 2; i++) sumM += arr[i]
          for (let i = third * 2; i < arr.length; i++) sumH += arr[i]
          freqData.low = sumL / third / 255
          freqData.mid = sumM / third / 255
          freqData.high = sumH / (arr.length - third * 2) / 255
        }

        obj.layers.forEach((layer, layerIdx) => {
          const positions = layer.system.geometry.attributes.position.array as Float32Array
          const sizes = layer.system.geometry.attributes.size.array as Float32Array
          const energy = freqData[layer.config.freqBand] || 0
          const angleDelta = layer.config.speed * dt + layer.angleOffset

          for (let i = 0; i < PARTICLE_COUNT_PER_LAYER; i++) {
            const bx = layer.basePositions[i * 3]
            const by = layer.basePositions[i * 3 + 1]
            const bz = layer.basePositions[i * 3 + 2]

            const cosA = Math.cos(angleDelta)
            const sinA = Math.sin(angleDelta)
            let x = bx * cosA - bz * sinA
            let z = bx * sinA + bz * cosA
            let y = by

            const tiltA = angleDelta * 0.5 * (layerIdx % 2 === 0 ? 1 : -1)
            const cosT = Math.cos(tiltA)
            const sinT = Math.sin(tiltA)
            const y2 = y * cosT - z * sinT
            const z2 = y * sinT + z * cosT
            y = y2
            z = z2

            if (obj.isHovered) {
              x += obj.mouseOffset.x
              y += obj.mouseOffset.y
              z += obj.mouseOffset.z
              ;(layer.system.material as THREE.PointsMaterial).opacity = 0.6
            } else {
              ;(layer.system.material as THREE.PointsMaterial).opacity = 0.8
            }

            positions[i * 3] = x
            positions[i * 3 + 1] = y
            positions[i * 3 + 2] = z

            const baseSize = layer.baseSizes[i]
            sizes[i] = baseSize * (1 + energy * 2)
          }

          layer.system.geometry.attributes.position.needsUpdate = true
          layer.system.geometry.attributes.size.needsUpdate = true
          ;(layer.system.material as THREE.PointsMaterial).size = 4 + energy * 6
        })
      })

      amberObjectsRef.current.forEach((obj, id) => {
        if (!currentAmbers.find(a => a.id === id)) {
          scene.remove(obj.group)
          if (obj.audioEl) obj.audioEl.pause()
          amberObjectsRef.current.delete(id)
        }
      })

      if (focusedAmberId) {
        const obj = amberObjectsRef.current.get(focusedAmberId)
        if (obj && cameraRef.current) {
          const target = new THREE.Vector3()
          obj.group.getWorldPosition(target)
          const dir = new THREE.Vector3().subVectors(cameraRef.current.position, target).normalize()
          const desiredPos = target.clone().add(dir.multiplyScalar(12))
          cameraRef.current.position.lerp(desiredPos, 0.05)
          cameraRef.current.lookAt(target)
        }
      } else {
        updateCameraPosition()
      }

      stars.rotation.y += dt * 0.005

      renderer.render(scene, camera)
    }
    animate()

    const dom = renderer.domElement

    const updateMouseWorld = (clientX: number, clientY: number) => {
      if (!containerRef.current || !cameraRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
      const target = new THREE.Vector3()
      raycasterRef.current.ray.intersectPlane(plane, target)
      if (target) mouseWorldRef.current.copy(target)
    }

    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
      dom.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingRef.current && !focusedAmberId) {
        const dx = e.clientX - lastMouseRef.current.x
        const dy = e.clientY - lastMouseRef.current.y

        cameraAnglesRef.current.theta -= dx * 0.005
        cameraAnglesRef.current.phi = Math.max(
          Math.PI / 6,
          Math.min(Math.PI * 5 / 6, cameraAnglesRef.current.phi - dy * 0.005)
        )
        lastMouseRef.current = { x: e.clientX, y: e.clientY }
      }

      updateMouseWorld(e.clientX, e.clientY)

      if (!isDraggingRef.current && cameraRef.current && sceneRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
        const currentAmbers = ambersRef.current
        const visibleAmbers = currentAmbers.slice(-maxVisibleAmbers)
        const meshes: THREE.Object3D[] = []
        const idMap = new Map<THREE.Object3D, string>()
        visibleAmbers.forEach(a => {
          const obj = amberObjectsRef.current.get(a.id)
          if (obj) {
            meshes.push(obj.sphere)
            idMap.set(obj.sphere, a.id)
          }
        })
        const intersects = raycasterRef.current.intersectObjects(meshes, false)
        const hoveredId = intersects.length > 0 ? idMap.get(intersects[0].object) || null : null

        if (hoveredId !== hoveredAmberIdRef.current) {
          if (hoveredAmberIdRef.current) {
            const prev = amberObjectsRef.current.get(hoveredAmberIdRef.current)
            if (prev) prev.isHovered = false
          }
          hoveredAmberIdRef.current = hoveredId
          dom.style.cursor = hoveredId ? 'pointer' : 'default'
        }

        if (hoveredId) {
          const obj = amberObjectsRef.current.get(hoveredId)
          if (obj) {
            obj.isHovered = true
            const groupPos = new THREE.Vector3()
            obj.group.getWorldPosition(groupPos)
            const offset = new THREE.Vector3()
              .subVectors(mouseWorldRef.current, groupPos)
              .clampLength(0, 0.3)
            obj.mouseOffset.copy(offset)
          }
        }
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (isDraggingRef.current) {
        const moved = Math.abs(e.clientX - lastMouseRef.current.x + e.clientY - lastMouseRef.current.y)
        if (moved < 5 && cameraRef.current && sceneRef.current) {
          raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
          const currentAmbers = ambersRef.current
          const visibleAmbers = currentAmbers.slice(-maxVisibleAmbers)
          const meshes: THREE.Object3D[] = []
          const amberMap = new Map<THREE.Object3D, Amber>()
          visibleAmbers.forEach(a => {
            const obj = amberObjectsRef.current.get(a.id)
            if (obj) {
              meshes.push(obj.sphere)
              amberMap.set(obj.sphere, a)
            }
          })
          const intersects = raycasterRef.current.intersectObjects(meshes, false)
          if (intersects.length > 0) {
            const amber = amberMap.get(intersects[0].object)
            if (amber) {
              const obj = amberObjectsRef.current.get(amber.id)
              if (obj) {
                obj.isSpinning = true
                obj.spinStartTime = performance.now()
                playAmberAudio(amber, obj)
              }
              onAmberClick(amber)
            }
          }
        }
        isDraggingRef.current = false
        try { dom.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
      }
    }

    const handleWheel = (e: WheelEvent) => {
      if (focusedAmberId) return
      e.preventDefault()
      cameraDistanceRef.current = Math.max(8, Math.min(40, cameraDistanceRef.current + e.deltaY * 0.02))
    }

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }

    dom.addEventListener('pointerdown', handlePointerDown)
    dom.addEventListener('pointermove', handlePointerMove)
    dom.addEventListener('pointerup', handlePointerUp)
    dom.addEventListener('pointercancel', handlePointerUp)
    dom.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameIdRef.current)
      dom.removeEventListener('pointerdown', handlePointerDown)
      dom.removeEventListener('pointermove', handlePointerMove)
      dom.removeEventListener('pointerup', handlePointerUp)
      dom.removeEventListener('pointercancel', handlePointerUp)
      dom.removeEventListener('wheel', handleWheel)
      window.removeEventListener('resize', handleResize)
      amberObjectsRef.current.forEach(obj => {
        if (obj.audioEl) { obj.audioEl.pause(); obj.audioEl = null }
      })
      if (audioCtxSingleton) { audioCtxSingleton.close() }
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }
      rendererRef.current?.dispose()
    }
  }, [maxVisibleAmbers, onAmberClick, focusedAmberId, newAmberId, layerDefaults])

  useEffect(() => {
    if (focusedAmberId) {
      onFocusAmber(focusedAmberId)
    }
  }, [focusedAmberId, onFocusAmber])

  return (
    <div className="arena-container" ref={containerRef}>
      <div className="star-field" />
      {ambers.length === 0 && (
        <div className="empty-hint">
          <div className="empty-hint-icon">✨</div>
          <div className="empty-hint-text">点击右上角麦克风，创建你的第一颗声音琥珀</div>
        </div>
      )}
    </div>
  )
}

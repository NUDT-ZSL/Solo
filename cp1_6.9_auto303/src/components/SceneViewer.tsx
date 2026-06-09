import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface ChimeNote {
  pitch: number
  time: number
  duration: number
  velocity: number
}

interface SceneViewerProps {
  notes: ChimeNote[]
  compositionId?: string
}

const MIN_PITCH = 48
const MAX_PITCH = 83
const RING_RADIUS = 2.5
const TUBE_RADIUS = 0.1
const SPACING = 0.8
const MIN_TUBE_LEN = 8 / 100 * 3
const MAX_TUBE_LEN = 30 / 100 * 3
const COLLISION_THRESHOLD = 0.3
const DAMPING = 0.98
const WIND_INFLUENCE = 0.3
const GRAVITY = 9.8

interface ChimeState {
  angleX: number
  angleZ: number
  angVelX: number
  angVelZ: number
  tubeLength: number
  frequency: number
  color: THREE.Color
  mesh: THREE.Mesh
  stringMesh: THREE.Line
  anchor: THREE.Vector3
  lastCollisionTime: number
}

interface GlowEffect {
  mesh: THREE.Mesh
  startTime: number
  position: THREE.Vector3
  color: THREE.Color
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function pitchToTubeLength(pitch: number): number {
  const t = (pitch - MIN_PITCH) / (MAX_PITCH - MIN_PITCH)
  return MAX_TUBE_LEN - t * (MAX_TUBE_LEN - MIN_TUBE_LEN)
}

function pitchToColor(pitch: number): THREE.Color {
  const t = (pitch - MIN_PITCH) / (MAX_PITCH - MIN_PITCH)
  const hue = 240 - t * (240 - 60)
  return new THREE.Color().setHSL(hue / 360, 0.7, 0.55)
}

export const SceneViewer: React.FC<SceneViewerProps> = ({ notes, compositionId }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showFPS, setShowFPS] = useState(false)
  const [fps, setFps] = useState(60)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!containerRef.current || notes.length === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xeaf2f7)
    scene.fog = new THREE.Fog(0xeaf2f7, 8, 20)

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(0, 1, 7)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 3
    controls.maxDistance = 15
    controls.maxPolarAngle = Math.PI * 0.85
    controls.target.set(0, -0.5, 0)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2)
    sunLight.position.set(5, 10, 5)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.set(2048, 2048)
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 50
    sunLight.shadow.camera.left = -8
    sunLight.shadow.camera.right = 8
    sunLight.shadow.camera.top = 8
    sunLight.shadow.camera.bottom = -8
    scene.add(sunLight)

    const rimLight = new THREE.DirectionalLight(0xdcefff, 0.5)
    rimLight.position.set(-5, 3, -5)
    scene.add(rimLight)

    const ringGeometry = new THREE.TorusGeometry(RING_RADIUS, 0.05, 16, 64)
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      metalness: 0.7,
      roughness: 0.3
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 2.5
    ring.castShadow = true
    scene.add(ring)

    const topHook = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: 0xb08050, metalness: 0.8, roughness: 0.2 })
    )
    topHook.position.y = 2.75
    scene.add(topHook)

    const topCord = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 2.75, 0),
        new THREE.Vector3(0, 3.8, 0)
      ]),
      new THREE.LineBasicMaterial({ color: 0x444444 })
    )
    scene.add(topCord)

    const chimes: ChimeState[] = []
    const sortedNotes = [...notes].sort((a, b) => a.pitch - b.pitch)
    const count = sortedNotes.length
    const centerAngle = (count - 1) * SPACING / 2

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const masterGain = audioCtx.createGain()
    masterGain.gain.value = 0.4
    masterGain.connect(audioCtx.destination)

    const glowMaterials: THREE.ShaderMaterial[] = []

    function createGlow(position: THREE.Vector3, color: THREE.Color) {
      const glowGeometry = new THREE.RingGeometry(0.01, 0.05, 32)
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: 0.6 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            float dist = length(vUv - 0.5) * 2.0;
            float alpha = uOpacity * (1.0 - smoothstep(0.0, 1.0, dist));
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })

      const glow = new THREE.Mesh(glowGeometry, glowMaterial)
      glow.position.copy(position)
      glow.lookAt(camera.position)
      scene.add(glow)

      glowMaterials.push(glowMaterial)

      const start = performance.now()
      const animateGlow = () => {
        const elapsed = (performance.now() - start) / 1000
        if (elapsed > 0.3) {
          scene.remove(glow)
          glowGeometry.dispose()
          glowMaterial.dispose()
          const idx = glowMaterials.indexOf(glowMaterial)
          if (idx >= 0) glowMaterials.splice(idx, 1)
          return
        }
        const t = elapsed / 0.3
        const scale = 0.5 + t * (2 - 0.5)
        glow.scale.set(scale, scale, 1)
        glowMaterial.uniforms.uOpacity.value = 0.6 * (1 - t)
        glow.lookAt(camera.position)
        requestAnimationFrame(animateGlow)
      }
      requestAnimationFrame(animateGlow)
    }

    function playCollisionSound(freq1: number, freq2: number) {
      if (audioCtx.state === 'suspended') audioCtx.resume()

      const playTone = (freq: number, pan: number) => {
        const osc1 = audioCtx.createOscillator()
        const osc2 = audioCtx.createOscillator()
        const osc3 = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        const panner = audioCtx.createStereoPanner()

        osc1.type = 'sine'
        osc1.frequency.value = freq
        osc2.type = 'sine'
        osc2.frequency.value = freq * 2
        osc3.type = 'sine'
        osc3.frequency.value = freq * 3

        const gain1 = audioCtx.createGain()
        gain1.gain.value = 0.6
        const gain2 = audioCtx.createGain()
        gain2.gain.value = 0.25
        const gain3 = audioCtx.createGain()
        gain3.gain.value = 0.1

        osc1.connect(gain1).connect(panner)
        osc2.connect(gain2).connect(panner)
        osc3.connect(gain3).connect(panner)
        panner.connect(gainNode).connect(masterGain)
        panner.pan.value = pan

        const now = audioCtx.currentTime
        gainNode.gain.setValueAtTime(0.0, now)
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

        osc1.start(now)
        osc2.start(now)
        osc3.start(now)
        osc1.stop(now + 1.2)
        osc2.stop(now + 1.2)
        osc3.stop(now + 1.2)
      }

      playTone(freq1, -0.3)
      playTone(freq2, 0.3)
    }

    sortedNotes.forEach((note, i) => {
      const angle = (i * SPACING - centerAngle) / RING_RADIUS
      const anchorX = RING_RADIUS * Math.cos(angle - Math.PI / 2)
      const anchorZ = RING_RADIUS * Math.sin(angle - Math.PI / 2)
      const anchor = new THREE.Vector3(anchorX, 2.5, anchorZ)

      const tubeLength = pitchToTubeLength(note.pitch)
      const color = pitchToColor(note.pitch)

      const velocityT = (note.velocity - 1) / 9
      const metalness = 0.3 + velocityT * 0.6
      const roughness = 0.7 - velocityT * 0.5
      const opacity = 0.5 + velocityT * 0.5

      const tubeMaterial = new THREE.MeshPhysicalMaterial({
        color,
        metalness,
        roughness,
        transparent: true,
        opacity,
        clearcoat: velocityT * 0.8,
        clearcoatRoughness: 0.2,
        reflectivity: 0.5 + velocityT * 0.4
      })

      const tubeGeometry = new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, tubeLength, 24, 1, true)
      const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial)
      tubeMesh.castShadow = true
      tubeMesh.receiveShadow = true
      tubeMesh.position.set(anchorX, 2.5 - tubeLength / 2, anchorZ)
      scene.add(tubeMesh)

      const stringGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(anchorX, 2.5, anchorZ),
        new THREE.Vector3(anchorX, 2.5 - tubeLength / 2, anchorZ)
      ])
      const stringMaterial = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.6 })
      const stringMesh = new THREE.Line(stringGeometry, stringMaterial)
      scene.add(stringMesh)

      chimes.push({
        angleX: (Math.random() - 0.5) * 0.05,
        angleZ: (Math.random() - 0.5) * 0.05,
        angVelX: 0,
        angVelZ: 0,
        tubeLength,
        frequency: midiToFreq(note.pitch),
        color,
        mesh: tubeMesh,
        stringMesh,
        anchor,
        lastCollisionTime: 0
      })
    })

    const planeGeometry = new THREE.CircleGeometry(12, 48)
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f0e8,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.5
    })
    const ground = new THREE.Mesh(planeGeometry, planeMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -3.5
    ground.receiveShadow = true
    scene.add(ground)

    let lastTime = performance.now()
    let frameCount = 0
    let fpsTime = 0
    let collisionCheckAccumulator = 0
    const collisionCooldown = 150

    function animate() {
      const now = performance.now()
      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      frameCount++
      fpsTime += delta
      if (fpsTime >= 0.5) {
        setFps(Math.round(frameCount / fpsTime))
        frameCount = 0
        fpsTime = 0
      }

      const windSpeed = 0.5 + 0.75 * (1 + Math.sin(now * 0.0005))
      const windDirShift = Math.sin(now * 0.0001) * Math.PI * 0.3
      const windDirX = Math.cos(windDirShift) * windSpeed * WIND_INFLUENCE
      const windDirZ = Math.sin(windDirShift) * windSpeed * WIND_INFLUENCE
      const gustFactor = 1 + 0.3 * Math.sin(now * 0.002 + 1.5) * Math.sin(now * 0.0007)

      const chimePositions: THREE.Vector3[] = []

      chimes.forEach((chime) => {
        const effLen = chime.tubeLength
        const g = GRAVITY

        const restAngleX = windDirX * gustFactor * delta * 10 / effLen
        const restAngleZ = windDirZ * gustFactor * delta * 10 / effLen

        const angAccX = -(g / effLen) * Math.sin(chime.angleX) + restAngleX
        const angAccZ = -(g / effLen) * Math.sin(chime.angleZ) + restAngleZ

        chime.angVelX = (chime.angVelX + angAccX * delta) * DAMPING
        chime.angVelZ = (chime.angVelZ + angAccZ * delta) * DAMPING

        chime.angleX += chime.angVelX * delta
        chime.angleZ += chime.angVelZ * delta

        const maxAngle = 0.4
        chime.angleX = Math.max(-maxAngle, Math.min(maxAngle, chime.angleX))
        chime.angleZ = Math.max(-maxAngle, Math.min(maxAngle, chime.angleZ))

        const tubeMid = chime.tubeLength / 2
        const pivotX = chime.anchor.x
        const pivotY = chime.anchor.y
        const pivotZ = chime.anchor.z

        const sinX = Math.sin(chime.angleX)
        const cosX = Math.cos(chime.angleX)
        const sinZ = Math.sin(chime.angleZ)
        const cosZ = Math.cos(chime.angleZ)

        const worldX = pivotX + tubeMid * sinZ * cosX
        const worldY = pivotY - tubeMid * cosZ * cosX
        const worldZ = pivotZ - tubeMid * sinX

        chime.mesh.position.set(worldX, worldY, worldZ)
        chime.mesh.rotation.order = 'ZXY'
        chime.mesh.rotation.z = -chime.angleZ
        chime.mesh.rotation.x = -chime.angleX

        const stringPositions = new Float32Array([
          pivotX, pivotY, pivotZ,
          worldX - (chime.tubeLength / 2 - 0.05) * sinZ * cosX,
          worldY + (chime.tubeLength / 2 - 0.05) * cosZ * cosX,
          worldZ + (chime.tubeLength / 2 - 0.05) * sinX
        ])
        chime.stringMesh.geometry.setAttribute('position', new THREE.BufferAttribute(stringPositions, 3))
        chime.stringMesh.geometry.attributes.position.needsUpdate = true

        const bottomX = pivotX + chime.tubeLength * sinZ * cosX
        const bottomY = pivotY - chime.tubeLength * cosZ * cosX
        const bottomZ = pivotZ - chime.tubeLength * sinX
        chimePositions.push(new THREE.Vector3(bottomX, bottomY, bottomZ))
      })

      collisionCheckAccumulator += delta
      if (collisionCheckAccumulator >= 1 / 30) {
        collisionCheckAccumulator = 0

        for (let i = 0; i < chimes.length; i++) {
          for (let j = i + 1; j < chimes.length; j++) {
            const dist = chimePositions[i].distanceTo(chimePositions[j])
            if (dist < COLLISION_THRESHOLD) {
              const timeSinceLast = now - Math.max(chimes[i].lastCollisionTime, chimes[j].lastCollisionTime)
              if (timeSinceLast > collisionCooldown) {
                chimes[i].lastCollisionTime = now
                chimes[j].lastCollisionTime = now

                const midPoint = chimePositions[i].clone().add(chimePositions[j]).multiplyScalar(0.5)
                const mixedColor = chimes[i].color.clone().lerp(chimes[j].color, 0.5)
                createGlow(midPoint, mixedColor)

                playCollisionSound(chimes[i].frequency, chimes[j].frequency)

                const relVelI = chimes[i].angVelX + chimes[i].angVelZ
                const relVelJ = chimes[j].angVelX + chimes[j].angVelZ
                const impact = Math.abs(relVelI - relVelJ) * 0.5
                chimes[i].angVelX *= -0.7
                chimes[i].angVelZ *= -0.7
                chimes[j].angVelX *= -0.7
                chimes[j].angVelZ *= -0.7
                if (impact > 0.01) {
                  chimes[i].angVelX += (Math.random() - 0.5) * impact
                  chimes[i].angVelZ += (Math.random() - 0.5) * impact
                  chimes[j].angVelX += (Math.random() - 0.5) * impact
                  chimes[j].angVelZ += (Math.random() - 0.5) * impact
                }
              }
            }
          }
        }
      }

      controls.update()
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    let frameId = requestAnimationFrame(animate)

    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose())
          } else {
            obj.material?.dispose()
          }
        }
      })
      audioCtx.close()
    }
  }, [notes, compositionId])

  return (
    <div
      ref={containerRef}
      className={`scene-container ${isMobile ? 'scene-mobile' : 'scene-desktop'}`}
      onDoubleClick={() => setShowFPS(s => !s)}
      style={{ cursor: 'grab' }}
    >
      <div className="hint-overlay">
        🖱️ 拖拽旋转视角 · 滚轮缩放 · 双击切换FPS
      </div>
      {showFPS && (
        <div className="fps-counter">{fps} FPS</div>
      )}
      {notes.length === 0 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(0,0,0,0.3)',
          fontSize: 16
        }}>
          请先在编辑器中添加音符
        </div>
      )}
    </div>
  )
}

export default SceneViewer

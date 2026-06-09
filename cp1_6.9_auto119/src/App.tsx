import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { generateMaze, MazeData, hslToHex } from './MazeGenerator'
import { OpticsManager, OpticsState } from './OpticsManager'
import { buildScene, SceneHandle } from './SceneBuilder'

const MOVE_SPEED = 3
const MIN_WALL_DISTANCE = 0.5
const CAMERA_PITCH_MIN = -30 * Math.PI / 180
const CAMERA_PITCH_MAX = 60 * Math.PI / 180
const SHAKE_AMPLITUDE = 0.02
const SHAKE_FREQ = 8
const SHAKE_DURATION = 0.3
const PLAYER_HEIGHT = 1.5

interface UIState {
  distance: string
  reflectivity: string
  dominantHue: number
  fps: number
  showVictory: boolean
  punished: boolean
}

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneHandleRef = useRef<SceneHandle | null>(null)
  const mazeDataRef = useRef<MazeData | null>(null)
  const opticsRef = useRef<OpticsManager | null>(null)

  const keysRef = useRef<Set<string>>(new Set())
  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const shakeStateRef = useRef({ active: false, startTime: 0 })
  const lastTimeRef = useRef(performance.now())
  const frameCountRef = useRef(0)
  const fpsTimeRef = useRef(performance.now())
  const victoryTriggeredRef = useRef(false)

  const [ui, setUi] = useState<UIState>({
    distance: '0.00 m',
    reflectivity: '60%',
    dominantHue: 0,
    fps: 60,
    showVictory: false,
    punished: false
  })

  const performCollisionCheck = useCallback((pos: THREE.Vector3, colliders: THREE.Box3[]): {
    blocked: boolean; nearest: number
  } => {
    const playerBox = new THREE.Box3(
      new THREE.Vector3(pos.x - 0.3, pos.y - PLAYER_HEIGHT, pos.z - 0.3),
      new THREE.Vector3(pos.x + 0.3, pos.y + 0.3, pos.z + 0.3)
    )
    let nearest = Infinity
    let blocked = false
    const raycaster = new THREE.Raycaster()
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0.707, 0, 0.707),
      new THREE.Vector3(-0.707, 0, 0.707),
      new THREE.Vector3(0.707, 0, -0.707),
      new THREE.Vector3(-0.707, 0, -0.707)
    ]
    for (const dir of directions) {
      raycaster.set(pos, dir)
      raycaster.far = MIN_WALL_DISTANCE
      for (const box of colliders) {
        if (playerBox.intersectsBox(box)) {
          blocked = true
        }
        const hit = raycaster.ray.intersectBox(box, new THREE.Vector3())
        if (hit) {
          const dist = pos.distanceTo(hit)
          nearest = Math.min(nearest, dist)
          if (dist < MIN_WALL_DISTANCE * 0.7) blocked = true
        }
      }
    }
    return { blocked, nearest }
  }, [])

  useEffect(() => {
    if (!mountRef.current) return

    const mazeData = generateMaze()
    mazeDataRef.current = mazeData
    const optics = new OpticsManager(mazeData)
    opticsRef.current = optics
    const handle = buildScene(mazeData, optics)
    sceneHandleRef.current = handle

    handle.camera.position.set(mazeData.startPosition.x, PLAYER_HEIGHT, mazeData.startPosition.z)
    yawRef.current = Math.PI / 4
    pitchRef.current = 0

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const colliders = handle.getWallColliders()

    const onResize = () => {
      handle.camera.aspect = window.innerWidth / window.innerHeight
      handle.camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        isDraggingRef.current = true
        lastMouseRef.current = { x: e.clientX, y: e.clientY }
      }
    }
    const onMouseUp = () => {
      isDraggingRef.current = false
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - lastMouseRef.current.x
      const dy = e.clientY - lastMouseRef.current.y
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
      yawRef.current -= dx * 0.0025
      pitchRef.current -= dy * 0.0025
      pitchRef.current = Math.max(CAMERA_PITCH_MIN, Math.min(CAMERA_PITCH_MAX, pitchRef.current))
    }
    const onContextMenu = (e: MouseEvent) => e.preventDefault()
    renderer.domElement.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('contextmenu', onContextMenu)

    let animId = 0
    const animate = () => {
      animId = requestAnimationFrame(animate)

      const now = performance.now()
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000)
      lastTimeRef.current = now

      frameCountRef.current++
      if (now - fpsTimeRef.current >= 500) {
        const fps = Math.round(frameCountRef.current * 1000 / (now - fpsTimeRef.current))
        frameCountRef.current = 0
        fpsTimeRef.current = now
        setUi(prev => ({ ...prev, fps }))
      }

      const keys = keysRef.current
      const forward = new THREE.Vector3(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current))
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
      const move = new THREE.Vector3()

      if (keys.has('w') || keys.has('arrowup')) move.add(forward)
      if (keys.has('s') || keys.has('arrowdown')) move.sub(forward)
      if (keys.has('d') || keys.has('arrowright')) move.add(right)
      if (keys.has('a') || keys.has('arrowleft')) move.sub(right)

      let movedDistance = 0
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(MOVE_SPEED * dt)
        const oldPos = handle.camera.position.clone()
        const testPos = oldPos.clone().add(move)
        const { blocked, nearest } = performCollisionCheck(testPos, colliders)

        if (!blocked) {
          handle.camera.position.copy(testPos)
          movedDistance = move.length()
        } else {
          const testX = oldPos.clone()
          testX.x += move.x
          const checkX = performCollisionCheck(testX, colliders)
          if (!checkX.blocked) {
            handle.camera.position.x = testX.x
            movedDistance += Math.abs(move.x)
          }
          const testZ = oldPos.clone()
          testZ.z += move.z
          const checkZ = performCollisionCheck(testZ, colliders)
          if (!checkZ.blocked) {
            handle.camera.position.z = testZ.z
            movedDistance += Math.abs(move.z)
          }
          if (nearest < MIN_WALL_DISTANCE && !shakeStateRef.current.active) {
            shakeStateRef.current = { active: true, startTime: now / 1000 }
          }
        }
      }

      if (movedDistance > 0 && opticsRef.current) {
        opticsRef.current.addDistance(movedDistance)
      }

      const camDir = new THREE.Vector3()
      handle.camera.getWorldDirection(camDir)

      const updateResult = handle.update(handle.camera.position, camDir, dt)

      if (updateResult.goalReached && !victoryTriggeredRef.current) {
        victoryTriggeredRef.current = true
        handle.triggerVictory()
        setTimeout(() => setUi(prev => ({ ...prev, showVictory: true })), 500)
      }

      if (opticsRef.current) {
        opticsRef.current.update(dt)
        const os: OpticsState = opticsRef.current.getState()
        setUi(prev => {
          const nextDist = os.totalDistance.toFixed(2) + ' m'
          const nextRefl = Math.round(os.avgReflectivity * 100) + '%'
          if (prev.distance !== nextDist || prev.reflectivity !== nextRefl ||
              prev.dominantHue !== os.dominantHue || prev.punished !== os.isPunished) {
            return {
              ...prev,
              distance: nextDist,
              reflectivity: nextRefl,
              dominantHue: os.dominantHue,
              punished: os.isPunished
            }
          }
          return prev
        })
      }

      let shakeX = 0, shakeY = 0, shakeZ = 0
      if (shakeStateRef.current.active) {
        const elapsed = now / 1000 - shakeStateRef.current.startTime
        if (elapsed < SHAKE_DURATION) {
          const t = elapsed / SHAKE_DURATION
          const decay = 1 - t
          const phase = elapsed * SHAKE_FREQ * Math.PI * 2
          shakeX = Math.sin(phase) * SHAKE_AMPLITUDE * decay
          shakeY = Math.sin(phase * 1.7) * SHAKE_AMPLITUDE * 0.6 * decay
          shakeZ = Math.cos(phase * 1.3) * SHAKE_AMPLITUDE * 0.8 * decay
        } else {
          shakeStateRef.current.active = false
        }
      }

      const baseQuat = new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ'))
      const shakeQuat = new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(shakeY * 2, shakeX * 2, shakeZ, 'YXZ'))
      handle.camera.quaternion.copy(baseQuat).multiply(shakeQuat)
      handle.camera.position.x += shakeX
      handle.camera.position.y = PLAYER_HEIGHT + shakeY
      handle.camera.position.z += shakeZ

      renderer.render(handle.scene, handle.camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('contextmenu', onContextMenu)
      handle.cleanup()
      renderer.dispose()
    }
  }, [performCollisionCheck])

  const colorWheelGradient = (() => {
    const stops: string[] = []
    for (let i = 0; i <= 360; i += 10) {
      const hue = (i + ui.dominantHue) % 360
      stops.push(`${hslToHex(hue, 85, 60)} ${i / 360 * 100}%`)
    }
    return `conic-gradient(from 0deg, ${stops.join(', ')})`
  })()

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0A0A0A' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />

      <div style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        color: '#fff', fontFamily: 'monospace', userSelect: 'none'
      }}>
        <div style={{
          position: 'absolute', top: '16px', left: '20px',
          textShadow: '0 0 8px #00FF88, 0 0 16px rgba(0,255,136,0.5)'
        }}>
          <div style={{ color: '#00FF88', fontSize: '14px', letterSpacing: '2px' }}>
            ◈ DISTANCE
          </div>
          <div style={{ color: '#00FF88', fontSize: '28px', fontWeight: 'bold', marginTop: '4px',
            textShadow: '0 0 12px #00FF88, 0 0 24px rgba(0,255,136,0.6)' }}>
            {ui.distance}
          </div>
          <div style={{ color: 'rgba(0,255,136,0.6)', fontSize: '11px', marginTop: '6px' }}>
            FPS: {ui.fps}
          </div>
        </div>

        <div style={{
          position: 'absolute', top: '16px', right: '20px', textAlign: 'right',
          textShadow: '0 0 8px #FF66CC, 0 0 16px rgba(255,102,204,0.5)'
        }}>
          <div style={{ color: '#FF66CC', fontSize: '12px', letterSpacing: '2px' }}>
            ◆ REFLECTIVITY
          </div>
          <div style={{ color: '#FF66CC', fontSize: '22px', fontWeight: 'bold', marginTop: '4px',
            textShadow: '0 0 12px #FF66CC, 0 0 24px rgba(255,102,204,0.6)' }}>
            {ui.reflectivity}
          </div>
          <div style={{
            marginTop: '10px', width: '100px', height: '4px',
            background: 'rgba(255,102,204,0.15)', borderRadius: '2px',
            marginLeft: 'auto', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: ui.reflectivity,
              background: 'linear-gradient(90deg, #ff66cc, #ff88dd)',
              boxShadow: '0 0 8px #ff66cc',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '20px', height: '20px'
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0, height: '1px',
            background: 'rgba(255,255,255,0.5)',
            transform: 'translateY(-50%)',
            boxShadow: '0 0 4px rgba(255,255,255,0.3)'
          }} />
          <div style={{
            position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px',
            background: 'rgba(255,255,255,0.5)',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 4px rgba(255,255,255,0.3)'
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '4px', height: '4px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.7)',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 6px rgba(255,255,255,0.5)'
          }} />
        </div>

        <div style={{
          position: 'absolute', bottom: '24px', left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
        }}>
          <div style={{
            width: '120px', height: '120px', borderRadius: '50%',
            background: colorWheelGradient,
            boxShadow: `0 0 30px ${hslToHex(ui.dominantHue, 80, 50)},
                        0 0 60px ${hslToHex(ui.dominantHue, 70, 40)},
                        inset 0 0 20px rgba(0,0,0,0.5)`,
            position: 'relative',
            transition: 'filter 0.5s ease',
            filter: ui.punished ? 'grayscale(0.8) saturate(0.2)' : 'none'
          }}>
            <div style={{
              position: 'absolute', inset: '10px', borderRadius: '50%',
              background: 'radial-gradient(circle, #0A0A0A 40%, rgba(10,10,10,0.8) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: hslToHex(ui.dominantHue, 90, 60),
                boxShadow: `0 0 15px ${hslToHex(ui.dominantHue, 90, 60)},
                            0 0 30px ${hslToHex(ui.dominantHue, 80, 50)}`
              }} />
            </div>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
              transform: `rotate(${ui.dominantHue}deg)`, transition: 'transform 0.5s ease' }}>
              <polygon points="60,4 55,14 65,14" fill={hslToHex(ui.dominantHue, 100, 70)}
                style={{ filter: `drop-shadow(0 0 4px ${hslToHex(ui.dominantHue, 90, 60)})` }} />
            </svg>
          </div>
          <div style={{
            color: hslToHex(ui.dominantHue, 70, 70),
            fontSize: '11px', letterSpacing: '3px',
            textShadow: `0 0 6px ${hslToHex(ui.dominantHue, 80, 60)}`
          }}>
            ◇ HUE {Math.round(ui.dominantHue)}° ◇
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: '16px', left: '20px',
          color: 'rgba(255,255,255,0.35)', fontSize: '11px', lineHeight: '1.7'
        }}>
          <div>WASD / 方向键 — 移动</div>
          <div>鼠标拖拽 — 视角旋转</div>
          <div>找到发光球体 ◉</div>
        </div>

        {ui.showVictory && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(255,221,68,0.15) 0%, transparent 70%)',
            animation: 'fadeIn 1s ease'
          }}>
            <div style={{
              padding: '40px 60px',
              border: '2px solid rgba(255,221,68,0.6)',
              borderRadius: '8px',
              background: 'rgba(10,10,10,0.85)',
              boxShadow: '0 0 40px rgba(255,221,68,0.4), inset 0 0 40px rgba(255,221,68,0.08)',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '56px', fontWeight: 'bold',
                color: '#ffdd44', letterSpacing: '8px',
                textShadow: '0 0 20px #ffdd44, 0 0 40px #ff8800, 0 0 80px rgba(255,136,0,0.5)',
                marginBottom: '16px'
              }}>
                胜 利
              </div>
              <div style={{
                color: '#00ff88', fontSize: '14px', letterSpacing: '4px',
                textShadow: '0 0 10px #00ff88'
              }}>
                你找到了出口 · VICTORY
              </div>
              <div style={{
                marginTop: '20px', color: 'rgba(255,255,255,0.5)',
                fontSize: '12px'
              }}>
                总行程 {ui.distance}
              </div>
            </div>
          </div>
        )}

        {ui.punished && (
          <div style={{
            position: 'absolute', top: '40%', left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ff4466', fontSize: '18px', letterSpacing: '6px',
            textShadow: '0 0 20px #ff4466, 0 0 40px rgba(255,68,102,0.5)',
            animation: 'shakeText 0.3s ease infinite'
          }}>
            ⚠ 迷 路 警 告 ⚠
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shakeText {
          0%, 100% { transform: translate(-50%, -50%); }
          25% { transform: translate(-51%, -49%); }
          50% { transform: translate(-49%, -51%); }
          75% { transform: translate(-51%, -51%); }
        }
      `}</style>
    </div>
  )
}

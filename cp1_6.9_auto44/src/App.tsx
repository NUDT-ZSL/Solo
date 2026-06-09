import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import ControlPanel, { ControlParams } from './ui/ControlPanel'
import Tower from './scene/Tower'
import { startLoop, stopLoop, ORBIT_RADIUS } from './utils/animationLoop'

const titleStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  left: '20px',
  fontSize: '16px',
  color: 'rgba(255,255,255,0.75)',
  letterSpacing: '2px',
  fontWeight: 400,
  zIndex: 100,
  textShadow: '0 0 10px rgba(0,255,255,0.3)',
  transition: 'all 0.3s ease',
  pointerEvents: 'none',
  userSelect: 'none',
}

const AutoOrbit: React.FC<{ isBreathing: boolean }> = ({ isBreathing }) => {
  const { camera } = useThree()
  const orbitAngle = useRef(0)
  const initialCameraPos = useRef(new THREE.Vector3(5, 3, 5))
  const controlsRef = useRef<any>(null)

  useFrame((state, delta) => {
    if (isBreathing) {
      orbitAngle.current += 0.01 * delta * 60
      const x = Math.cos(orbitAngle.current) * ORBIT_RADIUS
      const z = Math.sin(orbitAngle.current) * ORBIT_RADIUS
      const y = 2 + Math.sin(orbitAngle.current * 0.5) * 0.8
      camera.position.lerp(new THREE.Vector3(x, y, z), 0.02)
      camera.lookAt(0, 0, 0)
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={3}
      maxDistance={12}
      enableDamping
      dampingFactor={0.08}
      makeDefault
    />
  )
}

const App: React.FC = () => {
  const [params, setParams] = useState<ControlParams>({
    cableCount: 120,
    rotationSpeed: 0.05,
    brightness: 0.6,
    starDensity: 1200,
  })
  const [isBreathing, setIsBreathing] = useState(false)
  const [breathingIntensity, setBreathingIntensity] = useState(1.0)
  const [fov, setFov] = useState(45)
  const isBreathingRef = useRef(false)

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setFov(55)
      } else {
        setFov(45)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    startLoop({
      onBreathModeChange: (breathing) => {
        setIsBreathing(breathing)
        isBreathingRef.current = breathing
      },
      onTick: (delta, intensity) => {
        if (isBreathingRef.current) {
          setBreathingIntensity(intensity)
        } else {
          setBreathingIntensity(1.0)
        }
      },
      onAutoOrbit: (delta) => {},
    })
    return () => {
      stopLoop()
    }
  }, [])

  const handleParamsChange = useCallback((newParams: ControlParams) => {
    setParams(newParams)
  }, [])

  const effectiveRotationSpeed = isBreathing ? 0.02 : params.rotationSpeed

  return (
    <div style={{ width: '100%', height: '100%', background: '#0A0A1A', position: 'relative' }}>
      <div style={titleStyle}>经纬塔</div>

      <ControlPanel params={params} onChange={handleParamsChange} />

      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{
          position: [5, 3, 5],
          fov: fov,
          near: 0.1,
          far: 1000,
          aspect: window.innerWidth / window.innerHeight,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#0A0A1A')
          scene.fog = new THREE.FogExp2('#0A0A1A', 0.04)
        }}
      >
        <ambientLight intensity={0.3} color="#8888FF" />
        <pointLight position={[10, 10, 10]} intensity={0.6} color="#FFFFFF" />
        <pointLight position={[-10, -5, -10]} intensity={0.4} color="#00FFFF" />
        <directionalLight position={[0, 5, 5]} intensity={0.3} color="#FFFFFF" />

        <AutoOrbit isBreathing={isBreathing} />

        <Tower
          params={params}
          isBreathing={isBreathing}
          breathingIntensity={breathingIntensity}
          rotationSpeed={effectiveRotationSpeed}
        />
      </Canvas>
    </div>
  )
}

export default App

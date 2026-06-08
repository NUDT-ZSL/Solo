import React, { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { SceneManager } from './SceneManager'
import { CloudSystem } from './CloudSystem'
import { MirageBuilder } from './MirageBuilder'
import { UIControls, MirageInfo } from './UIControls'

export interface AppSettings {
  cloudSpeed: number
  buildingOpacity: number
  particleDensity: number
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>({
    cloudSpeed: 1.0,
    buildingOpacity: 0.6,
    particleDensity: 1.0,
  })
  const [mirageInfo, setMirageInfo] = useState<MirageInfo | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const handleSettingsChange = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleMirageClick = useCallback((info: MirageInfo) => {
    setMirageInfo(info)
  }, [])

  const handleReset = useCallback(() => {
    setMirageInfo(null)
    setResetKey(k => k + 1)
  }, [])

  const handleCloseInfo = useCallback(() => {
    setMirageInfo(null)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 8, 25], fov: 60, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <SceneManager />
        <CloudSystem speed={settings.cloudSpeed} density={settings.particleDensity} />
        <MirageBuilder
          key={resetKey}
          opacity={settings.buildingOpacity}
          particleDensity={settings.particleDensity}
          onMirageClick={handleMirageClick}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={8}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
      <UIControls
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onReset={handleReset}
        mirageInfo={mirageInfo}
        onCloseInfo={handleCloseInfo}
      />
    </div>
  )
}

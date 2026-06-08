import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Scene from '@/Scene'
import ControlPanel from '@/ControlPanel'
import MeteorInfoPanel from '@/MeteorInfoPanel'
import { useRef } from 'react'
import type { MeteorEngine } from '@/MeteorEngine'
import type { ExplosionEffect } from '@/ExplosionEffect'
import type { StarBackground } from '@/StarBackground'

export default function App() {
  const engineRef = useRef<{
    meteor: MeteorEngine | null
    explosion: ExplosionEffect | null
    starBg: StarBackground | null
  }>({ meteor: null, explosion: null, starBg: null })

  const handleReset = () => {
    engineRef.current.meteor?.reset()
    engineRef.current.explosion?.reset()
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 2000, position: [0, 0, 250] }}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.NoToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        dpr={[1, 2]}
        style={{ background: '#000000' }}
      >
        <Scene />
      </Canvas>

      <ControlPanel onReset={handleReset} />
      <MeteorInfoPanel />

      <div
        className="fixed top-6 left-1/2 -translate-x-1/2 z-40
          text-center pointer-events-none select-none"
      >
        <h1
          className="text-lg md:text-xl tracking-[0.3em] uppercase
            text-white/20 font-[Orbitron,monospace] font-light"
        >
          星轨残影
        </h1>
        <p className="text-[10px] text-white/10 mt-1 tracking-[0.15em] font-[Orbitron,monospace]">
          Stellar Afterglow
        </p>
      </div>

      <div
        className="fixed bottom-6 left-6 z-40
          text-[10px] text-white/15 tracking-wider
          font-[Orbitron,monospace] pointer-events-none select-none"
      >
        点击流星查看数据 · 拖拽旋转视角 · 滚轮缩放
      </div>
    </div>
  )
}

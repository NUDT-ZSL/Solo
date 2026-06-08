import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import ParticleOcean from '@/components/ParticleOcean'
import LightNet from '@/components/LightNet'
import ControlPanel from '@/components/ControlPanel'

export default function App() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: '#000' }}>
      <Canvas
        camera={{ position: [0, 12, 12], fov: 60, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'linear-gradient(180deg, #0a0e27 0%, #000000 100%)' }}
      >
        <ParticleOcean />
        <LightNet />
        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      <ControlPanel />
    </div>
  )
}

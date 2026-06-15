import { Suspense } from 'react'
import { OrbitControls } from '@react-three/drei'
import ParticleSystem from './ParticleSystem'
import type { ParticleData } from '../App'

interface MainSceneProps {
  particles: ParticleData[]
  warmColor: string
  perturbation: number
  onStatsUpdate: (avgConnections: number) => void
}

function MainScene({ particles, warmColor, perturbation, onStatsUpdate }: MainSceneProps) {
  return (
    <>
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={500}
        enablePan={true}
        panSpeed={0.5}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />

      <Suspense fallback={null}>
        <ParticleSystem
          particles={particles}
          warmColor={warmColor}
          perturbation={perturbation}
          onStatsUpdate={onStatsUpdate}
        />
      </Suspense>
    </>
  )
}

export default MainScene

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { SoundSource as SoundSourceType } from '@/types';
import { SoundSource } from './SoundSource';

interface ScenePanelProps {
  sources: SoundSourceType[];
  onPositionChange: (id: number, pos: { x: number; y: number; z: number }) => void;
}

function SceneGrid() {
  return (
    <Grid
      args={[20, 20]}
      cellSize={1}
      cellThickness={0.5}
      cellColor="#1a2332"
      sectionSize={5}
      sectionThickness={1}
      sectionColor="#1a2332"
      fadeDistance={50}
      infiniteGrid
    />
  );
}

export function ScenePanel({ sources, onPositionChange }: ScenePanelProps) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0d1117' }}>
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 100, position: [0, 8, 12] }}
        style={{ background: '#0d1117' }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, 10, -10]} intensity={0.4} />

        <SceneGrid />

        {sources.map((source) => (
          <SoundSource
            key={source.id}
            id={source.id}
            position={source.position}
            color={source.color}
            onPositionChange={onPositionChange}
          />
        ))}

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export default function Gallery() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 2, 8], fov: 60 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0a0e27']} />
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={0.8} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#1a1a2e" transparent opacity={0.9} />
        </mesh>
        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={15}
          minPolarAngle={Math.PI / 2 - Math.PI / 12}
          maxPolarAngle={Math.PI / 2 + Math.PI / 6}
        />
      </Canvas>
    </div>
  );
}

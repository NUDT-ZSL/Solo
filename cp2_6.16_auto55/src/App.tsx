import { useState } from 'react'
import { Canvas } from '@react-three/fiber'

function Box() {
  return (
    <mesh>
      <boxGeometry args={[10, 10, 10]} />
      <meshStandardMaterial color="red" />
    </mesh>
  )
}

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a1a' }}>
      <Canvas camera={{ position: [0, 0, 50] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <Box />
      </Canvas>
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white' }}>
        <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      </div>
    </div>
  )
}

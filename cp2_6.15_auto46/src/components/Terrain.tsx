import { Grid } from '@react-three/drei';

export default function Terrain() {
  return (
    <Grid
      args={[20, 20]}
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      cellSize={1}
      cellThickness={0.5}
      cellColor="#4fc3f7"
      sectionSize={5}
      sectionThickness={1}
      sectionColor="#4fc3f7"
      fadeDistance={30}
      fadeStrength={1}
      followCamera={false}
      transparent
      opacity={0.3}
    />
  );
}

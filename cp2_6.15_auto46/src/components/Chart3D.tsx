export default function Chart3D() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#4fc3f7" transparent opacity={0.5} />
    </mesh>
  );
}

import { useMemo } from 'react';
import * as THREE from 'three';
import { ROOM_SIZE } from '../types';

function Room() {
  const floorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const baseColor = '#D4B895';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);
    const stripeColors = ['#C9A876', '#D4B895', '#DEBB8C', '#C9A876', '#D4B895'];
    const stripeHeight = 512 / 5;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = stripeColors[i];
      ctx.fillRect(0, i * stripeHeight, 512, stripeHeight);
    }
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(139,111,78,${0.05 + Math.random() * 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const y = Math.random() * 512;
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 20) {
        ctx.lineTo(x, y + Math.sin(x * 0.05) * 2);
      }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }, []);

  return (
    <group>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[ROOM_SIZE.width, ROOM_SIZE.depth]} />
        <meshStandardMaterial
          map={floorTexture}
          color="#D4B895"
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      <mesh receiveShadow position={[0, ROOM_SIZE.height / 2, -ROOM_SIZE.depth / 2]}>
        <boxGeometry args={[ROOM_SIZE.width, ROOM_SIZE.height, 0.08]} />
        <meshStandardMaterial color="#EAEAEA" roughness={0.92} metalness={0.02} />
      </mesh>

      <mesh
        receiveShadow
        position={[-ROOM_SIZE.width / 2, ROOM_SIZE.height / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[ROOM_SIZE.depth, ROOM_SIZE.height, 0.08]} />
        <meshStandardMaterial color="#EAEAEA" roughness={0.92} metalness={0.02} />
      </mesh>

      <mesh
        receiveShadow
        position={[ROOM_SIZE.width / 2, ROOM_SIZE.height / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <boxGeometry args={[ROOM_SIZE.depth, ROOM_SIZE.height, 0.08]} />
        <meshStandardMaterial color="#EAEAEA" roughness={0.92} metalness={0.02} />
      </mesh>

      <mesh position={[0, 2.0, -ROOM_SIZE.depth / 2 + 0.01]}>
        <boxGeometry args={[1.6, 1.2, 0.01]} />
        <meshStandardMaterial
          color="#B3D9FF"
          transparent
          opacity={0.45}
          roughness={0.1}
          metalness={0.05}
          emissive="#87CEEB"
          emissiveIntensity={0.08}
        />
      </mesh>

      <mesh position={[-0.9, 2.0, -ROOM_SIZE.depth / 2 + 0.05]}>
        <boxGeometry args={[0.04, 1.28, 0.03]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
      </mesh>
      <mesh position={[0.9, 2.0, -ROOM_SIZE.depth / 2 + 0.05]}>
        <boxGeometry args={[0.04, 1.28, 0.03]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.68, -ROOM_SIZE.depth / 2 + 0.05]}>
        <boxGeometry args={[1.68, 0.04, 0.03]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.32, -ROOM_SIZE.depth / 2 + 0.05]}>
        <boxGeometry args={[1.68, 0.04, 0.03]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
      </mesh>

      <mesh position={[0, ROOM_SIZE.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_SIZE.width, ROOM_SIZE.depth]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.95} />
      </mesh>

      <gridHelper
        args={[ROOM_SIZE.width, ROOM_SIZE.width * 10, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.02)']}
        position={[0, 0.002, 0]}
      />
    </group>
  );
}

export default Room;

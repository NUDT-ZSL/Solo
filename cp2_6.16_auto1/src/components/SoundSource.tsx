import { useRef, useState, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

interface SoundSourceProps {
  id: number;
  position: { x: number; y: number; z: number };
  color: string;
  onPositionChange: (id: number, pos: { x: number; y: number; z: number }) => void;
}

interface Ripple {
  id: number;
  birthTime: number;
}

const RIPPLE_LIFETIME = 1500;
const RIPPLE_SPAWN_INTERVAL = 1500;
const RIPPLE_SPEED = 2;
const RIPPLE_MAX_RADIUS = RIPPLE_SPEED * (RIPPLE_LIFETIME / 1000);

export function SoundSource({ id, position, color, onPositionChange }: SoundSourceProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const ripplesRef = useRef<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const lastSpawnRef = useRef(performance.now());
  const drag
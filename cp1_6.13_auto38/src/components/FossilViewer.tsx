import { useFrame } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useStrataStore } from '@/store/useStrataStore';
import createFossilModel from '@/utils/fossilModels';

export default function FossilViewer() {
  const viewingFossil = useStrataStore((s) => s.viewingFossil);
  const fossilRotating = useStrataStore((s) => s.fossilRotating);
  const setShowFossilDetail = useStrataStore((s) => s.setShowFossilDetail);
  const viewFossil = useStrataStore((s) => s.viewFossil);
  const toggleFossilRotation = useStrataStore((s) => s.toggleFossilRotation);

  const groupRef = useRef<THREE.Group>(null);
  const rotationSpeed = 0.5;
  const autoCloseTimer = useRef<number | null>(null);

  const fossilModel = useMemo(() => {
    if (!viewingFossil) return new THREE.Group();
    return createFossilModel(viewingFossil.modelType);
  }, [viewingFossil]);

  useEffect(() => {
    if (viewingFossil) {
      if (autoCloseTimer.current) window.clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = window.setTimeout(() => {
        viewFossil(null);
        setShowFossilDetail(false);
      }, 10000);
    }
    return () => {
      if (autoCloseTimer.current) {
        window.clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
      }
    };
  }, [viewingFossil, viewFossil, setShowFossilDetail]);

  useFrame(() => {
    if (groupRef.current && fossilRotating) {
      groupRef.current.rotation.y += (rotationSpeed * Math.PI) / 180;
    }
  });

  if (!viewingFossil) return null;

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (autoCloseTimer.current) {
      window.clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
    toggleFossilRotation();
    setShowFossilDetail(true);
  };

  return (
    <>
      <mesh position={[0, 60, -6]}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.6} />
      </mesh>
      <pointLight position={[0, 68, 10]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-15, 55, 15]} intensity={0.6} color="#60a5fa" />
      <pointLight position={[15, 55, 15]} intensity={0.6} color="#60a5fa" />
      <group
        ref={groupRef}
        position={[0, 60, 0]}
        scale={18}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'auto'; }}
      >
        <primitive object={fossilModel} />
      </group>
    </>
  );
}

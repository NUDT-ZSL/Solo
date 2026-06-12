import { useFrame } from '@react-three/fiber'
import { useRef, useState, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useStrataStore } from '@/store/useStrataStore'
import createFossilModel from '@/utils/fossilModels'

export default function FossilViewer() {
  const viewingFossil = useStrataStore((s) => s.viewingFossil)
  const fossilRotating = useStrataStore((s) => s.fossilRotating)
  const setShowFossilDetail = useStrataStore((s) => s.setShowFossilDetail)

  const groupRef = useRef<THREE.Group>(null)
  const rotationSpeed = useRef(0.25 + Math.random() * 0.75)

  const fossilModel = useMemo(() => createFossilModel(viewingFossil!.modelType), [viewingFossil!.modelType])

  useFrame(() => {
    if (groupRef.current && fossilRotating) {
      groupRef.current.rotation.y += rotationSpeed.current * Math.PI / 180
    }
  })

  if (!viewingFossil) return null

  return (
    <>
      <pointLight position={[0, 65, 5]} intensity={1} color="#ffffff" />
      <mesh position={[0, 60, -5]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.5} />
      </mesh>
      <group
        ref={groupRef}
        position={[0, 60, 0]}
        scale={15}
        onClick={() => {
          useStrataStore.getState().toggleFossilRotation()
          setShowFossilDetail(true)
        }}
      >
        <primitive object={fossilModel} />
      </group>
    </>
  )
}

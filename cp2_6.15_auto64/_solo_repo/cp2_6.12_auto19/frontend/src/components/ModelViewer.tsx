import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { OutfitSelection, SelectedClothing } from '@/types'
import { getStyleById } from '@/data/wardrobe'

const COLOR_LERP_SPEED = 2.0
const FADE_IN_SPEED = 3.5
const FADE_OUT_SPEED = 5.0

function MannequinBody() {
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f5e6d3', roughness: 0.85, metalness: 0.05 }), [])

  return (
    <group>
      <mesh position={[0, 1.15, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.28, 0.33, 1.1, 24]} />
      </mesh>
      <mesh position={[0, 0.15, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.32, 0.3, 0.7, 24]} />
      </mesh>
      <mesh position={[0.18, -0.85, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.85, 16]} />
      </mesh>
      <mesh position={[-0.18, -0.85, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.85, 16]} />
      </mesh>
      <mesh position={[0.42, 0.7, 0]} rotation={[0, 0, -0.2]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.08, 0.07, 0.7, 12]} />
      </mesh>
      <mesh position={[-0.42, 0.7, 0]} rotation={[0, 0, 0.2]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.08, 0.07, 0.7, 12]} />
      </mesh>
      <mesh position={[0, 1.95, 0]} material={bodyMat} castShadow>
        <sphereGeometry args={[0.22, 24, 24]} />
      </mesh>
      <mesh position={[0.1, -1.4, 0.03]} material={bodyMat} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.22]} />
      </mesh>
      <mesh position={[-0.1, -1.4, 0.03]} material={bodyMat} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.22]} />
      </mesh>
    </group>
  )
}

interface ClothingMeshProps {
  selected: SelectedClothing | null
  category: string
}

function ClothingMesh({ selected, category }: ClothingMeshProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const targetOpacity = useRef(selected ? 1 : 0)
  const targetColor = useRef(new THREE.Color(selected?.color || '#ffffff'))
  const currentOpacity = useRef(selected ? 1 : 0)
  const prevSelectedRef = useRef<SelectedClothing | null>(selected)
  const [visible, setVisible] = useState(!!selected)

  const style = selected ? getStyleById(selected.styleId) : null

  const mainMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: selected?.color || '#ffffff',
      roughness: 0.55,
      metalness: 0.08,
      transparent: true,
      opacity: selected ? 1 : 0,
      side: THREE.DoubleSide
    })
    return mat
  }, [])

  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.7,
    metalness: 0.05,
    transparent: true,
    opacity: selected ? 1 : 0
  }), [])

  const detailMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2d2d2d',
    roughness: 0.8,
    metalness: 0.05,
    transparent: true,
    opacity: selected ? 1 : 0
  }), [])

  useEffect(() => {
    const prev = prevSelectedRef.current
    if (selected && !prev) {
      setVisible(true)
      currentOpacity.current = 0
      targetOpacity.current = 1
      targetColor.current.set(selected.color)
    } else if (!selected && prev) {
      targetOpacity.current = 0
    } else if (selected && prev && selected.styleId !== prev.styleId) {
      targetOpacity.current = 0
      const timer = setTimeout(() => {
        targetColor.current.set(selected.color)
        targetOpacity.current = 1
        setVisible(true)
      }, 200)
      return () => clearTimeout(timer)
    } else if (selected && prev && selected.color !== prev.color) {
      targetColor.current.set(selected.color)
    }
    prevSelectedRef.current = selected
  }, [selected])

  useFrame((_, delta) => {
    const diff = targetOpacity.current - currentOpacity.current
    if (Math.abs(diff) > 0.001) {
      const speed = diff > 0 ? FADE_IN_SPEED : FADE_OUT_SPEED
      currentOpacity.current += diff * Math.min(speed * delta, 1)
    } else {
      currentOpacity.current = targetOpacity.current
    }

    const opacity = currentOpacity.current
    mainMat.opacity = opacity
    mainMat.visible = opacity > 0.01
    accentMat.opacity = opacity
    accentMat.visible = opacity > 0.01
    detailMat.opacity = opacity
    detailMat.visible = opacity > 0.01

    if (opacity <= 0.01 && targetOpacity.current <= 0) {
      setVisible(false)
    }

    mainMat.color.lerp(targetColor.current, Math.min(COLOR_LERP_SPEED * delta, 1))
  })

  const renderShape = () => {
    if (!style) return null
    const y = style.yPosition
    const s = style.scale

    switch (style.shape) {
      case 'tshirt': {
        const bodyShape = new THREE.Shape()
        bodyShape.moveTo(-0.32, -0.35)
        bodyShape.lineTo(-0.32, 0.15)
        bodyShape.lineTo(-0.42, 0.1)
        bodyShape.lineTo(-0.48, 0.35)
        bodyShape.lineTo(-0.28, 0.3)
        bodyShape.quadraticCurveTo(-0.15, 0.35, 0, 0.35)
        bodyShape.quadraticCurveTo(0.15, 0.35, 0.28, 0.3)
        bodyShape.lineTo(0.48, 0.35)
        bodyShape.lineTo(0.42, 0.1)
        bodyShape.lineTo(0.32, 0.15)
        bodyShape.lineTo(0.32, -0.35)
        bodyShape.lineTo(-0.32, -0.35)
        const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3 }
        return (
          <group position={[0, y, -0.06]} scale={s}>
            <mesh material={mainMat} castShadow>
              <extrudeGeometry args={[bodyShape, extrudeSettings]} />
            </mesh>
            <mesh position={[0, 0.33, 0.02]} material={mainMat} castShadow>
              <torusGeometry args={[0.14, 0.025, 8, 24, Math.PI]} />
            </mesh>
          </group>
        )
      }
      case 'shirt': {
        const bodyShape = new THREE.Shape()
        bodyShape.moveTo(-0.3, -0.35)
        bodyShape.lineTo(-0.3, 0.15)
        bodyShape.lineTo(-0.38, 0.08)
        bodyShape.lineTo(-0.45, 0.38)
        bodyShape.lineTo(-0.22, 0.32)
        bodyShape.lineTo(-0.12, 0.38)
        bodyShape.lineTo(0, 0.4)
        bodyShape.lineTo(0.12, 0.38)
        bodyShape.lineTo(0.22, 0.32)
        bodyShape.lineTo(0.45, 0.38)
        bodyShape.lineTo(0.38, 0.08)
        bodyShape.lineTo(0.3, 0.15)
        bodyShape.lineTo(0.3, -0.35)
        bodyShape.lineTo(-0.3, -0.35)
        const ext = { depth: 0.1, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3 }
        return (
          <group position={[0, y, -0.05]} scale={s}>
            <mesh material={mainMat} castShadow>
              <extrudeGeometry args={[bodyShape, ext]} />
            </mesh>
            <mesh position={[0.05, 0.35, 0.06]} material={detailMat} castShadow>
              <boxGeometry args={[0.015, 0.25, 0.01]} />
            </mesh>
            <mesh position={[-0.05, 0.35, 0.06]} material={detailMat} castShadow>
              <boxGeometry args={[0.015, 0.25, 0.01]} />
            </mesh>
          </group>
        )
      }
      case 'sweater': {
        const bodyShape = new THREE.Shape()
        bodyShape.moveTo(-0.35, -0.36)
        bodyShape.lineTo(-0.35, 0.1)
        bodyShape.lineTo(-0.44, 0.05)
        bodyShape.lineTo(-0.5, 0.35)
        bodyShape.lineTo(-0.3, 0.3)
        bodyShape.quadraticCurveTo(-0.12, 0.36, 0, 0.36)
        bodyShape.quadraticCurveTo(0.12, 0.36, 0.3, 0.3)
        bodyShape.lineTo(0.5, 0.35)
        bodyShape.lineTo(0.44, 0.05)
        bodyShape.lineTo(0.35, 0.1)
        bodyShape.lineTo(0.35, -0.36)
        bodyShape.lineTo(-0.35, -0.36)
        const ext = { depth: 0.14, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 3 }
        return (
          <group position={[0, y, -0.07]} scale={s}>
            <mesh material={mainMat} castShadow>
              <extrudeGeometry args={[bodyShape, ext]} />
            </mesh>
            <mesh position={[0, 0.36, 0.03]} material={mainMat} castShadow>
              <torusGeometry args={[0.15, 0.035, 8, 24, Math.PI]} />
            </mesh>
            <mesh position={[0.44, -0.1, 0.04]} material={mainMat} castShadow>
              <torusGeometry args={[0.07, 0.018, 8, 16]} />
            </mesh>
            <mesh position={[-0.44, -0.1, 0.04]} material={mainMat} castShadow>
              <torusGeometry args={[0.07, 0.018, 8, 16]} />
            </mesh>
            <mesh position={[0, -0.36, 0.03]} material={mainMat} castShadow>
              <torusGeometry args={[0.34, 0.018, 8, 24]} />
            </mesh>
          </group>
        )
      }
      case 'jacket': {
        const leftPanel = new THREE.Shape()
        leftPanel.moveTo(-0.33, -0.38)
        leftPanel.lineTo(-0.33, 0.1)
        leftPanel.lineTo(-0.45, 0.05)
        leftPanel.lineTo(-0.52, 0.38)
        leftPanel.lineTo(-0.3, 0.32)
        leftPanel.lineTo(-0.08, 0.38)
        leftPanel.lineTo(-0.02, 0.35)
        leftPanel.lineTo(-0.02, -0.38)
        leftPanel.lineTo(-0.33, -0.38)
        const rightPanel = new THREE.Shape()
        rightPanel.moveTo(0.33, -0.38)
        rightPanel.lineTo(0.33, 0.1)
        rightPanel.lineTo(0.45, 0.05)
        rightPanel.lineTo(0.52, 0.38)
        rightPanel.lineTo(0.3, 0.32)
        rightPanel.lineTo(0.08, 0.38)
        rightPanel.lineTo(0.02, 0.35)
        rightPanel.lineTo(0.02, -0.38)
        rightPanel.lineTo(0.33, -0.38)
        const ext = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 }
        return (
          <group position={[0, y, -0.06]} scale={s}>
            <mesh material={mainMat} castShadow>
              <extrudeGeometry args={[leftPanel, ext]} />
            </mesh>
            <mesh material={mainMat} castShadow>
              <extrudeGeometry args={[rightPanel, ext]} />
            </mesh>
            <mesh position={[0.04, 0.15, 0.12]} material={detailMat} castShadow>
              <boxGeometry args={[0.02, 0.4, 0.01]} />
            </mesh>
            <mesh position={[-0.04, 0.15, 0.12]} material={detailMat} castShadow>
              <boxGeometry args={[0.02, 0.4, 0.01]} />
            </mesh>
            <mesh position={[0, 0.38, 0.08]} material={mainMat} castShadow>
              <boxGeometry args={[0.18, 0.04, 0.03]} />
            </mesh>
          </group>
        )
      }
      case 'coat': {
        const bodyShape = new THREE.Shape()
        bodyShape.moveTo(-0.34, -0.8)
        bodyShape.lineTo(-0.34, 0.1)
        bodyShape.lineTo(-0.46, 0.0)
        bodyShape.lineTo(-0.55, 0.42)
        bodyShape.lineTo(-0.32, 0.35)
        bodyShape.lineTo(-0.1, 0.42)
        bodyShape.lineTo(0, 0.44)
        bodyShape.lineTo(0.1, 0.42)
        bodyShape.lineTo(0.32, 0.35)
        bodyShape.lineTo(0.55, 0.42)
        bodyShape.lineTo(0.46, 0.0)
        bodyShape.lineTo(0.34, 0.1)
        bodyShape.lineTo(0.34, -0.8)
        bodyShape.lineTo(-0.34, -0.8)
        const ext = { depth: 0.14, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3 }
        return (
          <group position={[0, y - 0.1, -0.07]} scale={s}>
            <mesh material={mainMat} castShadow>
              <extrudeGeometry args={[bodyShape, ext]} />
            </mesh>
            <mesh position={[0.04, 0.2, 0.14]} material={detailMat} castShadow>
              <boxGeometry args={[0.02, 0.8, 0.01]} />
            </mesh>
            <mesh position={[-0.04, 0.2, 0.14]} material={detailMat} castShadow>
              <boxGeometry args={[0.02, 0.8, 0.01]} />
            </mesh>
            <mesh position={[0, 0.44, 0.09]} material={mainMat} castShadow>
              <boxGeometry args={[0.22, 0.06, 0.04]} />
            </mesh>
          </group>
        )
      }
      case 'pants': {
        const leftLeg = new THREE.Shape()
        leftLeg.moveTo(-0.3, 0.15)
        leftLeg.lineTo(-0.3, -0.05)
        leftLeg.lineTo(-0.04, -0.05)
        leftLeg.lineTo(-0.04, -0.78)
        leftLeg.lineTo(-0.16, -0.78)
        leftLeg.lineTo(-0.22, -0.78)
        leftLeg.lineTo(-0.22, -0.05)
        leftLeg.lineTo(-0.3, -0.05)
        const rightLeg = new THREE.Shape()
        rightLeg.moveTo(0.3, 0.15)
        rightLeg.lineTo(0.3, -0.05)
        rightLeg.lineTo(0.04, -0.05)
        rightLeg.lineTo(0.04, -0.78)
        rightLeg.lineTo(0.16, -0.78)
        rightLeg.lineTo(0.22, -0.78)
        rightLeg.lineTo(0.22, -0.05)
        rightLeg.lineTo(0.3, -0.05)
        const waistShape = new THREE.Shape()
        waistShape.moveTo(-0.3, 0.15)
        waistShape.lineTo(-0.3, -0.05)
        waistShape.lineTo(0.3, -0.05)
        waistShape.lineTo(0.3, 0.15)
        waistShape.lineTo(-0.3, 0.15)
        const legExt = { depth: 0.14, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 }
        const waistExt = { depth: 0.14, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2 }
        return (
          <group position={[0, y, -0.07]} scale={s}>
            <mesh material={mainMat} castShadow>
              <extrudeGeometry args={[waistShape, waistExt]} />
            </mesh>
            <mesh position={[-0.13, 0, 0]} material={mainMat} castShadow>
              <extrudeGeometry args={[leftLeg, legExt]} />
            </mesh>
            <mesh position={[0.13, 0, 0]} material={mainMat} castShadow>
              <extrudeGeometry args={[rightLeg, legExt]} />
            </mesh>
          </group>
        )
      }
      case 'skirt': {
        const skirtShape = new THREE.Shape()
        skirtShape.moveTo(-0.2, 0.2)
        skirtShape.lineTo(-0.2, 0.05)
        skirtShape.lineTo(-0.38, -0.35)
        skirtShape.quadraticCurveTo(-0.35, -0.4, -0.28, -0.38)
        skirtShape.lineTo(0.28, -0.38)
        skirtShape.quadraticCurveTo(0.35, -0.4, 0.38, -0.35)
        skirtShape.lineTo(0.2, 0.05)
        skirtShape.lineTo(0.2, 0.2)
        skirtShape.lineTo(-0.2, 0.2)
        const ext = { depth: 0.16, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3 }
        return (
          <group position={[0, y, -0.08]} scale={s}>
            <mesh material={mainMat} castShadow>
              <extrudeGeometry args={[skirtShape, ext]} />
            </mesh>
            <mesh position={[0, 0.2, 0.03]} material={mainMat} castShadow>
              <torusGeometry args={[0.2, 0.02, 8, 24]} />
            </mesh>
          </group>
        )
      }
      case 'shorts': {
        const leftLeg = new THREE.Shape()
        leftLeg.moveTo(-0.28, 0.12)
        leftLeg.lineTo(-0.28, -0.05)
        leftLeg.lineTo(-0.04, -0.05)
        leftLeg.lineTo(-0.04, -0.3)
        leftLeg.lineTo(-0.2, -0.3)
        leftLeg.lineTo(-0.2, -0.05)
        leftLeg.lineTo(-0.28, -0.05)
        const rightLeg = new THREE.Shape()
        rightLeg.moveTo(0.28, 0.12)
        rightLeg.lineTo(0.28, -0.05)
        rightLeg.lineTo(0.04, -0.05)
        rightLeg.lineTo(0.04, -0.3)
        rightLeg.lineTo(0.2, -0.3)
        rightLeg.lineTo(0.2, -0.05)
        rightLeg.lineTo(0.28, -0.05)
        const waistShape = new THREE.Shape()
        waistShape.moveTo(-0.28, 0.12)
        waistShape.lineTo(-0.28, -0.05)
        waistShape.lineTo(0.28, -0.05)
        waistShape.lineTo(0.28, 0.12)
        waistShape.lineTo(-0.28, 0.12)
        const ext = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 }
        return (
          <group position={[0, y, -0.06]} scale={s}>
            <mesh material={mainMat} castShadow>
              <extrudeGeometry args={[waistShape, ext]} />
            </mesh>
            <mesh position={[-0.12, 0, 0]} material={mainMat} castShadow>
              <extrudeGeometry args={[leftLeg, ext]} />
            </mesh>
            <mesh position={[0.12, 0, 0]} material={mainMat} castShadow>
              <extrudeGeometry args={[rightLeg, ext]} />
            </mesh>
          </group>
        )
      }
      case 'sneakers': {
        const shoeShape = new THREE.Shape()
        shoeShape.moveTo(-0.08, 0.04)
        shoeShape.lineTo(-0.08, 0)
        shoeShape.lineTo(-0.1, -0.02)
        shoeShape.lineTo(-0.1, -0.04)
        shoeShape.lineTo(0.1, -0.04)
        shoeShape.lineTo(0.12, -0.02)
        shoeShape.quadraticCurveTo(0.14, 0.02, 0.12, 0.04)
        shoeShape.lineTo(-0.08, 0.04)
        const soleShape = new THREE.Shape()
        soleShape.moveTo(-0.1, -0.02)
        soleShape.lineTo(-0.1, -0.06)
        soleShape.lineTo(0.12, -0.06)
        soleShape.lineTo(0.12, -0.02)
        soleShape.lineTo(-0.1, -0.02)
        const shoeExt = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 }
        const soleExt = { depth: 0.14, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 }
        return (
          <group position={[0, y, -0.06]} scale={s}>
            <mesh position={[-0.12, 0, 0]} material={mainMat} castShadow>
              <extrudeGeometry args={[shoeShape, shoeExt]} />
            </mesh>
            <mesh position={[0.12, 0, 0]} material={mainMat} castShadow>
              <extrudeGeometry args={[shoeShape, shoeExt]} />
            </mesh>
            <mesh position={[-0.12, -0.03, 0]} material={accentMat} castShadow>
              <extrudeGeometry args={[soleShape, soleExt]} />
            </mesh>
            <mesh position={[0.12, -0.03, 0]} material={accentMat} castShadow>
              <extrudeGeometry args={[soleShape, soleExt]} />
            </mesh>
          </group>
        )
      }
      case 'boots': {
        const bootShape = new THREE.Shape()
        bootShape.moveTo(-0.08, 0.2)
        bootShape.lineTo(-0.08, 0)
        bootShape.lineTo(-0.1, -0.02)
        bootShape.lineTo(-0.1, -0.04)
        bootShape.lineTo(0.1, -0.04)
        bootShape.lineTo(0.12, -0.02)
        bootShape.quadraticCurveTo(0.14, 0.02, 0.12, 0.04)
        bootShape.lineTo(0.08, 0.04)
        bootShape.lineTo(0.08, 0.2)
        bootShape.lineTo(-0.08, 0.2)
        const soleShape = new THREE.Shape()
        soleShape.moveTo(-0.1, -0.02)
        soleShape.lineTo(-0.1, -0.06)
        soleShape.lineTo(0.12, -0.06)
        soleShape.lineTo(0.12, -0.02)
        soleShape.lineTo(-0.1, -0.02)
        const heelShape = new THREE.Shape()
        heelShape.moveTo(-0.03, -0.04)
        heelShape.lineTo(-0.03, -0.12)
        heelShape.lineTo(0.03, -0.12)
        heelShape.lineTo(0.03, -0.04)
        heelShape.lineTo(-0.03, -0.04)
        const bootExt = { depth: 0.1, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 }
        const soleExt = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 }
        const heelExt = { depth: 0.04, bevelEnabled: false }
        return (
          <group position={[0, y + 0.08, -0.05]} scale={s}>
            <mesh position={[-0.12, 0, 0]} material={mainMat} castShadow>
              <extrudeGeometry args={[bootShape, bootExt]} />
            </mesh>
            <mesh position={[0.12, 0, 0]} material={mainMat} castShadow>
              <extrudeGeometry args={[bootShape, bootExt]} />
            </mesh>
            <mesh position={[-0.12, -0.03, 0]} material={detailMat} castShadow>
              <extrudeGeometry args={[soleShape, soleExt]} />
            </mesh>
            <mesh position={[0.12, -0.03, 0]} material={detailMat} castShadow>
              <extrudeGeometry args={[soleShape, soleExt]} />
            </mesh>
            <mesh position={[-0.08, -0.06, 0.04]} material={detailMat} castShadow>
              <extrudeGeometry args={[heelShape, heelExt]} />
            </mesh>
            <mesh position={[0.16, -0.06, 0.04]} material={detailMat} castShadow>
              <extrudeGeometry args={[heelShape, heelExt]} />
            </mesh>
          </group>
        )
      }
      case 'heels': {
        const upperShape = new THREE.Shape()
        upperShape.moveTo(-0.06, 0.04)
        upperShape.lineTo(-0.06, 0)
        upperShape.lineTo(-0.07, -0.02)
        upperShape.lineTo(0.07, -0.02)
        upperShape.quadraticCurveTo(0.1, 0.01, 0.08, 0.04)
        upperShape.lineTo(-0.06, 0.04)
        const soleShape = new THREE.Shape()
        soleShape.moveTo(-0.07, -0.01)
        soleShape.lineTo(-0.07, -0.03)
        soleShape.lineTo(0.09, -0.03)
        soleShape.lineTo(0.09, -0.01)
        soleShape.lineTo(-0.07, -0.01)
        const heelShape = new THREE.Shape()
        heelShape.moveTo(-0.015, -0.02)
        heelShape.lineTo(-0.015, -0.12)
        heelShape.lineTo(0.015, -0.12)
        heelShape.lineTo(0.015, -0.02)
        heelShape.lineTo(-0.015, -0.02)
        const upperExt = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 }
        const soleExt = { depth: 0.09, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 }
        const heelExt = { depth: 0.02, bevelEnabled: false }
        return (
          <group position={[0, y + 0.02, -0.04]} scale={s}>
            <mesh position={[-0.1, 0, 0]} material={mainMat} castShadow>
              <extrudeGeometry args={[upperShape, upperExt]} />
            </mesh>
            <mesh position={[0.1, 0, 0]} material={mainMat} castShadow>
              <extrudeGeometry args={[upperShape, upperExt]} />
            </mesh>
            <mesh position={[-0.1, -0.01, 0]} material={detailMat} castShadow>
              <extrudeGeometry args={[soleShape, soleExt]} />
            </mesh>
            <mesh position={[0.1, -0.01, 0]} material={detailMat} castShadow>
              <extrudeGeometry args={[soleShape, soleExt]} />
            </mesh>
            <mesh position={[-0.06, -0.05, 0.035]} material={mainMat} castShadow>
              <extrudeGeometry args={[heelShape, heelExt]} />
            </mesh>
            <mesh position={[0.14, -0.05, 0.035]} material={mainMat} castShadow>
              <extrudeGeometry args={[heelShape, heelExt]} />
            </mesh>
          </group>
        )
      }
      case 'loafers': {
        const shoeShape = new THREE.Shape()
        shoeShape.moveTo(-0.07, 0.03)
        shoeShape.lineTo(-0.07, -0.01)
        shoeShape.lineTo(-0.08, -0.03)
        shoeShape.lineTo(0.08, -0.03)
        shoeShape.quadraticCurveTo(0.12, 0.01, 0.09, 0.03)
        shoeShape.lineTo(-0.07, 0.03)
        const soleShape = new THREE.Shape()
        soleShape.moveTo(-0.08, -0.01)
        soleShape.lineTo(-0.08, -0.05)
        soleShape.lineTo(0.09, -0.05)
        soleShape.lineTo(0.09, -0.01)
        soleShape.lineTo(-0.08, -0.01)
        const shoeExt = { depth: 0.1, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }
        const soleExt = { depth: 0.11, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 }
        return (
          <group position={[0, y, -0.05]} scale={s}>
            <mesh position={[-0.12, 0, 0]} material={mainMat} castShadow>
              <extrudeGeometry args={[shoeShape, shoeExt]} />
            </mesh>
            <mesh position={[0.12, 0, 0]} material={mainMat} castShadow>
              <extrudeGeometry args={[shoeShape, shoeExt]} />
            </mesh>
            <mesh position={[-0.12, -0.02, 0]} material={detailMat} castShadow>
              <extrudeGeometry args={[soleShape, soleExt]} />
            </mesh>
            <mesh position={[0.12, -0.02, 0]} material={detailMat} castShadow>
              <extrudeGeometry args={[soleShape, soleExt]} />
            </mesh>
            <mesh position={[-0.12, 0.025, 0.04]} material={mainMat} castShadow>
              <boxGeometry args={[0.06, 0.01, 0.04]} />
            </mesh>
            <mesh position={[0.12, 0.025, 0.04]} material={mainMat} castShadow>
              <boxGeometry args={[0.06, 0.01, 0.04]} />
            </mesh>
          </group>
        )
      }
      case 'hat': {
        const brimShape = new THREE.Shape()
        brimShape.absarc(0, 0, 0.38, 0, Math.PI * 2, false)
        const holePath = new THREE.Path()
        holePath.absarc(0, 0, 0.22, 0, Math.PI * 2, true)
        brimShape.holes.push(holePath)
        const crownShape = new THREE.Shape()
        crownShape.absarc(0, 0, 0.22, 0, Math.PI * 2, false)
        const brimExt = { depth: 0.04, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 }
        const crownExt = { depth: 0.18, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3 }
        return (
          <group position={[0, y - 0.06, 0]} scale={s}>
            <mesh material={mainMat} castShadow rotation={[-Math.PI / 2, 0, 0]}>
              <extrudeGeometry args={[brimShape, brimExt]} />
            </mesh>
            <mesh position={[0, 0.02, 0]} material={mainMat} castShadow rotation={[-Math.PI / 2, 0, 0]}>
              <extrudeGeometry args={[crownShape, crownExt]} />
            </mesh>
          </group>
        )
      }
      case 'bag': {
        const bagShape = new THREE.Shape()
        bagShape.moveTo(-0.12, -0.1)
        bagShape.lineTo(-0.12, 0.1)
        bagShape.quadraticCurveTo(-0.12, 0.12, -0.1, 0.12)
        bagShape.lineTo(0.1, 0.12)
        bagShape.quadraticCurveTo(0.12, 0.12, 0.12, 0.1)
        bagShape.lineTo(0.12, -0.1)
        bagShape.quadraticCurveTo(0.12, -0.12, 0.1, -0.12)
        bagShape.lineTo(-0.1, -0.12)
        bagShape.quadraticCurveTo(-0.12, -0.12, -0.12, -0.1)
        const ext = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.005, bevelSegments: 3 }
        return (
          <group position={[0.52, y, 0]} scale={s}>
            <mesh position={[0, 0, 0.04]} material={mainMat} castShadow>
              <extrudeGeometry args={[bagShape, ext]} />
            </mesh>
            <mesh position={[0, 0.15, 0.06]} material={mainMat} castShadow>
              <torusGeometry args={[0.07, 0.012, 8, 16, Math.PI]} />
            </mesh>
            <mesh position={[0, 0.08, 0.09]} material={detailMat} castShadow>
              <boxGeometry args={[0.06, 0.015, 0.015]} />
            </mesh>
          </group>
        )
      }
      case 'necklace': {
        const chainPoints: THREE.Vector3[] = []
        for (let i = 0; i <= 48; i++) {
          const angle = (i / 48) * Math.PI
          chainPoints.push(new THREE.Vector3(Math.cos(angle) * 0.18, -Math.sin(angle) * 0.12, 0))
        }
        const chainCurve = new THREE.CatmullRomCurve3(chainPoints)
        return (
          <group position={[0, y - 0.1, 0.22]} scale={s}>
            <mesh material={mainMat} castShadow>
              <tubeGeometry args={[chainCurve, 48, 0.008, 8, false]} />
            </mesh>
            <mesh position={[0, -0.12, 0]} material={mainMat} castShadow>
              <octahedronGeometry args={[0.035, 1]} />
            </mesh>
            <mesh position={[0, -0.08, 0]} material={mainMat} castShadow>
              <cylinderGeometry args={[0.005, 0.005, 0.06, 6]} />
            </mesh>
          </group>
        )
      }
      case 'bracelet': {
        return (
          <group position={[0.52, y, 0.05]} scale={s}>
            <mesh material={mainMat} castShadow rotation={[0.3, 0, 0]}>
              <torusGeometry args={[0.065, 0.015, 12, 32]} />
            </mesh>
            <mesh position={[0.065, 0, 0]} material={mainMat} castShadow>
              <sphereGeometry args={[0.018, 12, 12]} />
            </mesh>
          </group>
        )
      }
      case 'scarf': {
        const wrapPoints: THREE.Vector3[] = []
        for (let i = 0; i <= 40; i++) {
          const angle = (i / 40) * Math.PI * 1.5 - Math.PI * 0.25
          wrapPoints.push(new THREE.Vector3(Math.cos(angle) * 0.2, Math.sin(angle) * 0.06, 0))
        }
        const wrapCurve = new THREE.CatmullRomCurve3(wrapPoints)
        return (
          <group position={[0, y - 0.15, 0.18]} scale={s}>
            <mesh material={mainMat} castShadow>
              <tubeGeometry args={[wrapCurve, 40, 0.04, 12, false]} />
            </mesh>
            <mesh position={[0.15, -0.18, -0.08]} rotation={[0.2, 0, 0.3]} material={mainMat} castShadow>
              <boxGeometry args={[0.08, 0.28, 0.02]} />
            </mesh>
            <mesh position={[-0.1, -0.14, -0.06]} rotation={[0.15, 0, -0.2]} material={mainMat} castShadow>
              <boxGeometry args={[0.08, 0.22, 0.02]} />
            </mesh>
          </group>
        )
      }
      default:
        return null
    }
  }

  return (
    <group ref={groupRef} visible={visible || currentOpacity.current > 0.01}>
      {renderShape()}
    </group>
  )
}

function Scene({ outfit }: { outfit: OutfitSelection }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.5, 5]} fov={45} />
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={8}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2 + 0.2}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.8}
        zoomSpeed={0.6}
      />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 3, 2]} intensity={0.5} />
      <directionalLight position={[0, -2, -3]} intensity={0.3} />
      <Environment preset="city" />
      <group>
        <MannequinBody />
        <ClothingMesh selected={outfit.top} category="top" />
        <ClothingMesh selected={outfit.bottom} category="bottom" />
        <ClothingMesh selected={outfit.shoes} category="shoes" />
        <ClothingMesh selected={outfit.accessory} category="accessory" />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]} receiveShadow>
        <circleGeometry args={[2.5, 64]} />
        <meshStandardMaterial color="#e8e0d5" roughness={0.9} />
      </mesh>
    </>
  )
}

interface ModelViewerProps {
  outfit: OutfitSelection
}

export default function ModelViewer({ outfit }: ModelViewerProps) {
  return (
    <div className="model-container w-full h-full rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #f5f0e8 0%, #ebe5da 100%)' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Scene outfit={outfit} />
      </Canvas>
    </div>
  )
}

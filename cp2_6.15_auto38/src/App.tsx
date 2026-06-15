import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { camera, renderer, scene } from './SceneSetup'
import {
  createAuroraParticles,
  updateAuroraParticles,
  triggerExplosion,
  updateColorMode,
  updateParticleCount,
  type AuroraData,
} from './AuroraParticles'
import { createStarField, updateStarField, type StarData } from './StarField'
import ControlPanel from './ControlPanel'
import { useAuroraStore, type ColorMode } from './store'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const auroraDataRef = useRef<AuroraData | null>(null)
  const starDataRef = useRef<StarData | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const elapsedFramesRef = useRef(0)
  const animationIdRef = useRef<number>(0)
  const startTimeRef = useRef(0)
  const [isInitialized, setIsInitialized] = useState(false)

  const { colorMode, particleCount } = useAuroraStore()

  const prevColorModeRef = useRef<ColorMode>(colorMode)
  const prevParticleCountRef = useRef(particleCount)

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.appendChild(renderer.domElement)

    const starData = createStarField()
    scene.add(starData.points)
    starDataRef.current = starData

    const auroraData = createAuroraParticles(particleCount)
    scene.add(auroraData.points)
    auroraDataRef.current = auroraData

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 20
    controls.maxDistance = 200
    controls.autoRotate = false
    controlsRef.current = controls

    startTimeRef.current = performance.now() / 1000

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)

      const currentTime = performance.now() / 1000
      const elapsedTime = currentTime - startTimeRef.current
      elapsedFramesRef.current++

      updateStarField(starData, elapsedTime)
      updateAuroraParticles(auroraData, currentTime, elapsedFramesRef.current)

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    const onClick = (event: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)

      if (auroraDataRef.current) {
        const intersects = raycasterRef.current.intersectObject(
          auroraDataRef.current.points
        )

        if (intersects.length > 0) {
          const currentTime = performance.now() / 1000
          const index = intersects[0].index
          if (index !== undefined) {
            triggerExplosion(auroraDataRef.current, index, currentTime)
          }
        }
      }
    }

    renderer.domElement.addEventListener('click', onClick)

    setIsInitialized(true)

    return () => {
      cancelAnimationFrame(animationIdRef.current)
      renderer.domElement.removeEventListener('click', onClick)
      scene.remove(starData.points)
      scene.remove(auroraData.points)
      starData.geometry.dispose()
      starData.material.dispose()
      auroraData.geometry.dispose()
      auroraData.material.dispose()
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  useEffect(() => {
    if (!isInitialized || !auroraDataRef.current) return

    if (prevColorModeRef.current !== colorMode) {
      const currentTime = performance.now() / 1000
      updateColorMode(auroraDataRef.current, colorMode, currentTime)
      prevColorModeRef.current = colorMode
    }

    if (prevParticleCountRef.current !== particleCount) {
      const currentTime = performance.now() / 1000
      updateParticleCount(auroraDataRef.current, particleCount, currentTime)
      prevParticleCountRef.current = particleCount
    }
  }, [colorMode, particleCount, isInitialized])

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <ControlPanel />
    </>
  )
}

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { initScene, animateCameraIn, type SceneCore } from './sceneSetup'
import { addRoots, highlightRoot, getAllRootMeshes, type RootSystem, type RootNode } from './rootSystem'
import { createWaterSimulation, updateWater, setTimeScale, type WaterSimulation } from './waterSim'
import { createUI, updateUI, showHoverTooltip, hideHoverTooltip } from './ui'

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneCoreRef = useRef<SceneCore | null>(null)
  const rootSystemRef = useRef<RootSystem | null>(null)
  const waterSimRef = useRef<WaterSimulation | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const animationIdRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const hoveredNodeRef = useRef<RootNode | null>(null)

  const handleTimeScaleChange = (scale: number) => {
    if (waterSimRef.current) {
      setTimeScale(waterSimRef.current, scale)
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    const sceneCore = initScene(container)
    sceneCoreRef.current = sceneCore

    const rootSystem = addRoots(sceneCore.scene, sceneCore.containerSize)
    rootSystemRef.current = rootSystem

    const waterSim = createWaterSimulation(sceneCore.scene, sceneCore.containerSize)
    waterSimRef.current = waterSim

    createUI(container, { onTimeScaleChange: handleTimeScaleChange })

    animateCameraIn(sceneCore.camera, sceneCore.controls, 2000)

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !sceneCoreRef.current || !rootSystemRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      const rootMeshes = getAllRootMeshes(rootSystemRef.current)
      raycasterRef.current.setFromCamera(mouseRef.current, sceneCoreRef.current.camera)
      const intersects = raycasterRef.current.intersectObjects(rootMeshes)

      if (intersects.length > 0) {
        const node = intersects[0].object.userData.node as RootNode
        hoveredNodeRef.current = node
        showHoverTooltip(node, event.clientX, event.clientY)
        document.body.style.cursor = 'pointer'
      } else {
        if (hoveredNodeRef.current) {
          hideHoverTooltip()
          hoveredNodeRef.current = null
        }
        document.body.style.cursor = 'default'
      }
    }

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !sceneCoreRef.current || !rootSystemRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      const rootMeshes = getAllRootMeshes(rootSystemRef.current)
      raycasterRef.current.setFromCamera(mouseRef.current, sceneCoreRef.current.camera)
      const intersects = raycasterRef.current.intersectObjects(rootMeshes)

      if (intersects.length > 0) {
        const node = intersects[0].object.userData.node as RootNode
        highlightRoot(node, sceneCoreRef.current.scene)
      }
    }

    const animate = (currentTime: number) => {
      animationIdRef.current = requestAnimationFrame(animate)

      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = currentTime

      if (waterSimRef.current && rootSystemRef.current && sceneCoreRef.current) {
        updateWater(
          waterSimRef.current,
          rootSystemRef.current,
          deltaTime,
          sceneCoreRef.current.containerSize,
          sceneCoreRef.current.soilMaterial
        )

        updateUI({
          wheatTotalWater: rootSystemRef.current.wheatTotalWater,
          cornTotalWater: rootSystemRef.current.cornTotalWater,
          wheatWaterRate: rootSystemRef.current.wheatWaterRate,
          cornWaterRate: rootSystemRef.current.cornWaterRate,
          timeScale: waterSimRef.current.timeScale
        })
      }

      sceneCore.controls.update()
      sceneCore.renderer.render(sceneCore.scene, sceneCore.camera)
    }

    lastTimeRef.current = performance.now()
    animate(performance.now())

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)

    return () => {
      cancelAnimationFrame(animationIdRef.current)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)

      if (sceneCore.renderer.domElement.parentNode) {
        sceneCore.renderer.domElement.parentNode.removeChild(sceneCore.renderer.domElement)
      }
      sceneCore.renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0D0D0D'
      }}
    />
  )
}

export default App

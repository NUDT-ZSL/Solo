import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useGame } from '../context/GameContext'
import { GameEngine } from '../core/gameEngine'
import {
  createScene,
  handleResize,
  GRID_SIZE,
  worldToGrid,
  highlightCell,
  clearAllHighlights,
  SceneContext
} from '../renderer/sceneSetup'
import type { ShipType } from '../types'

interface SceneCanvasProps {
  draggingType: ShipType | null
  onDragEnd?: (gridX: number, gridZ: number) => void
  onShipClick?: (shipId: string) => void
  onCanvasClick?: () => void
}

export const SceneCanvas: React.FC<SceneCanvasProps> = ({ draggingType, onDragEnd, onShipClick, onCanvasClick }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { setEngine, setSceneCtx, phase, ships, engine } = useGame()
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const hoveredCell = useRef<{ x: number; z: number } | null>(null)
  const sceneCtxRef = useRef<SceneContext | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const ctx = createScene(containerRef.current)
    sceneCtxRef.current = ctx
    setSceneCtx(ctx)
    const eng = new GameEngine(ctx)
    setEngine(eng)

    const onResize = () => {
      if (containerRef.current && sceneCtxRef.current) {
        handleResize(containerRef.current, sceneCtxRef.current)
      }
    }
    window.addEventListener('resize', onResize)

    const renderLoop = () => {
      if (eng.getPhase() === 'deploy' || eng.getPhase() === 'result') {
        if (sceneCtxRef.current) {
          sceneCtxRef.current.renderer.render(sceneCtxRef.current.scene, sceneCtxRef.current.camera)
        }
      }
      requestAnimationFrame(renderLoop)
    }
    renderLoop()

    return () => {
      window.removeEventListener('resize', onResize)
      eng.cleanup()
    }
  }, [setEngine, setSceneCtx])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const getSceneCtx = () => {
      if (sceneCtxRef.current) return sceneCtxRef.current
      const engCtx = (engine as any)?.ctx
      if (engCtx) {
        sceneCtxRef.current = engCtx
        return engCtx
      }
      return null
    }

    const handleMouseMove = (e: MouseEvent) => {
      const ctx = getSceneCtx()
      if (!ctx) return
      const rect = container.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      if (phase === 'deploy' && draggingType) {
        raycaster.current.setFromCamera(mouse.current, ctx.camera)
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
        const hit = new THREE.Vector3()
        raycaster.current.ray.intersectPlane(plane, hit)

        if (hit) {
          const grid = worldToGrid(hit.x, hit.z)
          const validX = grid.x >= 0 && grid.x < GRID_SIZE
          const validZ = grid.z >= Math.floor(GRID_SIZE / 2) && grid.z < GRID_SIZE

          if (hoveredCell.current && (hoveredCell.current.x !== grid.x || hoveredCell.current.z !== grid.z)) {
            clearAllHighlights(ctx.gridCells)
          }

          if (validX && validZ && grid.x >= 0 && grid.x < GRID_SIZE && grid.z >= 0 && grid.z < GRID_SIZE) {
            const cell = ctx.gridCells[grid.x][grid.z]
            const playerShips = ships.filter(s => s.faction === 'player')
            const isOccupied = playerShips.some(s => {
              const sg = worldToGrid(s.position.x, s.position.z)
              return sg.x === grid.x && sg.z === grid.z
            })
            const canDeploy = playerShips.length < 8
            highlightCell(cell, isOccupied || !canDeploy ? 'invalid' : 'valid')
            hoveredCell.current = grid
          } else if (hoveredCell.current) {
            clearAllHighlights(ctx.gridCells)
            hoveredCell.current = null
          }
        }
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      if (phase !== 'deploy' || !draggingType) return
      const ctx = getSceneCtx()
      if (!ctx) return
      const rect = container.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(mouse.current, ctx.camera)
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const hit = new THREE.Vector3()
      raycaster.current.ray.intersectPlane(plane, hit)

      if (hit && onDragEnd) {
        const grid = worldToGrid(hit.x, hit.z)
        clearAllHighlights(ctx.gridCells)
        hoveredCell.current = null
        onDragEnd(grid.x, grid.z)
      }
    }

    const handleClick = (e: MouseEvent) => {
      const ctx = getSceneCtx()
      if (!ctx) return
      const rect = container.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(mouse.current, ctx.camera)
      const allMeshes: THREE.Object3D[] = []
      for (const ship of ships) {
        if (ship.mesh) allMeshes.push(ship.mesh)
      }
      const intersects = raycaster.current.intersectObjects(allMeshes, true)

      if (intersects.length > 0 && onShipClick) {
        let obj: THREE.Object3D | null = intersects[0].object
        while (obj && obj.parent && !ships.some(s => s.mesh === obj)) {
          obj = obj.parent
        }
        const ship = ships.find(s => s.mesh === obj)
        if (ship) {
          onShipClick(ship.id)
          return
        }
      }
      onCanvasClick?.()
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('drop', handleDrop)
    container.addEventListener('dragover', (e) => e.preventDefault())
    container.addEventListener('click', handleClick)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('drop', handleDrop)
      container.removeEventListener('click', handleClick)
    }
  }, [draggingType, phase, ships, onDragEnd, onShipClick, onCanvasClick, engine])

  return (
    <div
      ref={containerRef}
      className="scene-canvas"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
    />
  )
}

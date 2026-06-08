import { useEffect, useRef, useCallback } from 'react'
import { AnimationEngine } from '@/utils/animationEngine'
import { useBottleStore } from '@/store/bottleStore'
import BottleCard from './BottleCard'
import CreateBottleModal from './CreateBottleModal'

export default function OceanView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<AnimationEngine | null>(null)
  const { bottles, fetchBottles, selectBottle, setShowCreateModal, setResonanceAnimating } = useBottleStore()

  useEffect(() => {
    fetchBottles()
    const interval = setInterval(fetchBottles, 8000)
    return () => clearInterval(interval)
  }, [fetchBottles])

  useEffect(() => {
    if (!canvasRef.current) return
    if (!engineRef.current) {
      engineRef.current = new AnimationEngine(canvasRef.current)
    }
    const engine = engineRef.current
    engine.resize()
    engine.updateBottles(bottles)
    engine.start()

    return () => {
      engine.stop()
    }
  }, [])

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateBottles(bottles)
    }
  }, [bottles])

  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.resize()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    engine.onBottleClick = (animatedBottle) => {
      selectBottle(animatedBottle.bottleData)
    }
    engine.onBottleHover = () => {}

    return () => {
      engine.onBottleClick = null
      engine.onBottleHover = null
    }
  }, [selectBottle])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    engineRef.current.handleMouseMove(e.clientX - rect.left, e.clientY - rect.top)
  }, [])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    engineRef.current.handleClick(e.clientX - rect.left, e.clientY - rect.top)
  }, [])

  const handleCanvasMouseLeave = useCallback(() => {
    engineRef.current?.handleMouseLeave()
  }, [])

  const handleResonate = useCallback(() => {
    setResonanceAnimating(true)
    setTimeout(() => {
      setResonanceAnimating(false)
    }, 1500)
  }, [setResonanceAnimating])

  return (
    <div className="ocean-view">
      <canvas
        ref={canvasRef}
        className="ocean-canvas"
        onMouseMove={handleCanvasMouseMove}
        onClick={handleCanvasClick}
        onMouseLeave={handleCanvasMouseLeave}
      />

      <div className="ocean-header">
        <h1 className="ocean-title">气味漂流瓶</h1>
        <p className="ocean-subtitle">每段气味记忆，都值得被陌生人温柔地拾起</p>
      </div>

      <button
        className="ocean-create-btn"
        onClick={() => setShowCreateModal(true)}
      >
        <span className="ocean-create-btn-icon">+</span>
        <span className="ocean-create-btn-text">投放</span>
      </button>

      <BottleCard onResonate={handleResonate} />
      <CreateBottleModal />
    </div>
  )
}

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Toolbar } from './components/Toolbar'
import { RadarView } from './components/RadarView'
import { ParticleEngine } from './core/ParticleEngine'
import { LineRenderer } from './core/LineRenderer'
import type { BrushType, BrushParams, ParticleData } from './core/ParticleData'

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const particleSystemRef = useRef<THREE.Points | null>(null)
  const particleEngineRef = useRef<ParticleEngine | null>(null)
  const lineRendererRef = useRef<LineRenderer | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
  
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null)
  const lowResSceneRef = useRef<THREE.Scene | null>(null)
  const lowResCameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const lowResQuadRef = useRef<THREE.Mesh | null>(null)
  const isLowResModeRef = useRef(false)
  
  const [currentBrush, setCurrentBrush] = useState<BrushType>('spray')
  const [brushParams, setBrushParams] = useState<BrushParams>({
    density: 65,
    radius: 80,
    length: 125
  })
  const [particleCount, setParticleCount] = useState(0)
  const [fps, setFps] = useState(0)
  const [cameraDirection, setCameraDirection] = useState(new THREE.Vector3(0, 0, -1))
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  
  const isRightDraggingRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const cameraThetaRef = useRef(0)
  const cameraPhiRef = useRef(Math.PI / 4)
  const cameraDistanceRef = useRef(300)
  const targetThetaRef = useRef(0)
  const targetPhiRef = useRef(Math.PI / 4)
  const targetDistanceRef = useRef(300)
  const frameCountRef = useRef(0)
  const lastFpsUpdateRef = useRef(performance.now())
  const animationIdRef = useRef<number>(0)

  const lerpCamera = useCallback(() => {
    const lerpFactor = 0.1
    
    cameraThetaRef.current += (targetThetaRef.current - cameraThetaRef.current) * lerpFactor
    cameraPhiRef.current += (targetPhiRef.current - cameraPhiRef.current) * lerpFactor
    cameraDistanceRef.current += (targetDistanceRef.current - cameraDistanceRef.current) * lerpFactor

    const camera = cameraRef.current
    if (!camera) return

    const x = cameraDistanceRef.current * Math.sin(cameraPhiRef.current) * Math.sin(cameraThetaRef.current)
    const y = cameraDistanceRef.current * Math.cos(cameraPhiRef.current)
    const z = cameraDistanceRef.current * Math.sin(cameraPhiRef.current) * Math.cos(cameraThetaRef.current)

    camera.position.set(x, y, z)
    camera.lookAt(0, 0, 0)

    const direction = new THREE.Vector3()
    camera.getWorldDirection(direction)
    setCameraDirection(direction)
  }, [])

  const getWorldPosition = useCallback((clientX: number, clientY: number): THREE.Vector3 => {
    const camera = cameraRef.current
    if (!camera || !containerRef.current) return new THREE.Vector3()

    const rect = containerRef.current.getBoundingClientRect()
    mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1

    raycasterRef.current.setFromCamera(mouseRef.current, camera)
    
    const target = new THREE.Vector3()
    raycasterRef.current.ray.intersectPlane(planeRef.current, target)
    
    return target
  }, [])

  const handleBrushChange = useCallback((type: BrushType, params?: BrushParams) => {
    setCurrentBrush(type)
    if (params) {
      setBrushParams(prev => ({ ...prev, ...params }))
    }
    particleEngineRef.current?.setBrush(type, params ?? brushParams)
  }, [brushParams])

  const handleViewChange = useCallback((view: 'front' | 'back' | 'left' | 'right') => {
    switch (view) {
      case 'front':
        targetThetaRef.current = 0
        targetPhiRef.current = Math.PI / 2
        break
      case 'back':
        targetThetaRef.current = Math.PI
        targetPhiRef.current = Math.PI / 2
        break
      case 'left':
        targetThetaRef.current = -Math.PI / 2
        targetPhiRef.current = Math.PI / 2
        break
      case 'right':
        targetThetaRef.current = Math.PI / 2
        targetPhiRef.current = Math.PI / 2
        break
    }
  }, [])

  const handleUndo = useCallback(() => {
    particleEngineRef.current?.undo()
  }, [])

  const handleClear = useCallback(() => {
    setShowClearConfirm(true)
  }, [])

  const confirmClear = useCallback(() => {
    particleEngineRef.current?.clear()
    setShowClearConfirm(false)
  }, [])

  const handleExport = useCallback(() => {
    const engine = particleEngineRef.current
    const camera = cameraRef.current
    if (!engine || !camera) return

    const particles = engine.getParticles()
    
    const exportData = {
      particles: particles.map((p: ParticleData) => ({
        position: [p.position.x, p.position.y, p.position.z],
        color: `#${p.startColor.getHexString()}`,
        radius: p.radius,
        remainingTime: p.remainingTime,
        maxLife: p.maxLife
      })),
      camera: {
        position: [camera.position.x, camera.position.y, camera.position.z],
        fov: camera.fov
      }
    }

    const jsonStr = JSON.stringify(exportData)
    const estimatedSize = new Blob([jsonStr]).size
    
    if (estimatedSize > 5 * 1024 * 1024) {
      alert('导出数据过大（超过5MB），请减少粒子数量后再试')
      return
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NebulaCanvas Gallery</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body {
      background: radial-gradient(ellipse at center, #0a0a1e 0%, #16162a 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    canvas { display: block; }
    .info {
      position: fixed;
      top: 16px;
      left: 16px;
      color: rgba(255,255,255,0.7);
      font-size: 14px;
      background: rgba(10, 10, 30, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 8px 16px;
      backdrop-filter: blur(10px);
    }
    .info .count { color: #a78bfa; font-weight: 600; }
  </style>
</head>
<body>
  <div class="info">NebulaCanvas Gallery · 粒子: <span class="count">${particles.length}</span></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script>
    const data = ${jsonStr};
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(data.camera.fov, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(...data.camera.position);
    camera.lookAt(0, 0, 0);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);
    
    const positions = [];
    const colors = [];
    const sizes = [];
    
    data.particles.forEach(p => {
      positions.push(...p.position);
      const color = new THREE.Color(p.color);
      const lifeRatio = Math.max(0, Math.min(1, p.remainingTime / p.maxLife));
      colors.push(color.r * lifeRatio, color.g * lifeRatio, color.b * lifeRatio);
      sizes.push(p.radius);
    });
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    const linePositions = [];
    const lineColors = [];
    const CONNECTION_DISTANCE = 25;
    
    for (let i = 0; i < data.particles.length; i++) {
      const p1 = data.particles[i];
      for (let j = i + 1; j < data.particles.length; j++) {
        const p2 = data.particles[j];
        const dx = p1.position[0] - p2.position[0];
        const dy = p1.position[1] - p2.position[1];
        const dz = p1.position[2] - p2.position[2];
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
          linePositions.push(...p1.position, ...p2.position);
          const c1 = new THREE.Color(p1.color);
          const c2 = new THREE.Color(p2.color);
          const mixed = c1.clone().lerp(c2, 0.5);
          const alpha1 = Math.max(0, p1.remainingTime / p1.maxLife);
          const alpha2 = Math.max(0, p2.remainingTime / p2.maxLife);
          lineColors.push(mixed.r, mixed.g, mixed.b, alpha1 * 0.3);
          lineColors.push(mixed.r, mixed.g, mixed.b, alpha2 * 0.3);
        }
      }
    }
    
    if (linePositions.length > 0) {
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 4));
      const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
        linewidth: 1
      });
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lines);
    }
    
    const originalPos = [...data.camera.position];
    const radius = Math.sqrt(originalPos[0]**2 + originalPos[1]**2 + originalPos[2]**2);
    let angle = Math.atan2(originalPos[0], originalPos[2]);
    const targetY = originalPos[1];
    
    function animate() {
      requestAnimationFrame(animate);
      angle += 0.002;
      camera.position.x = radius * Math.sin(angle);
      camera.position.z = radius * Math.cos(angle);
      camera.position.y = targetY;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }
    animate();
    
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`

    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nebulacanvas-gallery-${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const setupLowResRendering = useCallback((width: number, height: number) => {
    if (!sceneRef.current || !rendererRef.current) return

    const halfWidth = Math.floor(width / 2)
    const halfHeight = Math.floor(height / 2)

    if (!renderTargetRef.current) {
      renderTargetRef.current = new THREE.WebGLRenderTarget(halfWidth, halfHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
      })
    } else {
      renderTargetRef.current.setSize(halfWidth, halfHeight)
    }

    if (!lowResSceneRef.current) {
      lowResSceneRef.current = new THREE.Scene()
      
      const lowResGeometry = new THREE.PlaneGeometry(2, 2)
      const lowResMaterial = new THREE.MeshBasicMaterial({
        map: renderTargetRef.current.texture,
        transparent: true
      })
      lowResQuadRef.current = new THREE.Mesh(lowResGeometry, lowResMaterial)
      lowResSceneRef.current.add(lowResQuadRef.current)
      
      lowResCameraRef.current = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    rendererRef.current = renderer
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    setupLowResRendering(width, height)

    const particleEngine = new ParticleEngine()
    particleEngineRef.current = particleEngine
    
    particleEngine.on('particleCountChange', (count) => {
      setParticleCount(count as number)
    })

    const lineRenderer = new LineRenderer()
    lineRendererRef.current = lineRenderer
    scene.add(lineRenderer.getLineMesh())

    const particleGeometry = new THREE.BufferGeometry()
    const particleMaterial = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    })
    
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial)
    particleSystemRef.current = particleSystem
    scene.add(particleSystem)

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      setupLowResRendering(w, h)
      setIsToolbarCollapsed(window.innerWidth < 1024)
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const worldPos = getWorldPosition(e.clientX, e.clientY)
        particleEngine.startDrawing(worldPos)
      } else if (e.button === 2) {
        isRightDraggingRef.current = true
        lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (isRightDraggingRef.current) {
        const deltaX = e.clientX - lastMousePosRef.current.x
        const deltaY = e.clientY - lastMousePosRef.current.y
        
        targetThetaRef.current -= deltaX * 0.01
        targetPhiRef.current = Math.max(0.1, Math.min(Math.PI - 0.1, targetPhiRef.current - deltaY * 0.01))
        
        lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      }
      
      const worldPos = getWorldPosition(e.clientX, e.clientY)
      particleEngine.updateDrawing(worldPos)
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        particleEngine.stopDrawing()
      } else if (e.button === 2) {
        isRightDraggingRef.current = false
      }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomSpeed = 0.001
      const newDistance = targetDistanceRef.current + e.deltaY * zoomSpeed * targetDistanceRef.current
      const minDistance = 300 * 0.5
      const maxDistance = 300 * 3
      targetDistanceRef.current = Math.max(minDistance, Math.min(maxDistance, newDistance))
    }

    const handleContextMenu = (e: Event) => {
      e.preventDefault()
    }

    containerRef.current.addEventListener('mousedown', handleMouseDown)
    containerRef.current.addEventListener('mousemove', handleMouseMove)
    containerRef.current.addEventListener('mouseup', handleMouseUp)
    containerRef.current.addEventListener('mouseleave', handleMouseUp)
    containerRef.current.addEventListener('wheel', handleWheel, { passive: false })
    containerRef.current.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('resize', handleResize)

    setIsToolbarCollapsed(window.innerWidth < 1024)

    const clock = new THREE.Clock()

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      
      const deltaTime = Math.min(clock.getDelta(), 0.1)
      
      frameCountRef.current++
      const now = performance.now()
      if (now - lastFpsUpdateRef.current >= 500) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current)))
        frameCountRef.current = 0
        lastFpsUpdateRef.current = now
      }

      particleEngine.update(deltaTime)
      
      lerpCamera()

      const particles = particleEngine.getParticles()
      
      const positions: number[] = []
      const colors: number[] = []
      const sizes: number[] = []

      particles.forEach(p => {
        positions.push(p.position.x, p.position.y, p.position.z)
        const lifeRatio = p.remainingTime / p.maxLife
        colors.push(
          p.startColor.r * lifeRatio,
          p.startColor.g * lifeRatio,
          p.startColor.b * lifeRatio
        )
        sizes.push(p.radius)
      })

      particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      particleGeometry.attributes.position.needsUpdate = true
      particleGeometry.attributes.color.needsUpdate = true
      particleGeometry.computeBoundingSphere()

      const detectionInterval = particleEngine.getConnectionDetectionInterval()
      const skipDistanceThreshold = particleEngine.getSkipDistanceThreshold()
      lineRenderer.update(particles, detectionInterval, skipDistanceThreshold)

      const performanceLevel = particleEngine.getPerformanceLevel()
      isLowResModeRef.current = performanceLevel === 'low' || performanceLevel === 'ultra'

      if (isLowResModeRef.current && renderTargetRef.current && lowResSceneRef.current && lowResCameraRef.current && lowResQuadRef.current) {
        renderer.setRenderTarget(renderTargetRef.current)
        renderer.render(scene, camera)
        
        renderer.setRenderTarget(null)
        renderer.render(lowResSceneRef.current, lowResCameraRef.current)
      } else {
        renderer.setRenderTarget(null)
        renderer.render(scene, camera)
      }
    }

    animate()

    return () => {
      cancelAnimationFrame(animationIdRef.current)
      containerRef.current?.removeEventListener('mousedown', handleMouseDown)
      containerRef.current?.removeEventListener('mousemove', handleMouseMove)
      containerRef.current?.removeEventListener('mouseup', handleMouseUp)
      containerRef.current?.removeEventListener('mouseleave', handleMouseUp)
      containerRef.current?.removeEventListener('wheel', handleWheel)
      containerRef.current?.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('resize', handleResize)
      
      particleGeometry.dispose()
      particleMaterial.dispose()
      lineRenderer.dispose()
      renderer.dispose()
      renderTargetRef.current?.dispose()
      
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [getWorldPosition, lerpCamera, setupLowResRendering])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(ellipse at center, #0a0a1e 0%, #16162a 100%)'
        }}
      />

      <Toolbar
        currentBrush={currentBrush}
        brushParams={brushParams}
        onBrushChange={handleBrushChange}
        isCollapsed={isToolbarCollapsed}
      />

      <div
        style={{
          position: 'fixed',
          top: 16,
          left: isToolbarCollapsed ? 72 : 244,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          transition: 'left 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            background: 'rgba(10, 10, 30, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: '8px 16px',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)'
          }}
          >
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>
              粒子: <span style={{ color: '#a78bfa', fontWeight: 600 }}>{particleCount}</span>
            </span>
          </div>

          <div style={{
            background: 'rgba(10, 10, 30, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: '8px 12px',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            fontSize: 12,
            color: '#94a3b8'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)'
          }}
          >
            FPS: {fps}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleUndo}
            disabled={!particleEngineRef.current?.canUndo()}
            style={{
              padding: '8px 16px',
              background: 'rgba(10, 10, 30, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              color: 'white',
              cursor: particleEngineRef.current?.canUndo() ? 'pointer' : 'not-allowed',
              fontSize: 13,
              transition: 'all 0.2s ease',
              opacity: particleEngineRef.current?.canUndo() ? 1 : 0.4,
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              if (particleEngineRef.current?.canUndo()) {
                e.currentTarget.style.filter = 'brightness(1.1)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)'
            }}
          >
            ↩ 撤销
          </button>

          <button
            onClick={handleClear}
            style={{
              padding: '8px 16px',
              background: 'rgba(10, 10, 30, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)'
            }}
          >
            🗑 清空
          </button>

          <button
            onClick={handleExport}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)'
            }}
          >
            📤 导出画廊
          </button>
        </div>
      </div>

      <RadarView
        cameraDirection={cameraDirection}
        onViewChange={handleViewChange}
      />

      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            transition: 'opacity 0.2s ease'
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 12,
              padding: '24px 32px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              minWidth: 300,
              color: 'white',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 20, textAlign: 'center' }}>
              确定要清空画布吗？
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '8px 24px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 6,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)'
                }}
              >
                取消
              </button>
              <button
                onClick={confirmClear}
                style={{
                  padding: '8px 24px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  borderRadius: 6,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)'
                }}
              >
                清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

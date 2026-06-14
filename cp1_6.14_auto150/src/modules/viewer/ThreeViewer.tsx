/**
 * ThreeViewer - 3D 模型查看器模块（Three.js 渲染）
 *
 * 数据流向：
 * 1. 接收 'model:loaded' 事件（来自 FileUploader），加载模型到场景
 *    设置环境光、方向光，模型居中，相机自动适配距离
 *
 * 2. 监听 canvas 点击事件，通过 Raycaster 检测点击的三角形面片
 *    获取点击点的世界坐标、UV 坐标（通过 barycentric 插值）和 faceIndex
 *    发射 'annotation:create' 事件（给 AnnotationEngine）
 *
 * 3. 接收 'annotation:created' 事件（来自 AnnotationEngine）
 *    根据批注的 worldPosition 在模型表面添加彩色标记球
 *    标记球颜色 #f72585，半径 0.03，始终在最上层渲染
 *
 * 4. 接收 'annotation:deleted' 事件，移除对应 ID 的标记球
 *
 * 5. 接收 'viewer:request-snapshot' 事件（来自 ReportExporter）
 *    调用 getCanvasSnapshot() 截取当前 3D 视图
 *    发射 'viewer:snapshot-ready' 事件返回 base64 图片
 *
 * 与 ReportExporter 的通信：
 * - ReportExporter 通过事件总线请求截图，不直接持有 canvas 引用
 * - ThreeViewer 完成截图后通过事件总线返回 base64 数据
 * - 这种松耦合设计避免了模块间的直接依赖
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ModelData, Annotation, Vector3, UVCoord } from '@/types'
import { eventBus } from '@/utils/EventBus'
import FileDropZone from '@/modules/upload/FileDropZone'

const MARKER_COLOR = 0xf72585
const MARKER_RADIUS = 0.03
const DEFAULT_SNAPSHOT_WIDTH = 1200
const DEFAULT_SNAPSHOT_HEIGHT = 800

interface ThreeViewerProps {
  className?: string
}

const ThreeViewer: React.FC<ThreeViewerProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const modelRef = useRef<THREE.Group | null>(null)
  const markersRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const modelIdRef = useRef<string>('')
  const animationFrameRef = useRef<number>(0)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const canvasClickHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)

  const initScene = useCallback(() => {
    if (!containerRef.current || sceneRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a202c)
    sceneRef.current = scene

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 7)
    scene.add(directionalLight)

    const { clientWidth, clientHeight } = containerRef.current
    const camera = new THREE.PerspectiveCamera(
      50,
      clientWidth / clientHeight,
      0.01,
      1000
    )
    camera.position.set(3, 2, 5)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    })
    renderer.setSize(clientWidth, clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)
    canvasRef.current = renderer.domElement
    rendererRef.current = renderer

    renderer.domElement.style.cursor = 'crosshair'
    renderer.domElement.style.display = 'block'

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 0.5
    controls.maxDistance = 100
    controlsRef.current = controls

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()
  }, [])

  const fitCameraToObject = useCallback((object: THREE.Object3D) => {
    if (!cameraRef.current || !controlsRef.current) return

    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)

    const camera = cameraRef.current
    const fov = (camera.fov * Math.PI) / 180
    const distance = maxDim / 2 / Math.tan(fov / 2) * 1.5

    const direction = new THREE.Vector3(1, 0.8, 1).normalize()
    camera.position.copy(center.clone().add(direction.multiplyScalar(distance)))
    camera.lookAt(center)

    controlsRef.current.target.copy(center)
    controlsRef.current.update()

    if (controlsRef.current) {
      controlsRef.current.minDistance = maxDim * 0.1
      controlsRef.current.maxDistance = maxDim * 20
    }
  }, [])

  const handleModelLoaded = useCallback((modelData: ModelData) => {
    if (!sceneRef.current) return

    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current)
      modelRef.current = null
    }

    markersRef.current.forEach((marker) => {
      sceneRef.current?.remove(marker)
    })
    markersRef.current.clear()

    const model = modelData.scene
    modelRef.current = model
    modelIdRef.current = modelData.id

    model.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    sceneRef.current.add(model)
    fitCameraToObject(model)
    setModelLoaded(true)
    setIsLoading(false)
  }, [fitCameraToObject])

  const createMarker = useCallback(
    (position: Vector3): THREE.Mesh => {
      const geometry = new THREE.SphereGeometry(MARKER_RADIUS, 32, 32)
      const material = new THREE.MeshStandardMaterial({
        color: MARKER_COLOR,
        emissive: MARKER_COLOR,
        emissiveIntensity: 0.3,
      })
      const sphere = new THREE.Mesh(geometry, material)
      sphere.position.set(position.x, position.y, position.z)
      sphere.renderOrder = 999
      sphere.onBeforeRender = (renderer) => {
        renderer.clearDepth()
      }
      return sphere
    },
    []
  )

  const addAnnotationMarker = useCallback(
    (annotation: Annotation) => {
      if (!sceneRef.current) return

      const marker = createMarker(annotation.worldPosition)
      markersRef.current.set(annotation.id, marker)
      sceneRef.current.add(marker)
    },
    [createMarker]
  )

  const removeAnnotationMarker = useCallback((annotationId: string) => {
    if (!sceneRef.current) return

    const marker = markersRef.current.get(annotationId)
    if (marker) {
      sceneRef.current.remove(marker)
      marker.geometry.dispose()
      if (Array.isArray(marker.material)) {
        marker.material.forEach((m) => m.dispose())
      } else {
        marker.material.dispose()
      }
      markersRef.current.delete(annotationId)
    }
  }, [])

  const handleCanvasClick = useCallback(
    (event: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return
      if (!modelRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(
        mouseRef.current,
        cameraRef.current
      )

      const meshes: THREE.Mesh[] = []
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child)
        }
      })

      const intersects = raycasterRef.current.intersectObjects(meshes, false)

      if (intersects.length > 0) {
        const intersection = intersects[0]
        const point = intersection.point
        const face = intersection.face
        const faceIndex = intersection.faceIndex ?? 0

        let uvCoord: UVCoord = { u: 0, v: 0 }
        const mesh = intersection.object as THREE.Mesh
        const uvAttribute = mesh.geometry.attributes.uv

        if (uvAttribute && face) {
          const uv = new THREE.Vector2()
          const uvIndexA = face.a
          const uvIndexB = face.b
          const uvIndexC = face.c

          const uva = new THREE.Vector2(
            uvAttribute.getX(uvIndexA),
            uvAttribute.getY(uvIndexA)
          )
          const uvb = new THREE.Vector2(
            uvAttribute.getX(uvIndexB),
            uvAttribute.getY(uvIndexB)
          )
          const uvc = new THREE.Vector2(
            uvAttribute.getX(uvIndexC),
            uvAttribute.getY(uvIndexC)
          )

          const barycoord = (intersection as any).barycoord
          if (barycoord) {
            uv.x =
              uva.x * barycoord.x + uvb.x * barycoord.y + uvc.x * barycoord.z
            uv.y =
              uva.y * barycoord.x + uvb.y * barycoord.y + uvc.y * barycoord.z
          }
          uvCoord = { u: uv.x, v: uv.y }
        }

        const worldPosition: Vector3 = {
          x: point.x,
          y: point.y,
          z: point.z,
        }

        eventBus.emit('annotation:create', {
          worldPosition,
          uvCoord,
          faceIndex,
          modelId: modelIdRef.current,
        })
      }
    },
    []
  )

  const getCanvasSnapshot = useCallback(
    (targetWidth: number = DEFAULT_SNAPSHOT_WIDTH, targetHeight: number = DEFAULT_SNAPSHOT_HEIGHT): string => {
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) {
        return ''
      }

      const renderer = rendererRef.current
      const camera = cameraRef.current
      const scene = sceneRef.current
      const dpr = Math.max(window.devicePixelRatio || 1, 1)

      const originalSize = new THREE.Vector2()
      renderer.getSize(originalSize)
      const originalPixelRatio = renderer.getPixelRatio()

      try {
        const scaledWidth = targetWidth * dpr
        const scaledHeight = targetHeight * dpr

        renderer.setSize(targetWidth, targetHeight, false)
        renderer.setPixelRatio(dpr)
        renderer.render(scene, camera)

        const sourceCanvas = renderer.domElement
        const outputCanvas = document.createElement('canvas')
        outputCanvas.width = targetWidth
        outputCanvas.height = targetHeight

        const ctx = outputCanvas.getContext('2d')
        if (!ctx) {
          return sourceCanvas.toDataURL('image/png')
        }

        ctx.scale(dpr, dpr)
        ctx.drawImage(
          sourceCanvas,
          0,
          0,
          scaledWidth,
          scaledHeight,
          0,
          0,
          targetWidth,
          targetHeight
        )

        const dataUrl = outputCanvas.toDataURL('image/png')

        return dataUrl
      } finally {
        renderer.setSize(originalSize.x, originalSize.y, false)
        renderer.setPixelRatio(originalPixelRatio)
        renderer.render(scene, camera)
      }
    },
    []
  )

  const handleSnapshotRequest = useCallback(
    (data: { width: number; height: number }) => {
      const snapshot = getCanvasSnapshot(data.width, data.height)
      eventBus.emit('viewer:snapshot-ready', snapshot)
    },
    [getCanvasSnapshot]
  )

  useEffect(() => {
    initScene()

    const handleResize = () => {
      if (
        !containerRef.current ||
        !cameraRef.current ||
        !rendererRef.current
      ) {
        return
      }

      const { clientWidth, clientHeight } = containerRef.current
      cameraRef.current.aspect = clientWidth / clientHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(clientWidth, clientHeight)
    }

    window.addEventListener('resize', handleResize)

    eventBus.on('model:loaded', handleModelLoaded)
    eventBus.on('annotation:created', addAnnotationMarker)
    eventBus.on('annotation:deleted', removeAnnotationMarker)
    eventBus.on('viewer:request-snapshot', handleSnapshotRequest)

    eventBus.on('model:error', () => {
      setIsLoading(false)
    })

    if (canvasRef.current) {
      canvasClickHandlerRef.current = handleCanvasClick
      canvasRef.current.addEventListener('click', handleCanvasClick)
    }

    return () => {
      window.removeEventListener('resize', handleResize)

      eventBus.off('model:loaded', handleModelLoaded)
      eventBus.off('annotation:created', addAnnotationMarker)
      eventBus.off('annotation:deleted', removeAnnotationMarker)
      eventBus.off('viewer:request-snapshot', handleSnapshotRequest)

      if (canvasRef.current && canvasClickHandlerRef.current) {
        canvasRef.current.removeEventListener('click', canvasClickHandlerRef.current)
        canvasClickHandlerRef.current = null
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (rendererRef.current) {
        rendererRef.current.dispose()
        if (containerRef.current && canvasRef.current) {
          containerRef.current.removeChild(canvasRef.current)
        }
      }
    }
  }, [
    initScene,
    handleModelLoaded,
    addAnnotationMarker,
    removeAnnotationMarker,
    handleSnapshotRequest,
    handleCanvasClick,
  ])

  return (
    <div
      ref={containerRef}
      className={`three-viewer ${className || ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {!modelLoaded && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            zIndex: 10,
          }}
        >
          <FileDropZone />
        </div>
      )}
    </div>
  )
}

export default ThreeViewer

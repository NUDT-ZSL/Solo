import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ModelData, Annotation, Vector3, UVCoord } from '@/types'
import { eventBus } from '@/utils/EventBus'
import FileDropZone from '@/modules/upload/FileDropZone'

const MARKER_COLOR = 0xf72585
const MARKER_RADIUS = 0.03

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
    (width: number, height: number): string => {
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) {
        return ''
      }

      const renderer = rendererRef.current
      const camera = cameraRef.current
      const scene = sceneRef.current

      const originalSize = new THREE.Vector2()
      renderer.getSize(originalSize)
      const originalPixelRatio = renderer.getPixelRatio()

      renderer.setSize(width, height)
      renderer.setPixelRatio(1)
      renderer.render(scene, camera)

      const dataUrl = renderer.domElement.toDataURL('image/png')

      renderer.setSize(originalSize.x, originalSize.y)
      renderer.setPixelRatio(originalPixelRatio)
      renderer.render(scene, camera)

      return dataUrl
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

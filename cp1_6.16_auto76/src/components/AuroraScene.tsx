import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ParticleSystem } from '../core/ParticleSystem'
import type { ParticleConfig, UIControls, AudioData } from '../types'

interface AuroraSceneProps {
  controls: UIControls
  audioData: AudioData
}

export function AuroraScene({ controls, audioData }: AuroraSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    particleSystem: ParticleSystem
    particlesMesh: THREE.LineSegments
    animationId: number
    isDragging: boolean
    previousMousePosition: { x: number; y: number }
    spherical: { theta: number; phi: number; radius: number }
    target: THREE.Vector3
    clock: THREE.Clock
  } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()

    const skyTopColor = new THREE.Color('#0A0B1E')
    const skyBottomColor = new THREE.Color('#1A1B3A')
    scene.background = skyTopColor

    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#' + skyTopColor.getHexString())
    gradient.addColorStop(1, '#' + skyBottomColor.getHexString())
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 256)
    const gradientTexture = new THREE.CanvasTexture(canvas)
    scene.background = gradientTexture

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    const groundGeometry = new THREE.PlaneGeometry(200, 200)
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: '#E8E8F0',
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    scene.add(ground)

    const particleSystem = new ParticleSystem(4000)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(particleSystem.getPositions(), 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(particleSystem.getColors(), 3))

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const particlesMesh = new THREE.LineSegments(geometry, material)
    scene.add(particlesMesh)

    const starGeometry = new THREE.BufferGeometry()
    const starCount = 500
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 300
      starPositions[i + 1] = Math.random() * 100 + 20
      starPositions[i + 2] = (Math.random() - 0.5) * 300
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
    })
    const stars = new THREE.Points(starGeometry, starMaterial)
    scene.add(stars)

    const clock = new THREE.Clock()
    const spherical = { theta: 0, phi: Math.PI / 3, radius: 40 }
    const target = new THREE.Vector3(0, 10, 0)

    function updateCameraPosition() {
      camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta)
      camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi)
      camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta)
      camera.lookAt(target)
    }
    updateCameraPosition()

    const state = {
      scene,
      camera,
      renderer,
      particleSystem,
      particlesMesh,
      animationId: 0,
      isDragging: false,
      previousMousePosition: { x: 0, y: 0 },
      spherical,
      target,
      clock,
    }
    sceneRef.current = state

    const handleMouseDown = (e: MouseEvent) => {
      state.isDragging = true
      state.previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!state.isDragging) return
      const deltaX = e.clientX - state.previousMousePosition.x
      const deltaY = e.clientY - state.previousMousePosition.y
      state.spherical.theta -= deltaX * 0.005
      state.spherical.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.1, state.spherical.phi - deltaY * 0.005))
      updateCameraPosition()
      state.previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      state.isDragging = false
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      state.spherical.radius = Math.max(15, Math.min(80, state.spherical.radius + e.deltaY * 0.05))
      updateCameraPosition()
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    renderer.domElement.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mouseleave', handleMouseUp)
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('resize', handleResize)

    function animate() {
      state.animationId = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      const particleConfig: ParticleConfig = {
        count: controls.particleCount,
        speed: 1.0,
        length: controls.particleLength,
        colorOffset: controls.colorOffset,
        audioVolume: audioData.volume,
      }

      particleSystem.update(delta, particleConfig)

      const positionAttr = particlesMesh.geometry.getAttribute('position') as THREE.BufferAttribute
      const colorAttr = particlesMesh.geometry.getAttribute('color') as THREE.BufferAttribute
      positionAttr.array = particleSystem.getPositions()
      colorAttr.array = particleSystem.getColors()
      positionAttr.needsUpdate = true
      colorAttr.needsUpdate = true

      particlesMesh.geometry.setDrawRange(0, particleSystem.getActiveCount() * 2)

      stars.rotation.y += delta * 0.01

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(state.animationId)
      renderer.domElement.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mouseleave', handleMouseUp)
      renderer.domElement.removeEventListener('wheel', handleWheel)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      groundGeometry.dispose()
      groundMaterial.dispose()
      starGeometry.dispose()
      starMaterial.dispose()
      gradientTexture.dispose()
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current) return
    const { particleSystem, particlesMesh, clock } = sceneRef.current

    const delta = clock.getDelta()
    const particleConfig: ParticleConfig = {
      count: controls.particleCount,
      speed: 1.0,
      length: controls.particleLength,
      colorOffset: controls.colorOffset,
      audioVolume: audioData.volume,
    }

    particleSystem.update(delta, particleConfig)

    const positionAttr = particlesMesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = particlesMesh.geometry.getAttribute('color') as THREE.BufferAttribute
    positionAttr.needsUpdate = true
    colorAttr.needsUpdate = true

    particlesMesh.geometry.setDrawRange(0, particleSystem.getActiveCount() * 2)
  }, [controls, audioData])

  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
}

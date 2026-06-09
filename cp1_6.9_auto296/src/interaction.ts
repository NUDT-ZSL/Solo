import * as THREE from 'three'
import { CoralSystem } from './coral'

interface RippleEffect {
  mesh: THREE.Mesh
  life: number
  maxLife: number
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera
  private rendererDom: HTMLElement
  private coral: CoralSystem
  private scene: THREE.Scene

  private isDragging = false
  private previousMouse = new THREE.Vector2()
  private spherical: { radius: number; theta: number; phi: number }
  private targetSpherical: { radius: number; theta: number; phi: number }
  private cameraTarget = new THREE.Vector3(0, 0, 0)

  private minRadius = 100
  private maxRadius = 500
  private minPhi = Math.PI * 0.1
  private maxPhi = Math.PI * 0.7

  private cursorEl: HTMLDivElement | null = null
  private ripples: RippleEffect[] = []

  private raycaster = new THREE.Raycaster()
  private ndc = new THREE.Vector2()
  private tempVec = new THREE.Vector3()
  private clickPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)
  private clickPoint = new THREE.Vector3()

  private time = 0

  constructor(
    camera: THREE.PerspectiveCamera,
    rendererDom: HTMLElement,
    coral: CoralSystem,
    scene: THREE.Scene
  ) {
    this.camera = camera
    this.rendererDom = rendererDom
    this.coral = coral
    this.scene = scene

    this.spherical = { radius: 220, theta: 0, phi: Math.PI * 0.45 }
    this.targetSpherical = { ...this.spherical }

    this.setupCursor()
    this.setupEventListeners()
    this.updateCameraFromSpherical()
  }

  private setupCursor() {
    this.cursorEl = document.createElement('div')
    this.cursorEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 0 10px 4px rgba(180, 220, 255, 0.7),
                  0 0 20px 8px rgba(100, 180, 255, 0.4),
                  0 0 40px 16px rgba(60, 120, 255, 0.2);
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: width 0.15s, height 0.15s;
      mix-blend-mode: screen;
    `
    document.body.appendChild(this.cursorEl)
  }

  private setupEventListeners() {
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
    window.addEventListener('wheel', this.onWheel, { passive: false })
    window.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private onMouseMove = (e: MouseEvent) => {
    if (this.cursorEl) {
      this.cursorEl.style.left = e.clientX + 'px'
      this.cursorEl.style.top = e.clientY + 'px'
    }

    this.ndc.x = (e.clientX / window.innerWidth) * 2 - 1
    this.ndc.y = -(e.clientY / window.innerHeight) * 2 + 1

    if (this.isDragging) {
      const dx = e.clientX - this.previousMouse.x
      const dy = e.clientY - this.previousMouse.y

      this.targetSpherical.theta -= dx * 0.005
      this.targetSpherical.phi += dy * 0.005

      this.targetSpherical.phi = Math.max(
        this.minPhi,
        Math.min(this.maxPhi, this.targetSpherical.phi)
      )

      this.previousMouse.set(e.clientX, e.clientY)
    }
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    this.isDragging = true
    this.previousMouse.set(e.clientX, e.clientY)

    if (this.cursorEl) {
      this.cursorEl.style.width = '12px'
      this.cursorEl.style.height = '12px'
    }
  }

  private onMouseUp = (e: MouseEvent) => {
    if (e.button !== 0) return

    const movedDist = Math.hypot(
      e.clientX - this.previousMouse.x,
      e.clientY - this.previousMouse.y
    )

    this.isDragging = false

    if (this.cursorEl) {
      this.cursorEl.style.width = '8px'
      this.cursorEl.style.height = '8px'
    }

    if (movedDist < 5) {
      this.handleClick(e.clientX, e.clientY)
    }
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * 0.15
    this.targetSpherical.radius += delta
    this.targetSpherical.radius = Math.max(
      this.minRadius,
      Math.min(this.maxRadius, this.targetSpherical.radius)
    )
  }

  private handleClick(clientX: number, clientY: number) {
    this.ndc.x = (clientX / window.innerWidth) * 2 - 1
    this.ndc.y = -(clientY / window.innerHeight) * 2 + 1

    this.raycaster.setFromCamera(this.ndc, this.camera)

    const coralDir = this.tempVec
      .copy(this.cameraTarget)
      .sub(this.camera.position)
      .normalize()
    this.clickPlane.setFromNormalAndCoplanarPoint(
      coralDir,
      this.cameraTarget
    )

    if (this.raycaster.ray.intersectPlane(this.clickPlane, this.clickPoint)) {
      this.spawnRipple(clientX, clientY, this.clickPoint)
      this.coral.handleClick(this.clickPoint)
    }
  }

  private spawnRipple(clientX: number, clientY: number, worldPos: THREE.Vector3) {
    const geometry = new THREE.RingGeometry(0.1, 1, 48)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vRadius;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vec3 viewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        varying vec2 vUv;
        void main() {
          float edge = smoothstep(0.0, 0.3, 1.0 - abs(vUv.x - 0.5) * 2.0);
          float fade = 1.0 - smoothstep(0.0, 1.0, uProgress);
          vec3 color = mix(vec3(0.5, 0.8, 1.0), vec3(0.3, 0.5, 0.9), uProgress);
          float alpha = edge * fade * 0.7;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(worldPos)
    mesh.quaternion.copy(this.camera.quaternion)
    mesh.scale.set(5, 5, 5)

    this.scene.add(mesh)
    this.ripples.push({ mesh, life: 0, maxLife: 0.5 })
  }

  private updateRipples(dt: number) {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i]
      ripple.life += dt

      const t = ripple.life / ripple.maxLife
      const mat = ripple.mesh.material as THREE.ShaderMaterial
      mat.uniforms.uProgress.value = t

      const scale = 5 + t * 25
      ripple.mesh.scale.set(scale, scale, scale)

      if (ripple.life >= ripple.maxLife) {
        this.scene.remove(ripple.mesh)
        ripple.mesh.geometry.dispose()
        ;(ripple.mesh.material as THREE.Material).dispose()
        this.ripples.splice(i, 1)
      }
    }
  }

  private updateCameraFromSpherical() {
    const sinPhiRadius = this.spherical.radius * Math.sin(this.spherical.phi)

    this.camera.position.x = this.cameraTarget.x + sinPhiRadius * Math.sin(this.spherical.theta)
    this.camera.position.y = this.cameraTarget.y + this.spherical.radius * Math.cos(this.spherical.phi)
    this.camera.position.z = this.cameraTarget.z + sinPhiRadius * Math.cos(this.spherical.theta)

    this.camera.lookAt(this.cameraTarget)
  }

  public update(dt: number) {
    this.time += dt

    const smoothness = 1 - Math.pow(0.001, dt)
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * smoothness
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * smoothness
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * smoothness

    this.updateCameraFromSpherical()
    this.updateRipples(dt)
  }

  public resize() {
    // 不需要额外处理
  }

  public dispose() {
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mouseup', this.onMouseUp)
    window.removeEventListener('wheel', this.onWheel)

    if (this.cursorEl && this.cursorEl.parentNode) {
      this.cursorEl.parentNode.removeChild(this.cursorEl)
    }

    for (const ripple of this.ripples) {
      this.scene.remove(ripple.mesh)
      ripple.mesh.geometry.dispose()
      ;(ripple.mesh.material as THREE.Material).dispose()
    }
    this.ripples = []
  }
}

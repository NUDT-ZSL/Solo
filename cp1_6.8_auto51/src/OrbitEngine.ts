import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TrackManager, ForkPoint } from './TrackManager'
import { StarShip } from './StarShip'
import type { ForkNodeData } from './store'

interface ParticleData {
  trackIndex: number
  t: number
  speed: number
  phase: number
}

interface ExplosionEffect {
  center: THREE.Vector3
  startTime: number
  duration: number
  sphere: THREE.Mesh
  rays: THREE.Line[]
  maxRadius: number
  done: boolean
}

export class OrbitEngine {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private trackManager: TrackManager
  private starShips: StarShip[] = []
  private particleSystem!: THREE.Points
  private particleGeo!: THREE.BufferGeometry
  private particleData: ParticleData[] = []
  private particlePositions!: Float32Array
  private particleColors!: Float32Array
  private particleSizes!: Float32Array
  private particleMaterial!: THREE.ShaderMaterial
  private forkPointMeshes: THREE.Mesh[] = []
  private explosions: ExplosionEffect[] = []
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private clock = new THREE.Clock()
  private animFrameId = 0
  private flowSpeed = 1.0
  private trailLength = 1.0
  private _onForkPointClick: ((data: ForkNodeData) => void) | null = null
  private initialCameraPos = new THREE.Vector3(18, 10, 18)
  private initialCameraTarget = new THREE.Vector3(0, 0, 0)
  private backgroundStars!: THREE.Points

  onForkPointClick(cb: (data: ForkNodeData) => void) {
    this._onForkPointClick = cb
  }

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    )
    this.camera.position.copy(this.initialCameraPos)
    this.camera.lookAt(this.initialCameraTarget)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x0a0e2a, 1)
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 5
    this.controls.maxDistance = 80
    this.controls.target.copy(this.initialCameraTarget)

    this.trackManager = new TrackManager()

    this.createBackgroundStars()
    this.createParticleSystem(5000)
    this.createStarShips()
    this.createForkPointHitTargets()
    this.addAmbientLight()

    this.renderer.domElement.addEventListener('click', this.onClick.bind(this))
    window.addEventListener('resize', this.onResize.bind(this))

    this.animate()
  }

  private createBackgroundStars() {
    const count = 2000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200
      const brightness = 0.3 + Math.random() * 0.7
      const tint = Math.random()
      if (tint < 0.3) {
        colors[i * 3] = brightness * 0.6
        colors[i * 3 + 1] = brightness * 0.7
        colors[i * 3 + 2] = brightness
      } else if (tint < 0.6) {
        colors[i * 3] = brightness * 0.7
        colors[i * 3 + 1] = brightness * 0.5
        colors[i * 3 + 2] = brightness
      } else {
        colors[i * 3] = brightness * 0.9
        colors[i * 3 + 1] = brightness * 0.85
        colors[i * 3 + 2] = brightness * 0.7
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })
    this.backgroundStars = new THREE.Points(geo, mat)
    this.scene.add(this.backgroundStars)
  }

  private createParticleSystem(count: number) {
    this.particleData = []
    this.particlePositions = new Float32Array(count * 3)
    this.particleColors = new Float32Array(count * 3)
    this.particleSizes = new Float32Array(count)

    const trackCount = this.trackManager.getTrackCount()
    const colorOptions = [
      new THREE.Color(0x4488ff),
      new THREE.Color(0x8844ff),
      new THREE.Color(0xff44aa),
      new THREE.Color(0xb44aff),
      new THREE.Color(0x6644dd),
    ]

    for (let i = 0; i < count; i++) {
      const trackIndex = Math.floor(Math.random() * trackCount)
      const t = Math.random()
      const speed = 0.008 + Math.random() * 0.012
      const phase = Math.random()
      this.particleData.push({ trackIndex, t, speed, phase })

      const pos = this.trackManager.getPointFromTable(trackIndex, t)
      this.particlePositions[i * 3] = pos.x + (Math.random() - 0.5) * 0.3
      this.particlePositions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.3
      this.particlePositions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.3

      const baseColor = colorOptions[Math.floor(Math.random() * colorOptions.length)]
      const variation = 0.15
      this.particleColors[i * 3] = baseColor.r + (Math.random() - 0.5) * variation
      this.particleColors[i * 3 + 1] = baseColor.g + (Math.random() - 0.5) * variation
      this.particleColors[i * 3 + 2] = baseColor.b + (Math.random() - 0.5) * variation

      this.particleSizes[i] = 1.5 + Math.random() * 3.0
    }

    this.particleGeo = new THREE.BufferGeometry()
    this.particleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.particlePositions, 3),
    )
    this.particleGeo.setAttribute(
      'aParticleColor',
      new THREE.BufferAttribute(this.particleColors, 3),
    )
    this.particleGeo.setAttribute(
      'aParticleSize',
      new THREE.BufferAttribute(this.particleSizes, 1),
    )
    this.particleGeo.setAttribute(
      'aPhase',
      new THREE.BufferAttribute(
        new Float32Array(this.particleData.map((d) => d.phase)),
        1,
      ),
    )

    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uExplosionCenter: { value: new THREE.Vector3(9999, 9999, 9999) },
        uExplosionRadius: { value: 0 },
        uExplosionStrength: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform vec3 uExplosionCenter;
        uniform float uExplosionRadius;
        uniform float uExplosionStrength;
        attribute vec3 aParticleColor;
        attribute float aParticleSize;
        attribute float aPhase;
        varying vec3 vPColor;
        varying float vAlpha;

        void main() {
          vec3 pos = position;

          float floatOffset = aPhase * 6.2832;
          pos.x += sin(uTime * 0.4 + floatOffset) * 0.06;
          pos.y += cos(uTime * 0.55 + floatOffset * 1.3) * 0.06;
          pos.z += sin(uTime * 0.35 + floatOffset * 0.7) * 0.06;

          float distToExplosion = distance(pos, uExplosionCenter);
          if (distToExplosion < uExplosionRadius && uExplosionStrength > 0.0) {
            vec3 pushDir = normalize(pos - uExplosionCenter);
            float pushFactor = (1.0 - distToExplosion / uExplosionRadius) * uExplosionStrength;
            pos += pushDir * pushFactor * 3.0;
          }

          float pulse = 1.0 + 0.3 * sin(uTime * 2.0 + floatOffset);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aParticleSize * pulse * (250.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;

          vPColor = aParticleColor;
          float colorPulse = 0.7 + 0.3 * sin(uTime * 1.5 + floatOffset);
          vAlpha = colorPulse;
        }
      `,
      fragmentShader: `
        varying vec3 vPColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float core = 1.0 - smoothstep(0.0, 0.15, dist);
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 1.8);

          vec3 finalColor = vPColor * (core * 2.0 + glow);
          float finalAlpha = vAlpha * glow;

          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.particleSystem = new THREE.Points(this.particleGeo, this.particleMaterial)
    this.scene.add(this.particleSystem)
  }

  private createStarShips() {
    const trackCount = this.trackManager.getTrackCount()
    for (let i = 0; i < trackCount; i++) {
      const shipCount = i === 0 ? 4 : 2
      for (let j = 0; j < shipCount; j++) {
        const startT = j / shipCount
        const ship = new StarShip(this.scene, this.trackManager, i, startT)
        this.starShips.push(ship)
      }
    }
  }

  private createForkPointHitTargets() {
    const allForks = this.trackManager.allForkPoints
    for (let i = 0; i < allForks.length; i++) {
      const fork = allForks[i]
      const geo = new THREE.SphereGeometry(0.6, 16, 16)
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(fork.position)
      mesh.userData = { forkIndex: i, isForkPoint: true }
      this.scene.add(mesh)
      this.forkPointMeshes.push(mesh)
    }
  }

  private addAmbientLight() {
    const ambient = new THREE.AmbientLight(0x223344, 0.3)
    this.scene.add(ambient)
  }

  private onClick(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.forkPointMeshes)

    if (intersects.length > 0) {
      const hit = intersects[0].object
      if (hit.userData.isForkPoint) {
        const forkIndex = hit.userData.forkIndex as number
        const fork = this.trackManager.allForkPoints[forkIndex]
        this.triggerExplosion(fork)
      }
    }
  }

  private triggerExplosion(fork: ForkPoint) {
    const center = fork.position.clone()

    const sphereGeo = new THREE.SphereGeometry(0.15, 32, 32)
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    })
    const sphere = new THREE.Mesh(sphereGeo, sphereMat)
    sphere.position.copy(center)
    this.scene.add(sphere)

    const rayColors = [0x4488ff, 0x8844ff, 0xff44aa, 0xffd700, 0xb44aff, 0xff44cc, 0x6644dd, 0x44ddff]
    const rays: THREE.Line[] = []
    for (let i = 0; i < 10; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      ).normalize()
      const pts = [center.clone(), center.clone().add(dir.clone().multiplyScalar(0.1))]
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({
        color: rayColors[i % rayColors.length],
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      })
      const line = new THREE.Line(geo, mat)
      this.scene.add(line)
      rays.push(line)
    }

    const explosion: ExplosionEffect = {
      center,
      startTime: performance.now() / 1000,
      duration: 1.8,
      sphere,
      rays,
      maxRadius: 4,
      done: false,
    }
    this.explosions.push(explosion)

    if (this._onForkPointClick) {
      this._onForkPointClick({
        x: +fork.position.x.toFixed(2),
        y: +fork.position.y.toFixed(2),
        z: +fork.position.z.toFixed(2),
        curvature: fork.curvature,
        flow: fork.flow,
      })
    }
  }

  private updateExplosions() {
    const now = performance.now() / 1000

    for (const exp of this.explosions) {
      if (exp.done) continue
      const elapsed = now - exp.startTime
      const progress = Math.min(elapsed / exp.duration, 1)

      const sphereScale = 1 + progress * exp.maxRadius * 8
      exp.sphere.scale.setScalar(sphereScale)
      ;(exp.sphere.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - progress * progress)

      for (const ray of exp.rays) {
        const posAttr = ray.geometry.getAttribute('position')
        if (posAttr && posAttr.count >= 2) {
          const sx = posAttr.getX(0)
          const sy = posAttr.getY(0)
          const sz = posAttr.getZ(0)
          const ex = posAttr.getX(1) - sx
          const ey = posAttr.getY(1) - sy
          const ez = posAttr.getZ(1) - sz
          const dir = new THREE.Vector3(ex, ey, ez).normalize()
          const end = new THREE.Vector3(sx, sy, sz).add(
            dir.multiplyScalar(progress * exp.maxRadius * 5),
          )
          posAttr.setXYZ(1, end.x, end.y, end.z)
          posAttr.needsUpdate = true
        }
        ;(ray.material as THREE.LineBasicMaterial).opacity = 0.9 * (1 - progress)
      }

      if (progress < 0.8) {
        this.particleMaterial.uniforms.uExplosionCenter.value.copy(exp.center)
        this.particleMaterial.uniforms.uExplosionRadius.value =
          exp.maxRadius * progress * 2
        this.particleMaterial.uniforms.uExplosionStrength.value =
          (1 - progress) * 1.5
      }

      if (progress >= 1) {
        this.cleanupExplosion(exp)
      }
    }

    this.explosions = this.explosions.filter((e) => !e.done)
  }

  private cleanupExplosion(exp: ExplosionEffect) {
    this.scene.remove(exp.sphere)
    exp.sphere.geometry.dispose()
    ;(exp.sphere.material as THREE.Material).dispose()
    for (const ray of exp.rays) {
      this.scene.remove(ray)
      ray.geometry.dispose()
      ;(ray.material as THREE.Material).dispose()
    }
    exp.done = true
    this.particleMaterial.uniforms.uExplosionStrength.value = 0
  }

  private updateParticles(deltaTime: number) {
    const posAttr = this.particleGeo.getAttribute('position') as THREE.BufferAttribute
    const positions = posAttr.array as Float32Array

    for (let i = 0; i < this.particleData.length; i++) {
      const pd = this.particleData[i]
      pd.t += pd.speed * this.flowSpeed * deltaTime
      if (pd.t > 1) pd.t -= 1
      if (pd.t < 0) pd.t += 1

      const pos = this.trackManager.getPointFromTable(pd.trackIndex, pd.t)
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.05
      positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.05
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.05
    }

    posAttr.needsUpdate = true
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate)
    const delta = Math.min(this.clock.getDelta(), 0.05)

    this.particleMaterial.uniforms.uTime.value = performance.now() / 1000
    this.updateParticles(delta)

    for (const ship of this.starShips) {
      ship.update(delta, this.flowSpeed, this.trailLength)
    }

    this.updateExplosions()

    for (const mesh of this.forkPointMeshes) {
      const pulse = 0.2 + 0.1 * Math.sin(performance.now() / 1000 * 2)
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = pulse
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private onResize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  setFlowSpeed(v: number) {
    this.flowSpeed = v
  }

  setTrailLength(v: number) {
    this.trailLength = v
  }

  setParticleDensity(count: number) {
    this.scene.remove(this.particleSystem)
    this.particleGeo.dispose()
    this.particleMaterial.dispose()
    this.createParticleSystem(count)
  }

  resetCamera() {
    this.camera.position.copy(this.initialCameraPos)
    this.controls.target.copy(this.initialCameraTarget)
    this.controls.update()
  }

  dispose() {
    cancelAnimationFrame(this.animFrameId)
    window.removeEventListener('resize', this.onResize.bind(this))
    this.renderer.domElement.removeEventListener('click', this.onClick.bind(this))
    for (const ship of this.starShips) {
      ship.dispose()
    }
    for (const exp of this.explosions) {
      if (!exp.done) this.cleanupExplosion(exp)
    }
    for (const mesh of this.forkPointMeshes) {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
    if (this.particleGeo) this.particleGeo.dispose()
    if (this.particleMaterial) this.particleMaterial.dispose()
    this.controls.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}

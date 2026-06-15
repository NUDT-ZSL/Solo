import * as THREE from 'three'
import { CoralSystem } from './coral'
import { InteractionManager } from './interaction'

class App {
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private container!: HTMLElement

  private coral!: CoralSystem
  private interaction!: InteractionManager

  private clock!: THREE.Clock
  private backgroundStars: THREE.Points | null = null
  private backgroundMesh: THREE.Mesh | null = null
  private time = 0

  constructor() {
    this.container = document.getElementById('app') || document.body
    this.scene = new THREE.Scene()
    this.clock = new THREE.Clock()

    this.initCamera()
    this.initRenderer()
    this.initLights()
    this.initBackground()
    this.initFog()

    this.coral = new CoralSystem()
    this.scene.add(this.coral.group)

    this.interaction = new InteractionManager(
      this.camera,
      this.renderer.domElement,
      this.coral,
      this.scene
    )

    window.addEventListener('resize', this.onResize)

    this.animate = this.animate.bind(this)
    requestAnimationFrame(this.animate)
  }

  private initCamera() {
    const fov = 55
    const aspect = window.innerWidth / window.innerHeight
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000)
    this.camera.position.set(0, 80, 220)
    this.camera.lookAt(0, 0, 0)
  }

  private initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x000010, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.container.appendChild(this.renderer.domElement)
  }

  private initLights() {
    const ambientLight = new THREE.AmbientLight(0x4060a0, 0.5)
    this.scene.add(ambientLight)

    const topLight = new THREE.DirectionalLight(0x80e0ff, 0.6)
    topLight.position.set(0, 150, 50)
    this.scene.add(topLight)

    const fillLight = new THREE.PointLight(0x4080ff, 0.8, 500)
    fillLight.position.set(-80, 30, -60)
    this.scene.add(fillLight)

    const rimLight = new THREE.PointLight(0xff60a0, 0.4, 400)
    rimLight.position.set(60, -20, -80)
    this.scene.add(rimLight)
  }

  private initFog() {
    this.scene.fog = new THREE.FogExp2(0x0a0520, 0.003)
  }

  private initBackground() {
    const bgGeometry = new THREE.SphereGeometry(1000, 64, 64)
    const bgMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        vec3 hsl2rgb(float h, float s, float l) {
          vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
        }

        void main() {
          float yNormal = normalize(vWorldPosition).y;
          float t = (yNormal + 1.0) * 0.5;

          vec3 bottomColor = hsl2rgb(240.0 / 360.0, 0.9, 0.10);
          vec3 topColor = hsl2rgb(280.0 / 360.0, 0.8, 0.03);
          vec3 baseColor = mix(bottomColor, topColor, pow(t, 0.7));

          float midBand = smoothstep(0.2, 0.5, t) * (1.0 - smoothstep(0.5, 0.8, t));
          vec3 midColor = hsl2rgb(260.0 / 360.0, 0.7, 0.08);
          baseColor = mix(baseColor, midColor, midBand * 0.5);

          float noiseA = sin(vWorldPosition.x * 0.002 + uTime * 0.05) *
                        sin(vWorldPosition.y * 0.003 + uTime * 0.07) *
                        sin(vWorldPosition.z * 0.0025 + uTime * 0.06);
          float noiseB = sin(vWorldPosition.x * 0.005 - uTime * 0.03 + 1.5) *
                        sin(vWorldPosition.z * 0.004 + uTime * 0.04 + 2.3);

          baseColor += 0.008 * noiseA * hsl2rgb(230.0 / 360.0, 1.0, 0.6);
          baseColor += 0.005 * noiseB * hsl2rgb(280.0 / 360.0, 1.0, 0.5);

          float vertGlow = exp(-pow(abs(yNormal - 0.2), 2.0) / 0.15) * 0.1;
          baseColor += vertGlow * hsl2rgb(220.0 / 360.0, 1.0, 0.3);

          gl_FragColor = vec4(baseColor, 1.0);
        }
      `,
    })
    this.backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial)
    this.scene.add(this.backgroundMesh)

    this.initStars()
  }

  private initStars() {
    const starCount = 200
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)
    const phases = new Float32Array(starCount)

    const color = new THREE.Color()

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 700 + Math.random() * 200

      const ix = i * 3
      positions[ix] = radius * Math.sin(phi) * Math.cos(theta)
      positions[ix + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[ix + 2] = radius * Math.cos(phi)

      const hue = 200 + Math.random() * 80
      const lightness = 0.5 + Math.random() * 0.4
      color.setHSL(hue / 360, 0.6 + Math.random() * 0.4, lightness)
      colors[ix] = color.r
      colors[ix + 1] = color.g
      colors[ix + 2] = color.b

      sizes[i] = 1 + Math.random() * 2
      phases[i] = Math.random() * Math.PI * 2
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;

        void main() {
          vColor = color;

          float twinkle = 0.6 + 0.4 * sin(uTime * 1.2 + aPhase);
          float drift = sin(uTime * 0.3 + aPhase * 0.5) * 0.05;

          vec3 pos = position;
          float angle = uTime * 0.02 + aPhase * 0.1;
          float cosA = cos(angle);
          float sinA = sin(angle);
          float x = pos.x * cosA - pos.z * sinA;
          float z = pos.x * sinA + pos.z * cosA;
          pos.x = x;
          pos.z = z;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * twinkle * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;

          vAlpha = (0.1 + 0.2 * twinkle) * (1.0 + drift);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float glow = smoothstep(0.5, 0.0, dist);
          float core = smoothstep(0.3, 0.0, dist);

          vec3 finalColor = vColor * (0.8 + glow * 1.5 + core * 1.2);
          float finalAlpha = vAlpha * (glow * 0.8 + core * 0.4);

          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.backgroundStars = new THREE.Points(geometry, material)
    this.scene.add(this.backgroundStars)
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.interaction.resize()
  }

  private animate() {
    const dt = Math.min(this.clock.getDelta(), 0.1)
    this.time += dt

    if (this.backgroundMesh) {
      ;(this.backgroundMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = this.time
    }
    if (this.backgroundStars) {
      ;(this.backgroundStars.material as THREE.ShaderMaterial).uniforms.uTime.value = this.time
    }

    this.coral.update(dt)
    this.interaction.update(dt)

    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this.animate)
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize)
    this.interaction.dispose()

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        if (obj.geometry) obj.geometry.dispose()
        const mat = obj.material as THREE.Material | THREE.Material[]
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose())
        } else if (mat) {
          mat.dispose()
        }
      }
    })

    this.renderer.dispose()
  }
}

let app: App | null = null

window.addEventListener('DOMContentLoaded', () => {
  app = new App()
})

window.addEventListener('beforeunload', () => {
  if (app) app.dispose()
})

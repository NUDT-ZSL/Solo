import * as THREE from 'three'
import { Butterfly } from './butterfly'
import { Flower } from './flower'
import { randomRange, clamp, hslToColor, lerp } from './particleUtils'

const SPHERE_RADIUS = 8
const SPHERE_INNER_RADIUS = 7.8
const DEFAULT_BUTTERFLIES = 10
const DEFAULT_FLOWERS = 5

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let clock: THREE.Clock

let containerGroup: THREE.Group
let sphereMesh: THREE.Mesh
let starPoints: THREE.Points
let butterflyPoints: THREE.Points
let flowerPoints: THREE.Points
let glowMesh: THREE.Mesh

let butterflies: Butterfly[] = []
let flowers: Flower[] = []
let nextButterflyId = 0
let nextFlowerId = 0

let isDragging = false
let previousMouse = new THREE.Vector2()
let cameraAngleTheta = Math.PI * 0.3
let cameraAnglePhi = Math.PI * 0.4
let cameraDistance = 18

let fpsFrames = 0
let fpsTime = 0
let currentFps = 60
let performanceMode = false
let lowPerfWingCount = 8
let lowPerfFlowerCount = 30
let normalWingCount = 15
let normalFlowerCount = 60

let butterflyStatEl: HTMLElement
let flowerStatEl: HTMLElement
let fpsStatEl: HTMLElement
let resetBtn: HTMLElement

let raycaster: THREE.Raycaster
let mouseNDC: THREE.Vector2

let maxParticles = 50000
let butterflyPositions: Float32Array
let butterflyColors: Float32Array
let butterflySizes: Float32Array
let butterflyOpacities: Float32Array
let flowerPositions: Float32Array
let flowerColors: Float32Array
let flowerSizes: Float32Array
let flowerOpacities: Float32Array

interface ButterflyGeomInfo {
  index: number
  radius: number
}

function init() {
  butterflyStatEl = document.getElementById('butterfly-count')!
  flowerStatEl = document.getElementById('flower-count')!
  fpsStatEl = document.getElementById('fps-value')!
  resetBtn = document.getElementById('reset-btn')!
  resetBtn.addEventListener('click', resetScene)

  scene = new THREE.Scene()
  scene.background = null

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
  updateCameraPosition()

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x000000, 0)
  document.getElementById('app')!.appendChild(renderer.domElement)

  clock = new THREE.Clock()
  raycaster = new THREE.Raycaster()
  mouseNDC = new THREE.Vector2()

  containerGroup = new THREE.Group()
  scene.add(containerGroup)

  createSphereContainer()
  createStarfield()
  createParticleSystems()
  createGlowRing()
  createInitialContent()

  setupEventListeners()
  updateStats()
  animate()
}

function createSphereContainer() {
  const sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64)
  const sphereMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    uniforms: {
      uTopColor: { value: new THREE.Color(0xfff4cc) },
      uBottomColor: { value: new THREE.Color(0x2a0a4a) }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      void main() {
        float t = (vWorldPos.y + ${SPHERE_RADIUS.toFixed(1)}) / (${(SPHERE_RADIUS * 2).toFixed(1)});
        vec3 color = mix(uBottomColor, uTopColor, smoothstep(0.0, 1.0, t));
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0) * 0.15;
        gl_FragColor = vec4(color, 0.35 + fresnel);
      }
    `
  })
  sphereMesh = new THREE.Mesh(sphereGeo, sphereMat)
  containerGroup.add(sphereMesh)

  const wireGeo = new THREE.SphereGeometry(SPHERE_RADIUS + 0.02, 48, 48)
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x8888ff,
    wireframe: true,
    transparent: true,
    opacity: 0.04
  })
  const wireMesh = new THREE.Mesh(wireGeo, wireMat)
  containerGroup.add(wireMesh)
}

function createStarfield() {
  const starCount = 200
  const positions = new Float32Array(starCount * 3)
  const sizes = new Float32Array(starCount)
  const phases = new Float32Array(starCount)

  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = SPHERE_INNER_RADIUS * randomRange(0.92, 0.99)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
    sizes[i] = randomRange(0.02, 0.05)
    phases[i] = Math.random() * Math.PI * 2
  }

  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      varying float vOpacity;
      void main() {
        float flicker = sin(uTime * 3.14159 + aPhase) * 0.5 + 0.5;
        vOpacity = 0.1 + flicker * 0.4;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * 300.0 / -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vOpacity;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d) * vOpacity;
        gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
      }
    `
  })
  starPoints = new THREE.Points(starGeo, starMat)
  containerGroup.add(starPoints)
}

function createParticleSystems() {
  const bfGeo = new THREE.BufferGeometry()
  butterflyPositions = new Float32Array(maxParticles * 3)
  butterflyColors = new Float32Array(maxParticles * 3)
  butterflySizes = new Float32Array(maxParticles)
  butterflyOpacities = new Float32Array(maxParticles)
  bfGeo.setAttribute('position', new THREE.BufferAttribute(butterflyPositions, 3))
  bfGeo.setAttribute('color', new THREE.BufferAttribute(butterflyColors, 3))
  bfGeo.setAttribute('aSize', new THREE.BufferAttribute(butterflySizes, 1))
  bfGeo.setAttribute('aOpacity', new THREE.BufferAttribute(butterflyOpacities, 1))
  bfGeo.setDrawRange(0, 0)

  const pointMat = makeParticleMaterial(true)
  butterflyPoints = new THREE.Points(bfGeo, pointMat)
  butterflyPoints.frustumCulled = false
  containerGroup.add(butterflyPoints)

  const flGeo = new THREE.BufferGeometry()
  flowerPositions = new Float32Array(maxParticles * 3)
  flowerColors = new Float32Array(maxParticles * 3)
  flowerSizes = new Float32Array(maxParticles)
  flowerOpacities = new Float32Array(maxParticles)
  flGeo.setAttribute('position', new THREE.BufferAttribute(flowerPositions, 3))
  flGeo.setAttribute('color', new THREE.BufferAttribute(flowerColors, 3))
  flGeo.setAttribute('aSize', new THREE.BufferAttribute(flowerSizes, 1))
  flGeo.setAttribute('aOpacity', new THREE.BufferAttribute(flowerOpacities, 1))
  flGeo.setDrawRange(0, 0)

  const flMat = makeParticleMaterial(false)
  flowerPoints = new THREE.Points(flGeo, flMat)
  flowerPoints.frustumCulled = false
  containerGroup.add(flowerPoints)
}

function makeParticleMaterial(soft: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    vertexShader: `
      attribute float aSize;
      attribute float aOpacity;
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        vColor = color;
        vOpacity = aOpacity;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * 350.0 / -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float falloff = ${soft ? 'smoothstep(0.5, 0.0, d)' : '1.0 - smoothstep(0.0, 0.5, d)'};
        vec3 col = vColor + falloff * 0.3;
        gl_FragColor = vec4(col, falloff * vOpacity);
      }
    `
  })
}

function createGlowRing() {
  const glowGeo = new THREE.SphereGeometry(SPHERE_RADIUS + 0.15, 48, 48)
  const glowMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uIntensity: { value: 0.2 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float rim = 1.0 - max(0.0, dot(vNormal, vViewDir));
        rim = pow(rim, 3.0);
        vec3 color = vec3(0.3, 0.5, 1.0);
        gl_FragColor = vec4(color, rim * uIntensity);
      }
    `
  })
  glowMesh = new THREE.Mesh(glowGeo, glowMat)
  containerGroup.add(glowMesh)
}

function randomPositionInSphere(radius: number): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = radius * Math.pow(Math.random(), 1 / 3) * 0.85
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  )
}

function createInitialContent() {
  for (let i = 0; i < DEFAULT_FLOWERS; i++) {
    const pos = randomPositionInSphere(SPHERE_INNER_RADIUS)
    pos.y = Math.max(pos.y, -SPHERE_INNER_RADIUS * 0.3)
    const flower = new Flower(nextFlowerId++, pos, false, normalFlowerCount)
    flowers.push(flower)
  }
  for (let i = 0; i < DEFAULT_BUTTERFLIES; i++) {
    const pos = randomPositionInSphere(SPHERE_INNER_RADIUS)
    const butterfly = new Butterfly(nextButterflyId++, pos, normalWingCount)
    butterflies.push(butterfly)
  }
}

function updateCameraPosition() {
  const x = cameraDistance * Math.sin(cameraAnglePhi) * Math.cos(cameraAngleTheta)
  const y = cameraDistance * Math.cos(cameraAnglePhi)
  const z = cameraDistance * Math.sin(cameraAnglePhi) * Math.sin(cameraAngleTheta)
  camera.position.set(x, y, z)
  camera.lookAt(0, 0, 0)
}

function setupEventListeners() {
  const canvas = renderer.domElement
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('mouseleave', onMouseUp)
  canvas.addEventListener('click', onClick)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('resize', onResize)
}

function onMouseDown(e: MouseEvent) {
  isDragging = true
  previousMouse.set(e.clientX, e.clientY)
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging) return
  const deltaX = e.clientX - previousMouse.x
  const deltaY = e.clientY - previousMouse.y
  cameraAngleTheta += deltaX * 0.005
  cameraAnglePhi = clamp(cameraAnglePhi + deltaY * 0.005, 0.1, Math.PI - 0.1)
  previousMouse.set(e.clientX, e.clientY)
  updateCameraPosition()
}

function onMouseUp() {
  isDragging = false
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  cameraDistance = clamp(cameraDistance + e.deltaY * 0.01, 10, 35)
  updateCameraPosition()
}

function getIntersectionWithSphere(clientX: number, clientY: number): THREE.Vector3 | null {
  const rect = renderer.domElement.getBoundingClientRect()
  mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
  mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouseNDC, camera)
  const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), SPHERE_INNER_RADIUS)
  const target = new THREE.Vector3()
  const hit = raycaster.ray.intersectSphere(sphere, target)
  if (hit && hit.length() <= SPHERE_RADIUS + 0.5) {
    return hit
  }
  const innerHit = raycaster.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(0, 0, 0), SPHERE_RADIUS), target)
  return innerHit || null
}

function onClick(e: MouseEvent) {
  if (isDragging) return

  const rect = renderer.domElement.getBoundingClientRect()
  const dx = e.clientX - (previousMouse.x || e.clientX)
  const dy = e.clientY - (previousMouse.y || e.clientY)
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) return

  const clickPos = getIntersectionWithSphere(e.clientX, e.clientY)
  if (!clickPos) return

  let nearestButterfly: Butterfly | null = null
  let minBDist = Infinity
  for (const b of butterflies) {
    const d = b.position.distanceTo(clickPos)
    if (d < 0.8 && d < minBDist) {
      minBDist = d
      nearestButterfly = b
    }
  }
  if (nearestButterfly) {
    nearestButterfly.onClick(clickPos)
    return
  }

  let nearestFlower: Flower | null = null
  let minFDist = Infinity
  for (const f of flowers) {
    const d = f.position.distanceTo(clickPos)
    const hitR = 0.6 + (f.enhanced ? 0.1 : 0)
    if (d < hitR && d < minFDist) {
      minFDist = d
      nearestFlower = f
    }
  }
  if (nearestFlower) {
    const result = nearestFlower.onClick()
    if (result.burst) {
      const toSpawn = 1 + Math.floor(Math.random() * 2)
      for (let i = 0; i < toSpawn; i++) {
        const pos = nearestFlower.position.clone()
          .add(new THREE.Vector3(randomRange(-0.5, 0.5), randomRange(-0.5, 0.5), randomRange(-0.5, 0.5)))
        const nb = new Butterfly(nextButterflyId++, pos, performanceMode ? lowPerfWingCount : normalWingCount)
        butterflies.push(nb)
      }
    }
    return
  }

  if (clickPos.length() < SPHERE_INNER_RADIUS - 0.5) {
    const budPos = clickPos.clone().multiplyScalar(0.9)
    const newFlower = new Flower(nextFlowerId++, budPos, true, performanceMode ? lowPerfFlowerCount : normalFlowerCount)
    flowers.push(newFlower)
    newFlower.bloom()
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function resetScene() {
  for (const b of butterflies) {
    // dispose not needed
  }
  butterflies = []
  flowers = []
  nextButterflyId = 0
  nextFlowerId = 0
  createInitialContent()
  updateStats()
}

function updateStats() {
  butterflyStatEl.textContent = String(butterflies.length)
  flowerStatEl.textContent = String(flowers.length)
  fpsStatEl.textContent = String(currentFps)
}

function updateButterflyParticles() {
  let bfIdx = 0
  const geo = butterflyPoints.geometry
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
  const colAttr = geo.getAttribute('color') as THREE.BufferAttribute
  const sizeAttr = geo.getAttribute('aSize') as THREE.BufferAttribute
  const opAttr = geo.getAttribute('aOpacity') as THREE.BufferAttribute

  for (const b of butterflies) {
    const data = b.getParticles()
    const n = data.sizes.length
    if (bfIdx + n > maxParticles) break
    for (let i = 0; i < n; i++) {
      const gi = bfIdx + i
      posAttr.array[gi * 3] = data.positions[i * 3]
      posAttr.array[gi * 3 + 1] = data.positions[i * 3 + 1]
      posAttr.array[gi * 3 + 2] = data.positions[i * 3 + 2]
      colAttr.array[gi * 3] = data.colors[i * 3]
      colAttr.array[gi * 3 + 1] = data.colors[i * 3 + 1]
      colAttr.array[gi * 3 + 2] = data.colors[i * 3 + 2]
      sizeAttr.array[gi] = data.sizes[i]
      opAttr.array[gi] = data.opacities[i]
    }
    bfIdx += n
  }
  geo.setDrawRange(0, bfIdx)
  posAttr.needsUpdate = true
  colAttr.needsUpdate = true
  sizeAttr.needsUpdate = true
  opAttr.needsUpdate = true
}

function updateFlowerParticles() {
  let flIdx = 0
  const geo = flowerPoints.geometry
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
  const colAttr = geo.getAttribute('color') as THREE.BufferAttribute
  const sizeAttr = geo.getAttribute('aSize') as THREE.BufferAttribute
  const opAttr = geo.getAttribute('aOpacity') as THREE.BufferAttribute

  for (const f of flowers) {
    const data = f.getParticles()
    const n = data.sizes.length
    if (flIdx + n > maxParticles) break
    for (let i = 0; i < n; i++) {
      const gi = flIdx + i
      posAttr.array[gi * 3] = data.positions[i * 3]
      posAttr.array[gi * 3 + 1] = data.positions[i * 3 + 1]
      posAttr.array[gi * 3 + 2] = data.positions[i * 3 + 2]
      colAttr.array[gi * 3] = data.colors[i * 3]
      colAttr.array[gi * 3 + 1] = data.colors[i * 3 + 1]
      colAttr.array[gi * 3 + 2] = data.colors[i * 3 + 2]
      sizeAttr.array[gi] = data.sizes[i]
      opAttr.array[gi] = data.opacities[i]
    }
    flIdx += n
  }
  geo.setDrawRange(0, flIdx)
  posAttr.needsUpdate = true
  colAttr.needsUpdate = true
  sizeAttr.needsUpdate = true
  opAttr.needsUpdate = true
}

function animate() {
  requestAnimationFrame(animate)
  const deltaTime = Math.min(clock.getDelta(), 0.05)
  const elapsed = clock.elapsedTime

  fpsFrames++
  fpsTime += deltaTime
  if (fpsTime >= 0.5) {
    currentFps = Math.round(fpsFrames / fpsTime)
    fpsFrames = 0
    fpsTime = 0
    updateStats()

    if (currentFps < 25 && !performanceMode) {
      performanceMode = true
      for (const b of butterflies) b.setWingParticleCount(lowPerfWingCount)
      for (const f of flowers) f.setParticleCount(lowPerfFlowerCount)
    } else if (currentFps > 35 && performanceMode) {
      performanceMode = false
      for (const b of butterflies) b.setWingParticleCount(normalWingCount)
      for (const f of flowers) f.setParticleCount(normalFlowerCount)
    }
  }

  const flowerInfos = flowers.map(f => ({
    position: f.position,
    attractRadius: f.attractRadius,
    active: f.active && !f.isBud
  }))

  for (const b of butterflies) {
    b.update(deltaTime, flowerInfos)
  }
  for (const f of flowers) {
    f.update(deltaTime)
  }

  updateButterflyParticles()
  updateFlowerParticles()

  if (starPoints) {
    (starPoints.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed
  }

  const butterflyRatio = clamp(butterflies.length / 50, 0, 1)
  const glowIntensity = lerp(0.2, 0.6, butterflyRatio)
  if (glowMesh) {
    (glowMesh.material as THREE.ShaderMaterial).uniforms.uIntensity.value = glowIntensity
  }

  renderer.render(scene, camera)
}

init()

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import { updateSlope, updateClimate, calculateSlope, getTerrainHeight, ClimateParams } from './environment'
import { VegetationSystem } from './vegetation'

const container = document.getElementById('canvas-container')!
const legend = document.getElementById('legend')!

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)
scene.fog = new THREE.Fog(0x1a1a2e, 60, 120)

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(40, 30, 40)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
container.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.1
controls.maxPolarAngle = Math.PI / 3
controls.autoRotate = true
controls.autoRotateSpeed = 0.5
controls.target.set(0, 0, 0)
controls.update()

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
dirLight.position.set(30, 50, 20)
dirLight.castShadow = true
dirLight.shadow.mapSize.width = 2048
dirLight.shadow.mapSize.height = 2048
dirLight.shadow.camera.near = 0.5
dirLight.shadow.camera.far = 150
dirLight.shadow.camera.left = -60
dirLight.shadow.camera.right = 60
dirLight.shadow.camera.top = 60
dirLight.shadow.camera.bottom = -60
scene.add(dirLight)

const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.3)
scene.add(hemiLight)

const TERRAIN_SIZE = 50
const SEGMENTS = 128
const terrainGeometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEGMENTS, SEGMENTS)
terrainGeometry.rotateX(-Math.PI / 2)

const positions = terrainGeometry.attributes.position
for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i)
  const z = positions.getZ(i)
  const dist = Math.sqrt(x * x + z * z)
  const baseNoise = Math.sin(x * 0.15) * Math.cos(z * 0.12) * 1.5 +
                    Math.sin(x * 0.05 + 1.3) * Math.cos(z * 0.08) * 2.5
  const edgeFalloff = Math.min(1, dist / (TERRAIN_SIZE / 2 - 3))
  const y = baseNoise * edgeFalloff
  positions.setY(i, y)
}
positions.needsUpdate = true
terrainGeometry.computeVertexNormals()

const grassColor = new THREE.Color(0x228B22)
const brownColor = new THREE.Color(0x8B4513)
const rockColor = new THREE.Color(0x696969)

const terrainColors = new Float32Array(positions.count * 3)
terrainGeometry.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3))

const terrainMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  side: THREE.DoubleSide
})

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial)
terrain.receiveShadow = true
terrain.name = 'terrain'
scene.add(terrain)

const gridHelper = new THREE.GridHelper(TERRAIN_SIZE, 50, 0x444466, 0x333355)
gridHelper.position.y = 0.01
scene.add(gridHelper)

const climate: ClimateParams = { humidity: 0.5, temperature: 0.5, rainfall: 0.5 }

const vegetationSystem = new VegetationSystem(scene, terrainGeometry, climate)
vegetationSystem.generateFullTerrain()

function updateTerrainColors(): void {
  const positions = terrainGeometry.attributes.position
  const colors = terrainGeometry.attributes.color as THREE.BufferAttribute
  const arr = colors.array as Float32Array

  const segmentsX = (terrainGeometry.parameters as any).widthSegments
  const segmentsY = (terrainGeometry.parameters as any).heightSegments
  const width = (terrainGeometry.parameters as any).width
  const height = (terrainGeometry.parameters as any).height

  for (let i = 0; i < positions.count; i++) {
    const ix = (i % (segmentsX + 1)) / segmentsX
    const iy = Math.floor(i / (segmentsX + 1)) / segmentsY
    const x = ix * width - width / 2
    const z = iy * height - height / 2
    const slope = calculateSlope(terrainGeometry, x, z)
    const elevation = positions.getY(i)
    const clim = updateClimate(slope, elevation, climate.humidity, climate.temperature, climate.rainfall)

    let col: THREE.Color
    if (slope > 30) {
      col = rockColor.clone()
    } else {
      const t = clim.humidity
      col = brownColor.clone().lerp(grassColor, t)
    }

    arr[i * 3] = col.r
    arr[i * 3 + 1] = col.g
    arr[i * 3 + 2] = col.b
  }

  colors.needsUpdate = true
}

updateTerrainColors()

const panelStyle = `
  position: fixed;
  left: 20px;
  top: 20px;
  width: 280px;
  background: rgba(22, 33, 62, 0.95);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  z-index: 100;
  backdrop-filter: blur(8px);
  color: #fff;
`

const panel = document.createElement('div')
panel.style.cssText = panelStyle
panel.innerHTML = `
  <h3 style="margin-bottom:16px;font-size:16px;color:#e0e0ff;border-bottom:1px solid #2a3a5a;padding-bottom:8px;">
    🌿 生态环境控制面板
  </h3>
  <div id="gui-container" style="margin-bottom:16px;"></div>
  <button id="grow-btn" style="
    width:100%;
    padding:12px 16px;
    background:#0f3460;
    color:#fff;
    border:none;
    border-radius:6px;
    font-size:14px;
    font-weight:600;
    cursor:pointer;
    transition:background 0.2s ease;
    margin-top:8px;
  ">⚡ 加速生长 (点击后再点地面选择区域)</button>
  <div style="margin-top:12px;font-size:11px;color:#8899aa;line-height:1.5;">
    💡 操作提示：<br/>
    • 拖拽地面调整地形<br/>
    • 点击地面刷新植被<br/>
    • 双击平滑切换视角<br/>
    • 鼠标滚轮缩放场景
  </div>
  <div id="stats" style="margin-top:12px;font-size:12px;color:#aabbcc;border-top:1px solid #2a3a5a;padding-top:8px;">
    植被数量: <span id="plant-count">0</span><br/>
    FPS: <span id="fps">0</span>
  </div>
`
document.body.appendChild(panel)

const growBtn = document.getElementById('grow-btn')!
const plantCountEl = document.getElementById('plant-count')!
const fpsEl = document.getElementById('fps')!
const guiContainer = document.getElementById('gui-container')!

const gui = new dat.GUI({ autoPlace: false, width: 240 })
guiContainer.appendChild(gui.domElement)

const guiStyle = gui.domElement.style
guiStyle.background = 'transparent'
guiStyle.boxShadow = 'none'

const params = {
  海拔湿度: climate.humidity,
  温度: climate.temperature,
  雨量: climate.rainfall,
  加速生长: () => { enableGrowMode() }
}

gui.add(params, '海拔湿度', 0, 1, 0.01).onChange(v => {
  climate.humidity = v
  updateTerrainColors()
  vegetationSystem.updateClimate(climate)
  vegetationSystem.checkTreeGeneration(v, climate.temperature)
})

gui.add(params, '温度', 0, 1, 0.01).onChange(v => {
  climate.temperature = v
  vegetationSystem.updateClimate(climate)
  vegetationSystem.checkTreeGeneration(climate.humidity, v)
})

gui.add(params, '雨量', 0, 1, 0.01).onChange(v => {
  climate.rainfall = v
  vegetationSystem.updateClimate(climate)
})

let growMode = false
let mouseDown = false

function enableGrowMode(): void {
  growMode = true
  growBtn.style.background = '#533483'
  growBtn.textContent = '⚡ 已选中，请点击地面确定区域'
}

function disableGrowMode(): void {
  growMode = false
  growBtn.style.background = '#0f3460'
  growBtn.textContent = '⚡ 加速生长 (点击后再点地面选择区域)'
}

growBtn.addEventListener('mouseenter', () => {
  if (!growMode) growBtn.style.background = '#533483'
})
growBtn.addEventListener('mouseleave', () => {
  if (!growMode) growBtn.style.background = '#0f3460'
})
growBtn.addEventListener('click', enableGrowMode)

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const areaIndicator = new THREE.Mesh(
  new THREE.RingGeometry(4.8, 5, 64),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
)
areaIndicator.rotation.x = -Math.PI / 2
areaIndicator.visible = false
scene.add(areaIndicator)

const growIndicator = new THREE.Mesh(
  new THREE.BoxGeometry(10, 0.05, 10),
  new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.3, wireframe: false })
)
const growBorder = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(10, 0.05, 10)),
  new THREE.LineBasicMaterial({ color: 0xffff00 })
)
growIndicator.add(growBorder)
growIndicator.visible = false
scene.add(growIndicator)

function intersectTerrain(clientX: number, clientY: number): THREE.Vector3 | null {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObject(terrain)
  if (hits.length > 0) {
    return hits[0].point.clone()
  }
  return null
}

renderer.domElement.addEventListener('pointermove', (e) => {
  legend.style.transform = `translate(${e.clientX + 10}px, ${e.clientY + 10}px)`

  const point = intersectTerrain(e.clientX, e.clientY)

  if (growMode && point) {
    growIndicator.visible = true
    const y = getTerrainHeight(terrainGeometry, point.x, point.z)
    growIndicator.position.set(point.x, y + 0.1, point.z)
    areaIndicator.visible = false
  } else if (point) {
    if (mouseDown) {
      const amplitude = 3
      updateSlope(terrainGeometry, point.x, point.z, 5, amplitude)
      updateTerrainColors()
    }
    areaIndicator.visible = true
    const y = getTerrainHeight(terrainGeometry, point.x, point.z)
    areaIndicator.position.set(point.x, y + 0.1, point.z)
    growIndicator.visible = false
  } else {
    areaIndicator.visible = false
    growIndicator.visible = false
  }
})

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button === 0) {
    mouseDown = true
    controls.enabled = false
  }
})

let clickStart = 0
let clickStartPos = { x: 0, y: 0 }

renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    clickStart = performance.now()
    clickStartPos = { x: e.clientX, y: e.clientY }
  }
})

renderer.domElement.addEventListener('pointerup', (e) => {
  if (e.button === 0) {
    mouseDown = false
    setTimeout(() => { controls.enabled = true }, 50)

    const dx = e.clientX - clickStartPos.x
    const dy = e.clientY - clickStartPos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const elapsed = performance.now() - clickStart

    if (dist < 5 && elapsed < 300) {
      const point = intersectTerrain(e.clientX, e.clientY)
      if (point) {
        if (growMode) {
          vegetationSystem.accelerateGrowth(point.x, point.z, 10)
          disableGrowMode()
        } else {
          vegetationSystem.recalculateArea(point.x, point.z, 5)
        }
      }
    }
  }
})

let lastDoubleClick = 0
renderer.domElement.addEventListener('dblclick', (e) => {
  const now = performance.now()
  if (now - lastDoubleClick < 500) return
  lastDoubleClick = now

  const point = intersectTerrain(e.clientX, e.clientY)
  if (point) {
    smoothCameraTransition(point)
  }
})

function smoothCameraTransition(target: THREE.Vector3): void {
  const startPos = camera.position.clone()
  const endPos = new THREE.Vector3(target.x, target.y + 10, target.z + 0.1)
  const startTarget = controls.target.clone()
  const endTarget = new THREE.Vector3(target.x, target.y, target.z)
  const startTime = performance.now()
  const duration = 1500
  controls.autoRotate = false

  function animate(): void {
    const elapsed = performance.now() - startTime
    const t = Math.min(1, elapsed / duration)
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    camera.position.lerpVectors(startPos, endPos, eased)
    controls.target.lerpVectors(startTarget, endTarget, eased)
    controls.update()

    if (t < 1) {
      requestAnimationFrame(animate)
    } else {
      setTimeout(() => { controls.autoRotate = true }, 1000)
    }
  }
  animate()
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

let frameCount = 0
let lastFpsTime = performance.now()
const clock = new THREE.Clock()

function animate(): void {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()

  const startTime = performance.now()
  vegetationSystem.growStep()
  const growTime = performance.now() - startTime
  if (growTime > 5 && Math.random() < 0.02) {
    console.warn(`Vegetation update took ${growTime.toFixed(1)}ms`)
  }

  controls.update()
  renderer.render(scene, camera)

  frameCount++
  const now = performance.now()
  if (now - lastFpsTime >= 1000) {
    fpsEl.textContent = String(Math.round(frameCount * 1000 / (now - lastFpsTime)))
    plantCountEl.textContent = String(vegetationSystem.getPlantCount())
    frameCount = 0
    lastFpsTime = now
  }
  void delta
}

animate()

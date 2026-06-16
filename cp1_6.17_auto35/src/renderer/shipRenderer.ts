import * as THREE from 'three'
import type { Ship, ShipType } from '../types'

const SHIP_COLORS: Record<ShipType, number> = {
  frigate: 0x4FC3F7,
  destroyer: 0x81C784,
  battleship: 0xFF8A65,
  carrier: 0xCE93D8
}

const SHIP_ENEMY_COLORS: Record<ShipType, number> = {
  frigate: 0xE57373,
  destroyer: 0xA1887F,
  battleship: 0xF06292,
  carrier: 0xFFB74D
}

const LOD_DISTANCE = 15

export function createShipMesh(ship: Ship): THREE.Group {
  const group = new THREE.Group()
  const color = ship.faction === 'player' ? SHIP_COLORS[ship.type] : SHIP_ENEMY_COLORS[ship.type]

  buildShipGeometry(group, ship.type, color, false)

  if (ship.isFlagship) {
    const flagGeometry = new THREE.BoxGeometry(0.1, 0.6, 0.1)
    const flagMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFD700,
      emissiveIntensity: 0.5
    })
    const flag = new THREE.Mesh(flagGeometry, flagMaterial)
    flag.position.set(0, 1.2, 0)
    group.add(flag)

    const ringGeometry = new THREE.RingGeometry(1.2, 1.5, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.05
    group.add(ring)
  }

  const baseGeometry = new THREE.RingGeometry(0.6, 0.9, 16)
  const baseMaterial = new THREE.MeshBasicMaterial({
    color: ship.faction === 'player' ? 0x4FC3F7 : 0xFF5252,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide
  })
  const baseRing = new THREE.Mesh(baseGeometry, baseMaterial)
  baseRing.rotation.x = -Math.PI / 2
  baseRing.position.y = 0.02
  group.add(baseRing)

  addHealthBar(group)
  addSelectionOutline(group)

  group.position.copy(ship.position)
  group.rotation.y = ship.faction === 'player' ? Math.PI : 0

  return group
}

function buildShipGeometry(group: THREE.Group, type: ShipType, color: number, isLOD: boolean): void {
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.6,
    roughness: 0.3,
    emissive: color,
    emissiveIntensity: 0.15
  })

  const darkMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.5),
    metalness: 0.7,
    roughness: 0.2,
    emissive: color,
    emissiveIntensity: 0.08
  })

  if (type === 'frigate') {
    const hull = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1, isLOD ? 4 : 8), material)
    hull.rotation.x = Math.PI / 2
    hull.position.z = 0.1
    group.add(hull)

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.6), darkMaterial)
    body.position.y = 0.1
    group.add(body)

    if (!isLOD) {
      const engine1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.2, 6), material)
      engine1.position.set(-0.15, 0.05, -0.35)
      group.add(engine1)
      const engine2 = engine1.clone()
      engine2.position.x = 0.15
      group.add(engine2)
    }
  } else if (type === 'destroyer') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 1.2), material)
    hull.position.y = 0.15
    group.add(hull)

    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, isLOD ? 4 : 8), darkMaterial)
    bow.rotation.x = Math.PI / 2
    bow.position.z = 0.85
    bow.position.y = 0.15
    group.add(bow)

    if (!isLOD) {
      const turret1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 8), darkMaterial)
      turret1.position.set(0, 0.3, 0.2)
      group.add(turret1)
      const cannon1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.4), material)
      cannon1.position.set(0, 0.35, 0.4)
      group.add(cannon1)
      const turret2 = turret1.clone()
      turret2.position.z = -0.2
      group.add(turret2)
      const cannon2 = cannon1.clone()
      cannon2.position.z = 0
      group.add(cannon2)
    }

    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.3, isLOD ? 4 : 8), material)
    engine.position.set(0, 0.1, -0.7)
    group.add(engine)
  } else if (type === 'battleship') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 1.8), material)
    hull.position.y = 0.25
    group.add(hull)

    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, isLOD ? 4 : 8), darkMaterial)
    bow.rotation.x = Math.PI / 2
    bow.position.z = 1.3
    bow.position.y = 0.25
    group.add(bow)

    const stern = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.5), darkMaterial)
    stern.position.set(0, 0.15, -1.05)
    group.add(stern)

    if (!isLOD) {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), darkMaterial)
      bridge.position.set(0, 0.55, -0.2)
      group.add(bridge)
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.4, 6), material)
      tower.position.set(0, 0.85, -0.2)
      group.add(tower)

      for (let i = -1; i <= 1; i += 2) {
        const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.12, 8), darkMaterial)
        turret.position.set(i * 0.3, 0.45, 0.4)
        group.add(turret)
        const cannon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.6), material)
        cannon.position.set(i * 0.3, 0.5, 0.7)
        group.add(cannon)
      }

      for (let i = -1; i <= 1; i += 2) {
        const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.1, 8), darkMaterial)
        turret.position.set(i * 0.35, 0.45, -0.5)
        group.add(turret)
        const cannon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), material)
        cannon.position.set(i * 0.35, 0.48, -0.25)
        group.add(cannon)
      }
    }
  } else if (type === 'carrier') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.6), material)
    hull.position.y = 0.2
    group.add(hull)

    const flightDeck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 2), darkMaterial)
    flightDeck.position.y = 0.42
    group.add(flightDeck)

    const bow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.5), darkMaterial)
    bow.position.set(0, 0.18, 1.05)
    group.add(bow)

    if (!isLOD) {
      const island = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.5), material)
      island.position.set(0.45, 0.65, -0.1)
      group.add(island)
      const islandTop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3), darkMaterial)
      islandTop.position.set(0.45, 0.95, -0.1)
      group.add(islandTop)

      const planePositions = [
        [-0.3, 0.5], [-0.1, 0.2], [0.1, -0.1], [-0.2, -0.4],
        [0.4, 0.4], [0.55, 0.1], [0.35, -0.2]
      ]
      for (const [px, pz] of planePositions) {
        const plane = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.18), material)
        plane.position.set(px, 0.5, pz)
        const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 0.08), darkMaterial)
        wingL.position.set(px - 0.12, 0.5, pz)
        const wingR = wingL.clone()
        wingR.position.x = px + 0.12
        group.add(plane, wingL, wingR)
      }
    }
  }
}

function createLODMesh(ship: Ship): THREE.Group {
  const group = new THREE.Group()
  const color = ship.faction === 'player' ? SHIP_COLORS[ship.type] : SHIP_ENEMY_COLORS[ship.type]

  const sizeMap: Record<ShipType, number> = {
    frigate: 0.4,
    destroyer: 0.7,
    battleship: 1.2,
    carrier: 1.4
  }

  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.2
  })

  const geometry = ship.type === 'carrier'
    ? new THREE.BoxGeometry(sizeMap[ship.type], sizeMap[ship.type] * 0.3, sizeMap[ship.type] * 1.2)
    : new THREE.ConeGeometry(sizeMap[ship.type] * 0.5, sizeMap[ship.type] * 1.5, 4)
  const mesh = new THREE.Mesh(geometry, material)
  if (ship.type !== 'carrier') {
    mesh.rotation.x = Math.PI / 2
  }
  mesh.position.y = sizeMap[ship.type] * 0.3
  group.add(mesh)

  return group
}

function addHealthBar(group: THREE.Group): void {
  const barWidth = 1.4
  const barHeight = 0.08
  const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight)
  const bgMaterial = new THREE.MeshBasicMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthTest: false
  })
  const bg = new THREE.Mesh(bgGeometry, bgMaterial)
  bg.rotation.x = -Math.PI / 2
  bg.position.y = 2.2
  bg.name = 'healthBarBg'
  group.add(bg)

  const fillGeometry = new THREE.PlaneGeometry(barWidth * 0.98, barHeight * 0.8)
  const fillMaterial = new THREE.MeshBasicMaterial({
    color: 0x4CAF50,
    side: THREE.DoubleSide,
    depthTest: false
  })
  const fill = new THREE.Mesh(fillGeometry, fillMaterial)
  fill.rotation.x = -Math.PI / 2
  fill.position.y = 2.21
  fill.name = 'healthBar'
  group.add(fill)
}

function addSelectionOutline(group: THREE.Group): void {
  const outlineGeometry = new THREE.RingGeometry(1.1, 1.35, 32)
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: 0x4FC3F7,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide
  })
  const outline = new THREE.Mesh(outlineGeometry, outlineMaterial)
  outline.rotation.x = -Math.PI / 2
  outline.position.y = 0.08
  outline.name = 'selectionOutline'
  group.add(outline)
}

export function updateHealthBar(ship: Ship): void {
  if (!ship.mesh) return
  const healthBar = ship.mesh.getObjectByName('healthBar') as THREE.Mesh
  const healthBarBg = ship.mesh.getObjectByName('healthBarBg') as THREE.Mesh
  if (!healthBar || !healthBarBg) return

  const ratio = Math.max(0, ship.hp / ship.maxHp)
  healthBar.scale.x = ratio
  healthBar.position.x = -(1 - ratio) * 0.69

  const material = healthBar.material as THREE.MeshBasicMaterial
  if (ratio > 0.6) {
    material.color.setHex(0x4CAF50)
  } else if (ratio > 0.3) {
    material.color.setHex(0xFFC107)
  } else {
    material.color.setHex(0xF44336)
  }
}

export function setShipSelection(ship: Ship, selected: boolean): void {
  ship.status.selected = selected
  if (!ship.mesh) return
  const outline = ship.mesh.getObjectByName('selectionOutline') as THREE.Mesh
  if (!outline) return
  const material = outline.material as THREE.MeshBasicMaterial
  material.opacity = selected ? 0.8 : 0
}

export function flashDamage(ship: Ship): void {
  if (!ship.mesh) return
  ship.mesh.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      const originalEmissive = child.material.emissive.getHex()
      child.material.emissive.setHex(0xFF0000)
      child.material.emissiveIntensity = 0.8
      setTimeout(() => {
        if (child.material) {
          child.material.emissive.setHex(originalEmissive)
          child.material.emissiveIntensity = 0.15
        }
      }, 150)
    }
  })
}

export function checkAndUpdateLOD(ship: Ship, cameraPosition: THREE.Vector3): void {
  if (!ship.mesh) return
  const distance = ship.position.distanceTo(cameraPosition)
  const shouldBeLOD = distance > LOD_DISTANCE

  if (shouldBeLOD && !ship.isLOD) {
    const currentPos = ship.mesh.position.clone()
    const currentRot = ship.mesh.rotation.clone()
    ship.mesh.clear()
    buildShipGeometry(ship.mesh, ship.type, ship.faction === 'player' ? SHIP_COLORS[ship.type] : SHIP_ENEMY_COLORS[ship.type], true)
    addHealthBar(ship.mesh)
    addSelectionOutline(ship.mesh)
    ship.mesh.position.copy(currentPos)
    ship.mesh.rotation.copy(currentRot)
    ship.isLOD = true
  } else if (!shouldBeLOD && ship.isLOD) {
    const currentPos = ship.mesh.position.clone()
    const currentRot = ship.mesh.rotation.clone()
    ship.mesh.clear()
    const color = ship.faction === 'player' ? SHIP_COLORS[ship.type] : SHIP_ENEMY_COLORS[ship.type]
    buildShipGeometry(ship.mesh, ship.type, color, false)
    addHealthBar(ship.mesh)
    addSelectionOutline(ship.mesh)
    ship.mesh.position.copy(currentPos)
    ship.mesh.rotation.copy(currentRot)
    ship.isLOD = false
  }
}

export function createProjectileMesh(from: THREE.Vector3, to: THREE.Vector3, faction: 'player' | 'enemy'): { mesh: THREE.Mesh; trail: THREE.Points } {
  const direction = to.clone().sub(from).normalize()
  const color = faction === 'player' ? 0x4FC3F7 : 0xFF5252

  const geometry = new THREE.SphereGeometry(0.08, 8, 8)
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(from)

  const trailPositions = new Float32Array(10 * 3)
  const trailGeometry = new THREE.BufferGeometry()
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
  const trailMaterial = new THREE.PointsMaterial({
    color,
    size: 0.06,
    transparent: true,
    opacity: 0.6
  })
  const trail = new THREE.Points(trailGeometry, trailMaterial)

  return { mesh, trail }
}

export function updateProjectileTrail(trail: THREE.Points, headPos: THREE.Vector3): void {
  const positions = trail.geometry.getAttribute('position') as THREE.BufferAttribute
  const arr = positions.array as Float32Array
  for (let i = 9; i > 0; i--) {
    arr[i * 3] = arr[(i - 1) * 3]
    arr[i * 3 + 1] = arr[(i - 1) * 3 + 1]
    arr[i * 3 + 2] = arr[(i - 1) * 3 + 2]
  }
  arr[0] = headPos.x
  arr[1] = headPos.y
  arr[2] = headPos.z
  positions.needsUpdate = true
}

export function createSkillFlash(color: number, duration: number = 100): HTMLDivElement {
  const flash = document.createElement('div')
  flash.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #${color.toString(16).padStart(6, '0')};
    opacity: 0.25;
    pointer-events: none;
    z-index: 9999;
    transition: opacity ${duration}ms ease-out;
  `
  document.body.appendChild(flash)
  requestAnimationFrame(() => {
    flash.style.opacity = '0'
    setTimeout(() => flash.remove(), duration)
  })
  return flash
}

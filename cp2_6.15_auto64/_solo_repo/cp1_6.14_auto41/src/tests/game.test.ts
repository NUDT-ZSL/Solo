import { Player } from '../Player'
import { EchoSystem } from '../EchoSystem'
import { PuzzleManager } from '../PuzzleManager'
import { LEVELS, cloneLevel } from '../LevelData'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`)
  }
  console.log(`  ✓ ${message}`)
}

async function runTests() {
  console.log('\n=== EchoRift Test Suite ===\n')

  console.log('Test 1: Player Wall Collision Boundary')
  testPlayerWallCollision()
  console.log()

  console.log('Test 2: Echo Limit Handling (max 3 echoes)')
  testEchoLimit()
  console.log()

  console.log('Test 3: Pressure Plate Edge Detection')
  testPressurePlateEdgeDetection()
  console.log()

  console.log('Test 4: All Mechanisms Activated Performance')
  await testMechanismPerformance()
  console.log()

  console.log('Test 5: Echo Facing Recording & Playback')
  testEchoFacing()
  console.log()

  console.log('Test 6: Particle Size Pulsing')
  testParticlePulsing()
  console.log()

  console.log('=== All Tests Passed! ===\n')
}

function testPlayerWallCollision() {
  const level = cloneLevel(LEVELS[0])
  const puzzle = new PuzzleManager(level)
  const player = new Player(100, 100)

  const checkCollision = (nx: number, ny: number, r: number): boolean => {
    if (puzzle.checkWallCollision(nx, ny, r)) return true
    if (puzzle.checkBlockCollision(nx, ny, r)) return true
    return false
  }

  const originalX = player.x
  const originalY = player.y

  player.handleKeyDown('a')
  for (let i = 0; i < 100; i++) {
    player.update(16, checkCollision)
  }
  assert(player.x > 30, 'Player cannot pass through left wall')
  assert(player.x !== originalX, 'Player can move freely when not blocked')

  player.x = 60
  player.y = 100
  player.handleKeyDown('a')
  for (let i = 0; i < 20; i++) {
    player.update(16, checkCollision)
  }
  assert(player.x - player.radius >= 30, 'Player collision radius is respected (left edge > wall)')

  player.x = 100
  player.y = 60
  player.handleKeyUp('a')
  player.handleKeyDown('w')
  for (let i = 0; i < 20; i++) {
    player.update(16, checkCollision)
  }
  assert(player.y - player.radius >= 30, 'Top wall collision works')

  player.x = 1540
  player.y = 600
  player.handleKeyUp('w')
  player.handleKeyDown('d')
  for (let i = 0; i < 20; i++) {
    player.update(16, checkCollision)
  }
  assert(player.x + player.radius <= 1570, 'Right wall collision works')

  player.x = 800
  player.y = 1140
  player.handleKeyUp('d')
  player.handleKeyDown('s')
  for (let i = 0; i < 20; i++) {
    player.update(16, checkCollision)
  }
  assert(player.y + player.radius <= 1170, 'Bottom wall collision works')
}

function testEchoLimit() {
  const echoSystem = new EchoSystem()

  const trajectory = Array.from({ length: 10 }, (_, i) => ({
    x: 100 + i,
    y: 100 + i,
    time: i * 100,
    facing: 0,
  }))

  const echo1 = echoSystem.createEcho(100, 100, trajectory)
  assert(echo1 !== null, 'First echo created successfully')
  assert(echoSystem.getActiveEchoes().length === 1, '1 echo active')

  const echo2 = echoSystem.createEcho(200, 200, trajectory)
  assert(echo2 !== null, 'Second echo created successfully')
  assert(echoSystem.getActiveEchoes().length === 2, '2 echoes active')

  const echo3 = echoSystem.createEcho(300, 300, trajectory)
  assert(echo3 !== null, 'Third echo created successfully')
  assert(echoSystem.getActiveEchoes().length === 3, '3 echoes active (max)')

  const echo4 = echoSystem.createEcho(400, 400, trajectory)
  assert(echo4 !== null, 'Fourth echo replaces oldest')
  assert(echoSystem.getActiveEchoes().length === 3, 'Still only 3 echoes active')

  const activeIds = echoSystem.getActiveEchoes().map((e) => e.id)
  assert(!activeIds.includes(echo1!.id), 'Oldest echo (echo1) was removed')
  assert(activeIds.includes(echo2!.id), 'echo2 still active')
  assert(activeIds.includes(echo3!.id), 'echo3 still active')
  assert(activeIds.includes(echo4!.id), 'echo4 is now active')

  echoSystem.clear()
  assert(echoSystem.getActiveEchoes().length === 0, 'Clear removes all echoes')
}

function testPressurePlateEdgeDetection() {
  const level = cloneLevel(LEVELS[0])
  const puzzle = new PuzzleManager(level)
  const player = new Player(100, 100)

  const testPlate = level.plates[0]
  const plateCenterX = testPlate.x + testPlate.size / 2
  const plateCenterY = testPlate.y + testPlate.size / 2

  player.x = plateCenterX + testPlate.size / 2 + player.radius - 2
  player.y = plateCenterY

  puzzle.updatePlates(player, [])
  assert(testPlate.activated === true, 'Player edge touching plate triggers it')

  player.x = plateCenterX + testPlate.size / 2 + player.radius + 5
  player.y = plateCenterY
  puzzle.updatePlates(player, [])
  assert(testPlate.activated === false, 'Player completely outside does not trigger')

  const particle = player.particles[0]
  const originalParticleX = particle.x
  const originalParticleY = particle.y

  player.x = plateCenterX + testPlate.size / 2 + player.radius + 20
  player.y = plateCenterY
  particle.x = plateCenterX + testPlate.size / 2 - 5
  particle.y = plateCenterY
  particle.size = 5

  puzzle.updatePlates(player, [])
  assert(testPlate.activated === true, 'Particle overlapping plate triggers it')

  particle.x = originalParticleX
  particle.y = originalParticleY

  const echoSystem = new EchoSystem()
  const trajectory = Array.from({ length: 10 }, (_, i) => ({
    x: 100 + i,
    y: 100 + i,
    time: i * 100,
    facing: 0,
  }))
  const echo = echoSystem.createEcho(
    plateCenterX + testPlate.size / 2 + 15,
    plateCenterY,
    trajectory
  )!
  echo.phase = 'static'
  echo.particles[0].x = plateCenterX + testPlate.size / 2 - 5
  echo.particles[0].y = plateCenterY
  echo.particles[0].size = 5

  puzzle.updatePlates(player, [echo])
  assert(testPlate.activated === true, 'Echo particle overlapping plate triggers it')
}

async function testMechanismPerformance() {
  const level = cloneLevel(LEVELS[4])
  const puzzle = new PuzzleManager(level)
  const player = new Player(level.playerStart.x, level.playerStart.y)
  const echoSystem = new EchoSystem()

  const trajectory = Array.from({ length: 100 }, (_, i) => ({
    x: level.playerStart.x + i,
    y: level.playerStart.y + i,
    time: i * 20,
    facing: Math.random() * Math.PI * 2,
  }))

  for (let i = 0; i < 3; i++) {
    echoSystem.createEcho(300 + i * 100, 300 + i * 100, trajectory)
  }

  level.plates.forEach((p) => { p.activated = true })
  level.doors.forEach((d) => { d.open = true })

  const iterations = 1000
  const startTime = performance.now()

  for (let i = 0; i < iterations; i++) {
    puzzle.update(16, player, echoSystem.getActiveEchoes())
    echoSystem.update(16)
  }

  const endTime = performance.now()
  const totalTime = endTime - startTime
  const avgTime = totalTime / iterations
  const fps = 1000 / avgTime

  console.log(`  Performance Results:`)
  console.log(`    - Total time for ${iterations} updates: ${totalTime.toFixed(2)}ms`)
  console.log(`    - Average time per update: ${avgTime.toFixed(3)}ms`)
  console.log(`    - Equivalent FPS: ${fps.toFixed(0)}`)

  assert(fps >= 200, `Performance is good (${fps.toFixed(0)} FPS, needs > 200 for 60 FPS headroom)`)
  assert(avgTime <= 5, `Single update takes ${avgTime.toFixed(2)}ms (< 16.6ms for 60 FPS)`)

  const particleCount = player.particles.length +
    echoSystem.getActiveEchoes().reduce((sum, e) => sum + e.particles.length, 0)
  console.log(`    - Total particles: ${particleCount} (limit: 200)`)
  assert(particleCount <= 200, `Particle count ${particleCount} within limit of 200`)
}

function testEchoFacing() {
  const player = new Player(100, 100)
  const echoSystem = new EchoSystem()

  player.startRecording()
  const checkCollision = () => false

  player.handleKeyDown('d')
  for (let i = 0; i < 30; i++) {
    player.update(16, checkCollision)
  }
  assert(Math.abs(player.facing - 0) < 0.1, 'Player facing right (0 radians)')

  player.handleKeyUp('d')
  player.handleKeyDown('s')
  for (let i = 0; i < 30; i++) {
    player.update(16, checkCollision)
  }
  assert(Math.abs(player.facing - Math.PI / 2) < 0.1, 'Player facing down (PI/2 radians)')

  const trajectory = player.stopRecording()
  assert(trajectory.length > 0, 'Trajectory recorded')
  let facingValid = true
  trajectory.forEach((t) => {
    if (typeof t.facing !== 'number') facingValid = false
  })
  assert(facingValid, 'Each frame has facing value recorded')

  const echo = echoSystem.createEcho(player.x, player.y, trajectory)!
  echo.startTime = Date.now() - 1000

  echoSystem.update(16)
  assert(typeof echo.facing === 'number', 'Echo has facing property')

  const firstFacing = trajectory[0].facing
  const lastFacing = trajectory[trajectory.length - 1].facing
  echo.startTime = Date.now() - trajectory[trajectory.length - 1].time - 100
  echoSystem.update(16)
  assert(Math.abs(echo.facing - lastFacing) < 0.1, 'Echo playback matches recorded facing')
}

function testParticlePulsing() {
  const player = new Player(100, 100)

  const initialSizes = player.particles.map((p) => p.size)

  const checkCollision = () => false
  for (let i = 0; i < 60; i++) {
    player.update(16, checkCollision)
  }

  const sizesChanged = player.particles.some((p, i) => Math.abs(p.size - initialSizes[i]) > 0.1)
  assert(sizesChanged, 'Particle sizes change over time (pulsing)')

  for (let i = 0; i < 120; i++) {
    player.update(16, checkCollision)
  }

  let minSize = Infinity
  let maxSize = -Infinity
  player.particles.forEach((p) => {
    minSize = Math.min(minSize, p.baseSize * (1 - 0.35))
    maxSize = Math.max(maxSize, p.baseSize * (1 + 0.35))
  })

  const allInRange = player.particles.every((p) => p.size >= minSize - 0.1 && p.size <= maxSize + 0.1)
  assert(allInRange, 'Particle sizes stay within expected pulsing range')

  let hasBaseSize = true
  let hasSizePhase = true
  player.particles.forEach((p) => {
    if (typeof p.baseSize !== 'number' || p.baseSize <= 0) hasBaseSize = false
    if (typeof p.sizePhase !== 'number') hasSizePhase = false
  })
  assert(hasBaseSize, 'Each particle has a valid base size')
  assert(hasSizePhase, 'Each particle has a size phase')
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:\n', err.message)
  process.exit(1)
})

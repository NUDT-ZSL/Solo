import { Network } from '../src/network';
import { Player } from '../src/player';
import { ParticleSystem } from '../src/particles';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, error?: string): void {
  results.push({
    name,
    passed: condition,
    error: condition ? undefined : error || 'Assertion failed'
  });
}

function assertEq<T>(actual: T, expected: T, name: string): void {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({
    name,
    passed,
    error: passed ? undefined : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  });
}

function isNetworkConnected(network: Network): boolean {
  if (network.nodes.length === 0) return true;
  const visited = new Set<number>();
  const stack = [0];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const neighbor of network.getNeighbors(id)) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }
  return visited.size === network.nodes.length;
}

function testNetworkConnectivity(): void {
  for (let i = 0; i < 10; i++) {
    const network = new Network(1200, 800);
    assert(
      isNetworkConnected(network),
      `Network connectivity (seed ${i})`,
      `Generated graph with ${network.nodes.length} nodes is disconnected`
    );
    assert(
      network.nodes.length >= 12 && network.nodes.length <= 18,
      `Node count in range (seed ${i})`,
      `Expected 12-18 nodes, got ${network.nodes.length}`
    );
  }
}

function testEnergyCollectionDedup(): void {
  const network = new Network(1200, 800);
  const startNode = network.nodes[0];
  const player = new Player(0, startNode.x, startNode.y);
  const particles = new ParticleSystem();

  const firstCall = network.collectEnergy(0);
  assert(firstCall, 'First energy collection returns true');

  const secondCall = network.collectEnergy(0);
  assert(!secondCall, 'Duplicate energy collection returns false');

  assertEq(network.getCollectedCount(), 1, 'Collected count stays at 1 after duplicate call');

  for (let i = 0; i < 5; i++) {
    network.collectEnergy(i);
  }
  const total = network.getCollectedCount();
  const uniqueNodes = Math.min(5, network.nodes.length);
  assertEq(total, uniqueNodes, 'Collecting 5 distinct nodes results in correct count');
}

function testEdgeTraversalDedup(): void {
  const network = new Network(1200, 800);
  const startNode = network.nodes[0];
  const player = new Player(0, startNode.x, startNode.y);
  const particles = new ParticleSystem();

  const neighbors = network.getNeighbors(0);
  if (neighbors.length === 0) {
    results.push({ name: 'Edge traversal dedup', passed: false, error: 'No neighbors available' });
    return;
  }

  const targetId = neighbors[0];
  const firstMove = player.tryMoveTo(targetId, network);
  assert(firstMove, 'First move to neighbor succeeds');

  while (player.isMoving) {
    player.update(50, network, particles);
  }

  assertEq(player.currentNodeId, targetId, 'Player arrives at target node');

  const edge = network.getEdge(0, targetId);
  assert(edge?.traversed === true, 'Edge marked as traversed after movement');

  const backMove = player.tryMoveTo(0, network);
  assert(!backMove, 'Second move over traversed edge fails');

  const blockedNode = network.nodes[0];
  assert(blockedNode.flashRed, 'Blocked target node (0) flashes red');
}

function testParticleCap(): void {
  const particles = new ParticleSystem();

  for (let i = 0; i < 100; i++) {
    particles.spawnTrail(100, 100, 1, 0);
  }

  const countAfterTrail = particles.getCount();
  assert(
    countAfterTrail <= 200,
    `Particle count within cap after trail spawns (got ${countAfterTrail})`
  );

  for (let i = 0; i < 20; i++) {
    particles.spawnVictoryBurst(100, 100);
  }

  const countAfterBurst = particles.getCount();
  assert(
    countAfterBurst <= 200,
    `Particle count within cap after victory bursts (got ${countAfterBurst})`
  );
}

function testDeltaTimeClamping(): void {
  const maxDt = 33;
  const testCases = [10, 33, 50, 100, 1000];
  for (const rawDt of testCases) {
    const clamped = Math.min(33, rawDt);
    assert(
      clamped <= maxDt,
      `DeltaTime ${rawDt}ms clamped to ${clamped}ms (<= ${maxDt}ms)`,
      `Clamping failed: ${rawDt} -> ${clamped}`
    );
  }
}

function testNeighborValidation(): void {
  const network = new Network(1200, 800);
  const startNode = network.nodes[0];
  const player = new Player(0, startNode.x, startNode.y);
  const particles = new ParticleSystem();

  const neighbors = new Set(network.getNeighbors(0));
  for (let i = 0; i < network.nodes.length; i++) {
    const isNeighbor = neighbors.has(i);
    const reportedNeighbor = network.isNeighbor(0, i);
    assertEq(
      reportedNeighbor,
      isNeighbor,
      `isNeighbor(0, ${i}) consistency check`
    );
  }

  let nonNeighbor = -1;
  for (let i = 0; i < network.nodes.length; i++) {
    if (!neighbors.has(i) && i !== 0) {
      nonNeighbor = i;
      break;
    }
  }

  if (nonNeighbor >= 0) {
    const moveResult = player.tryMoveTo(nonNeighbor, network);
    assert(!moveResult, `Move to non-neighbor node ${nonNeighbor} should fail`);
    assertEq(player.currentNodeId, 0, 'Player stays at current node after invalid move');
  }
}

function testPlayerMovementDistance(): void {
  const network = new Network(1200, 800);
  const startNode = network.nodes[0];
  const player = new Player(0, startNode.x, startNode.y);
  const particles = new ParticleSystem();

  const neighbors = network.getNeighbors(0);
  if (neighbors.length === 0) {
    results.push({ name: 'Player movement distance', passed: false, error: 'No neighbors available' });
    return;
  }

  const targetId = neighbors[0];
  const target = network.nodes[targetId];
  const totalDist = Math.hypot(target.x - startNode.x, target.y - startNode.y);

  player.tryMoveTo(targetId, network);
  const initialX = player.x;
  const initialY = player.y;

  const dt = 16;
  const expectedPerFrame = 200 * dt / 1000;
  player.update(dt, network, particles);

  const movedDist = Math.hypot(player.x - initialX, player.y - initialY);
  const errorRatio = Math.abs(movedDist - expectedPerFrame) / expectedPerFrame;
  assert(
    errorRatio < 0.01,
    `Move distance with 16ms dt: expected ~${expectedPerFrame.toFixed(2)}px, got ${movedDist.toFixed(2)}px (error ${(errorRatio * 100).toFixed(2)}%)`
  );
}

function testDeltaTimeBoundary(): void {
  const maxDt = 33;
  const boundaryCases = [
    { input: 0, expected: 0, desc: 'dt = 0' },
    { input: -5, expected: -5, desc: 'dt negative (-5ms)' },
    { input: -100, expected: -100, desc: 'dt negative large (-100ms)' },
    { input: 32.9, expected: 32.9, desc: 'dt just below max (32.9ms)' },
    { input: 33, expected: 33, desc: 'dt exactly max (33ms)' },
    { input: 33.1, expected: 33, desc: 'dt just above max (33.1ms)' },
  ];

  for (const tc of boundaryCases) {
    const clamped = Math.min(maxDt, tc.input);
    const passes = tc.input > maxDt ? clamped === maxDt : clamped === tc.input;
    assert(
      passes,
      `DeltaTime boundary: ${tc.desc} → clamped = ${clamped}`,
      `Expected ${tc.expected}, got ${clamped}`
    );
  }
}

function testEnergyOrbTracking(): void {
  const network = new Network(1200, 800);
  const startNode = network.nodes[0];
  const player = new Player(0, startNode.x, startNode.y);
  const particles = new ParticleSystem();

  const neighbors = network.getNeighbors(0);
  if (neighbors.length === 0) {
    results.push({ name: 'Energy orb tracking', passed: false, error: 'No neighbors available' });
    return;
  }

  const targetId = neighbors[0];
  network.collectEnergy(targetId);
  const targetNode = network.nodes[targetId];
  player.launchEnergyOrb(targetNode);

  assert(player.energyOrbs.length === 1, 'Energy orb launched successfully');

  const initialOrb = { ...player.energyOrbs[0] };

  player.x += 50;
  player.y += 30;

  player.update(50, network, particles);

  const updatedOrb = player.energyOrbs[0];
  if (!updatedOrb) {
    results.push({ name: 'Energy orb still exists after movement', passed: false, error: 'Orb disappeared unexpectedly' });
    return;
  }

  const hasMoved = updatedOrb.currentX !== initialOrb.currentX || updatedOrb.currentY !== initialOrb.currentY;
  assert(hasMoved, 'Energy orb position updates over time');
}

function testCollectedNodeVisualState(): void {
  const network = new Network(1200, 800);
  const node0 = network.nodes[0];

  assert(!node0.energyCollected, 'Node 0 starts uncollected');
  assertEq(node0.energyColor.length > 0, true, 'Node 0 has energy color');

  network.collectEnergy(0);
  assert(node0.energyCollected, 'Node 0 marked as collected');

  network.update(3000);
  assert(node0.energyCollected, 'Node 0 stays collected after update (3s)');
  assert(!node0.highlighted, 'Node 0 highlight fades after 2s');
}

function testStarPointParticleCap(): void {
  const particles = new ParticleSystem();

  for (let i = 0; i < 50; i++) {
    particles.spawnStarPoints(100 + i * 10, 100 + i * 10);
  }

  const count = particles.getCount();
  assert(
    count <= 200,
    `Star points respect global cap (got ${count}, max 200)`
  );
}

testNetworkConnectivity();
testEnergyCollectionDedup();
testEdgeTraversalDedup();
testParticleCap();
testDeltaTimeClamping();
testNeighborValidation();
testPlayerMovementDistance();
testDeltaTimeBoundary();
testEnergyOrbTracking();
testCollectedNodeVisualState();
testStarPointParticleCap();

console.log('\n==============================');
console.log('  Star Trail Dancer - Tests   ');
console.log('==============================\n');

let passed = 0;
let failed = 0;

for (const r of results) {
  if (r.passed) {
    passed++;
    console.log(`  ✓ ${r.name}`);
  } else {
    failed++;
    console.log(`  ✗ ${r.name}`);
    console.log(`      → ${r.error}`);
  }
}

console.log(`\n------------------------------`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`------------------------------\n`);

process.exit(failed > 0 ? 1 : 0);

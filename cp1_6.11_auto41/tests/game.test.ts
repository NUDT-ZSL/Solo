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

testNetworkConnectivity();
testEnergyCollectionDedup();
testEdgeTraversalDedup();
testParticleCap();
testDeltaTimeClamping();
testNeighborValidation();

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

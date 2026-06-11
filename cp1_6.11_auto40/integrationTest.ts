import { generateFaces, Triangle } from './src/faceGenerator';

function createTestImageFile(w: number, h: number, seed: number): File {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  let rnd = seed;
  const rand = () => {
    rnd = (rnd * 9301 + 49297) % 233280;
    return rnd / 233280;
  };
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `rgb(${Math.floor(rand()*255)},${Math.floor(rand()*255)},${Math.floor(rand()*255)})`);
  g.addColorStop(0.5, `rgb(${Math.floor(rand()*255)},${Math.floor(rand()*255)},${Math.floor(rand()*255)})`);
  g.addColorStop(1, `rgb(${Math.floor(rand()*255)},${Math.floor(rand()*255)},${Math.floor(rand()*255)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, 10 + rand() * 50, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.floor(rand()*255)},${Math.floor(rand()*255)},${Math.floor(rand()*255)},0.6)`;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.2);
  ctx.lineTo(w * 0.8, h * 0.3);
  ctx.lineTo(w * 0.5, h * 0.85);
  ctx.closePath();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.stroke();
  const dataUrl = canvas.toDataURL('image/png');
  const bs = atob(dataUrl.split(',')[1]);
  const ab = new ArrayBuffer(bs.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < bs.length; i++) ia[i] = bs.charCodeAt(i);
  return new File([ab], 'test.png', { type: 'image/png' });
}

function validateSharedEdges(tris: Triangle[]): string[] {
  const errors: string[] = [];
  for (let i = 0; i < tris.length; i++) {
    const t = tris[i];
    const neighborSet = new Set(t.neighbors);
    for (const se of t.sharedEdges) {
      if (se.neighborIndex < 0 || se.neighborIndex >= tris.length) {
        errors.push(`Triangle ${i} sharedEdge neighbor out of bounds: ${se.neighborIndex}`);
      }
      if (!neighborSet.has(se.neighborIndex)) {
        errors.push(`Triangle ${i} sharedEdge neighbor ${se.neighborIndex} not in neighbors list`);
      }
    }
    if (t.sharedEdges.length !== t.neighbors.length) {
      errors.push(`Triangle ${i} sharedEdges count (${t.sharedEdges.length}) != neighbors count (${t.neighbors.length})`);
    }
  }
  for (let i = 0; i < tris.length; i++) {
    for (const se of tris[i].sharedEdges) {
      const j = se.neighborIndex;
      const reciprocal = tris[j].sharedEdges.find(x => x.neighborIndex === i);
      if (!reciprocal) {
        errors.push(`Triangle ${i} has sharedEdge to ${j}, but no reciprocal edge`);
      }
    }
  }
  return errors;
}

function validateBFSTraversable(tris: Triangle[]): string[] {
  const errors: string[] = [];
  if (tris.length === 0) return errors;
  let start = 0;
  for (let i = 1; i < tris.length; i++) {
    if (tris[i].area > tris[start].area) start = i;
  }
  const visited = new Set<number>([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of tris[cur].neighbors) {
      if (!visited.has(n) && n < tris.length) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  if (visited.size !== tris.length && tris.length > 10) {
    const isolated = tris.length - visited.size;
    if (isolated > tris.length * 0.2) {
      errors.push(`BFS connectivity poor: ${visited.size}/${tris.length} connected`);
    }
  }
  return errors;
}

async function runTests() {
  console.log('=== Origami Integration Tests ===\n');
  const cases = [
    { name: 'Small (320x240)', w: 320, h: 240, seed: 42 },
    { name: 'Medium (640x480)', w: 640, h: 480, seed: 1337 },
    { name: 'Large (1024x768)', w: 1024, h: 768, seed: 9999 },
    { name: 'Wide (1280x720)', w: 1280, h: 720, seed: 2024 },
  ];
  let allPassed = true;
  for (const tc of cases) {
    console.log(`Case: ${tc.name}`);
    const t0 = performance.now();
    const file = createTestImageFile(tc.w, tc.h, tc.seed);
    let faceData;
    try {
      faceData = await generateFaces(file);
    } catch (e) {
      console.error(`  FAIL: generateFaces threw ${(e as Error).message}`);
      allPassed = false;
      continue;
    }
    const dt = performance.now() - t0;
    console.log(`  generateFaces took: ${dt.toFixed(0)}ms, ${faceData.triangles.length} triangles`);
    if (dt > 3000) {
      console.error(`  FAIL: processing too slow (>3000ms): ${dt.toFixed(0)}ms`);
      allPassed = false;
    } else {
      console.log(`  PASS: within 3000ms budget`);
    }
    if (faceData.triangles.length > 200) {
      console.error(`  FAIL: exceeds 200 triangle limit: ${faceData.triangles.length}`);
      allPassed = false;
    } else if (faceData.triangles.length === 0) {
      console.error(`  FAIL: no triangles generated`);
      allPassed = false;
    } else {
      console.log(`  PASS: triangle count within budget (${faceData.triangles.length}/200)`);
    }
    const seErrors = validateSharedEdges(faceData.triangles);
    if (seErrors.length > 0) {
      console.error(`  FAIL: shared edges invalid, first 3 errors:`);
      for (const err of seErrors.slice(0, 3)) console.error(`    - ${err}`);
      allPassed = false;
    } else {
      console.log(`  PASS: shared edges all consistent and reciprocal`);
    }
    const bfsErrors = validateBFSTraversable(faceData.triangles);
    if (bfsErrors.length > 0) {
      console.error(`  FAIL: BFS connectivity issues:`);
      for (const err of bfsErrors) console.error(`    - ${err}`);
      allPassed = false;
    } else {
      console.log(`  PASS: graph traversable (fold sequence feasible)`);
    }
    let minNeighbor = Infinity, maxNeighbor = 0, sumN = 0;
    for (const t of faceData.triangles) {
      minNeighbor = Math.min(minNeighbor, t.neighbors.length);
      maxNeighbor = Math.max(maxNeighbor, t.neighbors.length);
      sumN += t.neighbors.length;
    }
    const avgN = sumN / faceData.triangles.length;
    console.log(`  neighbor stats: min=${minNeighbor}, avg=${avgN.toFixed(2)}, max=${maxNeighbor}`);
    if (avgN < 2 && faceData.triangles.length > 10) {
      console.error(`  FAIL: avg neighbors too low (<2)`);
      allPassed = false;
    } else {
      console.log(`  PASS: neighbor density sufficient`);
    }
    let colorInvalid = 0;
    for (const t of faceData.triangles) {
      const c = t.avgColor;
      if (c.r < 0 || c.r > 255 || c.g < 0 || c.g > 255 || c.b < 0 || c.b > 255) colorInvalid++;
    }
    if (colorInvalid > 0) {
      console.error(`  FAIL: ${colorInvalid} triangles have invalid color values`);
      allPassed = false;
    } else {
      console.log(`  PASS: all triangle colors valid`);
    }
    console.log('');
  }
  console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  return allPassed;
}

(window as any).runOrigamiTests = runTests;
runTests().then(passed => {
  (document.getElementById('test-result') as HTMLElement | null)?.replaceChildren(
    document.createTextNode(passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌')
  );
});

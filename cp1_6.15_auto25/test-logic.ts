function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function circleRectCollide(
  cx: number, cy: number, cr: number,
  rectLeft: number, rectTop: number, rectWidth: number, rectHeight: number
): boolean {
  const closestX = clamp(cx, rectLeft, rectLeft + rectWidth);
  const closestY = clamp(cy, rectTop, rectTop + rectHeight);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

const MIN_ASTEROID_DIAMETER = 20;

console.log('=== 测试1：小行星分裂边界 ===');
const testCases = [
  { orig: 80, expectedSplit: true, expectedNew: 40 },
  { orig: 50, expectedSplit: true, expectedNew: 25 },
  { orig: 40, expectedSplit: true, expectedNew: 20 },
  { orig: 38, expectedSplit: false, expectedNew: 19 },
  { orig: 30, expectedSplit: false, expectedNew: 15 },
  { orig: 20, expectedSplit: false, expectedNew: 10 },
];
for (const tc of testCases) {
  const newDiameter = tc.orig / 2;
  const shouldSplit = newDiameter >= MIN_ASTEROID_DIAMETER;
  const pass = shouldSplit === tc.expectedSplit;
  console.log(`  直径${tc.orig}px → ${newDiameter}px, 分裂: ${shouldSplit}, 预期: ${tc.expectedSplit} ${pass ? '✓' : '✗'}`);
}

console.log('\n=== 测试2：矩形-圆碰撞检测 ===');
const shipX = 400, shipY = 300;
const shipW = 32, shipH = 40;
const shipL = shipX - shipW / 2;
const shipT = shipY - shipH / 2;
console.log(`  飞船: 中心(${shipX},${shipY}), 宽${shipW}, 高${shipH}`);
console.log(`  左上角(${shipL},${shipT}) 右下角(${shipL + shipW},${shipT + shipH})`);

const collideTests = [
  { name: '圆心在矩形中心', cx: 400, cy: 300, cr: 5, expected: true },
  { name: '圆与矩形右边缘相切', cx: 416 + 5, cy: 300, cr: 5, expected: true },
  { name: '圆在矩形右外', cx: 416 + 5.1, cy: 300, cr: 5, expected: false },
  { name: '圆与矩形底部相切', cx: 400, cy: 320 + 5, cr: 5, expected: true },
  { name: '圆在矩形底部外', cx: 400, cy: 320 + 5.1, cr: 5, expected: false },
  { name: '圆在矩形右上角外', cx: 420, cy: 270, cr: 10, expected: false },
  { name: '圆与矩形右上角接触', cx: 416 + 7, cy: 280 - 7, cr: 10, expected: true },
];
for (const tc of collideTests) {
  const result = circleRectCollide(tc.cx, tc.cy, tc.cr, shipL, shipT, shipW, shipH);
  const pass = result === tc.expected;
  console.log(`  ${tc.name}: 圆(${tc.cx},${tc.cy})r=${tc.cr} → ${result} 预期:${tc.expected} ${pass ? '✓' : '✗'}`);
}

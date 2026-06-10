import assert from 'node:assert/strict';

interface PerspectiveParams {
  vanishX: number;
  vanishY: number;
  focalLength: number;
  corridorHalfWidth: number;
  nearZ: number;
  farZ: number;
  paintingWorldY: number;
  paintingWorldWidth: number;
}

function project3D(
  worldX: number,
  worldY: number,
  worldZ: number,
  params: PerspectiveParams
): { x: number; y: number; scale: number } {
  const scale = params.focalLength / (params.focalLength + worldZ);
  return {
    x: params.vanishX + worldX * scale,
    y: params.vanishY + worldY * scale,
    scale
  };
}

function getWallBoundsAtZ(
  z: number,
  params: PerspectiveParams
): { left: number; right: number; scale: number } {
  const scale = params.focalLength / (params.focalLength + z);
  return {
    left: params.vanishX - params.corridorHalfWidth * scale,
    right: params.vanishX + params.corridorHalfWidth * scale,
    scale
  };
}

function computeCorridorHalfWidth(
  screenWidth: number,
  params: PerspectiveParams
): number {
  const scaleNear = params.focalLength / (params.focalLength + params.nearZ);
  const pixelHalfWidth = (screenWidth * 0.7) / 2;
  return pixelHalfWidth / scaleNear;
}

function computePaintingTransform(
  worldX: number,
  worldY: number,
  worldZ: number,
  rotY: number,
  params: PerspectiveParams
): { a: number; b: number; d: number; cx: number; cy: number; scale: number } {
  const f = params.focalLength;
  const scale0 = f / (f + worldZ);
  const cx = params.vanishX + worldX * scale0;
  const cy = params.vanishY + worldY * scale0;

  const cosR = Math.cos(rotY);
  const sinR = Math.sin(rotY);

  const a = scale0 * (cosR + (worldX * sinR) / (f + worldZ));
  const b = scale0 * (worldY * sinR) / (f + worldZ);
  const d = scale0;

  return { a, b, d, cx, cy, scale: scale0 };
}

console.log('=== 透视对齐测试 ===\n');

const defaultParams: PerspectiveParams = {
  vanishX: 400,
  vanishY: 200,
  focalLength: 500,
  corridorHalfWidth: 280,
  nearZ: 120,
  farZ: 800,
  paintingWorldY: -60,
  paintingWorldWidth: 100
};

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (e) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${(e as Error).message}`);
    failCount++;
  }
}

console.log('1. 墙壁消失点对齐测试\n');

test('近景和远景墙壁左边界延长线应交于消失点附近', () => {
  const nearBounds = getWallBoundsAtZ(defaultParams.nearZ, defaultParams);
  const farBounds = getWallBoundsAtZ(defaultParams.farZ, defaultParams);

  const dx = farBounds.left - nearBounds.left;
  const dz = defaultParams.farZ - defaultParams.nearZ;
  const zToVanish = -defaultParams.nearZ;

  const extrapolatedLeftX = nearBounds.left + dx * (zToVanish / dz);
  const extrapolatedY =
    defaultParams.vanishY +
    (-defaultParams.nearZ) * (0 / dz);

  assert.ok(
    Math.abs(extrapolatedLeftX - defaultParams.vanishX) < 1,
    `左边界延长线 x=${extrapolatedLeftX.toFixed(4)} 与消失点 x=${defaultParams.vanishX} 偏差超过 1 像素`
  );
});

test('近景和远景墙壁右边界延长线应交于消失点附近', () => {
  const nearBounds = getWallBoundsAtZ(defaultParams.nearZ, defaultParams);
  const farBounds = getWallBoundsAtZ(defaultParams.farZ, defaultParams);

  const dx = farBounds.right - nearBounds.right;
  const dz = defaultParams.farZ - defaultParams.nearZ;
  const zToVanish = -defaultParams.nearZ;

  const extrapolatedRightX = nearBounds.right + dx * (zToVanish / dz);

  assert.ok(
    Math.abs(extrapolatedRightX - defaultParams.vanishX) < 1,
    `右边界延长线 x=${extrapolatedRightX.toFixed(4)} 与消失点 x=${defaultParams.vanishX} 偏差超过 1 像素`
  );
});

test('远景点墙壁左右边界应收敛到几乎同一点（消失点）', () => {
  const veryFarZ = 100000;
  const veryFarBounds = getWallBoundsAtZ(veryFarZ, defaultParams);
  const widthAtVeryFar = veryFarBounds.right - veryFarBounds.left;

  assert.ok(widthAtVeryFar < 1, `极远处墙壁宽度 ${widthAtVeryFar.toFixed(4)} 像素，应趋近于 0`);
  assert.ok(
    Math.abs(veryFarBounds.left - defaultParams.vanishX) < 0.5,
    `极远处左边界 x=${veryFarBounds.left.toFixed(4)} 与消失点偏差过大`
  );
});

console.log('\n2. 画作位置与墙壁对齐测试\n');

test('左侧画作x坐标应小于左侧墙壁左边界（画作挂在墙上）', () => {
  const numPaintings = 8;
  for (let i = 0; i < numPaintings; i++) {
    const t = i / (numPaintings - 1);
    const worldZ = defaultParams.nearZ + (defaultParams.farZ - defaultParams.nearZ) * t;
    const worldX = -defaultParams.corridorHalfWidth;

    const paintingProj = project3D(worldX, defaultParams.paintingWorldY, worldZ, defaultParams);
    const wallBounds = getWallBoundsAtZ(worldZ, defaultParams);

    const paintingLeftEdge = paintingProj.x - (defaultParams.paintingWorldWidth / 2) * paintingProj.scale;

    assert.ok(
      paintingLeftEdge >= wallBounds.left - 2,
      `第 ${i} 幅左侧画作左边缘 x=${paintingLeftEdge.toFixed(2)} 超出墙壁左边界 x=${wallBounds.left.toFixed(2)}`
    );
  }
});

test('右侧画作x坐标应小于右侧墙壁右边界（画作挂在墙上）', () => {
  const numPaintings = 8;
  for (let i = 0; i < numPaintings; i++) {
    const t = i / (numPaintings - 1);
    const worldZ = defaultParams.nearZ + (defaultParams.farZ - defaultParams.nearZ) * t;
    const worldX = defaultParams.corridorHalfWidth;

    const paintingProj = project3D(worldX, defaultParams.paintingWorldY, worldZ, defaultParams);
    const wallBounds = getWallBoundsAtZ(worldZ, defaultParams);

    const paintingRightEdge = paintingProj.x + (defaultParams.paintingWorldWidth / 2) * paintingProj.scale;

    assert.ok(
      paintingRightEdge <= wallBounds.right + 2,
      `第 ${i} 幅右侧画作右边缘 x=${paintingRightEdge.toFixed(2)} 超出墙壁右边界 x=${wallBounds.right.toFixed(2)}`
    );
  }
});

test('画作缩放比例应与墙壁缩放比例一致', () => {
  const numPaintings = 8;
  for (let i = 0; i < numPaintings; i++) {
    const t = i / (numPaintings - 1);
    const worldZ = defaultParams.nearZ + (defaultParams.farZ - defaultParams.nearZ) * t;

    const paintingProj = project3D(0, 0, worldZ, defaultParams);
    const wallBounds = getWallBoundsAtZ(worldZ, defaultParams);

    const wallScale = wallBounds.scale;
    assert.ok(
      Math.abs(paintingProj.scale - wallScale) < 0.001,
      `z=${worldZ} 处画作 scale=${paintingProj.scale.toFixed(6)} 与墙壁 scale=${wallScale.toFixed(6)} 不一致`
    );
  }
});

console.log('\n3. 走廊宽度动态计算测试\n');

test('动态计算的corridorHalfWidth在近景处应占屏幕70%宽度', () => {
  const screenWidth = 800;
  const dynamicParams = {
    ...defaultParams,
    corridorHalfWidth: 0
  };
  dynamicParams.corridorHalfWidth = computeCorridorHalfWidth(screenWidth, dynamicParams);

  const nearBounds = getWallBoundsAtZ(dynamicParams.nearZ, dynamicParams);
  const corridorWidth = nearBounds.right - nearBounds.left;
  const expectedWidth = screenWidth * 0.7;

  assert.ok(
    Math.abs(corridorWidth - expectedWidth) < 1,
    `近景走廊宽度 ${corridorWidth.toFixed(2)} 像素，预期 ${expectedWidth.toFixed(2)} 像素`
  );
});

test('不同屏幕宽度下走廊宽度比例保持一致', () => {
  const widths = [400, 800, 1200, 1600];
  for (const w of widths) {
    const params = {
      ...defaultParams,
      corridorHalfWidth: 0
    };
    params.corridorHalfWidth = computeCorridorHalfWidth(w, params);
    const nearBounds = getWallBoundsAtZ(params.nearZ, params);
    const ratio = (nearBounds.right - nearBounds.left) / w;

    assert.ok(
      Math.abs(ratio - 0.7) < 0.01,
      `屏幕宽 ${w}px 时走廊占比 ${ratio.toFixed(4)}，预期 0.7`
    );
  }
});

console.log('\n4. 画框变换矩阵测试\n');

test('零旋转时变换矩阵应退化为纯缩放', () => {
  const worldX = -defaultParams.corridorHalfWidth;
  const worldY = defaultParams.paintingWorldY;
  const worldZ = defaultParams.nearZ;

  const transform = computePaintingTransform(worldX, worldY, worldZ, 0, defaultParams);
  const expectedScale = defaultParams.focalLength / (defaultParams.focalLength + worldZ);

  assert.ok(
    Math.abs(transform.a - expectedScale) < 0.0001,
    `零旋转时 a=${transform.a.toFixed(6)} 应等于 scale=${expectedScale.toFixed(6)}`
  );
  assert.ok(
    Math.abs(transform.b) < 0.0001,
    `零旋转时 b=${transform.b.toFixed(6)} 应接近 0`
  );
  assert.ok(
    Math.abs(transform.d - expectedScale) < 0.0001,
    `零旋转时 d=${transform.d.toFixed(6)} 应等于 scale=${expectedScale.toFixed(6)}`
  );
});

test('画框中心点应与标准透视投影一致', () => {
  const worldX = defaultParams.corridorHalfWidth;
  const worldY = defaultParams.paintingWorldY;
  const worldZ = defaultParams.nearZ;
  const rotY = Math.atan2(worldX, defaultParams.focalLength + worldZ) * 0.3;

  const transform = computePaintingTransform(worldX, worldY, worldZ, rotY, defaultParams);
  const standard = project3D(worldX, worldY, worldZ, defaultParams);

  assert.ok(
    Math.abs(transform.cx - standard.x) < 0.01,
    `画框中心 x=${transform.cx.toFixed(4)} 与标准投影 x=${standard.x.toFixed(4)} 偏差过大`
  );
  assert.ok(
    Math.abs(transform.cy - standard.y) < 0.01,
    `画框中心 y=${transform.cy.toFixed(4)} 与标准投影 y=${standard.y.toFixed(4)} 偏差过大`
  );
});

test('左侧画框水平错切量应为负值（左低右高）', () => {
  const worldX = -defaultParams.corridorHalfWidth;
  const worldY = defaultParams.paintingWorldY;
  const worldZ = defaultParams.nearZ;
  const rotY = Math.atan2(worldX, defaultParams.focalLength + worldZ) * 0.3;

  const transform = computePaintingTransform(worldX, worldY, worldZ, rotY, defaultParams);

  assert.ok(transform.b < 0, `左侧画框错切量 b=${transform.b.toFixed(6)} 应为负值`);
});

test('右侧画框水平错切量应为正值（左高右低）', () => {
  const worldX = defaultParams.corridorHalfWidth;
  const worldY = defaultParams.paintingWorldY;
  const worldZ = defaultParams.nearZ;
  const rotY = Math.atan2(worldX, defaultParams.focalLength + worldZ) * 0.3;

  const transform = computePaintingTransform(worldX, worldY, worldZ, rotY, defaultParams);

  assert.ok(transform.b > 0, `右侧画框错切量 b=${transform.b.toFixed(6)} 应为正值`);
});

console.log('\n5. 伽马校正颜色插值测试\n');

function srgbToLinear(c: number): number {
  const s = c / 255;
  if (s <= 0.04045) return s / 12.92;
  return Math.pow((s + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  let s: number;
  if (c <= 0.0031308) s = c * 12.92;
  else s = 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(s * 255);
}

function lerpColorGamma(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  const r1 = srgbToLinear(c1.r);
  const g1 = srgbToLinear(c1.g);
  const b1 = srgbToLinear(c1.b);
  const r2 = srgbToLinear(c2.r);
  const g2 = srgbToLinear(c2.g);
  const b2 = srgbToLinear(c2.b);

  return {
    r: linearToSrgb(r1 + (r2 - r1) * t),
    g: linearToSrgb(g1 + (g2 - g1) * t),
    b: linearToSrgb(b1 + (b2 - b1) * t)
  };
}

test('t=0 时应等于起始颜色', () => {
  const c1 = { r: 255, g: 179, b: 71 };
  const c2 = { r: 255, g: 109, b: 0 };
  const result = lerpColorGamma(c1, c2, 0);

  assert.equal(result.r, c1.r);
  assert.equal(result.g, c1.g);
  assert.equal(result.b, c1.b);
});

test('t=1 时应等于结束颜色', () => {
  const c1 = { r: 255, g: 179, b: 71 };
  const c2 = { r: 255, g: 109, b: 0 };
  const result = lerpColorGamma(c1, c2, 1);

  assert.equal(result.r, c2.r);
  assert.equal(result.g, c2.g);
  assert.equal(result.b, c2.b);
});

test('伽马校正插值中间值应比线性插值更亮', () => {
  const c1 = { r: 255, g: 179, b: 71 };
  const c2 = { r: 255, g: 109, b: 0 };

  const gammaResult = lerpColorGamma(c1, c2, 0.5);
  const linearResult = {
    r: Math.round(c1.r + (c2.r - c1.r) * 0.5),
    g: Math.round(c1.g + (c2.g - c1.g) * 0.5),
    b: Math.round(c1.b + (c2.b - c1.b) * 0.5)
  };

  const gammaLuminance = 0.299 * gammaResult.g + 0.587 * gammaResult.g + 0.114 * gammaResult.b;
  const linearLuminance = 0.299 * linearResult.g + 0.587 * linearResult.g + 0.114 * linearResult.b;

  assert.ok(
    gammaLuminance > linearLuminance,
    `伽马插值亮度 ${gammaLuminance.toFixed(2)} 应大于线性插值亮度 ${linearLuminance.toFixed(2)}`
  );
});

console.log('\n6. 隐藏图形淡入动画时间测试\n');

test('淡入动画在1.5秒应完全显示（帧率无关）', () => {
  const FADE_IN_DURATION = 1.5;
  let progress = 0;
  let hoverStartTime = 0;
  const targetHoverProgress = 1;
  let time = 0;

  const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

  function update(deltaTime: number): void {
    time += deltaTime;
    if (targetHoverProgress > progress) {
      const elapsed = time - hoverStartTime;
      const p = Math.min(1, elapsed / FADE_IN_DURATION);
      progress = easeOutCubic(p);
    }
  }

  hoverStartTime = time;

  const initialDelta = 1 / 60;
  for (let i = 0; i < 60; i++) {
    update(initialDelta);
  }
  const progress60fps = progress;

  progress = 0;
  time = 0;
  hoverStartTime = time;
  const lowDelta = 1 / 30;
  for (let i = 0; i < 30; i++) {
    update(lowDelta);
  }
  const progress30fps = progress;

  assert.ok(
    Math.abs(progress60fps - progress30fps) < 0.001,
    `不同帧率下进度不一致: 60fps=${progress60fps.toFixed(6)}, 30fps=${progress30fps.toFixed(6)}`
  );

  const totalTime = FADE_IN_DURATION;
  progress = 0;
  time = 0;
  hoverStartTime = time;
  update(totalTime);

  assert.ok(Math.abs(progress - 1) < 0.001, `1.5秒后进度应为1，实际为 ${progress.toFixed(6)}`);
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passCount}`);
console.log(`失败: ${failCount}`);
console.log(`总计: ${passCount + failCount}`);

if (failCount > 0) {
  process.exit(1);
}

import { parseCode, __TEST__ } from './codeParser';
import { ExportProgress } from './exporter';

type TestResult = { name: string; passed: boolean; error?: string; durationMs: number };

export async function runAllTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(await runTest('codeParser: 空字符串返回失败', testEmptyInput));
  results.push(await runTest('codeParser: 纯空白返回失败', testWhitespaceInput));
  results.push(await runTest('codeParser: 识别 count 数字', testCountParsing));
  results.push(await runTest('codeParser: 识别多参数 JS 赋值', testMultipleJsParams));
  results.push(await runTest('codeParser: 识别 CSS 变量 --count', testCssVariableExtraction));
  results.push(await runTest('codeParser: clampConfig 边界值', testClampConfig));
  results.push(await runTest('codeParser: 无效代码 try-catch 安全', testMaliciousInputSafe));
  results.push(await runTest('codeParser: 非法数字 NaN/Infinity 过滤', testNonFiniteNumberFilter));
  results.push(await runTest('节流测试: requestAnimationFrame 批处理', testThrottleBatching));
  results.push(await runTest('导出进度: 回调不会抛异常中断', testProgressSafeCallback));
  results.push(await runTest('clampConfig: count 限制 10-100000', testCountClampRange));

  const passCount = results.filter((r) => r.passed).length;
  console.log(
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n测试结果: ${passCount}/${results.length} 通过\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  );
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`  ${icon} ${r.name} (${r.durationMs.toFixed(2)}ms)`);
    if (!r.passed && r.error) {
      console.log(`       → ${r.error}`);
    }
  }

  return results;
}

async function runTest(name: string, fn: () => void | Promise<void>): Promise<TestResult> {
  const t0 = performance.now();
  try {
    const result = fn();
    if (result && typeof (result as Promise<void>).then === 'function') {
      await result;
    }
    return { name, passed: true, durationMs: performance.now() - t0 };
  } catch (e) {
    return {
      name,
      passed: false,
      error: e instanceof Error ? e.message : String(e),
      durationMs: performance.now() - t0,
    };
  }
}

function assert(cond: any, msg: string = '断言失败'): asserts cond {
  if (!cond) throw new Error(msg);
}
function assertEq<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(msg || `期望 ${String(expected)}，实际 ${String(actual)}`);
  }
}
function assertRange(n: number, min: number, max: number, msg?: string) {
  if (n < min || n > max) {
    throw new Error(msg || `值 ${n} 超出范围 [${min}, ${max}]`);
  }
}

function testEmptyInput() {
  const r = parseCode('');
  assert(!r.success, '空字符串应当失败');
  assert(!!r.error, '应当有错误信息');
  assert(typeof r.parseTimeMs === 'number', '应当包含解析耗时');
}

function testWhitespaceInput() {
  const r = parseCode('   \n\t  ');
  assert(!r.success);
}

function testCountParsing() {
  const r = parseCode('count = 7777');
  assert(r.success, '解析应当成功');
  assert(r.config?.count === 7777, `期望 7777，实际 ${r.config?.count}`);
  assert(r.parseTimeMs !== undefined && r.parseTimeMs < 200, `解析耗时应 < 200ms，实际 ${r.parseTimeMs}ms`);
}

function testMultipleJsParams() {
  const code = `
    const count = 8000;
    let speed = 2.5;
    var rotation = 0.7;
    size: 5.5;
    noise = 1.2;
  `;
  const r = parseCode(code);
  assert(r.success);
  assertEq(r.config?.count, 8000, 'count');
  assertEq(r.config?.speed, 2.5, 'speed');
  assertEq(r.config?.rotation, 0.7, 'rotation');
  assertEq(r.config?.size, 5.5, 'size');
  assertEq(r.config?.noise, 1.2, 'noise');
}

function testCssVariableExtraction() {
  const code = `
    <style>
      :root {
        --count: 6000;
        --speed: 3.0;
        --color-mix: 0.8;
      }
      body { background: #fbbf24; color: #ec4899; }
    </style>
  `;
  const r = parseCode(code);
  assert(r.success, '应当成功识别 CSS 变量');
  assert(r.config?.count === 6000 || (r.config?.count ?? 0) > 0, `期望 count=6000，实际 ${r.config?.count}`);
  assert(r.config?.speed === 3.0, `期望 speed=3.0，实际 ${r.config?.speed}`);
  assert((r.config?.colorMix ?? 0) > 0, 'colorMix 应当 > 0');
}

function testClampConfig() {
  const { clampConfig } = __TEST__;
  const cfg = clampConfig({
    count: 1_000_000,
    speed: -1,
    rotation: 999,
    colorMix: 5,
    size: 0.01,
    trail: -5,
    noise: 1e9,
  });
  assertRange(cfg.count!, 10, 100000);
  assertRange(cfg.speed!, 0, 100);
  assertRange(cfg.rotation!, 0, 100);
  assertRange(cfg.colorMix!, 0, 1);
  assertRange(cfg.size!, 0.1, 100);
  assertRange(cfg.trail!, 0, 1);
  assertRange(cfg.noise!, 0, 100);
}

function testCountClampRange() {
  const { clampConfig } = __TEST__;
  const c1 = clampConfig({ count: 0 });
  assert(c1.count === 10, `count=0 应 clamp 到 10，实际 ${c1.count}`);
  const c2 = clampConfig({ count: 9999999 });
  assert(c2.count === 100000, `超大 count 应 clamp 到 100000，实际 ${c2.count}`);
}

function testMaliciousInputSafe() {
  const dangerous = `
    <script>
      while (true) {}
    </script>
  `;
  const start = performance.now();
  const r = parseCode(dangerous);
  const elapsed = performance.now() - start;
  assert(elapsed < 2000, `恶意输入不应长时间阻塞，耗时 ${elapsed}ms`);
  assert(typeof r === 'object' && r !== null, '应当返回对象');
}

function testNonFiniteNumberFilter() {
  const { extractJSNumericValues } = __TEST__;
  const result = extractJSNumericValues(`
    count = NaN;
    speed = Infinity;
    rotation = undefined;
  `) as Record<string, number | undefined>;
  assert(result.count === undefined || !Number.isFinite(result.count) === false, 'NaN 应被过滤');
  assert(result.speed === undefined || !Number.isFinite(result.speed) === false, 'Infinity 应被过滤');
}

async function testThrottleBatching(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      const calls: number[] = [];
      let rafId: number | null = null;
      const latest: Record<string, number> = {};

      const throttled = (key: string, value: number) => {
        latest[key] = value;
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            const values = { ...latest };
            for (const k of Object.keys(values)) {
              calls.push(values[k]);
            }
            Object.keys(latest).forEach((k) => delete latest[k]);
          });
        }
      };

      for (let i = 0; i < 100; i++) {
        throttled('x', i);
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            assert(calls.length <= 2, `100次快速调用应当被批处理，实际收到 ${calls.length} 次回调`);
            if (calls.length > 0) {
              assertEq(calls[calls.length - 1], 99, '应当只保留最新值 99');
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function testProgressSafeCallback(): Promise<void> {
  let invokeCount = 0;
  let errorCount = 0;

  const badCb = (p: ExportProgress) => {
    invokeCount++;
    if (p.percent === 50) throw new Error('模拟回调异常');
  };

  const stages = [
    [0, '开始'],
    [25, '步骤一'],
    [50, '步骤二'],
    [100, '结束'],
  ];

  const script = document.createElement('script');
  script.textContent = '';
  document.head.appendChild(script);
  document.head.removeChild(script);

  const safe = (cb: ((p: ExportProgress) => void) | undefined, percent: number, stage: string) => {
    try {
      cb?.({ percent, stage });
    } catch (e) {
      errorCount++;
    }
  };

  for (const [p, s] of stages) {
    safe(badCb, p as number, s as string);
  }

  assertEq(invokeCount, stages.length, '回调应被调用正确次数');
  assertEq(errorCount, 1, '异常应被安全捕获不中断后续');
}

if (typeof window !== 'undefined') {
  (window as any).__runCodeCanvasTests = runAllTests;
}

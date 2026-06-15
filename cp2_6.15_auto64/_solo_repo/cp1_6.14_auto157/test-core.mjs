import { v4 as uuidv4 } from 'uuid';

const TEST_RESULTS = {
  passed: 0,
  failed: 0
};

function assert(condition, testName) {
  if (condition) {
    console.log(`   ✅ ${testName}`);
    TEST_RESULTS.passed++;
  } else {
    console.log(`   ❌ ${testName}`);
    TEST_RESULTS.failed++;
  }
}

// ========== 内联：拥挤等级计算函数 ==========
function getCrowdLevel(flowRate) {
  if (flowRate <= 250) return 'green';
  if (flowRate <= 500) return 'yellow';
  if (flowRate <= 750) return 'orange';
  return 'red';
}

// ========== 内联：简单事件总线（复制实现逻辑用于测试） ==========
class TestEventBus {
  constructor() {
    this.listeners = new Map();
  }
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }
  off(event, callback) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) this.listeners.delete(event);
    }
  }
  emit(event, data) {
    const set = this.listeners.get(event);
    if (set) {
      const clonedData = structuredClone(data);
      set.forEach(callback => callback(clonedData));
    }
  }
  clear() {
    this.listeners.clear();
  }
}

const eventBus = new TestEventBus();

console.log('\n========== MetroFlow 核心逻辑自测 ==========\n');

// ========== 测试1：拥挤等级阈值 ==========
console.log('【测试1：拥挤等级阈值计算】');
const crowdTestCases = [
  { flow: 50, expected: 'green', desc: 'flowRate=50 (边界最小值)' },
  { flow: 250, expected: 'green', desc: 'flowRate=250 (green上限)' },
  { flow: 251, expected: 'yellow', desc: 'flowRate=251 (yellow下限)' },
  { flow: 500, expected: 'yellow', desc: 'flowRate=500 (yellow上限)' },
  { flow: 501, expected: 'orange', desc: 'flowRate=501 (orange下限)' },
  { flow: 750, expected: 'orange', desc: 'flowRate=750 (orange上限)' },
  { flow: 751, expected: 'red', desc: 'flowRate=751 (red下限)' },
  { flow: 1000, expected: 'red', desc: 'flowRate=1000 (边界最大值)' },
  { flow: 150, expected: 'green', desc: 'flowRate=150 (green中间值)' },
  { flow: 375, expected: 'yellow', desc: 'flowRate=375 (yellow中间值)' },
  { flow: 625, expected: 'orange', desc: 'flowRate=625 (orange中间值)' },
  { flow: 875, expected: 'red', desc: 'flowRate=875 (red中间值)' }
];
for (const tc of crowdTestCases) {
  const result = getCrowdLevel(tc.flow);
  assert(result === tc.expected, tc.desc + ` → ${result} (期望 ${tc.expected})`);
}

// ========== 测试2：事件总线 structuredClone ==========
console.log('\n【测试2：事件总线 structuredClone 深拷贝】');
const testData = { name: 'test', value: 100, nested: { a: 1, arr: [1, 2, 3] } };
let receivedData = null;
const unsubClone = eventBus.on('test:clone', (data) => {
  receivedData = data;
});
eventBus.emit('test:clone', testData);
testData.nested.a = 999;
testData.nested.arr.push(999);
assert(
  receivedData && receivedData.nested.a === 1 && receivedData.nested.arr.length === 3,
  'structuredClone 正确隔离引用（修改原数据不影响接收数据）'
);
unsubClone();

// ========== 测试3：模拟 SimulatedDataProvider 数据 ==========
console.log('\n【测试3：模拟站点数据生成】');

const STATION_NAMES = [
  '人民广场', '南京东路', '静安寺', '徐家汇', '陆家嘴', '虹桥火车站',
  '中山公园', '漕河泾开发区', '莘庄', '共富新村', '彭浦新村', '上海火车站',
  '汉中路', '新闸路', '黄陂南路', '陕西南路', '常熟路', '衡山路',
  '肇嘉浜路', '上海体育馆', '上海游泳馆', '宜山路', '延安西路', '中山北路',
  '虹口足球场', '四平路', '海伦路', '宝山路', '江湾镇', '三门路',
  '翔殷路', '黄兴公园', '延吉中路', '江浦路', '鞍山新村', '大连路'
];

function generateStations() {
  return STATION_NAMES.map((name, i) => {
    const angle = (i / STATION_NAMES.length) * Math.PI * 2;
    const radius = 0.03 + Math.random() * 0.08;
    return {
      id: uuidv4(),
      name,
      lat: 31.2304 + Math.sin(angle) * radius,
      lng: 121.4737 + Math.cos(angle) * radius * 1.2,
      flowRate: Math.floor(100 + Math.random() * 700),
      status: 'normal'
    };
  });
}

const stations = generateStations();
assert(stations.length === 36, `生成 ${stations.length} 个站点（期望 36）`);
const flows = stations.map(s => s.flowRate);
const flowMin = Math.min(...flows);
const flowMax = Math.max(...flows);
assert(flowMin >= 50 && flowMax <= 1000, `flowRate 范围 [${flowMin}, ${flowMax}] 在 [50, 1000] 内`);
assert(stations.every(s => typeof s.id === 'string' && s.id.length > 0), '所有站点都有合法 id');
assert(stations.every(s => typeof s.lat === 'number' && typeof s.lng === 'number'), '所有站点都有合法经纬度');

// ========== 测试4：事件链 data:update → status:update ==========
console.log('\n【测试4：事件链 data:update → status:update + crowdLevel 计算】');

const HISTORY_LENGTH = 10;
const CROWD_LEVEL_ORDER = { red: 0, orange: 1, yellow: 2, green: 3 };

function sortByCrowdLevel(sts) {
  return [...sts].sort((a, b) => {
    const diff = CROWD_LEVEL_ORDER[a.crowdLevel] - CROWD_LEVEL_ORDER[b.crowdLevel];
    return diff !== 0 ? diff : b.flowRate - a.flowRate;
  });
}

// 模拟 StationMonitor 核心逻辑
const stationMap = new Map();
const previousLevels = new Map();
const levelChanges = [];

function processData(rawStations) {
  const changes = [];
  rawStations.forEach(station => {
    const existing = stationMap.get(station.id);
    const history = existing ? [...existing.history, station.flowRate] : [station.flowRate];
    if (history.length > HISTORY_LENGTH) history.shift();

    const newLevel = getCrowdLevel(station.flowRate);
    const prevLevel = previousLevels.get(station.id);
    if (prevLevel && prevLevel !== newLevel) {
      changes.push({
        stationId: station.id,
        stationName: station.name,
        oldLevel: prevLevel,
        newLevel: newLevel
      });
    }
    previousLevels.set(station.id, newLevel);
    stationMap.set(station.id, {
      ...station,
      crowdLevel: newLevel,
      history
    });
  });

  const statuses = sortByCrowdLevel(Array.from(stationMap.values()));
  eventBus.emit('status:update', statuses);
  if (changes.length > 0) {
    eventBus.emit('crowd-level:change', changes);
    levelChanges.push(...changes);
  }
}

// 模拟 data:update 订阅（StationMonitor.start 行为）
eventBus.on('data:update', (data) => {
  processData(data);
});

let dataUpdateCount = 0;
let statusUpdateCount = 0;
let crowdLevelMatch = true;
let historyValid = true;
let crowdLevelExists = true;

const unsubData = eventBus.on('data:update', () => { dataUpdateCount++; });
const unsubStatus = eventBus.on('status:update', (data) => {
  statusUpdateCount++;
  const statuses = data;
  if (statuses && statuses.length > 0) {
    const s = statuses[0];
    const expectedLevel = getCrowdLevel(s.flowRate);
    if (s.crowdLevel !== expectedLevel) crowdLevelMatch = false;
    if (!['green', 'yellow', 'orange', 'red'].includes(s.crowdLevel)) crowdLevelExists = false;
    if (!Array.isArray(s.history) || s.history.length < 1 || s.history.length > 10) historyValid = false;
  }
});

// 初始发射 data:update → 触发处理
eventBus.emit('data:update', stations);

await new Promise(r => setTimeout(r, 50));

assert(dataUpdateCount >= 1, `data:update 已触发 ${dataUpdateCount} 次`);
assert(statusUpdateCount >= 1, `status:update 已发射 ${statusUpdateCount} 次（data → status 链路正常）`);
assert(crowdLevelMatch, 'crowdLevel 与 flowRate 阈值匹配正确');
assert(crowdLevelExists, 'crowdLevel 字段存在且值合法（green/yellow/orange/red）');
assert(historyValid, `history 字段合法（长度在 1-10 之间）`);

unsubData();
unsubStatus();

// ========== 测试5：拥挤等级变化事件 ==========
console.log('\n【测试5：拥挤等级变化 crowd-level:change 事件发射】');

let levelChangeEventFired = false;
let levelChangeEventValid = false;

const unsubLevelChange = eventBus.on('crowd-level:change', (changes) => {
  if (Array.isArray(changes) && changes.length > 0) {
    levelChangeEventFired = true;
    const first = changes[0];
    levelChangeEventValid = 
      typeof first.stationId === 'string' &&
      ['green', 'yellow', 'orange', 'red'].includes(first.oldLevel) &&
      ['green', 'yellow', 'orange', 'red'].includes(first.newLevel) &&
      first.oldLevel !== first.newLevel;
  }
});

// 构造等级变化场景：先全设置为 green (100)，再全设置为 red (800)
const greenStations = stations.map(s => ({ ...s, flowRate: 100 }));
processData(greenStations);

await new Promise(r => setTimeout(r, 50));
levelChanges.length = 0; // 清除初始计算可能产生的

const redStations = stations.map(s => ({ ...s, flowRate: 800 }));
processData(redStations);

await new Promise(r => setTimeout(r, 50));

assert(levelChangeEventFired, `crowd-level:change 事件已发射（等级变化时触发）`);
assert(levelChangeEventValid, `crowd-level:change 事件包含 stationId、oldLevel、newLevel 且前后等级不同`);
assert(levelChanges.length === stations.length, `所有 ${stations.length} 个站点都检测到等级变化（green → red）`);

unsubLevelChange();

// ========== 测试6：排序逻辑 ==========
console.log('\n【测试6：按拥挤等级+流量排序】');
const statuses = sortByCrowdLevel(Array.from(stationMap.values()));
let sortedCorrectly = true;
for (let i = 1; i < statuses.length; i++) {
  const a = statuses[i - 1];
  const b = statuses[i];
  const aOrder = CROWD_LEVEL_ORDER[a.crowdLevel];
  const bOrder = CROWD_LEVEL_ORDER[b.crowdLevel];
  if (aOrder > bOrder) { // 等级更高的（order小）排在前面
    sortedCorrectly = false;
    break;
  }
  if (aOrder === bOrder && a.flowRate < b.flowRate) { // 同等级流量大的排前面
    sortedCorrectly = false;
    break;
  }
}
assert(sortedCorrectly, '排序正确：按 红>橙>黄>绿，同等级流量大的排前面');

// ========== 测试7：历史曲线维护 ==========
console.log('\n【测试7：历史曲线滚动窗口（最多保留10个数据点）】');

// 重置 map，连续 15 次更新
stationMap.clear();
previousLevels.clear();
for (let i = 0; i < 15; i++) {
  const iterStations = stations.map(s => ({ ...s, flowRate: 100 + i * 50 }));
  iterStations.forEach(station => {
    const existing = stationMap.get(station.id);
    const history = existing ? [...existing.history, station.flowRate] : [station.flowRate];
    if (history.length > HISTORY_LENGTH) history.shift();
    stationMap.set(station.id, {
      ...station,
      crowdLevel: getCrowdLevel(station.flowRate),
      history
    });
  });
}
const firstStation = stationMap.values().next().value;
assert(firstStation.history.length === 10, `history 长度为 ${firstStation.history.length}（期望 10）`);
assert(firstStation.history[0] === 100 + 5 * 50, `history 滚动窗口正确（最早数据被推出）`);
assert(firstStation.history[9] === 100 + 14 * 50, `history 最新数据正确`);

// ========== 汇总 ==========
eventBus.clear();

console.log('\n========== 测试结果 ==========');
console.log(`   通过: ${TEST_RESULTS.passed}`);
console.log(`   失败: ${TEST_RESULTS.failed}`);
console.log(`   总计: ${TEST_RESULTS.passed + TEST_RESULTS.failed}`);
const rate = ((TEST_RESULTS.passed / (TEST_RESULTS.passed + TEST_RESULTS.failed)) * 100).toFixed(1);
console.log(`   成功率: ${rate}%`);
console.log('=================================\n');

process.exit(TEST_RESULTS.failed > 0 ? 1 : 0);

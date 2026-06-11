/**
 * ============================================================
 *  server/mockServer.js — Express 模拟设备数据服务
 * ============================================================
 *
 *  【职责】
 *    1. 生成 30 台虚拟工业设备（CNC/ROBOT/CONV/PLC/MOTOR/SENSOR）
 *    2. 每 2 秒更新温度 / RPM / 负载率，按权重随机切换状态
 *    3. 提供 REST 接口供前端 dataManager 轮询
 *
 *  【上游调用】
 *    — node mockServer.js 启动（端口 3001）
 *
 *  【下游依赖】
 *    — express / cors / uuid
 *
 *  【API】
 *    GET /api/devices         → { timestamp, count, devices: Device[] }
 *    GET /api/devices/:id     → 单个 Device
 *    GET /api/health          → { status: 'ok' }
 *
 *  【数据流向】
 *    setInterval(2s) 更新内存设备数组
 *           │
 *           ▼
 *    dataManager.fetch('/api/devices') ──► JSON Response
 *           │
 *           ▼
 *    dataManager.data$ ──► deviceRenderer / hudPanel
 * ============================================================
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const STATUSES = ['normal', 'alert', 'offline'];
const STATUS_WEIGHTS = [0.7, 0.2, 0.1];

const DEVICE_NAMES = [
  'CNC-001', 'CNC-002', 'CNC-003', 'CNC-004', 'CNC-005',
  'ROBOT-001', 'ROBOT-002', 'ROBOT-003', 'ROBOT-004',
  'CONV-001', 'CONV-002', 'CONV-003', 'CONV-004', 'CONV-005',
  'PLC-001', 'PLC-002', 'PLC-003', 'PLC-004', 'PLC-005', 'PLC-006',
  'MOTOR-001', 'MOTOR-002', 'MOTOR-003', 'MOTOR-004', 'MOTOR-005',
  'SENSOR-A1', 'SENSOR-A2', 'SENSOR-B1', 'SENSOR-B2', 'SENSOR-C1'
];

function pickWeightedStatus() {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < STATUSES.length; i++) {
    cumulative += STATUS_WEIGHTS[i];
    if (r < cumulative) return STATUSES[i];
  }
  return STATUSES[0];
}

function generateInitialDevices() {
  const devices = [];
  const rows = 5;
  const cols = 6;
  const spacingX = 12;
  const spacingZ = 10;
  const startX = -((cols - 1) * spacingX) / 2;
  const startZ = -((rows - 1) * spacingZ) / 2;

  let idx = 0;
  for (let row = 0; row < rows && idx < DEVICE_NAMES.length; row++) {
    for (let col = 0; col < cols && idx < DEVICE_NAMES.length; col++) {
      const name = DEVICE_NAMES[idx];
      const status = pickWeightedStatus();
      const baseTemp = 45 + Math.random() * 20;
      devices.push({
        id: `DEV-${String(idx + 1).padStart(3, '0')}`,
        name,
        status,
        position: {
          x: startX + col * spacingX + (Math.random() - 0.5) * 2,
          y: 1.2,
          z: startZ + row * spacingZ + (Math.random() - 0.5) * 2
        },
        metrics: {
          temperature: status === 'offline' ? 0 : Math.round(baseTemp * 10) / 10,
          rpm: status === 'offline' ? 0 : Math.floor(800 + Math.random() * 2200),
          load: status === 'offline' ? 0 : Math.round((30 + Math.random() * 65) * 10) / 10
        },
        lastUpdate: Date.now()
      });
      idx++;
    }
  }
  return devices;
}

let devices = generateInitialDevices();

function updateDeviceMetrics(device) {
  if (device.status === 'offline') {
    device.metrics.temperature = Math.max(0, device.metrics.temperature - 0.5);
    device.metrics.rpm = Math.max(0, device.metrics.rpm - 50);
    device.metrics.load = Math.max(0, device.metrics.load - 2);
  } else {
    device.metrics.temperature = Math.max(20, Math.min(120,
      device.metrics.temperature + (Math.random() - 0.5) * 3
    ));
    device.metrics.rpm = Math.max(100, Math.min(4000,
      device.metrics.rpm + Math.floor((Math.random() - 0.5) * 100)
    ));
    device.metrics.load = Math.max(5, Math.min(99,
      device.metrics.load + (Math.random() - 0.5) * 5
    ));

    if (device.metrics.temperature > 90 || device.metrics.load > 90) {
      device.status = Math.random() < 0.6 ? 'alert' : 'normal';
    }
  }

  if (Math.random() < 0.03) {
    device.status = pickWeightedStatus();
  }

  device.metrics.temperature = Math.round(device.metrics.temperature * 10) / 10;
  device.metrics.load = Math.round(device.metrics.load * 10) / 10;
  device.lastUpdate = Date.now();
  return device;
}

setInterval(() => {
  devices = devices.map(updateDeviceMetrics);
}, 2000);

app.get('/api/devices', (req, res) => {
  res.json({
    timestamp: Date.now(),
    count: devices.length,
    devices: devices
  });
});

app.get('/api/devices/:id', (req, res) => {
  const device = devices.find(d => d.id === req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json(device);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Mock Server] Running on http://localhost:${PORT}`);
  console.log(`[Mock Server] Devices initialized: ${devices.length}`);
  console.log(`[Mock Server] GET /api/devices - Fetch all devices`);
});

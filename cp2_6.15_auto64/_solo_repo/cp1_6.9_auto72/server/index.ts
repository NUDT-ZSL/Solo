import express = require('express');
import cors = require('cors');
const { Request, Response } = express;

interface ClimateData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  light: number;
}

interface Branch {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  depth: number;
}

interface Leaf {
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface TreeStructure {
  trunkThickness: number;
  branchAngle: number;
  leafCount: number;
  leafColor: string;
  avgLeafColor: string;
  branches: Branch[];
  leaves: Leaf[];
}

interface TreeRecord {
  date: string;
  climate: ClimateData;
  tree: TreeStructure;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const treeStore = new Map<string, TreeRecord>();

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const mixColors = (color1: string, color2: string, t: number): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(lerp(c1.r, c2.r, t), lerp(c1.g, c2.g, t), lerp(c1.b, c2.b, t));
};

const generateBranches = (
  x: number,
  y: number,
  length: number,
  angle: number,
  thickness: number,
  branchAngleBase: number,
  depth: number,
  maxDepth: number,
  branches: { startX: number; startY: number; endX: number; endY: number; thickness: number; depth: number }[]
): void => {
  if (depth > maxDepth || length < 5) return;

  const endX = x + Math.sin(angle) * length;
  const endY = y - Math.cos(angle) * length;

  branches.push({
    startX: x,
    startY: y,
    endX,
    endY,
    thickness: Math.max(1, thickness),
    depth,
  });

  const angleSpread = (branchAngleBase * Math.PI) / 180;
  const newLength = length * 0.7;
  const newThickness = thickness * 0.7;

  generateBranches(endX, endY, newLength, angle - angleSpread, newThickness, branchAngleBase, depth + 1, maxDepth, branches);
  generateBranches(endX, endY, newLength, angle + angleSpread, newThickness, branchAngleBase, depth + 1, maxDepth, branches);
};

const generateTree = (climate: ClimateData): TreeStructure => {
  const { temperature, humidity, windSpeed, light } = climate;

  const tempT = Math.max(0, Math.min(1, (temperature + 10) / 55));
  const trunkThickness = lerp(5, 20, tempT);

  const humT = Math.max(0, Math.min(1, humidity / 100));
  const branchAngle = lerp(20, -60, humT);

  const windT = Math.max(0, Math.min(1, windSpeed / 30));
  const leafCount = Math.round(lerp(80, 10, windT));

  const lightT = Math.max(0, Math.min(1, light / 100000));
  const leafColor = mixColors('#2D5A27', '#8FCF4E', lightT);

  const branches: { startX: number; startY: number; endX: number; endY: number; thickness: number; depth: number }[] = [];
  generateBranches(200, 380, 100, 0, trunkThickness, Math.abs(branchAngle) + 15, 0, 5, branches);

  const leaves: { x: number; y: number; radius: number; color: string }[] = [];
  const tipBranches = branches.filter((b) => b.depth >= 3);

  for (let i = 0; i < leafCount; i++) {
    const branch = tipBranches[Math.floor(Math.random() * tipBranches.length)] || branches[branches.length - 1];
    const t = Math.random();
    const lx = lerp(branch.startX, branch.endX, t) + (Math.random() - 0.5) * 20;
    const ly = lerp(branch.startY, branch.endY, t) + (Math.random() - 0.5) * 20;
    const radius = lerp(3, 5, Math.random());
    const colorVar = mixColors(leafColor, '#FFFFFF', Math.random() * 0.15);
    leaves.push({ x: lx, y: ly, radius, color: colorVar });
  }

  const leafRgb = hexToRgb(leafColor);
  const avgLeafColor = rgbToHex(
    lerp(leafRgb.r, 255, 0.1),
    lerp(leafRgb.g, 255, 0.1),
    lerp(leafRgb.b, 255, 0.1)
  );

  return {
    trunkThickness,
    branchAngle,
    leafCount,
    leafColor,
    avgLeafColor,
    branches,
    leaves,
  };
};

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

app.get('/api/trees', (_req: Request, res: Response) => {
  const records = Array.from(treeStore.values()).sort((a, b) => a.date.localeCompare(b.date));
  res.json({ success: true, data: records });
});

app.get('/api/trees/:date', (req: Request, res: Response) => {
  const { date } = req.params;
  const record = treeStore.get(date);
  if (!record) {
    return res.status(404).json({ success: false, message: '该日期无记录' });
  }
  res.json({ success: true, data: record });
});

app.post('/api/trees', (req: Request, res: Response) => {
  const climate: ClimateData = req.body.climate;
  if (!climate) {
    return res.status(400).json({ success: false, message: '缺少气候数据' });
  }
  const date = formatDate(new Date());
  const existed = treeStore.has(date);
  const tree = generateTree(climate);
  const record: TreeRecord = { date, climate, tree };
  treeStore.set(date, record);
  res.json({
    success: true,
    data: record,
    message: existed ? '已覆盖当日数据' : '保存成功',
  });
});

app.put('/api/trees/:date', (req: Request, res: Response) => {
  const { date } = req.params;
  const climate: ClimateData = req.body.climate;
  if (!treeStore.has(date)) {
    return res.status(404).json({ success: false, message: '该日期不存在' });
  }
  const tree = generateTree(climate);
  const record: TreeRecord = { date, climate, tree };
  treeStore.set(date, record);
  res.json({ success: true, data: record, message: '更新成功' });
});

app.delete('/api/trees/:date', (req: Request, res: Response) => {
  const { date } = req.params;
  if (!treeStore.has(date)) {
    return res.status(404).json({ success: false, message: '该日期不存在' });
  }
  treeStore.delete(date);
  res.json({ success: true, message: '删除成功' });
});

app.get('/api/today', (_req: Request, res: Response) => {
  const date = formatDate(new Date());
  res.json({ success: true, data: { date, exists: treeStore.has(date) } });
});

app.listen(PORT, () => {
  console.log(`Climate Rings Server running on http://localhost:${PORT}`);
});

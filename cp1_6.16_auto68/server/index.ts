import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Material, Pattern, PatternMaterial, ProduceResult, ProductType } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let materials: Material[] = [
  { id: uuidv4(), name: '红玛瑙珠子', unit: '颗', color: '#E74C3C', quantity: 50, supplier: '宝石坊', price: 2.5 },
  { id: uuidv4(), name: '蓝色丝线', unit: '米', color: '#3498DB', quantity: 100, supplier: '线绳世界', price: 0.8 },
  { id: uuidv4(), name: '银色扣头', unit: '个', color: '#BDC3C7', quantity: 20, supplier: '金属配件厂', price: 5.0 },
  { id: uuidv4(), name: '珍珠', unit: '颗', color: '#ECF0F1', quantity: 30, supplier: '珍珠阁', price: 8.0 },
  { id: uuidv4(), name: '紫水晶', unit: '颗', color: '#9B59B6', quantity: 3, supplier: '水晶世界', price: 12.0 },
];

let patterns: Pattern[] = [
  {
    id: uuidv4(),
    name: '红玛瑙手链',
    productType: 'bracelet' as ProductType,
    imageUrl: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=400',
    steps: '1. 准备30颗红玛瑙珠子\n2. 穿入蓝色丝线\n3. 两端系上银色扣头\n4. 调整松紧度',
    materials: [
      { materialId: materials[0].id, materialName: '红玛瑙珠子', quantity: 30 },
      { materialId: materials[1].id, materialName: '蓝色丝线', quantity: 0.5 },
      { materialId: materials[2].id, materialName: '银色扣头', quantity: 1 },
    ],
  },
  {
    id: uuidv4(),
    name: '珍珠耳环',
    productType: 'earring' as ProductType,
    imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400',
    steps: '1. 准备2颗珍珠\n2. 使用金属丝固定\n3. 安装耳钩\n4. 检查牢固度',
    materials: [
      { materialId: materials[3].id, materialName: '珍珠', quantity: 2 },
    ],
  },
];

app.get('/api/materials', (_req, res) => {
  res.json(materials);
});

app.post('/api/materials', (req, res) => {
  const { name, unit, color, quantity, supplier, price } = req.body;
  const newMaterial: Material = {
    id: uuidv4(),
    name,
    unit,
    color,
    quantity: Number(quantity),
    supplier,
    price: Number(price),
  };
  materials.push(newMaterial);
  res.status(201).json(newMaterial);
});

app.delete('/api/materials/:id', (req, res) => {
  const { id } = req.params;
  const index = materials.findIndex((m) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Material not found' });
  }
  const deleted = materials.splice(index, 1)[0];
  res.json(deleted);
});

app.put('/api/materials/:id', (req, res) => {
  const { id } = req.params;
  const index = materials.findIndex((m) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Material not found' });
  }
  materials[index] = { ...materials[index], ...req.body, id };
  res.json(materials[index]);
});

app.get('/api/patterns', (_req, res) => {
  res.json(patterns);
});

app.post('/api/patterns', (req, res) => {
  const { name, productType, imageUrl, steps, materials: patternMaterials } = req.body;
  const newPattern: Pattern = {
    id: uuidv4(),
    name,
    productType: productType as ProductType,
    imageUrl,
    steps,
    materials: patternMaterials as PatternMaterial[],
  };
  patterns.push(newPattern);
  res.status(201).json(newPattern);
});

app.post('/api/patterns/:id/produce', (req, res) => {
  const { id } = req.params;
  const pattern = patterns.find((p) => p.id === id);

  if (!pattern) {
    return res.status(404).json({ error: 'Pattern not found' });
  }

  const missingMaterials: string[] = [];
  let totalCost = 0;

  for (const pm of pattern.materials) {
    const material = materials.find((m) => m.id === pm.materialId);
    if (!material || material.quantity < pm.quantity) {
      missingMaterials.push(pm.materialId);
    }
  }

  if (missingMaterials.length > 0) {
    const result: ProduceResult = {
      success: false,
      missingMaterials,
      totalCost: 0,
    };
    return res.status(400).json(result);
  }

  for (const pm of pattern.materials) {
    const material = materials.find((m) => m.id === pm.materialId)!;
    totalCost += material.price * pm.quantity;
    material.quantity -= pm.quantity;
  }

  totalCost = Math.round(totalCost * 100) / 100;

  const result: ProduceResult = {
    success: true,
    missingMaterials: [],
    totalCost,
  };

  res.json({ result, updatedMaterials: materials });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

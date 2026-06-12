import express from 'express';
import cors from 'cors';
import compression from 'compression';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(compression());
app.use(express.json());

type RoofType = 'flat' | 'gable' | 'hip' | 'dome' | 'traditional';

interface GreenDensityRange {
  min: number;
  max: number;
}

interface SunAngle {
  azimuth: number;
  elevation: number;
}

interface Building {
  id: string;
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  color: string;
  roofType: RoofType;
  roofColor?: string;
  windowCount?: number;
}

interface Tree {
  id: string;
  position: [number, number, number];
  scale: number;
  trunkColor?: string;
  foliageColor?: string;
}

interface StreetLight {
  id: string;
  position: [number, number, number];
  height: number;
  intensity?: number;
  color?: string;
}

interface StreetData {
  id: string;
  name: string;
  description: string;
  buildings: Building[];
  trees: Tree[];
  streetLights: StreetLight[];
  groundColor: string;
  streetWidth: number;
  streetLength: number;
  greeneryDensity: number;
  greenDensity: GreenDensityRange;
  lightAngle: number;
  sunAngle: SunAngle;
  skyColor: string;
  ambientIntensity: number;
}

interface BuildingDiff {
  id: string;
  position?: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
  color?: string;
  roofType?: RoofType;
  roofColor?: string;
  windowCount?: number;
}

interface StreetDiff {
  id: string;
  name: string;
  buildings: BuildingDiff[];
  addedBuildings: Building[];
  removedBuildingIds: string[];
  addedTrees: Tree[];
  removedTreeIds: string[];
  addedStreetLights: StreetLight[];
  removedStreetLightIds: string[];
  groundColor?: string;
  greeneryDensityDelta?: number;
  greenDensity?: GreenDensityRange;
  lightAngleDelta?: number;
  sunAngleDelta?: Partial<SunAngle>;
  skyColor?: string;
  ambientIntensityDelta?: number;
}

const streetTypes = ['hutong', 'shikumen', 'qilou', 'tulou'];
const streetNames: Record<string, string> = {
  hutong: '胡同',
  shikumen: '石库门',
  qilou: '骑楼',
  tulou: '土楼',
};

function generateBuildings(type: string, startId: number): { buildings: Building[]; nextId: number } {
  const buildings: Building[] = [];
  let id = startId;
  const count = 12;
  const streetLength = 80;
  const spacing = streetLength / count;

  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const z = -streetLength / 2 + i * spacing + spacing / 2;
    const x = side * (8 + Math.random() * 3);
    
    let height = 3 + Math.random() * 4;
    let color = '#8B4513';
    let roofType: RoofType = 'gable';
    let roofColor = '#654321';

    switch (type) {
      case 'hutong':
        height = 2 + Math.random() * 2;
        color = ['#8B4513', '#A0522D', '#CD853F'][Math.floor(Math.random() * 3)];
        roofType = 'traditional';
        roofColor = '#8B0000';
        break;
      case 'shikumen':
        height = 3 + Math.random() * 3;
        color = ['#B22222', '#800000', '#A52A2A'][Math.floor(Math.random() * 3)];
        roofType = 'flat';
        roofColor = '#4A4A4A';
        break;
      case 'qilou':
        height = 4 + Math.random() * 3;
        color = ['#F5F5DC', '#FAEBD7', '#FFEFD5'][Math.floor(Math.random() * 3)];
        roofType = 'hip';
        roofColor = '#2F4F4F';
        break;
      case 'tulou':
        height = 5 + Math.random() * 4;
        color = ['#D2B48C', '#DEB887', '#F5DEB3'][Math.floor(Math.random() * 3)];
        roofType = 'dome';
        roofColor = '#8B4513';
        break;
    }

    buildings.push({
      id: `building-${id}`,
      position: [x, height / 2, z],
      width: 4 + Math.random() * 2,
      depth: 4 + Math.random() * 2,
      height,
      color,
      roofType,
      roofColor,
      windowCount: Math.floor(height),
    });
    id++;
  }

  return { buildings, nextId: id };
}

function generateTrees(startId: number): { trees: Tree[]; nextId: number } {
  const trees: Tree[] = [];
  let id = startId;
  const count = 15;

  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const z = -35 + i * 5 + Math.random() * 2;
    const x = side * (5 + Math.random() * 2);

    trees.push({
      id: `tree-${id}`,
      position: [x, 0, z],
      scale: 0.8 + Math.random() * 0.4,
      trunkColor: '#8B4513',
      foliageColor: ['#228B22', '#32CD32', '#006400'][Math.floor(Math.random() * 3)],
    });
    id++;
  }

  return { trees, nextId: id };
}

function generateStreetLights(startId: number): { streetLights: StreetLight[]; nextId: number } {
  const streetLights: StreetLight[] = [];
  let id = startId;
  const count = 10;

  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const z = -35 + i * 8;
    const x = side * 4;

    streetLights.push({
      id: `light-${id}`,
      position: [x, 0, z],
      height: 4 + Math.random() * 1,
      intensity: 1.0,
      color: '#FFFACD',
    });
    id++;
  }

  return { streetLights, nextId: id };
}

function generateStreetData(type: string): StreetData {
  let buildingId = 0;
  let treeId = 0;
  let lightId = 0;

  const { buildings, nextId: nbId } = generateBuildings(type, buildingId);
  buildingId = nbId;
  const { trees, nextId: ntId } = generateTrees(treeId);
  treeId = ntId;
  const { streetLights, nextId: nlId } = generateStreetLights(lightId);
  lightId = nlId;

  let groundColor = '#5D4E37';
  if (type === 'shikumen') groundColor = '#4A4A4A';
  if (type === 'qilou') groundColor = '#8B7355';
  if (type === 'tulou') groundColor = '#8B7355';

  return {
    id: type,
    name: streetNames[type],
    description: `${streetNames[type]}历史街区改造项目`,
    buildings,
    trees,
    streetLights,
    groundColor,
    streetWidth: 30,
    streetLength: 80,
    greeneryDensity: 35,
    greenDensity: { min: 0, max: 100 },
    lightAngle: 0,
    sunAngle: { azimuth: 45, elevation: 60 },
    skyColor: '#87CEEB',
    ambientIntensity: 0.5,
  };
}

function generateStreetDiff(original: StreetData): StreetDiff {
  const buildingDiffs: BuildingDiff[] = original.buildings.map((b, idx) => {
    const newHeight = b.height * (1.2 + Math.random() * 0.3);
    const colors = ['#F5F5DC', '#FFD700', '#E6E6FA', '#D4AF37'];
    const roofTypes: RoofType[] = ['flat', 'gable', 'hip'];
    return {
      id: b.id,
      height: newHeight,
      position: [b.position[0], newHeight / 2, b.position[2]],
      color: colors[idx % colors.length],
      roofType: roofTypes[idx % roofTypes.length],
      roofColor: '#708090',
    };
  });

  const addedBuildings: Building[] = [];
  for (let i = 0; i < 4; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const z = -20 + i * 12;
    const x = side * (12 + Math.random() * 2);
    const height = 6 + Math.random() * 4;
    addedBuildings.push({
      id: `building-new-${i}`,
      position: [x, height / 2, z],
      width: 5 + Math.random() * 2,
      depth: 5 + Math.random() * 2,
      height,
      color: '#E6E6FA',
      roofType: 'flat',
      roofColor: '#4A4A4A',
      windowCount: Math.floor(height),
    });
  }

  const addedTrees: Tree[] = [];
  for (let i = 0; i < 10; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const z = -30 + i * 6 + Math.random() * 2;
    const x = side * (3 + Math.random() * 1.5);
    addedTrees.push({
      id: `tree-new-${i}`,
      position: [x, 0, z],
      scale: 0.9 + Math.random() * 0.3,
      trunkColor: '#654321',
      foliageColor: '#32CD32',
    });
  }

  const addedStreetLights: StreetLight[] = [];
  for (let i = 0; i < 5; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const z = -25 + i * 12;
    const x = side * 2;
    addedStreetLights.push({
      id: `light-new-${i}`,
      position: [x, 0, z],
      height: 5,
      intensity: 1.2,
      color: '#FFD700',
    });
  }

  return {
    id: original.id,
    name: original.name,
    buildings: buildingDiffs,
    addedBuildings,
    removedBuildingIds: original.buildings.filter((_, i) => i % 6 === 0).map(b => b.id),
    addedTrees,
    removedTreeIds: original.trees.filter((_, i) => i % 5 === 0).map(t => t.id),
    addedStreetLights,
    removedStreetLightIds: original.streetLights.filter((_, i) => i % 4 === 0).map(l => l.id),
    groundColor: '#6B8E23',
    greeneryDensityDelta: 40,
    greenDensity: { min: 0, max: 100 },
    lightAngleDelta: 30,
    sunAngleDelta: { azimuth: 90, elevation: 45 },
    skyColor: '#E6E6FA',
    ambientIntensityDelta: 0.2,
  };
}

const streetDataCache: Record<string, StreetData> = {};
const streetDiffCache: Record<string, StreetDiff> = {};

streetTypes.forEach(type => {
  streetDataCache[type] = generateStreetData(type);
  streetDiffCache[type] = generateStreetDiff(streetDataCache[type]);
});

app.get('/api/streets', (_req, res) => {
  const list = streetTypes.map(type => ({
    id: type,
    name: streetNames[type],
    description: streetDataCache[type].description,
  }));
  res.json(list);
});

app.get('/api/streets/:id', (req, res) => {
  const id = req.params.id;
  const data = streetDataCache[id];
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ error: 'Street not found' });
  }
});

app.get('/api/streets/:id/diff', (req, res) => {
  const id = req.params.id;
  const diff = streetDiffCache[id];
  if (diff) {
    res.json(diff);
  } else {
    res.status(404).json({ error: 'Street diff not found' });
  }
});

app.get('/api/street-diff/:id', (req, res) => {
  const id = req.params.id;
  const diff = streetDiffCache[id];
  if (diff) {
    res.json(diff);
  } else {
    res.status(404).json({ error: 'Street diff not found' });
  }
});

app.post('/api/streets/:id/params', (req, res) => {
  const id = req.params.id;
  const { buildingColor, greeneryDensity, lightAngle } = req.body;
  
  if (streetDataCache[id]) {
    if (buildingColor) {
      streetDataCache[id].buildings.forEach(b => {
        b.color = buildingColor;
      });
    }
    if (typeof greeneryDensity === 'number') {
      streetDataCache[id].greeneryDensity = Math.max(0, Math.min(100, greeneryDensity));
    }
    if (typeof lightAngle === 'number') {
      streetDataCache[id].lightAngle = Math.max(-90, Math.min(90, lightAngle));
      const radians = (lightAngle * Math.PI) / 180;
      streetDataCache[id].sunAngle.azimuth = lightAngle + 45;
    }
    res.json({ success: true, id, buildingColor, greeneryDensity, lightAngle });
  } else {
    res.status(404).json({ error: 'Street not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

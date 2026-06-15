import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

export interface ColorStop {
  id: string;
  color: string;
  position: number;
}

export interface GradientPreset {
  id: string;
  name: string;
  colorStops: ColorStop[];
  angle: number;
  type: 'linear' | 'radial';
}

const presets: GradientPreset[] = [
  {
    id: '1',
    name: '晨曦暖阳',
    colorStops: [
      { id: 's1', color: '#FF6B6B', position: 0 },
      { id: 's2', color: '#FFA07A', position: 50 },
      { id: 's3', color: '#FFD93D', position: 100 }
    ],
    angle: 135,
    type: 'linear'
  },
  {
    id: '2',
    name: '深海幽蓝',
    colorStops: [
      { id: 's1', color: '#0F0C29', position: 0 },
      { id: 's2', color: '#302B63', position: 50 },
      { id: 's3', color: '#24243E', position: 100 }
    ],
    angle: 180,
    type: 'linear'
  },
  {
    id: '3',
    name: '森林翠谷',
    colorStops: [
      { id: 's1', color: '#134E5E', position: 0 },
      { id: 's2', color: '#71B280', position: 100 }
    ],
    angle: 90,
    type: 'linear'
  },
  {
    id: '4',
    name: '玫瑰梦境',
    colorStops: [
      { id: 's1', color: '#FF5F6D', position: 0 },
      { id: 's2', color: '#FFC371', position: 100 }
    ],
    angle: 45,
    type: 'linear'
  },
  {
    id: '5',
    name: '极光之夜',
    colorStops: [
      { id: 's1', color: '#00F5A0', position: 0 },
      { id: 's2', color: '#00D9F5', position: 100 }
    ],
    angle: 120,
    type: 'linear'
  },
  {
    id: '6',
    name: '紫罗兰花园',
    colorStops: [
      { id: 's1', color: '#834D9B', position: 0 },
      { id: 's2', color: '#D04ED6', position: 100 }
    ],
    angle: 160,
    type: 'linear'
  },
  {
    id: '7',
    name: '落日余晖',
    colorStops: [
      { id: 's1', color: '#FA8BFF', position: 0 },
      { id: 's2', color: '#2BD2FF', position: 50 },
      { id: 's3', color: '#2BFF88', position: 100 }
    ],
    angle: 90,
    type: 'radial'
  },
  {
    id: '8',
    name: '霓虹都市',
    colorStops: [
      { id: 's1', color: '#FC466B', position: 0 },
      { id: 's2', color: '#3F5EFB', position: 100 }
    ],
    angle: 225,
    type: 'linear'
  },
  {
    id: '9',
    name: '神秘沙漠',
    colorStops: [
      { id: 's1', color: '#C79081', position: 0 },
      { id: 's2', color: '#DFA574', position: 50 },
      { id: 's3', color: '#B06A3B', position: 100 }
    ],
    angle: 315,
    type: 'linear'
  },
  {
    id: '10',
    name: '星空银河',
    colorStops: [
      { id: 's1', color: '#0B486B', position: 0 },
      { id: 's2', color: '#F56217', position: 100 }
    ],
    angle: 270,
    type: 'radial'
  }
];

app.get('/api/presets', (_req, res) => {
  res.json({ success: true, data: presets });
});

app.listen(PORT, () => {
  console.log(`Preset API server running on http://localhost:${PORT}`);
});

export default app;

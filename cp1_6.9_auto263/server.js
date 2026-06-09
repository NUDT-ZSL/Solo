import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

function generateWaveformData(length, seed) {
  const data = [];
  let x = seed;
  for (let i = 0; i < length; i++) {
    x = (x * 9301 + 49297) % 233280;
    const base = x / 233280;
    const wave1 = Math.sin(i * 0.15 + seed) * 0.3;
    const wave2 = Math.sin(i * 0.4 + seed * 2) * 0.2;
    const wave3 = Math.sin(i * 0.08 + seed * 0.5) * 0.25;
    const val = 0.2 + base * 0.3 + Math.abs(wave1 + wave2 + wave3);
    data.push(Math.min(1, Math.max(0.05, val)));
  }
  return data;
}

const soundClips = [
  {
    id: 'clip-001',
    name: '清晨鸟鸣',
    duration: 2.0,
    frequency: 880,
    waveType: 'sine',
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.3 },
    vibrato: { rate: 8, depth: 20 },
    waveformData: generateWaveformData(80, 1)
  },
  {
    id: 'clip-002',
    name: '深海低音',
    duration: 3.5,
    frequency: 110,
    waveType: 'sine',
    envelope: { attack: 0.5, decay: 0.8, sustain: 0.7, release: 1.0 },
    vibrato: { rate: 2, depth: 3 },
    waveformData: generateWaveformData(80, 2)
  },
  {
    id: 'clip-003',
    name: '木琴敲击',
    duration: 0.8,
    frequency: 1320,
    waveType: 'triangle',
    envelope: { attack: 0.001, decay: 0.3, sustain: 0.0, release: 0.4 },
    vibrato: { rate: 0, depth: 0 },
    waveformData: generateWaveformData(80, 3)
  },
  {
    id: 'clip-004',
    name: '弦乐合奏',
    duration: 4.0,
    frequency: 440,
    waveType: 'sawtooth',
    envelope: { attack: 0.4, decay: 0.3, sustain: 0.8, release: 0.8 },
    vibrato: { rate: 5, depth: 8 },
    waveformData: generateWaveformData(80, 4)
  },
  {
    id: 'clip-005',
    name: '电子脉冲',
    duration: 1.2,
    frequency: 660,
    waveType: 'square',
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.4, release: 0.15 },
    vibrato: { rate: 12, depth: 15 },
    waveformData: generateWaveformData(80, 5)
  },
  {
    id: 'clip-006',
    name: '风铃低语',
    duration: 2.5,
    frequency: 1760,
    waveType: 'sine',
    envelope: { attack: 0.02, decay: 1.2, sustain: 0.3, release: 0.8 },
    vibrato: { rate: 6, depth: 5 },
    waveformData: generateWaveformData(80, 6)
  },
  {
    id: 'clip-007',
    name: '雷鸣滚滚',
    duration: 3.0,
    frequency: 65,
    waveType: 'sawtooth',
    envelope: { attack: 0.8, decay: 0.5, sustain: 0.5, release: 1.5 },
    vibrato: { rate: 1, depth: 2 },
    waveformData: generateWaveformData(80, 7)
  },
  {
    id: 'clip-008',
    name: '钢琴琶音',
    duration: 1.8,
    frequency: 523,
    waveType: 'triangle',
    envelope: { attack: 0.002, decay: 0.5, sustain: 0.3, release: 0.6 },
    vibrato: { rate: 0, depth: 0 },
    waveformData: generateWaveformData(80, 8)
  },
  {
    id: 'clip-009',
    name: '鼓点重击',
    duration: 0.4,
    frequency: 80,
    waveType: 'sine',
    envelope: { attack: 0.001, decay: 0.15, sustain: 0.0, release: 0.2 },
    vibrato: { rate: 0, depth: 0 },
    waveformData: generateWaveformData(80, 9)
  },
  {
    id: 'clip-010',
    name: '太空氛围',
    duration: 5.0,
    frequency: 220,
    waveType: 'sine',
    envelope: { attack: 1.2, decay: 0.8, sustain: 0.7, release: 2.0 },
    vibrato: { rate: 3, depth: 10 },
    waveformData: generateWaveformData(80, 10)
  },
  {
    id: 'clip-011',
    name: '爵士小号',
    duration: 2.2,
    frequency: 587,
    waveType: 'square',
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.4 },
    vibrato: { rate: 7, depth: 12 },
    waveformData: generateWaveformData(80, 11)
  },
  {
    id: 'clip-012',
    name: '水晶回响',
    duration: 3.2,
    frequency: 1175,
    waveType: 'sine',
    envelope: { attack: 0.03, decay: 0.8, sustain: 0.5, release: 1.2 },
    vibrato: { rate: 4, depth: 6 },
    waveformData: generateWaveformData(80, 12)
  }
];

const mixesStore = new Map();

const defaultMixes = [
  {
    id: 'mix-demo-1',
    author: '回声旅人',
    createdAt: Date.now() - 3600000,
    clips: [
      { clipId: 'clip-002', trackPosition: 0, durationScale: 1.0 },
      { clipId: 'clip-006', trackPosition: 1.5, durationScale: 1.0 },
      { clipId: 'clip-010', trackPosition: 0.5, durationScale: 0.8 },
      { clipId: 'clip-012', trackPosition: 3.0, durationScale: 1.2 }
    ],
    totalDuration: 8.0
  },
  {
    id: 'mix-demo-2',
    author: '梦境编织者',
    createdAt: Date.now() - 7200000,
    clips: [
      { clipId: 'clip-003', trackPosition: 0, durationScale: 1.0 },
      { clipId: 'clip-003', trackPosition: 0.8, durationScale: 1.0 },
      { clipId: 'clip-008', trackPosition: 0.4, durationScale: 1.0 },
      { clipId: 'clip-009', trackPosition: 0, durationScale: 1.0 },
      { clipId: 'clip-009', trackPosition: 1.2, durationScale: 1.0 }
    ],
    totalDuration: 3.0
  },
  {
    id: 'mix-demo-3',
    author: '星际漫游者',
    createdAt: Date.now() - 10800000,
    clips: [
      { clipId: 'clip-010', trackPosition: 0, durationScale: 1.5 },
      { clipId: 'clip-005', trackPosition: 1.0, durationScale: 1.0 },
      { clipId: 'clip-005', trackPosition: 2.2, durationScale: 1.0 },
      { clipId: 'clip-011', trackPosition: 3.5, durationScale: 1.0 }
    ],
    totalDuration: 7.5
  }
];
defaultMixes.forEach(m => mixesStore.set(m.id, m));

app.get('/api/clips', (req, res) => {
  res.json({
    success: true,
    data: soundClips.map(c => ({
      id: c.id,
      name: c.name,
      duration: c.duration,
      waveformData: c.waveformData,
      frequency: c.frequency,
      waveType: c.waveType,
      envelope: c.envelope,
      vibrato: c.vibrato
    }))
  });
});

app.post('/api/mixes', (req, res) => {
  try {
    const { clips, author, totalDuration } = req.body;
    if (!Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ success: false, error: '拼贴不能为空' });
    }
    const id = uuidv4();
    const mix = {
      id,
      author: author || '匿名创作者',
      createdAt: Date.now(),
      clips: clips.map(c => ({
        clipId: c.clipId,
        trackPosition: Number(c.trackPosition) || 0,
        durationScale: Number(c.durationScale) || 1.0
      })),
      totalDuration: Number(totalDuration) || 10
    };
    mixesStore.set(id, mix);
    res.json({ success: true, data: mix });
  } catch (err) {
    console.error('保存混合作品失败:', err);
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

app.get('/api/mixes', (req, res) => {
  const allMixes = Array.from(mixesStore.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
  res.json({
    success: true,
    data: allMixes.map(m => {
      const firstClip = m.clips[0];
      const clipData = soundClips.find(c => c.id === firstClip?.clipId);
      return {
        id: m.id,
        author: m.author,
        createdAt: m.createdAt,
        clipCount: m.clips.length,
        totalDuration: m.totalDuration,
        previewWaveform: clipData?.waveformData || []
      };
    })
  });
});

app.get('/api/mixes/:id', (req, res) => {
  const mix = mixesStore.get(req.params.id);
  if (!mix) {
    return res.status(404).json({ success: false, error: '作品不存在' });
  }
  const expandedClips = mix.clips.map(c => {
    const clipData = soundClips.find(s => s.id === c.clipId);
    return {
      ...c,
      clip: clipData || null
    };
  });
  res.json({
    success: true,
    data: {
      ...mix,
      clips: expandedClips
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`回声拼贴后端服务已启动: http://localhost:${PORT}`);
  console.log(`API 端点:`);
  console.log(`  GET  /api/clips        - 获取音频片段列表`);
  console.log(`  GET  /api/mixes        - 获取混合作品列表`);
  console.log(`  POST /api/mixes        - 保存混合作品`);
  console.log(`  GET  /api/mixes/:id    - 获取单个混合作品`);
});

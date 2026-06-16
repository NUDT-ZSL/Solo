import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

const HISTORY_LENGTH = 300;
let eegHistory = [];

function generateEEGData(region, baseFreq = 10) {
  const data = new Float32Array(128);
  const noiseScale = 5;
  const signalScale = 25;
  
  for (let i = 0; i < 128; i++) {
    const t = i / 128;
    const alpha = Math.sin(2 * Math.PI * baseFreq * t) * signalScale * 0.6;
    const beta = Math.sin(2 * Math.PI * (baseFreq * 2.5) * t) * signalScale * 0.3;
    const theta = Math.sin(2 * Math.PI * (baseFreq * 0.5) * t) * signalScale * 0.4;
    const noise = (Math.random() - 0.5) * noiseScale * 2;
    
    data[i] = alpha + beta + theta + noise;
  }
  
  return data;
}

function generateTimestamps() {
  const timestamps = [];
  const now = Date.now();
  for (let i = 0; i < 128; i++) {
    timestamps.push(now - (127 - i) * (1000 / 256));
  }
  return timestamps;
}

function generateFullEEG() {
  const now = Date.now();
  
  const frontalBase = 10 + Math.sin(now / 3000) * 2;
  const parietalBase = 12 + Math.cos(now / 4000) * 1.5;
  const temporalBase = 8 + Math.sin(now / 5000) * 3;
  const occipitalBase = 11 + Math.cos(now / 2500) * 2.5;
  
  return {
    timestamp: now,
    timestamps: generateTimestamps(),
    data: {
      frontal: generateEEGData('frontal', frontalBase),
      parietal: generateEEGData('parietal', parietalBase),
      temporal: generateEEGData('temporal', temporalBase),
      occipital: generateEEGData('occipital', occipitalBase)
    }
  };
}

for (let i = 0; i < HISTORY_LENGTH; i++) {
  eegHistory.push(generateFullEEG());
}

app.get('/api/eeg', (req, res) => {
  const latest = generateFullEEG();
  eegHistory.push(latest);
  
  if (eegHistory.length > HISTORY_LENGTH) {
    eegHistory.shift();
  }
  
  const response = {
    timestamp: latest.timestamp,
    timestamps: latest.timestamps,
    data: {
      frontal: Array.from(latest.data.frontal),
      parietal: Array.from(latest.data.parietal),
      temporal: Array.from(latest.data.temporal),
      occipital: Array.from(latest.data.occipital)
    },
    historyCount: eegHistory.length
  };
  
  res.json(response);
});

app.get('/api/eeg/history', (req, res) => {
  const offset = parseFloat(req.query.offset) || 0;
  const index = Math.max(0, Math.min(eegHistory.length - 1, Math.floor(offset / 0.2)));
  const data = eegHistory[eegHistory.length - 1 - index];
  
  if (data) {
    res.json({
      timestamp: data.timestamp,
      timestamps: data.timestamps,
      data: {
        frontal: Array.from(data.data.frontal),
        parietal: Array.from(data.data.parietal),
        temporal: Array.from(data.data.temporal),
        occipital: Array.from(data.data.occipital)
      },
      historyIndex: index,
      historyCount: eegHistory.length
    });
  } else {
    res.status(404).json({ error: 'History index out of range' });
  }
});

app.get('/api/eeg/range', (req, res) => {
  const start = parseFloat(req.query.start) || 0;
  const end = parseFloat(req.query.end) || 60;
  const startIdx = Math.max(0, Math.floor(start / 0.2));
  const endIdx = Math.min(eegHistory.length - 1, Math.floor(end / 0.2));
  
  const result = eegHistory.slice(
    eegHistory.length - 1 - endIdx,
    eegHistory.length - startIdx
  ).map(d => ({
    timestamp: d.timestamp,
    data: {
      frontal: Array.from(d.data.frontal),
      parietal: Array.from(d.data.parietal),
      temporal: Array.from(d.data.temporal),
      occipital: Array.from(d.data.occipital)
    }
  }));
  
  res.json({
    count: result.length,
    samples: result
  });
});

app.listen(PORT, () => {
  console.log(`EEG Server running on http://localhost:${PORT}`);
  console.log(`  GET /api/eeg - Latest EEG data`);
  console.log(`  GET /api/eeg/history?offset=0 - Historical data by time offset (seconds)`);
  console.log(`  GET /api/eeg/range?start=0&end=60 - Range of historical data`);
});

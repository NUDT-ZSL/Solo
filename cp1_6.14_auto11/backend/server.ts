import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as models from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/models', async (req, res) => {
  try {
    const { name, steps, creasePattern } = req.body;
    
    if (!name || !steps || !creasePattern) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, steps, creasePattern'
      });
    }
    
    const model = await models.create({ name, steps, creasePattern });
    
    res.status(201).json({
      success: true,
      data: model
    });
  } catch (error) {
    console.error('Error creating model:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/models', async (_req, res) => {
  try {
    const modelList = await models.findAll();
    
    res.json({
      success: true,
      data: modelList
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const model = await models.findById(id);
    
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }
    
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.use(express.static(join(__dirname, '..')));

app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║   UnfoldOrigami Backend Server                               ║
  ║   Running on: http://localhost:${PORT}                         ║
  ║                                                              ║
  ║   API Endpoints:                                             ║
  ║   GET    /api/health         - Health check                  ║
  ║   POST   /api/models         - Create model                  ║
  ║   GET    /api/models         - List all models               ║
  ║   GET    /api/models/:id     - Get model by ID               ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  `);
});

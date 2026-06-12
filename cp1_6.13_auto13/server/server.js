import express from 'express';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

const db = Datastore.create(join(__dirname, 'models.db'));

app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid configuration: must be an object');
  }
  if (!Array.isArray(config.layers)) {
    throw new Error('Configuration must have a "layers" array');
  }
  if (config.layers.length < 2) {
    throw new Error('At least 2 layers are required (input + output)');
  }

  config.layers.forEach((layer, index) => {
    if (!layer.name) {
      throw new Error(`Layer ${index} is missing "name"`);
    }
    if (!layer.type || !['input', 'hidden', 'output'].includes(layer.type)) {
      throw new Error(`Layer ${layer.name} has invalid type. Must be input, hidden, or output`);
    }
    if (typeof layer.neurons !== 'number' || layer.neurons < 1) {
      throw new Error(`Layer ${layer.name} has invalid neuron count`);
    }
    if (!layer.activation) {
      throw new Error(`Layer ${layer.name} is missing "activation"`);
    }
  });

  if (config.connections) {
    if (!Array.isArray(config.connections)) {
      throw new Error('Connections must be an array');
    }
  }

  return true;
}

function parseConfigToVisualization(config) {
  const layers = config.layers.map((layer, index) => ({
    id: `layer-${index}`,
    name: layer.name,
    type: layer.type,
    neurons: layer.neurons,
    activation: layer.activation,
    index: index
  }));

  const connectionMatrix = [];
  for (let i = 0; i < layers.length - 1; i++) {
    const fromLayer = layers[i];
    const toLayer = layers[i + 1];
    const connections = [];

    for (let j = 0; j < fromLayer.neurons; j++) {
      const neuronConnections = [];
      for (let k = 0; k < toLayer.neurons; k++) {
        let weight = Math.random() * 2 - 1;
        if (config.connections && config.connections[i]) {
          const conn = config.connections[i].find(
            c => c.from === j && c.to === k
          );
          if (conn && typeof conn.weight === 'number') {
            weight = conn.weight;
          }
        }
        neuronConnections.push({
          fromNeuron: j,
          toNeuron: k,
          weight: weight
        });
      }
      connections.push(neuronConnections);
    }
    connectionMatrix.push(connections);
  }

  return {
    layers,
    connectionMatrix,
    totalNeurons: layers.reduce((sum, l) => sum + l.neurons, 0),
    totalConnections: connectionMatrix.reduce(
      (sum, layer) => sum + layer.flat().length,
      0
    )
  };
}

app.post('/api/models', async (req, res) => {
  try {
    const { name, config } = req.body;

    if (!name || !config) {
      return res.status(400).json({ error: 'Name and config are required' });
    }

    validateConfig(config);

    const model = {
      _id: uuidv4(),
      name,
      config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await db.insert(model);
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/models', async (req, res) => {
  try {
    const models = await db.find({}).sort({ createdAt: -1 });
    res.json(models.map(m => ({
      id: m._id,
      name: m.name,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models/:id', async (req, res) => {
  try {
    const model = await db.findOne({ _id: req.params.id });
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    res.json(model);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models/:id/visualize', async (req, res) => {
  try {
    const model = await db.findOne({ _id: req.params.id });
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const visualization = parseConfigToVisualization(model.config);
    res.json({
      modelId: model._id,
      name: model.name,
      ...visualization
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/visualize', async (req, res) => {
  try {
    const { config } = req.body;
    validateConfig(config);
    const visualization = parseConfigToVisualization(config);
    res.json(visualization);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/models/:id', async (req, res) => {
  try {
    const result = await db.remove({ _id: req.params.id }, {});
    if (result === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }
    res.json({ success: true, message: 'Model deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`NeuronViz server running on http://localhost:${PORT}`);
});

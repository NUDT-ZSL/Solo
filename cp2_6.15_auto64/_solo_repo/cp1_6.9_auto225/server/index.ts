import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import {
  getAllBeacons,
  createBeacon,
  recordVisit,
  type Beacon,
  type Visibility
} from './beaconModel';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

app.get('/api/beacons', (_req, res) => {
  const beacons = getAllBeacons();
  res.status(200).json(beacons);
});

app.post('/api/beacons', (req, res) => {
  const { x, y, text, visibility } = req.body;

  const result = createBeacon({
    x: Number(x),
    y: Number(y),
    text: text as string,
    visibility: visibility as Visibility
  });

  if ('error' in result) {
    res.status(400).json({ error: result.error });
  } else {
    res.status(201).json(result as Beacon);
  }
});

app.post('/api/beacons/:id/visit', (req, res) => {
  const { id } = req.params;
  const result = recordVisit(id);

  if ('error' in result) {
    res.status(400).json({ error: result.error });
  } else {
    res.status(200).json(result as Beacon);
  }
});

app.listen(PORT, () => {
  console.log(`Ember Beacon server running on http://localhost:${PORT}`);
});

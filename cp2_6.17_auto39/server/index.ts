import express from 'express';
import cors from 'cors';
import {
  getAllRoutes,
  getRouteById,
  getEmissionAggregate,
  getAllShips,
  getTimestamp
} from './routeData';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get('/api/routes', (_req, res) => {
  try {
    const data = getAllRoutes();
    res.json({
      success: true,
      data,
      timestamp: getTimestamp()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routes',
      timestamp: getTimestamp()
    });
  }
});

app.get('/api/routes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const route = getRouteById(id);
    if (!route) {
      res.status(404).json({
        success: false,
        error: 'Route not found',
        timestamp: getTimestamp()
      });
      return;
    }
    res.json({
      success: true,
      data: route,
      timestamp: getTimestamp()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch route',
      timestamp: getTimestamp()
    });
  }
});

app.get('/api/emissions', (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || 2020;
    const data = getEmissionAggregate(year);
    res.json({
      success: true,
      data,
      timestamp: getTimestamp()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emissions',
      timestamp: getTimestamp()
    });
  }
});

app.get('/api/ships', (_req, res) => {
  try {
    const data = getAllShips();
    res.json({
      success: true,
      data,
      timestamp: getTimestamp()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ships',
      timestamp: getTimestamp()
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', port: PORT },
    timestamp: getTimestamp()
  });
});

app.listen(PORT, () => {
  console.log(`[server] Shipping emissions API running on http://localhost:${PORT}`);
});

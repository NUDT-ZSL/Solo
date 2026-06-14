import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JsonFileStore } from '../store.js';
import type { RideReport, ApiResponse } from '../types.js';

const router = express.Router();
const store = new JsonFileStore<RideReport>('reports.json', 'reports');

router.get('/:id', (req, res) => {
  try {
    const reports = store.getAll();
    const report = reports.find((r) => r.rideId === req.params.id);
    if (!report) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Report not found',
      };
      res.status(404).json(response);
      return;
    }
    const response: ApiResponse<RideReport> = { success: true, data: report };
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch report';
    const response: ApiResponse<null> = { success: false, error: message };
    res.status(500).json(response);
  }
});

router.post('/', (req, res) => {
  try {
    const report: RideReport = {
      ...req.body,
      id: uuidv4(),
      generatedAt: Date.now(),
    };
    store.create(report);
    const response: ApiResponse<RideReport> = {
      success: true,
      data: report,
      message: 'Report created',
    };
    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create report';
    const response: ApiResponse<null> = { success: false, error: message };
    res.status(500).json(response);
  }
});

export default router;

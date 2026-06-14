import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JsonFileStore } from '../store.js';
import type { RideRecord, ApiResponse } from '../types.js';

const router = express.Router();
const store = new JsonFileStore<RideRecord>('records.json', 'records');

router.get('/', (_req, res) => {
  try {
    const records = store
      .getAll()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
    const response: ApiResponse<RideRecord[]> = {
      success: true,
      data: records,
    };
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch records';
    const response: ApiResponse<null> = { success: false, error: message };
    res.status(500).json(response);
  }
});

router.get('/:id', (req, res) => {
  try {
    const record = store.getById(req.params.id);
    if (!record) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Record not found',
      };
      res.status(404).json(response);
      return;
    }
    const response: ApiResponse<RideRecord> = { success: true, data: record };
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch record';
    const response: ApiResponse<null> = { success: false, error: message };
    res.status(500).json(response);
  }
});

router.post('/', (req, res) => {
  try {
    const record: RideRecord = {
      ...req.body,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    store.create(record);
    const response: ApiResponse<RideRecord> = {
      success: true,
      data: record,
      message: 'Record created',
    };
    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create record';
    const response: ApiResponse<null> = { success: false, error: message };
    res.status(500).json(response);
  }
});

router.delete('/:id', (req, res) => {
  try {
    const deleted = store.delete(req.params.id);
    if (!deleted) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Record not found',
      };
      res.status(404).json(response);
      return;
    }
    const response: ApiResponse<null> = {
      success: true,
      message: 'Record deleted',
    };
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete record';
    const response: ApiResponse<null> = { success: false, error: message };
    res.status(500).json(response);
  }
});

export default router;

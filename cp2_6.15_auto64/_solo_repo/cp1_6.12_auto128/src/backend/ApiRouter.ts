import express, { Router, Request, Response } from 'express';
import { CombatCalculator } from './CombatCalculator';
import { DataManager } from './DataManager';
import { RuneCombination, SavedConfig } from '../shared/RuneTypes';

export const createApiRouter = (): Router => {
  const router = Router();

  router.post('/calculate', async (req: Request, res: Response) => {
    try {
      const combination = req.body as RuneCombination;
      if (!combination || !Array.isArray(combination.runeIds)) {
        res.status(400).json({ error: 'Invalid request: runeIds array required' });
        return;
      }
      const result = await CombatCalculator.calculate(combination);
      res.json(result);
    } catch (error) {
      console.error('Calculate error:', error);
      res.status(500).json({ error: 'Internal server error during calculation' });
    }
  });

  router.get('/runes', async (_req: Request, res: Response) => {
    try {
      const runes = await DataManager.getAllRunes();
      res.json(runes);
    } catch (error) {
      console.error('Get runes error:', error);
      res.status(500).json({ error: 'Failed to fetch runes' });
    }
  });

  router.get('/rules', async (_req: Request, res: Response) => {
    try {
      const rules = await DataManager.getAllRules();
      res.json(rules);
    } catch (error) {
      console.error('Get rules error:', error);
      res.status(500).json({ error: 'Failed to fetch rules' });
    }
  });

  router.post('/save', async (req: Request, res: Response) => {
    try {
      const { name, runeIds } = req.body as Omit<SavedConfig, '_id' | 'createdAt'>;
      if (!name || !Array.isArray(runeIds)) {
        res.status(400).json({ error: 'Invalid request: name and runeIds required' });
        return;
      }
      if (name.length > 10) {
        res.status(400).json({ error: 'Config name too long (max 10 characters)' });
        return;
      }
      const saved = await DataManager.saveConfig({ name, runeIds });
      res.json(saved);
    } catch (error) {
      console.error('Save config error:', error);
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  });

  router.get('/configs', async (_req: Request, res: Response) => {
    try {
      const configs = await DataManager.getAllConfigs();
      res.json(configs);
    } catch (error) {
      console.error('Get configs error:', error);
      res.status(500).json({ error: 'Failed to fetch configurations' });
    }
  });

  return router;
};

import { Router, Request, Response } from 'express';
import { dataStore } from '../models/DataStore.js';
import type { CreateAssetDto, UpdateAssetDto } from '../../shared/types.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { q, authorId } = req.query;
    const startTime = Date.now();
    
    let assets;
    if (authorId && typeof authorId === 'string') {
      assets = await dataStore.findByAuthor(authorId);
    } else {
      assets = await dataStore.findAll(q as string | undefined);
    }
    
    const duration = Date.now() - startTime;
    console.log(`GET /api/assets - ${assets.length} results in ${duration}ms`);
    
    res.json({
      data: assets,
      total: assets.length,
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asset = await dataStore.findById(id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.json({ data: asset });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const dto = req.body as CreateAssetDto;
    
    if (!dto.name || !dto.category || !dto.modelUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (dto.tags && dto.tags.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 tags allowed' });
    }
    
    const asset = await dataStore.create(dto);
    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dto = req.body as UpdateAssetDto;
    
    if (dto.tags && dto.tags.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 tags allowed' });
    }
    
    const asset = await dataStore.update(id, dto);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.json({ success: true, data: asset });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await dataStore.delete(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

router.post('/:id/favorite', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await dataStore.toggleFavorite(id);
    
    if (!result) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.json({
      success: true,
      favorites: result.favorites,
      isFavorited: result.isFavorited,
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

export default router;

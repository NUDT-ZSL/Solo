import type { Request, Response } from 'express';
import type { CausalNode, CausalEdge } from '../../src/client/types';
import * as networkService from '../services/networkService';

export async function listNetworks(_req: Request, res: Response): Promise<void> {
  try {
    const networks = await networkService.listNetworks();
    res.json({ networks });
  } catch (e) {
    console.error('Failed to list networks:', e);
    res.status(500).json({ error: 'Failed to list networks' });
  }
}

export async function getNetwork(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Network ID is required' });
      return;
    }
    
    const network = await networkService.getNetwork(id);
    if (!network) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }
    
    res.json(network);
  } catch (e) {
    console.error('Failed to get network:', e);
    res.status(500).json({ error: 'Failed to get network' });
  }
}

export async function createNetwork(req: Request, res: Response): Promise<void> {
  try {
    const { name, nodes, edges } = req.body as {
      name: string;
      nodes: CausalNode[];
      edges: CausalEdge[];
    };
    
    if (!name || !Array.isArray(nodes) || !Array.isArray(edges)) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    
    if (name.length > 50) {
      res.status(400).json({ error: 'Network name too long' });
      return;
    }
    
    const network = await networkService.createNetwork(name, nodes, edges);
    res.status(201).json(network);
  } catch (e) {
    console.error('Failed to create network:', e);
    res.status(500).json({ error: 'Failed to create network' });
  }
}

export async function updateNetwork(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, nodes, edges } = req.body as {
      name: string;
      nodes: CausalNode[];
      edges: CausalEdge[];
    };
    
    if (!id) {
      res.status(400).json({ error: 'Network ID is required' });
      return;
    }
    
    if (!name || !Array.isArray(nodes) || !Array.isArray(edges)) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    
    const network = await networkService.updateNetwork(id, name, nodes, edges);
    if (!network) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }
    
    res.json(network);
  } catch (e) {
    console.error('Failed to update network:', e);
    res.status(500).json({ error: 'Failed to update network' });
  }
}

export async function deleteNetwork(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Network ID is required' });
      return;
    }
    
    const success = await networkService.deleteNetwork(id);
    if (!success) {
      res.status(404).json({ error: 'Network not found' });
      return;
    }
    
    res.json({ success: true });
  } catch (e) {
    console.error('Failed to delete network:', e);
    res.status(500).json({ error: 'Failed to delete network' });
  }
}

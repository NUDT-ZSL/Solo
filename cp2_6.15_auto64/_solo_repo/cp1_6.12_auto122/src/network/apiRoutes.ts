import { Router, Request, Response } from 'express';
import Datastore from 'nedb-promises';
import path from 'path';

const router = Router();

const dbPath = path.join(__dirname, '..', 'player.db');
const db = Datastore.create(dbPath);

interface PlayerData {
  _id?: string;
  playerId: string;
  fragments: Record<string, number>;
  characters: any[];
  expCrystals: number;
  safeCellsCleared: number;
  bossLevel: number;
  teamIds: string[];
  createdAt: number;
  updatedAt: number;
}

async function getOrCreatePlayer(playerId: string): Promise<PlayerData> {
  let player = await db.findOne({ playerId }) as PlayerData | null;
  if (!player) {
    player = {
      playerId,
      fragments: {},
      characters: [],
      expCrystals: 0,
      safeCellsCleared: 0,
      bossLevel: 1,
      teamIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const result = await db.insert(player);
    player = result as PlayerData;
  }
  return player;
}

router.get('/player/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const player = await getOrCreatePlayer(id);
    res.json({ success: true, data: player });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load player data' });
  }
});

router.post('/player/:id/save', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const player = await getOrCreatePlayer(id);
    
    const updated = {
      ...player,
      ...data,
      updatedAt: Date.now()
    };
    
    await db.update({ playerId: id }, { $set: updated });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save player data' });
  }
});

router.post('/player/:id/fragment', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { characterId, count = 1 } = req.body;
    const player = await getOrCreatePlayer(id);
    
    const fragments = { ...player.fragments };
    fragments[characterId] = (fragments[characterId] || 0) + count;
    
    const updated = {
      ...player,
      fragments,
      updatedAt: Date.now()
    };
    
    await db.update({ playerId: id }, { $set: updated });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add fragment' });
  }
});

router.post('/player/:id/levelup', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { characterId } = req.body;
    const player = await getOrCreatePlayer(id);
    
    if (player.expCrystals < 1) {
      return res.status(400).json({ success: false, error: 'Not enough exp crystals' });
    }
    
    const characters = player.characters.map((c: any) => {
      if (c.id === characterId) {
        return {
          ...c,
          level: c.level + 1,
          power: c.power + 20
        };
      }
      return c;
    });
    
    const charExists = player.characters.some((c: any) => c.id === characterId);
    if (!charExists) {
      return res.status(404).json({ success: false, error: 'Character not found' });
    }
    
    const updated = {
      ...player,
      characters,
      expCrystals: player.expCrystals - 1,
      updatedAt: Date.now()
    };
    
    await db.update({ playerId: id }, { $set: updated });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to level up character' });
  }
});

router.post('/player/:id/unlock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { character, fragmentsUsed } = req.body;
    const player = await getOrCreatePlayer(id);
    
    const templateId = character.templateId || character.id;
    const currentFragments = player.fragments[templateId] || 0;
    
    if (currentFragments < fragmentsUsed) {
      return res.status(400).json({ success: false, error: 'Not enough fragments' });
    }
    
    const newFragments = { ...player.fragments };
    newFragments[templateId] = currentFragments - fragmentsUsed;
    
    const newCharacters = [...player.characters, character];
    
    const updated = {
      ...player,
      fragments: newFragments,
      characters: newCharacters,
      updatedAt: Date.now()
    };
    
    await db.update({ playerId: id }, { $set: updated });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to unlock character' });
  }
});

router.post('/player/:id/boss/beat', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { bossLevel, rewards } = req.body;
    const player = await getOrCreatePlayer(id);
    
    const updated = {
      ...player,
      bossLevel: Math.max(player.bossLevel, bossLevel + 1),
      expCrystals: player.expCrystals + (rewards?.expCrystals || 0),
      updatedAt: Date.now()
    };
    
    await db.update({ playerId: id }, { $set: updated });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update boss progress' });
  }
});

router.post('/player/:id/team', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamIds } = req.body;
    const player = await getOrCreatePlayer(id);
    
    const updated = {
      ...player,
      teamIds: teamIds || [],
      updatedAt: Date.now()
    };
    
    await db.update({ playerId: id }, { $set: updated });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update team' });
  }
});

export default router;

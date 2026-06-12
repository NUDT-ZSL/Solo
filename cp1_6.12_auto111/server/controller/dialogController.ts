import { Request, Response } from 'express';
import { dialogModel, historyModel } from '../model/dialogModel.ts';

export const dialogController = {
  async getDialogsByPanel(req: Request, res: Response) {
    try {
      const { panelId } = req.params;
      const dialogs = await dialogModel.findByPanelId(panelId);
      res.json(dialogs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dialogs' });
    }
  },

  async createDialog(req: Request, res: Response) {
    try {
      const { panelId, text, character, characterColor, x, y, width, height } = req.body;
      const dialog = await dialogModel.create({
        panelId,
        text: text || '',
        character: character || '未分配',
        characterColor: characterColor || '#999999',
        x,
        y,
        width,
        height
      });
      res.status(201).json(dialog);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create dialog' });
    }
  },

  async updateDialog(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { text, character, characterColor, x, y, width, height, modifiedBy } = req.body;
      const updates: any = {};
      if (text !== undefined) updates.text = text;
      if (character !== undefined) updates.character = character;
      if (characterColor !== undefined) updates.characterColor = characterColor;
      if (x !== undefined) updates.x = x;
      if (y !== undefined) updates.y = y;
      if (width !== undefined) updates.width = width;
      if (height !== undefined) updates.height = height;

      const updated = await dialogModel.update(id, updates, modifiedBy || '匿名用户');
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update dialog' });
    }
  },

  async deleteDialog(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await dialogModel.remove(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete dialog' });
    }
  }
};

export const historyController = {
  async getHistoryByPanel(req: Request, res: Response) {
    try {
      const { panelId } = req.params;
      const history = await historyModel.findByPanelId(panelId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  },

  async getHistoryByDialog(req: Request, res: Response) {
    try {
      const { dialogId } = req.params;
      const history = await historyModel.findByDialogId(dialogId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  }
};

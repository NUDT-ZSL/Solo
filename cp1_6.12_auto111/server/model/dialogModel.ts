import { dialogDB, historyDB } from '../db.ts';

export interface Dialog {
  _id?: string;
  panelId: string;
  text: string;
  character: string;
  characterColor: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface HistoryRecord {
  _id?: string;
  dialogId: string;
  panelId: string;
  oldText: string;
  newText: string;
  oldCharacter: string;
  newCharacter: string;
  modifiedBy: string;
  modifiedAt: string;
}

export const dialogModel = {
  async findByPanelId(panelId: string): Promise<Dialog[]> {
    return dialogDB.find({ panelId }).sort({ createdAt: 1 });
  },

  async create(dialog: Dialog): Promise<Dialog> {
    const now = new Date().toISOString();
    const newDialog = {
      ...dialog,
      createdAt: now,
      updatedAt: now
    };
    return dialogDB.insert(newDialog);
  },

  async update(id: string, updates: Partial<Dialog>, modifiedBy: string): Promise<Dialog> {
    const existing = await dialogDB.findOne({ _id: id });
    if (!existing) {
      throw new Error('Dialog not found');
    }

    const now = new Date().toISOString();
    const updatedDialog = {
      ...existing,
      ...updates,
      updatedAt: now,
      updatedBy: modifiedBy
    };

    if (updates.text !== undefined && updates.text !== existing.text) {
      await historyDB.insert({
        dialogId: id,
        panelId: existing.panelId,
        oldText: existing.text,
        newText: updates.text,
        oldCharacter: existing.character,
        newCharacter: updates.character || existing.character,
        modifiedBy,
        modifiedAt: now
      });
    }

    if (updates.character !== undefined && updates.character !== existing.character) {
      await historyDB.insert({
        dialogId: id,
        panelId: existing.panelId,
        oldText: existing.text,
        newText: updates.text || existing.text,
        oldCharacter: existing.character,
        newCharacter: updates.character,
        modifiedBy,
        modifiedAt: now
      });
    }

    await dialogDB.update({ _id: id }, { $set: updatedDialog });
    return updatedDialog;
  },

  async remove(id: string): Promise<void> {
    await dialogDB.remove({ _id: id });
    await historyDB.remove({ dialogId: id }, { multi: true });
  }
};

export const historyModel = {
  async findByPanelId(panelId: string): Promise<HistoryRecord[]> {
    return historyDB.find({ panelId }).sort({ modifiedAt: -1 });
  },

  async findByDialogId(dialogId: string): Promise<HistoryRecord[]> {
    return historyDB.find({ dialogId }).sort({ modifiedAt: -1 });
  }
};

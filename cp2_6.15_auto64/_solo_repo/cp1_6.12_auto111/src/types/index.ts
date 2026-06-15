export interface Dialog {
  _id: string;
  panelId: string;
  text: string;
  character: string;
  characterColor: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface HistoryRecord {
  _id: string;
  dialogId: string;
  panelId: string;
  oldText: string;
  newText: string;
  oldCharacter: string;
  newCharacter: string;
  modifiedBy: string;
  modifiedAt: string;
}

export interface Character {
  name: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
}

export interface Panel {
  id: string;
  row: number;
  col: number;
}

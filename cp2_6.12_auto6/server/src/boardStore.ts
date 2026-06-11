import { v4 as uuidv4 } from 'uuid';

export type Priority = 'high' | 'medium' | 'low';
export type CardStatus = 'todo' | 'in-progress' | 'done';

export interface Card {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: CardStatus;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  creatorColor: string;
  order: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
}

class BoardStore {
  private cards: Map<string, Card> = new Map();

  private userColors = [
    '#ef5350', '#ec407a', '#ab47bc', '#7e57c2', '#5c6bc0',
    '#42a5f5', '#26c6da', '#26a69a', '#66bb6a', '#9ccc65',
    '#ffa726', '#ff7043', '#8d6e63', '#78909c', '#4fc3f7',
  ];

  private userNames = [
    '小明', '小红', '小华', '小李', '小张', '小王', '小陈',
    '小刘', '小周', '小吴', '小郑', '小孙', '小林', '小黄',
  ];

  private assignedNames = new Set<string>();

  getAll(): Card[] {
    return Array.from(this.cards.values()).sort((a, b) => {
      const statusOrder = { 'todo': 0, 'in-progress': 1, 'done': 2 } as const;
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.order - b.order;
    });
  }

  getById(id: string): Card | undefined {
    return this.cards.get(id);
  }

  addCard(data: {
    title: string;
    description: string;
    priority: Priority;
    status: CardStatus;
    createdBy: string;
    creatorColor: string;
  }): Card {
    const id = uuidv4();
    const now = Date.now();

    const statusCards = Array.from(this.cards.values())
      .filter((c) => c.status === data.status)
      .sort((a, b) => a.order - b.order);

    const order = statusCards.length > 0
      ? statusCards[statusCards.length - 1].order + 1
      : 0;

    const card: Card = {
      id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
      creatorColor: data.creatorColor,
      order,
    };

    this.cards.set(id, card);
    return card;
  }

  updateCard(id: string, updates: Partial<Omit<Card, 'id' | 'createdAt'>>): Card | undefined {
    const card = this.cards.get(id);
    if (!card) return undefined;

    const updated: Card = {
      ...card,
      ...updates,
      updatedAt: Date.now(),
    };

    this.cards.set(id, updated);
    return updated;
  }

  deleteCard(id: string): boolean {
    const card = this.cards.get(id);
    if (!card) return false;

    this.cards.delete(id);

    const sameStatusCards = Array.from(this.cards.values())
      .filter((c) => c.status === card.status)
      .sort((a, b) => a.order - b.order);

    sameStatusCards.forEach((c, idx) => {
      if (c.order !== idx) {
        c.order = idx;
        c.updatedAt = Date.now();
        this.cards.set(c.id, c);
      }
    });

    return true;
  }

  moveCard(
    id: string,
    newStatus: CardStatus,
    newOrder: number
  ): { card: Card; updatedCards: Card[] } | undefined {
    const card = this.cards.get(id);
    if (!card) return undefined;

    const oldStatus = card.status;
    const now = Date.now();
    const updatedCards: Card[] = [];

    card.status = newStatus;
    card.updatedAt = now;

    if (oldStatus !== newStatus) {
      const oldStatusCards = Array.from(this.cards.values())
        .filter((c) => c.status === oldStatus && c.id !== id)
        .sort((a, b) => a.order - b.order);

      oldStatusCards.forEach((c, idx) => {
        if (c.order !== idx) {
          c.order = idx;
          c.updatedAt = now;
          this.cards.set(c.id, c);
          updatedCards.push(c);
        }
      });
    }

    const newStatusCards = Array.from(this.cards.values())
      .filter((c) => c.status === newStatus && c.id !== id)
      .sort((a, b) => a.order - b.order);

    const insertIndex = Math.min(
      Math.max(0, newOrder),
      newStatusCards.length
    );

    newStatusCards.splice(insertIndex, 0, card);

    newStatusCards.forEach((c, idx) => {
      if (c.order !== idx) {
        c.order = idx;
        c.updatedAt = now;
        this.cards.set(c.id, c);
        if (c.id !== id) {
          updatedCards.push(c);
        }
      }
    });

    const finalCard = this.cards.get(id);
    if (!finalCard) return undefined;

    return {
      card: finalCard,
      updatedCards: [finalCard, ...updatedCards],
    };
  }

  generateUser(socketId: string): User {
    let name: string;
    let attempts = 0;
    do {
      const baseName = this.userNames[Math.floor(Math.random() * this.userNames.length)];
      if (attempts === 0 && !this.assignedNames.has(baseName)) {
        name = baseName;
      } else {
        name = `${baseName}${Math.floor(Math.random() * 100)}`;
      }
      attempts++;
    } while (this.assignedNames.has(name) && attempts < 100);

    this.assignedNames.add(name);

    const color = this.userColors[Math.floor(Math.random() * this.userColors.length)];

    return {
      id: socketId,
      name,
      color,
    };
  }

  releaseUserName(name: string): void {
    this.assignedNames.delete(name);
  }
}

export const boardStore = new BoardStore();

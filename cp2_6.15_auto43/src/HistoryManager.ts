export interface Sticker {
  id: string;
  type: string;
  x: number;
  y: number;
}

export interface EmojiParams {
  mouth: number;
  eyes: number;
  stickers: Sticker[];
}

export interface EmojiHistory {
  id: string;
  imageData: string;
  emotion: string;
  createdAt: string;
  params: EmojiParams;
}

class HistoryManager {
  private readonly baseUrl = '/api/history';

  async getHistory(): Promise<EmojiHistory[]> {
    const response = await fetch(this.baseUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.statusText}`);
    }

    return response.json();
  }

  async saveHistory(
    data: Omit<EmojiHistory, 'id' | 'createdAt'>
  ): Promise<{ id: string }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to save history: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteHistory(id: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete history: ${response.statusText}`);
    }

    return response.json();
  }
}

export const historyManager = new HistoryManager();

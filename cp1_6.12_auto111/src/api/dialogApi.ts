import type { Dialog, HistoryRecord } from '../types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const dialogApi = {
  getDialogsByPanel(panelId: string): Promise<Dialog[]> {
    return request<Dialog[]>(`/dialogs/${panelId}`);
  },

  createDialog(dialog: Partial<Dialog>): Promise<Dialog> {
    return request<Dialog>('/dialogs', {
      method: 'POST',
      body: JSON.stringify(dialog)
    });
  },

  updateDialog(id: string, updates: Partial<Dialog> & { modifiedBy?: string }): Promise<Dialog> {
    return request<Dialog>(`/dialogs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  deleteDialog(id: string): Promise<void> {
    return request<void>(`/dialogs/${id}`, {
      method: 'DELETE'
    });
  }
};

export const historyApi = {
  getHistoryByPanel(panelId: string): Promise<HistoryRecord[]> {
    return request<HistoryRecord[]>(`/history/panel/${panelId}`);
  },

  getHistoryByDialog(dialogId: string): Promise<HistoryRecord[]> {
    return request<HistoryRecord[]>(`/history/dialog/${dialogId}`);
  }
};

import type {
  GenerateCardRequest,
  GenerateCardResponse,
  GetCardResponse,
  GetCardsResponse,
  DeleteCardResponse,
} from '@/types';

const API_BASE = '/api';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function generateCard(
  data: GenerateCardRequest
): Promise<GenerateCardResponse> {
  return request<GenerateCardResponse>('/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCard(id: string): Promise<GetCardResponse> {
  return request<GetCardResponse>(`/card/${id}`, {
    method: 'GET',
  });
}

export async function getCards(): Promise<GetCardsResponse> {
  return request<GetCardsResponse>('/cards', {
    method: 'GET',
  });
}

export async function deleteCard(id: string): Promise<DeleteCardResponse> {
  return request<DeleteCardResponse>(`/card/${id}`, {
    method: 'DELETE',
  });
}

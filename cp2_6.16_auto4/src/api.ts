import type { Book, DriftRecord, Application, CreateBookRequest, ApplyDriftRequest } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.statusText}`);
  }

  return response.json();
}

export function getBooks(search?: string, sortBy?: string): Promise<Book[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (sortBy) params.set('sortBy', sortBy);

  const query = params.toString() ? `?${params.toString()}` : '';
  return request<Book[]>(`/books${query}`);
}

export function getBookById(id: string): Promise<Book> {
  return request<Book>(`/books/${id}`);
}

export function createBook(data: CreateBookRequest): Promise<Book> {
  return request<Book>('/books', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateBook(id: string, data: Partial<Book>): Promise<Book> {
  return request<Book>(`/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteBook(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/books/${id}`, {
    method: 'DELETE',
  });
}

export function getDriftRecords(bookId: string): Promise<DriftRecord[]> {
  return request<DriftRecord[]>(`/books/${bookId}/drift-records`);
}

export function applyDrift(bookId: string, data: ApplyDriftRequest): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(`/books/${bookId}/apply`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getPublisherBooks(publisherId: string): Promise<Book[]> {
  return request<Book[]>(`/books/publisher/${publisherId}`);
}

export function getUserApplications(applicantId: string): Promise<Application[]> {
  return request<Application[]>(`/applications/${applicantId}`);
}

export function updateBookStatus(id: string, status: string): Promise<Book> {
  return request<Book>(`/books/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

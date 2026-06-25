import { Book, BorrowRecord, FineStats, Reader } from './types';

const BASE_URL = '/api';

export async function getBooks(): Promise<Book[]> {
  const response = await fetch(`${BASE_URL}/books`);
  if (!response.ok) throw new Error('获取书籍列表失败');
  return response.json();
}

export async function borrowBook(bookId: string, reader: Reader): Promise<BorrowRecord> {
  const response = await fetch(`${BASE_URL}/borrow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId, reader })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '借阅失败');
  }
  return response.json();
}

export async function returnBook(recordId: string): Promise<{ record: BorrowRecord; fine: number }> {
  const response = await fetch(`${BASE_URL}/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordId })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '归还失败');
  }
  return response.json();
}

export async function getFineStats(): Promise<FineStats> {
  const response = await fetch(`${BASE_URL}/stats`);
  if (!response.ok) throw new Error('获取统计数据失败');
  return response.json();
}

export async function getBorrowHistory(readerId: string): Promise<BorrowRecord[]> {
  const response = await fetch(`${BASE_URL}/history?readerId=${encodeURIComponent(readerId)}`);
  if (!response.ok) throw new Error('获取借阅历史失败');
  return response.json();
}

export async function getReaders(): Promise<Reader[]> {
  const response = await fetch(`${BASE_URL}/readers`);
  if (!response.ok) throw new Error('获取读者列表失败');
  return response.json();
}

export async function searchRecords(query: string): Promise<BorrowRecord[]> {
  const response = await fetch(`${BASE_URL}/records/search?query=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('搜索借阅记录失败');
  return response.json();
}

export async function resetData(): Promise<void> {
  const response = await fetch(`${BASE_URL}/reset`, { method: 'POST' });
  if (!response.ok) throw new Error('重置数据失败');
}

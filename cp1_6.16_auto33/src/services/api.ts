import { Book, Member, BorrowRecord, BookDetail } from '../types';

const API_BASE = '/api';

export async function fetchBooks(): Promise<Book[]> {
  const res = await fetch(`${API_BASE}/books`);
  return res.json();
}

export async function fetchMembers(): Promise<Member[]> {
  const res = await fetch(`${API_BASE}/members`);
  return res.json();
}

export async function fetchBorrowRecords(): Promise<BorrowRecord[]> {
  const res = await fetch(`${API_BASE}/borrowRecords`);
  return res.json();
}

export async function borrowBook(bookId: string, memberId: string) {
  const res = await fetch(`${API_BASE}/borrow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId, memberId }),
  });
  return res.json();
}

export async function returnBook(recordId: string) {
  const res = await fetch(`${API_BASE}/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordId }),
  });
  return res.json();
}

export async function registerMember(name: string, phone: string) {
  const res = await fetch(`${API_BASE}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone }),
  });
  return res.json();
}

export async function fetchBookDetail(id: string): Promise<BookDetail> {
  const res = await fetch(`${API_BASE}/books/${id}`);
  return res.json();
}

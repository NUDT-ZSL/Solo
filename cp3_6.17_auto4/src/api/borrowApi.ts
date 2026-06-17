import { Device, User, BorrowRecord } from '@/types'

const API_BASE = '/api'

export async function getDevices(): Promise<Device[]> {
  const res = await fetch(`${API_BASE}/devices`)
  if (!res.ok) throw new Error('Failed to fetch devices')
  return res.json()
}

export async function getDeviceById(id: string): Promise<Device> {
  const res = await fetch(`${API_BASE}/devices/${id}`)
  if (!res.ok) throw new Error('Failed to fetch device')
  return res.json()
}

export async function getUserById(id: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${id}`)
  if (!res.ok) throw new Error('Failed to fetch user')
  return res.json()
}

export async function getRecords(): Promise<BorrowRecord[]> {
  const res = await fetch(`${API_BASE}/records`)
  if (!res.ok) throw new Error('Failed to fetch records')
  return res.json()
}

export async function submitBorrow(deviceId: string, userId: string): Promise<BorrowRecord> {
  const res = await fetch(`${API_BASE}/borrow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, userId }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to borrow')
  }
  return res.json()
}

export async function confirmReturn(recordId: string): Promise<{ record: BorrowRecord; user: User }> {
  const res = await fetch(`${API_BASE}/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordId }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to return')
  }
  return res.json()
}

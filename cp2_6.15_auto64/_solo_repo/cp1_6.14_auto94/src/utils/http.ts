const API_BASE = 'http://localhost:3001'

export async function fetchPlants<T>(): Promise<T> {
  const res = await fetch(`${API_BASE}/api/plants`)
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`)
  }
  return res.json()
}

import { Artist, Artwork, Purchase } from './types'

const BASE = '/api'

export async function fetchArtworks(): Promise<Artwork[]> {
  const res = await fetch(`${BASE}/artworks`)
  return res.json()
}

export async function fetchArtwork(id: string): Promise<Artwork> {
  const res = await fetch(`${BASE}/artworks/${id}`)
  return res.json()
}

export async function createArtwork(data: Partial<Artwork>): Promise<Artwork> {
  const res = await fetch(`${BASE}/artworks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateArtwork(id: string, data: Partial<Artwork>): Promise<Artwork> {
  const res = await fetch(`${BASE}/artworks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteArtwork(id: string): Promise<void> {
  await fetch(`${BASE}/artworks/${id}`, { method: 'DELETE' })
}

export async function toggleFavorite(id: string, increment: boolean): Promise<Artwork> {
  const res = await fetch(`${BASE}/artworks/${id}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ increment }),
  })
  return res.json()
}

export async function fetchArtists(): Promise<Artist[]> {
  const res = await fetch(`${BASE}/artists`)
  return res.json()
}

export async function fetchArtist(id: string): Promise<Artist> {
  const res = await fetch(`${BASE}/artists/${id}`)
  return res.json()
}

export async function createArtist(data: Partial<Artist>): Promise<Artist> {
  const res = await fetch(`${BASE}/artists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function fetchPurchases(): Promise<Purchase[]> {
  const res = await fetch(`${BASE}/purchases`)
  return res.json()
}

export async function createPurchase(artworkId: string, buyerId: string): Promise<Purchase> {
  const res = await fetch(`${BASE}/purchases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ artworkId, buyerId }),
  })
  return res.json()
}

export async function fetchArtistRankings(): Promise<Artist[]> {
  const res = await fetch(`${BASE}/rankings/artists`)
  return res.json()
}

export async function fetchArtworkRankings(): Promise<Artwork[]> {
  const res = await fetch(`${BASE}/rankings/artworks`)
  return res.json()
}

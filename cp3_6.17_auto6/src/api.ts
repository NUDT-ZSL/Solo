import type { Video, Marker, TimelineExport } from './types'

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? '请求失败')
  }
  return data as T
}

export async function fetchVideos(): Promise<Video[]> {
  const data = await parse<{ videos: Video[] }>(await fetch('/api/videos'))
  return data.videos
}

export async function uploadVideo(file: File): Promise<Video> {
  const form = new FormData()
  form.append('file', file)
  const data = await parse<{ video: Video }>(
    await fetch('/api/upload', { method: 'POST', body: form }),
  )
  return data.video
}

export async function updateVideo(
  id: string,
  payload: { duration?: number; thumbnail?: string },
): Promise<Video> {
  const data = await parse<{ video: Video }>(
    await fetch(`/api/videos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
  return data.video
}

export async function deleteVideo(id: string): Promise<void> {
  await fetch(`/api/videos/${id}`, { method: 'DELETE' })
}

export async function fetchMarkers(): Promise<Marker[]> {
  const data = await parse<{ markers: Marker[] }>(await fetch('/api/markers'))
  return data.markers
}

export async function createMarker(
  videoId: string,
  time: number,
  label: string,
  labelColor: string,
): Promise<Marker> {
  const data = await parse<{ marker: Marker }>(
    await fetch('/api/markers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, time, label, labelColor }),
    }),
  )
  return data.marker
}

export async function updateMarker(
  id: string,
  payload: { time?: number; label?: string; labelColor?: string; sortOrder?: number },
): Promise<Marker> {
  const data = await parse<{ marker: Marker }>(
    await fetch(`/api/markers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
  return data.marker
}

export async function deleteMarker(id: string): Promise<void> {
  await fetch(`/api/markers/${id}`, { method: 'DELETE' })
}

export async function exportTimeline(markerIds: string[]): Promise<TimelineExport> {
  const data = await parse<{ timeline: TimelineExport }>(
    await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markerIds }),
    }),
  )
  return data.timeline
}

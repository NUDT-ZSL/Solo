export interface Idea {
  id: string
  content: string
  note: string
  tags: string[]
  createdAt: string
}

export interface ClusterInfo {
  id: string
  label: string
  ideaIds: string[]
}

export interface LinkInfo {
  source: string
  target: string
  strength: number
}

export interface ClusterResult {
  clusters: ClusterInfo[]
  links: LinkInfo[]
}

const API_BASE = '/api'

export async function postIdea(content: string): Promise<Idea> {
  const res = await fetch(`${API_BASE}/ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error('提交失败')
  const data = await res.json()
  return data.idea
}

export async function getIdeas(): Promise<Idea[]> {
  const res = await fetch(`${API_BASE}/ideas`)
  if (!res.ok) throw new Error('获取失败')
  const data = await res.json()
  return data.ideas
}

export async function clusterIdeas(): Promise<ClusterResult> {
  const res = await fetch(`${API_BASE}/cluster`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('聚类失败')
  const data = await res.json()
  return data
}

export async function updateIdeaNote(
  id: string,
  note: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/ideas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  })
  if (!res.ok) throw new Error('更新失败')
}

export async function updateIdeaContent(
  id: string,
  content: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/ideas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error('更新失败')
}

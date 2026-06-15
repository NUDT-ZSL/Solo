import { useState, useEffect, useCallback, useRef } from 'react'
import type { Tag } from './types'
import Scene from './Scene'
import Toolbar from './Toolbar'
import { MAX_TEXT_LENGTH } from './constants'

function App() {
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [votingTagId, setVotingTagId] = useState<string | null>(null)
  const [showVotes, setShowVotes] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data: Tag[]) => setTags(data))
      .catch(console.error)

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${proto}//${window.location.host}/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'tags') {
          setTags(msg.data)
        } else if (msg.type === 'add') {
          setTags((prev) => {
            if (prev.find((t) => t.id === msg.data.id)) return prev
            return [...prev, msg.data]
          })
        } else if (msg.type === 'delete') {
          setTags((prev) => prev.filter((t) => t.id !== msg.data))
        } else if (msg.type === 'vote') {
          setTags((prev) =>
            prev.map((t) => (t.id === msg.data.id ? { ...t, votes: msg.data.votes } : t))
          )
        } else if (msg.type === 'clear') {
          setTags([])
        }
      } catch (e) {
        console.error('WS parse error', e)
      }
    }

    return () => {
      ws.close()
    }
  }, [])

  const addTag = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) return
    try {
      await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
    } catch (e) {
      console.error(e)
    }
  }, [])

  const clearAll = useCallback(async () => {
    try {
      await fetch('/api/tags', { method: 'DELETE' })
    } catch (e) {
      console.error(e)
    }
  }, [])

  const voteTag = useCallback(async (id: string) => {
    try {
      await fetch(`/api/tags/${id}/vote`, { method: 'PUT' })
    } catch (e) {
      console.error(e)
    }
  }, [])

  const handleTagClick = useCallback((id: string) => {
    setSelectedTagId((prev) => (prev === id ? null : id))
    setVotingTagId(null)
  }, [])

  const handleTagDoubleClick = useCallback((id: string) => {
    setVotingTagId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Scene
        tags={tags}
        selectedTagId={selectedTagId}
        showVotes={showVotes}
        onTagClick={handleTagClick}
        onTagDoubleClick={handleTagDoubleClick}
      />
      <Toolbar
        onAddTag={addTag}
        onClearAll={clearAll}
        showVotes={showVotes}
        onToggleVotes={() => setShowVotes((v) => !v)}
        votingTag={votingTagId ? tags.find((t) => t.id === votingTagId) ?? null : null}
        onVote={voteTag}
        onCloseVotePanel={() => setVotingTagId(null)}
      />
    </div>
  )
}

export default App

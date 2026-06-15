import { useState, useEffect, useMemo } from 'react'
import { Artwork, Artist, User, PageView } from '../types'
import { fetchArtist, createArtwork, updateArtwork, deleteArtwork } from '../api'
import ArtCard from '../components/ArtCard'
import StatsPanel from '../components/StatsPanel'
import LazyImage from '../components/LazyImage'

interface ArtistPageProps {
  artistId: string | null
  artworks: Artwork[]
  artists: Artist[]
  user: User | null
  onNavigate: (page: PageView, params?: any) => void
  onArtworkUpdated: () => void
}

export default function ArtistPage({ artistId, artworks, artists, user, onNavigate, onArtworkUpdated }: ArtistPageProps) {
  const [artist, setArtist] = useState<Artist | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', category: '油画', year: 2024, price: 0, image: '' })

  const isOwner = user?.type === 'artist' && user?.id === artistId

  const artistArtworks = useMemo(() =>
    artworks.filter(a => a.artistId === artistId),
    [artworks, artistId]
  )

  useEffect(() => {
    if (!artistId) return
    fetchArtist(artistId).then(setArtist).catch(() => {
      const found = artists.find(a => a.id === artistId)
      if (found) setArtist(found)
    })
  }, [artistId, artists])

  const handleUpload = async () => {
    if (!artistId || !form.title) return
    await createArtwork({ ...form, artistId })
    setShowUpload(false)
    setForm({ title: '', description: '', category: '油画', year: 2024, price: 0, image: '' })
    onArtworkUpdated()
  }

  const handleEdit = (id: string) => {
    const aw = artworks.find(a => a.id === id)
    if (!aw) return
    setEditId(id)
    setForm({
      title: aw.title, description: aw.description,
      category: aw.category, year: aw.year, price: aw.price, image: aw.image,
    })
    setShowUpload(true)
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    await updateArtwork(editId, form)
    setEditId(null)
    setShowUpload(false)
    setForm({ title: '', description: '', category: '油画', year: 2024, price: 0, image: '' })
    onArtworkUpdated()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此作品？')) return
    await deleteArtwork(id)
    onArtworkUpdated()
  }

  if (!artist) return <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>加载中...</div>

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
      <div style={{
        height: 200, borderRadius: '0 0 16px 16px', overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e3a5f, #f59e0b, #9333ea)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', bottom: -40, left: 32,
          display: 'flex', alignItems: 'flex-end', gap: 16,
        }}>
          <img
            src={artist.avatar}
            alt={artist.name}
            style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '4px solid #111827' }}
          />
          <div style={{ paddingBottom: 8 }}>
            <h1 style={{ fontSize: 24, color: '#fff', fontWeight: 700 }}>{artist.name}</h1>
            <p style={{ fontSize: 14, color: '#9ca3af' }}>{artist.bio}</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, color: '#fff' }}>作品集 ({artistArtworks.length})</h2>
        {isOwner && (
          <button
            onClick={() => { setShowUpload(true); setEditId(null); setForm({ title: '', description: '', category: '油画', year: 2024, price: 0, image: '' }) }}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #eab308)',
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}
          >
            + 上传作品
          </button>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {artistArtworks.map(aw => (
          <ArtCard
            key={aw.id}
            artwork={aw}
            isFavorited={false}
            onToggleFavorite={() => {}}
            onClick={id => onNavigate('artwork-detail', { artworkId: id })}
            showActions={isOwner}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {artistArtworks.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>暂无作品</div>
      )}

      {isOwner && (artist as any).stats && (
        <StatsPanel
          totalWorks={(artist as any).stats.totalWorks}
          totalFavorites={(artist as any).stats.totalFavorites}
          totalRevenue={(artist as any).stats.totalRevenue}
        />
      )}

      {showUpload && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setShowUpload(false)}
        >
          <div
            style={{ width: 480, background: '#1e293b', borderRadius: 16, padding: 32, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 20, color: '#fff', marginBottom: 24 }}>{editId ? '编辑作品' : '上传新作品'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input placeholder="作品标题" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                style={{ padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14 }} />
              <textarea placeholder="作品描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, minHeight: 80, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 12 }}>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  style={{ flex: 1, padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14 }}>
                  {['油画', '水彩', '数字艺术', '雕塑'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" placeholder="年份" value={form.year} onChange={e => setForm({ ...form, year: +e.target.value })}
                  style={{ width: 100, padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14 }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <input type="number" placeholder="价格" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })}
                  style={{ flex: 1, padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14 }} />
              </div>
              <input placeholder="图片链接" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })}
                style={{ padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14 }} />
              {form.image && (
                <LazyImage src={form.image} alt="preview" style={{ width: '100%', height: 160, borderRadius: 8 }} />
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button onClick={() => setShowUpload(false)}
                  style={{ flex: 1, height: 44, borderRadius: 8, border: '1px solid #4b5563', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>
                  取消
                </button>
                <button onClick={editId ? handleSaveEdit : handleUpload}
                  style={{ flex: 1, height: 44, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #eab308)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {editId ? '保存' : '上传'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

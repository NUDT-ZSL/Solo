import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Star, Eye, ArrowRight } from 'lucide-react'
import { api, Artwork } from '../api'

export default function ArtistPage() {
  const navigate = useNavigate()
  const [artists, setArtists] = useState<string[]>([])
  const [selected, setSelected] = useState<string>('')
  const [works, setWorks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)

  const loadArtists = useCallback(async () => {
    try {
      const list = await api.getArtists()
      setArtists(list)
      if (list.length > 0 && !selected) {
        setSelected(list[0])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selected])

  const loadWorks = useCallback(async (name: string) => {
    if (!name) return
    try {
      const list = await api.getArtistWorks(name)
      setWorks(list)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    loadArtists()
  }, [loadArtists])

  useEffect(() => {
    if (selected) loadWorks(selected)
  }, [selected, loadWorks])

  if (loading) {
    return <div className="page-container"><div className="loading-state">加载中...</div></div>
  }

  return (
    <div className="page-container">
      <div className="artist-selector">
        <label>选择艺术家：</label>
        <select
          className="form-select"
          style={{ minWidth: 180 }}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {artists.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        {selected && (
          <span style={{ fontSize: 13, color: '#757575' }}>
            共 {works.length} 件作品
          </span>
        )}
      </div>

      {works.length === 0 ? (
        <div className="empty-state" style={{ background: '#fff', borderRadius: 16 }}>
          该艺术家暂无作品
        </div>
      ) : (
        <>
          <div className="artist-sort-hint">
            按浏览量降序排列
          </div>
          <div className="artist-list">
            <div className="artist-list-header">
              <span>排名</span>
              <span>封面</span>
              <span>作品标题</span>
              <span style={{ textAlign: 'center' }}><Eye size={14} /></span>
              <span style={{ textAlign: 'center' }}><Heart size={14} /></span>
              <span style={{ textAlign: 'center' }}><Star size={14} /></span>
              <span style={{ textAlign: 'center' }}>操作</span>
            </div>
            {works.map((w, idx) => (
              <div className="artist-list-row" key={w.id}>
                <span>
                  <span className={'rank-badge ' + (idx < 3 ? 'gold' : 'gray')}>
                    {idx + 1}
                  </span>
                </span>
                <img src={w.coverImage} alt={w.title} className="thumb-img" />
                <span style={{ fontWeight: 500, color: '#424242' }}>{w.title}</span>
                <span className="stat-num" style={{ textAlign: 'center' }}>{w.views}</span>
                <span className="stat-num likes" style={{ textAlign: 'center' }}>{w.likes}</span>
                <span className="stat-num favs" style={{ textAlign: 'center' }}>{w.favorites}</span>
                <span style={{ textAlign: 'center' }}>
                  <button
                    className="artist-view-btn"
                    onClick={() => navigate(`/artwork/${w.id}`)}
                    title="查看作品详情"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      详情
                      <ArrowRight size={12} />
                    </span>
                  </button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

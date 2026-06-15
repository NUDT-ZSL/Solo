import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, Eye, EyeOff, CheckSquare, Square, Bookmark } from 'lucide-react';
import type { SoundMarker, Favorite } from '../../shared/types';
import { EMOTION_LABELS, EMOTION_COLORS } from '../../shared/types';

interface ProfilePageProps {
  userId: string;
  onBack: () => void;
}

export default function ProfilePage({ userId, onBack }: ProfilePageProps) {
  const [tab, setTab] = useState<'markers' | 'favorites'>('markers');
  const [markers, setMarkers] = useState<SoundMarker[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const pageSize = 10;

  useEffect(() => {
    if (tab === 'markers') {
      fetch(`/api/users/${userId}/markers?page=${page}`)
        .then((r) => r.json())
        .then((data) => {
          setMarkers(data.markers || []);
          setTotal(data.total || 0);
        })
        .catch(() => {});
    } else {
      fetch(`/api/favorites?page=${page}`)
        .then((r) => r.json())
        .then((data) => {
          setFavorites(data.favorites || []);
          setTotal(data.total || 0);
        })
        .catch(() => {});
    }
  }, [tab, page, userId]);

  const toggleVisibility = useCallback(async (id: string, isPublic: boolean) => {
    await fetch(`/api/markers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: !isPublic }),
    });
    setMarkers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isPublic: !isPublic } : m))
    );
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === markers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(markers.map((m) => m.id)));
    }
  }, [markers, selectedIds]);

  const exportJson = useCallback(() => {
    const toExport = markers.filter((m) => selectedIds.has(m.id));
    const blob = new Blob([JSON.stringify(toExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soundscape-markers.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [markers, selectedIds]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-earth-warm font-body">
      <div className="bg-earth-brown text-white px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="hover:text-earth-wheat transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-lg font-semibold">个人主页</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setTab('markers'); setPage(1); setSelectedIds(new Set()); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === 'markers'
                ? 'bg-earth-wheat text-earth-brown'
                : 'bg-earth-warm/60 text-earth-brown/60 hover:bg-earth-warm'
            }`}
          >
            旅行日志
          </button>
          <button
            onClick={() => { setTab('favorites'); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === 'favorites'
                ? 'bg-earth-wheat text-earth-brown'
                : 'bg-earth-warm/60 text-earth-brown/60 hover:bg-earth-warm'
            }`}
          >
            <Bookmark size={14} />
            收藏夹
          </button>
        </div>

        {tab === 'markers' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={selectAll}
                className="flex items-center gap-1.5 text-sm text-earth-brown/60 hover:text-earth-brown"
              >
                {selectedIds.size === markers.length ? (
                  <CheckSquare size={16} />
                ) : (
                  <Square size={16} />
                )}
                {selectedIds.size === markers.length ? '取消全选' : '全选'}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={exportJson}
                  className="flex items-center gap-1.5 text-sm bg-earth-wheat text-earth-brown px-3 py-1.5 rounded-lg hover:bg-earth-wheatHover transition-colors"
                >
                  <Download size={14} />
                  导出JSON
                </button>
              )}
            </div>
            <div className="space-y-3">
              {markers.map((m) => (
                <div
                  key={m.id}
                  className="bg-earth-cream rounded-map shadow-sm p-3 flex gap-3"
                >
                  <button
                    onClick={() => toggleSelect(m.id)}
                    className="mt-1 text-earth-brown/40 hover:text-earth-brown"
                  >
                    {selectedIds.has(m.id) ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                  {m.imageUrl && (
                    <img
                      src={m.imageUrl}
                      alt={m.title}
                      className="w-16 h-16 object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-earth-brown truncate">
                        {m.title}
                      </h4>
                      <button
                        onClick={() => toggleVisibility(m.id, m.isPublic)}
                        className="text-earth-brown/40 hover:text-earth-brown"
                      >
                        {m.isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                    <div className="text-xs text-earth-brown/50 mt-1 flex items-center gap-2">
                      <span>{new Date(m.createdAt).toLocaleDateString('zh-CN')}</span>
                      <span>{m.playCount}次播放</span>
                      <span>{m.likes}赞</span>
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: EMOTION_COLORS[m.emotionTag] }}
                      />
                      <span>{EMOTION_LABELS[m.emotionTag]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'favorites' && (
          <div className="space-y-3">
            {favorites.map((f) => (
              <div
                key={f.id}
                className="bg-earth-cream rounded-map shadow-sm p-3"
              >
                {f.marker && (
                  <div className="flex gap-3">
                    {f.marker.imageUrl && (
                      <img
                        src={f.marker.imageUrl}
                        alt={f.marker.title}
                        className="w-16 h-16 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-earth-brown truncate">
                        {f.marker.title}
                      </h4>
                      <div className="text-xs text-earth-brown/50 mt-1">
                        {f.marker.username} · {new Date(f.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                      {f.note && (
                        <div className="text-xs text-earth-brown/60 mt-1 bg-earth-warm/30 px-2 py-1 rounded">
                          {f.note}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                  p === page
                    ? 'bg-earth-wheat text-earth-brown'
                    : 'bg-earth-warm/60 text-earth-brown/60 hover:bg-earth-warm'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

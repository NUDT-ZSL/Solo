import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Project, Photo, Narrative, TimelineNode, ProjectData } from './types';
import Timeline from './frontend/Timeline';
import MapMarker from './frontend/MapMarker';
import {
  Upload, Download, Play, Pause, Volume2, VolumeX,
  Plus, MapPin, Calendar, Music, FileText, Image,
  Loader2, X, Trash2, GripVertical,
} from 'lucide-react';

const API_BASE = '/api';

const App: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [scrollToPhotoId, setScrollToPhotoId] = useState<string | null>(null);
  const [highlightedCity, setHighlightedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [musicSrc, setMusicSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(60);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [dragOverUpload, setDragOverUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        let currentId = localStorage.getItem('travel_project_id');
        let data: ProjectData | null = null;
        if (currentId) {
          try {
            const res = await fetch(`${API_BASE}/project/${currentId}`);
            if (res.ok) data = await res.json();
          } catch {}
        }
        if (!data) {
          const createRes = await fetch(`${API_BASE}/project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: '我的旅行纪录片' }),
          });
          const created = await createRes.json();
          currentId = created.projectId;
          localStorage.setItem('travel_project_id', currentId);
          const res = await fetch(`${API_BASE}/project/${currentId}`);
          data = await res.json();
        }
        if (data) {
          setProject(data.project);
          setPhotos(data.photos);
          setNarratives(data.narratives);
          if (data.project.backgroundMusic) {
            setMusicSrc(data.project.backgroundMusic);
          }
        }
      } catch (err) {
        console.error(err);
        showMessage('项目初始化失败', 'error');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume, musicSrc]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, musicSrc]);

  const readExifDate = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const dataView = new DataView(arrayBuffer);
          const length = dataView.byteLength;
          if (length < 2 || dataView.getUint16(0) !== 0xffd8) {
            resolve(new Date(file.lastModified).toISOString());
            return;
          }
          let offset = 2;
          while (offset < length - 4) {
            const marker = dataView.getUint16(offset);
            const sectionLength = dataView.getUint16(offset + 2);
            if (marker === 0xffe1) {
              if (dataView.getUint32(offset + 4) === 0x45786966) {
                const tiffOffset = offset + 10;
                const isLittle = dataView.getUint16(tiffOffset) === 0x4949;
                const read16 = (o: number) => dataView.getUint16(o, isLittle);
                const read32 = (o: number) => dataView.getUint32(o, isLittle);
                const firstIFD = read32(tiffOffset + 4);
                const ifdOffset = tiffOffset + firstIFD;
                const numEntries = read16(ifdOffset);
                for (let i = 0; i < numEntries; i++) {
                  const entryOffset = ifdOffset + 2 + i * 12;
                  const tag = read16(entryOffset);
                  if (tag === 0x0132) {
                    const type = read16(entryOffset + 2);
                    const count = read32(entryOffset + 4);
                    const valOffset = entryOffset + 8;
                    let str = '';
                    if (type === 2 && count > 0) {
                      const actual = count <= 4 ? valOffset : tiffOffset + read32(valOffset);
                      for (let j = 0; j < count; j++) {
                        const c = dataView.getUint8(actual + j);
                        if (c === 0) break;
                        str += String.fromCharCode(c);
                      }
                    }
                    if (str) {
                      const d = str.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                      resolve(new Date(d).toISOString());
                      return;
                    }
                  }
                }
              }
              break;
            }
            offset += 2 + sectionLength;
          }
        } catch {}
        resolve(new Date(file.lastModified).toISOString());
      };
      reader.onerror = () => resolve(new Date(file.lastModified).toISOString());
      reader.readAsArrayBuffer(file.slice(0, 131072));
    });

  const uploadPhotos = async (files: FileList | File[]) => {
    if (!project) return;
    const fileArr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!fileArr.length) {
      showMessage('请选择图片文件', 'error');
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    let uploaded = 0;
    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      try {
        const timestamp = await readExifDate(file);
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('timestamp', timestamp);
        formData.append('city', '');
        formData.append('location', '');

        const res = await fetch(`${API_BASE}/project/${project.id}/photo`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const photo: Photo = await res.json();
          setPhotos((prev) => [...prev, photo].sort((a, b) => a.orderIndex - b.orderIndex));
          uploaded++;
        }
      } catch (err) {
        console.error(err);
      }
      setUploadProgress(Math.round(((i + 1) / fileArr.length) * 100));
    }

    setUploading(false);
    showMessage(`成功上传 ${uploaded} 张照片`, 'success');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updatePhoto = async (photoId: string, data: Partial<Photo>) => {
    if (!project) return;
    try {
      const res = await fetch(`${API_BASE}/project/${project.id}/photo/${photoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated: Photo = await res.json();
        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? { ...p, ...updated } : p)).sort((a, b) => a.orderIndex - b.orderIndex)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deletePhoto = async (id: string) => {
    if (!project) return;
    try {
      const res = await fetch(`${API_BASE}/project/${project.id}/photo/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        if (selectedPhoto?.id === id) setSelectedPhoto(null);
        showMessage('照片已删除', 'info');
      }
    } catch (err) {
      showMessage('删除失败', 'error');
    }
  };

  const addNarrative = async () => {
    if (!project) return;
    try {
      const afterPhotoId = selectedPhoto?.id || null;
      const res = await fetch(`${API_BASE}/project/${project.id}/narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '', content: '', afterPhotoId }),
      });
      if (res.ok) {
        const n: Narrative = await res.json();
        setNarratives((prev) => [...prev, n].sort((a, b) => a.orderIndex - b.orderIndex));
        showMessage('已添加幕布节点', 'success');
      }
    } catch (err) {
      showMessage('添加幕布失败', 'error');
    }
  };

  const updateNarrative = async (id: string, data: Partial<Narrative>) => {
    if (!project) return;
    try {
      const res = await fetch(`${API_BASE}/project/${project.id}/narrative/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated: Narrative = await res.json();
        setNarratives((prev) => prev.map((n) => (n.id === id ? { ...n, ...updated } : n)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNarrative = async (id: string) => {
    if (!project) return;
    try {
      const res = await fetch(`${API_BASE}/project/${project.id}/narrative/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNarratives((prev) => prev.filter((n) => n.id !== id));
        showMessage('幕布已删除', 'info');
      }
    } catch (err) {
      showMessage('删除失败', 'error');
    }
  };

  const handleReorder = async (reordered: TimelineNode[]) => {
    if (!project) return;
    const photoUpdates: Promise<void>[] = [];
    const narrativeUpdates: Promise<void>[] = [];
    reordered.forEach((node, idx) => {
      if (node.type === 'photo') {
        photoUpdates.push(updatePhoto((node.data as Photo).id, { orderIndex: idx } as Partial<Photo>));
      } else {
        narrativeUpdates.push(updateNarrative((node.data as Narrative).id, { orderIndex: idx }));
      }
    });
    await Promise.all([...photoUpdates, ...narrativeUpdates]);
  };

  const handleLocationClick = (photoId: string) => {
    const p = photos.find((x) => x.id === photoId);
    if (p) {
      setHighlightedCity(p.city);
      setSelectedPhoto(p);
      setScrollToPhotoId(photoId);
      setTimeout(() => setHighlightedCity(null), 2000);
    }
  };

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!project || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    try {
      const formData = new FormData();
      formData.append('music', file);
      const res = await fetch(`${API_BASE}/project/${project.id}/music`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const { musicUrl } = await res.json();
        setMusicSrc(musicUrl);
        setIsPlaying(false);
        showMessage('背景音乐上传成功', 'success');
      }
    } catch (err) {
      showMessage('音乐上传失败', 'error');
    }
    e.target.value = '';
  };

  const exportHtml = async () => {
    if (!project || exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/project/${project.id}/export`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title || '旅行纪录片'}-${project.id.slice(0, 8)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('导出成功！', 'success');
    } catch (err) {
      console.error(err);
      showMessage('导出失败', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#faf5eb' }}>
        <Loader2 size={40} color="#1e88e5" className="spin" />
        <div style={{ color: '#666' }}>正在加载项目...</div>
        <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#faf5eb' }}>
      <header style={{
        height: 56, minHeight: 56, background: '#333', color: '#fff',
        display: 'flex', alignItems: 'center', padding: '0 24px',
        justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>✈️</span>
          <h1 style={{ fontSize: 17, fontWeight: 600, letterSpacing: 0.5 }}>{project?.title || '旅行纪录片'}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#bbb' }}>
            📷 {photos.length} 张照片 · 📝 {narratives.length} 段幕布
          </div>
          <button
            onClick={exportHtml}
            disabled={exporting || photos.length === 0}
            title={photos.length === 0 ? '请先上传至少1张照片才能导出' : '导出为独立HTML文件'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8,
              background: '#444', color: '#fff', fontSize: 13, fontWeight: 500,
              transition: 'all 0.25s',
              opacity: exporting || photos.length === 0 ? 0.5 : 1,
              cursor: exporting || photos.length === 0 ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!exporting && photos.length > 0) {
                e.currentTarget.style.background = '#555';
                e.currentTarget.style.transform = 'scale(1.08)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#444';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
            {exporting ? '导出中...' : '导出 HTML'}
          </button>
          {photos.length === 0 && (
            <span style={{ fontSize: 11, color: '#ffb74d', marginLeft: 4 }}>
              ⚠️ 需先上传照片
            </span>
          )}
        </div>
      </header>

      {musicSrc && (
        <>
          <audio ref={audioRef} src={musicSrc} loop onEnded={() => setIsPlaying(false)} />
          <div
            style={{
              position: 'fixed', top: 72, right: 24, zIndex: 90,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}
          >
            <button
              onClick={() => setIsPlaying((p) => !p)}
              title={isPlaying ? '暂停' : '播放'}
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#1e88e5', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(30,136,229,0.4)',
                animation: isPlaying ? 'spinMusic 3s linear infinite' : 'none',
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(30,136,229,0.55)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(30,136,229,0.4)')}
            >
              {isPlaying ? <Pause size={22} fill="#fff" /> : <Play size={22} fill="#fff" style={{ marginLeft: 3 }} />}
            </button>
            <div style={{
              background: '#fff', borderRadius: 12, padding: '8px 12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <button
                onClick={() => setVolume((v) => (v > 0 ? 0 : 60))}
                title={volume === 0 ? '取消静音' : '静音'}
                style={{ display: 'flex', color: '#666', padding: '4px', borderRadius: '50%', transition: 'background 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range" min={0} max={100} value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                style={{
                  width: 80,
                  accentColor: '#1e88e5',
                  cursor: 'pointer',
                }}
                title={`音量: ${volume}%`}
              />
              <span style={{ fontSize: 11, color: '#999', minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{volume}%</span>
            </div>
          </div>
        </>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ height: '70%', minHeight: 0, position: 'relative' }}>
          <Timeline
            photos={photos}
            narratives={narratives}
            onSelectPhoto={setSelectedPhoto}
            selectedPhotoId={selectedPhoto?.id || null}
            onDeletePhoto={deletePhoto}
            onDeleteNarrative={deleteNarrative}
            onUpdateNarrative={updateNarrative}
            onReorder={handleReorder}
            scrollToPhotoId={scrollToPhotoId}
            onPhotoScrollComplete={() => setScrollToPhotoId(null)}
          />
        </div>

        <div style={{
          height: '30%', minHeight: 280, background: '#f0ede6',
          borderRadius: '16px 16px 0 0', margin: '0 16px',
          padding: 16, display: 'flex', gap: 16,
          boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
          overflow: 'auto',
        }}>
          <div style={{
            width: 280, minWidth: 280, background: '#fff', borderRadius: 12,
            padding: 16, border: dragOverUpload ? '2px dashed #1e88e5' : '2px dashed #bdbdbd',
            transition: 'border-color 0.2s',
            display: 'flex', flexDirection: 'column',
          }}
            onDragOver={(e) => { e.preventDefault(); setDragOverUpload(true); }}
            onDragLeave={() => setDragOverUpload(false)}
            onDrop={(e) => { e.preventDefault(); setDragOverUpload(false); uploadPhotos(e.dataTransfer.files); }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={14} color="#1e88e5" />
              上传照片
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '1px dashed #ddd', borderRadius: 8, padding: 24, textAlign: 'center',
                cursor: 'pointer', color: '#888', fontSize: 12, lineHeight: 1.8,
                transition: 'all 0.2s', background: '#fafafa',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f7ff'; e.currentTarget.style.borderColor = '#90caf9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#ddd'; }}
            >
              <Image size={32} color="#bbb" style={{ margin: '0 auto 8px' }} />
              <div style={{ color: '#666', fontWeight: 500 }}>点击选择照片</div>
              <div style={{ color: '#aaa', marginTop: 4 }}>或拖拽到此处</div>
              <div style={{ color: '#bbb', marginTop: 6, fontSize: 11 }}>支持 JPG / PNG / WEBP</div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => uploadPhotos(e.target.files || [])}
            />

            {uploading && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span>上传中...</span><span>{uploadProgress}%</span>
                </div>
                <div style={{ height: 4, background: '#eee', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#1e88e5', width: `${uploadProgress}%`, transition: 'width 0.2s' }} />
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Music size={13} color="#ff5722" />
                背景音乐
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => musicInputRef.current?.click()}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 6,
                    background: musicSrc ? '#e8f5e9' : '#fafafa',
                    border: '1px solid #eee',
                    fontSize: 12, color: musicSrc ? '#2e7d32' : '#666',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (!musicSrc) e.currentTarget.style.background = '#f0f7ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = musicSrc ? '#e8f5e9' : '#fafafa'; }}
                >
                  {musicSrc ? '🎵 已上传音乐' : '🎵 选择音频文件'}
                </button>
              </div>
              <input
                ref={musicInputRef}
                type="file" accept="audio/*"
                hidden
                onChange={handleMusicUpload}
              />
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div style={{
              flex: 1, background: '#fff', borderRadius: 12, padding: 16,
              minWidth: 320,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} color="#ff5722" />
                  幕布 / 照片编辑
                </div>
                <button
                  onClick={addNarrative}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 12px', borderRadius: 6,
                    background: '#ff5722', color: '#fff', fontSize: 12, fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#e64a19')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ff5722')}
                >
                  <Plus size={12} /> 添加幕布
                </button>
              </div>

              {selectedPhoto ? (
                <div style={{
                  flex: 1, overflow: 'auto', padding: 12,
                  background: '#fafafa', borderRadius: 8,
                  border: '1px solid #f0f0f0',
                }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <img
                      src={selectedPhoto.filepath}
                      alt=""
                      style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>文件名</div>
                      <div style={{ fontSize: 13, color: '#333', wordBreak: 'break-all', fontWeight: 500 }}>{selectedPhoto.filename}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                        <MapPin size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
                        城市
                      </label>
                      <input
                        type="text"
                        value={selectedPhoto.city}
                        placeholder="如：大理"
                        onChange={(e) => updatePhoto(selectedPhoto.id, { city: e.target.value } as Partial<Photo>)}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 6,
                          border: '1px solid #ddd', fontSize: 13, outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#1e88e5')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#ddd')}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                        <Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
                        拍摄时间
                      </label>
                      <input
                        type="datetime-local"
                        value={selectedPhoto.timestamp.slice(0, 16)}
                        onChange={(e) => updatePhoto(selectedPhoto.id, { timestamp: new Date(e.target.value).toISOString() } as Partial<Photo>)}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 6,
                          border: '1px solid #ddd', fontSize: 13, outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#1e88e5')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#ddd')}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4, fontWeight: 500 }}>详细地点</label>
                      <input
                        type="text"
                        value={selectedPhoto.location}
                        placeholder="如：洱海双廊古镇观景台"
                        onChange={(e) => updatePhoto(selectedPhoto.id, { location: e.target.value } as Partial<Photo>)}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 6,
                          border: '1px solid #ddd', fontSize: 13, outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#1e88e5')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#ddd')}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#bbb', fontSize: 13, flexDirection: 'column', gap: 8,
                  background: '#fafafa', borderRadius: 8, border: '1px dashed #eee',
                }}>
                  <GripVertical size={24} color="#ddd" />
                  <div>点击时间线中的照片以编辑信息</div>
                  <div style={{ fontSize: 11, color: '#ccc' }}>城市将用于生成旅行地图</div>
                </div>
              )}
            </div>

            <div style={{ minWidth: 320 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} color="#1565c0" />
                旅行地图
                <span style={{ fontSize: 11, color: '#aaa', fontWeight: 400 }}>(点击标记跳转)</span>
              </div>
              <MapMarker
                photos={photos}
                onLocationClick={handleLocationClick}
                highlightedCity={highlightedCity}
                width={320}
                height={240}
              />
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px', borderRadius: 10,
          background: message.type === 'success' ? '#2e7d32' : message.type === 'error' ? '#c62828' : '#1565c0',
          color: '#fff', fontSize: 13, fontWeight: 500,
          boxShadow: '0 6px 20px rgba(0,0,0,0.2)', zIndex: 1000,
          animation: 'slideUp 0.3s ease',
        }}>
          {message.text}
        </div>
      )}

      <style>{`
        @keyframes spinMusic { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideUp { from{transform:translateX(-50%) translateY(20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
        .spin{animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        input[type="range"] { -webkit-appearance: none; height: 4px; background: #e0e0e0; border-radius: 2px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: #1e88e5; border-radius: 50%; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default App;

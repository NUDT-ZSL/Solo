import React, { useState } from 'react';
import { Hall, Artwork, fetchHalls, createHall, updateHall, deleteHall, addArtwork, deleteArtwork } from '../services/api';

interface AdminPanelProps {
  visible: boolean;
  onClose: () => void;
  halls: Hall[];
  onRefresh: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ visible, onClose, halls, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'halls' | 'artworks'>('halls');
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [showHallForm, setShowHallForm] = useState(false);
  const [selectedHallId, setSelectedHallId] = useState<string>('');
  const [hallName, setHallName] = useState('');
  const [hallWidth, setHallWidth] = useState<number>(10);
  const [hallHeight, setHallHeight] = useState<number>(5);
  const [hallDepth, setHallDepth] = useState<number>(10);
  const [hallWallColor, setHallWallColor] = useState('#FFFFFF');
  const [hallFloorTexture, setHallFloorTexture] = useState<'grid' | 'marble' | 'wood'>('grid');

  const [artworkImage, setArtworkImage] = useState<File | null>(null);
  const [artworkTitle, setArtworkTitle] = useState('');
  const [artworkArtist, setArtworkArtist] = useState('');
  const [artworkYear, setArtworkYear] = useState('');
  const [artworkDescription, setArtworkDescription] = useState('');
  const [artworkWall, setArtworkWall] = useState<'north' | 'south' | 'east' | 'west'>('north');
  const [artworkPositionX, setArtworkPositionX] = useState<number>(0);
  const [artworkPositionY, setArtworkPositionY] = useState<number>(0);
  const [artworkWidth, setArtworkWidth] = useState<number>(2);
  const [artworkHeight, setArtworkHeight] = useState<number>(2);

  if (!visible) return null;

  const resetHallForm = () => {
    setEditingHall(null);
    setShowHallForm(false);
    setHallName('');
    setHallWidth(10);
    setHallHeight(5);
    setHallDepth(10);
    setHallWallColor('#FFFFFF');
    setHallFloorTexture('grid');
  };

  const resetArtworkForm = () => {
    setArtworkImage(null);
    setArtworkTitle('');
    setArtworkArtist('');
    setArtworkYear('');
    setArtworkDescription('');
    setArtworkWall('north');
    setArtworkPositionX(0);
    setArtworkPositionY(0);
    setArtworkWidth(2);
    setArtworkHeight(2);
  };

  const handleEditHall = (hall: Hall) => {
    setEditingHall(hall);
    setShowHallForm(true);
    setHallName(hall.name);
    setHallWidth(hall.width);
    setHallHeight(hall.height);
    setHallDepth(hall.depth);
    setHallWallColor(hall.wallColor);
    setHallFloorTexture(hall.floorTexture || 'grid');
  };

  const handleDeleteHall = async (hallId: string) => {
    await deleteHall(hallId);
    onRefresh();
  };

  const handleHallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: hallName, width: hallWidth, height: hallHeight, depth: hallDepth, wallColor: hallWallColor, floorTexture: hallFloorTexture };
    if (editingHall) {
      await updateHall(editingHall.id, data);
    } else {
      await createHall(data);
    }
    resetHallForm();
    onRefresh();
  };

  const handleDeleteArtwork = async (artworkId: string) => {
    if (!selectedHallId) return;
    await deleteArtwork(selectedHallId, artworkId);
    onRefresh();
  };

  const handleArtworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artworkImage || !selectedHallId) return;
    const formData = new FormData();
    formData.append('image', artworkImage);
    formData.append('title', artworkTitle);
    formData.append('artist', artworkArtist);
    formData.append('year', artworkYear);
    formData.append('description', artworkDescription);
    formData.append('wall', artworkWall);
    formData.append('positionX', String(artworkPositionX));
    formData.append('positionY', String(artworkPositionY));
    formData.append('width', String(artworkWidth));
    formData.append('height', String(artworkHeight));
    await addArtwork(selectedHallId, formData);
    resetArtworkForm();
    onRefresh();
  };

  const selectedHall = halls.find(h => h.id === selectedHallId);
  const artworks: Artwork[] = selectedHall?.artworks || [];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 420,
      height: '100vh',
      background: '#FAF8F2',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Georgia, "Times New Roman", serif',
      color: '#3E2723',
      animation: 'slideInRight 0.3s ease-out',
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #D7CCC8',
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#3E2723' }}>展览馆管理</h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 22,
            cursor: 'pointer',
            color: '#3E2723',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #D7CCC8' }}>
        {(['halls', 'artworks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '12px 0',
              background: activeTab === tab ? '#C5A55A' : 'transparent',
              color: activeTab === tab ? '#fff' : '#3E2723',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #C5A55A' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {tab === 'halls' ? '展厅管理' : '画作管理'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {activeTab === 'halls' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>展厅列表</span>
              <button
                onClick={() => { resetHallForm(); setShowHallForm(true); }}
                style={{
                  background: '#C5A55A',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                  fontSize: 13,
                }}
              >
                新建展厅
              </button>
            </div>

            {halls.map(hall => (
              <div key={hall.id} style={{
                background: '#fff',
                borderRadius: 6,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                marginBottom: 12,
                padding: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{hall.name}</div>
                    <div style={{ fontSize: 12, color: '#8D6E63', marginTop: 4 }}>
                      {hall.width}m × {hall.depth}m × {hall.height}m
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 3,
                      border: '1px solid #D7CCC8',
                      background: hall.wallColor,
                    }} />
                    <button
                      onClick={() => handleEditHall(hall)}
                      style={{
                        background: '#C5A55A',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteHall(hall.id)}
                      style={{
                        background: '#fff',
                        color: '#D32F2F',
                        border: '1px solid #D32F2F',
                        borderRadius: 4,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {showHallForm && (
              <form onSubmit={handleHallSubmit} style={{
                background: '#fff',
                borderRadius: 6,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                padding: 16,
                marginTop: 8,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
                  {editingHall ? '编辑展厅' : '新建展厅'}
                </div>

                <label style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                  名称
                  <input
                    type="text"
                    value={hallName}
                    onChange={e => setHallName(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      border: '1px solid #D7CCC8',
                      borderRadius: 4,
                      padding: 8,
                      marginTop: 4,
                      fontSize: 13,
                      fontFamily: 'Georgia, serif',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>

                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {[
                    { label: '宽度', value: hallWidth, set: setHallWidth },
                    { label: '高度', value: hallHeight, set: setHallHeight },
                    { label: '深度', value: hallDepth, set: setHallDepth },
                  ].map(f => (
                    <label key={f.label} style={{ flex: 1, fontSize: 13 }}>
                      {f.label}
                      <input
                        type="number"
                        value={f.value}
                        onChange={e => f.set(Number(e.target.value))}
                        style={{
                          display: 'block',
                          width: '100%',
                          border: '1px solid #D7CCC8',
                          borderRadius: 4,
                          padding: 8,
                          marginTop: 4,
                          fontSize: 13,
                          fontFamily: 'Georgia, serif',
                          boxSizing: 'border-box',
                        }}
                      />
                    </label>
                  ))}
                </div>

                <label style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                  墙壁颜色
                  <input
                    type="color"
                    value={hallWallColor}
                    onChange={e => setHallWallColor(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 36,
                      border: '1px solid #D7CCC8',
                      borderRadius: 4,
                      marginTop: 4,
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  />
                </label>

                <label style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
                  地板纹理
                  <select
                    value={hallFloorTexture}
                    onChange={e => setHallFloorTexture(e.target.value as 'grid' | 'marble' | 'wood')}
                    style={{
                      display: 'block',
                      width: '100%',
                      border: '1px solid #D7CCC8',
                      borderRadius: 4,
                      padding: 8,
                      marginTop: 4,
                      fontSize: 13,
                      fontFamily: 'Georgia, serif',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="grid">Grid</option>
                    <option value="marble">Marble</option>
                    <option value="wood">Wood</option>
                  </select>
                </label>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="submit"
                    style={{
                      background: '#C5A55A',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: 'Georgia, serif',
                      fontSize: 13,
                    }}
                  >
                    {editingHall ? '更新' : '创建'}
                  </button>
                  <button
                    type="button"
                    onClick={resetHallForm}
                    style={{
                      background: '#fff',
                      color: '#3E2723',
                      border: '1px solid #D7CCC8',
                      borderRadius: 4,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: 'Georgia, serif',
                      fontSize: 13,
                    }}
                  >
                    取消
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'artworks' && (
          <div>
            <label style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              选择展厅
              <select
                value={selectedHallId}
                onChange={e => setSelectedHallId(e.target.value)}
                style={{
                  display: 'block',
                  width: '100%',
                  border: '1px solid #D7CCC8',
                  borderRadius: 4,
                  padding: 8,
                  marginTop: 4,
                  fontSize: 13,
                  fontFamily: 'Georgia, serif',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">-- 请选择 --</option>
                {halls.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </label>

            {selectedHallId && (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>画作列表</div>
                {artworks.map(art => (
                  <div key={art.id} style={{
                    background: '#fff',
                    borderRadius: 6,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    marginBottom: 12,
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <img
                      src={art.imageUrl}
                      alt={art.title}
                      style={{
                        width: 48,
                        height: 48,
                        objectFit: 'cover',
                        borderRadius: 4,
                        border: '1px solid #D7CCC8',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{art.title}</div>
                      <div style={{ fontSize: 12, color: '#8D6E63' }}>{art.artist}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteArtwork(art.id)}
                      style={{
                        background: '#fff',
                        color: '#D32F2F',
                        border: '1px solid #D32F2F',
                        borderRadius: 4,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontFamily: 'Georgia, serif',
                        flexShrink: 0,
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))}
                {artworks.length === 0 && (
                  <div style={{ fontSize: 13, color: '#8D6E63', marginBottom: 12 }}>暂无画作</div>
                )}

                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, marginTop: 8 }}>添加画作</div>
                <form onSubmit={handleArtworkSubmit} style={{
                  background: '#fff',
                  borderRadius: 6,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  padding: 16,
                }}>
                  <label style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                    图片
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setArtworkImage(e.target.files?.[0] || null)}
                      style={{ display: 'block', marginTop: 4, fontSize: 12 }}
                    />
                  </label>

                  <label style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                    标题
                    <input
                      type="text"
                      value={artworkTitle}
                      onChange={e => setArtworkTitle(e.target.value)}
                      style={{
                        display: 'block',
                        width: '100%',
                        border: '1px solid #D7CCC8',
                        borderRadius: 4,
                        padding: 8,
                        marginTop: 4,
                        fontSize: 13,
                        fontFamily: 'Georgia, serif',
                        boxSizing: 'border-box',
                      }}
                    />
                  </label>

                  <label style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                    艺术家
                    <input
                      type="text"
                      value={artworkArtist}
                      onChange={e => setArtworkArtist(e.target.value)}
                      style={{
                        display: 'block',
                        width: '100%',
                        border: '1px solid #D7CCC8',
                        borderRadius: 4,
                        padding: 8,
                        marginTop: 4,
                        fontSize: 13,
                        fontFamily: 'Georgia, serif',
                        boxSizing: 'border-box',
                      }}
                    />
                  </label>

                  <label style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                    年份
                    <input
                      type="text"
                      value={artworkYear}
                      onChange={e => setArtworkYear(e.target.value)}
                      style={{
                        display: 'block',
                        width: '100%',
                        border: '1px solid #D7CCC8',
                        borderRadius: 4,
                        padding: 8,
                        marginTop: 4,
                        fontSize: 13,
                        fontFamily: 'Georgia, serif',
                        boxSizing: 'border-box',
                      }}
                    />
                  </label>

                  <label style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                    描述
                    <textarea
                      value={artworkDescription}
                      onChange={e => setArtworkDescription(e.target.value)}
                      rows={3}
                      style={{
                        display: 'block',
                        width: '100%',
                        border: '1px solid #D7CCC8',
                        borderRadius: 4,
                        padding: 8,
                        marginTop: 4,
                        fontSize: 13,
                        fontFamily: 'Georgia, serif',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                    />
                  </label>

                  <label style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                    墙面
                    <select
                      value={artworkWall}
                      onChange={e => setArtworkWall(e.target.value as 'north' | 'south' | 'east' | 'west')}
                      style={{
                        display: 'block',
                        width: '100%',
                        border: '1px solid #D7CCC8',
                        borderRadius: 4,
                        padding: 8,
                        marginTop: 4,
                        fontSize: 13,
                        fontFamily: 'Georgia, serif',
                        background: '#fff',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="north">North</option>
                      <option value="south">South</option>
                      <option value="east">East</option>
                      <option value="west">West</option>
                    </select>
                  </label>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {[
                      { label: '位置X', value: artworkPositionX, set: setArtworkPositionX },
                      { label: '位置Y', value: artworkPositionY, set: setArtworkPositionY },
                    ].map(f => (
                      <label key={f.label} style={{ flex: 1, fontSize: 13 }}>
                        {f.label}
                        <input
                          type="number"
                          value={f.value}
                          onChange={e => f.set(Number(e.target.value))}
                          style={{
                            display: 'block',
                            width: '100%',
                            border: '1px solid #D7CCC8',
                            borderRadius: 4,
                            padding: 8,
                            marginTop: 4,
                            fontSize: 13,
                            fontFamily: 'Georgia, serif',
                            boxSizing: 'border-box',
                          }}
                        />
                      </label>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: '宽度', value: artworkWidth, set: setArtworkWidth },
                      { label: '高度', value: artworkHeight, set: setArtworkHeight },
                    ].map(f => (
                      <label key={f.label} style={{ flex: 1, fontSize: 13 }}>
                        {f.label}
                        <input
                          type="number"
                          value={f.value}
                          onChange={e => f.set(Number(e.target.value))}
                          style={{
                            display: 'block',
                            width: '100%',
                            border: '1px solid #D7CCC8',
                            borderRadius: 4,
                            padding: 8,
                            marginTop: 4,
                            fontSize: 13,
                            fontFamily: 'Georgia, serif',
                            boxSizing: 'border-box',
                          }}
                        />
                      </label>
                    ))}
                  </div>

                  <button
                    type="submit"
                    style={{
                      background: '#C5A55A',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: 'Georgia, serif',
                      fontSize: 13,
                    }}
                  >
                    添加画作
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;

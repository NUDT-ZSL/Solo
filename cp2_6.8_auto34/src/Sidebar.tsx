import { useRef, useState, ChangeEvent } from 'react';
import {
  Room,
  Scale,
  COLOR_PALETTE,
  OPENING_TYPE_LABELS,
  OpeningType,
  polygonAreaSquareMeters,
} from './utils';

interface SidebarProps {
  rooms: Room[];
  scale: Scale;
  onScaleChange: (scale: Scale) => void;
  onImageUploaded: (url: string, filename: string, width: number, height: number) => void;
  onDetectEdges: () => void;
  onExport: () => void;
  isDetecting: boolean;
  selectedRoom: Room | null;
  onRoomUpdate: (roomId: string, updates: Partial<Room>) => void;
  onDeleteRoom: (roomId: string) => void;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
  imageUrl: string | null;
}

export default function Sidebar(props: SidebarProps) {
  const {
    rooms,
    scale,
    onScaleChange,
    onImageUploaded,
    onDetectEdges,
    onExport,
    isDetecting,
    selectedRoom,
    onRoomUpdate,
    onDeleteRoom,
    isPanelOpen,
    onTogglePanel,
    imageUrl,
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string>('');

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('文件大小不能超过10MB');
      return;
    }
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      setUploadError('仅支持 JPG/PNG 格式');
      return;
    }
    setUploadError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        onImageUploaded(data.url, data.filename, data.width, data.height);
      } else {
        setUploadError(data.error || '上传失败');
      }
    } catch (err) {
      setUploadError('上传失败，请重试');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const panelWidth = isPanelOpen ? 300 : 48;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarTitle}>平面图工具</div>

        <button
          style={styles.toolBtn}
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,144,217,0.3)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          📁 上传图片
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        {uploadError && <div style={styles.errorText}>{uploadError}</div>}

        <div style={styles.divider} />

        <div style={styles.sectionLabel}>比例尺设置</div>
        <div style={styles.scaleRow}>
          <input
            type="number"
            style={styles.scaleInput}
            value={scale.pixels}
            min={1}
            onChange={(e) => onScaleChange({ ...scale, pixels: Number(e.target.value) || 1 })}
          />
          <span style={styles.scaleLabel}>像素 =</span>
          <input
            type="number"
            style={styles.scaleInput}
            value={scale.meters}
            min={0.01}
            step={0.01}
            onChange={(e) => onScaleChange({ ...scale, meters: Number(e.target.value) || 0.01 })}
          />
          <span style={styles.scaleLabel}>米</span>
        </div>

        <div style={styles.divider} />

        <button
          style={{ ...styles.toolBtn, opacity: imageUrl ? 1 : 0.5 }}
          disabled={!imageUrl || isDetecting}
          onClick={onDetectEdges}
          onMouseEnter={(e) => {
            if (imageUrl) e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,144,217,0.3)';
          }}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          {isDetecting ? '⏳ 检测中...' : '🔍 自动检测'}
        </button>

        <button
          style={{ ...styles.toolBtn, opacity: rooms.length > 0 ? 1 : 0.5 }}
          disabled={rooms.length === 0}
          onClick={onExport}
          onMouseEnter={(e) => {
            if (rooms.length > 0) e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,144,217,0.3)';
          }}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          💾 导出 JSON
        </button>

        <div style={styles.divider} />

        <div style={styles.sectionLabel}>房间列表</div>
        <div style={styles.roomList}>
          {rooms.length === 0 && <div style={styles.emptyText}>暂无房间</div>}
          {rooms.map((r) => (
            <div key={r.id} style={styles.roomListItem}>
              <div style={{ ...styles.roomColorDot, backgroundColor: r.color }} />
              <span style={styles.roomListName}>{r.name || '未命名'}</span>
              <span style={styles.roomListArea}>{r.area.toFixed(2)}㎡</span>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <div style={styles.tip}>
          <div>💡 使用提示：</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4, lineHeight: 1.6 }}>
            • 点击画布标记墙角<br />
            • ≥4点自动闭合房间<br />
            • 双击房间编辑属性<br />
            • 滚轮缩放/拖拽平移
          </div>
        </div>
      </div>

      <div
        style={{
          ...styles.panel,
          width: panelWidth,
          transition: 'width 0.3s ease',
          overflow: 'hidden',
        }}
      >
        <button
          style={styles.panelToggle}
          onClick={onTogglePanel}
          title={isPanelOpen ? '收起属性面板' : '展开属性面板'}
        >
          {isPanelOpen ? '›' : '‹'}
        </button>

        {isPanelOpen && (
          <div style={{ ...styles.panelContent, opacity: isPanelOpen ? 1 : 0, transition: 'opacity 0.3s ease 0.1s' }}>
            <div style={styles.panelTitle}>属性编辑</div>
            {!selectedRoom ? (
              <div style={styles.emptyText}>双击房间查看属性</div>
            ) : (
              <div style={styles.propertyForm}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>房间名称</label>
                  <input
                    style={styles.formInput}
                    value={selectedRoom.name}
                    onChange={(e) => onRoomUpdate(selectedRoom.id, { name: e.target.value })}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>房间颜色</label>
                  <div style={styles.colorPicker}>
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        style={{
                          ...styles.colorSwatch,
                          backgroundColor: color,
                          border: selectedRoom.color === color ? '3px solid #333' : '2px solid transparent',
                        }}
                        onClick={() => onRoomUpdate(selectedRoom.id, { color })}
                      />
                    ))}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>面积 (㎡)</label>
                  <input
                    type="number"
                    step="0.01"
                    style={styles.formInput}
                    value={selectedRoom.area.toFixed(2)}
                    onChange={(e) =>
                      onRoomUpdate(selectedRoom.id, { area: Number(e.target.value) || 0 })
                    }
                  />
                  <div style={styles.hint}>
                    自动计算: {polygonAreaSquareMeters(selectedRoom.points, scale).toFixed(2)} ㎡
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>门窗列表</label>
                  <div style={styles.openingList}>
                    {selectedRoom.openings.length === 0 && (
                      <div style={styles.emptyText}>点击房间边缘线添加门窗</div>
                    )}
                    {selectedRoom.openings.map((op, idx) => (
                      <div key={op.id} style={styles.openingItem}>
                        <span>{OPENING_TYPE_LABELS[op.type] || op.type}</span>
                        <span style={{ color: '#999', fontSize: 12 }}>
                          边{op.edgeIndex + 1} · {(op.position * 100).toFixed(0)}%
                        </span>
                        <button
                          style={styles.deleteBtn}
                          onClick={() => {
                            const newOpenings = selectedRoom.openings.filter((_, i) => i !== idx);
                            onRoomUpdate(selectedRoom.id, { openings: newOpenings });
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  style={styles.deleteRoomBtn}
                  onClick={() => onDeleteRoom(selectedRoom.id)}
                >
                  🗑 删除房间
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    width: 240,
    backgroundColor: '#fff',
    borderRight: '1px solid #e0e0e0',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  toolbarTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#4A90D9',
    marginBottom: 16,
  },
  toolBtn: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: '#4A90D9',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: 8,
    transition: 'box-shadow 0.2s ease',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    margin: '12px 0',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#555',
    marginBottom: 8,
  },
  scaleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  scaleInput: {
    width: 56,
    padding: '6px 8px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 13,
  },
  scaleLabel: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#E74C3C',
    marginBottom: 8,
  },
  roomList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: 180,
    overflowY: 'auto',
  },
  roomListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    fontSize: 13,
  },
  roomColorDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
    flexShrink: 0,
  },
  roomListName: {
    flex: 1,
    color: '#333',
  },
  roomListArea: {
    color: '#888',
    fontSize: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#aaa',
    padding: '8px 0',
  },
  tip: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    fontSize: 12,
    color: '#4A90D9',
  },
  panel: {
    backgroundColor: '#fff',
    borderRight: '1px solid #e0e0e0',
    position: 'relative',
    display: 'flex',
  },
  panelToggle: {
    position: 'absolute',
    top: 12,
    left: -12,
    width: 24,
    height: 40,
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderLeft: 'none',
    borderRadius: '0 6px 6px 0',
    cursor: 'pointer',
    fontSize: 16,
    color: '#4A90D9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  panelContent: {
    padding: 16,
    width: 252,
    height: '100%',
    overflowY: 'auto',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    marginBottom: 16,
  },
  propertyForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: '#555',
  },
  formInput: {
    padding: '8px 10px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 13,
  },
  hint: {
    fontSize: 11,
    color: '#999',
  },
  colorPicker: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    padding: 0,
  },
  openingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: 160,
    overflowY: 'auto',
  },
  openingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    fontSize: 12,
  },
  deleteBtn: {
    marginLeft: 'auto',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#E74C3C',
    cursor: 'pointer',
    fontSize: 16,
    padding: '0 4px',
  },
  deleteRoomBtn: {
    padding: '10px',
    backgroundColor: '#fff',
    color: '#E74C3C',
    border: '1px solid #E74C3C',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    marginTop: 8,
  },
};

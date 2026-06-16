import React, { useState, useRef, useCallback } from 'react';
import { List, AutoSizer, CellMeasurer, CellMeasurerCache } from 'react-virtualized';
import type { CheckInRecord } from '../types';
import { formatDateTime } from '../business/tripEngine';

interface CheckInTimelineProps {
  checkIns: CheckInRecord[];
  onAddCheckIn?: (checkIn: Omit<CheckInRecord, 'id'>) => void;
  tripId?: string;
}

const CheckInTimeline: React.FC<CheckInTimelineProps> = ({
  checkIns,
  onAddCheckIn,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCheckIn, setNewCheckIn] = useState({
    attractionName: '',
    notes: '',
    photos: [] as string[],
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const sortedCheckIns = [...checkIns].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const cache = React.useMemo(
    () =>
      new CellMeasurerCache({
        fixedWidth: true,
        defaultHeight: 200,
      }),
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedPhotos((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedPhotos((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = () => {
    if (!newCheckIn.attractionName.trim()) return;

    if (onAddCheckIn) {
      onAddCheckIn({
        attractionId: '',
        attractionName: newCheckIn.attractionName,
        timestamp: new Date().toISOString(),
        photos: uploadedPhotos,
        notes: newCheckIn.notes,
        coordinates: { lat: 0, lng: 0 },
      });
    }

    setNewCheckIn({ attractionName: '', notes: '', photos: [] });
    setUploadedPhotos([]);
    setShowAddModal(false);
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const rowRenderer = ({
    index,
    key,
    style,
    parent,
  }: {
    index: number;
    key: string;
    style: React.CSSProperties;
    parent: any;
  }) => {
    const checkIn = sortedCheckIns[index];
    const isLeft = index % 2 === 0;

    return (
      <CellMeasurer
        cache={cache}
        columnIndex={0}
        key={key}
        parent={parent}
        rowIndex={index}
      >
        {({ registerChild }) => (
          <div
            ref={registerChild}
            className={`timeline-item ${isLeft ? 'left' : 'right'}`}
            style={{
              ...style,
              animation: `bounceIn 0.4s ease-out ${index * 0.1}s both`,
            }}
          >
            <div className="timeline-dot" />
            <div className="timeline-card">
              <div className="card-header">
                <span className="card-time">
                  🕐 {formatDateTime(checkIn.timestamp)}
                </span>
              </div>
              <h4 className="card-title">📍 {checkIn.attractionName}</h4>
              {checkIn.photos.length > 0 && (
                <div className="card-photos">
                  {checkIn.photos.slice(0, 3).map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`${checkIn.attractionName}-${idx + 1}`}
                      className="card-photo"
                    />
                  ))}
                  {checkIn.photos.length > 3 && (
                    <div className="more-photos">
                      +{checkIn.photos.length - 3}
                    </div>
                  )}
                </div>
              )}
              {checkIn.notes && <p className="card-notes">{checkIn.notes}</p>}
            </div>
          </div>
        )}
      </CellMeasurer>
    );
  };

  return (
    <div className="checkin-timeline">
      <div className="timeline-header">
        <h3>📸 打卡记录</h3>
        {onAddCheckIn && (
          <button className="add-checkin-btn" onClick={() => setShowAddModal(true)}>
            + 添加打卡
          </button>
        )}
      </div>

      {sortedCheckIns.length === 0 ? (
        <div className="empty-timeline">
          <div className="empty-icon">📷</div>
          <p>还没有打卡记录</p>
          <span>开始记录你的旅行回忆吧</span>
        </div>
      ) : (
        <div className="timeline-container">
          <div className="timeline-line" />
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                rowCount={sortedCheckIns.length}
                rowHeight={cache.rowHeight}
                rowRenderer={rowRenderer}
                deferredMeasurementCache={cache}
                overscanRowCount={3}
              />
            )}
          </AutoSizer>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="add-checkin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📍 添加打卡</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>景点名称</label>
                <input
                  type="text"
                  value={newCheckIn.attractionName}
                  onChange={(e) =>
                    setNewCheckIn((prev) => ({ ...prev, attractionName: e.target.value }))
                  }
                  placeholder="输入景点名称"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>上传照片</label>
                <div
                  className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="drop-zone-content">
                    <span className="drop-icon">📷</span>
                    <p>拖拽照片到这里，或点击选择</p>
                    <span className="drop-hint">支持 JPG、PNG 格式</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>

                {uploadedPhotos.length > 0 && (
                  <div className="uploaded-photos">
                    {uploadedPhotos.map((photo, idx) => (
                      <div key={idx} className="uploaded-photo-wrapper">
                        <img src={photo} alt={`上传-${idx + 1}`} />
                        <button
                          className="remove-photo-btn"
                          onClick={() => removePhoto(idx)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>旅行心得</label>
                <textarea
                  value={newCheckIn.notes}
                  onChange={(e) =>
                    setNewCheckIn((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="记录你的旅行感受..."
                  className="form-textarea"
                  rows={4}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!newCheckIn.attractionName.trim()}
              >
                保存打卡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInTimeline;

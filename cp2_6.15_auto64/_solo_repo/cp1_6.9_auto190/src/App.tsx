import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Card, EmotionType, CityOption } from './types';
import { EMOTIONS, EMOTION_COLORS } from './types';
import MapView from './MapView';
import CardPanel from './CardPanel';
import {
  fetchCities,
  fetchCards,
  createCard,
  reorderCards,
  deleteCard as apiDeleteCard,
  restoreCard as apiRestoreCard,
  extractDominantColor,
  validateImageFile,
  getEmotionColor
} from './utils';

const App: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [focusCardId, setFocusCardId] = useState<string | null>(null);
  const [filterEmotion, setFilterEmotion] = useState<EmotionType | 'all'>('all');
  const [isPanelMobileOpen, setIsPanelMobileOpen] = useState(false);

  const [dateRange, setDateRange] = useState<[string, string]>(['', '']);
  const [sliderMin, setSliderMin] = useState<number>(0);
  const [sliderMax, setSliderMax] = useState<number>(100);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
    cityIndex: 0,
    emotion: '宁静' as EmotionType
  });
  const [previewImage, setPreviewImage] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');

  const [deletedCard, setDeletedCard] = useState<Card | null>(null);
  const [undoTimer, setUndoTimer] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const [fetchedCities, fetchedCards] = await Promise.all([
          fetchCities(),
          fetchCards()
        ]);
        setCities(fetchedCities);
        setCards(fetchedCards);
        updateDateRange(fetchedCards);
      } catch (err) {
        console.error('初始化数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  const updateDateRange = (cardList: Card[]) => {
    if (cardList.length === 0) {
      const today = new Date();
      const yearAgo = new Date(today);
      yearAgo.setFullYear(today.getFullYear() - 1);
      const minTs = yearAgo.getTime();
      const maxTs = today.getTime();
      setDateRange([
        yearAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      ]);
      setSliderMin(0);
      setSliderMax(100);
      return { minTs, maxTs };
    }

    const dates = cardList.map((c) => new Date(c.date).getTime());
    const minTs = Math.min(...dates);
    const maxTs = Math.max(...dates);
    const minDate = new Date(minTs);
    const maxDate = new Date(maxTs);

    setDateRange([
      minDate.toISOString().split('T')[0],
      maxDate.toISOString().split('T')[0]
    ]);
    setSliderMin(0);
    setSliderMax(100);
    return { minTs, maxTs };
  };

  const dateBounds = useMemo(() => {
    if (cards.length === 0) {
      const today = new Date();
      const yearAgo = new Date(today);
      yearAgo.setFullYear(today.getFullYear() - 1);
      return { minTs: yearAgo.getTime(), maxTs: today.getTime() };
    }
    const dates = cards.map((c) => new Date(c.date).getTime());
    return { minTs: Math.min(...dates), maxTs: Math.max(...dates) };
  }, [cards]);

  const visibleCardIds = useMemo(() => {
    const { minTs, maxTs } = dateBounds;
    const range = maxTs - minTs || 1;
    const startTs = minTs + (range * sliderMin) / 100;
    const endTs = minTs + (range * sliderMax) / 100;

    const set = new Set<string>();
    cards.forEach((card) => {
      const cardTs = new Date(card.date).getTime();
      const emotionMatch =
        filterEmotion === 'all' || card.emotion === filterEmotion;
      if (cardTs >= startTs && cardTs <= endTs && emotionMatch) {
        set.add(card.id);
      }
    });
    return set;
  }, [cards, sliderMin, sliderMax, filterEmotion, dateBounds]);

  const handleSelectCard = useCallback(
    (card: Card) => {
      if (!card || !card.id) {
        setSelectedCardId(null);
        return;
      }
      setSelectedCardId(card.id);
      setFocusCardId(card.id);
      setTimeout(() => setFocusCardId(null), 1000);
    },
    []
  );

  const handleDeleteCard = useCallback(async (card: Card) => {
    try {
      const deleted = await apiDeleteCard(card.id);
      setDeletedCard(deleted);
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      setSelectedCardId(null);

      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }

      let timeLeft = 5;
      setUndoTimer(timeLeft);
      const interval = setInterval(() => {
        timeLeft -= 1;
        setUndoTimer(timeLeft > 0 ? timeLeft : null);
        if (timeLeft <= 0) {
          clearInterval(interval);
          setDeletedCard(null);
        }
      }, 1000);

      undoTimerRef.current = setTimeout(() => {
        clearInterval(interval);
        setDeletedCard(null);
        setUndoTimer(null);
      }, 5000);
    } catch (err) {
      console.error('删除失败:', err);
    }
  }, []);

  const handleUndoDelete = useCallback(async () => {
    if (!deletedCard) return;

    try {
      const restored = await apiRestoreCard(deletedCard.id);
      setCards((prev) => [...prev, restored]);
      setDeletedCard(null);
      setUndoTimer(null);
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    } catch (err) {
      console.error('恢复失败:', err);
    }
  }, [deletedCard]);

  const handleReorder = useCallback(async (orderedIds: string[]) => {
    setCards((prev) => {
      const idOrderMap = new Map(orderedIds.map((id, i) => [id, i]));
      return [...prev].sort((a, b) => {
        const orderA = idOrderMap.get(a.id) ?? prev.length;
        const orderB = idOrderMap.get(b.id) ?? prev.length;
        return orderA - orderB;
      });
    });
    try {
      await reorderCards(orderedIds);
    } catch (err) {
      console.error('排序失败:', err);
    }
  }, []);

  const handleImageSelect = useCallback((file: File | null) => {
    setUploadError('');
    if (!file) {
      setPreviewImage('');
      setImageFile(null);
      return;
    }

    const error = validateImageFile(file);
    if (error) {
      setUploadError(error);
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleImageSelect(file);
  };

  const handleDropUpload = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0] || null;
    handleImageSelect(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!imageFile && !previewImage) {
      setUploadError('请上传一张图片');
      return;
    }
    if (!uploadForm.title.trim()) {
      setUploadError('请填写标题');
      return;
    }

    setIsUploading(true);
    try {
      const selectedCity = cities[uploadForm.cityIndex];
      const dominantColor = previewImage
        ? await extractDominantColor(previewImage)
        : EMOTION_COLORS[uploadForm.emotion];

      const formData = new FormData();
      formData.append('title', uploadForm.title.trim());
      formData.append('note', uploadForm.note.trim());
      formData.append('date', uploadForm.date);
      formData.append('lat', String(selectedCity.lat));
      formData.append('lng', String(selectedCity.lng));
      formData.append('city', selectedCity.name);
      formData.append('emotion', uploadForm.emotion);
      formData.append('dominantColor', dominantColor);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const newCard = await createCard(formData);
      setCards((prev) => [...prev, newCard]);
      setSelectedCardId(newCard.id);
      setFocusCardId(newCard.id);
      setTimeout(() => setFocusCardId(null), 1000);
      updateDateRange([...cards, newCard]);

      closeUploadModal();
    } catch (err) {
      setUploadError('上传失败，请重试');
      console.error('上传失败:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const openUploadModal = () => {
    setIsUploadModalOpen(true);
    setUploadForm({
      title: '',
      note: '',
      date: new Date().toISOString().split('T')[0],
      cityIndex: 0,
      emotion: '宁静'
    });
    setPreviewImage('');
    setImageFile(null);
    setUploadError('');
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadError('');
  };

  const handleSliderChange = (type: 'min' | 'max', value: number) => {
    if (type === 'min') {
      setSliderMin(Math.min(value, sliderMax - 1));
    } else {
      setSliderMax(Math.max(value, sliderMin + 1));
    }
  };

  const timelineLabels = useMemo(() => {
    const { minTs, maxTs } = dateBounds;
    const range = maxTs - minTs || 1;
    const labels = [];
    for (let i = 0; i <= 4; i++) {
      const ts = minTs + (range * i) / 4;
      const date = new Date(ts);
      labels.push({
        percent: i * 25,
        label: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`
      });
    }
    return labels;
  }, [dateBounds]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">🗺️</div>
        <p>加载旅途拼贴志中...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">🧳 旅途拼贴志</h1>
          <span className="app-subtitle">记录每一段珍贵的旅途记忆</span>
        </div>
        <div className="header-actions">
          <button className="mobile-panel-toggle" onClick={() => setIsPanelMobileOpen(true)}>
            📋 卡片列表
          </button>
          <button className="upload-btn" onClick={openUploadModal}>
            <span className="upload-icon">+</span>
            上传卡片
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="map-section">
          <MapView
            cards={cards}
            visibleCardIds={visibleCardIds}
            selectedCardId={selectedCardId}
            onSelectCard={handleSelectCard}
            onDeleteCard={handleDeleteCard}
            focusCardId={focusCardId}
          />

          <div className="timeline-container">
            <div className="timeline-label">时间轴</div>
            <div className="timeline-slider-wrapper">
              <div className="timeline-track">
                <div
                  className="timeline-selected"
                  style={{
                    top: `${sliderMin}%`,
                    height: `${sliderMax - sliderMin}%`
                  }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderMin}
                onChange={(e) => handleSliderChange('min', Number(e.target.value))}
                className="timeline-range timeline-range-min"
                orient="vertical"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={sliderMax}
                onChange={(e) => handleSliderChange('max', Number(e.target.value))}
                className="timeline-range timeline-range-max"
                orient="vertical"
              />
              <div className="timeline-labels">
                {timelineLabels.map((l) => (
                  <span
                    key={l.percent}
                    className="timeline-label-item"
                    style={{ top: `${l.percent}%` }}
                  >
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="panel-section">
          <CardPanel
            cards={cards}
            visibleCardIds={visibleCardIds}
            selectedCardId={selectedCardId}
            filterEmotion={filterEmotion}
            onFilterChange={setFilterEmotion}
            onSelectCard={handleSelectCard}
            onReorder={handleReorder}
            isMobileOpen={isPanelMobileOpen}
            onMobileClose={() => setIsPanelMobileOpen(false)}
          />
        </aside>
      </main>

      {isUploadModalOpen && (
        <div className="modal-overlay" onClick={closeUploadModal}>
          <div
            className="modal-content upload-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>📷 上传新卡片</h2>
              <button className="modal-close" onClick={closeUploadModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="upload-form">
              <div
                className={`upload-dropzone ${isDraggingOver ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDropUpload}
                onClick={() => fileInputRef.current?.click()}
              >
                {previewImage ? (
                  <div className="preview-wrapper">
                    <img src={previewImage} alt="预览" className="preview-image" />
                    <button
                      type="button"
                      className="preview-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage('');
                        setImageFile(null);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="dropzone-hint">
                    <div className="dropzone-icon">📤</div>
                    <p>点击或拖拽图片到此处</p>
                    <p className="dropzone-subhint">支持 JPG / PNG，最大 5MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                />
              </div>

              <div className="form-group">
                <label>标题 *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) =>
                    setUploadForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="给这段记忆起个名字"
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label>手写备注</label>
                <textarea
                  value={uploadForm.note}
                  onChange={(e) =>
                    setUploadForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  placeholder="记录此刻的心情..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>日期</label>
                  <input
                    type="date"
                    value={uploadForm.date}
                    onChange={(e) =>
                      setUploadForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>地点</label>
                  <select
                    value={uploadForm.cityIndex}
                    onChange={(e) =>
                      setUploadForm((prev) => ({
                        ...prev,
                        cityIndex: Number(e.target.value)
                      }))
                    }
                  >
                    {cities.map((city, idx) => (
                      <option key={city.name} value={idx}>
                        📍 {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>情感标签</label>
                <div className="emotion-picker">
                  {EMOTIONS.map((emotion) => (
                    <button
                      key={emotion}
                      type="button"
                      className={`emotion-option ${
                        uploadForm.emotion === emotion ? 'selected' : ''
                      }`}
                      onClick={() =>
                        setUploadForm((prev) => ({ ...prev, emotion }))
                      }
                      style={{
                        '--emotion-color': getEmotionColor(emotion)
                      } as React.CSSProperties}
                    >
                      {emotion}
                    </button>
                  ))}
                </div>
              </div>

              {uploadError && <div className="form-error">{uploadError}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeUploadModal}
                  disabled={isUploading}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isUploading}
                >
                  {isUploading ? '上传中...' : '✨ 创建卡片'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletedCard && (
        <div className="undo-toast">
          <span>🗑️ 已删除「{deletedCard.title}」</span>
          <button className="undo-btn" onClick={handleUndoDelete}>
            ↩️ 撤销 ({undoTimer || 0}s)
          </button>
        </div>
      )}
    </div>
  );
};

export default App;

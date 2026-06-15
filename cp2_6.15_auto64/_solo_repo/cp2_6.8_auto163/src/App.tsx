import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ImageItem, EditParams, defaultParams } from './types';
import ImageEditor from './components/ImageEditor';
import CompareView from './components/CompareView';

const MAX_IMAGES = 10;
const generateId = () => Math.random().toString(36).substring(2, 11);

const App: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedImage = images.find(img => img.id === selectedImageId) || null;

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newImages: ImageItem[] = [];
    const remaining = MAX_IMAGES - images.length;

    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newImages.push({
          id: generateId(),
          file,
          originalUrl: URL.createObjectURL(file),
          previewUrl: null,
          params: { ...defaultParams },
          selected: false,
        });
      }
    }

    setImages(prev => {
      const updated = [...prev, ...newImages];
      if (!selectedImageId && updated.length > 0) {
        setSelectedImageId(updated[0].id);
      }
      return updated;
    });
  }, [images.length, selectedImageId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const requestPreview = useCallback(async (imageId: string, params: EditParams) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return;

    if (debounceRefs.current[imageId]) {
      clearTimeout(debounceRefs.current[imageId]);
    }

    debounceRefs.current[imageId] = setTimeout(async () => {
      try {
        const formData = new FormData();
        formData.append('file', image.file);
        formData.append('filter_strength', String(params.filterStrength));
        formData.append('crop_ratio', params.cropRatio);
        formData.append('brightness', String(params.brightness));
        formData.append('contrast', String(params.contrast));

        const response = await fetch('/api/process', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setImages(prev => prev.map(img =>
            img.id === imageId ? { ...img, previewUrl: url } : img
          ));
        }
      } catch (err) {
        console.error('Preview request failed:', err);
      }
    }, 100);
  }, [images]);

  const handleParamsChange = useCallback((params: EditParams) => {
    if (!selectedImageId) return;
    setImages(prev => prev.map(img =>
      img.id === selectedImageId ? { ...img, params } : img
    ));
    requestPreview(selectedImageId, params);
  }, [selectedImageId, requestPreview]);

  const handleReset = useCallback(() => {
    if (!selectedImageId) return;
    setImages(prev => prev.map(img =>
      img.id === selectedImageId ? { ...img, params: { ...defaultParams }, previewUrl: null } : img
    ));
  }, [selectedImageId]);

  const handleDelete = useCallback((imageId: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      if (selectedImageId === imageId) {
        setSelectedImageId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  }, [selectedImageId]);

  const toggleSelect = useCallback((imageId: string) => {
    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, selected: !img.selected } : img
    ));
  }, []);

  const handleDownload = useCallback(async () => {
    const selectedImages = images.filter(img => img.selected);
    if (selectedImages.length === 0) {
      alert('请至少选择一张图片');
      return;
    }

    try {
      const formData = new FormData();
      selectedImages.forEach((img, idx) => {
        formData.append(`file_${idx}`, img.file);
        formData.append(`params_${idx}`, JSON.stringify({
          filter_strength: img.params.filterStrength,
          crop_ratio: img.params.cropRatio,
          brightness: img.params.brightness,
          contrast: img.params.contrast,
          filename: img.file.name,
        }));
      });
      formData.append('count', String(selectedImages.length));

      const response = await fetch('/api/export', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'processed_images.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('下载失败，请重试');
    }
  }, [images]);

  useEffect(() => {
    return () => {
      Object.values(debounceRefs.current).forEach(clearTimeout);
    };
  }, []);

  const editedImages = images.filter(img => img.previewUrl);

  return (
    <div className="app-container">
      <div
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
      >
        <div className="sidebar-header">
          <h2>图片列表</h2>
          <button
            className="hamburger-close"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <div
          className={`upload-area ${isDragOver ? 'dragover' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="upload-icon">📷</div>
          <p>拖拽或点击上传图片</p>
          <p className="upload-hint">支持 JPEG/PNG，最多 {MAX_IMAGES} 张</p>
        </div>

        <div className="thumbnail-grid">
          {images.map(img => (
            <div
              key={img.id}
              className={`thumbnail-item ${selectedImageId === img.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedImageId(img.id);
                setSidebarOpen(false);
              }}
            >
              <img src={img.originalUrl} alt="" className="thumbnail-img" />
              <div className="thumbnail-overlay">
                <label className="thumbnail-checkbox" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={img.selected}
                    onChange={() => toggleSelect(img.id)}
                  />
                  <span className="checkbox-custom" />
                </label>
                <button
                  className="thumbnail-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(img.id);
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="main-content">
        <div className="main-header">
          <button
            className="hamburger-menu"
            onClick={() => setSidebarOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <h1>图片批量处理工具</h1>
          <button
            className="download-btn"
            onClick={handleDownload}
            disabled={images.filter(i => i.selected).length === 0}
          >
            打包下载 ({images.filter(i => i.selected).length})
          </button>
        </div>

        <div className="editor-section">
          {selectedImage ? (
            <ImageEditor
              imageUrl={selectedImage.originalUrl}
              previewUrl={selectedImage.previewUrl}
              params={selectedImage.params}
              onChange={handleParamsChange}
              onReset={handleReset}
            />
          ) : (
            <div className="empty-state">
              <p>请上传或选择一张图片开始编辑</p>
            </div>
          )}
        </div>

        {editedImages.length > 0 && (
          <div className="compare-section">
            <h3>对比预览</h3>
            <div className="compare-grid">
              {editedImages.map(img => (
                <div key={img.id} className="compare-card">
                  <CompareView
                    originalUrl={img.originalUrl}
                    editedUrl={img.previewUrl!}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

import React, { useState, useCallback, useRef } from 'react';
import { saveAs } from 'file-saver';
import ImageUploader from './components/ImageUploader';
import FilterPanel from './components/FilterPanel';
import PreviewArea from './components/PreviewArea';
import {
  FilterParams,
  AppliedFilter,
  filterConfigs,
  applyFiltersSequential
} from './utils/filterEngine';

interface HistoryState {
  imageData: ImageData;
  appliedFilters: AppliedFilter[];
}

const App: React.FC = () => {
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const originalFileRef = useRef<File | null>(null);

  const handleImageUpload = useCallback((file: File, imageData: ImageData) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setFileName(file.name);
    setFileSize(file.size);
    setOriginalImageData(imageData);
    setProcessedImageData(imageData);
    setAppliedFilters([]);
    setHistory([]);
    originalFileRef.current = file;
  }, []);

  const handleResetUpload = useCallback(() => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);
    setFileName('');
    setFileSize(0);
    setOriginalImageData(null);
    setProcessedImageData(null);
    setAppliedFilters([]);
    setHistory([]);
    originalFileRef.current = null;
  }, [imageUrl]);

  const handleApplyFilter = useCallback((filterType: keyof FilterParams, value: number) => {
    if (!processedImageData || !originalImageData) return;

    setIsProcessing(true);

    setTimeout(() => {
      const startTime = performance.now();

      const config = filterConfigs[filterType];
      const newFilter: AppliedFilter = {
        type: filterType,
        value,
        name: config.name,
        unit: config.unit
      };

      const newAppliedFilters = [...appliedFilters, newFilter];
      
      const result = applyFiltersSequential(originalImageData, newAppliedFilters);
      
      setHistory(prev => [...prev, {
        imageData: processedImageData,
        appliedFilters
      }]);
      
      setProcessedImageData(result);
      setAppliedFilters(newAppliedFilters);
      setIsProcessing(false);

      console.debug(`总处理时间: ${(performance.now() - startTime).toFixed(2)}ms`);
    }, 0);
  }, [processedImageData, originalImageData, appliedFilters]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const prevState = history[history.length - 1];
    setProcessedImageData(prevState.imageData);
    setAppliedFilters(prevState.appliedFilters);
    setHistory(prev => prev.slice(0, -1));
  }, [history]);

  const handleSave = useCallback(() => {
    if (!processedImageData) return;

    const canvas = document.createElement('canvas');
    canvas.width = processedImageData.width;
    canvas.height = processedImageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(processedImageData, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        saveAs(blob, `${baseName}_styled.png`);
      }
    }, 'image/png');
  }, [processedImageData, fileName]);

  const handleResetAll = useCallback(() => {
    if (originalImageData) {
      setProcessedImageData(originalImageData);
      setAppliedFilters([]);
      setHistory([]);
    }
  }, [originalImageData]);

  const hasImage = !!originalImageData;
  const canUndo = history.length > 0;
  const canSave = !!processedImageData && appliedFilters.length > 0;
  const canReset = appliedFilters.length > 0;

  return (
    <div className="app-container">
      <h1 className="app-title">实时图片风格迁移工具</h1>
      
      <div className="main-content">
        <div className="top-section">
          <ImageUploader
            onImageUpload={handleImageUpload}
            onReset={handleResetUpload}
            imageUrl={imageUrl}
            fileName={fileName}
            fileSize={fileSize}
          />
          <PreviewArea
            imageData={processedImageData}
            appliedFilters={appliedFilters}
          />
        </div>

        {hasImage && (
          <FilterPanel
            onApplyFilter={handleApplyFilter}
            disabled={isProcessing}
          />
        )}

        {hasImage && (
          <div className="bottom-actions">
            <button
              className="btn-action btn-undo"
              onClick={handleUndo}
              disabled={!canUndo || isProcessing}
            >
              撤销
            </button>
            <button
              className="btn-action btn-save"
              onClick={handleSave}
              disabled={!canSave || isProcessing}
            >
              保存
            </button>
            <button
              className="btn-action btn-reset"
              onClick={handleResetAll}
              disabled={!canReset || isProcessing}
            >
              重置
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

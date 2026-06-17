import React, { useRef, useState, useCallback } from 'react';
import { Frame } from './types';

interface FrameUploaderProps {
  frames: Frame[];
  onFramesChange: (frames: Frame[]) => void;
  onFramesReorder?: (frames: Frame[]) => void;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const FrameUploader: React.FC<FrameUploaderProps> = ({
  frames,
  onFramesChange,
  onFramesReorder,
  selectedIndex,
  onSelect,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const pngFiles = Array.from(files).filter(
      (f) => f.type === 'image/png' && frames.length < 12
    );
    const remainingSlots = 12 - frames.length;
    const filesToAdd = pngFiles.slice(0, remainingSlots);

    const newFrames: Frame[] = await Promise.all(
      filesToAdd.map(
        (file) =>
          new Promise<Frame>((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
              resolve({
                id: `${file.name}-${Date.now()}-${Math.random()}`,
                file,
                url,
                name: file.name,
                width: img.width,
                height: img.height,
              });
            };
            img.src = url;
          })
      )
    );

    const updatedFrames = [...frames, ...newFrames].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    onFramesChange(updatedFrames);
  }, [frames, onFramesChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const handleThumbDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleThumbDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleThumbDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceIndex = dragIndex;
    setDragIndex(null);
    setDragOverIndex(null);

    if (sourceIndex === null || sourceIndex === dropIndex) {
      return;
    }

    const newFrames = [...frames];
    const [removed] = newFrames.splice(sourceIndex, 1);
    newFrames.splice(dropIndex, 0, removed);

    if (onFramesReorder) {
      onFramesReorder(newFrames);
    } else {
      onFramesChange(newFrames);
      if (selectedIndex === sourceIndex) {
        onSelect(dropIndex);
      } else if (sourceIndex < selectedIndex && dropIndex >= selectedIndex) {
        onSelect(selectedIndex - 1);
      } else if (sourceIndex > selectedIndex && dropIndex <= selectedIndex) {
        onSelect(selectedIndex + 1);
      }
    }
  };

  const handleThumbDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const removeFrame = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newFrames = frames.filter((_, i) => i !== index);
    URL.revokeObjectURL(frames[index].url);
    onFramesChange(newFrames);
    if (selectedIndex >= newFrames.length && newFrames.length > 0) {
      onSelect(newFrames.length - 1);
    } else if (selectedIndex >= index && selectedIndex > 0) {
      onSelect(selectedIndex - 1);
    }
  };

  return (
    <div className="frame-uploader">
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-icon">📁</div>
        <div className="upload-text">拖拽或点击上传 PNG 图片</div>
        <div className="upload-hint">最多 12 张，按文件名排序</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className="frames-count">
        帧列表 ({frames.length}/12)
      </div>

      <div className="thumbnails-track">
        {frames.map((frame, index) => (
          <div
            key={frame.id}
            className={`thumbnail-wrapper ${selectedIndex === index ? 'selected' : ''} ${dragOverIndex === index ? 'drag-over' : ''} ${dragIndex === index ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => handleThumbDragStart(e, index)}
            onDragOver={(e) => handleThumbDragOver(e, index)}
            onDrop={(e) => handleThumbDrop(e, index)}
            onDragEnd={handleThumbDragEnd}
            onClick={() => onSelect(index)}
          >
            <div className="thumbnail-index">{index + 1}</div>
            <img src={frame.url} alt={frame.name} className="thumbnail" />
            <button
              className="remove-btn"
              onClick={(e) => removeFrame(e, index)}
              title="删除"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FrameUploader;

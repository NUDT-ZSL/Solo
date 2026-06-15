import React, { useState, useRef, useCallback } from 'react';
import { PointData } from '../../utils/types';
import PointCloudWorker from '../pointcloud/PointCloudWorker?worker';

interface UploadZoneProps {
  onFileUpload: (file: File) => void;
  onParseProgress: (progress: number) => void;
  onParseComplete: (data: PointData) => void;
  onParseError: (error: string) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({
  onFileUpload,
  onParseProgress,
  onParseComplete,
  onParseError
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const initWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new PointCloudWorker();
      
      workerRef.current.onmessage = (e: MessageEvent) => {
        const { type, payload } = e.data;
        
        if (type === 'progress') {
          onParseProgress(payload.progress);
        } else if (type === 'complete') {
          onParseComplete(payload.pointData);
        } else if (type === 'error') {
          onParseError(payload.error);
        }
      };
      
      workerRef.current.onerror = (error) => {
        onParseError(error.message);
      };
    }
    return workerRef.current;
  }, [onParseProgress, onParseComplete, onParseError]);

  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.ply')) {
      onParseError('请上传PLY格式的点云文件');
      return;
    }

    onFileUpload(file);
    const worker = initWorker();

    const reader = new FileReader();
    
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 15;
        onParseProgress(progress);
      }
    };

    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        worker.postMessage({
          type: 'parse',
          payload: {
            arrayBuffer,
            fileName: file.name
          }
        }, [arrayBuffer]);
      }
    };

    reader.onerror = () => {
      onParseError('文件读取失败');
    };

    reader.readAsArrayBuffer(file);
  }, [onFileUpload, onParseProgress, onParseError, initWorker]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFile]);

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".ply"
        className="file-input"
        onChange={handleFileChange}
      />
      <div className="upload-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <div className="upload-text">
        <strong>拖拽点云文件到此处</strong>
        <br />
        或点击选择文件
        <br />
        <span style={{ fontSize: '12px', opacity: 0.7 }}>支持 PLY 格式</span>
      </div>
    </div>
  );
};

export default UploadZone;

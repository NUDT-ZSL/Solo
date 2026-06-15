import React, { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import type { DataRow } from '../types';

interface FileUploaderProps {
  onDataLoaded: (columns: string[], data: DataRow[]) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const PARSING_TIMEOUT = 3000;

const FileUploader: React.FC<FileUploaderProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('请上传CSV格式的文件');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('文件大小不能超过20MB');
      return;
    }

    setIsParsing(true);
    setProgress(0);

    const timeoutId = setTimeout(() => {
      setIsParsing(false);
      setProgress(0);
      setError('文件解析超时，请检查文件格式');
    }, PARSING_TIMEOUT);

    let progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 5;
      });
    }, 100);

    Papa.parse<DataRow>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        clearTimeout(timeoutId);
        clearInterval(progressInterval);
        setProgress(100);

        setTimeout(() => {
          setIsParsing(false);
          setProgress(0);

          const data = results.data;
          if (data.length === 0) {
            setError('CSV文件为空或格式不正确');
            return;
          }

          const columns = Object.keys(data[0]);
          if (columns.length === 0) {
            setError('未检测到有效列');
            return;
          }

          onDataLoaded(columns, data);
        }, 300);
      },
      error: (parseError) => {
        clearTimeout(timeoutId);
        clearInterval(progressInterval);
        setIsParsing(false);
        setProgress(0);
        setError(`解析错误: ${parseError.message}`);
      }
    });
  }, [onDataLoaded]);

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
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  return (
    <div className="uploader-container">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
        <div className="drop-icon">📊</div>
        <p className="drop-text">
          {isDragging ? '松开以上传文件' : '拖拽CSV文件到此处，或点击选择文件'}
        </p>
        <p className="drop-hint">支持最大20MB</p>
      </div>

      {isParsing && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">正在解析文件... {progress}%</span>
        </div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}
    </div>
  );
};

export default FileUploader;

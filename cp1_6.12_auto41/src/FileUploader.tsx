import React, { useCallback, useRef, useState } from 'react';
import { parseLRC } from './LyricsParser';
import { useLyricsStore } from './store/useLyricsStore';

interface FileUploaderProps {
  onFileLoaded?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setLyricsData = useLyricsStore((state) => state.setLyricsData);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.lrc')) {
      alert('请上传 LRC 格式的歌词文件');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const reader = new FileReader();
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 80);
          setUploadProgress(progress);
        }
      };

      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        setTimeout(() => {
          setUploadProgress(90);
        }, 100);

        try {
          const parsedData = parseLRC(content);
          
          setTimeout(() => {
            setUploadProgress(100);
            setLyricsData(parsedData);
            
            setTimeout(() => {
              setIsUploading(false);
              setUploadProgress(0);
              onFileLoaded?.();
            }, 300);
          }, 200);
        } catch (error) {
          console.error('解析 LRC 文件失败:', error);
          alert('解析 LRC 文件失败，请检查文件格式');
          setIsUploading(false);
          setUploadProgress(0);
        }
      };

      reader.onerror = () => {
        alert('读取文件失败');
        setIsUploading(false);
        setUploadProgress(0);
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('处理文件失败:', error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [setLyricsData, onFileLoaded]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

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
    <div
      className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={!isUploading ? handleClick : undefined}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".lrc"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
      
      <div className="upload-icon">📜</div>
      <p><strong>点击或拖拽上传 LRC 歌词文件</strong></p>
      <p>支持 .lrc 格式，自动解析时间轴</p>
      
      {isUploading && (
        <div style={{ marginTop: '16px' }}>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p style={{ marginTop: '8px', fontSize: '12px' }}>
            {uploadProgress < 100 ? '正在解析...' : '解析完成！'}
          </p>
        </div>
      )}
    </div>
  );
};

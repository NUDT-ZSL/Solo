import React, { useState, useRef, memo } from 'react';
import { UploadOutlined, FileAudioOutlined, InboxOutlined } from '@ant-design/icons';

interface AudioUploaderProps {
  onFileLoaded: (file: File) => void;
  disabled?: boolean;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({ onFileLoaded, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileLoaded(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file && isValidAudioFile(file)) {
      onFileLoaded(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const isValidAudioFile = (file: File): boolean => {
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav'];
    const validExtensions = ['.mp3', '.wav', '.ogg'];
    const lowerName = file.name.toLowerCase();
    return (
      validTypes.includes(file.type) ||
      validExtensions.some((ext) => lowerName.endsWith(ext))
    );
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`audio-uploader ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mp3,audio/wav,audio/ogg,.mp3,.wav,.ogg"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div className="uploader-content">
        <div className="uploader-icon">
          {isDragging ? <InboxOutlined /> : <UploadOutlined />}
        </div>
        <div className="uploader-text">
          <p className="uploader-title">
            {isDragging ? '释放以上传文件' : '点击或拖拽音频文件到这里'}
          </p>
          <p className="uploader-subtitle">支持 MP3、WAV、OGG 格式</p>
        </div>
        <button className="upload-btn">
          <FileAudioOutlined />
          选择文件
        </button>
      </div>
    </div>
  );
};

export default memo(AudioUploader);

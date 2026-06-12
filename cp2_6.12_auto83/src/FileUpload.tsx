import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileJson } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (fileContent: string, fileName: string) => void;
  onError?: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      onError?.('请上传JSON格式文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        onFileUpload(content, file.name);
      }
    };
    reader.onerror = () => {
      onError?.('文件读取失败');
    };
    reader.readAsText(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      animate={{
        backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        borderColor: isDragging ? '#3B82F6' : '#D1D5DB',
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{
        border: '2px dashed #D1D5DB',
        borderRadius: '12px',
        padding: '48px 32px',
        textAlign: 'center',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}
      whileHover={{ borderColor: '#9CA3AF' }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />
      
      <motion.div
        animate={{ y: isDragging ? -4 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isDragging ? (
          <FileJson size={48} style={{ color: '#3B82F6' }} />
        ) : (
          <Upload size={48} style={{ color: '#9CA3AF' }} />
        )}
      </motion.div>
      
      <div>
        <p style={{ fontSize: '15px', fontWeight: 500, color: '#374151', margin: '0 0 4px 0' }}>
          {isDragging ? '释放以上传文件' : '拖拽JSON文件到这里'}
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
          或点击选择文件
        </p>
      </div>
      
      <p style={{ fontSize: '12px', color: '#D1D5DB', margin: '8px 0 0 0' }}>
        支持格式：[{"date": "2024-01", "value": 100, "category": "A"}]
      </p>
    </motion.div>
  );
};

interface SuccessToastProps {
  message: string;
  isVisible: boolean;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({ message, isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#10B981',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

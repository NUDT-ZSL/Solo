import { useState, useRef, useCallback } from 'react';
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onUpload: (file: File) => Promise<{ url: string; filename: string }>;
  onUploadComplete?: (url: string, filename: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  label?: string;
  description?: string;
}

export default function FileUpload({
  onUpload,
  onUploadComplete,
  maxSizeMB = 15,
  acceptedTypes = ['.glb'],
  label = '上传模型文件',
  description = '支持 .glb 格式，最大 15MB',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!acceptedTypes.includes(ext)) {
        return `仅支持 ${acceptedTypes.join(', ')} 格式文件`;
      }
      
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return `文件大小不能超过 ${maxSizeMB}MB`;
      }
      
      return null;
    },
    [acceptedTypes, maxSizeMB]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      setError(null);
      setUploaded(false);
      
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;
    
    setUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);
      
      const result = await onUpload(selectedFile);
      
      clearInterval(progressInterval);
      setProgress(100);
      setUploaded(true);
      
      onUploadComplete?.(result.url, result.filename);
    } catch (err) {
      setError('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    setUploaded(false);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      
      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : error
              ? 'border-red-500/50 bg-red-500/5 hover:bg-red-500/10'
              : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
          }`}
        >
          <Upload
            className={`w-12 h-12 mx-auto mb-3 ${
              error ? 'text-red-400' : 'text-slate-500'
            }`}
          />
          <p className="text-slate-300 font-medium mb-1">
            点击或拖拽文件到此处上传
          </p>
          <p className="text-sm text-slate-500">{description}</p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <File className="w-5 h-5 text-blue-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-400">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            
            {uploaded ? (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">已上传</span>
              </div>
            ) : uploading ? (
              <span className="text-sm text-blue-400">上传中...</span>
            ) : (
              <button
                onClick={handleRemoveFile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {uploading && (
            <div className="mt-3">
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 text-right">
                {progress}%
              </p>
            </div>
          )}
          
          {!uploading && !uploaded && (
            <button
              onClick={handleUpload}
              className="w-full mt-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-200 active:scale-[0.98]"
            >
              开始上传
            </button>
          )}
        </div>
      )}
      
      {error && (
        <div className="flex items-start gap-2 text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}

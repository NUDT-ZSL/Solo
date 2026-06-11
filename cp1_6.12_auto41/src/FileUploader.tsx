import React, { useCallback, useRef, useState, useEffect } from 'react';
import { parseLRCStreaming, ParseProgressEvent } from './LyricsParser';
import { useLyricsStore } from './store/useLyricsStore';

interface FileUploaderProps {
  onFileLoaded?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'reading' | 'parsing' | 'loading'>('reading');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTargetRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const setLyricsData = useLyricsStore((state) => state.setLyricsData);

  useEffect(() => {
    if (!isUploading) return;

    const animate = () => {
      setDisplayProgress((prev) => {
        const target = progressTargetRef.current;
        const diff = target - prev;
        if (Math.abs(diff) < 0.1) {
          return target;
        }
        return prev + diff * 0.15;
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isUploading]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.lrc')) {
      alert('请上传 LRC 格式的歌词文件');
      return;
    }

    setIsUploading(true);
    setDisplayProgress(0);
    progressTargetRef.current = 0;
    setCurrentPhase('reading');

    try {
      const reader = new FileReader();
      
      reader.onprogress = (e: ProgressEvent<FileReader>) => {
        if (e.lengthComputable) {
          const readProgress = (e.loaded / e.total) * 60;
          progressTargetRef.current = readProgress;
        }
      };

      reader.onload = async (e) => {
        const content = e.target?.result as string;
        progressTargetRef.current = 60;
        setCurrentPhase('parsing');

        try {
          let parsedResult: ReturnType<typeof import('./LyricsParser').parseLRC> | null = null;
          
          await parseLRCStreaming(content, (event: ParseProgressEvent) => {
            const parseProgress = 60 + (event.progress / 100) * 30;
            progressTargetRef.current = parseProgress;
            
            if (event.result) {
              parsedResult = event.result;
            }
          });

          if (!parsedResult) {
            parsedResult = (await import('./LyricsParser')).parseLRC(content);
          }

          setCurrentPhase('loading');
          progressTargetRef.current = 95;

          setTimeout(() => {
            progressTargetRef.current = 100;
            
            setTimeout(() => {
              setLyricsData(parsedResult!);
              
              setTimeout(() => {
                setIsUploading(false);
                setDisplayProgress(0);
                progressTargetRef.current = 0;
                onFileLoaded?.();
              }, 400);
            }, 200);
          }, 150);
        } catch (error) {
          console.error('解析 LRC 文件失败:', error);
          alert('解析 LRC 文件失败，请检查文件格式');
          setIsUploading(false);
          setDisplayProgress(0);
          progressTargetRef.current = 0;
        }
      };

      reader.onerror = () => {
        alert('读取文件失败');
        setIsUploading(false);
        setDisplayProgress(0);
        progressTargetRef.current = 0;
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('处理文件失败:', error);
      setIsUploading(false);
      setDisplayProgress(0);
      progressTargetRef.current = 0;
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
      
      {!isUploading ? (
        <>
          <div className="upload-icon">📜</div>
          <p><strong>点击或拖拽上传 LRC 歌词文件</strong></p>
          <p>支持 .lrc 格式，自动解析时间轴</p>
        </>
      ) : (
        <div style={{ width: '100%', padding: '8px 0' }}>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'var(--accent-color)',
              marginBottom: '12px',
              fontFamily: 'monospace',
              textShadow: '0 0 20px var(--accent-glow)',
            }}
          >
            {Math.round(displayProgress * 10) / 10}%
          </div>
          <div
            className="progress-bar"
            style={{
              height: '12px',
              borderRadius: '6px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              className="progress-bar-fill"
              style={{
                width: `${displayProgress}%`,
                height: '100%',
                transition: 'none',
              }}
            />
          </div>
          <p style={{ marginTop: '12px', fontSize: '14px', fontWeight: 500 }}>
            {currentPhase === 'reading'
              ? '📖 正在读取文件...'
              : currentPhase === 'parsing'
              ? '🔍 正在解析歌词时间轴...'
              : displayProgress < 100
              ? '✨ 正在加载歌词数据...'
              : '✅ 解析完成！即将进入编辑界面...'}
          </p>
        </div>
      )}
    </div>
  );
};

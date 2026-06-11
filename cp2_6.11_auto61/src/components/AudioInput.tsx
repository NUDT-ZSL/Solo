import React, { useState, useRef, useCallback } from 'react';
import { AudioAnalyzer } from '../utils/audioAnalyzer';

interface AudioInputProps {
  onAudioLoaded: () => void;
  onAudioElementCreated?: (audio: HTMLAudioElement) => void;
  onAnalyzerCreated?: (analyzer: AudioAnalyzer) => void;
}

const AudioInput: React.FC<AudioInputProps> = ({
  onAudioLoaded,
  onAudioElementCreated,
  onAnalyzerCreated,
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  const getOrCreateAnalyzer = useCallback((): AudioAnalyzer => {
    if (!analyzerRef.current) {
      analyzerRef.current = new AudioAnalyzer();
      if (onAnalyzerCreated) {
        onAnalyzerCreated(analyzerRef.current);
      }
    }
    return analyzerRef.current;
  }, [onAnalyzerCreated]);

  const loadFromUrl = useCallback(async () => {
    if (!url.trim()) {
      setError('请输入音频URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.crossOrigin = 'anonymous';
        audioRef.current.loop = true;
        if (onAudioElementCreated) {
          onAudioElementCreated(audioRef.current);
        }
      }

      const analyzer = getOrCreateAnalyzer();

      try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        audioRef.current.src = proxyUrl;
      } catch {
        audioRef.current.src = url;
      }
      
      await new Promise<void>((resolve, reject) => {
        if (!audioRef.current) {
          reject(new Error('Audio element not found'));
          return;
        }
        const onCanPlay = () => {
          audioRef.current?.removeEventListener('canplay', onCanPlay);
          audioRef.current?.removeEventListener('error', onError);
          resolve();
        };
        const onError = () => {
          audioRef.current?.removeEventListener('canplay', onCanPlay);
          audioRef.current?.removeEventListener('error', onError);
          
          if (audioRef.current && audioRef.current.src !== url) {
            audioRef.current.src = url;
            audioRef.current.addEventListener('canplay', onCanPlay, { once: true });
            audioRef.current.addEventListener('error', () => reject(new Error('音频加载失败')), { once: true });
          } else {
            reject(new Error('音频加载失败'));
          }
        };
        audioRef.current.addEventListener('canplay', onCanPlay, { once: true });
        audioRef.current.addEventListener('error', onError, { once: true });
      });

      await analyzer.loadFromElement(audioRef.current);
      
      onAudioLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败，请检查URL是否有效');
      console.error('URL加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [url, getOrCreateAnalyzer, onAudioElementCreated, onAudioLoaded]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const analyzer = getOrCreateAnalyzer();
      
      const audioBuffer = await analyzer.decodeAudioData(arrayBuffer);
      await analyzer.loadFromBuffer(audioBuffer);
      
      const source = analyzer.getSource() as AudioBufferSourceNode;
      if (source) {
        source.loop = true;
        try {
          source.start();
        } catch (err) {
          console.warn('Source start warning:', err);
        }
      }
      
      onAudioLoaded();
    } catch (err) {
      setError('文件解码失败，请确保是有效的音频文件');
      console.error('文件加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [getOrCreateAnalyzer, onAudioLoaded]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      loadFromUrl();
    }
  };

  return (
    <div className="audio-input-section">
      <label className="section-label">音乐输入</label>
      <div className="audio-input">
        <input
          type="text"
          placeholder="输入音频URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button onClick={loadFromUrl} disabled={loading}>
          {loading ? '...' : '加载'}
        </button>
      </div>
      <div
        className="upload-btn"
        onClick={handleUploadClick}
        onKeyDown={(e) => e.key === 'Enter' && handleUploadClick()}
        role="button"
        tabIndex={0}
      >
        {loading ? '加载中...' : '点击上传音频文件'}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="upload-input"
      />
      {error && (
        <div style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '4px', lineHeight: 1.4 }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default AudioInput;

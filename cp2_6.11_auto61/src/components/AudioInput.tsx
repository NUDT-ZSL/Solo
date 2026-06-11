import React, { useState, useRef, useCallback } from 'react';
import { AudioAnalyzer } from '../utils/audioAnalyzer';

interface AudioInputProps {
  onAudioLoaded: () => void;
  onAudioAnalyzer?: (analyzer: AudioAnalyzer) => void;
}

const AudioInput: React.FC<AudioInputProps> = ({ onAudioLoaded, onAudioAnalyzer }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

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
      }

      if (!analyzerRef.current) {
        analyzerRef.current = new AudioAnalyzer();
      }

      audioRef.current.src = url;
      
      await new Promise<void>((resolve, reject) => {
        if (!audioRef.current) {
          reject(new Error('Audio element not found'));
          return;
        }
        audioRef.current.oncanplay = () => resolve();
        audioRef.current.onerror = () => reject(new Error('音频加载失败'));
      });

      await analyzerRef.current.loadFromElement(audioRef.current);
      
      if (onAudioAnalyzer) {
        onAudioAnalyzer(analyzerRef.current);
      }
      
      onAudioLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败，请检查URL是否有效');
      console.error('URL加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [url, onAudioLoaded, onAudioAnalyzer]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      if (!analyzerRef.current) {
        analyzerRef.current = new AudioAnalyzer();
      }

      const audioBuffer = await analyzerRef.current.decodeAudioData(arrayBuffer);
      await analyzerRef.current.loadFromBuffer(audioBuffer);
      
      if (onAudioAnalyzer) {
        onAudioAnalyzer(analyzerRef.current);
      }
      
      onAudioLoaded();
    } catch (err) {
      setError('文件解码失败，请确保是有效的音频文件');
      console.error('文件加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [onAudioLoaded, onAudioAnalyzer]);

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
      <div className="upload-btn" onClick={handleUploadClick}>
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
        <div style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '4px' }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default AudioInput;

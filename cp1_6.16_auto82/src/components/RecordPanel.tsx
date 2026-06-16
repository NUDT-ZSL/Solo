import { useState, useEffect, useRef, useCallback } from 'react';
import { getSamples, getSampleDetail, getSampleAudioUrl, Sample, SampleDetail, submitRecording } from '../utils/api';
import { evaluatePronunciation, AlignmentResult, extractWaveformSamples } from '../utils/audioProcessor';

interface RecordPanelProps {
  language: 'en' | 'ja';
  level: 1 | 2 | 3;
  selectedSampleId: string;
  onSampleSelect: (id: string) => void;
  onLanguageChange: (lang: 'en' | 'ja') => void;
  onLevelChange: (level: 1 | 2 | 3) => void;
  onEvaluationComplete: (result: AlignmentResult) => void;
  userId: string;
}

function RecordPanel({
  language,
  level,
  selectedSampleId,
  onSampleSelect,
  onLanguageChange,
  onLevelChange,
  onEvaluationComplete,
  userId
}: RecordPanelProps) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedSample, setSelectedSample] = useState<SampleDetail | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [waveformData, setWaveformData] = useState<Float32Array>(new Float32Array(100));
  const [recordedAudio, setRecordedAudio] = useState<Float32Array | null>(null);
  const [isPlayingReference, setIsPlayingReference] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const data = await getSamples(language, level);
        setSamples(data);
        if (data.length > 0 && !selectedSampleId) {
          onSampleSelect(data[0].id);
        }
      } catch (e) {
        console.error('Failed to fetch samples:', e);
      }
    };
    fetchSamples();
  }, [language, level]);

  useEffect(() => {
    if (selectedSampleId) {
      const fetchDetail = async () => {
        try {
          const detail = await getSampleDetail(selectedSampleId);
          setSelectedSample(detail);
        } catch (e) {
          console.error('Failed to fetch sample detail:', e);
        }
      };
      fetchDetail();
    }
  }, [selectedSampleId]);

  useEffect(() => {
    if (selectedSample) {
      generateReferenceWaveform();
    }
  }, [selectedSample]);

  const generateReferenceWaveform = useCallback(() => {
    if (!selectedSample) return;
    
    const sampleCount = 500;
    const waveform = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const t = i / sampleCount;
      waveform[i] = Math.sin(t * Math.PI * 10) * 0.5 + 
                    Math.sin(t * Math.PI * 3 + 1) * 0.3 +
                    Math.random() * 0.2 - 0.1;
      waveform[i] *= Math.sin(t * Math.PI);
    }
    setWaveformData(waveform);
  }, [selectedSample]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, width, height);

    if (waveformData.length === 0) return;

    const samplesPerBar = Math.max(1, Math.floor(waveformData.length / width));

    ctx.fillStyle = isRecording ? '#3498DB' : '#95A5A6';
    
    for (let i = 0; i < width; i++) {
      const startIdx = i * samplesPerBar;
      let maxAmplitude = 0;
      
      for (let j = 0; j < samplesPerBar && startIdx + j < waveformData.length; j++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(waveformData[startIdx + j]));
      }

      const barHeight = maxAmplitude * (height * 0.8);
      const barX = i;
      const barY = centerY - barHeight / 2;
      const barWidth = 2;

      if (isRecording) {
        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.9)');
        gradient.addColorStop(0.5, 'rgba(52, 152, 219, 1)');
        gradient.addColorStop(1, 'rgba(52, 152, 219, 0.9)');
        ctx.fillStyle = gradient;
      }

      ctx.fillRect(barX, barY, barWidth, barHeight);
    }
  }, [waveformData, isRecording]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;
      audioChunksRef.current = [];

      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      setIsRecording(true);

      const updateWaveform = () => {
        const now = Date.now();
        if (now - lastUpdateRef.current >= 100) {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteTimeDomainData(dataArray);
          
          const floatData = new Float32Array(dataArray.length);
          for (let i = 0; i < dataArray.length; i++) {
            floatData[i] = (dataArray[i] - 128) / 128;
          }
          
          const sampled = extractWaveformSamples(floatData, 300);
          setWaveformData(sampled);
          lastUpdateRef.current = now;
        }
        
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    } catch (e) {
      console.error('Failed to start recording:', e);
      alert(language === 'en' ? '无法访问麦克风，请检查权限设置' : 'マイクにアクセスできません。権限設定を確認してください');
    }
  };

  const stopRecording = async () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setIsProcessing(true);

    try {
      const totalLength = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
      const fullAudio = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of audioChunksRef.current) {
        fullAudio.set(chunk, offset);
        offset += chunk.length;
      }

      setRecordedAudio(fullAudio);

      if (selectedSample && fullAudio.length > 0) {
        const result = evaluatePronunciation(
          fullAudio,
          selectedSample.features,
          selectedSample.phonemes,
          44100,
          language
        );

        await submitRecording(
          userId,
          selectedSample.id,
          result.overallScore,
          result.duration,
          result.phonemeScores
        );

        setTimeout(() => {
          setIsProcessing(false);
          onEvaluationComplete(result);
        }, 500);
      } else {
        setIsProcessing(false);
      }
    } catch (e) {
      console.error('Processing failed:', e);
      setIsProcessing(false);
    }
  };

  const playReference = () => {
    if (!selectedSample) return;

    const audio = new Audio(getSampleAudioUrl(selectedSample.id));
    audioRef.current = audio;
    
    audio.onplay = () => setIsPlayingReference(true);
    audio.onended = () => setIsPlayingReference(false);
    audio.onerror = () => {
      setIsPlayingReference(false);
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + selectedSample.duration);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + selectedSample.duration);
      setIsPlayingReference(true);
      setTimeout(() => setIsPlayingReference(false), selectedSample.duration * 1000);
    };
    
    audio.play().catch(() => {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + selectedSample.duration);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + selectedSample.duration);
      setIsPlayingReference(true);
      setTimeout(() => setIsPlayingReference(false), selectedSample.duration * 1000);
    });
  };

  const handleSampleClick = (sample: Sample) => {
    onSampleSelect(sample.id);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.leftPanel}>
        <div style={styles.settingsCard}>
          <h3 style={styles.cardTitle}>设置</h3>
          
          <div style={styles.settingGroup}>
            <label style={styles.settingLabel}>语言</label>
            <div style={styles.buttonGroup}>
              <button
                style={{
                  ...styles.langButton,
                  ...(language === 'en' ? styles.langButtonActive : {})
                }}
                onClick={() => onLanguageChange('en')}
              >
                英语
              </button>
              <button
                style={{
                  ...styles.langButton,
                  ...(language === 'ja' ? styles.langButtonActive : {})
                }}
                onClick={() => onLanguageChange('ja')}
              >
                日语
              </button>
            </div>
          </div>

          <div style={styles.settingGroup}>
            <label style={styles.settingLabel}>难度等级</label>
            <div style={styles.buttonGroup}>
              {[1, 2, 3].map(lvl => (
                <button
                  key={lvl}
                  style={{
                    ...styles.levelButton,
                    ...(level === lvl ? styles.levelButtonActive : {})
                  }}
                  onClick={() => onLevelChange(lvl as 1 | 2 | 3)}
                >
                  {lvl === 1 ? '初级' : lvl === 2 ? '中级' : '高级'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.samplesCard}>
          <h3 style={styles.cardTitle}>范音列表</h3>
          <div style={styles.sampleGrid}>
            {samples.map(sample => (
              <div
                key={sample.id}
                style={{
                  ...styles.sampleItem,
                  ...(selectedSampleId === sample.id ? styles.sampleItemActive : {})
                }}
                onClick={() => handleSampleClick(sample)}
              >
                <p style={styles.sampleText}>{sample.text}</p>
                <span style={styles.sampleDuration}>
                  ⏱ {formatDuration(sample.duration)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.mainPanel}>
        <div style={styles.waveformCard}>
          <div style={styles.waveformHeader}>
            <h3 style={styles.cardTitle}>
              {isRecording ? '正在录音...' : isProcessing ? '评测中...' : '波形预览'}
            </h3>
            <button
              className="play-button"
              onClick={playReference}
              disabled={!selectedSample || isRecording}
            >
              {isPlayingReference ? '⏸ 播放中' : '▶ 播放范音'}
            </button>
          </div>
          
          <div style={styles.waveformContainer}>
            <canvas
              ref={canvasRef}
              width={800}
              height={200}
              style={styles.waveformCanvas}
            />
            {isProcessing && (
              <div style={styles.processingOverlay}>
                <div style={styles.spinner}></div>
                <p style={styles.processingText}>正在分析发音...</p>
              </div>
            )}
          </div>

          {selectedSample && (
            <div style={styles.sampleInfo}>
              <p style={styles.sampleDisplayText}>{selectedSample.text}</p>
            </div>
          )}
        </div>

        <div style={styles.recordControls}>
          <button
            className={`record-button ${isRecording ? 'record-button-active' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || !selectedSample}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="white"
              style={styles.micIcon}
            >
              {isRecording ? (
                <rect x="6" y="6" width="12" height="12" rx="2" />
              ) : (
                <>
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </>
              )}
            </svg>
          </button>
          <p style={styles.recordHint}>
            {isRecording ? '点击停止录音' : isProcessing ? '评测中...' : '点击开始录音'}
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '24px',
    padding: '24px',
    width: '100%',
    maxWidth: '1400px',
    minHeight: 'calc(100vh - 60px)'
  },
  leftPanel: {
    width: '360px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flexShrink: 0
  },
  mainPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '32px'
  },
  settingsCard: {
    backgroundColor: '#2C3E50',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
  },
  samplesCard: {
    backgroundColor: '#2C3E50',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    flex: 1,
    overflow: 'auto'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ECF0F1',
    marginBottom: '16px'
  },
  settingGroup: {
    marginBottom: '16px'
  },
  settingLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#95A5A6',
    marginBottom: '8px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px'
  },
  langButton: {
    flex: 1,
    padding: '10px 16px',
    border: '1px solid #34495E',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#95A5A6',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.3s ease'
  },
  langButtonActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
    color: 'white'
  },
  levelButton: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #34495E',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#95A5A6',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.3s ease'
  },
  levelButtonActive: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
    color: 'white'
  },
  sampleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  sampleItem: {
    padding: '12px',
    borderRadius: '10px',
    backgroundColor: '#34495E',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid transparent'
  },
  sampleItemActive: {
    borderColor: '#3498DB',
    backgroundColor: 'rgba(52, 152, 219, 0.15)'
  },
  sampleText: {
    fontSize: '13px',
    color: '#ECF0F1',
    lineHeight: 1.4,
    marginBottom: '6px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  sampleDuration: {
    fontSize: '11px',
    color: '#95A5A6'
  },
  waveformCard: {
    width: '100%',
    maxWidth: '700px',
    backgroundColor: '#2C3E50',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
  },
  waveformHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  playButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#3498DB',
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.3s ease'
  },
  playButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  waveformContainer: {
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  waveformCanvas: {
    width: '100%',
    height: '200px',
    display: 'block',
    borderRadius: '12px'
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(44, 62, 80, 0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(52, 152, 219, 0.2)',
    borderTopColor: '#3498DB',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  processingText: {
    color: '#ECF0F1',
    fontSize: '14px'
  },
  sampleInfo: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: '10px',
    borderLeft: '4px solid #3498DB'
  },
  sampleDisplayText: {
    fontSize: '16px',
    color: '#ECF0F1',
    lineHeight: 1.6
  },
  recordControls: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  recordButton: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#E74C3C',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(231, 76, 60, 0.4)',
    transition: 'all 0.3s ease-in-out'
  },
  recordButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  recordButtonHover: {
    transform: 'scale(1.1)',
    boxShadow: '0 6px 20px rgba(231, 76, 60, 0.5)'
  },
  recordButtonActive: {
    backgroundColor: '#C0392B',
    animation: 'pulse 1.5s ease-in-out infinite'
  },
  micIcon: {
    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
  },
  recordHint: {
    fontSize: '14px',
    color: '#95A5A6'
  }
};

export default RecordPanel;

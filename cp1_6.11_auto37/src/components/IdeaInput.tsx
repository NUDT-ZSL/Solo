import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { IdeaType } from '../types';

interface IdeaInputProps {
  onSubmit: (
    memberName: string,
    content: string,
    type: IdeaType,
    voiceBase64?: string
  ) => void;
  members: string[];
}

interface TypeConfig {
  label: string;
  tooltip: string;
  emoji: string;
  colorFrom: string;
  colorTo: string;
  solidColor: string;
}

const TYPE_CONFIG: Record<IdeaType, TypeConfig> = {
  progress: {
    label: '进展',
    tooltip: '当前进展—你已完成的任务',
    emoji: '🚀',
    colorFrom: '#4CAF50',
    colorTo: '#81C784',
    solidColor: '#4CAF50',
  },
  blocker: {
    label: '阻碍',
    tooltip: '遇到阻碍—需要协助解决的问题',
    emoji: '🚧',
    colorFrom: '#F44336',
    colorTo: '#EF9A9A',
    solidColor: '#F44336',
  },
  plan: {
    label: '计划',
    tooltip: '下一步计划—即将开展的工作',
    emoji: '📋',
    colorFrom: '#2196F3',
    colorTo: '#64B5F6',
    solidColor: '#2196F3',
  },
};

const MAX_CONTENT_LENGTH = 200;
const MAX_SUGGESTIONS = 5;
const MAX_RECORD_SECONDS = 30;

export default function IdeaInput({ onSubmit, members }: IdeaInputProps) {
  const [memberName, setMemberName] = useState('');
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState<IdeaType>('progress');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(24).fill(0));
  const [recordedBase64, setRecordedBase64] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonPressed, setButtonPressed] = useState<IdeaType | null>(null);
  const [showSubmittedAnim, setShowSubmittedAnim] = useState(false);

  const inputContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const waveformAnimationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const submitAnimTimerRef = useRef<number | null>(null);

  const suggestions = useMemo(() => {
    if (!memberName.trim()) return [];
    const lowerName = memberName.toLowerCase();
    const filtered = members.filter((m) =>
      m.toLowerCase().includes(lowerName)
    );
    return filtered.slice(0, MAX_SUGGESTIONS);
  }, [memberName, members]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputContainerRef.current &&
        !inputContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (waveformAnimationRef.current) cancelAnimationFrame(waveformAnimationRef.current);
      if (submitAnimTimerRef.current) clearTimeout(submitAnimTimerRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleMemberNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (showSuggestions && selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        e.preventDefault();
        setMemberName(suggestions[selectedSuggestionIndex]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const selectSuggestion = (name: string) => {
    setMemberName(name);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleTypeClick = (type: IdeaType) => {
    setSelectedType(type);
    setButtonPressed(type);
    setTimeout(() => setButtonPressed(null), 100);
  };

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const bars = 24;
    const step = Math.floor(bufferLength / bars);
    const newWaveform: number[] = [];

    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] || 0;
      }
      const avg = sum / step / 255;
      newWaveform.push(Math.max(0.08, avg));
    }

    setWaveformData(newWaveform);
    waveformAnimationRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setRecordedBase64(base64);
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
        if (waveformAnimationRef.current) {
          cancelAnimationFrame(waveformAnimationRef.current);
        }
        setWaveformData(new Array(24).fill(0));
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      setIsRecording(true);
      setRecordTime(0);
      setRecordedBase64(undefined);

      recordTimerRef.current = window.setInterval(() => {
        setRecordTime((prev) => {
          if (prev >= MAX_RECORD_SECONDS - 1) {
            stopRecording();
            return MAX_RECORD_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);

      updateWaveform();
    } catch (err) {
      console.error('启动录音失败:', err);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const discardRecording = () => {
    setRecordedBase64(undefined);
  };

  const handleSubmit = async () => {
    if (!memberName.trim()) {
      alert('请输入你的姓名');
      return;
    }
    if (!content.trim()) {
      alert('请输入发言内容');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(
        memberName.trim(),
        content.trim(),
        selectedType,
        recordedBase64
      );

      setMemberName('');
      setContent('');
      setSelectedType('progress');
      setRecordedBase64(undefined);
      setShowSubmittedAnim(true);

      if (submitAnimTimerRef.current) clearTimeout(submitAnimTimerRef.current);
      submitAnimTimerRef.current = window.setTimeout(() => {
        setShowSubmittedAnim(false);
      }, 800);
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentLength = content.length;
  const submitButtonStyle = {
    background: `linear-gradient(135deg, ${TYPE_CONFIG[selectedType].colorFrom} 0%, ${TYPE_CONFIG[selectedType].colorTo} 100%)`,
  };

  return (
    <div className="idea-input-container">
      <div className="idea-input-card">
        <div className="input-header">
          <h2 className="input-title">📝 分享我的站会动态</h2>
          {showSubmittedAnim && <span className="submitted-flash">✓ 已提交</span>}
        </div>

        <div className="input-form">
          <div className="form-row" ref={inputContainerRef}>
            <div className="form-field member-field">
              <label className="field-label">成员姓名</label>
              <div className="autocomplete-wrapper">
                <input
                  type="text"
                  className="member-input"
                  placeholder="输入姓名..."
                  value={memberName}
                  onChange={(e) => {
                    setMemberName(e.target.value);
                    setShowSuggestions(true);
                    setSelectedSuggestionIndex(-1);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onKeyDown={handleMemberNameKeyDown}
                  maxLength={20}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {suggestions.map((name, idx) => (
                      <div
                        key={name}
                        className={`suggestion-item ${
                          idx === selectedSuggestionIndex ? 'selected' : ''
                        }`}
                        onClick={() => selectSuggestion(name)}
                        onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                      >
                        <span className="suggestion-icon">👤</span>
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-field type-field">
              <label className="field-label">发言类型</label>
              <div className="type-buttons">
                {(Object.keys(TYPE_CONFIG) as IdeaType[]).map((type) => {
                  const config = TYPE_CONFIG[type];
                  const isActive = selectedType === type;
                  const isPressed = buttonPressed === type;

                  return (
                    <button
                      key={type}
                      type="button"
                      className={`type-btn type-btn-${type} ${
                        isActive ? 'active' : ''
                      } ${isPressed ? 'pressed' : ''}`}
                      onClick={() => handleTypeClick(type)}
                      title={config.tooltip}
                      style={
                        isActive
                          ? {
                              background: `linear-gradient(135deg, ${config.colorFrom} 0%, ${config.colorTo} 100%)`,
                              boxShadow: `0 0 16px ${config.solidColor}66, inset 0 0 12px rgba(255,255,255,0.15)`,
                            }
                          : undefined
                      }
                    >
                      <span className="type-btn-emoji">{config.emoji}</span>
                      <span className="type-btn-label">{config.label}</span>
                      <span className="type-tooltip">{config.tooltip}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field content-field">
              <label className="field-label">
                发言内容
                <span className={`char-count ${contentLength > MAX_CONTENT_LENGTH * 0.9 ? 'warn' : ''}`}>
                  {contentLength}/{MAX_CONTENT_LENGTH}
                </span>
              </label>
              <textarea
                className="content-textarea"
                placeholder="分享你的进展、阻碍或下一步计划..."
                value={content}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CONTENT_LENGTH) {
                    setContent(e.target.value);
                  }
                }}
                rows={4}
                maxLength={MAX_CONTENT_LENGTH}
              />
            </div>
          </div>

          <div className="form-row form-actions-row">
            <div className="recording-section">
              {isRecording ? (
                <div className="recording-panel">
                  <button
                    type="button"
                    className={`record-btn record-btn-stop ${isRecording ? 'recording' : ''}`}
                    onClick={toggleRecording}
                    title="停止录音"
                  >
                    <span className="record-pulse"></span>
                    <span className="record-icon">⏹</span>
                    <span className="record-time">{recordTime}s/{MAX_RECORD_SECONDS}s</span>
                  </button>
                  <div className="waveform-container">
                    {waveformData.map((height, idx) => (
                      <div
                        key={idx}
                        className="waveform-bar"
                        style={{ height: `${height * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              ) : recordedBase64 ? (
                <div className="recorded-preview">
                  <div className="recorded-info">
                    <span className="recorded-icon">🎤</span>
                    <span className="recorded-text">语音已就绪</span>
                  </div>
                  <button
                    type="button"
                    className="recorded-discard-btn"
                    onClick={discardRecording}
                    title="删除语音"
                  >
                    ✕ 删除
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="record-btn record-btn-start"
                  onClick={toggleRecording}
                  title="点击录制语音（最长30秒）"
                >
                  <span className="record-icon">🎤</span>
                  <span>录制语音</span>
                </button>
              )}
            </div>

            <button
              type="button"
              className="submit-btn"
              onClick={handleSubmit}
              disabled={isSubmitting || !memberName.trim() || !content.trim()}
              style={submitButtonStyle}
            >
              {isSubmitting ? (
                <>
                  <span className="submit-spinner"></span>
                  <span>提交中...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>提交发言</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .idea-input-container {
          margin-bottom: 8px;
        }

        .idea-input-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .input-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .input-title {
          font-size: 18px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }

        .submitted-flash {
          font-size: 14px;
          font-weight: 500;
          color: #4CAF50;
          animation: floatUp 800ms ease-out forwards;
        }

        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          20% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px);
          }
        }

        .input-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-row {
          display: flex;
          gap: 16px;
        }

        @media (max-width: 767px) {
          .form-row {
            flex-direction: column;
          }
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .member-field {
          flex: 0 0 260px;
        }

        @media (max-width: 767px) {
          .member-field {
            flex: 1;
          }
        }

        .type-field {
          flex: 1;
        }

        .content-field {
          flex: 1;
        }

        .field-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
        }

        .char-count {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 400;
        }

        .char-count.warn {
          color: #FF9800;
        }

        .autocomplete-wrapper {
          position: relative;
        }

        .member-input,
        .content-textarea {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          font-family: inherit;
          transition: all 200ms ease;
          outline: none;
        }

        .member-input {
          width: 100%;
          padding: 10px 14px;
        }

        .member-input::placeholder,
        .content-textarea::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .member-input:focus,
        .content-textarea:focus {
          border-color: rgba(100, 181, 246, 0.5);
          background: rgba(255, 255, 255, 0.09);
          box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.1);
        }

        .suggestions-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: rgba(22, 33, 62, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 6px;
          z-index: 100;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.85);
          transition: background 150ms ease;
        }

        .suggestion-item:hover,
        .suggestion-item.selected {
          background: rgba(100, 181, 246, 0.2);
          color: white;
        }

        .suggestion-icon {
          font-size: 14px;
          opacity: 0.7;
        }

        .type-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 479px) {
          .type-buttons {
            display: grid;
            grid-template-columns: 1fr;
          }
        }

        .type-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.75);
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1);
          flex: 1;
          min-width: 100px;
          justify-content: center;
        }

        .type-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.95);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .type-btn.pressed {
          transform: scale(0.95);
        }

        .type-btn.active {
          color: white;
          border-color: transparent;
        }

        .type-btn-emoji {
          font-size: 16px;
        }

        .type-tooltip {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.85);
          color: white;
          font-size: 12px;
          font-weight: 400;
          border-radius: 6px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 200ms ease;
        }

        .type-btn:hover .type-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .content-textarea {
          width: 100%;
          padding: 12px 14px;
          resize: vertical;
          min-height: 100px;
          line-height: 1.6;
        }

        .form-actions-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }

        @media (max-width: 767px) {
          .form-actions-row {
            flex-direction: column;
            align-items: stretch;
          }
        }

        .recording-section {
          flex: 1;
          min-height: 48px;
          display: flex;
          align-items: center;
        }

        .record-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .record-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .record-btn-start {
          border-color: rgba(244, 67, 54, 0.3);
          color: #EF9A9A;
        }

        .record-btn-start:hover {
          border-color: rgba(244, 67, 54, 0.5);
          background: rgba(244, 67, 54, 0.1);
        }

        .record-btn-stop {
          position: relative;
          background: rgba(244, 67, 54, 0.15);
          border-color: rgba(244, 67, 54, 0.4);
          color: #F44336;
        }

        .record-btn-stop.recording {
          animation: pulseRed 1s ease-in-out infinite;
        }

        @keyframes pulseRed {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.5); }
          50% { box-shadow: 0 0 0 8px rgba(244, 67, 54, 0); }
        }

        .record-pulse {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #F44336;
          border-radius: 50%;
          left: 14px;
          animation: blink 500ms ease-in-out infinite;
        }

        .record-icon {
          z-index: 1;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .record-time {
          font-variant-numeric: tabular-nums;
          font-size: 13px;
        }

        .recording-panel {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
        }

        .waveform-container {
          flex: 1;
          height: 40px;
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 0 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .waveform-bar {
          flex: 1;
          min-width: 3px;
          background: linear-gradient(180deg, #F44336 0%, #EF9A9A 100%);
          border-radius: 2px;
          transition: height 50ms ease;
        }

        .recorded-preview {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 16px;
          background: rgba(76, 175, 80, 0.12);
          border: 1px solid rgba(76, 175, 80, 0.3);
          border-radius: 10px;
          flex: 1;
        }

        .recorded-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #81C784;
          font-size: 14px;
          font-weight: 500;
        }

        .recorded-discard-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          padding: 4px 10px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .recorded-discard-btn:hover {
          background: rgba(244, 67, 54, 0.2);
          color: #EF9A9A;
          border-color: rgba(244, 67, 54, 0.4);
        }

        .submit-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          border-radius: 10px;
          border: none;
          color: white;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 200ms ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          white-space: nowrap;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(0.3);
        }

        @media (max-width: 767px) {
          .submit-btn {
            width: 100%;
            justify-content: center;
          }
        }

        .submit-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

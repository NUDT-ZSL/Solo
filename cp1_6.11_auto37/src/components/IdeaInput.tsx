/**
 * ============================================================
 *  IdeaInput 发言输入组件 - 姓名补齐 + 类型选择 + 语音录制
 * ============================================================
 *
 *  调用关系:
 *    ├── 上游调用 (被谁使用):
 *    │   └── src/App.tsx -> 渲染为 <IdeaInput onSubmit members />
 *    └── 下游依赖 (使用谁):
 *        └── src/types.ts  (IdeaType 类型)
 *
 *  数据流向:
 *    用户交互 (输入/选择/录音)
 *        │
 *        ▼
 *    useState 保存本地状态 (memberName / content / selectedType / recordedBase64)
 *        │
 *        ▼
 *    点击 [提交发言] -> props.onSubmit(memberName, content, type, voiceBase64?)
 *        │
 *        ▼
 *    App.tsx handleSubmit -> createIdea -> 后端 POST /api/ideas -> 成功后清空输入+飘出动画
 *
 *  子模块功能:
 *    1. 姓名自动补齐: onInput -> useMemo 模糊匹配 members[] -> 下拉渲染 -> 键盘↑↓Enter选择
 *    2. 类型三态选择: progress🚀/blocker🚧/plan📋 互斥, 渐变高亮+弹性缩放
 *    3. 按住说话录音: pointerdown 开始 -> MediaRecorder+AnalyserNode 波形图
 *                    -> pointerup 停止 -> Blob -> FileReader -> base64 存入状态
 * ============================================================
 */

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

/** 三种发言类型的完整配置 (颜色 / emoji / 工具提示) */
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

/** 内容域最大字数 */
const MAX_CONTENT_LENGTH = 200;
/** 自动补齐下拉最大候选数 */
const MAX_SUGGESTIONS = 5;
/** 录音最长秒数 */
const MAX_RECORD_SECONDS = 30;
/** 波形柱数量 (与CSS宽度配合) */
const WAVEFORM_BARS = 24;

export default function IdeaInput({ onSubmit, members }: IdeaInputProps) {
  // ========================================================
  //  基础输入状态
  // ========================================================
  const [memberName, setMemberName] = useState('');
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState<IdeaType>('progress');

  // ========================================================
  //  姓名自动补齐状态
  // ========================================================
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const autocompleteWrapperRef = useRef<HTMLDivElement>(null);

  // ========================================================
  //  录音相关状态 & Refs
  // ========================================================
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(
    new Array(WAVEFORM_BARS).fill(0.1)
  );
  const [recordedBase64, setRecordedBase64] = useState<string | undefined>();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const recordStartTimeRef = useRef<number>(0);

  // ========================================================
  //  其他状态
  // ========================================================
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonPressed, setButtonPressed] = useState<IdeaType | null>(null);
  const [showSubmittedAnim, setShowSubmittedAnim] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submitAnimTimerRef = useRef<number | null>(null);
  const errorTimerRef = useRef<number | null>(null);

  // ========================================================
  //  姓名自动补齐 - 模糊匹配候选列表
  // ========================================================
  const suggestions = useMemo(() => {
    const trimmed = memberName.trim();
    if (!trimmed) return [];
    const lower = trimmed.toLowerCase();
    const matched = members.filter((m) =>
      m.toLowerCase().includes(lower)
    );
    return matched.slice(0, MAX_SUGGESTIONS);
  }, [memberName, members]);

  // ========================================================
  //  点击外部关闭下拉
  // ========================================================
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        autocompleteWrapperRef.current &&
        !autocompleteWrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /** 显示错误提示, 3秒后自动消失 */
  const showError = useCallback((msg: string) => {
    setErrorMessage(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = window.setTimeout(() => {
      setErrorMessage(null);
    }, 3000);
  }, []);

  // ========================================================
  //  组件卸载清理 (定时器/录音/rAF/音频上下文)
  // ========================================================
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (submitAnimTimerRef.current) clearTimeout(submitAnimTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // ========================================================
  //  键盘事件: ↑↓选择 / Enter确认 / Esc取消 自动补齐
  //  加强边界判断: 列表为空时忽略所有键盘操作
  // ========================================================
  const handleMemberNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hasSuggestions = suggestions.length > 0;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!hasSuggestions) return;
      setShowSuggestions(true);
      setSelectedSuggestionIndex((p) => {
        if (p < 0 || p >= suggestions.length - 1) return 0;
        return p + 1;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!hasSuggestions) return;
      setShowSuggestions(true);
      setSelectedSuggestionIndex((p) => {
        if (p <= 0) return suggestions.length - 1;
        return p - 1;
      });
    } else if (e.key === 'Enter') {
      if (
        hasSuggestions &&
        showSuggestions &&
        selectedSuggestionIndex >= 0 &&
        selectedSuggestionIndex < suggestions.length
      ) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  /** 选中某个候选姓名 */
  const selectSuggestion = (name: string) => {
    setMemberName(name);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // ========================================================
  //  类型按钮点击 (带 100ms 弹性缩放动画)
  // ========================================================
  const handleTypeClick = (type: IdeaType) => {
    setSelectedType(type);
    setButtonPressed(type);
    setTimeout(() => setButtonPressed(null), 100);
  };

  // ========================================================
  //  波形动画循环 (基于 AnalyserNode 的频率数据)
  // ========================================================
  const startWaveformLoop = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const bars = WAVEFORM_BARS;
      const step = Math.floor(bufferLength / bars);
      const newData: number[] = new Array(bars);
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += dataArray[i * step + j] || 0;
        const avg = sum / step / 255;
        newData[i] = Math.max(0.08, Math.min(1, avg));
      }
      setWaveformData(newData);
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  // ========================================================
  //  开始录音 (pointerdown / click 触发)
  // ========================================================
  const startRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      // 清空前一次录音
      audioChunksRef.current = [];
      setRecordedBase64(undefined);

      // 1. 获取麦克风 + 设置 AudioContext/Analyser
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // 2. 启动 MediaRecorder (优先 webm, 否则浏览器自动)
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      // 3. 启动 UI 状态
      setIsRecording(true);
      recordStartTimeRef.current = Date.now();
      setRecordTime(0);

      // 4. 启动定时器 (0s -> MAX, 每秒更新)
      recordTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
        setRecordTime(elapsed);
        if (elapsed >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
      }, 250);

      // 5. 启动波形动画
      setWaveformData(new Array(WAVEFORM_BARS).fill(0.2));
      startWaveformLoop();
    } catch (err) {
      console.error('启动录音失败:', err);
      showError('无法访问麦克风，请检查浏览器权限设置');
      cleanupRecordingState();
    }
  }, [isRecording, startWaveformLoop, showError]);

  // ========================================================
  //  停止录音 (pointerup / 达到最长 / 手动停止)
  //  -> 收集 Blob -> 转 base64 -> 存入 recordedBase64
  // ========================================================
  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    const stream = audioStreamRef.current;
    const audioCtx = audioContextRef.current;

    // 1. 清 UI 状态
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // 2. 监听 onstop -> 处理 Blob -> 转 base64
    const handleStop = () => {
      const chunks = audioChunksRef.current;
      if (chunks.length > 0) {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          if (b64 && b64.startsWith('data:')) {
            setRecordedBase64(b64);
          } else {
            showError('语音处理失败，请重试');
          }
        };
        reader.onerror = () => {
          showError('语音读取失败，请重试');
        };
        try {
          reader.readAsDataURL(blob);
        } catch {
          showError('语音编码失败，请重试');
        }
      } else {
        // 空录音 -> 还原
        setWaveformData(new Array(WAVEFORM_BARS).fill(0.1));
      }

      // 关闭音频资源
      if (stream) stream.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
      audioContextRef.current = null;
      mediaRecorderRef.current = null;
      analyserRef.current = null;
    };

    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = handleStop;
      try {
        recorder.stop();
      } catch {
        handleStop();
      }
    } else {
      handleStop();
    }

    // 波形归零
    setTimeout(() => {
      setWaveformData(new Array(WAVEFORM_BARS).fill(0.1));
    }, 200);
  }, [showError]);

  /** 紧急清理 (出错或组件卸载) */
  const cleanupRecordingState = () => {
    setIsRecording(false);
    setWaveformData(new Array(WAVEFORM_BARS).fill(0.1));
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
  };

  // ========================================================
  //  按住说话: pointerdown 开始, pointerup/cancel 停止并转 base64
  //  同时支持 click 切换 (无障碍)
  // ========================================================
  const handleRecordPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!isRecording) {
      startRecording();
    }
  };
  const handleRecordPointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
  };
  const handleRecordClick = () => {
    // click 模式: 点一下开始, 再点一下停止 (触摸屏 & 无障碍支持)
    if (isRecording) stopRecording();
    else startRecording();
  };

  // ========================================================
  //  删除已录制的语音 (点击"✕ 删除")
  // ========================================================
  const discardRecording = () => {
    setRecordedBase64(undefined);
  };

  // ========================================================
  //  提交: 构建 Idea 对象 -> props.onSubmit -> 清空输入 + 飘出成功动画
  //  完整错误处理: 校验失败 / 录音处理 / 后端上传 均有错误提示
  // ========================================================
  const handleSubmit = async () => {
    if (!memberName.trim()) {
      showError('请输入你的姓名');
      return;
    }
    if (!content.trim()) {
      showError('请输入发言内容');
      return;
    }
    if (isRecording) {
      stopRecording();
      // 等一下录音处理完成
      await new Promise((r) => setTimeout(r, 300));
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit(
        memberName.trim(),
        content.trim(),
        selectedType,
        recordedBase64
      );
      // 清空所有输入
      setMemberName('');
      setContent('');
      setSelectedType('progress');
      setRecordedBase64(undefined);
      // 飘出成功动画
      setShowSubmittedAnim(true);
      if (submitAnimTimerRef.current) clearTimeout(submitAnimTimerRef.current);
      submitAnimTimerRef.current = window.setTimeout(() => {
        setShowSubmittedAnim(false);
      }, 800);
    } catch (err) {
      console.error('提交失败:', err);
      const msg = err instanceof Error ? err.message : '提交失败，请重试';
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  //  渲染辅助变量
  // ========================================================
  const contentLength = content.length;
  const submitBtnGradient = {
    background: `linear-gradient(135deg, ${TYPE_CONFIG[selectedType].colorFrom} 0%, ${TYPE_CONFIG[selectedType].colorTo} 100%)`,
  };

  // ========================================================
  //  渲染
  // ========================================================
  return (
    <div className="idea-input-container">
      <div className="idea-input-card">
        {/* ===== 头部标题 + 提交飘出动画 ===== */}
        <div className="input-header">
          <h2 className="input-title">📝 分享我的站会动态</h2>
          {showSubmittedAnim && <span className="submitted-flash">✓ 已提交</span>}
        </div>

        {/* ===== 错误提示条 ===== */}
        {errorMessage && (
          <div className="error-message-bar">
            <span className="error-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="input-form">
          {/* ===== 第一行: 姓名 + 类型 ===== */}
          <div className="form-row">
            {/* 姓名输入 (带自动补齐) */}
            <div className="form-field member-field">
              <label className="field-label">成员姓名</label>
              <div className="autocomplete-wrapper" ref={autocompleteWrapperRef}>
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
                  autoComplete="off"
                />
                {/* 自动补齐下拉 */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="suggestions-dropdown" role="listbox">
                    {suggestions.map((name, idx) => (
                      <div
                        key={name}
                        role="option"
                        aria-selected={idx === selectedSuggestionIndex}
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

            {/* 三态类型按钮 */}
            <div className="form-field type-field">
              <label className="field-label">发言类型</label>
              <div className="type-buttons">
                {(Object.keys(TYPE_CONFIG) as IdeaType[]).map((type) => {
                  const cfg = TYPE_CONFIG[type];
                  const isActive = selectedType === type;
                  const isPressed = buttonPressed === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      className={`type-btn type-btn-${type} ${isActive ? 'active' : ''} ${
                        isPressed ? 'pressed' : ''
                      }`}
                      onClick={() => handleTypeClick(type)}
                      title={cfg.tooltip}
                      style={
                        isActive
                          ? {
                              background: `linear-gradient(135deg, ${cfg.colorFrom} 0%, ${cfg.colorTo} 100%)`,
                              boxShadow: `0 0 16px ${cfg.solidColor}66, inset 0 0 12px rgba(255,255,255,0.15)`,
                            }
                          : undefined
                      }
                    >
                      <span className="type-btn-emoji">{cfg.emoji}</span>
                      <span className="type-btn-label">{cfg.label}</span>
                      <span className="type-tooltip">{cfg.tooltip}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ===== 第二行: 内容文本域 ===== */}
          <div className="form-row">
            <div className="form-field content-field">
              <label className="field-label">
                发言内容
                <span
                  className={`char-count ${
                    contentLength > MAX_CONTENT_LENGTH * 0.9 ? 'warn' : ''
                  }`}
                >
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

          {/* ===== 第三行: 录音区 + 提交按钮 ===== */}
          <div className="form-row form-actions-row">
            <div className="recording-section">
              {/* === 正在录音: 显示 停止按钮(红脉冲) + 波形动画 + 时间 === */}
              {isRecording ? (
                <div className="recording-panel">
                  <button
                    type="button"
                    className={`record-btn record-btn-stop recording`}
                    onPointerDown={handleRecordPointerDown}
                    onPointerUp={handleRecordPointerUp}
                    onPointerLeave={() => isRecording && stopRecording()}
                    onClick={handleRecordClick}
                    title="松开停止录音 (最长30秒)"
                  >
                    <span className="record-pulse-dot"></span>
                    <span className="record-icon">⏹</span>
                    <span className="record-time">
                      {recordTime}s/{MAX_RECORD_SECONDS}s
                    </span>
                  </button>
                  <div className="waveform-container">
                    {waveformData.map((h, i) => (
                      <div
                        key={i}
                        className="waveform-bar"
                        style={{
                          height: `${h * 100}%`,
                          transition: 'height 60ms linear',
                        }}
                      />
                    ))}
                  </div>
                  <span className="record-hint">松开发送</span>
                </div>
              ) : recordedBase64 ? (
                /* === 录音完成: 显示 ✓ 语音已就绪 + 删除按钮 === */
                <div className="recorded-preview">
                  <div className="recorded-info">
                    <span className="recorded-icon">🎤</span>
                    <span className="recorded-text">语音已就绪 · 将在提交时上传</span>
                  </div>
                  <button
                    type="button"
                    className="recorded-discard-btn"
                    onClick={discardRecording}
                    title="删除已录制语音"
                  >
                    ✕ 删除
                  </button>
                </div>
              ) : (
                /* === 未录音: 按住说话按钮 === */
                <button
                  type="button"
                  className="record-btn record-btn-start"
                  onPointerDown={handleRecordPointerDown}
                  onPointerUp={handleRecordPointerUp}
                  onPointerCancel={() => isRecording && stopRecording()}
                  onClick={handleRecordClick}
                  title="按住录制语音（最长30秒），松开自动停止并上传"
                >
                  <span className="record-icon">🎤</span>
                  <span>按住录制语音（30s）</span>
                </button>
              )}
            </div>

            {/* 提交按钮 */}
            <button
              type="button"
              className="submit-btn"
              onClick={handleSubmit}
              disabled={isSubmitting || !memberName.trim() || !content.trim()}
              style={submitBtnGradient}
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

      {/* ============================================================
           所有样式 (inline <style>, 跟随组件打包)
         ============================================================ */}
      <style>{`
        .idea-input-container { margin-bottom: 8px; }

        .idea-input-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .input-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .input-title {
          font-size: 18px; font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }

        /* 提交成功飘出动画 */
        .submitted-flash {
          font-size: 14px; font-weight: 500; color: #4CAF50;
          animation: floatUp 800ms ease-out forwards;
        }
        @keyframes floatUp {
          0%   { opacity: 0; transform: translateY(10px); }
          20%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }

        /* 错误提示条 */
        .error-message-bar {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; margin-bottom: 16px;
          background: rgba(244, 67, 54, 0.15);
          border: 1px solid rgba(244, 67, 54, 0.3);
          border-radius: 8px;
          color: #EF9A9A;
          font-size: 13px; font-weight: 500;
          animation: slideIn 200ms ease-out;
        }
        .error-icon { font-size: 14px; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .input-form { display: flex; flex-direction: column; gap: 16px; }

        .form-row { display: flex; gap: 16px; }
        @media (max-width: 767px) { .form-row { flex-direction: column; } }

        .form-field { display: flex; flex-direction: column; gap: 8px; }
        .member-field { flex: 0 0 260px; }
        @media (max-width: 767px) { .member-field { flex: 1; } }
        .type-field { flex: 1; }
        .content-field { flex: 1; }

        .field-label {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 13px; font-weight: 500; color: rgba(255, 255, 255, 0.7);
        }
        .char-count {
          font-size: 12px; color: rgba(255, 255, 255, 0.4); font-weight: 400;
        }
        .char-count.warn { color: #FF9800; }

        /* === 自动补齐容器 === */
        .autocomplete-wrapper { position: relative; }
        .member-input,
        .content-textarea {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px; color: rgba(255, 255, 255, 0.9);
          font-size: 14px; font-family: inherit;
          transition: all 200ms ease; outline: none;
        }
        .member-input { width: 100%; padding: 10px 14px; }
        .member-input::placeholder,
        .content-textarea::placeholder { color: rgba(255, 255, 255, 0.3); }
        .member-input:focus,
        .content-textarea:focus {
          border-color: rgba(100, 181, 246, 0.5);
          background: rgba(255, 255, 255, 0.09);
          box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.1);
        }

        /* === 自动补齐下拉 === */
        .suggestions-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          background: rgba(22, 33, 62, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px; padding: 6px; z-index: 200;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
        }
        .suggestion-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 6px; cursor: pointer;
          font-size: 14px; color: rgba(255, 255, 255, 0.85);
          transition: background 150ms ease;
        }
        .suggestion-item:hover,
        .suggestion-item.selected {
          background: rgba(100, 181, 246, 0.2); color: white;
        }
        .suggestion-icon { font-size: 14px; opacity: 0.7; }

        /* === 类型按钮 === */
        .type-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
        @media (max-width: 479px) {
          .type-buttons { display: grid; grid-template-columns: 1fr; }
        }
        .type-btn {
          position: relative;
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.75);
          font-size: 14px; font-weight: 500; font-family: inherit;
          cursor: pointer;
          transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1);
          flex: 1; min-width: 100px; justify-content: center;
        }
        .type-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.95);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .type-btn.pressed { transform: scale(0.95); }
        .type-btn.active { color: white; border-color: transparent; }
        .type-btn-emoji { font-size: 16px; }

        .type-tooltip {
          position: absolute; bottom: calc(100% + 8px); left: 50%;
          transform: translateX(-50%) translateY(4px);
          padding: 6px 12px; background: rgba(0, 0, 0, 0.85); color: white;
          font-size: 12px; font-weight: 400; border-radius: 6px;
          white-space: nowrap; opacity: 0; pointer-events: none;
          transition: all 200ms ease;
        }
        .type-btn:hover .type-tooltip {
          opacity: 1; transform: translateX(-50%) translateY(0);
        }

        /* === 文本域 === */
        .content-textarea {
          width: 100%; padding: 12px 14px;
          resize: vertical; min-height: 100px; line-height: 1.6;
        }

        /* === 录音区 + 提交按钮 === */
        .form-actions-row {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 16px;
        }
        @media (max-width: 767px) {
          .form-actions-row { flex-direction: column; align-items: stretch; }
        }
        .recording-section {
          flex: 1; min-height: 48px; display: flex; align-items: center;
        }

        /* === 录音按钮通用样式 === */
        .record-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px; font-weight: 500; font-family: inherit;
          cursor: pointer; transition: all 200ms ease;
          user-select: none; touch-action: none;
        }
        .record-btn:hover { background: rgba(255, 255, 255, 0.08); }

        /* 开始录音按钮 (红色边框) */
        .record-btn-start {
          border-color: rgba(244, 67, 54, 0.3); color: #EF9A9A;
        }
        .record-btn-start:hover {
          border-color: rgba(244, 67, 54, 0.5);
          background: rgba(244, 67, 54, 0.1);
        }
        .record-btn-start:active { background: rgba(244, 67, 54, 0.2); }

        /* 停止录音按钮 (红脉冲动画) */
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
          50%      { box-shadow: 0 0 0 10px rgba(244, 67, 54, 0); }
        }
        .record-pulse-dot {
          width: 10px; height: 10px; background: #F44336;
          border-radius: 50%;
          animation: blink 500ms ease-in-out infinite;
        }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .record-time {
          font-variant-numeric: tabular-nums; font-size: 13px; z-index: 1;
        }

        /* 录音面板 (停止按钮 + 波形 + 提示) */
        .recording-panel {
          display: flex; align-items: center; gap: 12px; flex: 1; width: 100%;
        }

        /* 波形容器 */
        .waveform-container {
          flex: 1; height: 40px;
          display: flex; align-items: center; gap: 3px;
          padding: 0 10px; background: rgba(0, 0, 0, 0.25);
          border-radius: 8px; overflow: hidden;
        }
        .waveform-bar {
          flex: 1; min-width: 3px;
          background: linear-gradient(180deg, #F44336 0%, #EF9A9A 100%);
          border-radius: 2px;
          align-self: flex-end;
          transform-origin: bottom;
        }

        .record-hint {
          font-size: 12px; color: rgba(244, 67, 54, 0.8);
          padding: 0 4px; white-space: nowrap;
        }

        /* 已录制预览 */
        .recorded-preview {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 10px 16px;
          background: rgba(76, 175, 80, 0.12);
          border: 1px solid rgba(76, 175, 80, 0.3);
          border-radius: 10px; flex: 1;
        }
        .recorded-info {
          display: flex; align-items: center; gap: 8px;
          color: #81C784; font-size: 14px; font-weight: 500;
        }
        .recorded-discard-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px; padding: 4px 10px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px; cursor: pointer; transition: all 150ms ease;
        }
        .recorded-discard-btn:hover {
          background: rgba(244, 67, 54, 0.2); color: #EF9A9A;
          border-color: rgba(244, 67, 54, 0.4);
        }

        /* === 提交按钮 === */
        .submit-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 28px; border-radius: 10px; border: none;
          color: white;
          font-size: 15px; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: all 200ms ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          white-space: nowrap;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled {
          opacity: 0.5; cursor: not-allowed; filter: grayscale(0.3);
        }
        @media (max-width: 767px) {
          .submit-btn { width: 100%; justify-content: center; }
        }

        /* 提交中的 spinner */
        .submit-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

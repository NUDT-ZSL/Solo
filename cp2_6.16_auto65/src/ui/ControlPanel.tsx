import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { sceneManager } from '@/core/sceneManager';
import { MAX_AUDIO_SIZE } from '@/types';
import { Play, Pause, Upload, Save, Trash2, ChevronRight, X } from 'lucide-react';

interface ControlPanelProps {
  onExportSnapshot: () => void;
  audioAnalyzerRef: React.MutableRefObject<{
    loadFile: (file: File) => Promise<void>;
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    seek: (time: number) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    getIsPlaying: () => boolean;
    dispose: () => void;
  } | null>;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onExportSnapshot, audioAnalyzerRef }) => {
  const {
    selectedNodeId,
    selectedColor,
    connectionOpacity,
    templates,
    colorSchemes,
    nodes,
    connections,
    audioProgress,
    audioDuration,
    isPlaying,
    panelOpen,
    setTemplates,
    addTemplate,
    removeTemplate,
    setPanelOpen,
    updateNodeSize,
    setConnectionOpacity,
    setSelectedColor,
    resetSculpture,
    setNodes,
  } = useStore();

  const [isMobile, setIsMobile] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isColorDragging, setIsColorDragging] = useState(false);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [audioError, setAudioError] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch('/api/templates');
        const data = await res.json();
        setTemplates(data.templates);
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    };
    loadTemplates();
  }, [setTemplates]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2;

    const gradient = ctx.createConicGradient(0, centerX, centerY);
    for (let i = 0; i <= 360; i++) {
      gradient.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    innerGradient.addColorStop(0, 'white');
    innerGradient.addColorStop(1, 'transparent');

    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const getColorAtPosition = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    if (pixel[3] === 0) return null;

    const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
    return hex;
  }, []);

  const handleColorWheelMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsColorDragging(true);
    const color = getColorAtPosition(e.clientX, e.clientY);
    if (color) {
      setSelectedColor(color);
    }
  }, [getColorAtPosition, setSelectedColor]);

  const handleColorWheelMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isColorDragging) return;
    const color = getColorAtPosition(e.clientX, e.clientY);
    if (color) {
      setSelectedColor(color);
    }
  }, [isColorDragging, getColorAtPosition, setSelectedColor]);

  const handleColorWheelMouseUp = useCallback(() => {
    setIsColorDragging(false);
    sceneManager.enforceBounds();
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsColorDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setAudioError('');
    if (file.size > MAX_AUDIO_SIZE) {
      setAudioError('File size exceeds 5MB limit');
      return;
    }

    try {
      await audioAnalyzerRef.current?.loadFile(file);
      setAudioFileName(file.name);
    } catch (err) {
      setAudioError('Failed to load audio file');
      console.error(err);
    }
  }, [audioAnalyzerRef]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'audio/mpeg' || file.name.endsWith('.mp3'))) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * audioDuration;
    audioAnalyzerRef.current?.seek(time);
  }, [audioDuration, audioAnalyzerRef]);

  const applyColorScheme = useCallback((scheme: { colors: string[] }) => {
    const updatedNodes = nodes.map((node, index) => ({
      ...node,
      color: scheme.colors[index % scheme.colors.length],
    }));
    setNodes(updatedNodes);
  }, [nodes, setNodes]);

  const handleSaveTemplate = useCallback(async () => {
    const trimmedName = templateName.trim().slice(0, 20);
    if (!trimmedName) return;

    const sculpture = {
      id: crypto.randomUUID(),
      name: trimmedName,
      nodes,
      connections,
      colorSchemeId: 'custom',
    };

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, sculpture }),
      });
      const data = await res.json();
      addTemplate(data.template);
      setTemplateName('');
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  }, [templateName, nodes, connections, addTemplate]);

  const handleDeleteTemplate = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      removeTemplate(id);
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  }, [removeTemplate]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = {
    panel: {
      width: '320px',
      position: 'fixed' as const,
      left: 0,
      top: 0,
      height: '100vh',
      background: 'rgba(20, 20, 30, 0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 100,
      overflowY: 'auto' as const,
      padding: '20px',
      boxSizing: 'border-box' as const,
      transition: 'transform 0.3s ease-out',
      fontFamily: "'Rajdhani', sans-serif",
      color: '#cccccc',
      transform: isMobile && !panelOpen ? 'translateX(-100%)' : 'translateX(0)',
    } as React.CSSProperties,
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      zIndex: 99,
      display: isMobile && panelOpen ? 'block' : 'none',
    } as React.CSSProperties,
    mobileButton: {
      display: isMobile ? 'flex' : 'none',
      position: 'fixed' as const,
      bottom: '20px',
      right: '20px',
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      background: '#6c63ff',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 101,
      boxShadow: '0 4px 12px rgba(108, 99, 255, 0.3)',
      transition: 'transform 0.2s ease-out',
    } as React.CSSProperties,
    exportButton: {
      position: 'absolute' as const,
      top: '15px',
      right: '15px',
      width: '120px',
      height: '40px',
      borderRadius: '20px',
      background: '#6c63ff',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      fontFamily: "'Rajdhani', sans-serif",
      fontSize: '14px',
      fontWeight: 600,
      transition: 'all 0.2s ease-out',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '14px',
      color: '#6c63ff',
      fontWeight: 600,
      fontFamily: "'Orbitron', sans-serif",
      marginBottom: '12px',
      marginTop: '30px',
      letterSpacing: '1px',
    } as React.CSSProperties,
    divider: {
      height: '1px',
      background: 'linear-gradient(90deg, #2a2a3e 0%, transparent 100%)',
      border: 'none',
      margin: '15px 0',
    } as React.CSSProperties,
    sliderContainer: {
      marginBottom: '16px',
    } as React.CSSProperties,
    sliderLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '6px',
      fontSize: '13px',
    } as React.CSSProperties,
    slider: {
      width: '100%',
      height: '6px',
      borderRadius: '8px',
      background: '#1a1a2e',
      outline: 'none',
      WebkitAppearance: 'none',
      appearance: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease-out',
    } as React.CSSProperties,
    button: {
      width: '100%',
      padding: '10px',
      borderRadius: '8px',
      background: '#2a2a3e',
      color: 'white',
      border: '1px solid #3a3a4e',
      cursor: 'pointer',
      fontFamily: "'Rajdhani', sans-serif",
      fontSize: '14px',
      fontWeight: 500,
      transition: 'all 0.2s ease-out',
    } as React.CSSProperties,
    colorWheelContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '15px',
      marginBottom: '20px',
    } as React.CSSProperties,
    colorWheel: {
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      cursor: 'crosshair',
      transition: 'all 0.2s ease-out',
    } as React.CSSProperties,
    selectedColorDisplay: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    } as React.CSSProperties,
    colorCircle: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      boxShadow: `0 0 16px rgba(255,255,255,0.4)`,
    } as React.CSSProperties,
    colorSchemes: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '10px',
    } as React.CSSProperties,
    schemeSwatch: {
      padding: '8px',
      borderRadius: '8px',
      background: '#1a1a2e',
      cursor: 'pointer',
      transition: 'all 0.2s ease-out',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    schemeDots: {
      display: 'flex',
      gap: '3px',
      justifyContent: 'center',
      marginBottom: '4px',
    } as React.CSSProperties,
    schemeDot: {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
    } as React.CSSProperties,
    schemeName: {
      fontSize: '11px',
      color: '#999',
    } as React.CSSProperties,
    uploadZone: {
      padding: '20px',
      borderRadius: '12px',
      border: '#3a3a4e dashed 2px',
      textAlign: 'center' as const,
      cursor: 'pointer',
      transition: 'all 0.2s ease-out',
      marginBottom: '15px',
    } as React.CSSProperties,
    uploadZoneActive: {
      padding: '20px',
      borderRadius: '12px',
      border: '#6c63ff solid 2px',
      background: 'rgba(108, 99, 255, 0.1)',
      textAlign: 'center' as const,
      cursor: 'pointer',
      transition: 'all 0.2s ease-out',
      marginBottom: '15px',
    } as React.CSSProperties,
    progressContainer: {
      marginBottom: '10px',
    } as React.CSSProperties,
    progressBar: {
      height: '6px',
      background: '#1a1a2e',
      borderRadius: '3px',
      cursor: 'pointer',
      overflow: 'hidden',
    } as React.CSSProperties,
    progressFill: {
      height: '100%',
      background: '#6c63ff',
      borderRadius: '3px',
      transition: 'width 0.1s linear',
    } as React.CSSProperties,
    progressTime: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '12px',
      marginTop: '4px',
      color: '#888',
    } as React.CSSProperties,
    controlsRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    } as React.CSSProperties,
    playButton: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      background: '#2a2a3e',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease-out',
    } as React.CSSProperties,
    audioInfo: {
      flex: 1,
      fontSize: '13px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    } as React.CSSProperties,
    templatesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '10px',
      marginBottom: '15px',
    } as React.CSSProperties,
    templateCard: {
      width: '100%',
      height: '60px',
      background: '#1a1a2e',
      borderRadius: '8px',
      border: '1px solid #2a2a3e',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px',
      fontSize: '12px',
      color: '#cccccc',
      fontFamily: "'Rajdhani', sans-serif",
      transition: 'all 0.2s ease-out',
      position: 'relative' as const,
    } as React.CSSProperties,
    deleteButton: {
      position: 'absolute' as const,
      top: '4px',
      right: '4px',
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: 'rgba(255, 100, 100, 0.3)',
      border: 'none',
      color: '#ff6464',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      opacity: 0,
      transition: 'opacity 0.2s ease-out',
    } as React.CSSProperties,
    saveTemplateContainer: {
      display: 'flex',
      gap: '8px',
      marginTop: '10px',
    } as React.CSSProperties,
    templateInput: {
      flex: 1,
      padding: '10px',
      borderRadius: '8px',
      background: '#1a1a2e',
      color: 'white',
      border: '1px solid #2a2a3e',
      fontFamily: "'Rajdhani', sans-serif",
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s ease-out',
    } as React.CSSProperties,
    saveButton: {
      padding: '10px 16px',
      borderRadius: '8px',
      background: '#6c63ff',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontFamily: "'Rajdhani', sans-serif",
      fontSize: '14px',
      fontWeight: 600,
      transition: 'all 0.2s ease-out',
    } as React.CSSProperties,
    errorText: {
      color: '#ff6464',
      fontSize: '12px',
      marginTop: '8px',
    } as React.CSSProperties,
    closeButton: {
      position: 'absolute' as const,
      top: '15px',
      left: '15px',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: 'transparent',
      color: '#888',
      border: 'none',
      cursor: 'pointer',
      display: isMobile ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
    } as React.CSSProperties,
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <>
      <div style={styles.overlay} onClick={() => setPanelOpen(false)} />

      <button
        style={styles.mobileButton}
        onClick={() => setPanelOpen(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(108, 99, 255, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.3)';
        }}
      >
        <ChevronRight size={20} />
      </button>

      <div style={styles.panel}>
        <button
          style={styles.closeButton}
          onClick={() => setPanelOpen(false)}
        >
          <X size={18} />
        </button>

        <button
          style={styles.exportButton}
          onClick={onExportSnapshot}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(108, 99, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          导出
        </button>

        <div style={{ height: '30px' }} />

        <div style={styles.sectionTitle}>节点控制</div>
        <hr style={styles.divider} />

        <div style={styles.sliderContainer}>
          <div style={styles.sliderLabel}>
            <span>节点大小</span>
            <span>{selectedNode?.size.toFixed(1) || '1.0'}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={selectedNode?.size || 1.0}
            style={styles.slider}
            onChange={(e) => {
              if (selectedNodeId) {
                updateNodeSize(selectedNodeId, parseFloat(e.target.value));
              }
            }}
            onMouseUp={() => sceneManager.enforceBounds()}
          />
        </div>

        <div style={styles.sliderContainer}>
          <div style={styles.sliderLabel}>
            <span>连线透明度</span>
            <span>{connectionOpacity.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="0.8"
            step="0.05"
            value={connectionOpacity}
            style={styles.slider}
            onChange={(e) => setConnectionOpacity(parseFloat(e.target.value))}
          />
        </div>

        <button
          style={styles.button}
          onClick={resetSculpture}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          重置雕塑
        </button>

        <div style={styles.sectionTitle}>颜色选择</div>
        <hr style={styles.divider} />

        <div style={styles.colorWheelContainer}>
          <canvas
            ref={canvasRef}
            width={120}
            height={120}
            style={{
              ...styles.colorWheel,
              boxShadow: isColorDragging ? '0 0 16px rgba(255,255,255,0.4)' : 'none',
            }}
            onMouseDown={handleColorWheelMouseDown}
            onMouseMove={handleColorWheelMouseMove}
            onMouseUp={handleColorWheelMouseUp}
          />
          <div style={styles.selectedColorDisplay}>
            <div
              style={{
                ...styles.colorCircle,
                background: selectedColor,
              }}
            />
            <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>
              {selectedColor.toUpperCase()}
            </span>
          </div>
        </div>

        <div style={styles.colorSchemes}>
          {colorSchemes.map((scheme) => (
            <div
              key={scheme.id}
              style={styles.schemeSwatch}
              onClick={() => applyColorScheme(scheme)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = '#6c63ff';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={styles.schemeDots}>
                {scheme.colors.map((color, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.schemeDot,
                      background: color,
                    }}
                  />
                ))}
              </div>
              <div style={styles.schemeName}>{scheme.name}</div>
            </div>
          ))}
        </div>

        <div style={styles.sectionTitle}>音乐驱动</div>
        <hr style={styles.divider} />

        {!audioFileName ? (
          <>
            <div
              style={dragActive ? styles.uploadZoneActive : styles.uploadZone}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onMouseEnter={(e) => {
                if (!dragActive) {
                  e.currentTarget.style.borderColor = '#6c63ff';
                  e.currentTarget.style.background = 'rgba(108, 99, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!dragActive) {
                  e.currentTarget.style.borderColor = '#3a3a4e';
                  e.currentTarget.style.borderStyle = 'dashed';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Upload size={32} style={{ color: '#6c63ff', marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                点击或拖拽上传音乐
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                支持 MP3 格式，最大 5MB
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,audio/mpeg"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
          </>
        ) : (
          <>
            <div style={styles.progressContainer}>
              <div style={styles.progressBar} onClick={handleProgressClick}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${audioProgress * 100}%`,
                  }}
                />
              </div>
              <div style={styles.progressTime}>
                <span>{formatTime(audioProgress * audioDuration)}</span>
                <span>{formatTime(audioDuration)}</span>
              </div>
            </div>

            <div style={styles.controlsRow}>
              <button
                style={styles.playButton}
                onClick={() => audioAnalyzerRef.current?.togglePlay()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div style={styles.audioInfo} title={audioFileName}>
                {audioFileName}
              </div>
            </div>
          </>
        )}

        {audioError && <div style={styles.errorText}>{audioError}</div>}

        <div style={styles.sectionTitle}>预设模板</div>
        <hr style={styles.divider} />

        <div style={styles.templatesGrid}>
          {templates.map((template) => (
            <div
              key={template.id}
              style={styles.templateCard}
              onClick={() => sceneManager.startTemplateTransition(template)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = '#6c63ff';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.3)';
                const deleteBtn = e.currentTarget.querySelector('button');
                if (deleteBtn) {
                  (deleteBtn as HTMLElement).style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = '#2a2a3e';
                e.currentTarget.style.boxShadow = 'none';
                const deleteBtn = e.currentTarget.querySelector('button');
                if (deleteBtn) {
                  (deleteBtn as HTMLElement).style.opacity = '0';
                }
              }}
            >
              {template.name}
              <button
                style={styles.deleteButton}
                onClick={(e) => handleDeleteTemplate(template.id, e)}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>

        <div style={styles.saveTemplateContainer}>
          <input
            type="text"
            placeholder="模板名称 (最多20字符)"
            value={templateName}
            maxLength={20}
            style={styles.templateInput}
            onChange={(e) => setTemplateName(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#6c63ff';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#2a2a3e';
            }}
          />
          <button
            style={styles.saveButton}
            onClick={handleSaveTemplate}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Save size={16} />
            保存
          </button>
        </div>

        <div style={{ height: '40px' }} />
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6c63ff;
          cursor: pointer;
          transition: all 0.2s ease-out;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 10px rgba(108, 99, 255, 0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6c63ff;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease-out;
        }
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 10px rgba(108, 99, 255, 0.5);
        }
      `}</style>
    </>
  );
};

export default ControlPanel;

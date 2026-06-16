import React, { useRef, useCallback } from 'react';
import { AudioClip, Project, THEME } from '../types';
import { extractPeaks } from '../engine/AudioEngine';

interface Props {
  projects: Project[];
  clipLibrary: AudioClip[];
  onNewProject: () => void;
  onLoadProject: (project: Project) => void;
  onFileUpload: (file: File) => void;
  onAddClipToTimeline: (clip: AudioClip) => void;
  currentProjectId?: string;
}

const Sidebar: React.FC<Props> = ({
  projects,
  clipLibrary,
  onNewProject,
  onLoadProject,
  onFileUpload,
  onAddClipToTimeline,
  currentProjectId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(onFileUpload);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onFileUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    Array.from(files).forEach((file) => {
      if (file.name.endsWith('.wav') || file.name.endsWith('.mp3')) {
        onFileUpload(file);
      }
    });
  }, [onFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>工程</span>
          <button className="btn btn-sm" onClick={onNewProject}>+</button>
        </div>
        <div className="sidebar-projects">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className={`sidebar-project-item ${proj.id === currentProjectId ? 'active' : ''}`}
              onClick={() => onLoadProject(proj)}
            >
              <div className="sidebar-project-name">{proj.name}</div>
              <div className="sidebar-project-time">
                {new Date(proj.lastModified).toLocaleDateString('zh-CN')}
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="sidebar-empty">暂无工程</div>
          )}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>片段库</span>
          <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
            上传
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        <div
          className="sidebar-clips"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {clipLibrary.map((clip) => (
            <SidebarClipItem
              key={clip.id}
              clip={clip}
              onAdd={() => onAddClipToTimeline(clip)}
            />
          ))}
          {clipLibrary.length === 0 && (
            <div className="sidebar-drop-zone">
              拖拽或点击上传<br />WAV / MP3
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ClipItemProps {
  clip: AudioClip;
  onAdd: () => void;
}

const SidebarClipItem: React.FC<ClipItemProps> = ({ clip, onAdd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || clip.pcmData.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = THEME.waveformBg;
    ctx.fillRect(0, 0, width, height);

    const samplesPerPixel = Math.max(1, Math.floor(clip.pcmData.length / width));
    const peaks = extractPeaks(clip.pcmData, samplesPerPixel);

    ctx.strokeStyle = THEME.waveformColor;
    ctx.lineWidth = 1;
    ctx.beginPath();

    const centerY = height / 2;
    const amplitude = (height - 4) / 2;
    const drawWidth = Math.min(peaks.length, width);

    for (let i = 0; i < drawWidth; i++) {
      const y1 = centerY - peaks[i] * amplitude;
      const y2 = centerY + peaks[i] * amplitude;
      ctx.moveTo(i, y1);
      ctx.lineTo(i, y2);
    }
    ctx.stroke();
  }, [clip]);

  return (
    <div className="sidebar-clip-item" onDoubleClick={onAdd}>
      <canvas
        ref={canvasRef}
        width={168}
        height={40}
        className="sidebar-clip-waveform"
      />
      <div className="sidebar-clip-info">
        <span className="sidebar-clip-name">{clip.name}</span>
        <span className="sidebar-clip-duration">{clip.duration.toFixed(1)}s</span>
      </div>
      <button className="sidebar-clip-add" onClick={onAdd}>+</button>
    </div>
  );
};

export default Sidebar;

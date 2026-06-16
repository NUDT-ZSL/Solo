import React, { useState, useCallback, useRef } from 'react';
import { AudioClip, Project, User, PALETTE, THEME } from '../types';
import { decodeAudioFile, exportMix, generateWaveformData } from '../engine/AudioEngine';
import Login from './Login';
import Sidebar from './Sidebar';
import ParentTimeLine from './ParentTimeLine';
import Mixer from './Mixer';
import ExportProgress from './ExportProgress';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [clips, setClips] = useState<AudioClip[]>([]);
  const [clipLibrary, setClipLibrary] = useState<AudioClip[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [mixerCollapsed, setMixerCollapsed] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const colorIndexRef = useRef<number>(0);

  const nextColor = useCallback(() => {
    const color = PALETTE[colorIndexRef.current % PALETTE.length];
    colorIndexRef.current++;
    return color;
  }, []);

  const handleLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return false;
      const userData: User = await res.json();
      setUser(userData);

      const projRes = await fetch(`/api/projects?userId=${userData.id}`);
      const projData: Project[] = await projRes.json();
      setProjects(projData);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('audio', file);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) return;
      const uploadData = await uploadRes.json();

      const arrayBuffer = await file.arrayBuffer();
      const decoded = await decodeAudioFile(arrayBuffer);

      const newClip: AudioClip = {
        id: uploadData.id,
        name: file.name.replace(/\.[^.]+$/, ''),
        fileName: file.name,
        color: nextColor(),
        pcmData: decoded.pcmData,
        sampleRate: decoded.sampleRate,
        channels: decoded.channels,
        duration: decoded.duration,
        startTime: 0,
        trimStart: 0,
        trimEnd: decoded.duration,
        volume: 80,
        fadeIn: 0,
        fadeOut: 0,
      };

      setClipLibrary((prev) => [...prev, newClip]);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }, [nextColor]);

  const handleAddClipToTimeline = useCallback((clip: AudioClip) => {
    const timelineClip: AudioClip = {
      ...clip,
      id: `${clip.id}_tl_${Date.now()}`,
      startTime: clips.length > 0 ? Math.max(...clips.map((c) => c.startTime + (c.trimEnd - c.trimStart))) + 0.5 : 0,
    };
    setClips((prev) => [...prev, timelineClip]);
  }, [clips]);

  const handleUpdateClip = useCallback((id: string, updates: Partial<AudioClip>) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const handleRemoveClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handlePlay = useCallback(() => {
    if (clips.length === 0) return;

    if (isPlaying) {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      cancelAnimationFrame(animFrameRef.current);
      setIsPlaying(false);
      return;
    }

    const ctx = new AudioContext({ sampleRate: 44100 });
    audioContextRef.current = ctx;

    const totalDuration = clips.reduce((max, c) => {
      const end = c.startTime + (c.trimEnd - c.trimStart);
      return end > max ? end : max;
    }, 0);

    const totalSamples = Math.ceil(totalDuration * 44100);
    const mixBuffer = ctx.createBuffer(2, totalSamples, 44100);
    const leftChannel = mixBuffer.getChannelData(0);
    const rightChannel = mixBuffer.getChannelData(1);

    for (const clip of clips) {
      const trimStartSample = Math.floor(clip.trimStart * clip.sampleRate);
      const trimEndSample = Math.floor(clip.trimEnd * clip.sampleRate);
      const trimmed = clip.pcmData.slice(trimStartSample, trimEndSample);
      const gain = clip.volume / 100;
      const fadeInSamples = Math.floor(clip.fadeIn * clip.sampleRate);
      const fadeOutSamples = Math.floor(clip.fadeOut * clip.sampleRate);

      const startOffset = Math.floor(clip.startTime * 44100);
      for (let i = 0; i < trimmed.length && (startOffset + i) < totalSamples; i++) {
        let sample = trimmed[i] * gain;

        if (i < fadeInSamples && fadeInSamples > 0) {
          sample *= i / fadeInSamples;
        }
        if (i >= trimmed.length - fadeOutSamples && fadeOutSamples > 0) {
          sample *= (trimmed.length - i) / fadeOutSamples;
        }

        leftChannel[startOffset + i] += sample;
        rightChannel[startOffset + i] += sample;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = mixBuffer;
    source.connect(ctx.destination);
    source.start(0, currentTime);
    sourceRef.current = source;

    playStartTimeRef.current = ctx.currentTime - currentTime;
    setIsPlaying(true);

    const tick = () => {
      if (!audioContextRef.current) return;
      const elapsed = ctx.currentTime - playStartTimeRef.current;
      setCurrentTime(elapsed);
      if (elapsed < totalDuration) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);

    source.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
  }, [clips, isPlaying, currentTime]);

  const handleExport = useCallback(async () => {
    if (clips.length === 0) return;
    setExportProgress(0);
    try {
      const wavBuffer = await exportMix(clips, (pct) => setExportProgress(pct));
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject?.name || 'mix'}_export.wav`;
      a.click();
      URL.revokeObjectURL(url);
      setTimeout(() => setExportProgress(null), 1500);
    } catch (err) {
      console.error('Export failed:', err);
      setExportProgress(null);
    }
  }, [clips, currentProject]);

  const handleSaveProject = useCallback(async () => {
    if (!user || !currentProject) return;
    try {
      const res = await fetch('/api/mix/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          name: currentProject.name,
          userId: user.id,
          clips: clips.map((c) => ({
            id: c.id,
            name: c.name,
            startTime: c.startTime,
            trimStart: c.trimStart,
            trimEnd: c.trimEnd,
            volume: c.volume,
            fadeIn: c.fadeIn,
            fadeOut: c.fadeOut,
            color: c.color,
          })),
        }),
      });
      const saved = await res.json();
      setCurrentProject(saved);
      setProjects((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [...prev, saved];
      });
    } catch (err) {
      console.error('Save failed:', err);
    }
  }, [user, currentProject, clips]);

  const handleNewProject = useCallback(() => {
    const newProj: Project = {
      id: `p_${Date.now()}`,
      name: 'New Project',
      userId: user?.id || '',
      clips: [],
      lastModified: new Date().toISOString(),
      thumbnail: '',
    };
    setCurrentProject(newProj);
    setClips([]);
  }, [user]);

  const handleLoadProject = useCallback((project: Project) => {
    setCurrentProject(project);
    if (project.clips && project.clips.length > 0) {
      const loadedClips = project.clips.map((c: any) => {
        const libClip = clipLibrary.find((lib) => lib.id === c.id || lib.name === c.name);
        return {
          ...c,
          pcmData: libClip?.pcmData || new Float32Array(0),
          sampleRate: libClip?.sampleRate || 44100,
          channels: libClip?.channels || 2,
          duration: libClip?.duration || (c.trimEnd - c.trimStart),
        } as AudioClip;
      });
      setClips(loadedClips);
    } else {
      setClips([]);
    }
  }, [clipLibrary]);

  const totalTimelineDuration = clips.length > 0
    ? Math.max(...clips.map((c) => c.startTime + (c.trimEnd - c.trimStart)))
    : 60;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <Sidebar
        projects={projects}
        clipLibrary={clipLibrary}
        onNewProject={handleNewProject}
        onLoadProject={handleLoadProject}
        onFileUpload={handleFileUpload}
        onAddClipToTimeline={handleAddClipToTimeline}
        currentProjectId={currentProject?.id}
      />
      <div className="main-area">
        <div className="toolbar">
          <div className="toolbar-left">
            <span className="project-name">{currentProject?.name || 'No Project'}</span>
            <button className="btn btn-secondary" onClick={handleSaveProject}>Save</button>
          </div>
          <div className="toolbar-center">
            <button
              className={`btn btn-play ${isPlaying ? 'playing' : ''}`}
              onClick={handlePlay}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(totalTimelineDuration)}
            </span>
          </div>
          <div className="toolbar-right">
            <button className="btn btn-primary" onClick={handleExport} disabled={clips.length === 0}>
              导出混音
            </button>
          </div>
        </div>
        <ParentTimeLine
          clips={clips}
          currentTime={currentTime}
          totalDuration={totalTimelineDuration}
          onUpdateClip={handleUpdateClip}
          onRemoveClip={handleRemoveClip}
        />
      </div>
      <div className={`mixer-panel ${mixerCollapsed ? 'collapsed' : ''}`}>
        <div className="mixer-toggle" onClick={() => setMixerCollapsed(!mixerCollapsed)}>
          {mixerCollapsed ? '◀' : '▶'}
        </div>
        {!mixerCollapsed && (
          <Mixer clips={clips} onUpdateClip={handleUpdateClip} onRemoveClip={handleRemoveClip} />
        )}
      </div>
      {exportProgress !== null && <ExportProgress progress={exportProgress} />}
    </div>
  );
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

export default App;

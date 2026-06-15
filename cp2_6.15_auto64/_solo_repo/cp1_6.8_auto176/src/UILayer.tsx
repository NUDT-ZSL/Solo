import { useState, useEffect, useRef, useCallback } from "react";
import { create } from "zustand";
import { PRESET_POEMS, AnalyzedPoem, AnalyzedLine, Poem } from "./PoemData";
import { analyzePoem, parseLines } from "./CoreEngine";
import { ParticleRenderer } from "./ParticleRenderer";

interface AppState {
  view: "select" | "display";
  analyzed: AnalyzedPoem | null;
  speed: number;
  playing: boolean;
  setView: (v: "select" | "display") => void;
  setAnalyzed: (p: AnalyzedPoem) => void;
  setSpeed: (s: number) => void;
  setPlaying: (p: boolean) => void;
}

const useAppStore = create<AppState>((set) => ({
  view: "select",
  analyzed: null,
  speed: 1,
  playing: true,
  setView: (view) => set({ view }),
  setAnalyzed: (analyzed) => set({ analyzed, view: "display", playing: true }),
  setSpeed: (speed) => set({ speed }),
  setPlaying: (playing) => set({ playing }),
}));

function PoemSelector() {
  const [search, setSearch] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [mode, setMode] = useState<"library" | "paste">("library");
  const setAnalyzed = useAppStore((s) => s.setAnalyzed);

  const filtered = PRESET_POEMS.filter(
    (p) =>
      p.title.includes(search) ||
      p.author.includes(search) ||
      p.lines[0]?.includes(search)
  );

  const handleSelectPoem = (poem: Poem) => {
    const result = analyzePoem(poem.lines, poem.title, `${poem.author}·${poem.dynasty}`);
    setAnalyzed(result);
  };

  const handlePaste = () => {
    const lines = parseLines(pasteText);
    if (lines.length === 0) return;
    const result = analyzePoem(lines);
    setAnalyzed(result);
  };

  const lineCount = pasteText.split(/\n/).filter((l) => l.trim()).length;
  const overLimit = lineCount > 12;

  return (
    <div className="select-view">
      <div className="select-header">
        <h1 className="app-title">潮汐诗笺</h1>
        <p className="app-subtitle">选一首诗，让墨韵为你而舞</p>
      </div>

      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === "library" ? "active" : ""}`}
          onClick={() => setMode("library")}
        >
          诗词库
        </button>
        <button
          className={`mode-tab ${mode === "paste" ? "active" : ""}`}
          onClick={() => setMode("paste")}
        >
          自题诗
        </button>
      </div>

      {mode === "library" && (
        <div className="library-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索诗名、作者或诗句..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="poem-grid">
            {filtered.map((poem) => (
              <div
                key={poem.id}
                className="poem-card"
                onClick={() => handleSelectPoem(poem)}
              >
                <div className="poem-card-title">{poem.title}</div>
                <div className="poem-card-author">
                  {poem.dynasty}·{poem.author}
                </div>
                <div className="poem-card-preview">{poem.lines[0]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "paste" && (
        <div className="paste-section">
          <textarea
            className="paste-textarea"
            placeholder="在此粘贴你的短诗，每行一句…"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
          />
          <div className={`line-counter ${overLimit ? "over" : ""}`}>
            {lineCount} / 12 行
          </div>
          <button
            className="start-btn"
            onClick={handlePaste}
            disabled={lineCount === 0 || overLimit}
          >
            开始赏析
          </button>
        </div>
      )}
    </div>
  );
}

function InfoCard({ line }: { line: AnalyzedLine }) {
  const pct = Math.round(line.intensity * 100);
  return (
    <div className="info-card">
      <div className="info-card-header">
        <span
          className="emotion-badge"
          style={{
            background: line.color.glow,
            color: line.color.primary,
          }}
        >
          {line.emotion}
        </span>
        <span className="intensity-label">情感浓度</span>
      </div>
      <div className="intensity-bar-track">
        <div
          className="intensity-bar-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${line.color.secondary}, ${line.color.primary})`,
          }}
        />
      </div>
      <div className="intensity-value">{pct}%</div>
      <div className="tags-row">
        {line.tags.map((tag, i) => (
          <span key={i} className="imagery-tag">
            {tag}
          </span>
        ))}
      </div>
      <div className="music-row">
        <span className="music-icon">♪</span>
        <span className="music-name">{line.music}</span>
      </div>
    </div>
  );
}

function WaterfallDisplay() {
  const analyzed = useAppStore((s) => s.analyzed);
  const speed = useAppStore((s) => s.speed);
  const playing = useAppStore((s) => s.playing);
  const setView = useAppStore((s) => s.setView);
  const setSpeed = useAppStore((s) => s.setSpeed);
  const setPlaying = useAppStore((s) => s.setPlaying);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ParticleRenderer | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new ParticleRenderer(canvasRef.current);
    rendererRef.current = renderer;
    renderer.start();

    const handleResize = () => renderer.handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.destroy();
    };
  }, []);

  useEffect(() => {
    setVisibleCount(0);
  }, [analyzed]);

  useEffect(() => {
    if (!analyzed || !playing) return;
    if (visibleCount >= analyzed.lines.length) return;

    const delay = 800 / speed;
    timerRef.current = setTimeout(() => {
      setVisibleCount((c) => Math.min(c + 1, analyzed.lines.length));
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visibleCount, analyzed, playing, speed]);

  const handleReplay = useCallback(() => {
    setVisibleCount(0);
    setPlaying(true);
  }, [setPlaying]);

  const handleBack = useCallback(() => {
    setView("select");
  }, [setView]);

  if (!analyzed) return null;

  return (
    <div className="display-view">
      <canvas ref={canvasRef} className="particle-canvas" />

      <div className="poem-header">
        <h2 className="poem-title">{analyzed.title}</h2>
        <span className="poem-author">{analyzed.author}</span>
      </div>

      <div className="waterfall">
        {analyzed.lines.slice(0, visibleCount).map((line, index) => (
          <div
            key={index}
            className="poem-line-wrapper"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className="poem-line"
              style={{
                color: line.color.primary,
                transitionDelay: `${index * 60}ms`,
              }}
            >
              <span
                className="emotion-line-bar"
                style={{ background: line.color.primary }}
              />
              <span className="poem-line-text">{line.text}</span>
            </div>
            {hoveredIndex === index && (
              <div className="info-card-anchor">
                <InfoCard line={line} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="control-bar">
        <button className="ctrl-btn" onClick={handleBack}>
          返回
        </button>
        <button
          className="ctrl-btn"
          onClick={() => setPlaying(!playing)}
        >
          {playing ? "暂停" : "播放"}
        </button>
        <button className="ctrl-btn" onClick={handleReplay}>
          重播
        </button>
        <div className="speed-control">
          <span className="speed-label">速度</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="speed-slider"
          />
          <span className="speed-value">{speed}x</span>
        </div>
      </div>
    </div>
  );
}

export default function UILayer() {
  const view = useAppStore((s) => s.view);

  return (
    <div className={`app-root ${view}`}>
      <div className="view-fade">
        {view === "select" ? <PoemSelector /> : <WaterfallDisplay />}
      </div>
    </div>
  );
}

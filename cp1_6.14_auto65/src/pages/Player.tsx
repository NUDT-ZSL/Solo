import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";
import axios from "axios";
import { Play, Pause, SkipBack, X, Sparkles, Volume2, ArrowLeft } from "lucide-react";
import Waveform from "@/components/Waveform";
import SentimentChart from "@/components/SentimentChart";
import { formatTime, findCurrentSegmentIndex } from "@/utils/transcriptSync";

interface Podcast {
  id: string;
  title: string;
  author: string;
  duration: number;
  coverUrl: string;
}

interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  sentiment: number;
}

interface Highlight {
  id: string;
  podcastId: string;
  text: string;
  timestamp: number;
  createdAt: string;
}

interface PlayerProps {
  socket: Socket | null;
}

const CLOCK_SYNC_INTERVAL = 5000;
const OFFSET_CALIBRATION_THRESHOLD = 0.05;

export default function Player({ socket }: PlayerProps) {
  const { id: podcastId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedText, setSelectedText] = useState("");
  const [showMarkBtn, setShowMarkBtn] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rafRef = useRef<number>(0);
  const lastSegmentIndexRef = useRef<number>(-1);
  const progressEmitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUserSeekingRef = useRef(false);
  const clockOffsetRef = useRef(0);
  const lastSyncTimeRef = useRef(0);
  const audioStartTimeRef = useRef(0);
  const audioContextStartTimeRef = useRef(0);

  const fetchHighlights = useCallback(() => {
    if (!podcastId) return;
    axios
      .get<Highlight[]>(`/api/podcasts/${podcastId}/highlights`)
      .then((res) => setHighlights(res.data))
      .catch((err) => console.error("Failed to fetch highlights:", err));
  }, [podcastId]);

  useEffect(() => {
    if (!podcastId) return;

    Promise.all([
      axios.get<Podcast>(`/api/podcasts/${podcastId}`),
      axios.get<TranscriptSegment[]>(`/api/podcasts/${podcastId}/transcript`),
      axios.get<Highlight[]>(`/api/podcasts/${podcastId}/highlights`),
    ])
      .then(([podcastRes, transcriptRes, highlightsRes]) => {
        setPodcast(podcastRes.data);
        setSegments(transcriptRes.data);
        setHighlights(highlightsRes.data);
      })
      .catch((err) => console.error("Failed to fetch data:", err))
      .finally(() => setLoading(false));
  }, [podcastId]);

  const initAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (err) {
      console.warn("AudioContext initialization failed:", err);
    }
  }, []);

  const ensureAudioContextRunning = useCallback(async () => {
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch (err) {
        console.warn("AudioContext resume failed:", err);
      }
    }
  }, []);

  const getPreciseCurrentTime = useCallback((): number => {
    const audio = audioRef.current;
    const audioContext = audioContextRef.current;

    if (!audio) return 0;

    if (audioContext && audioContext.state === "running" && !audio.paused) {
      const contextElapsed = audioContext.currentTime - audioContextStartTimeRef.current;
      const estimated = audioStartTimeRef.current + contextElapsed * audio.playbackRate + clockOffsetRef.current;
      return Math.max(0, Math.min(estimated, audio.duration || 0));
    }

    return audio.currentTime + clockOffsetRef.current;
  }, []);

  const calibrateClockOffset = useCallback(() => {
    const audio = audioRef.current;
    const audioContext = audioContextRef.current;
    if (!audio || !audioContext || audioContext.state !== "running") return;

    const audioTime = audio.currentTime;
    const contextElapsed = audioContext.currentTime - audioContextStartTimeRef.current;
    const estimatedFromContext = audioStartTimeRef.current + contextElapsed * audio.playbackRate;

    const offset = audioTime - estimatedFromContext;
    if (Math.abs(offset) > OFFSET_CALIBRATION_THRESHOLD) {
      clockOffsetRef.current += offset * 0.3;
      audioStartTimeRef.current = audioTime;
      audioContextStartTimeRef.current = audioContext.currentTime;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setAudioReady(true);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      initAudioContext();
      ensureAudioContextRunning().then(() => {
        if (audioContextRef.current) {
          audioStartTimeRef.current = audio.currentTime;
          audioContextStartTimeRef.current = audioContextRef.current.currentTime;
          lastSyncTimeRef.current = Date.now();
        }
      });
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      setAudioReady(true);
    };

    const handleSeeked = () => {
      if (audioContextRef.current && audioContextRef.current.state === "running") {
        audioStartTimeRef.current = audio.currentTime;
        audioContextStartTimeRef.current = audioContextRef.current.currentTime;
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("seeked", handleSeeked);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("seeked", handleSeeked);
    };
  }, [initAudioContext, ensureAudioContextRunning]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      return;
    }

    let lastCalibration = 0;

    const tick = () => {
      if (!isUserSeekingRef.current) {
        const preciseTime = getPreciseCurrentTime();
        setCurrentTime(preciseTime);

        const now = performance.now();
        if (now - lastCalibration > CLOCK_SYNC_INTERVAL) {
          calibrateClockOffset();
          lastCalibration = now;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, getPreciseCurrentTime, calibrateClockOffset]);

  const currentSegmentIndex = findCurrentSegmentIndex(segments, currentTime);

  useEffect(() => {
    if (currentSegmentIndex >= 0 && currentSegmentIndex !== lastSegmentIndexRef.current) {
      lastSegmentIndexRef.current = currentSegmentIndex;
      const seg = segments[currentSegmentIndex];
      if (seg) {
        const el = segmentRefs.current.get(seg.id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [currentSegmentIndex, segments]);

  useEffect(() => {
    if (!socket || !podcastId) return;

    socket.emit("join-podcast", podcastId);

    const onProgress = (data: { podcastId: string; currentTime: number; socketId: string }) => {
      if (data.podcastId === podcastId && data.socketId !== socket.id) {
        if (audioRef.current) {
          audioRef.current.currentTime = data.currentTime;
          setCurrentTime(data.currentTime);
        }
      }
    };

    socket.on("progress", onProgress);

    return () => {
      socket.emit("leave-podcast", podcastId);
      socket.off("progress", onProgress);
    };
  }, [socket, podcastId]);

  useEffect(() => {
    if (!socket || !isPlaying || !podcastId) {
      if (progressEmitTimerRef.current) {
        clearInterval(progressEmitTimerRef.current);
        progressEmitTimerRef.current = null;
      }
      return;
    }

    progressEmitTimerRef.current = setInterval(() => {
      if (audioRef.current) {
        socket.emit("progress", {
          podcastId,
          currentTime: audioRef.current.currentTime,
        });
      }
    }, 1000);

    return () => {
      if (progressEmitTimerRef.current) {
        clearInterval(progressEmitTimerRef.current);
        progressEmitTimerRef.current = null;
      }
    };
  }, [socket, isPlaying, podcastId]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    initAudioContext();
    await ensureAudioContextRunning();

    if (audio.paused) {
      try {
        await audio.play();
      } catch (err) {
        console.error("Play failed:", err);
      }
    } else {
      audio.pause();
    }
  }, [initAudioContext, ensureAudioContextRunning]);

  const handleProgressChangeStart = () => {
    isUserSeekingRef.current = true;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
  };

  const handleProgressChangeEnd = () => {
    isUserSeekingRef.current = false;
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime;
      if (audioContextRef.current && audioContextRef.current.state === "running") {
        audioStartTimeRef.current = currentTime;
        audioContextStartTimeRef.current = audioContextRef.current.currentTime;
      }
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    if (audioRef.current && audioContextRef.current?.state === "running") {
      audioStartTimeRef.current = audioRef.current.currentTime;
      audioContextStartTimeRef.current = audioContextRef.current.currentTime;
    }
  };

  const handleTranscriptMouseUp = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || "";
    if (text.length > 0) {
      setSelectedText(text);
      setShowMarkBtn(true);
    } else {
      setShowMarkBtn(false);
    }
  };

  const handleMarkHighlight = () => {
    if (!podcastId || !selectedText) return;
    axios
      .post<Highlight>(`/api/podcasts/${podcastId}/highlights`, {
        text: selectedText,
        timestamp: currentTime,
      })
      .then(() => {
        setSelectedText("");
        setShowMarkBtn(false);
        fetchHighlights();
        window.getSelection()?.removeAllRanges();
      })
      .catch((err) => console.error("Failed to create highlight:", err));
  };

  const handleDeleteHighlight = (highlightId: string) => {
    axios
      .delete(`/api/highlights/${highlightId}`)
      .then(() => fetchHighlights())
      .catch((err) => console.error("Failed to delete highlight:", err));
  };

  const handleHighlightClick = (timestamp: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
  };

  if (loading || !podcast) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen flex-col md:flex-row">
        <div className="w-full min-w-0 bg-primary-bg p-4 md:w-[45%] md:p-8">
          <div className="mb-3 flex items-center gap-3 md:hidden">
            <button
              onClick={() => navigate("/")}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/80 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white"
              aria-label="返回"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="truncate text-sm font-medium text-gray-600">返回列表</span>
          </div>

          <audio
            ref={audioRef}
            src={`/api/podcasts/${podcastId}/audio`}
            preload="metadata"
            crossOrigin="anonymous"
          />

          <div className="mb-4 md:mb-6">
            <h1 className="truncate text-xl font-bold text-dark md:text-2xl">{podcast.title}</h1>
            <p className="mt-1 truncate text-sm text-gray-500 md:text-base">{podcast.author}</p>
          </div>

          <Waveform
            analyser={analyserRef.current}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration || podcast.duration}
          />

          <div className="mt-3 flex items-center gap-3 md:mt-4">
            <span className="flex-shrink-0 text-xs text-gray-500 md:text-sm">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || podcast.duration}
              step={0.1}
              value={currentTime}
              onMouseDown={handleProgressChangeStart}
              onTouchStart={handleProgressChangeStart}
              onChange={handleProgressChange}
              onMouseUp={handleProgressChangeEnd}
              onTouchEnd={handleProgressChangeEnd}
              className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary"
            />
            <span className="flex-shrink-0 text-xs text-gray-500 md:text-sm">
              {formatTime(duration || podcast.duration)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 md:mt-5 md:gap-3">
            <button
              onClick={handleRestart}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-gray-600 shadow transition-colors hover:bg-gray-100"
              aria-label="重新开始"
            >
              <SkipBack size={18} />
            </button>
            <button
              onClick={togglePlay}
              disabled={!audioReady}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-[#6d28d9] disabled:opacity-50"
              aria-label={isPlaying ? "暂停" : "播放"}
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
            </button>
            <div className="ml-2 flex flex-wrap gap-2 md:ml-4">
              {[1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`h-9 rounded-full px-3 text-sm font-medium transition-colors ${
                    playbackRate === rate
                      ? "bg-primary text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 text-gray-400">
              <Volume2 size={16} />
              <span className="text-xs">{audioReady ? "就绪" : "加载中..."}</span>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 md:w-[55%]">
          <div className="p-4 md:p-8">
            <div
              ref={transcriptRef}
              onMouseUp={handleTranscriptMouseUp}
              className="max-h-[350px] overflow-y-auto rounded-xl bg-surface p-4 text-[14px] leading-relaxed md:max-h-[400px] md:text-[15px]"
              style={{ scrollBehavior: "smooth" }}
            >
              {segments.map((seg) => {
                const isCurrent =
                  currentSegmentIndex >= 0 &&
                  segments[currentSegmentIndex]?.id === seg.id;
                return (
                  <div
                    key={seg.id}
                    ref={(el) => {
                      if (el) segmentRefs.current.set(seg.id, el);
                    }}
                    className={`rounded-lg px-3 py-2 transition-colors duration-150 ${
                      isCurrent
                        ? "bg-primary-highlight font-medium text-dark"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {seg.text}
                  </div>
                );
              })}
            </div>

            {showMarkBtn && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleMarkHighlight}
                  className="flex h-9 w-[100px] items-center justify-center gap-1.5 rounded-full bg-primary text-white transition-colors duration-200 hover:bg-[#6d28d9]"
                >
                  <Sparkles size={14} />
                  标记精彩
                </button>
              </div>
            )}

            <div className="mt-6">
              <SentimentChart
                segments={segments}
                currentTime={currentTime}
                duration={duration || podcast.duration}
              />
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-base font-bold text-dark md:text-lg">精彩时刻</h3>
              {highlights.length === 0 ? (
                <p className="text-sm text-gray-400">暂无标记，选中转录文字后点击"标记精彩"</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {highlights.map((hl) => (
                    <div
                      key={hl.id}
                      className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md"
                    >
                      <button
                        onClick={() => handleHighlightClick(hl.timestamp)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm text-dark">
                          {hl.text.length > 20 ? hl.text.slice(0, 20) + "..." : hl.text}
                        </p>
                        <span className="text-xs text-gray-400">
                          {formatTime(hl.timestamp)}
                        </span>
                      </button>
                      <button
                        onClick={() => handleDeleteHighlight(hl.id)}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 transition-all duration-300 hover:rotate-90 hover:bg-red-200"
                        aria-label="删除"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

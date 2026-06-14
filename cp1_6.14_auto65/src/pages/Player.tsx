import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Socket } from "socket.io-client";
import axios from "axios";
import { Play, Pause, SkipBack, X, Sparkles } from "lucide-react";
import Waveform from "@/components/Waveform";
import SentimentChart from "@/components/SentimentChart";

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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface PlayerProps {
  socket: Socket | null;
}

export default function Player({ socket }: PlayerProps) {
  const { id: podcastId } = useParams<{ id: string }>();

  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedText, setSelectedText] = useState("");
  const [showMarkBtn, setShowMarkBtn] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (isPlaying) {
      progressTimerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1 * playbackRate;
          if (podcast && next >= podcast.duration) {
            setIsPlaying(false);
            return podcast.duration;
          }
          return next;
        });
      }, 100);
    } else {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [isPlaying, playbackRate, podcast]);

  const currentSegmentIndex = segments.findIndex(
    (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
  );

  useEffect(() => {
    if (currentSegmentIndex >= 0) {
      const seg = segments[currentSegmentIndex];
      const el = segmentRefs.current.get(seg.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentSegmentIndex, segments]);

  useEffect(() => {
    if (!socket || !podcastId) return;

    socket.emit("join-podcast", podcastId);

    const onProgress = (data: { podcastId: string; currentTime: number }) => {
      if (data.podcastId === podcastId) {
        setCurrentTime(data.currentTime);
      }
    };

    socket.on("progress", onProgress);

    return () => {
      socket.emit("leave-podcast", podcastId);
      socket.off("progress", onProgress);
    };
  }, [socket, podcastId]);

  useEffect(() => {
    if (!socket || !isPlaying || !podcastId) return;

    const interval = setInterval(() => {
      socket.emit("progress", { podcastId, currentTime });
    }, 1000);

    return () => clearInterval(interval);
  }, [socket, isPlaying, podcastId, currentTime]);

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

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
  };

  if (loading || !podcast) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="w-full bg-primary-bg p-6 md:w-[45%] md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark">{podcast.title}</h1>
          <p className="mt-1 text-gray-500">{podcast.author}</p>
        </div>

        <Waveform
          currentTime={currentTime}
          duration={podcast.duration}
          isPlaying={isPlaying}
          segments={segments}
        />

        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-gray-500">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={podcast.duration}
            step={0.1}
            value={currentTime}
            onChange={handleProgressChange}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary"
          />
          <span className="text-sm text-gray-500">{formatTime(podcast.duration)}</span>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleRestart}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow transition-colors hover:bg-gray-100"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-[#6d28d9]"
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
          </button>
          <div className="ml-4 flex gap-2">
            {[1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
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
        </div>
      </div>

      <div className="w-full md:w-[55%]">
        <div className="p-6 md:p-8">
          <div
            ref={transcriptRef}
            onMouseUp={handleTranscriptMouseUp}
            className="max-h-[400px] overflow-y-auto rounded-xl bg-surface p-4"
          >
            {segments.map((seg) => {
              const isCurrent =
                currentSegmentIndex >= 0 && segments[currentSegmentIndex]?.id === seg.id;
              return (
                <div
                  key={seg.id}
                  ref={(el) => {
                    if (el) segmentRefs.current.set(seg.id, el);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm leading-relaxed transition-colors ${
                    isCurrent ? "bg-primary-highlight font-medium text-dark" : "text-gray-700"
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
              duration={podcast.duration}
            />
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-lg font-bold text-dark">精彩时刻</h3>
            {highlights.length === 0 ? (
              <p className="text-sm text-gray-400">暂无标记，选中转录文字后点击"标记精彩"</p>
            ) : (
              <div className="flex flex-col gap-3">
                {highlights.map((hl) => (
                  <div
                    key={hl.id}
                    className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-dark">
                        {hl.text.length > 20 ? hl.text.slice(0, 20) + "..." : hl.text}
                      </p>
                      <span className="text-xs text-gray-400">
                        {formatTime(hl.timestamp)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteHighlight(hl.id)}
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 transition-transform duration-300 hover:rotate-90"
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
  );
}

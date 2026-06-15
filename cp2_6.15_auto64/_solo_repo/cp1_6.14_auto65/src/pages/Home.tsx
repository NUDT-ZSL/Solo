import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Clock, User } from "lucide-react";

interface Podcast {
  id: string;
  title: string;
  author: string;
  duration: number;
  coverUrl: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function SkeletonCard() {
  return (
    <div className="w-full max-w-[320px] rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex gap-4">
        <div className="h-[120px] w-[120px] flex-shrink-0 rounded-lg bg-gray-200 animate-pulse" />
        <div className="flex flex-col gap-2 py-1">
          <div className="h-5 w-32 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get<Podcast[]>("/api/podcasts")
      .then((res) => setPodcasts(res.data))
      .catch((err) => console.error("Failed to fetch podcasts:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="py-8 text-center sm:py-12">
        <h1 className="text-2xl font-bold text-dark sm:text-3xl md:text-4xl">
          探索播客
        </h1>
        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          沉浸式文字同步 · 情感可视化 · 互动标记
        </p>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {podcasts.map((podcast) => (
              <div
                key={podcast.id}
                onClick={() => navigate(`/podcast/${podcast.id}`)}
                className="w-full cursor-pointer rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-250 ease-out hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <img
                    src={podcast.coverUrl}
                    alt={podcast.title}
                    className="h-[120px] w-full flex-shrink-0 rounded-lg object-cover sm:w-[120px]"
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-1">
                    <h3 className="truncate text-base font-bold text-dark">
                      {podcast.title}
                    </h3>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <User size={14} />
                      {podcast.author}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-400">
                      <Clock size={14} />
                      {formatDuration(podcast.duration)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

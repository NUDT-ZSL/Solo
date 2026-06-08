import { useBookStore } from "./store";
import { getScrollEngine } from "./ScrollEngine";

export default function ControlPanel() {
  const currentChapter = useBookStore((s) => s.currentChapter);
  const completedChapters = useBookStore((s) => s.completedChapters);
  const chapters = useBookStore((s) => s.chapters);
  const jumpMenuOpen = useBookStore((s) => s.jumpMenuOpen);
  const setJumpMenuOpen = useBookStore((s) => s.setJumpMenuOpen);
  const jumpToChapter = useBookStore((s) => s.jumpToChapter);
  const reset = useBookStore((s) => s.reset);
  const getProgress = useBookStore((s) => s.getProgress);
  const getRemaining = useBookStore((s) => s.getRemaining);

  const progress = getProgress();
  const remaining = getRemaining();
  const progressPercent = Math.round(progress * 100);

  return (
    <div className="w-full max-w-[800px] mx-auto mt-6 px-4 z-10 relative">
      <div
        className="rounded-xl p-5 md:p-6"
        style={{
          background: "rgba(245, 240, 232, 0.7)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(93, 58, 26, 0.15)",
          boxShadow:
            "0 8px 32px rgba(93, 58, 26, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  color: "#8B7355",
                }}
              >
                阅读进度
              </span>
              <span
                className="text-lg font-bold"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  color: "#5D3A1A",
                }}
              >
                {progressPercent}%
              </span>
            </div>

            <div
              className="w-full h-3 rounded-full overflow-hidden"
              style={{ background: "rgba(93, 58, 26, 0.1)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background:
                    progress > 0
                      ? `linear-gradient(90deg, #4A90D9, ${progressPercent > 50 ? "#E8934A" : "#7AB8E8"})`
                      : "transparent",
                  boxShadow:
                    progress > 0
                      ? "0 0 8px rgba(74, 144, 217, 0.4)"
                      : "none",
                }}
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <span
                className="text-xs"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  color: "#8B7355",
                }}
              >
                剩余 {remaining} 章
              </span>
              <span
                className="text-xs"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  color: "#8B7355",
                }}
              >
                已读 {completedChapters.length} / {chapters.length} 章
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setJumpMenuOpen(!jumpMenuOpen)}
                className="px-4 py-2 rounded-lg text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  background: "rgba(93, 58, 26, 0.08)",
                  color: "#5D3A1A",
                  border: "1px solid rgba(93, 58, 26, 0.2)",
                }}
              >
                章节跳转 ▾
              </button>

              {jumpMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setJumpMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-2 w-56 max-h-72 overflow-y-auto rounded-xl z-50 py-2 custom-scrollbar"
                    style={{
                      background: "rgba(245, 240, 232, 0.92)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      border: "1px solid rgba(93, 58, 26, 0.15)",
                      boxShadow: "0 12px 40px rgba(93, 58, 26, 0.15)",
                    }}
                  >
                    {chapters.map((ch, idx) => (
                      <button
                        key={ch.id}
                        onClick={() => {
                          jumpToChapter(idx);
                          setJumpMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm transition-colors duration-150"
                        style={{
                          fontFamily: "'Noto Serif SC', serif",
                          color:
                            idx === currentChapter
                              ? "#E8934A"
                              : completedChapters.includes(idx)
                                ? "#5D3A1A"
                                : "#8B7355",
                          background:
                            idx === currentChapter
                              ? "rgba(232, 147, 74, 0.1)"
                              : "transparent",
                          fontWeight:
                            idx === currentChapter ? "bold" : "normal",
                        }}
                        onMouseEnter={(e) => {
                          if (idx !== currentChapter) {
                            e.currentTarget.style.background =
                              "rgba(93, 58, 26, 0.06)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (idx !== currentChapter) {
                            e.currentTarget.style.background =
                              idx === currentChapter
                                ? "rgba(232, 147, 74, 0.1)"
                                : "transparent";
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              background: completedChapters.includes(idx)
                                ? getScrollEngine().getColorForChapter(idx)
                                : "rgba(93, 58, 26, 0.2)",
                              boxShadow: completedChapters.includes(idx)
                                ? `0 0 6px ${getScrollEngine().getGlowColorForChapter(idx)}`
                                : "none",
                            }}
                          />
                          <span className="truncate">{ch.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg text-sm transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                fontFamily: "'Noto Serif SC', serif",
                background: "rgba(93, 58, 26, 0.08)",
                color: "#8B7355",
                border: "1px solid rgba(93, 58, 26, 0.2)",
              }}
            >
              重置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

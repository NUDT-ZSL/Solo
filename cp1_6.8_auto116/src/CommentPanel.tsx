import { useState, useRef, useCallback } from "react";
import { useGalleryStore } from "./store";
import { ArtworkService } from "./ArtworkService";
import { Heart, X, Send, MessageCircle } from "lucide-react";

export default function CommentPanel() {
  const {
    selectedArtwork,
    isDetailOpen,
    setDetailOpen,
    user,
    updateArtworkLike,
    addComment,
  } = useGalleryStore();

  const [commentText, setCommentText] = useState("");
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [likeRipple, setLikeRipple] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setDetailOpen(false);
  }, [setDetailOpen]);

  const handleLike = useCallback(async () => {
    if (!user || !selectedArtwork) return;
    setLikeRipple(true);
    setTimeout(() => setLikeRipple(false), 600);
    try {
      const res = await ArtworkService.toggleLike(selectedArtwork.id);
      const newLikes = res.liked
        ? [...selectedArtwork.likes, user.username]
        : selectedArtwork.likes.filter((u) => u !== user.username);
      updateArtworkLike(selectedArtwork.id, newLikes, res.liked);
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 300);
    } catch {
      // silent
    }
  }, [user, selectedArtwork, updateArtworkLike]);

  const handleComment = useCallback(async () => {
    if (!user || !selectedArtwork || !commentText.trim()) return;
    try {
      const res = await ArtworkService.addComment(
        selectedArtwork.id,
        commentText.trim()
      );
      addComment(selectedArtwork.id, res);
      setCommentText("");
    } catch {
      // silent
    }
  }, [user, selectedArtwork, commentText, addComment]);

  if (!isDetailOpen || !selectedArtwork) return null;

  const isLiked = user
    ? selectedArtwork.likes.includes(user.username)
    : false;
  const likeCount = selectedArtwork.likes.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={handleClose}
      />

      <div
        className="relative z-10 w-full max-w-3xl mx-4 animate-scale-in"
        style={{
          perspective: "1200px",
        }}
      >
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{
            background: "rgba(26, 31, 46, 0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid transparent",
            backgroundImage:
              "linear-gradient(rgba(26, 31, 46, 0.9), rgba(26, 31, 46, 0.9)), linear-gradient(135deg, rgba(74, 127, 255, 0.4), rgba(212, 168, 83, 0.4), rgba(192, 192, 192, 0.3))",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
          }}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gallery-muted hover:text-gallery-text hover:bg-white/10 transition-colors z-10"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col md:flex-row">
            <div className="md:w-3/5 p-6 flex items-center justify-center bg-black/20">
              <img
                src={selectedArtwork.image_url}
                alt={selectedArtwork.title}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl"
                style={{
                  animation: "scaleIn 0.5s ease-out",
                }}
              />
            </div>

            <div className="md:w-2/5 p-6 flex flex-col">
              <h2 className="font-serif text-2xl text-gallery-text mb-2 leading-tight">
                {selectedArtwork.title}
              </h2>

              <div className="flex flex-wrap gap-2 mb-4">
                {selectedArtwork.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs font-body"
                    style={{
                      background: "rgba(74, 127, 255, 0.15)",
                      color: "#7ba0ff",
                      border: "1px solid rgba(74, 127, 255, 0.25)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="text-gallery-muted text-sm mb-6">
                {new Date(selectedArtwork.upload_time).toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>

              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={handleLike}
                  disabled={!user}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 disabled:opacity-40"
                  style={{
                    background: isLiked
                      ? "rgba(212, 168, 83, 0.2)"
                      : "rgba(255, 255, 255, 0.08)",
                    border: isLiked
                      ? "1px solid rgba(212, 168, 83, 0.4)"
                      : "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {likeRipple && (
                    <span
                      className="absolute inset-0 rounded-full animate-ripple"
                      style={{
                        background: "rgba(212, 168, 83, 0.3)",
                      }}
                    />
                  )}
                  <Heart
                    size={18}
                    className={`transition-colors duration-300 ${
                      isLiked ? "text-gallery-gold fill-gallery-gold" : "text-gallery-muted"
                    }`}
                  />
                  <span
                    className={`text-sm font-body ${
                      isLiked ? "text-gallery-gold" : "text-gallery-muted"
                    } ${likeAnimating ? "animate-number-grow" : ""}`}
                  >
                    {likeCount}
                  </span>
                </button>

                <div className="flex items-center gap-1 text-gallery-muted">
                  <MessageCircle size={16} />
                  <span className="text-sm">
                    {selectedArtwork.comments.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-1 max-h-[30vh] scrollbar-thin">
                {selectedArtwork.comments.length === 0 && (
                  <p className="text-gallery-muted text-sm text-center py-4">
                    暂无评论，留下第一条评论吧
                  </p>
                )}
                {selectedArtwork.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-lg animate-slide-up"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gallery-accent text-xs font-semibold">
                        {comment.username}
                      </span>
                      <span className="text-gallery-muted text-xs">
                        {new Date(comment.created_at).toLocaleDateString(
                          "zh-CN"
                        )}
                      </span>
                    </div>
                    <p className="text-gallery-text text-sm leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>

              {user && (
                <div
                  className="flex items-center gap-2 p-2 rounded-xl"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleComment()}
                    placeholder="写下你的感受..."
                    className="flex-1 bg-transparent text-gallery-text text-sm placeholder:text-gallery-muted/50 outline-none px-2 font-body"
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentText.trim()}
                    className="p-2 rounded-lg transition-colors disabled:opacity-30 hover:bg-gallery-accent/20 text-gallery-accent"
                  >
                    <Send size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

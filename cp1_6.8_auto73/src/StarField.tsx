import React, { useRef, useEffect, useCallback, useState } from "react";
import { StarEngine, Star, STAR_COLORS } from "./StarEngine";
import { ApiClient, Wish } from "./ApiClient";

interface StarFieldProps {
  userId: string;
  onStarClick: (star: Star) => void;
}

const ADD_WISH_KEY = "starwish_adding";

export const StarField: React.FC<StarFieldProps> = ({ userId, onStarClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StarEngine>(new StarEngine());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [showAddWish, setShowAddWish] = useState(false);
  const [wishText, setWishText] = useState("");
  const [selectedColor, setSelectedColor] = useState(STAR_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const hoveredStarRef = useRef<Star | null>(null);

  const loadStars = useCallback(async () => {
    try {
      const wishes = await ApiClient.getAllWishes();
      const engine = engineRef.current;
      const existingIds = new Set(engine.stars.map((s) => s.id));
      for (const w of wishes) {
        if (!existingIds.has(w.id)) {
          engine.addStar({
            id: w.id,
            text: w.text,
            color: w.color,
            userId: w.user_id,
            blessings: w.blessings,
            createdAt: w.created_at,
          });
        }
      }
    } catch (e) {
      console.error("Failed to load stars:", e);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = engineRef.current;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);
      engine.resize(window.innerWidth, window.innerHeight);
    };

    resize();
    window.addEventListener("resize", resize);
    loadStars();

    const pollInterval = setInterval(loadStars, 5000);

    const animate = (time: number) => {
      const dt = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = time;

      engine.update(dt);

      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const gradient = ctx.createLinearGradient(0, 0, 0, engine.canvasH);
      gradient.addColorStop(0, "#0a0a2e");
      gradient.addColorStop(0.5, "#0d0d3a");
      gradient.addColorStop(1, "#1a0a2e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, engine.canvasW, engine.canvasH);

      renderBackgroundStars(ctx, engine.canvasW, engine.canvasH, time);

      engine.render(ctx);

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
      clearInterval(pollInterval);
    };
  }, [loadStars]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const engine = engineRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const star = engine.findStarAt(x, y);
    if (hoveredStarRef.current && hoveredStarRef.current !== star) {
      hoveredStarRef.current.hovered = false;
    }
    if (star) {
      star.hovered = true;
      canvasRef.current!.style.cursor = "pointer";
    } else {
      canvasRef.current!.style.cursor = "default";
    }
    hoveredStarRef.current = star;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const engine = engineRef.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const star = engine.findStarAt(x, y);
      if (star) {
        star.triggerBurst();
        engine.spawnBurstParticles(star);
        onStarClick(star);
      }
    },
    [onStarClick]
  );

  const handleSubmitWish = async () => {
    if (!wishText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const wish = await ApiClient.createWish(wishText.trim(), selectedColor, userId);
      engineRef.current.addStar({
        id: wish.id,
        text: wish.text,
        color: wish.color,
        userId: wish.user_id,
        blessings: wish.blessings,
        createdAt: wish.created_at,
      });
      setWishText("");
      setShowAddWish(false);
      localStorage.removeItem(ADD_WISH_KEY);
    } catch (e) {
      console.error("Failed to create wish:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{ display: "block" }}
      />

      <button
        onClick={() => setShowAddWish(!showAddWish)}
        style={{
          position: "fixed",
          bottom: 80,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "2px solid rgba(255,215,0,0.5)",
          background: "rgba(10,10,46,0.8)",
          color: "#FFD700",
          fontSize: 28,
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          boxShadow: "0 0 20px rgba(255,215,0,0.3)",
          transition: "all 0.3s ease",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        +
      </button>

      {showAddWish && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            animation: "fadeIn 0.3s ease",
          }}
          onClick={() => {
            setShowAddWish(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(13,13,58,0.92)",
              backdropFilter: "blur(20px)",
              borderRadius: 20,
              padding: "32px 28px",
              width: "min(420px, 90vw)",
              border: "1px solid rgba(255,215,0,0.2)",
              boxShadow: "0 0 40px rgba(255,215,0,0.1), inset 0 0 30px rgba(255,215,0,0.03)",
              animation: "slideUp 0.3s ease",
            }}
          >
            <h2
              style={{
                color: "#FFD700",
                fontSize: 22,
                fontWeight: 600,
                marginBottom: 20,
                textAlign: "center",
                textShadow: "0 0 10px rgba(255,215,0,0.5)",
              }}
            >
              ✦ 许下心愿 ✦
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 8, display: "block" }}>
                选择星色
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {STAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: selectedColor === c ? "2px solid #fff" : "2px solid transparent",
                      background: c,
                      cursor: "pointer",
                      boxShadow: selectedColor === c ? `0 0 16px ${c}` : `0 0 8px ${c}40`,
                      transition: "all 0.2s ease",
                      transform: selectedColor === c ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 8, display: "block" }}>
                愿望（限100字）
              </label>
              <textarea
                maxLength={100}
                value={wishText}
                onChange={(e) => setWishText(e.target.value)}
                placeholder="写下你的心愿…"
                rows={3}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,215,0,0.2)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#fff",
                  fontSize: 15,
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(255,215,0,0.5)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,215,0,0.2)")}
              />
              <div style={{ textAlign: "right", color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>
                {wishText.length}/100
              </div>
            </div>

            <button
              onClick={handleSubmitWish}
              disabled={!wishText.trim() || submitting}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 12,
                border: "none",
                background: wishText.trim()
                  ? "linear-gradient(135deg, #FFD700, #FF8A65)"
                  : "rgba(255,255,255,0.1)",
                color: wishText.trim() ? "#0a0a2e" : "rgba(255,255,255,0.3)",
                fontSize: 16,
                fontWeight: 600,
                cursor: wishText.trim() ? "pointer" : "not-allowed",
                transition: "all 0.3s ease",
                boxShadow: wishText.trim() ? "0 0 20px rgba(255,215,0,0.3)" : "none",
              }}
            >
              {submitting ? "投放中…" : "投入星河"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function renderBackgroundStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number
) {
  const seed = 42;
  const count = 120;
  for (let i = 0; i < count; i++) {
    const hash = simpleHash(seed + i);
    const x = (hash % w);
    const y = ((hash * 7) % h);
    const size = 0.3 + (hash % 10) * 0.08;
    const flicker = 0.3 + 0.7 * ((Math.sin(time * 0.001 + hash) + 1) * 0.5);
    ctx.save();
    ctx.globalAlpha = flicker * 0.5;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function simpleHash(n: number): number {
  let h = n * 2654435761;
  h = ((h >>> 16) ^ h) * 45679;
  h = ((h >>> 16) ^ h) * 45679;
  h = (h >>> 16) ^ h;
  return Math.abs(h);
}

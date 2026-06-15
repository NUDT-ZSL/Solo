import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Lock, Unlock, X } from "lucide-react";
import { useCapsuleStore } from "@/store/capsuleStore";
import {
  isExpired,
  getRemainingTime,
  formatDate,
} from "@/utils/CapsuleManager";
import type { Capsule } from "@/utils/CapsuleManager";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const PARTICLE_COLORS = [
  "#FF6B6B",
  "#FFD93D",
  "#6BCB77",
  "#4ECDC4",
  "#A18CD1",
  "#FBC2EB",
  "#FF9A9E",
  "#667EEA",
  "#F093FB",
  "#43E97B",
  "#FA709A",
  "#FEE140",
  "#84FAB0",
  "#C471F5",
  "#F8B500",
];

function ParticleCanvas({
  active,
  originRef,
}: {
  active: boolean;
  originRef: React.RefObject<HTMLDivElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  const spawnParticles = useCallback(() => {
    if (!originRef.current || !canvasRef.current) return;
    const rect = originRef.current.getBoundingClientRect();
    const canvas = canvasRef.current;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const newParticles: Particle[] = [];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      newParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.6,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        size: 3 + Math.random() * 5,
      });
    }
    particlesRef.current = newParticles;
  }, [originRef]);

  useEffect(() => {
    if (!active) {
      particlesRef.current = [];
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    spawnParticles();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;
      let alive = false;

      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life -= 1 / 60 / p.maxLife;

        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      if (alive) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, spawnParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
      style={{ pointerEvents: "none" }}
    />
  );
}

function CapsuleCard({
  capsule,
  index,
  onOpen,
}: {
  capsule: Capsule;
  index: number;
  onOpen: (capsule: Capsule, ref: HTMLDivElement) => void;
}) {
  const expired = isExpired(capsule);
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="archive-card glass-card"
      ref={cardRef}
      style={{
        animationDelay: `${index * 0.08}s`,
      }}
    >
      <div
        className="archive-card-glow"
        style={{ background: capsule.gradientColor }}
      />
      <div className="archive-card-body">
        <div className="archive-card-header">
          <div
            className="archive-card-dot"
            style={{ background: capsule.gradientColor }}
          />
          <span className="archive-card-date">
            {formatDate(capsule.createdAt)}
          </span>
          {expired ? (
            <Unlock size={14} className="archive-card-status expired" />
          ) : (
            <Lock size={14} className="archive-card-status locked" />
          )}
        </div>
        <div className="archive-card-divider" />
        {expired ? (
          <div className="archive-card-info">
            <p className="archive-card-unlock-date">
              解封于 {formatDate(capsule.unlockAt)}
            </p>
            <button
              className="archive-open-btn"
              onClick={() => onOpen(capsule, cardRef.current!)}
            >
              打开
            </button>
          </div>
        ) : (
          <div className="archive-card-info">
            <p className="archive-card-remaining">
              <Clock size={13} />
              {getRemainingTime(capsule)}
            </p>
            <p className="archive-card-unlock-date">
              解封于 {formatDate(capsule.unlockAt)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function OpenedCapsuleModal({
  capsule,
  onClose,
}: {
  capsule: Capsule;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-card detail-card opened-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <div
          className="detail-capsule-glow"
          style={{ background: capsule.gradientColor }}
        />
        <div className="detail-content">
          <p className="detail-date">写于 {formatDate(capsule.createdAt)}</p>
          <p className="detail-unlock">
            解封于 {formatDate(capsule.unlockAt)}
          </p>
          <div className="detail-letter">{capsule.content}</div>
        </div>
      </div>
    </div>
  );
}

export default function ArchivePage() {
  const { capsules, loadCapsules } = useCapsuleStore();
  const [openedCapsule, setOpenedCapsule] = useState<Capsule | null>(null);
  const [particleActive, setParticleActive] = useState(false);
  const particleOriginRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadCapsules();
  }, [loadCapsules]);

  const handleOpen = useCallback((capsule: Capsule, ref: HTMLDivElement) => {
    particleOriginRef.current = ref;
    setParticleActive(true);
    setTimeout(() => {
      setOpenedCapsule(capsule);
    }, 300);
    setTimeout(() => {
      setParticleActive(false);
    }, 1500);
  }, []);

  const sortedCapsules = [...capsules].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="archive-page">
      <ParticleCanvas active={particleActive} originRef={particleOriginRef} />

      <nav className="archive-nav">
        <button className="nav-back" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
          时空旅栈
        </button>
        <h1 className="archive-title">回忆走廊</h1>
      </nav>

      {sortedCapsules.length === 0 ? (
        <div className="archive-empty">
          <p>还没有记忆胶囊</p>
          <p className="archive-empty-sub">
            回到旅栈创建你的第一个时空胶囊
          </p>
          <button className="nav-back" onClick={() => navigate("/")}>
            回到旅栈
          </button>
        </div>
      ) : (
        <div className="archive-grid">
          {sortedCapsules.map((capsule, index) => (
            <CapsuleCard
              key={capsule.id}
              capsule={capsule}
              index={index}
              onOpen={handleOpen}
            />
          ))}
        </div>
      )}

      {openedCapsule && (
        <OpenedCapsuleModal
          capsule={openedCapsule}
          onClose={() => setOpenedCapsule(null)}
        />
      )}
    </div>
  );
}

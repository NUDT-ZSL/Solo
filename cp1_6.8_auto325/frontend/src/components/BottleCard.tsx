import { motion, AnimatePresence } from "framer-motion";
import type { ScentBottle } from "@/types";
import { SCENT_COLORS } from "@/types";
import { MessageCircle, Wind, Flame } from "lucide-react";

interface BottleCardProps {
  bottle: ScentBottle;
  onResonate: (bottle: ScentBottle) => void;
  onDrift: (bottleId: string) => void;
  index?: number;
  driftingId?: string | null;
}

export default function BottleCard({ bottle, onResonate, onDrift, index = 0, driftingId }: BottleCardProps) {
  const isDrifting = driftingId === bottle.id;
  const scentColor = SCENT_COLORS[bottle.scent_type] || "#E5E7EB";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={bottle.id}
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={
          isDrifting
            ? { opacity: 0, x: 300, scale: 0.8, transition: { duration: 0.5, ease: "easeInOut" } }
            : { opacity: 1, y: 0, scale: 1, transition: { delay: index * 0.1, duration: 0.5, ease: "easeOut" } }
        }
        exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
        whileHover={{ y: -8, scale: 1.02, boxShadow: "0 20px 40px rgba(212,165,116,0.25)" }}
        className="relative group rounded-2xl overflow-hidden backdrop-blur-xl border border-white/30 shadow-lg transition-shadow duration-300"
        style={{
          background: "linear-gradient(135deg, rgba(255,248,240,0.85), rgba(255,240,212,0.75))",
          boxShadow: `0 4px 20px rgba(212,165,116,0.15), inset 0 1px 0 rgba(255,255,255,0.6)`,
        }}
      >
        {bottle.is_hot && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none animate-golden-pulse"
            style={{
              boxShadow: "0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2), inset 0 0 20px rgba(255,215,0,0.1)",
            }}
          />
        )}

        <div className="p-5 relative z-10">
          <div className="flex items-start justify-between mb-3">
            <span className="text-4xl block">{bottle.emoji}</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: `${scentColor}40`, color: "#8B7355" }}>
              {bottle.scent_type}
            </div>
          </div>

          <p className="text-sm leading-relaxed mb-4" style={{ color: "#6B5B4E" }}>
            {bottle.description}
          </p>

          <div className="flex items-center gap-2 mb-4 text-xs" style={{ color: "#A89888" }}>
            <Flame size={14} className="text-amber-500" />
            <span>{bottle.resonate_count} 次共鸣</span>
            <span className="mx-1">·</span>
            <span>{new Date(bottle.created_at).toLocaleDateString("zh-CN")}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onResonate(bottle)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-300 hover:shadow-md active:scale-95 animate-wave-btn"
              style={{
                background: "linear-gradient(135deg, #D4A574, #C4905A)",
              }}
            >
              <MessageCircle size={15} />
              共鸣
            </button>
            <button
              onClick={() => onDrift(bottle.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-amber-100/60 active:scale-95"
              style={{ color: "#A89888", background: "rgba(255,255,255,0.4)" }}
            >
              <Wind size={15} />
              让它漂走
            </button>
          </div>
        </div>

        {isDrifting && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: `hsl(${35 + Math.random() * 20}, 70%, ${60 + Math.random() * 20}%)`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0, scale: 0, x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100 }}
                transition={{ duration: 0.6 + Math.random() * 0.4, delay: Math.random() * 0.2 }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

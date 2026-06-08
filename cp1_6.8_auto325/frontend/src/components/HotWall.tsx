import { motion } from "framer-motion";
import type { ScentBottle } from "@/types";
import { Flame } from "lucide-react";

interface HotWallProps {
  bottles: ScentBottle[];
}

export default function HotWall({ bottles }: HotWallProps) {
  if (bottles.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Flame size={20} className="text-amber-500" />
        <h2
          className="text-lg font-bold"
          style={{ color: "#6B5B4E", fontFamily: "'Noto Serif SC', serif" }}
        >
          热门气味墙
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {bottles.map((bottle, idx) => (
          <motion.div
            key={bottle.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            className="relative rounded-xl p-3 border border-white/30 backdrop-blur-sm"
            style={{
              background: "linear-gradient(135deg, rgba(255,248,240,0.8), rgba(255,240,212,0.7))",
              boxShadow: idx < 10
                ? "0 0 15px rgba(255,215,0,0.35), 0 0 30px rgba(255,215,0,0.15), 0 2px 10px rgba(212,165,116,0.1)"
                : "0 2px 10px rgba(212,165,116,0.1)",
            }}
          >
            {idx < 10 && (
              <div
                className="absolute inset-0 rounded-xl pointer-events-none animate-golden-pulse"
                style={{
                  boxShadow: "0 0 20px rgba(255,215,0,0.4), 0 0 40px rgba(255,215,0,0.15), inset 0 0 15px rgba(255,215,0,0.08)",
                }}
              />
            )}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-2xl">{bottle.emoji}</span>
                {idx < 10 && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)" }}
                  >
                    {idx + 1}
                  </span>
                )}
              </div>
              <p
                className="text-xs leading-relaxed line-clamp-2 mb-1.5"
                style={{ color: "#6B5B4E" }}
              >
                {bottle.description}
              </p>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: "#A89888" }}>
                <Flame size={10} className="text-amber-500" />
                <span>{bottle.resonate_count}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

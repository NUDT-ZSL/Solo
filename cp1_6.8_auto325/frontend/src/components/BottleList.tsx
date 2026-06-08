import type { ScentBottle } from "@/types";
import { SCENT_COLORS } from "@/types";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface BottleListProps {
  bottles: ScentBottle[];
  title: string;
  emptyText: string;
}

export default function BottleList({ bottles, title, emptyText }: BottleListProps) {
  return (
    <div>
      <h3
        className="text-base font-bold mb-3"
        style={{ color: "#6B5B4E", fontFamily: "'Noto Serif SC', serif" }}
      >
        {title}
      </h3>

      {bottles.length === 0 && (
        <div
          className="rounded-xl p-6 text-center text-sm"
          style={{ color: "#A89888", background: "rgba(255,255,255,0.3)" }}
        >
          {emptyText}
        </div>
      )}

      <div className="space-y-3">
        {bottles.map((bottle, idx) => {
          const scentColor = SCENT_COLORS[bottle.scent_type] || "#E5E7EB";
          return (
            <motion.div
              key={bottle.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="rounded-xl p-4 border border-white/30 backdrop-blur-sm flex items-start gap-3"
              style={{
                background: "linear-gradient(135deg, rgba(255,248,240,0.8), rgba(255,240,212,0.7))",
                boxShadow: "0 2px 10px rgba(212,165,116,0.1)",
              }}
            >
              <span className="text-3xl flex-shrink-0">{bottle.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: `${scentColor}40`, color: "#8B7355" }}
                  >
                    {bottle.scent_type}
                  </span>
                  <span className="text-[10px]" style={{ color: "#A89888" }}>
                    {new Date(bottle.created_at).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#6B5B4E" }}>
                  {bottle.description}
                </p>
                <div className="flex items-center gap-1 mt-1.5 text-[10px]" style={{ color: "#A89888" }}>
                  <Flame size={10} className="text-amber-500" />
                  <span>{bottle.resonate_count} 次共鸣</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

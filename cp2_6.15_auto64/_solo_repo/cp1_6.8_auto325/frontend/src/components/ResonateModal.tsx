import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { EMOJI_OPTIONS } from "@/types";
import { useStore } from "@/store";
import type { ScentBottle } from "@/types";

interface ResonateModalProps {
  bottle: ScentBottle;
  onClose: () => void;
}

export default function ResonateModal({ bottle, onClose }: ResonateModalProps) {
  const { resonateBottle } = useStore();
  const [emoji, setEmoji] = useState("🌸");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await resonateBottle(bottle.id, { emoji, description: description.trim() });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(107,91,78,0.4)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl p-6 border border-white/30"
          style={{
            background: "linear-gradient(135deg, rgba(255,248,240,0.95), rgba(255,240,212,0.9))",
            boxShadow: "0 20px 60px rgba(212,165,116,0.3), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: "#6B5B4E", fontFamily: "'Noto Serif SC', serif" }}>
              🫧 共鸣这个气味
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/40 transition-colors">
              <X size={20} style={{ color: "#A89888" }} />
            </button>
          </div>

          <div className="mb-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.4)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{bottle.emoji}</span>
              <span className="text-sm font-medium" style={{ color: "#6B5B4E" }}>{bottle.scent_type}</span>
            </div>
            <p className="text-sm" style={{ color: "#8B7355" }}>{bottle.description}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: "#8B7355" }}>
              你的共鸣气味 Emoji
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all ${
                    emoji === e ? "ring-2 ring-amber-400 bg-white/60 scale-110" : "bg-white/30 hover:bg-white/50"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-2" style={{ color: "#8B7355" }}>
              描述相似的气味记忆
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="这个气味让你想到了什么..."
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm border border-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300/50 placeholder:text-amber-300/60"
              style={{ background: "rgba(255,255,255,0.5)", color: "#6B5B4E" }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!description.trim() || submitting}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #D4A574, #C4905A)" }}
          >
            {submitting ? "共鸣中..." : "🌊 发送共鸣"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { SCENT_TYPES, EMOJI_OPTIONS } from "@/types";
import { useStore } from "@/store";

export default function CreateBottleModal() {
  const { createModalOpen, setCreateModalOpen, createBottle } = useStore();
  const [emoji, setEmoji] = useState("🌸");
  const [description, setDescription] = useState("");
  const [scentType, setScentType] = useState("花香");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await createBottle({ emoji, description: description.trim(), scent_type: scentType });
      setEmoji("🌸");
      setDescription("");
      setScentType("花香");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {createModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(107,91,78,0.4)", backdropFilter: "blur(8px)" }}
          onClick={() => setCreateModalOpen(false)}
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
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: "#6B5B4E", fontFamily: "'Noto Serif SC', serif" }}>
                ✨ 投一个气味漂流瓶
              </h2>
              <button onClick={() => setCreateModalOpen(false)} className="p-1 rounded-lg hover:bg-white/40 transition-colors">
                <X size={20} style={{ color: "#A89888" }} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "#8B7355" }}>选择心情 Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                      emoji === e ? "ring-2 ring-amber-400 bg-white/60 scale-110" : "bg-white/30 hover:bg-white/50"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "#8B7355" }}>气味描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述你此刻闻到的气味..."
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm border border-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300/50 placeholder:text-amber-300/60"
                style={{ background: "rgba(255,255,255,0.5)", color: "#6B5B4E" }}
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium mb-2" style={{ color: "#8B7355" }}>气味类型</label>
              <div className="flex flex-wrap gap-2">
                {SCENT_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setScentType(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      scentType === t
                        ? "text-white shadow-md"
                        : "hover:bg-white/50"
                    }`}
                    style={
                      scentType === t
                        ? { background: "linear-gradient(135deg, #D4A574, #C4905A)" }
                        : { background: "rgba(255,255,255,0.3)", color: "#8B7355" }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!description.trim() || submitting}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #D4A574, #C4905A)",
              }}
            >
              {submitting ? "投放中..." : "🫧 投入大海，让它漂流"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

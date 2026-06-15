import { motion, AnimatePresence } from "framer-motion"
import { Heart, Wind, MessageCircle } from "lucide-react"
import { ScentBottle as ScentBottleType } from "@/types"
import { useState, useCallback } from "react"

interface ScentBottleProps {
  bottle: ScentBottleType
  onResonate: (bottleId: string) => void
  onPass: (bottleId: string) => void
  index: number
  isHot?: boolean
}

export default function ScentBottleCard({ bottle, onResonate, onPass, index, isHot }: ScentBottleProps) {
  const [showResonance, setShowResonance] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const handleResonate = useCallback(() => {
    setShowResonance(true)
    onResonate(bottle.id)
    setTimeout(() => setShowResonance(false), 800)
  }, [bottle.id, onResonate])

  const handlePass = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => onPass(bottle.id), 400)
  }, [bottle.id, onPass])

  const isHotBottle = isHot || bottle.resonanceCount >= 8

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.1 }}
          className={`relative glass-card p-6 cursor-pointer select-none ${
            isHotBottle ? "gold-border" : ""
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {showResonance && <div className="resonance-ring" />}

          <div className="flex items-start justify-between mb-3">
            <span className="text-4xl animate-gentle-bob">{bottle.emoji}</span>
            <div className="flex items-center gap-1.5 text-forest-600">
              <Heart className="w-4 h-4 fill-forest-500 text-forest-500" />
              <span className="text-sm font-medium">{bottle.resonanceCount}</span>
            </div>
          </div>

          <p className="text-warm-700 text-sm leading-relaxed mb-3 font-body">
            {bottle.description}
          </p>

          <div className="flex items-center justify-between">
            <span className="inline-block px-3 py-1 text-xs rounded-full bg-forest-200/60 text-forest-700 font-medium">
              {bottle.category}
            </span>
            {isHotBottle && (
              <span className="text-xs text-gold-500 font-medium">🔥 热门</span>
            )}
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="pt-4 mt-4 border-t border-warm-200/40">
                  {bottle.resonances.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        共鸣 ({bottle.resonances.length})
                      </p>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                        {bottle.resonances.slice(-3).map((r) => (
                          <div
                            key={r.id}
                            className="flex items-start gap-2 text-xs text-warm-600 bg-white/30 rounded-lg px-3 py-2"
                          >
                            <span>{r.emoji}</span>
                            <span>{r.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleResonate}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                        bg-forest-500/90 hover:bg-forest-600 text-white text-sm font-medium
                        transition-all duration-200 hover:shadow-resonance-glow
                        active:scale-95"
                    >
                      <Heart className="w-4 h-4" />
                      共鸣
                    </button>
                    <button
                      onClick={handlePass}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                        bg-warm-200/40 hover:bg-warm-300/50 text-warm-600 text-sm font-medium
                        transition-all duration-200 active:scale-95"
                    >
                      <Wind className="w-4 h-4" />
                      让它漂走
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

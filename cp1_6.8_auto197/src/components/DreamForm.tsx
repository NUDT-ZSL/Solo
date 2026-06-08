import { useState } from 'react';
import { EMOTION_CONFIGS, FOOD_CONFIGS } from '@/data/mockData';
import { Sparkles, ChevronRight } from 'lucide-react';

interface DreamFormProps {
  onSubmit: (data: { title: string; description: string; emotion: string; foodKeywords: string[] }) => void;
  onEmotionChange?: (emotion: string) => void;
  onFoodChange?: (foods: string[]) => void;
}

export default function DreamForm({ onSubmit, onEmotionChange, onFoodChange }: DreamFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emotion, setEmotion] = useState('');
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);

  const handleEmotionSelect = (e: string) => {
    setEmotion(e);
    onEmotionChange?.(e);
  };

  const toggleFood = (f: string) => {
    setSelectedFoods((prev) => {
      const next = prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f];
      onFoodChange?.(next);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !emotion || selectedFoods.length === 0) return;
    onSubmit({ title, description, emotion, foodKeywords: selectedFoods });
  };

  const isValid = title.trim() && description.trim() && emotion && selectedFoods.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-white/70 text-sm mb-2 tracking-wide">梦境标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="为你的味觉梦境取一个名字..."
          className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3
            text-white/90 placeholder:text-white/30 outline-none
            focus:border-white/40 focus:bg-white/15 transition-all duration-300 text-sm"
        />
      </div>

      <div>
        <label className="block text-white/70 text-sm mb-2 tracking-wide">梦境描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="描述你在梦中品尝到的味道和感受..."
          rows={4}
          className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3
            text-white/90 placeholder:text-white/30 outline-none resize-none
            focus:border-white/40 focus:bg-white/15 transition-all duration-300 text-sm leading-relaxed"
        />
      </div>

      <div>
        <label className="block text-white/70 text-sm mb-3 tracking-wide">情绪选择</label>
        <div className="flex flex-wrap gap-3">
          {Object.values(EMOTION_CONFIGS).map((cfg) => (
            <button
              key={cfg.emotion}
              type="button"
              onClick={() => handleEmotionSelect(cfg.emotion)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 text-sm
                ${
                  emotion === cfg.emotion
                    ? 'border-transparent text-white shadow-lg scale-105'
                    : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white/80'
                }`}
              style={
                emotion === cfg.emotion
                  ? { backgroundColor: cfg.color + 'CC', boxShadow: `0 4px 20px ${cfg.color}44` }
                  : {}
              }
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-white/70 text-sm mb-3 tracking-wide">食物元素</label>
        <div className="flex flex-wrap gap-2">
          {Object.values(FOOD_CONFIGS).map((cfg) => (
            <button
              key={cfg.food}
              type="button"
              onClick={() => toggleFood(cfg.food)}
              className={`px-3.5 py-1.5 rounded-lg border text-sm transition-all duration-300
                ${
                  selectedFoods.includes(cfg.food)
                    ? 'border-transparent text-white'
                    : 'border-white/15 text-white/50 hover:border-white/30 hover:text-white/70'
                }`}
              style={
                selectedFoods.includes(cfg.food)
                  ? { backgroundColor: cfg.color + '99' }
                  : {}
              }
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!isValid}
        className={`w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2
          transition-all duration-300 tracking-wide
          ${
            isValid
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02]'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
      >
        <Sparkles size={16} />
        生成梦境食单
        <ChevronRight size={16} />
      </button>
    </form>
  );
}

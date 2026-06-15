import React from 'react';
import { RotateCcw, Download } from 'lucide-react';
import { useInkStore, type InkColor, type PoemData } from './store';

const COLOR_OPTIONS: { key: InkColor; label: string; color: string }[] = [
  { key: 'black', label: '墨黑', color: '#1A1A1A' },
  { key: 'vermilion', label: '朱红', color: '#C23B22' },
  { key: 'azurite', label: '石青', color: '#2E5C8A' },
];

interface ToolbarProps {
  onReset: () => void;
  onExport: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onReset, onExport }) => {
  const { inkColor, setInkColor } = useInkStore();

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-20
                    flex flex-col items-center gap-3
                    bg-zinc-800/60 backdrop-blur-xl
                    rounded-2xl p-3
                    border border-white/10
                    shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-2">
        {COLOR_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setInkColor(opt.key)}
            className={`group relative w-9 h-9 rounded-full border-2 transition-all duration-300
                       flex items-center justify-center
                       ${inkColor === opt.key
                         ? 'border-white/80 scale-110 shadow-lg'
                         : 'border-white/20 hover:border-white/50 hover:scale-105'}`}
            title={opt.label}
          >
            <span
              className="block w-6 h-6 rounded-full transition-transform duration-200
                         group-hover:scale-110"
              style={{ backgroundColor: opt.color }}
            />
            {inkColor === opt.key && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2
                             w-1.5 h-1.5 rounded-full bg-white/80" />
            )}
          </button>
        ))}
      </div>

      <div className="w-7 h-px bg-white/20" />

      <button
        onClick={onReset}
        className="w-9 h-9 rounded-xl flex items-center justify-center
                   text-white/60 hover:text-white hover:bg-white/10
                   transition-all duration-200"
        title="重置画布"
      >
        <RotateCcw size={18} />
      </button>

      <button
        onClick={onExport}
        className="w-9 h-9 rounded-xl flex items-center justify-center
                   text-white/60 hover:text-white hover:bg-white/10
                   transition-all duration-200"
        title="导出PNG"
      >
        <Download size={18} />
      </button>
    </div>
  );
};

interface PoetryCardProps {
  poem: PoemData | null;
  visible: boolean;
  onDismiss: () => void;
}

export const PoetryCard: React.FC<PoetryCardProps> = ({ poem, visible, onDismiss }) => {
  if (!poem) return null;

  return (
    <div
      onClick={onDismiss}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-20
                 max-w-md w-[90%]
                 bg-zinc-800/50 backdrop-blur-xl
                 rounded-2xl p-5
                 border border-white/10
                 shadow-2xl shadow-black/30
                 cursor-pointer
                 transition-all duration-500 ease-out
                 ${visible
                   ? 'opacity-100 translate-y-0'
                   : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      <p className="text-center text-lg leading-relaxed tracking-widest
                    text-white/90 font-poetry">
        {poem.text}
      </p>
      <p className="text-center text-sm mt-2 text-white/50 font-poetry">
        —— {poem.author}
      </p>
    </div>
  );
};

interface MobileToolbarProps {
  onReset: () => void;
  onExport: () => void;
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({ onReset, onExport }) => {
  const { inkColor, setInkColor } = useInkStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 md:hidden
                    flex items-center justify-center gap-4
                    bg-zinc-800/60 backdrop-blur-xl
                    px-4 py-3
                    border-t border-white/10">
      {COLOR_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setInkColor(opt.key)}
          className={`w-8 h-8 rounded-full border-2 transition-all duration-300
                     ${inkColor === opt.key
                       ? 'border-white/80 scale-110'
                       : 'border-white/20'}`}
          title={opt.label}
        >
          <span
            className="block w-5 h-5 rounded-full mx-auto"
            style={{ backgroundColor: opt.color }}
          />
        </button>
      ))}

      <div className="w-px h-6 bg-white/20" />

      <button
        onClick={onReset}
        className="w-8 h-8 rounded-lg flex items-center justify-center
                   text-white/60 hover:text-white transition-colors"
        title="重置画布"
      >
        <RotateCcw size={16} />
      </button>

      <button
        onClick={onExport}
        className="w-8 h-8 rounded-lg flex items-center justify-center
                   text-white/60 hover:text-white transition-colors"
        title="导出PNG"
      >
        <Download size={16} />
      </button>
    </div>
  );
};

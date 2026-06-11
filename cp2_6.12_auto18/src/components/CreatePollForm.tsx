import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface CreatePollFormProps {
  onClose: () => void;
}

export default function CreatePollForm({ onClose }: CreatePollFormProps) {
  const { createPoll } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!trimmedTitle || trimmedOptions.length < 2) return;

    setSubmitting(true);
    try {
      await createPoll({
        title: trimmedTitle,
        description: description.trim(),
        options: trimmedOptions,
        duration,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const isValid =
    title.trim() && options.filter((o) => o.trim()).length >= 2;

  return (
    <div className="fade-in-expand bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-lg text-gray-900">创建新投票</h2>
        <button
          onClick={onClose}
          className="btn-interactive text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">标题</label>
            <span className="text-xs text-gray-400">{title.length}/100</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 100))}
            placeholder="投票标题"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">描述（可选）</label>
            <span className="text-xs text-gray-400">{description.length}/500</span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="投票描述..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">选项</label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5 shrink-0">
                  {index + 1}.
                </span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`选项 ${index + 1}`}
                  maxLength={100}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="btn-interactive text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="btn-interactive mt-2 flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
            >
              <Plus className="w-4 h-4" />
              添加选项
            </button>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            持续时间
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {d} 天
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="btn-interactive w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '创建中...' : '创建投票'}
        </button>
      </form>
    </div>
  );
}

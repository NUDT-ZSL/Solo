import { useState } from 'react';
import { useStore } from '../store';
import { Sparkles } from 'lucide-react';

export default function AIAssistant({ onInsert }: { onInsert: (text: string) => void }) {
  const { getSuggestions } = useStore();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSuggest = async () => {
    const { paragraphs } = useStore.getState();
    const latestContent = paragraphs.length > 0
      ? paragraphs.slice(-1)[0].content
      : '';
    if (!latestContent) return;

    setLoading(true);
    try {
      const result = await getSuggestions(latestContent);
      setSuggestions(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-assistant">
      <button
        className="btn-ai"
        onClick={handleSuggest}
        disabled={loading}
      >
        <Sparkles size={16} />
        {loading ? '灵感涌现中...' : 'AI续写'}
      </button>

      {suggestions.length > 0 && (
        <div className="ai-suggestions">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="ai-suggestion-tag"
              onClick={() => {
                onInsert(s);
                setSuggestions([]);
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

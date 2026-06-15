import { useState, useCallback } from 'react';

interface UseAnimationReturn {
  gaugeValue: number;
  setGaugeValue: (value: number) => void;
  highlightedSentenceId: string | null;
  setHighlightedSentence: (id: string | null) => void;
  speakingSentenceId: string | null;
  setSpeakingSentence: (id: string | null) => void;
}

export function useAnimation(): UseAnimationReturn {
  const [gaugeValue, setGaugeValueState] = useState(0);
  const [highlightedSentenceId, setHighlightedSentenceId] = useState<string | null>(null);
  const [speakingSentenceId, setSpeakingSentenceId] = useState<string | null>(null);

  const setGaugeValue = useCallback((value: number) => {
    setGaugeValueState(Math.max(0, Math.min(100, value)));
  }, []);

  const setHighlightedSentence = useCallback((id: string | null) => {
    setHighlightedSentenceId(id);
  }, []);

  const setSpeakingSentence = useCallback((id: string | null) => {
    setSpeakingSentenceId(id);
  }, []);

  return {
    gaugeValue,
    setGaugeValue,
    highlightedSentenceId,
    setHighlightedSentence,
    speakingSentenceId,
    setSpeakingSentence,
  };
}

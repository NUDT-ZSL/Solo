import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechSynthesisOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  onStart?: () => void;
  onWordBoundary?: (wordIndex: number, charIndex: number) => void;
}

export function useSpeechSynthesis(options: UseSpeechSynthesisOptions = {}) {
  const {
    lang = 'en-US',
    rate = 0.95,
    pitch = 1,
    volume = 1,
    onEnd,
    onStart,
    onWordBoundary
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wordBoundariesRef = useRef<{ start: number; end: number; wordIndex: number }[]>([]);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  const calculateWordBoundaries = useCallback((text: string) => {
    const boundaries: { start: number; end: number; wordIndex: number }[] = [];
    const words = text.match(/\b[\w']+\b/g) || [];
    let searchIndex = 0;

    words.forEach((word, index) => {
      const wordStart = text.indexOf(word, searchIndex);
      if (wordStart !== -1) {
        boundaries.push({
          start: wordStart,
          end: wordStart + word.length,
          wordIndex: index
        });
        searchIndex = wordStart + word.length;
      }
    });

    return boundaries;
  }, []);

  const findWordIndexAtChar = useCallback((charIndex: number) => {
    for (const boundary of wordBoundariesRef.current) {
      if (charIndex >= boundary.start && charIndex < boundary.end) {
        return boundary.wordIndex;
      }
    }
    return -1;
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      v => v.lang === 'en-US' && v.name.toLowerCase().includes('samantha')
    ) || voices.find(
      v => v.lang === 'en-US' && v.name.toLowerCase().includes('google')
    ) || voices.find(
      v => v.lang.startsWith('en')
    ) || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    wordBoundariesRef.current = calculateWordBoundaries(text);

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setCurrentText(text);
      setCurrentWordIndex(0);
      onStart?.();
    };

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === 'word') {
        const wordIdx = findWordIndexAtChar(event.charIndex);
        if (wordIdx !== -1) {
          setCurrentWordIndex(wordIdx);
          onWordBoundary?.(wordIdx, event.charIndex);
        }
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentWordIndex(-1);
      setCurrentText('');
      onEnd?.();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentWordIndex(-1);
      setCurrentText('');
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, lang, rate, pitch, volume, onStart, onEnd, onWordBoundary, calculateWordBoundaries, findWordIndexAtChar]);

  const pause = useCallback(() => {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSpeaking, isPaused]);

  const resume = useCallback(() => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
    setCurrentText('');
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return {
    isSpeaking,
    isPaused,
    isSupported,
    currentText,
    currentWordIndex,
    speak,
    pause,
    resume,
    cancel
  };
}

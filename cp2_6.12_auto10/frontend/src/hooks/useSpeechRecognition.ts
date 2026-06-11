import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onFinalResult?: (text: string) => void;
  onInterimResult?: (text: string) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    lang = 'en-US',
    continuous = true,
    interimResults = true,
    onFinalResult,
    onInterimResult,
    onError
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interim += transcript;
          }
        }

        if (finalText) {
          finalTranscriptRef.current += finalText;
          setTranscript(finalTranscriptRef.current);
          onFinalResult?.(finalTranscriptRef.current);
        }

        if (interim) {
          setInterimTranscript(interim);
          onInterimResult?.(interim);
        }
      };

      recognition.onerror = (event: any) => {
        const errorMsg = event.error || 'Unknown recognition error';
        setError(errorMsg);
        onError?.(errorMsg);
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onstart = () => {
        setError(null);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [lang, continuous, interimResults, onFinalResult, onInterimResult, onError]);

  const start = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    try {
      finalTranscriptRef.current = '';
      setTranscript('');
      setInterimTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to start recognition');
    }
  }, []);

  const stop = useCallback((): string => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
    const finalResult = finalTranscriptRef.current;
    setInterimTranscript('');
    return finalResult;
  }, []);

  const reset = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    start,
    stop,
    reset
  };
}

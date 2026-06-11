import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TopicSelector } from './components/TopicSelector';
import { ChatPanel } from './components/ChatPanel';
import { ScorePanel } from './components/ScorePanel';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { analyzeText, detectErrors, getWordStats, generateFollowUpQuestion } from './utils/scoring';
import { TOPICS } from './data/topics';
import { ChatMessage, Topic, ScoreResult, CommonError, WordStat, ScoreHistoryItem } from './types';

type App = () => {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentScore, setCurrentScore] = useState<ScoreResult | null>(null);
  const [errors, setErrors] = useState<CommonError[]>([]);
  const [wordStats, setWordStats] = useState<WordStat[]>([]);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [usedQuestions, setUsedQuestions] = useState<string[]>([]);

  const allUserTextRef = useRef<string>('');
  const allErrorsRef = useRef<CommonError[]>([]);

  const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

  const handleSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setMessages([]);
    setCurrentScore(null);
    setErrors([]);
    setWordStats([]);
    setScoreHistory([]);
    setUsedQuestions([]);
    allUserTextRef.current = '';
    allErrorsRef.current = [];
    window.speechSynthesis?.cancel();

    setTimeout(() => {
      const starter = topic.starterQuestions[Math.floor(Math.random() * topic.starterQuestions.length)];
      const systemMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: starter,
        timestamp: Date.now()
      };
      setMessages([systemMessage]);
      setUsedQuestions([starter]);
    }, 300);
  };

  const handleStartConversation = () => {
    const starter = selectedTopic!.starterQuestions[
      Math.floor(Math.random() * selectedTopic!.starterQuestions.length)
    ];
    if (!usedQuestions.includes(starter)) {
      const systemMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: starter,
        timestamp: Date.now()
      };
      setMessages([systemMessage]);
      setUsedQuestions([starter]);
    }
  };

  const {
    isListening,
    transcript: recognitionTranscript,
    interimTranscript,
    isSupported: isRecognitionSupported,
    start: startRecognition,
    stop: stopRecognition,
    reset: resetRecognition
  } = useSpeechRecognition({
    lang: 'en-US',
    continuous: true,
    interimResults: true
  });

  const {
    speak,
    currentWordIndex: synthesisWordIndex,
    cancel: cancelSpeak
  } = useSpeechSynthesis({
    lang: 'en-US',
    onEnd: () => {
      setPlayingMessageId(null);
    }
  });

  const handleSpeak = useCallback((messageId: string, text: string) => {
    if (playingMessageId === messageId) {
      cancelSpeak();
      setPlayingMessageId(null);
    } else {
      setPlayingMessageId(messageId);
      speak(text);
    }
  }, [playingMessageId, speak, cancelSpeak]);

  const handleStartRecording = useCallback(() => {
    if (messages.length === 0 && selectedTopic) {
      handleStartConversation();
    }
    resetRecognition();
    setTimeout(() => {
      startRecognition();
    }, 50);
  }, [messages.length, selectedTopic, resetRecognition, startRecognition]);

  const handleStopRecording = useCallback(() => {
    const transcript = stopRecognition();
    const finalText = (transcript || recognitionTranscript || '').trim();

    if (!finalText) return;

    setIsProcessing(true);

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: finalText,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    allUserTextRef.current += ' ' + finalText;

    setTimeout(() => {
      const score: ScoreResult = selectedTopic
        ? analyzeText(finalText, selectedTopic.keywords)
        : analyzeText(finalText);

      const newErrors = detectErrors(finalText);
      allErrorsRef.current = [...allErrorsRef.current, ...newErrors];
      const newWordStats = getWordStats(allUserTextRef.current);

      setCurrentScore(score);
      setErrors(allErrorsRef.current);
      setWordStats(newWordStats);

      setScoreHistory(prev => {
        const nextIndex = prev.length + 1;
        const newHistory: ScoreHistoryItem = {
          index: nextIndex,
          overall: score.overallScore,
          pronunciation: score.pronunciation,
          grammar: score.grammar,
          fluency: score.fluency
        };
        return [...prev, newHistory].slice(-5);
      });

      const followUp = generateFollowUpQuestion(selectedTopic?.id || 'daily', usedQuestions);
      const followUpMsg: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: followUp,
        timestamp: Date.now()
      };

      setTimeout(() => {
        setMessages(prev => [...prev, followUpMsg]);
        setUsedQuestions(prev => [...prev, followUp]);
        setIsProcessing(false);
      }, 600);
    }, 1500);
  }, [stopRecognition, recognitionTranscript, selectedTopic, usedQuestions]);

  const handleRestart = useCallback(() => {
    setMessages([]);
    setCurrentScore(null);
    setErrors([]);
    setWordStats([]);
    setScoreHistory([]);
    setUsedQuestions([]);
    setIsProcessing(false);
    allUserTextRef.current = '';
    allErrorsRef.current = [];
    cancelSpeak();
    resetRecognition();

    if (selectedTopic) {
      setTimeout(() => {
        const starter = selectedTopic.starterQuestions[Math.floor(Math.random() * selectedTopic.starterQuestions.length)];
        const systemMessage: ChatMessage = {
          id: generateId(),
          role: 'system',
          content: starter,
          timestamp: Date.now()
        };
        setMessages([systemMessage]);
        setUsedQuestions([starter]);
      }, 200);
    }
  }, [selectedTopic, cancelSpeak, resetRecognition]);

  const handleBackToTopics = useCallback(() => {
    setSelectedTopic(null);
    setMessages([]);
    setCurrentScore(null);
    setErrors([]);
    setWordStats([]);
    setScoreHistory([]);
    setUsedQuestions([]);
    allUserTextRef.current = '';
    allErrorsRef.current = [];
    cancelSpeak();
    resetRecognition();
  }, [cancelSpeak, resetRecognition]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (messages.length === 0 && !selectedTopic) return;
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length, selectedTopic]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🎤 英语口语陪练
        <h2 className="app-subtitle">English Speaking Tutor · AI发音评分
      </header>

      {!selectedTopic ? (
        <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="card">
            <TopicSelector
              topics={TOPICS}
              selectedTopicId={null}
              onSelect={handleSelectTopic}
            />
            <div style={{
              marginTop: '28px',
              padding: '20px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
              border: '1px solid #BFDBFE'
            }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#1E3A5F',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>💡</span> 使用指南
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px'
              }}>
                {[
                  { icon: '1️⃣', text: '选择一个感兴趣的对话主题' },
                  { icon: '2️⃣', text: '系统会用英语向你提问' },
                  { icon: '3️⃣', text: '点击麦克风按钮用英语回答' },
                  { icon: '4️⃣', text: '查看三维评分和改进建议' }
                ].map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.7)'
                  }}>
                    <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                    <span style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="main-layout">
          <ChatPanel
            messages={messages}
            topic={selectedTopic}
            isRecording={isListening}
            isProcessing={isProcessing}
            isRecognitionSupported={isRecognitionSupported}
            liveTranscript={recognitionTranscript + (interimTranscript ? ' ' + interimTranscript : '')}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onSpeak={handleSpeak}
            playingMessageId={playingMessageId}
            onRestart={handleRestart}
            onBackToTopics={handleBackToTopics}
          />
          <ScorePanel
            currentScore={currentScore}
            errors={errors}
            wordStats={wordStats}
            scoreHistory={scoreHistory}
          />
        </main>
      )}
    </div>
  );
};

export default App;

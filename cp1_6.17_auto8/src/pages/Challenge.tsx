import React, { useState, useEffect } from 'react';
import ChallengePanel from '../components/ChallengePanel';
import type { ChallengeQuestion } from '../types';
import '../styles/challenge.css';

const Challenge: React.FC = () => {
  const [question, setQuestion] = useState<ChallengeQuestion | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQuestion = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/challenge/random');
      const data = await res.json();
      setQuestion(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestion();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">挑战中心</h1>
        <p className="page-subtitle">与其他咖啡爱好者比拼你的风味品鉴能力</p>
      </div>
      <ChallengePanel question={question} onNextQuestion={loadQuestion} loading={loading} />
    </div>
  );
};

export default Challenge;

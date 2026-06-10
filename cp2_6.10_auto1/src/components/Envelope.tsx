import React from 'react';
import { Hourglass } from './Hourglass';

type Emotion = 'joy' | 'calm' | 'hope' | 'nostalgia';

interface EnvelopeProps {
  emotion: Emotion;
  isUnlocked: boolean;
  showHourglass?: boolean;
  className?: string;
}

const emotionColors: Record<Emotion, string> = {
  joy: '#FF7E67',
  calm: '#6B8E8E',
  hope: '#9ED39E',
  nostalgia: '#A67B9B',
};

export const Envelope: React.FC<EnvelopeProps> = ({
  emotion,
  isUnlocked,
  showHourglass = true,
  className = '',
}) => {
  const color = emotionColors[emotion];

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`envelope-container ${isUnlocked ? 'envelope-unlock' : 'envelope-breathe'}`}>
        <svg
          viewBox="0 0 200 140"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`envelope-grad-${emotion}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={color} stopOpacity="0.7" />
            </linearGradient>
            <filter id={`shadow-${emotion}`}>
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.2" />
            </filter>
          </defs>

          <rect
            x="10"
            y="25"
            width="180"
            height="105"
            rx="6"
            fill={`url(#envelope-grad-${emotion})`}
            filter={`url(#shadow-${emotion})`}
            className="envelope-body"
          />

          <polygon
            points="10,25 100,85 190,25"
            fill={color}
            className={`envelope-flap ${isUnlocked ? 'flap-open' : ''}`}
            style={{ transformOrigin: '50% 0%' }}
          />

          <line
            x1="10"
            y1="25"
            x2="100"
            y2="85"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
            className={`${isUnlocked ? 'line-hide-left' : ''}`}
          />
          <line
            x1="190"
            y1="25"
            x2="100"
            y2="85"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
            className={`${isUnlocked ? 'line-hide-right' : ''}`}
          />

          <rect
            x="90"
            y="110"
            width="20"
            height="12"
            rx="2"
            fill="rgba(255,255,255,0.25)"
          />
        </svg>

        {!isUnlocked && showHourglass && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Hourglass className="opacity-90 scale-75" />
          </div>
        )}

        {isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="envelope-crack" />
          </div>
        )}
      </div>

      <style>{`
        .envelope-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .envelope-breathe {
          animation: breathe 4s ease-in-out infinite;
        }

        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.03);
          }
        }

        .envelope-unlock {
          animation: unlock-shake 0.6s ease-out forwards;
        }

        @keyframes unlock-shake {
          0% { transform: scale(1); }
          20% { transform: scale(1.08) rotate(-1deg); }
          40% { transform: scale(1.06) rotate(1deg); }
          60% { transform: scale(1.1) rotate(-0.5deg); }
          80% { transform: scale(1.08) rotate(0.5deg); }
          100% { transform: scale(1.15); opacity: 0.9; }
        }

        .flap-open {
          animation: flap-open 0.8s ease-out 0.3s forwards;
        }

        @keyframes flap-open {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-180deg); opacity: 0.6; }
        }

        .line-hide-left {
          animation: line-fade-left 0.5s ease-out 0.2s forwards;
        }

        .line-hide-right {
          animation: line-fade-right 0.5s ease-out 0.2s forwards;
        }

        @keyframes line-fade-left {
          to { transform: translateX(-20px); opacity: 0; }
        }

        @keyframes line-fade-right {
          to { transform: translateX(20px); opacity: 0; }
        }

        .envelope-crack {
          width: 4px;
          height: 60%;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(255,255,255,0.8),
            rgba(255,255,255,0.9),
            rgba(255,255,255,0.8),
            transparent
          );
          animation: crack-appear 0.4s ease-out forwards;
        }

        @keyframes crack-appear {
          0% {
            clip-path: inset(50% 0 50% 0);
            opacity: 0;
          }
          100% {
            clip-path: inset(0 0 0 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

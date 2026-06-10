import React from 'react';

interface HourglassProps {
  className?: string;
}

export const Hourglass: React.FC<HourglassProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-16 h-24 ${className}`}>
      <svg
        viewBox="0 0 64 96"
        className="w-full h-full hourglass-rotate"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F4D03F" />
            <stop offset="100%" stopColor="#D4AC0D" />
          </linearGradient>
        </defs>

        <path
          d="M12 4 L52 4 L52 12 L40 44 L52 76 L52 92 L12 92 L12 76 L24 44 L12 12 Z"
          fill="none"
          stroke="#8B4513"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        <path
          d="M15 10 L49 10 L49 13 L37 42 L27 42 L15 13 Z"
          fill="url(#sandGradient)"
          className="sand-top"
        />

        <circle
          cx="32"
          cy="44"
          r="2"
          fill="#D4AC0D"
          className="sand-falling"
        />
        <circle
          cx="32"
          cy="54"
          r="1.8"
          fill="#D4AC0D"
          className="sand-falling"
          style={{ animationDelay: '0.1s' }}
        />
        <circle
          cx="32"
          cy="64"
          r="1.6"
          fill="#D4AC0D"
          className="sand-falling"
          style={{ animationDelay: '0.2s' }}
        />
        <circle
          cx="32"
          cy="72"
          r="1.4"
          fill="#D4AC0D"
          className="sand-falling"
          style={{ animationDelay: '0.3s' }}
        />

        <path
          d="M20 86 L44 86 L38 76 L26 76 Z"
          fill="url(#sandGradient)"
          className="sand-bottom"
        />
        <path
          d="M17 88 L47 88 L44 86 L20 86 Z"
          fill="url(#sandGradient)"
          className="sand-bottom"
          style={{ animationDelay: '0.5s' }}
        />

        <rect x="10" y="1" width="44" height="5" rx="1" fill="#5D4037" />
        <rect x="10" y="90" width="44" height="5" rx="1" fill="#5D4037" />
      </svg>

      <style>{`
        .hourglass-rotate {
          animation: hourglass-spin 60s linear infinite;
        }

        @keyframes hourglass-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .sand-top {
          animation: sand-top-empty 60s ease-in-out infinite;
          transform-origin: center bottom;
        }

        @keyframes sand-top-empty {
          0% { transform: scaleY(1); }
          90% { transform: scaleY(0.1); }
          100% { transform: scaleY(0); }
        }

        .sand-falling {
          opacity: 0;
          animation: sand-drop 1s ease-in infinite;
        }

        @keyframes sand-drop {
          0% {
            opacity: 1;
            transform: translateY(-20px);
          }
          100% {
            opacity: 0.6;
            transform: translateY(30px);
          }
        }

        .sand-bottom {
          transform-origin: center bottom;
          animation: sand-bottom-fill 60s ease-in-out infinite;
        }

        @keyframes sand-bottom-fill {
          0% { transform: scaleY(0); }
          90% { transform: scaleY(0.9); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};

import React from 'react';

const HourglassIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <style>
      {`
        .hg-top-sand {
          transform-origin: 12px 7px;
          animation: hg-top-sand 3s linear infinite;
        }
        .hg-bottom-sand {
          transform-origin: 12px 17px;
          animation: hg-bottom-sand 3s linear infinite;
        }
        .hg-stream {
          animation: hg-stream 3s linear infinite;
          transform-origin: 12px 12px;
        }
        .hg-rotate {
          animation: hg-rotate 6s ease-in-out infinite;
          transform-origin: 12px 12px;
        }
        @keyframes hg-top-sand {
          0%, 100% { clip-path: inset(0 0 0 0); }
          90%, 100% { clip-path: inset(0 0 85% 0); }
        }
        @keyframes hg-bottom-sand {
          0% { clip-path: inset(85% 0 0 0); }
          90%, 100% { clip-path: inset(0 0 0 0); }
        }
        @keyframes hg-stream {
          0%, 90% { opacity: 1; }
          95%, 100% { opacity: 0; }
        }
        @keyframes hg-rotate {
          0%, 90% { transform: rotate(0deg); }
          95%, 100% { transform: rotate(180deg); }
        }
      `}
    </style>
    <g className="hg-rotate">
      <path
        d="M5 2H19V3.5C19 4.88 17.88 6 16.5 6H14.5C13.12 6 12 7.12 12 8.5V10.5C12 10.78 11.78 11 11.5 11H12.5C12.22 11 12 11.22 12 11.5V13.5C12 14.88 10.88 16 9.5 16H7.5C6.12 16 5 17.12 5 18.5V20H19V18.5C19 17.12 17.88 16 16.5 16H14.5C13.12 16 12 14.88 12 13.5V11.5C12 11.22 12.22 11 12.5 11H11.5C11.78 11 12 10.78 12 10.5V8.5C12 7.12 13.12 6 14.5 6H16.5C17.88 6 19 4.88 19 3.5V2H5Z"
        stroke="#F59E0B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <g className="hg-top-sand">
        <path
          d="M7 4.5C7 5.33 7.67 6 8.5 6H15.5C16.33 6 17 5.33 17 4.5V4H7V4.5Z"
          fill="#F59E0B"
          opacity="0.6"
        />
      </g>
      <g className="hg-stream">
        <line x1="12" y1="11" x2="12" y2="12.5" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="11.75" r="0.8" fill="#FDE68A">
          <animate attributeName="cy" values="11;12.5;11" dur="0.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;1;0" dur="0.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="11.7" cy="12.1" r="0.5" fill="#FDE68A">
          <animate attributeName="cx" values="11.7;12.3;11.7" dur="0.4s" repeatCount="indefinite" />
        </circle>
      </g>
      <g className="hg-bottom-sand">
        <path
          d="M7 19.5C7 18.67 7.67 18 8.5 18H15.5C16.33 18 17 18.67 17 19.5V20H7V19.5Z"
          fill="#D97706"
          opacity="0.7"
        />
      </g>
    </g>
  </svg>
);

export default HourglassIcon;

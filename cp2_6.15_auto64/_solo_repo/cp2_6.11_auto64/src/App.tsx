import React from 'react';
import { ControlPanel } from './components/ControlPanel';
import { SortCanvas } from './components/SortCanvas';

export default function App() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100vh',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <ControlPanel />
      <div
        style={{
          flex: 1,
          padding: 16,
          display: 'flex',
          minWidth: 0,
          minHeight: 500,
          boxSizing: 'border-box',
        }}
      >
        <SortCanvas />
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="flexDirection: row"] {
            flex-direction: column !important;
            height: auto !important;
            min-height: 100vh;
          }
        }
        
        @media (max-width: 768px) {
          div[style*="width: 320px"][style*="minWidth: 320px"] {
            width: 100% !important;
            min-width: 100% !important;
            max-height: 60vh;
            overflow-y: auto;
          }
        }
        
        @media (max-width: 768px) {
          div[style*="minWidth: 0"][style*="minHeight: 500"] {
            min-height: 400px;
            padding: 12px;
          }
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4a90e2, #a855f7);
          cursor: pointer;
          border: 2px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          transition: all 0.15s ease;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 2px 10px rgba(74, 144, 226, 0.6);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4a90e2, #a855f7);
          cursor: pointer;
          border: 2px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        
        input[type="range"]:disabled::-webkit-slider-thumb {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        input[type="range"]:disabled::-moz-range-thumb {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(74, 144, 226, 0.3);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(74, 144, 226, 0.5);
        }
      `}</style>
    </div>
  );
}

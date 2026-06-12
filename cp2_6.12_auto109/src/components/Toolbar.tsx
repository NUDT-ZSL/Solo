import React, { useState } from 'react';
import {
  Pencil,
  Eraser,
  Smile,
  Type,
} from 'lucide-react';
import { EMOJI_LIST, PEN_COLORS, FONT_FAMILIES } from '../../shared/types.js';

type ToolType = 'pen' | 'eraser' | 'emoji' | 'text';

interface ToolbarProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  penColor: string;
  onPenColorChange: (color: string) => void;
  penWidth: number;
  onPenWidthChange: (width: number) => void;
  currentEmoji: string;
  onEmojiChange: (emoji: string) => void;
  onTextToolClick: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onToolChange,
  penColor,
  onPenColorChange,
  penWidth,
  onPenWidthChange,
  currentEmoji,
  onEmojiChange,
  onTextToolClick,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const tools = [
    { id: 'pen' as ToolType, icon: Pencil, label: '画笔' },
    { id: 'eraser' as ToolType, icon: Eraser, label: '橡皮擦' },
    { id: 'emoji' as ToolType, icon: Smile, label: '表情' },
    { id: 'text' as ToolType, icon: Type, label: '文字' },
  ];

  return (
    <div className="toolbar-container">
      <div className="toolbar">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;
          return (
            <button
              key={tool.id}
              className={`tool-btn ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (tool.id === 'emoji') {
                  setShowEmojiPicker(!showEmojiPicker);
                } else if (tool.id === 'text') {
                  onTextToolClick();
                } else {
                  onToolChange(tool.id);
                  setShowEmojiPicker(false);
                }
              }}
              title={tool.label}
            >
              <Icon size={20} />
            </button>
          );
        })}

        {currentTool === 'pen' && (
          <div className="tool-section">
            <div className="color-picker">
              {PEN_COLORS.map((color) => (
                <button
                  key={color}
                  className={`color-btn ${penColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => onPenColorChange(color)}
                />
              ))}
            </div>
            <div className="width-slider">
              <input
                type="range"
                min="1"
                max="20"
                value={penWidth}
                onChange={(e) => onPenWidthChange(Number(e.target.value))}
              />
              <span className="width-value">{penWidth}px</span>
            </div>
          </div>
        )}

        {showEmojiPicker && (
          <div className="emoji-picker">
            {EMOJI_LIST.slice(0, 30).map((emoji) => (
              <button
                key={emoji}
                className={`emoji-btn ${currentEmoji === emoji ? 'active' : ''}`}
                onClick={() => {
                  onEmojiChange(emoji);
                  onToolChange('emoji');
                  setShowEmojiPicker(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .toolbar-container {
          position: absolute;
          top: 50%;
          left: 16px;
          transform: translateY(-50%);
          z-index: 50;
        }

        .toolbar {
          background: rgba(18, 18, 18, 0.95);
          border-radius: 12px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .tool-btn {
          width: 44px;
          height: 44px;
          min-height: 44px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #e0e0e0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease, transform 0.1s ease;
        }

        .tool-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .tool-btn:active {
          transform: scale(0.95);
        }

        .tool-btn.active {
          background: rgba(187, 134, 252, 0.3);
          color: #bb86fc;
        }

        .tool-section {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .color-picker {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 4px;
        }

        .color-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.1s ease, border-color 0.2s ease;
          padding: 0;
        }

        .color-btn:hover {
          transform: scale(1.1);
        }

        .color-btn.active {
          border-color: #bb86fc;
          box-shadow: 0 0 8px rgba(187, 134, 252, 0.5);
        }

        .width-slider {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 0 4px;
        }

        .width-slider input[type="range"] {
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.2);
          -webkit-appearance: none;
          appearance: none;
        }

        .width-slider input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #bb86fc;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .width-value {
          font-size: 11px;
          color: #9e9e9e;
        }

        .emoji-picker {
          position: absolute;
          left: 60px;
          top: 0;
          background: rgba(18, 18, 18, 0.95);
          border-radius: 12px;
          padding: 8px;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 4px;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          animation: fadeIn 0.2s ease;
        }

        .emoji-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease, transform 0.1s ease;
        }

        .emoji-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.2);
        }

        .emoji-btn.active {
          background: rgba(187, 134, 252, 0.3);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @media (max-width: 768px) {
          .toolbar-container {
            top: auto;
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
          }

          .toolbar {
            flex-direction: row;
            padding: 8px 12px;
            gap: 8px;
          }

          .tool-btn {
            width: 48px;
            height: 48px;
          }

          .tool-section {
            margin-top: 0;
            margin-left: 8px;
            padding-top: 0;
            padding-left: 8px;
            border-top: none;
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            flex-direction: row;
            align-items: center;
          }

          .color-picker {
            grid-template-columns: repeat(5, 1fr);
          }

          .color-btn {
            width: 24px;
            height: 24px;
          }

          .width-slider {
            width: 80px;
          }

          .emoji-picker {
            left: 50%;
            bottom: 60px;
            top: auto;
            transform: translateX(-50%);
            grid-template-columns: repeat(6, 1fr);
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, 8px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
        }
      `}</style>
    </div>
  );
};

export default Toolbar;

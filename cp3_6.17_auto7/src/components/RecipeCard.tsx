import React, { useRef } from 'react';
import type { RecipeVersion } from '../types';
import dayjs from 'dayjs';

interface RecipeCardProps {
  version: RecipeVersion;
  onPrint?: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ version, onPrint }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const { content } = version;

  return (
    <div style={{ padding: '20px' }}>
      <div className="print-area" ref={cardRef}>
        <div
          style={{
            width: '85mm',
            height: '55mm',
            backgroundColor: '#fff8e7',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '4mm',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: '"Georgia", serif',
          }}
        >
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <div
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                color: '#3e2723',
                fontWeight: 'bold',
                fontSize: '14px',
                padding: '0 2mm',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: '1px solid #d7ccc8',
                marginRight: '2mm',
              }}
            >
              {content.name || '未命名食谱'}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div
                style={{
                  fontSize: '7px',
                  marginBottom: '1mm',
                  maxHeight: '45%',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7px' }}>
                  <tbody>
                    {content.ingredients.slice(0, 6).map((ing, idx) => (
                      <tr key={ing.id || idx}>
                        <td style={{ padding: '0.5mm 1mm', whiteSpace: 'nowrap', color: '#5d4037' }}>
                          {ing.quantity}
                          {ing.unit}
                        </td>
                        <td style={{ padding: '0.5mm 1mm', color: '#5d4037' }}>{ing.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  flex: 1,
                  backgroundColor: '#f5f0e1',
                  borderRadius: '2px',
                  padding: '1.5mm',
                  fontSize: '6px',
                  overflow: 'hidden',
                  lineHeight: '1.3',
                }}
              >
                {content.steps.slice(0, 4).map((step, idx) => (
                  <div key={step.id || idx} style={{ marginBottom: '0.5mm', color: '#4e342e' }}>
                    <span style={{ fontWeight: 'bold', color: '#8b4513' }}>{step.order}.</span>
                    {' '}
                    {step.description.length > 30 ? step.description.substring(0, 30) + '...' : step.description}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1mm',
              paddingTop: '1mm',
              borderTop: '1px solid #d7ccc8',
              fontSize: '6px',
              color: '#795548',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1mm' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8b4513" strokeWidth="2">
                <path d="M9 21h6M10 21V11h4v10M12 3C10.5 3 9.5 4.5 9.5 6c0 1 .5 2 1.5 2.5V11h2V8.5C14 8 14.5 7 14.5 6c0-1.5-1-3-2.5-3z" />
              </svg>
              <span>{dayjs(version.timestamp).format('YYYY-MM-DD')}</span>
            </div>
            <div style={{ fontStyle: 'italic' }}>— {version.authorName}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <button
          onClick={handlePrint}
          style={{
            padding: '10px 24px',
            backgroundColor: '#8b4513',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 69, 19, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          🖨️ 打印食谱卡
        </button>
      </div>
    </div>
  );
};

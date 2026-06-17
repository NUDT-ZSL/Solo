import { useRef } from 'react';
import type { Version } from '../types';
import dayjs from 'dayjs';

interface RecipeCardProps {
  version: Version;
}

function RecipeCard({ version }: RecipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const { content } = version;

  return (
    <div className="recipe-card-wrapper">
      <div className="card-header">
        <h3>🃏 食谱卡预览</h3>
        <button className="btn-print" onClick={handlePrint}>
          🖨️ 打印
        </button>
      </div>

      <div className="card-display">
        <div ref={cardRef} className="recipe-card-print recipe-card">
          <div className="card-left">
            <div className="card-title">{content.name}</div>
          </div>
          
          <div className="card-middle">
            <table className="ingredients-table">
              <tbody>
                {content.ingredients.slice(0, 5).map((ing, i) => (
                  <tr key={i}>
                    <td className="ing-name">{ing.name}</td>
                    <td className="ing-amount">
                      {ing.amount} {ing.unit}
                    </td>
                  </tr>
                ))}
                {content.ingredients.length > 5 && (
                  <tr>
                    <td colSpan={2} className="ing-more">
                      等{content.ingredients.length}种食材
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card-right">
            <div className="steps-compact">
              {content.steps.slice(0, 3).map((step, i) => (
                <div key={i} className="step-item">
                  <span className="step-num">{step.order}.</span>
                  <span className="step-desc">
                    {step.description.length > 20
                      ? step.description.slice(0, 20) + '...'
                      : step.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-footer">
            <span className="dish-icon">🍽️</span>
            <span className="author-sign">
              {version.authorName} · {dayjs(version.timestamp).format('YYYY.MM.DD')}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .recipe-card-wrapper {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          margin-top: 20px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .card-header h3 {
          color: #8b4513;
          font-size: 16px;
        }

        .btn-print {
          background: #8b4513;
          color: #fff;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
        }

        .card-display {
          display: flex;
          justify-content: center;
          padding: 20px;
          background: #f5f0e1;
          border-radius: 8px;
        }

        .recipe-card {
          width: 85mm;
          height: 55mm;
          background: #fff8e7;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          padding: 8px;
          display: flex;
          flex-direction: column;
          font-size: 9px;
          color: #3e2723;
          position: relative;
          overflow: hidden;
        }

        .card-left {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 14mm;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 4px;
        }

        .card-title {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-weight: bold;
          font-size: 12px;
          color: #3e2723;
          letter-spacing: 2px;
          max-height: 48mm;
          overflow: hidden;
        }

        .card-middle {
          margin-left: 14mm;
          margin-right: 24mm;
          flex: 1;
          padding: 4px 0;
          overflow: hidden;
        }

        .ingredients-table {
          width: 100%;
          font-size: 8px;
          border-collapse: collapse;
        }

        .ingredients-table td {
          padding: 2px 0;
          border-bottom: 1px dashed #d7ccc8;
        }

        .ingredients-table .ing-name {
          text-align: left;
        }

        .ingredients-table .ing-amount {
          text-align: right;
          color: #6d4c41;
          white-space: nowrap;
        }

        .ing-more {
          text-align: center;
          color: #8d6e63;
          font-size: 7px;
        }

        .card-right {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 8mm;
          width: 22mm;
          background: #f5f0e1;
          margin: 4px;
          border-radius: 3px;
          padding: 6px 4px;
          overflow: hidden;
        }

        .steps-compact {
          font-size: 7px;
          line-height: 1.4;
        }

        .step-item {
          margin-bottom: 4px;
          display: flex;
          gap: 2px;
        }

        .step-num {
          font-weight: bold;
          color: #8b4513;
          flex-shrink: 0;
        }

        .step-desc {
          flex: 1;
          overflow: hidden;
        }

        .card-footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 8mm;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          border-top: 1px dashed #d7ccc8;
        }

        .dish-icon {
          font-size: 14px;
        }

        .author-sign {
          font-size: 7px;
          color: #8d6e63;
          font-style: italic;
        }

        @media print {
          .recipe-card-wrapper,
          .card-header,
          .card-display {
            background: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .recipe-card {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default RecipeCard;

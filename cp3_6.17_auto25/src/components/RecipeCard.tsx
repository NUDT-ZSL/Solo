import React, { useRef } from 'react';
import { Printer, Utensils } from 'lucide-react';
import type { Version } from '../types';

interface RecipeCardProps {
  version: Version | null;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ version }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  if (!version) {
    return (
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>请先选择一个食谱版本</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px' }}>食谱卡预览</h2>
        <button
          className="btn-primary"
          onClick={handlePrint}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Printer size={18} />
          打印食谱卡
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', background: '#fafafa', borderRadius: '12px' }}>
        <div
          ref={cardRef}
          className="recipe-card-print"
          style={{
            width: '85mm',
            height: '55mm',
            background: 'var(--color-card-bg)',
            borderRadius: '4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            padding: '4mm',
            display: 'grid',
            gridTemplateColumns: '8mm 1fr 1fr',
            gap: '2mm',
            overflow: 'hidden',
            fontFamily: 'Noto Sans SC, sans-serif',
          }}
        >
          <div
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px',
              color: '#3e2723',
              borderRight: '1px solid rgba(139, 69, 19, 0.2)',
              paddingRight: '2mm',
            }}
          >
            {version.name}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '8px', overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, marginBottom: '1mm', color: '#8b4513', fontSize: '9px' }}>
              食材清单
            </div>
            <table style={{ width: '100%', fontSize: '7px', borderCollapse: 'collapse' }}>
              <tbody>
                {version.ingredients.slice(0, 8).map((ing, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '0.5mm 1mm', whiteSpace: 'nowrap' }}>{ing.name}</td>
                    <td style={{ padding: '0.5mm 1mm', textAlign: 'right', color: '#666' }}>
                      {ing.quantity} {ing.unit}
                    </td>
                  </tr>
                ))}
                {version.ingredients.length > 8 && (
                  <tr>
                    <td colSpan={2} style={{ padding: '0.5mm 1mm', color: '#999', fontSize: '6px' }}>
                      等 {version.ingredients.length} 种食材
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: '8px',
              background: '#f5f0e1',
              borderRadius: '2px',
              padding: '2mm',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '1mm', color: '#8b4513', fontSize: '9px' }}>
              步骤
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1mm', overflow: 'hidden' }}>
              {version.steps.slice(0, 4).map((step) => (
                <div key={step.order} style={{ display: 'flex', gap: '1mm', alignItems: 'flex-start' }}>
                  <span style={{ color: '#8b4513', fontWeight: 600, flexShrink: 0 }}>
                    {step.order}.
                  </span>
                  <span style={{ lineHeight: '1.2' }}>
                    {step.description.length > 20 ? step.description.slice(0, 20) + '...' : step.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(139, 69, 19, 0.2)',
              paddingTop: '2mm',
              marginTop: '1mm',
              fontSize: '7px',
              color: '#666',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1mm' }}>
              <Utensils size={8} color="#8b4513" />
              <span>{version.versionNumber}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>{version.authorName || 'Chef'} 手制</div>
              <div style={{ color: '#999', fontSize: '6px' }}>
                {new Date(version.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;

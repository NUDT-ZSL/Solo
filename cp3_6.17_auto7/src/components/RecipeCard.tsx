import type { Version } from '@/types';
import dayjs from 'dayjs';
import { Printer } from 'lucide-react';

interface RecipeCardProps {
  version: Version;
}

export default function RecipeCard({ version }: RecipeCardProps) {
  const handlePrint = () => {
    window.print();
  };

  const sortedSteps = [...version.steps].sort((a, b) => a.order - b.order);

  return (
    <div className="relative">
      <button
        onClick={handlePrint}
        className="absolute top-2 right-2 z-10 btn flex items-center gap-1 text-sm"
        style={{ background: '#fff', border: '1px solid #ddd' }}
      >
        <Printer size={16} /> 打印
      </button>

      <div
        className="recipe-card relative"
        style={{
          width: '85mm',
          height: '55mm',
          background: '#fff8e7',
          borderRadius: '4px',
          padding: '8px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
          <div
            style={{
              width: '15%',
              writingMode: 'vertical-rl',
              color: '#3e2723',
              fontWeight: 'bold',
              letterSpacing: '2px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(180deg)',
              lineHeight: '1.2'
            }}
          >
            {version.ingredients.length > 0 ? version.ingredients[0].name || '食谱' : '食谱'}
          </div>

          <div style={{ width: '45%', display: 'flex', flexDirection: 'column' }}>
            <table style={{ fontSize: '10px', width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {version.ingredients.map((ing) => (
                  <tr key={ing.id}>
                    <td style={{ padding: '1px 2px', textAlign: 'left' }}>{ing.name}</td>
                    <td style={{ padding: '1px 2px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {ing.quantity} {ing.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              width: '35%',
              background: '#f5f0e1',
              borderRadius: '3px',
              padding: '4px',
              fontSize: '9px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            {sortedSteps.map((step) => (
              <div key={step.id} style={{ lineHeight: '1.2' }}>
                <span style={{ fontWeight: 'bold' }}>{step.order}.</span>
                {step.description.length > 20
                  ? step.description.slice(0, 20) + '...'
                  : step.description}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '4px',
            paddingTop: '4px',
            borderTop: '1px solid #e0d5c0',
            fontSize: '8px',
            color: '#5d4037'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg
              width="12"
              height="10"
              viewBox="0 0 24 20"
              fill="none"
              stroke="#5d4037"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 6h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" />
              <path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
            </svg>
            <span>{version.authorName}</span>
          </div>
          <span>{dayjs(version.createdAt).format('YYYY-MM-DD')}</span>
        </div>
      </div>
    </div>
  );
}

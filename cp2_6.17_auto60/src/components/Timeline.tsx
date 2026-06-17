import React, { useState } from 'react';
import { HealthRecord } from '../utils/api';
import dayjs from 'dayjs';

interface TimelineProps {
  records: HealthRecord[];
}

const typeColors: Record<string, string> = {
  vaccine: '#43a047',
  deworm: '#ef6c00',
  weight: '#5c6bc0'
};

const typeLabels: Record<string, string> = {
  vaccine: '疫苗接种',
  deworm: '驱虫',
  weight: '体重体温'
};

export const Timeline: React.FC<TimelineProps> = ({ records }) => {
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);

  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getRecordDetails = (record: HealthRecord) => {
    const details: { label: string; value: string }[] = [];
    details.push({ label: '类型', value: typeLabels[record.type] });
    details.push({ label: '日期', value: record.date });
    details.push({ label: '描述', value: record.description });
    
    if (record.vaccineName) {
      details.push({ label: '疫苗名称', value: record.vaccineName });
    }
    if (record.dewormType) {
      details.push({ label: '驱虫类型', value: record.dewormType });
    }
    if (record.weight !== undefined) {
      details.push({ label: '体重', value: `${record.weight} kg` });
    }
    if (record.temperature !== undefined) {
      details.push({ label: '体温', value: `${record.temperature} ℃` });
    }
    
    return details;
  };

  return (
    <>
      <div style={{ position: 'relative', paddingLeft: '30px' }}>
        <div
          style={{
            position: 'absolute',
            left: '5px',
            top: '6px',
            bottom: '6px',
            width: '2px',
            backgroundImage: 'linear-gradient(to bottom, #ccc 50%, transparent 50%)',
            backgroundSize: '2px 8px',
            backgroundRepeat: 'repeat-y'
          }}
        />

        {sortedRecords.map((record) => (
          <div
            key={record.id}
            style={{
              position: 'relative',
              marginBottom: '24px',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedRecord(record)}
            onMouseEnter={(e) => {
              const dot = e.currentTarget.querySelector('.timeline-dot') as HTMLElement;
              if (dot) {
                dot.style.transform = 'scale(1.3)';
              }
            }}
            onMouseLeave={(e) => {
              const dot = e.currentTarget.querySelector('.timeline-dot') as HTMLElement;
              if (dot) {
                dot.style.transform = 'scale(1)';
              }
            }}
          >
            <div
              className="timeline-dot"
              style={{
                position: 'absolute',
                left: '-30px',
                top: '4px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: typeColors[record.type],
                transition: 'transform 0.2s ease',
                zIndex: 1
              }}
            />

            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#fff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  color: '#888',
                  marginBottom: '4px',
                  fontFamily: 'Roboto, sans-serif'
                }}
              >
                {dayjs(record.date).format('YYYY年MM月DD日')}
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 500,
                  color: '#333',
                  fontFamily: 'Roboto, sans-serif'
                }}
              >
                {record.description}
              </div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#fff',
                  backgroundColor: typeColors[record.type],
                  marginTop: '6px'
                }}
              >
                {typeLabels[record.type]}
              </div>
            </div>
          </div>
        ))}

        {records.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: '#999',
              fontSize: '14px'
            }}
          >
            暂无健康记录
          </div>
        )}
      </div>

      {selectedRecord && (
        <div
          onClick={() => setSelectedRecord(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '400px',
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              height: 'auto'
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#333',
                margin: '0 0 16px 0',
                fontFamily: 'Roboto, sans-serif'
              }}
            >
              记录详情
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {getRecordDetails(selectedRecord).map((detail, index) => (
                  <tr key={index}>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontSize: '14px',
                        color: '#666',
                        width: '30%',
                        borderBottom: '1px solid #f0f0f0',
                        fontFamily: 'Roboto, sans-serif'
                      }}
                    >
                      {detail.label}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontSize: '14px',
                        color: '#333',
                        borderBottom: '1px solid #f0f0f0',
                        fontFamily: 'Roboto, sans-serif'
                      }}
                    >
                      {detail.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#f57c00',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e65100';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 124, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f57c00';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

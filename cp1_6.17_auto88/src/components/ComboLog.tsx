import React, { useEffect, useState } from 'react';
import { ComboRecord } from '../game/gameEngine';

interface ComboLogProps {
  records: ComboRecord[];
}

interface ComboItemProps {
  record: ComboRecord;
  isNew: boolean;
}

const ComboItem: React.FC<ComboItemProps> = ({ record, isNew }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(timer);
    }
    setVisible(true);
  }, [isNew]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: visible ? '#2C2C2C' : 'rgba(44, 44, 44, 0)',
        borderRadius: 6,
        padding: '6px 10px',
        marginBottom: 4,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out, background-color 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 4,
            height: 20,
            borderRadius: 2,
            backgroundColor: record.color,
            marginRight: 8,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {record.name} x{record.count}
        </span>
      </div>
      <span
        style={{
          color: '#FFD700',
          fontSize: 14,
          fontWeight: 'bold',
          flexShrink: 0,
          marginLeft: 8,
        }}
      >
        总伤害: {Math.round(record.totalDamage)}
      </span>
    </div>
  );
};

const ComboLog: React.FC<ComboLogProps> = ({ records }) => {
  const displayRecords = records.slice(-10);
  const latestId = records.length > 0 ? records[records.length - 1].id : -1;

  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        width: 200,
        maxHeight: 320,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 12,
        padding: 12,
        backdropFilter: 'blur(5px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: 'bold',
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        连招记录
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column-reverse',
        }}
      >
        <div>
          {displayRecords.map((record, index) => (
            <ComboItem
              key={record.id}
              record={record}
              isNew={record.id === latestId && index === displayRecords.length - 1}
            />
          ))}
        </div>
      </div>
      {records.length === 0 && (
        <div
          style={{
            color: '#666666',
            fontSize: 12,
            textAlign: 'center',
            padding: '20px 0',
          }}
        >
          暂无记录
        </div>
      )}
    </div>
  );
};

export default ComboLog;

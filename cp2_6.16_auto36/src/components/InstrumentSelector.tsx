import React from 'react';
import { Instrument } from '../types';

interface InstrumentSelectorProps {
  instruments: Instrument[];
  selectedInstrument: string;
  onSelect: (instrumentId: string) => void;
  isOpen?: boolean;
}

const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  instruments,
  selectedInstrument,
  onSelect,
  isOpen = false,
}) => {
  return (
    <aside className={`instrument-sidebar ${isOpen ? 'open' : ''}`}>
      <h3 className="sidebar-title">选择乐器</h3>
      <div className="instrument-list">
        {instruments.map((instrument) => (
          <div
            key={instrument.id}
            className={`instrument-card ${
              selectedInstrument === instrument.id ? 'selected' : ''
            }`}
            onClick={() => onSelect(instrument.id)}
          >
            <span className="instrument-icon">{instrument.icon}</span>
            <span className="instrument-name">{instrument.name}</span>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default InstrumentSelector;

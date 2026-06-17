import React, { useState, useCallback } from 'react';
import { InstrumentType, getGuitarFretNote, getPianoKeyNote, getViolinFretNote } from './AudioEngine';

interface InstrumentPanelProps {
  instrument: InstrumentType;
  onNotePlay: (note: string, instrument: InstrumentType) => void;
}

interface ActiveNote {
  id: string;
  note: string;
}

const InstrumentPanel: React.FC<InstrumentPanelProps> = ({ instrument, onNotePlay }) => {
  const [activeNotes, setActiveNotes] = useState<ActiveNote[]>([]);

  const triggerNote = useCallback((note: string, id: string) => {
    onNotePlay(note, instrument);
    setActiveNotes(prev => [...prev, { id, note }]);
    setTimeout(() => {
      setActiveNotes(prev => prev.filter(n => n.id !== id));
    }, 200);
  }, [instrument, onNotePlay]);

  const renderPiano = () => {
    const whiteKeys: number[] = [];
    const blackKeys: { index: number; offset: number }[] = [];
    const whiteKeyIndices = [0, 2, 4, 5, 7, 9, 11];
    const blackKeyOffsets = [1, 3, 6, 8, 10];

    for (let octave = 0; octave < 8; octave++) {
      for (let i = 0; i < 12; i++) {
        const keyIndex = octave * 12 + i;
        if (keyIndex >= 88) break;
        if (whiteKeyIndices.includes(i % 12)) {
          whiteKeys.push(keyIndex);
        }
      }
    }

    for (let octave = 0; octave < 8; octave++) {
      for (let i = 0; i < blackKeyOffsets.length; i++) {
        const semitone = blackKeyOffsets[i];
        const keyIndex = octave * 12 + semitone;
        if (keyIndex >= 88) break;
        const whiteKeyBefore = whiteKeyIndices.filter(w => w < semitone).length;
        const offset = octave * 7 + whiteKeyBefore;
        blackKeys.push({ index: keyIndex, offset });
      }
    }

    return (
      <div className="piano-container">
        <div className="piano">
          {whiteKeys.map((keyIndex) => {
            const note = getPianoKeyNote(keyIndex);
            const id = `piano-${keyIndex}`;
            const isActive = activeNotes.some(n => n.id === id);
            return (
              <div
                key={id}
                className={`piano-key piano-key-white ${isActive ? 'active' : ''}`}
                onClick={() => triggerNote(note, id)}
                title={note}
              />
            );
          })}
          {blackKeys.map(({ index, offset }) => {
            const note = getPianoKeyNote(index);
            const id = `piano-black-${index}`;
            const isActive = activeNotes.some(n => n.id === id);
            return (
              <div
                key={id}
                className={`piano-key piano-key-black ${isActive ? 'active' : ''}`}
                style={{ left: `${offset * 40 + 28}px` }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerNote(note, id);
                }}
                title={note}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderGuitar = () => {
    const strings = 6;
    const frets = 12;
    const markerFrets = [3, 5, 7, 9, 12];

    return (
      <div className="guitar-container">
        <div className="guitar-fretboard">
          {Array.from({ length: strings }).map((_, stringIndex) => (
            <div key={`string-${stringIndex}`} className="guitar-string">
              <div className="guitar-string-line" />
              {Array.from({ length: frets + 1 }).map((_, fret) => {
                const note = getGuitarFretNote(stringIndex, fret);
                const id = `guitar-${stringIndex}-${fret}`;
                const isActive = activeNotes.some(n => n.id === id);
                const showMarker = markerFrets.includes(fret) && stringIndex === 2;
                return (
                  <div
                    key={id}
                    className={`guitar-fret ${fret === 0 ? 'guitar-fret-zero' : ''} ${isActive ? 'active' : ''}`}
                    onClick={() => triggerNote(note, id)}
                    title={note}
                  >
                    {showMarker && <div className="guitar-fret-marker" />}
                    {fret > 0 && stringIndex === 0 && (
                      <div className="guitar-fret-number">{fret}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderViolin = () => {
    const strings = 4;
    const positions = 12;
    const markerPositions = [3, 5, 7, 9];

    return (
      <div className="violin-container">
        <div className="violin-fingerboard">
          <div className="violin-nut" />
          <div className="violin-bridge" />
          <div className="violin-strings">
            {Array.from({ length: strings }).map((_, stringIndex) => (
              <div key={`violin-string-${stringIndex}`} className="violin-string">
                <div className="violin-string-line" />
                {Array.from({ length: positions + 1 }).map((_, pos) => {
                  const note = getViolinFretNote(stringIndex, pos);
                  const id = `violin-${stringIndex}-${pos}`;
                  const isActive = activeNotes.some(n => n.id === id);
                  const showMarker = markerPositions.includes(pos) && stringIndex === 1;
                  const positionHeight = (100 / (positions + 1));
                  return (
                    <div
                      key={id}
                      className={`violin-finger-position ${isActive ? 'active' : ''}`}
                      style={{
                        top: `${pos * positionHeight}%`,
                        height: `${positionHeight}%`
                      }}
                      onClick={() => triggerNote(note, id)}
                      title={note}
                    >
                      {showMarker && <div className="violin-position-marker" />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderInstrument = () => {
    switch (instrument) {
      case 'piano':
        return renderPiano();
      case 'guitar':
        return renderGuitar();
      case 'violin':
        return renderViolin();
      default:
        return null;
    }
  };

  return (
    <div className="instrument-panel">
      {renderInstrument()}
    </div>
  );
};

export default InstrumentPanel;

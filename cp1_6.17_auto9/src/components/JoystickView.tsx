import React from 'react';

interface JoystickViewProps {
  x: number;
  y: number;
  label: string;
}

const JoystickView: React.FC<JoystickViewProps> = ({ x, y, label }) => {
  const maxOffset = 45;
  const offsetX = (x / 127) * maxOffset;
  const offsetY = (y / 127) * maxOffset;

  const dotStyle: React.CSSProperties = {
    transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
  };

  return (
    <div className="joystick-view">
      <div className="joystick-label">{label}</div>
      <div className="crosshair">
        <div className="crosshair-dot" style={dotStyle} />
      </div>
      <div className="joystick-values">
        X: {x.toString().padStart(4, ' ')} Y: {y.toString().padStart(4, ' ')}
      </div>
    </div>
  );
};

export default React.memo(JoystickView);

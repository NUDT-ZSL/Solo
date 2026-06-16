import React from 'react';

interface GamepadDiagramProps {
  pressedButtons: string[];
}

const GamepadDiagram: React.FC<GamepadDiagramProps> = ({ pressedButtons }) => {
  const isPressed = (name: string) => pressedButtons.includes(name);

  return (
    <div className="gamepad-diagram">
      <div className="dpad">
        <div className="dpad-center" />
        <div className={`dpad-up ${isPressed('Up') ? 'pressed' : ''}`} />
        <div className={`dpad-down ${isPressed('Down') ? 'pressed' : ''}`} />
        <div className={`dpad-left ${isPressed('Left') ? 'pressed' : ''}`} />
        <div className={`dpad-right ${isPressed('Right') ? 'pressed' : ''}`} />
      </div>

      <div className="abxy-buttons">
        <div className={`abxy-btn btn-y ${isPressed('Y') ? 'pressed' : ''}`}>Y</div>
        <div className={`abxy-btn btn-x ${isPressed('X') ? 'pressed' : ''}`}>X</div>
        <div className={`abxy-btn btn-b ${isPressed('B') ? 'pressed' : ''}`}>B</div>
        <div className={`abxy-btn btn-a ${isPressed('A') ? 'pressed' : ''}`}>A</div>
      </div>
    </div>
  );
};

export default React.memo(GamepadDiagram);

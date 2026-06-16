import { useState, useEffect, useRef, useCallback } from 'react';

export interface GamepadButtonEvent {
  timestamp: number;
  buttonName: string;
  isPressed: boolean;
}

export interface GamepadState {
  buttons: Record<string, boolean>;
  axes: {
    left: { x: number; y: number };
    right: { x: number; y: number };
  };
  connected: boolean;
  gamepadIndex: number;
  gamepadId: string;
}

const BUTTON_MAP: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'Back',
  9: 'Start',
  10: 'LS',
  11: 'RS',
  12: 'Up',
  13: 'Down',
  14: 'Left',
  15: 'Right',
  16: 'Home',
};

const AXIS_DEADZONE = 0.08;

function applyDeadzone(value: number): number {
  if (Math.abs(value) < AXIS_DEADZONE) {
    return 0;
  }
  const sign = value > 0 ? 1 : -1;
  const normalized = (Math.abs(value) - AXIS_DEADZONE) / (1 - AXIS_DEADZONE);
  return Math.round(normalized * 127) * sign;
}

export function useGamepad(gamepadIndex: number = 0) {
  const [state, setState] = useState<GamepadState>({
    buttons: {},
    axes: {
      left: { x: 0, y: 0 },
      right: { x: 0, y: 0 },
    },
    connected: false,
    gamepadIndex,
    gamepadId: '',
  });

  const prevButtonsRef = useRef<Record<string, boolean>>({});
  const eventListenersRef = useRef<Array<(event: GamepadButtonEvent) => void>>([]);
  const rafRef = useRef<number>();

  const onButtonEvent = useCallback((callback: (event: GamepadButtonEvent) => void) => {
    eventListenersRef.current.push(callback);
    return () => {
      eventListenersRef.current = eventListenersRef.current.filter((cb) => cb !== callback);
    };
  }, []);

  const emitEvent = useCallback((event: GamepadButtonEvent) => {
    eventListenersRef.current.forEach((cb) => cb(event));
  }, []);

  useEffect(() => {
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads?.() || [];
      const gamepad = gamepads[gamepadIndex];

      if (!gamepad || !gamepad.connected) {
        setState((prev) => {
          if (prev.connected || prev.gamepadId !== '') {
            return {
              ...prev,
              connected: false,
              gamepadId: '',
              buttons: {},
              axes: {
                left: { x: 0, y: 0 },
                right: { x: 0, y: 0 },
              },
            };
          }
          return prev;
        });
        prevButtonsRef.current = {};
        rafRef.current = requestAnimationFrame(pollGamepad);
        return;
      }

      const currentButtons: Record<string, boolean> = {};
      gamepad.buttons.forEach((btn, index) => {
        const name = BUTTON_MAP[index] || `Btn${index}`;
        currentButtons[name] = btn.pressed;
      });

      const prevButtons = prevButtonsRef.current;
      const buttonNames = new Set([...Object.keys(currentButtons), ...Object.keys(prevButtons)]);

      buttonNames.forEach((name) => {
        const wasPressed = prevButtons[name] || false;
        const isPressed = currentButtons[name] || false;
        if (wasPressed !== isPressed) {
          emitEvent({
            timestamp: performance.now(),
            buttonName: name,
            isPressed,
          });
        }
      });

      prevButtonsRef.current = currentButtons;

      const axes = gamepad.axes;
      const leftX = axes.length > 0 ? applyDeadzone(axes[0]) : 0;
      const leftY = axes.length > 1 ? applyDeadzone(axes[1]) : 0;
      const rightX = axes.length > 2 ? applyDeadzone(axes[2]) : 0;
      const rightY = axes.length > 3 ? applyDeadzone(axes[3]) : 0;

      setState({
        buttons: currentButtons,
        axes: {
          left: { x: leftX, y: leftY },
          right: { x: rightX, y: rightY },
        },
        connected: true,
        gamepadIndex,
        gamepadId: gamepad.id,
      });

      rafRef.current = requestAnimationFrame(pollGamepad);
    };

    rafRef.current = requestAnimationFrame(pollGamepad);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [gamepadIndex, emitEvent]);

  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id);
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    };
  }, []);

  return {
    state,
    onButtonEvent,
  };
}

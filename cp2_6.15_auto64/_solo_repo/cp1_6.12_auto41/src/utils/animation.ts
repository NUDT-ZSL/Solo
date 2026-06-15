import { LyricLine } from '../types';

export type AnimationPhase = 'inactive' | 'entering' | 'active' | 'exiting';

export function getAnimationPhase(
  line: LyricLine,
  currentTime: number
): AnimationPhase {
  const { startTime, endTime, style } = line;
  const duration = style.animationDuration;

  if (currentTime < startTime - duration) {
    return 'inactive';
  }
  if (currentTime < startTime) {
    return 'entering';
  }
  if (currentTime < endTime - duration) {
    return 'active';
  }
  if (currentTime < endTime) {
    return 'exiting';
  }
  return 'inactive';
}

export function getActiveLine(
  lines: LyricLine[],
  currentTime: number
): LyricLine | null {
  for (const line of lines) {
    const phase = getAnimationPhase(line, currentTime);
    if (phase !== 'inactive') {
      return line;
    }
  }
  return null;
}

export function getAnimationStyle(
  line: LyricLine,
  currentTime: number
): React.CSSProperties {
  const phase = getAnimationPhase(line, currentTime);
  const { style } = line;

  const baseStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize}px`,
    color: style.color,
  };

  if (phase === 'entering') {
    const progress = (currentTime - (line.startTime - style.animationDuration)) / style.animationDuration;
    return {
      ...baseStyle,
      animation: `${style.enterAnimation} ${style.animationDuration}s ease-out forwards`,
      animationDelay: `${-progress * style.animationDuration}s`,
    };
  }

  if (phase === 'exiting') {
    const progress = (currentTime - (line.endTime - style.animationDuration)) / style.animationDuration;
    return {
      ...baseStyle,
      animation: `${style.exitAnimation} ${style.animationDuration}s ease-in forwards`,
      animationDelay: `${-progress * style.animationDuration}s`,
    };
  }

  if (phase === 'active') {
    return {
      ...baseStyle,
      opacity: 1,
      transform: 'none',
    };
  }

  return {
    ...baseStyle,
    opacity: 0,
  };
}

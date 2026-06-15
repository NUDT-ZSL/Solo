import React, { memo, useCallback, useRef, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { AvatarConfig, ColorTheme, ElementOption } from '../types';

interface RandomGeneratorProps {
  theme: ColorTheme;
  hairOptions: ElementOption[];
  eyesOptions: ElementOption[];
  accessoryOptions: ElementOption[];
  colorThemes: ColorTheme[];
  onConfigChange: (config: AvatarConfig, themeId: string) => void;
  onAnimationStart: () => void;
  onAnimationEnd: () => void;
}

const RandomGenerator: React.FC<RandomGeneratorProps> = memo(({
  theme,
  hairOptions,
  eyesOptions,
  accessoryOptions,
  colorThemes,
  onConfigChange,
  onAnimationStart,
  onAnimationEnd,
}) => {
  const [isRandomizing, setIsRandomizing] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const getRandomElement = useCallback(<T,>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
  }, []);

  const handleRandomize = useCallback(() => {
    if (isRandomizing) return;

    setIsRandomizing(true);
    onAnimationStart();

    let count = 0;
    const maxCount = 3;

    const generateRandom = () => {
      count++;
      onConfigChange(
        {
          hair: getRandomElement(hairOptions).id,
          eyes: getRandomElement(eyesOptions).id,
          accessory: getRandomElement(accessoryOptions).id,
        },
        getRandomElement(colorThemes).id
      );

      if (count >= maxCount) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        timeoutRef.current = window.setTimeout(() => {
          setIsRandomizing(false);
          onAnimationEnd();
        }, 800);
      }
    };

    generateRandom();
    intervalRef.current = window.setInterval(generateRandom, 800);
  }, [
    isRandomizing,
    hairOptions,
    eyesOptions,
    accessoryOptions,
    colorThemes,
    getRandomElement,
    onConfigChange,
    onAnimationStart,
    onAnimationEnd,
  ]);

  const handleButtonClick = useCallback(() => {
    handleRandomize();
  }, [handleRandomize]);

  return (
    <button
      onClick={handleButtonClick}
      disabled={isRandomizing}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white
        transition-all duration-300 ease-out
        ${isRandomizing 
          ? 'cursor-not-allowed opacity-70' 
          : 'hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer'
        }
      `}
      style={{ 
        backgroundColor: theme.primary,
        boxShadow: isRandomizing 
          ? 'none' 
          : `0 4px 20px ${theme.primary}50, 0 0 40px ${theme.primary}30`,
      }}
    >
      <Shuffle 
        size={20} 
        className={isRandomizing ? 'animate-spin' : ''} 
      />
      {isRandomizing ? '生成中...' : '随机生成'}
    </button>
  );
});

RandomGenerator.displayName = 'RandomGenerator';

export default RandomGenerator;

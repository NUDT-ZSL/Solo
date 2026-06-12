import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlipNumberProps {
  value: number;
  duration?: number;
}

const FlipNumber = ({ value, duration = 0.6 }: FlipNumberProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    if (value !== displayValue) {
      setPrevValue(displayValue);
      setDisplayValue(value);
    }
  }, [value, displayValue]);

  const formatValue = (num: number) => {
    return num.toFixed(1);
  };

  const currentStr = formatValue(displayValue);
  const prevStr = formatValue(prevValue);

  const digits = useMemo(() => {
    const arr: { char: string; isDigit: boolean; index: number }[] = [];
    for (let i = 0; i < currentStr.length; i++) {
      arr.push({
        char: currentStr[i],
        isDigit: /[0-9]/.test(currentStr[i]),
        index: i,
      });
    }
    return arr;
  }, [currentStr]);

  const prevDigits = useMemo(() => {
    const arr: { char: string; isDigit: boolean; index: number }[] = [];
    for (let i = 0; i < prevStr.length; i++) {
      arr.push({
        char: prevStr[i],
        isDigit: /[0-9]/.test(prevStr[i]),
        index: i,
      });
    }
    return arr;
  }, [prevStr]);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {digits.map((digit, i) => {
        const prevDigit = prevDigits[i];
        const hasChanged = prevDigit && digit.char !== prevDigit.char;

        if (!digit.isDigit) {
          return (
            <span
              key={`${i}-${digit.char}`}
              style={{
                fontSize: 'inherit',
                fontWeight: 'inherit',
                color: 'inherit',
                lineHeight: 1,
              }}
            >
              {digit.char}
            </span>
          );
        }

        return (
          <span
            key={`${i}-digit`}
            style={{
              display: 'inline-block',
              position: 'relative',
              overflow: 'hidden',
              height: '1.2em',
              width: '0.65em',
              verticalAlign: 'bottom',
            }}
          >
            <AnimatePresence mode="popLayout">
              <motion.span
                key={`${i}-${digit.char}-${hasChanged ? 'changed' : 'same'}`}
                initial={hasChanged ? { y: '-100%' } : false}
                animate={{ y: '0%' }}
                exit={{ y: '100%' }}
                transition={{
                  duration: duration,
                  ease: [0.22, 1, 0.36, 1],
                  delay: i * 0.03,
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  color: 'inherit',
                  lineHeight: 1.2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {digit.char}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
};

export default FlipNumber;

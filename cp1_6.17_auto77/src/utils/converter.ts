export type Base = 2 | 8 | 10 | 16;

export interface ConversionStep {
  digit: string;
  position: number;
  weight: number;
  value: number;
}

export interface ConversionResult {
  input: string;
  fromBase: Base;
  toBase: Base;
  output: string;
  decimalValue: number;
  steps: ConversionStep[];
}

export const BASE_LABELS: Record<Base, string> = {
  2: '二进制',
  8: '八进制',
  10: '十进制',
  16: '十六进制',
};

const HEX_CHARS = '0123456789ABCDEF';

function digitToValue(ch: string): number {
  return HEX_CHARS.indexOf(ch.toUpperCase());
}

function valueToDigit(v: number): string {
  return HEX_CHARS[v];
}

export function convert(input: string, fromBase: Base, toBase: Base): ConversionResult {
  const upper = input.toUpperCase().trim();
  const digits = upper.split('');

  let decimalValue = 0;
  for (let i = 0; i < digits.length; i++) {
    const dv = digitToValue(digits[i]);
    if (dv < 0 || dv >= fromBase) {
      throw new Error(`数字 '${digits[i]}' 在${BASE_LABELS[fromBase]}中无效`);
    }
    decimalValue = decimalValue * fromBase + dv;
  }

  if (decimalValue > 65535) {
    throw new Error('数值超出范围（0-65535）');
  }

  const steps: ConversionStep[] = digits.map((d, i) => {
    const position = digits.length - 1 - i;
    const dv = digitToValue(d);
    const weight = Math.pow(fromBase, position);
    return { digit: d, position, weight, value: dv * weight };
  });

  let output: string;
  if (toBase === 10) {
    output = decimalValue.toString();
  } else if (decimalValue === 0) {
    output = '0';
  } else {
    output = '';
    let rem = decimalValue;
    while (rem > 0) {
      output = valueToDigit(rem % toBase) + output;
      rem = Math.floor(rem / toBase);
    }
  }

  return { input: upper, fromBase, toBase, output, decimalValue, steps };
}

export function validateInput(input: string, base: Base): string | null {
  if (!input || input.trim() === '') return '请输入数字';
  const upper = input.toUpperCase().trim();
  for (const ch of upper) {
    const v = digitToValue(ch);
    if (v < 0 || v >= base) {
      return `数字 '${ch}' 在${BASE_LABELS[base]}中无效`;
    }
  }
  const decimal = parseInt(upper, base);
  if (isNaN(decimal)) return '输入格式无效';
  if (decimal < 0 || decimal > 65535) return '数值超出范围（0-65535）';
  return null;
}

export function getTargetDigitInfo(output: string, base: Base): ConversionStep[] {
  const digits = output.toUpperCase().split('');
  return digits.map((d, i) => {
    const position = digits.length - 1 - i;
    const dv = digitToValue(d);
    const weight = Math.pow(base, position);
    return { digit: d, position, weight, value: dv * weight };
  });
}

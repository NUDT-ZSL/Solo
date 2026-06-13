import { ParticleConfig } from './particleEngine';

export interface ParseResult {
  success: boolean;
  config?: Partial<ParticleConfig>;
  error?: string;
}

function extractCSSColors(css: string): string[] {
  const colorRegex = /#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g;
  return css.match(colorRegex) || [];
}

function extractJSNumericValues(js: string): Record<string, number> {
  const result: Record<string, number> = {};
  const patterns: [RegExp, string][] = [
    [/count\s*[=:]\s*(\d+)/i, 'count'],
    [/speed\s*[=:]\s*([\d.]+)/i, 'speed'],
    [/rotation\s*[=:]\s*([\d.]+)/i, 'rotation'],
    [/size\s*[=:]\s*([\d.]+)/i, 'size'],
    [/noise\s*[=:]\s*([\d.]+)/i, 'noise'],
    [/trail\s*[=:]\s*([\d.]+)/i, 'trail'],
  ];

  for (const [regex, key] of patterns) {
    const match = js.match(regex);
    if (match) {
      result[key] = parseFloat(match[1]);
    }
  }

  return result;
}

export function parseCode(code: string): ParseResult {
  if (!code || !code.trim()) {
    return { success: false, error: 'Empty code input' };
  }

  try {
    const config: Partial<ParticleConfig> = {};
    const cssMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const jsMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

    if (cssMatch) {
      const cssColors = extractCSSColors(cssMatch[1]);
      if (cssColors.length > 0) {
        config.colorMix = Math.min(cssColors.length / 5, 1.0);
      }
    }

    if (jsMatch) {
      const jsValues = extractJSNumericValues(jsMatch[1]);
      Object.assign(config, jsValues);
    }

    if (!cssMatch && !jsMatch) {
      const jsValues = extractJSNumericValues(code);
      const colors = extractCSSColors(code);
      if (colors.length > 0) {
        config.colorMix = Math.min(colors.length / 5, 1.0);
      }
      Object.assign(config, jsValues);
    }

    if (Object.keys(config).length === 0) {
      return {
        success: false,
        error: 'No recognizable particle parameters found in code. Try defining count, speed, rotation, size, noise, or trail variables.',
      };
    }

    return { success: true, config };
  } catch (e) {
    return {
      success: false,
      error: `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}

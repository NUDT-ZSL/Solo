import { ParticleConfig } from './particleEngine';

export interface ParseResult {
  success: boolean;
  config?: Partial<ParticleConfig>;
  error?: string;
  parseTimeMs?: number;
}

function extractCSSColors(css: string): string[] {
  try {
    const colorRegex = /#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\([^)]+\)|hsla?\([^)]+\)|var\([^)]+\)/g;
    return css.match(colorRegex) || [];
  } catch {
    return [];
  }
}

function extractJSNumericValues(js: string): Record<keyof ParticleConfig, number | undefined> {
  const result: Record<string, number> = {};
  const patterns: { regex: RegExp; key: keyof ParticleConfig; cast: (s: string) => number }[] = [
    { regex: /(?:const|let|var)?\s*count\s*[=:]\s*(\d+(?:\.\d+)?)/i, key: 'count', cast: (s) => Math.round(parseFloat(s)) },
    { regex: /(?:const|let|var)?\s*speed\s*[=:]\s*([\d.]+)/i, key: 'speed', cast: parseFloat },
    { regex: /(?:const|let|var)?\s*rotation\s*[=:]\s*([\d.]+)/i, key: 'rotation', cast: parseFloat },
    { regex: /(?:const|let|var)?\s*colormix\s*[=:]\s*([\d.]+)/i, key: 'colorMix', cast: parseFloat },
    { regex: /(?:const|let|var)?\s*color_mix\s*[=:]\s*([\d.]+)/i, key: 'colorMix', cast: parseFloat },
    { regex: /(?:const|let|var)?\s*size\s*[=:]\s*([\d.]+)/i, key: 'size', cast: parseFloat },
    { regex: /(?:const|let|var)?\s*trail\s*[=:]\s*([\d.]+)/i, key: 'trail', cast: parseFloat },
    { regex: /(?:const|let|var)?\s*noise\s*[=:]\s*([\d.]+)/i, key: 'noise', cast: parseFloat },
  ];

  for (const { regex, key, cast } of patterns) {
    try {
      const match = js.match(regex);
      if (match && match[1]) {
        const value = cast(match[1]);
        if (!Number.isNaN(value) && Number.isFinite(value)) {
          result[key as string] = value;
        }
      }
    } catch {
      // 忽略单个正则失败
    }
  }

  return result as Record<keyof ParticleConfig, number | undefined>;
}

const STYLE_SAFE_KEYS = [
  'count',
  'speed',
  'rotation',
  'color-mix',
  'colorMix',
  'size',
  'particle-size',
  'trail',
  'noise',
] as const;

function tryExtractStyleVars(code: string): Partial<ParticleConfig> {
  const cfg: Partial<ParticleConfig> = {};

  const cssVarMatch = code.match(/--([a-zA-Z0-9-]+)\s*:\s*([^;}]+)/g);
  if (cssVarMatch) {
    for (const line of cssVarMatch) {
      try {
        const parts = line.split(/\s*:\s*/);
        const name = parts[0]?.replace(/^--/, '').trim().toLowerCase();
        const val = parts.slice(1).join(':').trim();
        const numeric = parseFloat(val.replace(/[^0-9.]/g, ''));

        if (!STYLE_SAFE_KEYS.includes(name as any)) continue;
        if (Number.isNaN(numeric) || !Number.isFinite(numeric)) continue;

        switch (name) {
          case 'count':
            cfg.count = Math.round(numeric);
            break;
          case 'speed':
            cfg.speed = numeric;
            break;
          case 'rotation':
            cfg.rotation = numeric;
            break;
          case 'color-mix':
          case 'colormix':
            cfg.colorMix = numeric;
            break;
          case 'size':
          case 'particle-size':
            cfg.size = numeric;
            break;
          case 'trail':
            cfg.trail = numeric;
            break;
          case 'noise':
            cfg.noise = numeric;
            break;
        }
      } catch {
        continue;
      }
    }
  }

  return cfg;
}

function tryExecuteWithNewFunction(jsCode: string): Partial<ParticleConfig> {
  const cfg: Partial<ParticleConfig> = {};

  try {
    if (!/new\s+function|function\s*\(|=>/.test(jsCode.slice(0, 200)) && jsCode.length < 5000) {
      return cfg;
    }

    const context: Record<string, number> = {
      count: 0,
      speed: 0,
      rotation: 0,
      colorMix: 0,
      size: 0,
      trail: 0,
      noise: 0,
    };

    const wrappedCode = `
      var exports = {};
      var module = { exports: {} };
      var window = undefined;
      var document = undefined;
      var globalThis = undefined;
      var count=0, speed=0, rotation=0, colorMix=0, size=0, trail=0, noise=0;
      try {
        ${jsCode};
      } catch(e) {}
      return {
        count: typeof count !== 'undefined' ? count : 0,
        speed: typeof speed !== 'undefined' ? speed : 0,
        rotation: typeof rotation !== 'undefined' ? rotation : 0,
        colorMix: typeof colorMix !== 'undefined' ? colorMix : 0,
        size: typeof size !== 'undefined' ? size : 0,
        trail: typeof trail !== 'undefined' ? trail : 0,
        noise: typeof noise !== 'undefined' ? noise : 0,
      };
    `;

    const fn = new Function(wrappedCode);
    const result = fn() as Partial<ParticleConfig>;

    for (const key of Object.keys(result) as (keyof ParticleConfig)[]) {
      const val = (result as any)[key];
      if (typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val) && val !== 0) {
        cfg[key] = key === 'count' ? Math.round(val) : val;
      }
    }
  } catch (e) {
    // 函数执行失败，不抛错误，返回空
  }

  return cfg;
}

function clampConfig(cfg: Partial<ParticleConfig>): Partial<ParticleConfig> {
  const result: Partial<ParticleConfig> = { ...cfg };
  if (result.count !== undefined) result.count = Math.max(10, Math.min(100000, result.count));
  if (result.speed !== undefined) result.speed = Math.max(0, Math.min(100, result.speed));
  if (result.rotation !== undefined) result.rotation = Math.max(0, Math.min(100, result.rotation));
  if (result.colorMix !== undefined) result.colorMix = Math.max(0, Math.min(1, result.colorMix));
  if (result.size !== undefined) result.size = Math.max(0.1, Math.min(100, result.size));
  if (result.trail !== undefined) result.trail = Math.max(0, Math.min(1, result.trail));
  if (result.noise !== undefined) result.noise = Math.max(0, Math.min(100, result.noise));
  return result;
}

export function parseCode(code: string): ParseResult {
  const t0 = performance.now();

  if (!code || typeof code !== 'string') {
    return {
      success: false,
      error: '输入不能为空',
      parseTimeMs: performance.now() - t0,
    };
  }

  const trimmed = code.trim();
  if (!trimmed) {
    return {
      success: false,
      error: '输入代码不能为空',
      parseTimeMs: performance.now() - t0,
    };
  }

  const DEADLINE_MS = 180;
  let finished = false;

  try {
    const timeoutId = setTimeout(() => {
      if (!finished) {
        console.warn(`[codeParser] 解析接近超时 (${performance.now() - t0}ms)`);
      }
    }, DEADLINE_MS);

    const config: Partial<ParticleConfig> = {};

    let cssContent = '';
    let jsContent = '';

    try {
      const styleMatch = trimmed.match(/<style[^>]*>([\s\S]*?)<\/style>/im);
      if (styleMatch && styleMatch[1]) cssContent = styleMatch[1];

      const scriptMatch = trimmed.match(/<script[^>]*>([\s\S]*?)<\/script>/im);
      if (scriptMatch && scriptMatch[1]) jsContent = scriptMatch[1];
    } catch {
      cssContent = '';
      jsContent = '';
    }

    const hasTags = cssContent.length > 0 || jsContent.length > 0;
    const rawContent = hasTags ? `${cssContent}\n${jsContent}` : trimmed;

    const cssColors = extractCSSColors(cssContent.length > 0 ? cssContent : rawContent);
    if (cssColors.length > 0) {
      config.colorMix = Math.min(cssColors.length / 5, 1.0);
    }

    const styleVars = tryExtractStyleVars(rawContent);
    Object.assign(config, styleVars);

    const numericValues = extractJSNumericValues(jsContent.length > 0 ? jsContent : rawContent);
    for (const key of Object.keys(numericValues) as (keyof ParticleConfig)[]) {
      const val = numericValues[key];
      if (typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val)) {
        config[key] = val;
      }
    }

    if (performance.now() - t0 < DEADLINE_MS) {
      const execCfg = tryExecuteWithNewFunction(jsContent.length > 0 ? jsContent : trimmed);
      for (const key of Object.keys(execCfg) as (keyof ParticleConfig)[]) {
        if (config[key] === undefined && typeof execCfg[key] === 'number') {
          (config as any)[key] = execCfg[key];
        }
      }
    }

    const finalConfig = clampConfig(config);

    clearTimeout(timeoutId);
    finished = true;
    const parseTimeMs = performance.now() - t0;

    if (Object.keys(finalConfig).length === 0) {
      return {
        success: false,
        error:
          '未识别到任何参数。请尝试在代码中定义变量：count, speed, rotation, colorMix, size, noise, trail，或使用 CSS 变量 (--count: 5000 等)',
        parseTimeMs,
      };
    }

    if (parseTimeMs > 200) {
      console.warn(
        `[codeParser] 警告: 解析耗时 ${parseTimeMs.toFixed(0)}ms，超过目标 200ms`
      );
    } else {
      console.log(
        `[codeParser] 解析完成: ${parseTimeMs.toFixed(1)}ms (目标 <= 200ms ✅)，参数:`,
        Object.keys(finalConfig)
      );
    }

    return {
      success: true,
      config: finalConfig,
      parseTimeMs,
    };
  } catch (e) {
    finished = true;
    const parseTimeMs = performance.now() - t0;
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[codeParser] 解析异常:', msg, e);
    return {
      success: false,
      error: `解析失败: ${msg}。请检查代码语法是否正确。`,
      parseTimeMs,
    };
  }
}

export const __TEST__ = {
  extractCSSColors,
  extractJSNumericValues,
  tryExtractStyleVars,
  clampConfig,
};

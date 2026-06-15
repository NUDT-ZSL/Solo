import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = join(__dirname, '..', 'src', 'engine', 'colorEngine.ts');

const colorEngineSource = `
function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
  const toHex = (n) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function getLuminance([r, g, b]) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(hexToRgb(color1)) / 255;
  const lum2 = getLuminance(hexToRgb(color2)) / 255;
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getLightness(hour) {
  const normalized = (hour - 6) / 24;
  const angle = normalized * Math.PI * 2;
  return 0.42 + 0.22 * Math.sin(angle);
}

function getSaturation(hour) {
  const isDaytime = hour >= 6 && hour <= 18;
  if (isDaytime) {
    const transition = Math.sin(((hour - 6) / 12) * Math.PI);
    return 0.6 + 0.18 * transition;
  } else {
    const nightProgress = hour < 6 ? (hour + 6) / 12 : (hour - 18) / 12;
    return 0.6 - 0.15 * Math.sin(nightProgress * Math.PI);
  }
}

function getBaseHue(hour) {
  return (hour / 24) * 360;
}

function generateColorPalette(hour) {
  const clampedHour = Math.max(0, Math.min(23.999, hour));
  const baseHue = getBaseHue(clampedHour);
  const lightness = getLightness(clampedHour);
  const saturation = getSaturation(clampedHour);
  const isDarkMode = lightness < 0.45;
  const primaryHue = baseHue;
  const secondaryHue = (baseHue + 32) % 360;
  const accentHue = (baseHue + 180) % 360;
  const primaryLightness = isDarkMode
    ? Math.max(lightness + 0.12, 0.28)
    : lightness;
  const secondaryLightness = isDarkMode
    ? Math.max(lightness + 0.08, 0.32)
    : Math.min(lightness * 0.95, 0.82);
  const accentLightness = isDarkMode
    ? Math.max(lightness + 0.18, 0.42)
    : Math.min(Math.max(lightness + 0.05, 0.35), 0.78);
  let primary = hslToHex(primaryHue, saturation, primaryLightness);
  const secondary = hslToHex(secondaryHue, saturation * 0.9, secondaryLightness);
  const accent = hslToHex(accentHue, Math.min(saturation * 1.05, 0.9), accentLightness);
  const bgLightness = isDarkMode ? 0.07 : 0.96;
  const bgSaturation = Math.min(saturation * 0.1, 0.08);
  let background = hslToHex(baseHue, bgSaturation, bgLightness);
  const contrast = getContrastRatio(primary, background);
  if (contrast < 3.5) {
    if (isDarkMode) {
      primary = hslToHex(primaryHue, Math.min(saturation + 0.1, 0.85), 0.5);
      background = hslToHex(baseHue, bgSaturation, 0.05);
    } else {
      primary = hslToHex(primaryHue, saturation, 0.35);
      background = hslToHex(baseHue, bgSaturation, 0.98);
    }
  }
  const textLightness = isDarkMode ? 0.92 : 0.1;
  const text = hslToHex(baseHue, Math.min(saturation * 0.2, 0.15), textLightness);
  return [primary, secondary, accent, background, text];
}

const LABELS = ['主色', '辅色', '强调色', '背景色', '文字色'];

console.log('\n=== ColorChron 配色引擎验证报告 ===\n');

let allPass = true;

for (let hour = 0; hour < 24; hour += 3) {
  const colors = generateColorPalette(hour);
  const bgLum = getLuminance(hexToRgb(colors[3]));
  const primaryContrast = getContrastRatio(colors[0], colors[3]);
  const textContrast = getContrastRatio(colors[4], colors[3]);

  const isDarkExpected = hour < 6 || hour > 18;
  const darkPass = isDarkExpected ? bgLum < 100 : bgLum > 160;
  const contrastPass = primaryContrast >= 3 && textContrast >= 4.5;

  const pass = darkPass && contrastPass;
  if (!pass) allPass = false;

  const timeStr = String(hour).padStart(2, '0') + ':00';
  const mode = isDarkExpected ? '夜间' : '白天';
  const icon = pass ? '✓' : '✗';

  console.log(\`\${icon} \${timeStr} (\${mode}模式): 背景亮度=\${bgLum.toFixed(0)} 主色对比=\${primaryContrast.toFixed(2)} 文字对比=\${textContrast.toFixed(2)}\`);
  console.log(\`   配色: \${colors.map((c, i) => LABELS[i] + '=' + c.toUpperCase()).join('  ')}\n\`);
}

console.log('\n=== 关键时间点详细检查 ===\n');

const keyHours = [
  { h: 0,  name: '午夜', expectDark: true },
  { h: 6,  name: '日出', expectDark: false },
  { h: 12, name: '正午', expectDark: false },
  { h: 18, name: '日落', expectDark: false },
  { h: 23, name: '深夜', expectDark: true },
];

for (const { h, name, expectDark } of keyHours) {
  const colors = generateColorPalette(h);
  const bgLum = getLuminance(hexToRgb(colors[3]));
  const isDark = bgLum < 120;
  const match = isDark === expectDark;

  if (!match) allPass = false;

  console.log(\`\${match ? '✓' : '✗'} \${name}(\${h}点): 背景亮度=\${bgLum.toFixed(0)}，实际\${isDark ? '深色' : '亮色'}，预期\${expectDark ? '深色' : '亮色'}\`);

  const primaryContrast = getContrastRatio(colors[0], colors[3]);
  const textContrast = getContrastRatio(colors[4], colors[3]);

  if (primaryContrast < 3) {
    console.log(\`  ✗ 主色对比度不足: \${primaryContrast.toFixed(2)} < 3\`);
    allPass = false;
  }
  if (textContrast < 4.5) {
    console.log(\`  ✗ 文字对比度不足: \${textContrast.toFixed(2)} < 4.5\`);
    allPass = false;
  }
}

console.log('\n' + (allPass ? '✓✓✓ 全部校验通过！' : '✗✗✗ 存在问题需要修复') + '\n');

process.exit(allPass ? 0 : 1);
`;

const scriptPath = join(__dirname, 'validate-colors-runner.mjs');
writeFileSync(scriptPath, colorEngineSource, 'utf-8');

const { default: run } = await import(scriptPath);

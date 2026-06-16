export interface ColorScheme {
  id: string;
  name: string;
  color1: string;
  color2: string;
  mixed: string[];
}

export function formatCssVariables(scheme: ColorScheme): string {
  const allColors = [scheme.color1, ...scheme.mixed, scheme.color2];
  const lines = allColors.map((c, i) => `  --color-${i + 1}: ${c};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

export function formatGradientBlock(scheme: ColorScheme): string {
  const allColors = [scheme.color1, ...scheme.mixed, scheme.color2];
  return `background: linear-gradient(90deg, ${allColors.join(', ')});`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function exportToCSS(colors: string[]): string {
  const labels = ['primary', 'secondary', 'accent', 'background', 'text'];
  return colors
    .map((color, index) => `--color-${labels[index]}: ${color};`)
    .join('\n');
}

export function exportToJSON(colors: string[]): string {
  const labels = ['primary', 'secondary', 'accent', 'background', 'text'];
  const obj: Record<string, string> = {};
  colors.forEach((color, index) => {
    obj[labels[index]] = color;
  });
  return JSON.stringify(obj, null, 2);
}

export const getTemperatureColor = (temp: number): string => {
  if (temp < 160) {
    return '#9ccc65';
  } else if (temp >= 160 && temp <= 190) {
    const ratio = (temp - 160) / 30;
    return interpolateColor('#9ccc65', '#fdd835', ratio);
  } else {
    const ratio = Math.min((temp - 190) / 60, 1);
    return interpolateColor('#fdd835', '#ef5350', ratio);
  }
};

const interpolateColor = (color1: string, color2: string, ratio: number): string => {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

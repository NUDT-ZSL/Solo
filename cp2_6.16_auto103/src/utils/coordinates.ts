export function raDecToPixel(
  ra: number,
  dec: number,
  centerRa: number,
  centerDec: number,
  fieldSize: number,
  width: number,
  height: number
): { x: number; y: number } {
  const pixelScaleX = width / fieldSize;
  const pixelScaleY = height / fieldSize;

  const deltaRa = ra - centerRa;
  const deltaDec = dec - centerDec;

  const x = width / 2 + deltaRa * pixelScaleX * Math.cos((centerDec * Math.PI) / 180);
  const y = height / 2 - deltaDec * pixelScaleY;

  return { x, y };
}

export function hmsToDegrees(hms: string): number {
  const parts = hms.split(':').map(Number);
  const [hours, minutes, seconds] = parts;
  return (hours + minutes / 60 + seconds / 3600) * 15;
}

export function degreesToHMS(degrees: number): string {
  let d = degrees / 15;
  const hours = Math.floor(d);
  d = (d - hours) * 60;
  const minutes = Math.floor(d);
  const seconds = (d - minutes) * 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}

export function dmsToDegrees(dms: string): number {
  const parts = dms.split(':').map(Number);
  const [degrees, minutes, seconds] = parts;
  const sign = degrees < 0 ? -1 : 1;
  return sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
}

export function degreesToDMS(degrees: number): string {
  const sign = degrees < 0 ? '-' : '+';
  let d = Math.abs(degrees);
  const deg = Math.floor(d);
  d = (d - deg) * 60;
  const minutes = Math.floor(d);
  const seconds = (d - minutes) * 60;
  return `${sign}${deg.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}

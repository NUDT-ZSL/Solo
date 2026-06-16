export function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function daysUntilNextCare(lastTimeIso: string, intervalDays: number): number {
  const last = new Date(lastTimeIso);
  const next = new Date(last.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((next.getTime() - now.getTime()) / msPerDay);
}

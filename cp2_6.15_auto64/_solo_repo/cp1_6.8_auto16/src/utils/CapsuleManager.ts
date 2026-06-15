export interface Capsule {
  id: string;
  content: string;
  createdAt: number;
  unlockAt: number;
  gradientColor: string;
}

const STORAGE_KEY = "memory_inn_capsules";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

export function generateGradient(): string {
  const palettes = [
    ["#FF6B6B", "#FFD93D", "#6BCB77"],
    ["#4ECDC4", "#44CF6C", "#F7DC6F"],
    ["#A18CD1", "#FBC2EB", "#F6D5F7"],
    ["#FF9A9E", "#FECFEF", "#FDD6D0"],
    ["#667EEA", "#764BA2", "#F093FB"],
    ["#F093FB", "#F5576C", "#FFD93D"],
    ["#4FACFE", "#00F2FE", "#43E97B"],
    ["#FA709A", "#FEE140", "#FA709A"],
    ["#A8E6CF", "#DCEDC1", "#FFD3B6"],
    ["#FF9A9E", "#FECFEF", "#A1C4FD"],
    ["#FDDB92", "#D1FDFF", "#FDDB92"],
    ["#F6D365", "#FDA085", "#F6D365"],
    ["#84FAB0", "#8FD3F4", "#84FAB0"],
    ["#C471F5", "#FA71CD", "#C471F5"],
    ["#F8B500", "#FF6F61", "#F8B500"],
    ["#5EE7DF", "#B490CA", "#5EE7DF"],
    ["#E8CBA7", "#D4915E", "#E8CBA7"],
    ["#F5E6D3", "#8B6F47", "#F5E6D3"],
  ];
  const palette = palettes[Math.floor(Math.random() * palettes.length)];
  const angle = Math.floor(Math.random() * 360);
  return `linear-gradient(${angle}deg, ${palette[0]}, ${palette[1]}, ${palette[2]})`;
}

export function createCapsule(content: string, daysOffset: number): Capsule {
  const now = Date.now();
  const capsule: Capsule = {
    id: generateId(),
    content,
    createdAt: now,
    unlockAt: now + daysOffset * 24 * 60 * 60 * 1000,
    gradientColor: generateGradient(),
  };
  const capsules = getAllCapsules();
  capsules.push(capsule);
  saveCapsules(capsules);
  return capsule;
}

export function getAllCapsules(): Capsule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Capsule[];
  } catch {
    return [];
  }
}

export function isExpired(capsule: Capsule): boolean {
  return Date.now() >= capsule.unlockAt;
}

export function getRemainingTime(capsule: Capsule): string {
  const diff = capsule.unlockAt - Date.now();
  if (diff <= 0) return "已到期";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}天${hours}小时`;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function saveCapsules(capsules: Capsule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));
}

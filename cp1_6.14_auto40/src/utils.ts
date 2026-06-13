const CRC32_TABLE: number[] = [];

(function initCrc32Table() {
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    CRC32_TABLE[i] = crc >>> 0;
  }
})();

export function crc32(str: string): number {
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i) & 0xff;
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ char) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function generateColorFromName(name: string): string {
  const hash = crc32(name);
  const hue = hash % 360;
  const saturation = 65 + (hash % 20);
  const lightness = 45 + (hash % 15);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function selectRandomParticipant<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const start = performance.now();
  const randomIndex = Math.floor(Math.random() * arr.length);
  const result = arr[randomIndex];
  const duration = performance.now() - start;
  console.debug(`[Perf] 随机选择参与者耗时: ${duration.toFixed(2)}ms`);
  return result;
}

export function filterEligibleParticipants<T extends { hasWon: boolean }>(
  arr: T[],
  department?: string
): T[] {
  const start = performance.now();
  let result: T[];
  
  if (department && department !== 'all') {
    result = arr.filter((p: any) => !p.hasWon && p.department === department);
  } else {
    result = arr.filter(p => !p.hasWon);
  }
  
  const duration = performance.now() - start;
  console.debug(`[Perf] 过滤参与者耗时: ${duration.toFixed(2)}ms, 人数: ${result.length}, 时间复杂度: O(n)`);
  
  if (duration > 30) {
    console.warn(`[Perf] 过滤操作耗时超过30ms，请检查参与者数据量是否过大`);
  }
  
  return result;
}

export function measurePerformance<T>(label: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  console.debug(`[Perf] ${label} 耗时: ${duration.toFixed(2)}ms`);
  
  if (duration > 50) {
    console.warn(`[Perf] ${label} 超过50ms阈值! 实际: ${duration.toFixed(2)}ms`);
  }
  
  return result;
}

const departments = ['研发', '市场', '运营', '设计', '行政'];

export interface Participant {
  id: string;
  name: string;
  department: string;
  hasWon: boolean;
  winHistory: { prize: string; time: string }[];
}

export function generateMockParticipants(count: number): Participant[] {
  const start = performance.now();
  const participants: Participant[] = [];
  
  for (let i = 1; i <= count; i++) {
    participants.push({
      id: `emp-${i}`,
      name: `员工${String(i).padStart(3, '0')}`,
      department: departments[randomInt(0, departments.length - 1)],
      hasWon: false,
      winHistory: []
    });
  }
  
  const duration = performance.now() - start;
  console.debug(`[Perf] 生成${count}条模拟数据耗时: ${duration.toFixed(2)}ms`);
  
  return participants;
}

export interface Prize {
  id: string;
  name: string;
  count: number;
  color: string;
  emoji: string;
}

export const DEFAULT_PRIZES: Prize[] = [
  { id: 'p1', name: '一等奖', count: 1, color: '#ff6b6b', emoji: '🏆' },
  { id: 'p2', name: '二等奖', count: 2, color: '#feca57', emoji: '🥇' },
  { id: 'p3', name: '三等奖', count: 3, color: '#48dbfb', emoji: '🥈' },
  { id: 'p4', name: '幸运奖', count: 5, color: '#0abde3', emoji: '🥉' },
  { id: 'p5', name: '参与奖', count: 10, color: '#a29bfe', emoji: '🎀' }
];

export interface WinRecord {
  id: string;
  participantName: string;
  prizeName: string;
  prizeColor: string;
  prizeEmoji: string;
  time: string;
}

export function playWinSound(): void {
  try {
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.warn('Web Audio API 不支持');
      return;
    }
    
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = 440;
    oscillator.type = 'sine';
    
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.8, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    oscillator.start(now);
    oscillator.stop(now + 0.2);
    
    setTimeout(() => {
      audioCtx.close();
    }, 300);
  } catch (e) {
    console.error('播放音效失败:', e);
  }
}

export interface FrameMetrics {
  fps: number;
  frameTime: number;
}

export class FrameRateMonitor {
  private frames = 0;
  private lastTime = performance.now();
  private fps = 60;
  private frameTime = 16.67;
  private onReport?: (metrics: FrameMetrics) => void;
  private enabled = false;
  
  constructor(onReport?: (metrics: FrameMetrics) => void) {
    this.onReport = onReport;
  }
  
  start(): void {
    this.enabled = true;
    this.frames = 0;
    this.lastTime = performance.now();
  }
  
  stop(): void {
    this.enabled = false;
  }
  
  tick(): void {
    if (!this.enabled) return;
    
    this.frames++;
    const now = performance.now();
    const delta = now - this.lastTime;
    
    if (delta >= 1000) {
      this.fps = Math.round((this.frames * 1000) / delta);
      this.frameTime = delta / this.frames;
      this.frames = 0;
      this.lastTime = now;
      
      if (this.onReport) {
        this.onReport({ fps: this.fps, frameTime: this.frameTime });
      }
      
      if (this.fps < 55) {
        console.warn(`[Perf] 帧率低于55fps! 当前: ${this.fps}fps, 每帧: ${this.frameTime.toFixed(2)}ms`);
      }
    }
  }
  
  getFps(): number {
    return this.fps;
  }
}

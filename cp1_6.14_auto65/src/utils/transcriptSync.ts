interface Segment {
  startTime: number;
  endTime: number;
  text: string;
  sentiment: number;
}

export function findCurrentSegmentIndex(segments: Segment[], currentTime: number): number {
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (currentTime >= seg.startTime && currentTime <= seg.endTime) {
      return i;
    }
  }
  return -1;
}

export function scrollToSegment(containerRef: React.RefObject<HTMLElement | null>, segmentIndex: number): void {
  const container = containerRef.current;
  if (!container) return;
  const segmentEl = container.children[segmentIndex] as HTMLElement | undefined;
  if (segmentEl) {
    segmentEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getSelectedText(): string {
  return window.getSelection()?.toString().trim() ?? '';
}

export function getSegmentSentimentColor(sentiment: number): string {
  if (sentiment < -0.5) return '#f87171';
  if (sentiment < 0) return '#fbbf24';
  if (sentiment < 0.5) return '#a78bfa';
  return '#34d399';
}

export interface FloatState {
  delay: number;
  duration: number;
  offsetY: number;
}

export function createFloatState(): FloatState {
  return {
    delay: Math.random() * 2,
    duration: 2.8 + Math.random() * 1.4,
    offsetY: -(4 + Math.random() * 8),
  };
}

export function buildFloatStyle(state: FloatState): React.CSSProperties {
  return {
    animation: `float ${state.duration}s ease-in-out ${state.delay}s infinite`,
    willChange: 'transform',
  };
}

export function spawnHuiganParticle(
  containerEl: HTMLElement,
  targetEl: HTMLElement,
  onDone: () => void,
): void {
  const containerRect = containerEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  const startX = targetRect.left + targetRect.width / 2 - containerRect.left;
  const startY = targetRect.top + targetRect.height / 2 - containerRect.top;

  const particle = document.createElement('div');
  particle.className = 'huigan-particle';
  particle.style.left = `${startX}px`;
  particle.style.top = `${startY}px`;
  containerEl.appendChild(particle);

  particle.addEventListener('animationend', () => {
    particle.remove();
    onDone();
  });
}

export function staggerDelay(index: number, baseMs: number = 60): number {
  return index * baseMs;
}

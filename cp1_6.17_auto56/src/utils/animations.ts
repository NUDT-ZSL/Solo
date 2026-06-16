export const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const easeOutQuad = (t: number): number => {
  return 1 - (1 - t) * (1 - t);
};

export const easeInQuad = (t: number): number => {
  return t * t;
};

export const fadeIn = (element: HTMLElement, duration: number = 300): Promise<void> => {
  return new Promise((resolve) => {
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      setTimeout(resolve, duration);
    });
  });
};

export const fadeOut = (element: HTMLElement, duration: number = 300): Promise<void> => {
  return new Promise((resolve) => {
    element.style.opacity = '1';
    element.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => {
      element.style.opacity = '0';
      setTimeout(resolve, duration);
    });
  });
};

interface AnimationOptions {
  duration: number;
  easing?: (t: number) => number;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
}

export const animate = (options: AnimationOptions): () => void => {
  const { duration, easing = easeInOutQuad, onUpdate, onComplete } = options;
  let startTime: number | null = null;
  let animationId: number | null = null;
  let cancelled = false;

  const step = (timestamp: number) => {
    if (cancelled) return;
    
    if (startTime === null) {
      startTime = timestamp;
    }

    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);

    onUpdate(easedProgress);

    if (progress < 1) {
      animationId = requestAnimationFrame(step);
    } else {
      onComplete?.();
    }
  };

  animationId = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
  };
};

export const lerp = (start: number, end: number, progress: number): number => {
  return start + (end - start) * progress;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

import { useEffect } from 'react';

export function useRipple() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.ripple-button') as HTMLElement | null;
      
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.className = 'ripple';
      
      const existingRipples = button.querySelectorAll('.ripple');
      existingRipples.forEach(r => r.remove());
      
      button.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);
}

export default useRipple;

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/utils/api';

export const useLayoutPolling = (intervalMs: number = 5000) => {
  const lastUpdatedRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const setLayout = useStore((state) => state.setLayout);
  const layout = useStore((state) => state.layout);

  useEffect(() => {
    isMountedRef.current = true;

    const pollLayout = async () => {
      if (!isMountedRef.current) return;

      try {
        const newLayout = await api.getLayout();

        if (
          newLayout.updatedAt &&
          lastUpdatedRef.current !== newLayout.updatedAt
        ) {
          if (layout && layout.updatedAt !== newLayout.updatedAt) {
            setLayout(newLayout);
          }
          lastUpdatedRef.current = newLayout.updatedAt;
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    const intervalId = setInterval(pollLayout, intervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [intervalMs, setLayout, layout]);
};

export const useResponsive = () => {
  const setIsMobile = useStore((state) => state.setIsMobile);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [setIsMobile]);
};

export const useKeyboardShortcuts = () => {
  const setSelectedTool = useStore((state) => state.setSelectedTool);
  const selectedTool = useStore((state) => state.selectedTool);
  const selectedElementId = useStore((state) => state.selectedElementId);
  const removeElement = useStore((state) => state.removeElement);
  const saveLayout = useStore((state) => state.saveLayout);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setSelectedTool('select');
          break;
        case 'w':
          setSelectedTool('wall');
          break;
        case 's':
          setSelectedTool('stand');
          break;
        case 'd':
          setSelectedTool('delete');
          break;
        case 'delete':
        case 'backspace':
          if (selectedElementId && selectedTool === 'select') {
            removeElement(selectedElementId);
            saveLayout();
          }
          break;
        case 'escape':
          setSelectedTool('select');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedTool, selectedElementId, selectedTool, removeElement, saveLayout]);
};

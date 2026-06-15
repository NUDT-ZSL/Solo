import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LayoutElement, BackgroundConfig, ElementType } from '../types';
import { ELEMENT_PRESETS } from '../utils/constants';

interface UseLayoutStateReturn {
  elements: LayoutElement[];
  selectedId: string | null;
  background: BackgroundConfig;
  canUndo: boolean;
  canRedo: boolean;
  lastAction: string;
  addElement: (type: ElementType, x: number, y: number) => void;
  updateElement: (id: string, updates: Partial<LayoutElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  updateBackground: (bg: Partial<BackgroundConfig>) => void;
  undo: () => void;
  redo: () => void;
  setLastAction: (action: string) => void;
}

const initialBackground: BackgroundConfig = {
  type: 'solid',
  color: '#ffffff',
};

export function useLayoutState(): UseLayoutStateReturn {
  const [elements, setElements] = useState<LayoutElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [background, setBackground] = useState<BackgroundConfig>(initialBackground);
  const [past, setPast] = useState<LayoutElement[][]>([]);
  const [future, setFuture] = useState<LayoutElement[][]>([]);
  const [lastAction, setLastAction] = useState<string>('');

  const pushHistory = useCallback((newElements: LayoutElement[], action: string) => {
    setPast((prev) => [...prev, elements]);
    setFuture([]);
    setElements(newElements);
    setLastAction(action);
  }, [elements]);

  const addElement = useCallback((type: ElementType, x: number, y: number) => {
    const preset = ELEMENT_PRESETS[type];
    const newElement: LayoutElement = {
      id: uuidv4(),
      type,
      x,
      y,
      rotation: 0,
      opacity: 1,
      ...preset,
    } as LayoutElement;

    pushHistory([...elements, newElement], `添加了${type === 'text' ? '文本' : type === 'image' ? '图片' : type === 'line' ? '装饰线' : '形状'}元素`);
    setSelectedId(newElement.id);
  }, [elements, pushHistory]);

  const updateElement = useCallback((id: string, updates: Partial<LayoutElement>) => {
    const newElements = elements.map((el) =>
      el.id === id ? { ...el, ...updates } : el
    );
    pushHistory(newElements, `更新了元素属性`);
  }, [elements, pushHistory]);

  const deleteElement = useCallback((id: string) => {
    const element = elements.find((el) => el.id === id);
    const newElements = elements.filter((el) => el.id !== id);
    pushHistory(newElements, `删除了${element?.type === 'text' ? '文本' : element?.type === 'image' ? '图片' : element?.type === 'line' ? '装饰线' : '形状'}元素`);
    if (selectedId === id) {
      setSelectedId(null);
    }
  }, [elements, selectedId, pushHistory]);

  const selectElement = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const updateBackground = useCallback((bg: Partial<BackgroundConfig>) => {
    setBackground((prev) => ({ ...prev, ...bg }));
    setLastAction('更新了背景设置');
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture((prev) => [elements, ...prev]);
    setElements(previous);
    setLastAction('撤销操作');
  }, [past, elements]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast((prev) => [...prev, elements]);
    setFuture(newFuture);
    setElements(next);
    setLastAction('重做操作');
  }, [future, elements]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if ((e.key === 'z' && e.shiftKey) || (e.key === 'y' && !e.shiftKey)) {
          e.preventDefault();
          redo();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedId) {
            e.preventDefault();
            deleteElement(selectedId);
          }
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          deleteElement(selectedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedId, deleteElement]);

  return {
    elements,
    selectedId,
    background,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    lastAction,
    addElement,
    updateElement,
    deleteElement,
    selectElement,
    updateBackground,
    undo,
    redo,
    setLastAction,
  };
}

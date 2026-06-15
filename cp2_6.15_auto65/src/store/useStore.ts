import { create } from 'zustand';

export interface Template {
  id: number;
  name: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: number;
  textIndent: string;
  titleFontFamily: string;
  titleFontSize: string;
  titleAlign: string;
  pageBreak: boolean;
  header?: string;
  footer?: string;
  paragraphSpacing?: number;
  pageMargin?: string;
}

interface StoreState {
  text: string;
  formattedText: string;
  selectedTemplate: Template | null;
  templates: Template[];
  exportProgress: number;
  isExporting: boolean;
  paragraphSpacing: number;
  customFontSize: number;
  pageMargin: string;
  setText: (text: string) => void;
  setFormattedText: (text: string) => void;
  setSelectedTemplate: (template: Template) => void;
  setTemplates: (templates: Template[]) => void;
  setExportProgress: (progress: number | ((prev: number) => number)) => void;
  setIsExporting: (isExporting: boolean) => void;
  setParagraphSpacing: (spacing: number) => void;
  setCustomFontSize: (size: number) => void;
  setPageMargin: (margin: string) => void;
  resetToTemplate: (template: Template) => void;
}

export const useStore = create<StoreState>((set) => ({
  text: '',
  formattedText: '',
  selectedTemplate: null,
  templates: [],
  exportProgress: 0,
  isExporting: false,
  paragraphSpacing: 1,
  customFontSize: 14,
  pageMargin: '2cm',
  setText: (text) => set({ text }),
  setFormattedText: (formattedText) => set({ formattedText }),
  setSelectedTemplate: (selectedTemplate) =>
    set({
      selectedTemplate,
      paragraphSpacing: selectedTemplate.paragraphSpacing || 1,
      customFontSize: parseInt(selectedTemplate.fontSize) || 14,
      pageMargin: selectedTemplate.pageMargin || '2cm',
    }),
  setTemplates: (templates) => set({ templates }),
  setExportProgress: (exportProgress) =>
    set((state) => ({
      exportProgress:
        typeof exportProgress === 'function'
          ? exportProgress(state.exportProgress)
          : exportProgress,
    })),
  setIsExporting: (isExporting) => set({ isExporting }),
  setParagraphSpacing: (paragraphSpacing) => set({ paragraphSpacing }),
  setCustomFontSize: (customFontSize) => set({ customFontSize }),
  setPageMargin: (pageMargin) => set({ pageMargin }),
  resetToTemplate: (template) =>
    set({
      selectedTemplate: template,
      paragraphSpacing: template.paragraphSpacing || 1,
      customFontSize: parseInt(template.fontSize) || 14,
      pageMargin: template.pageMargin || '2cm',
    }),
}));

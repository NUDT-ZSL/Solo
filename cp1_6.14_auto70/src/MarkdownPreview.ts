import { EditorCore } from './EditorCore';
import { marked } from 'marked';

interface AnchorMapping {
  editorLine: number;
  editorPos: number;
  previewOffset: number;
  headingText: string;
}

const PREVIEW_STYLES = `
  .markdown-preview-content {
    color: #24292e;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  }
  .markdown-preview-content h1,
  .markdown-preview-content h2,
  .markdown-preview-content h3,
  .markdown-preview-content h4,
  .markdown-preview-content h5,
  .markdown-preview-content h6 {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
    color: #1f2328;
  }
  .markdown-preview-content h1 {
    font-size: 2em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #d0d7deb3;
  }
  .markdown-preview-content h2 {
    font-size: 1.5em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #d0d7deb3;
  }
  .markdown-preview-content h3 { font-size: 1.25em; }
  .markdown-preview-content h4 { font-size: 1em; }
  .markdown-preview-content p { margin-top: 0; margin-bottom: 16px; }
  .markdown-preview-content ul,
  .markdown-preview-content ol { margin-top: 0; margin-bottom: 16px; padding-left: 2em; }
  .markdown-preview-content li { margin-bottom: 4px; }
  .markdown-preview-content li > p { margin-top: 16px; margin-bottom: 16px; }
  .markdown-preview-content blockquote {
    margin: 0 0 16px 0;
    padding: 0 1em;
    color: #656d76;
    border-left: 0.25em solid #d0d7de;
  }
  .markdown-preview-content pre {
    background-color: #f6f8fa;
    border-radius: 6px;
    padding: 16px;
    overflow-x: auto;
    margin-bottom: 16px;
    font-size: 85%;
    line-height: 1.45;
  }
  .markdown-preview-content code {
    background-color: rgba(175, 184, 193, 0.2);
    border-radius: 6px;
    padding: 0.2em 0.4em;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 85%;
  }
  .markdown-preview-content pre code { background-color: transparent; padding: 0; font-size: 100%; }
  .markdown-preview-content table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 16px;
    display: block;
    overflow-x: auto;
  }
  .markdown-preview-content table,
  .markdown-preview-content th,
  .markdown-preview-content td { border: 1px solid #ddd; }
  .markdown-preview-content th,
  .markdown-preview-content td { padding: 8px 12px; text-align: left; }
  .markdown-preview-content th { background-color: #f6f8fa; font-weight: 600; }
  .markdown-preview-content tr:nth-child(even) { background-color: #fafafa; }
  .markdown-preview-content tr:nth-child(odd) { background-color: #ffffff; }
  .markdown-preview-content a { color: #0969da; text-decoration: none; }
  .markdown-preview-content a:hover { text-decoration: underline; }
  .markdown-preview-content img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 16px 0;
    border-radius: 4px;
  }
  .markdown-preview-content hr {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: #d0d7de;
    border: 0;
  }
  .markdown-preview-content strong { font-weight: 600; }
  .markdown-preview-content em { font-style: italic; }
  .markdown-preview-content del { text-decoration: line-through; color: #656d76; }
`;

export enum ScrollSyncMode {
  PROPORTIONAL = 'proportional',
  ANCHOR = 'anchor'
}

export class MarkdownPreview {
  private editorCore: EditorCore;
  private container: HTMLElement;
  private previewContainer: HTMLElement;
  private content: string = '';
  private unsubContentChange: (() => void) | null = null;
  private unsubScroll: (() => void) | null = null;
  private isUpdatingScroll = false;
  private scrollSyncEnabled = true;
  private scrollSyncMode: ScrollSyncMode = ScrollSyncMode.ANCHOR;
  private rafPending = false;
  private anchorMappings: AnchorMapping[] = [];
  private lastAnchorBuildContent: string = '';

  constructor(editorCore: EditorCore, container: HTMLElement) {
    this.editorCore = editorCore;
    this.container = container;
    this.previewContainer = document.createElement('div');
  }

  init(): void {
    this.previewContainer.style.cssText = `
      height: 100%;
      width: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 20px;
      background-color: #f5f5f5;
      box-sizing: border-box;
    `;
    this.previewContainer.className = 'markdown-preview';

    this.container.appendChild(this.previewContainer);

    this.content = this.editorCore.getContent();
    this.render();

    this.unsubContentChange = this.editorCore.onContentChange((content) => {
      this.content = content;
      this.scheduleRender();
    });

    this.unsubScroll = this.editorCore.onScroll((scrollTop, _scrollLeft) => {
      this.handleEditorScroll(scrollTop);
    });

    this.previewContainer.addEventListener('scroll', this.handlePreviewScroll, { passive: true });
  }

  destroy(): void {
    if (this.unsubContentChange) {
      this.unsubContentChange();
      this.unsubContentChange = null;
    }

    if (this.unsubScroll) {
      this.unsubScroll();
      this.unsubScroll = null;
    }

    this.previewContainer.removeEventListener('scroll', this.handlePreviewScroll);

    if (this.previewContainer.parentNode) {
      this.previewContainer.parentNode.removeChild(this.previewContainer);
    }
  }

  private scheduleRender(): void {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.render();
    });
  }

  private buildAnchorMappings(): void {
    if (this.content === this.lastAnchorBuildContent && this.anchorMappings.length > 0) {
      return;
    }
    this.lastAnchorBuildContent = this.content;

    const mappings: AnchorMapping[] = [];
    const lines = this.content.split('\n');
    let pos = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        mappings.push({
          editorLine: i,
          editorPos: pos,
          previewOffset: -1,
          headingText: headingMatch[2].trim()
        });
      }
      pos += line.length + 1;
    }

    this.anchorMappings = mappings;
  }

  private resolvePreviewAnchors(): void {
    this.buildAnchorMappings();

    const contentEl = this.previewContainer.querySelector('.markdown-preview-content');
    if (!contentEl) return;

    const headingEls = contentEl.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let headingIdx = 0;

    headingEls.forEach((el) => {
      if (headingIdx >= this.anchorMappings.length) return;
      const mapping = this.anchorMappings[headingIdx];
      const elText = el.textContent?.trim() || '';
      if (elText === mapping.headingText || headingIdx < this.anchorMappings.length) {
        mapping.previewOffset = (el as HTMLElement).offsetTop;
        headingIdx++;
      }
    });

    for (let i = headingIdx; i < this.anchorMappings.length; i++) {
      this.anchorMappings[i].previewOffset = -1;
    }
  }

  private render(): void {
    try {
      const html = marked.parse(this.content, {
        breaks: true,
        gfm: true
      }) as string;

      const scrollTop = this.previewContainer.scrollTop;
      const maxScroll = this.previewContainer.scrollHeight - this.previewContainer.clientHeight;
      const scrollRatio = maxScroll > 0 ? scrollTop / maxScroll : 0;

      this.previewContainer.innerHTML = `
        <style>${PREVIEW_STYLES}</style>
        <div class="markdown-preview-content">${html}</div>
      `;

      this.resolvePreviewAnchors();

      const newMaxScroll = this.previewContainer.scrollHeight - this.previewContainer.clientHeight;
      if (newMaxScroll > 0) {
        this.previewContainer.scrollTop = scrollRatio * newMaxScroll;
      }
    } catch (e) {
      console.error('[MarkdownPreview] 渲染失败:', e);
    }
  }

  private handleEditorScroll = (editorScrollTop: number): void => {
    if (!this.scrollSyncEnabled || this.isUpdatingScroll) return;

    const editorScroll = this.editorCore.getScrollContainer();
    if (!editorScroll) return;

    this.isUpdatingScroll = true;

    if (this.scrollSyncMode === ScrollSyncMode.ANCHOR && this.anchorMappings.length >= 2) {
      this.syncByAnchor(editorScrollTop);
    } else {
      this.syncByProportion(editorScrollTop);
    }

    requestAnimationFrame(() => {
      this.isUpdatingScroll = false;
    });
  };

  private syncByAnchor(editorScrollTop: number): void {
    const editorScroll = this.editorCore.getScrollContainer();
    if (!editorScroll) return;

    const editorVisibleTop = editorScrollTop;
    const editorVisibleCenter = editorVisibleTop + editorScroll.clientHeight / 2;

    let beforeAnchor: AnchorMapping | null = null;
    let afterAnchor: AnchorMapping | null = null;

    for (const mapping of this.anchorMappings) {
      if (mapping.previewOffset < 0) continue;

      const editorLineTop = this.editorCore.coordsAtPos(mapping.editorPos);
      if (!editorLineTop) continue;

      const lineTopInScroll = editorLineTop.top;

      if (lineTopInScroll <= editorVisibleCenter) {
        beforeAnchor = mapping;
      } else {
        afterAnchor = mapping;
        break;
      }
    }

    if (beforeAnchor && afterAnchor) {
      const beforeEditorY = beforeAnchor.editorPos;
      const afterEditorY = afterAnchor.editorPos;
      const beforePreviewY = beforeAnchor.previewOffset;
      const afterPreviewY = afterAnchor.previewOffset;

      const beforeCoords = this.editorCore.coordsAtPos(beforeEditorY);
      const afterCoords = this.editorCore.coordsAtPos(afterEditorY);

      if (beforeCoords && afterCoords) {
        const editorRange = afterCoords.top - beforeCoords.top;
        const previewRange = afterPreviewY - beforePreviewY;

        if (editorRange > 0 && previewRange > 0) {
          const ratio = (editorVisibleCenter - beforeCoords.top) / editorRange;
          const targetPreview = beforePreviewY + ratio * previewRange;
          this.previewContainer.scrollTop = targetPreview - this.previewContainer.clientHeight / 2;
          return;
        }
      }
    }

    if (beforeAnchor) {
      this.previewContainer.scrollTop = beforeAnchor.previewOffset;
      return;
    }

    this.syncByProportion(editorScrollTop);
  }

  private syncByProportion(editorScrollTop: number): void {
    const editorScroll = this.editorCore.getScrollContainer();
    if (!editorScroll) return;

    const editorMaxScroll = editorScroll.scrollHeight - editorScroll.clientHeight;
    const previewMaxScroll = this.previewContainer.scrollHeight - this.previewContainer.clientHeight;

    if (editorMaxScroll > 0 && previewMaxScroll > 0) {
      const ratio = editorScrollTop / editorMaxScroll;
      this.previewContainer.scrollTop = Math.min(ratio * previewMaxScroll, previewMaxScroll);
    }
  }

  private handlePreviewScroll = (): void => {
    if (!this.scrollSyncEnabled || this.isUpdatingScroll) return;

    const editorScroll = this.editorCore.getScrollContainer();
    if (!editorScroll) return;

    this.isUpdatingScroll = true;

    if (this.scrollSyncMode === ScrollSyncMode.ANCHOR && this.anchorMappings.length >= 2) {
      this.syncPreviewToEditor();
    } else {
      const editorMaxScroll = editorScroll.scrollHeight - editorScroll.clientHeight;
      const previewMaxScroll = this.previewContainer.scrollHeight - this.previewContainer.clientHeight;

      if (editorMaxScroll > 0 && previewMaxScroll > 0) {
        const ratio = this.previewContainer.scrollTop / previewMaxScroll;
        editorScroll.scrollTop = Math.min(ratio * editorMaxScroll, editorMaxScroll);
      }
    }

    requestAnimationFrame(() => {
      this.isUpdatingScroll = false;
    });
  };

  private syncPreviewToEditor(): void {
    const editorScroll = this.editorCore.getScrollContainer();
    if (!editorScroll) return;

    const previewCenter = this.previewContainer.scrollTop + this.previewContainer.clientHeight / 2;

    let beforeAnchor: AnchorMapping | null = null;
    let afterAnchor: AnchorMapping | null = null;

    for (const mapping of this.anchorMappings) {
      if (mapping.previewOffset < 0) continue;

      if (mapping.previewOffset <= previewCenter) {
        beforeAnchor = mapping;
      } else {
        afterAnchor = mapping;
        break;
      }
    }

    if (beforeAnchor && afterAnchor) {
      const beforeCoords = this.editorCore.coordsAtPos(beforeAnchor.editorPos);
      const afterCoords = this.editorCore.coordsAtPos(afterAnchor.editorPos);

      if (beforeCoords && afterCoords) {
        const editorRange = afterCoords.top - beforeCoords.top;
        const previewRange = afterAnchor.previewOffset - beforeAnchor.previewOffset;

        if (previewRange > 0 && editorRange > 0) {
          const ratio = (previewCenter - beforeAnchor.previewOffset) / previewRange;
          const targetEditor = beforeCoords.top + ratio * editorRange;
          editorScroll.scrollTop = targetEditor - editorScroll.clientHeight / 2;
          return;
        }
      }
    }

    if (beforeAnchor) {
      const coords = this.editorCore.coordsAtPos(beforeAnchor.editorPos);
      if (coords) {
        editorScroll.scrollTop = coords.top - editorScroll.clientHeight / 2;
      }
      return;
    }

    const editorMaxScroll = editorScroll.scrollHeight - editorScroll.clientHeight;
    const previewMaxScroll = this.previewContainer.scrollHeight - this.previewContainer.clientHeight;
    if (editorMaxScroll > 0 && previewMaxScroll > 0) {
      const ratio = this.previewContainer.scrollTop / previewMaxScroll;
      editorScroll.scrollTop = Math.min(ratio * editorMaxScroll, editorMaxScroll);
    }
  }

  setScrollSync(enabled: boolean): void {
    this.scrollSyncEnabled = enabled;
  }

  setScrollSyncMode(mode: ScrollSyncMode): void {
    this.scrollSyncMode = mode;
  }

  getScrollSync(): boolean {
    return this.scrollSyncEnabled;
  }

  getPreviewContainer(): HTMLElement {
    return this.previewContainer;
  }

  getContent(): string {
    return this.content;
  }
}

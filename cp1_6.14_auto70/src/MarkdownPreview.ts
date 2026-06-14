import { EditorCore } from './EditorCore';
import { marked } from 'marked';

export class MarkdownPreview {
  private editorCore: EditorCore;
  private container: HTMLElement;
  private previewContainer: HTMLElement;
  private content: string = '';
  private unsubContentChange: (() => void) | null = null;
  private unsubScroll: (() => void) | null = null;
  private isUpdatingScroll = false;
  private scrollSyncEnabled = true;
  private rafPending = false;

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
        <style>
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
          .markdown-preview-content h3 {
            font-size: 1.25em;
          }
          .markdown-preview-content h4 {
            font-size: 1em;
          }
          .markdown-preview-content p {
            margin-top: 0;
            margin-bottom: 16px;
          }
          .markdown-preview-content ul,
          .markdown-preview-content ol {
            margin-top: 0;
            margin-bottom: 16px;
            padding-left: 2em;
          }
          .markdown-preview-content li {
            margin-bottom: 4px;
          }
          .markdown-preview-content li > p {
            margin-top: 16px;
            margin-bottom: 16px;
          }
          .markdown-preview-content blockquote {
            margin: 0;
            margin-bottom: 16px;
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
            font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
            font-size: 85%;
          }
          .markdown-preview-content pre code {
            background-color: transparent;
            padding: 0;
            font-size: 100%;
          }
          .markdown-preview-content table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 16px;
            display: block;
            overflow-x: auto;
          }
          .markdown-preview-content table,
          .markdown-preview-content th,
          .markdown-preview-content td {
            border: 1px solid #ddd;
          }
          .markdown-preview-content th,
          .markdown-preview-content td {
            padding: 8px 12px;
            text-align: left;
          }
          .markdown-preview-content th {
            background-color: #f6f8fa;
            font-weight: 600;
          }
          .markdown-preview-content tr:nth-child(even) {
            background-color: #fafafa;
          }
          .markdown-preview-content tr:nth-child(odd) {
            background-color: #ffffff;
          }
          .markdown-preview-content a {
            color: #0969da;
            text-decoration: none;
          }
          .markdown-preview-content a:hover {
            text-decoration: underline;
          }
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
          .markdown-preview-content strong {
            font-weight: 600;
          }
          .markdown-preview-content em {
            font-style: italic;
          }
          .markdown-preview-content del {
            text-decoration: line-through;
            color: #656d76;
          }
          .markdown-preview-content input[type="checkbox"] {
            margin-right: 0.5em;
            vertical-align: middle;
          }
        </style>
        <div class="markdown-preview-content">${html}</div>
      `;

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

    const editorMaxScroll = editorScroll.scrollHeight - editorScroll.clientHeight;
    const previewMaxScroll = this.previewContainer.scrollHeight - this.previewContainer.clientHeight;

    if (editorMaxScroll > 0 && previewMaxScroll > 0) {
      const ratio = editorScrollTop / editorMaxScroll;
      this.previewContainer.scrollTop = Math.min(ratio * previewMaxScroll, previewMaxScroll);
    }

    requestAnimationFrame(() => {
      this.isUpdatingScroll = false;
    });
  };

  private handlePreviewScroll = (): void => {
    if (!this.scrollSyncEnabled || this.isUpdatingScroll) return;

    const editorScroll = this.editorCore.getScrollContainer();
    if (!editorScroll) return;

    this.isUpdatingScroll = true;

    const editorMaxScroll = editorScroll.scrollHeight - editorScroll.clientHeight;
    const previewMaxScroll = this.previewContainer.scrollHeight - this.previewContainer.clientHeight;

    if (editorMaxScroll > 0 && previewMaxScroll > 0) {
      const ratio = this.previewContainer.scrollTop / previewMaxScroll;
      editorScroll.scrollTop = Math.min(ratio * editorMaxScroll, editorMaxScroll);
    }

    requestAnimationFrame(() => {
      this.isUpdatingScroll = false;
    });
  };

  setScrollSync(enabled: boolean): void {
    this.scrollSyncEnabled = enabled;
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

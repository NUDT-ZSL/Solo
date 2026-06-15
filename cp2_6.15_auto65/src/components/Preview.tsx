import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';

export default function Preview() {
  const { formattedText, selectedTemplate, paragraphSpacing, customFontSize, pageMargin } =
    useStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFading, setIsFading] = useState(false);
  const prevTemplateIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;

    if (
      selectedTemplate &&
      prevTemplateIdRef.current !== selectedTemplate.id
    ) {
      setIsFading(true);
      setTimeout(() => {
        setIsFading(false);
      }, 400);
      prevTemplateIdRef.current = selectedTemplate.id;
    }

    const template = selectedTemplate;
    if (!template) return;

    const fontSize = `${customFontSize}px`;
    const pSpacing = `${paragraphSpacing}em`;

    const css = `
      @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: ${template.fontFamily};
        font-size: ${fontSize};
        line-height: ${template.lineHeight};
        padding: ${pageMargin};
        background: #fffef5;
        color: #1a1a1a;
        min-height: 100vh;
        transition: all 0.3s ease;
      }
      
      .chapter-title {
        font-family: ${template.titleFontFamily};
        font-size: ${template.titleFontSize};
        text-align: ${template.titleAlign};
        margin: 1.5em 0 1em 0;
        font-weight: bold;
        page-break-before: always;
        transition: all 0.3s ease;
        ${template.name === '现代畅销' ? 'text-decoration: underline; text-underline-offset: 8px;' : ''}
      }
      
      .paragraph {
        text-indent: ${template.textIndent};
        margin-bottom: ${pSpacing};
        text-align: justify;
        transition: all 0.3s ease;
      }
      
      .dialogue {
        color: #92400e;
        font-style: italic;
      }
      
      @page {
        margin: ${pageMargin};
      }
      
      @media print {
        .chapter-title {
          page-break-before: always;
        }
      }
    `;

    const headerHtml = template.header
      ? `<div style="position: fixed; top: 10px; left: 0; right: 0; text-align: center; font-size: 12px; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 5px;">${template.header}</div>`
      : '';

    const footerHtml = template.footer
      ? `<div style="position: fixed; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 5px;">${template.footer}</div>`
      : '';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>${css}</style>
        </head>
        <body>
          ${headerHtml}
          <div class="content" style="opacity: ${isFading ? '0' : '1'}; transition: opacity 0.4s ease;">
            ${formattedText || '<p style="text-indent: 2em; text-align: center; color: #999; margin-top: 50px;">请在左侧编辑器中粘贴小说文本...</p>'}
          </div>
          ${footerHtml}
        </body>
      </html>
    `);
    doc.close();
  }, [formattedText, selectedTemplate, paragraphSpacing, customFontSize, pageMargin, isFading]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-4 py-3 bg-amber-50 rounded-t-lg border-b border-amber-200">
        <h3 className="text-lg font-semibold text-amber-900">排版预览</h3>
      </div>
      <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden border border-amber-200">
        <div className="w-full h-full p-4 bg-gradient-to-br from-amber-50 to-orange-50">
          <div
            className="w-full h-full bg-white shadow-xl rounded overflow-hidden"
            style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}
          >
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

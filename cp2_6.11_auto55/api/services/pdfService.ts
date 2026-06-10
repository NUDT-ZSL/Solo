import puppeteer, { Browser } from 'puppeteer';
import type { Game } from '../types/index.js';

let browser: Browser | null = null;

const initBrowser = async (): Promise<Browser> => {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  return browser;
};

const getBrowser = async (): Promise<Browser> => {
  if (!browser) {
    return await initBrowser();
  }
  return browser;
};

const closeBrowser = async (): Promise<void> => {
  if (browser) {
    await browser.close();
    browser = null;
  }
};

const markdownToHtml = (markdown: string): string => {
  let html = markdown;

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');

  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    const ordered = /^\d+\./.test(match.replace(/<li>/g, '').trim());
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag}>${match}</${tag}>`;
  });

  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/^(.+)$/gm, (line) => {
    if (/^<(h1|h2|h3|ul|ol|li|p|\/)/.test(line.trim()) || line.trim() === '') {
      return line;
    }
    return `<p>${line}</p>`;
  });

  return `<div class="rules-content">${html}</div>`;
};

const buildHtmlTemplate = (game: Game): string => {
  const tagsHtml = game.tags.map((t) => `<span class="tag">${t}</span>`).join('');
  const rulesHtml = markdownToHtml(game.fullRules);

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <title>${game.name} - 规则书</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
          color: #1f2937;
          line-height: 1.8;
        }
        .page-break {
          page-break-after: always;
        }
        .cover {
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .cover h1 {
          font-size: 48px;
          margin-bottom: 20px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .cover .subtitle {
          font-size: 18px;
          opacity: 0.9;
          margin-bottom: 40px;
        }
        .cover img {
          width: 280px;
          height: 210px;
          border-radius: 16px;
          object-fit: cover;
          margin-bottom: 40px;
          box-shadow: 0 12px 24px rgba(0,0,0,0.2);
          background: white;
        }
        .cover .designer {
          font-size: 20px;
          margin-bottom: 20px;
        }
        .cover .tags {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 500px;
        }
        .cover .tag {
          background: rgba(255,255,255,0.2);
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 14px;
          backdrop-filter: blur(4px);
        }
        .cover .rating {
          margin-top: 30px;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cover .stars {
          color: #fcd34d;
          font-size: 24px;
        }
        .rules-page {
          padding: 60px 50px;
        }
        .rules-content h1 {
          font-size: 32px;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 3px solid #667eea;
          color: #1f2937;
        }
        .rules-content h2 {
          font-size: 24px;
          margin-top: 32px;
          margin-bottom: 16px;
          color: #374151;
        }
        .rules-content h3 {
          font-size: 18px;
          margin-top: 24px;
          margin-bottom: 12px;
          color: #4b5563;
        }
        .rules-content p {
          margin-bottom: 14px;
          font-size: 15px;
          color: #374151;
        }
        .rules-content ul, .rules-content ol {
          margin: 12px 0 16px 28px;
        }
        .rules-content li {
          margin-bottom: 8px;
          font-size: 15px;
          color: #374151;
        }
        .rules-content strong {
          color: #1f2937;
        }
        .footer {
          position: fixed;
          bottom: 30px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          padding-top: 12px;
          margin: 0 50px;
        }
        .footer .game-name {
          font-weight: bold;
          color: #6b7280;
        }
        .summary-box {
          background: #f9fafb;
          border-left: 4px solid #667eea;
          padding: 16px 20px;
          margin-bottom: 24px;
          border-radius: 0 8px 8px 0;
          font-size: 15px;
          color: #4b5563;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="cover">
        <h1>${game.name}</h1>
        <div class="subtitle">桌游规则书</div>
        <img src="${game.coverImage}" alt="${game.name}" />
        <div class="designer">设计者：${game.designer}</div>
        <div class="tags">${tagsHtml}</div>
        <div class="rating">
          <span class="stars">★</span>
          <span>${game.averageRating} 分（${game.ratingsCount} 人评价）</span>
        </div>
      </div>

      <div class="page-break"></div>

      <div class="rules-page">
        <div class="summary-box">${game.summary}</div>
        ${rulesHtml}
      </div>

      <div class="footer">
        <span class="game-name">${game.name}</span> · 桌游集市生成 · 第 <span class="pageNumber"></span> 页
      </div>

      <script>
        const pageNumbers = document.querySelectorAll('.pageNumber');
        let totalPages = 1;
        pageNumbers.forEach((el, i) => {
          el.textContent = i + 1;
          totalPages = i + 1;
        });
      </script>
    </body>
    </html>
  `;
};

export const generatePdf = async (game: Game): Promise<Buffer> => {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    const htmlContent = buildHtmlTemplate(game);

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
    });

    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
      displayHeaderFooter: false,
    });

    return pdfBuffer;
  } finally {
    await page.close();
  }
};

export { initBrowser, getBrowser, closeBrowser };

export default {
  generatePdf,
  initBrowser,
  getBrowser,
  closeBrowser,
};

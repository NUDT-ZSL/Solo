import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface Template {
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

interface TextStorage {
  id: string;
  content: string;
  templateId: number;
  createdAt: string;
}

interface ExportHistory {
  id: number;
  title: string;
  format: string;
  createdAt: string;
}

interface Database {
  templates: Template[];
  textStorage: TextStorage[];
  exportHistory: ExportHistory[];
}

const dbPath = path.join(__dirname, '../database.json');

function initDatabase(): Database {
  if (!fs.existsSync(dbPath)) {
    const defaultDb: Database = {
      templates: [
        {
          id: 1,
          name: '经典文学',
          fontFamily: 'SimSun, serif',
          fontSize: '14px',
          lineHeight: 1.8,
          textIndent: '2em',
          titleFontFamily: 'SimHei, sans-serif',
          titleFontSize: '24px',
          titleAlign: 'center',
          pageBreak: true,
          header: '书名 - 章节',
        },
        {
          id: 2,
          name: '现代畅销',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: '11pt',
          lineHeight: 1.5,
          textIndent: '1.5em',
          titleFontFamily: '"Noto Serif SC", serif',
          titleFontSize: '24pt',
          titleAlign: 'left',
          pageBreak: true,
          footer: '页码',
        },
      ],
      textStorage: [],
      exportHistory: [],
    };
    fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function readDb(): Database {
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDb(db: Database): void {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
}

let db: Database = initDatabase();

interface ExportRequest {
  content: string;
  template: Template;
  format: 'epub' | 'pdf';
  title: string;
}

function formatTextToHtml(content: string, template: Template): string {
  const chapterRegex = /\/\s*第[一二三四五六七八九十百千万\d]+章\s*\//g;
  const lines = content.split(/\r?\n/);
  let html = '';
  let inParagraph = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (inParagraph) {
        html += '</p>\n';
        inParagraph = false;
      }
      continue;
    }

    const chapterMatch = trimmedLine.match(chapterRegex);
    if (chapterMatch) {
      if (inParagraph) {
        html += '</p>\n';
        inParagraph = false;
      }
      const chapterTitle = trimmedLine.replace(/\/\s*|\s*\//g, '');
      html += `<h1 class="chapter">${chapterTitle}</h1>\n`;
      continue;
    }

    if (!inParagraph) {
      html += '<p>';
      inParagraph = true;
    }

    html += trimmedLine + ' ';
  }

  if (inParagraph) {
    html += '</p>';
  }

  return html;
}

function splitIntoChapters(content: string): { title: string; content: string }[] {
  const chapterRegex = /\/\s*第[一二三四五六七八九十百千万\d]+章\s*\//g;
  const chapters: { title: string; content: string }[] = [];

  const matches = [...content.matchAll(chapterRegex)];

  if (matches.length === 0) {
    chapters.push({ title: '正文', content });
    return chapters;
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const title = match[0].replace(/\/\s*|\s*\//g, '');
    const start = match.index! + match[0].length;
    const end = i < matches.length - 1 ? matches[i + 1].index! : content.length;
    const chapterContent = content.substring(start, end).trim();
    chapters.push({ title, content: chapterContent });
  }

  const beforeFirst = content.substring(0, matches[0].index!).trim();
  if (beforeFirst) {
    chapters.unshift({ title: '前言', content: beforeFirst });
  }

  return chapters;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function generateEpub(content: string, template: Template, title: string): Promise<Buffer> {
  const zip = new JSZip();
  const chapters = splitIntoChapters(content);

  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  zip.folder('META-INF')?.file('container.xml', containerXml);

  const mimeType = 'application/epub+zip';
  zip.file('mimetype', mimeType);

  const oebps = zip.folder('OEBPS');

  const styleCss = `
@charset "UTF-8";
body {
  font-family: ${template.fontFamily};
  font-size: ${template.fontSize};
  line-height: ${template.lineHeight};
  text-align: justify;
  margin: 0;
  padding: 0;
}
h1.chapter {
  font-family: ${template.titleFontFamily};
  font-size: ${template.titleFontSize};
  text-align: ${template.titleAlign};
  page-break-before: always;
  margin-top: 2em;
  margin-bottom: 1.5em;
  ${template.name === '现代畅销' ? 'text-decoration: underline;' : ''}
}
p {
  text-indent: ${template.textIndent};
  margin: 0 0 ${template.paragraphSpacing || 1}em 0;
}
`;

  oebps?.file('style.css', styleCss);

  let manifest = '';
  let spine = '';
  let navMap = '';

  chapters.forEach((chapter, index) => {
    const chapterId = `chapter${index + 1}`;
    const fileName = `${chapterId}.xhtml`;
    const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
  <title>${chapter.title}</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <h1 class="chapter">${chapter.title}</h1>
  ${formatTextToHtml(chapter.content, template)}
</body>
</html>`;

    oebps?.file(fileName, chapterHtml);
    manifest += `<item id="${chapterId}" href="${fileName}" media-type="application/xhtml+xml"/>`;
    spine += `<itemref idref="${chapterId}"/>`;
    navMap += `<navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
      <navLabel>
        <text>${chapter.title}</text>
      </navLabel>
      <content src="${fileName}"/>
    </navPoint>`;
  });

  const uuid = generateUUID();
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${title}</dc:title>
    <dc:creator opf:role="aut">Unknown</dc:creator>
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="BookId" opf:scheme="UUID">urn:uuid:${uuid}</dc:identifier>
  </metadata>
  <manifest>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifest}
  </manifest>
  <spine toc="ncx">
    ${spine}
  </spine>
</package>`;

  oebps?.file('content.opf', contentOpf);

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${title}</text>
  </docTitle>
  <navMap>
    ${navMap}
  </navMap>
</ncx>`;

  oebps?.file('toc.ncx', tocNcx);

  return zip.generateAsync({ type: 'nodebuffer' });
}

async function generatePdf(content: string, template: Template, title: string): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({
      size: 'A5',
      margin: parseFloat(template.pageMargin || '2') * 28.35,
      info: {
        Title: title,
        Author: '小说排版助手',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.font('Helvetica');

    const chapters = splitIntoChapters(content);

    chapters.forEach((chapter, index) => {
      if (index > 0) {
        doc.addPage();
      }

      doc.fontSize(parseFloat(template.titleFontSize) || 24);
      doc.text(chapter.title, {
        align: template.titleAlign as any,
        underline: template.name === '现代畅销',
      });

      doc.moveDown(2);

      doc.fontSize(parseFloat(template.fontSize) || 14);
      const lineHeight = template.lineHeight;
      const indent = template.textIndent === '2em' ? 28 : 21;

      const paragraphs = chapter.content.split(/\r?\n\r?\n/);
      paragraphs.forEach((para) => {
        const trimmedPara = para.trim();
        if (trimmedPara) {
          const lines = trimmedPara.split(/\r?\n/);
          const text = lines.map((l) => l.trim()).join(' ');
          doc.text(text, {
            indent,
            lineGap: (lineHeight - 1) * 12,
            paragraphGap: (template.paragraphSpacing || 1) * 12,
          });
        }
      });
    });

    doc.end();
  });
}

app.get('/api/templates', (_req: Request, res: Response) => {
  try {
    db = readDb();
    res.json(db.templates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

app.get('/api/templates/:id', (req: Request, res: Response) => {
  try {
    db = readDb();
    const template = db.templates.find((t) => t.id === parseInt(req.params.id));
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

app.post('/api/templates', (req: Request, res: Response) => {
  try {
    db = readDb();
    const t = req.body as Template;
    const newId = Math.max(...db.templates.map((tmpl) => tmpl.id), 0) + 1;
    const newTemplate = { ...t, id: newId };
    db.templates.push(newTemplate);
    writeDb(db);
    res.json(newTemplate);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

app.put('/api/templates/:id', (req: Request, res: Response) => {
  try {
    db = readDb();
    const t = req.body as Template;
    const index = db.templates.findIndex((tmpl) => tmpl.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }
    db.templates[index] = { ...t, id: parseInt(req.params.id) };
    writeDb(db);
    res.json(db.templates[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

app.delete('/api/templates/:id', (req: Request, res: Response) => {
  try {
    db = readDb();
    const index = db.templates.findIndex((t) => t.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }
    db.templates.splice(index, 1);
    writeDb(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

app.post('/api/text', (req: Request, res: Response) => {
  try {
    db = readDb();
    const { content, templateId } = req.body;
    const id = generateUUID();
    const storage: TextStorage = {
      id,
      content,
      templateId,
      createdAt: new Date().toISOString(),
    };
    db.textStorage.push(storage);
    if (db.textStorage.length > 100) {
      db.textStorage = db.textStorage.slice(-100);
    }
    writeDb(db);
    res.json({ id, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save text' });
  }
});

app.post('/api/export/epub', async (req: Request, res: Response) => {
  try {
    const { content, template, title } = req.body as ExportRequest;

    db = readDb();
    db.exportHistory.push({
      id: Math.max(...db.exportHistory.map((h) => h.id), 0) + 1,
      title,
      format: 'epub',
      createdAt: new Date().toISOString(),
    });
    writeDb(db);

    const epubBuffer = await generateEpub(content, template, title);

    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.epub"`);
    res.send(epubBuffer);
  } catch (err) {
    console.error('EPUB export error:', err);
    res.status(500).json({ error: 'Failed to export EPUB' });
  }
});

app.post('/api/export/pdf', async (req: Request, res: Response) => {
  try {
    const { content, template, title } = req.body as ExportRequest;

    db = readDb();
    db.exportHistory.push({
      id: Math.max(...db.exportHistory.map((h) => h.id), 0) + 1,
      title,
      format: 'pdf',
      createdAt: new Date().toISOString(),
    });
    writeDb(db);

    const pdfBuffer = await generatePdf(content, template, title);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

app.get('/api/export-history', (_req: Request, res: Response) => {
  try {
    db = readDb();
    const history = [...db.exportHistory].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    ).slice(0, 20);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

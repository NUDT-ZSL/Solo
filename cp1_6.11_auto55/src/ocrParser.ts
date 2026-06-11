import Tesseract from 'tesseract.js';

export interface CatalogEntry {
  id: number;
  title: string;
  page: string;
  level: 1 | 2 | 3;
  indent: number;
  rawText: string;
  region?: { x: number; y: number; w: number; h: number };
}

export interface OcrResult {
  entries: CatalogEntry[];
  rawLines: string[];
}

function parseLevel(indent: number): 1 | 2 | 3 {
  if (indent <= 2) return 1;
  if (indent <= 5) return 2;
  return 3;
}

function extractPageNumber(text: string): string {
  const match = text.match(/[.…·\s]+\s*(\d+)\s*$/);
  if (match) return match[1];
  const trailingMatch = text.match(/\s+(\d{1,5})\s*$/);
  if (trailingMatch) return trailingMatch[1];
  return '';
}

function extractTitle(text: string, page: string): string {
  let title = text;
  if (page) {
    const idx = title.lastIndexOf(page);
    if (idx > 0) {
      const before = title.substring(0, idx);
      title = before.replace(/[.…·\s]+$/, '').trim();
    }
  }
  return title.trim();
}

function countLeadingSpaces(line: string): number {
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === ' ' || line[i] === '\t') {
      count += line[i] === '\t' ? 4 : 1;
    } else {
      break;
    }
  }
  return count;
}

export async function performOcr(
  imageFile: File | HTMLImageElement | string,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  const result = await Tesseract.recognize(imageFile, 'chi_sim+eng', {
    logger: (info) => {
      if (info.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(info.progress * 100));
      }
    },
  });

  const lines = result.data.lines;
  const entries: CatalogEntry[] = [];
  const rawLines: string[] = [];
  let id = 0;

  for (const line of lines) {
    const text = line.text.trim();
    if (!text || text.length < 2) continue;

    rawLines.push(line.text);

    const indent = countLeadingSpaces(line.text);
    const level = parseLevel(indent);
    const page = extractPageNumber(text);
    const title = extractTitle(text, page);

    if (!title) continue;

    const bbox = line.bbox;
    entries.push({
      id: id++,
      title,
      page,
      level,
      indent,
      rawText: line.text,
      region: {
        x: bbox.x0,
        y: bbox.y0,
        w: bbox.x1 - bbox.x0,
        h: bbox.y1 - bbox.y0,
      },
    });
  }

  return { entries, rawLines };
}

export function updateEntry(entries: CatalogEntry[], id: number, field: 'title' | 'page', value: string): CatalogEntry[] {
  return entries.map((e) => {
    if (e.id === id) {
      return { ...e, [field]: value };
    }
    return e;
  });
}

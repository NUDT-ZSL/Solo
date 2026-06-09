import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  extractFeatures,
  compareAudioFiles,
  type AudioFeatures
} from './audioAnalyzer.js';

const PORT = 3001;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'application/octet-stream'
];

interface AudioFile {
  id: string;
  fileName: string;
  type: 'standard' | 'recording';
  buffer: Buffer;
  mimeType: string;
  size: number;
  features: AudioFeatures;
  uploadedAt: number;
}

const audioStore = new Map<string, AudioFile>();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const rawBodyLimit = express.raw({
  type: '*/*',
  limit: '50mb'
});

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), stored: audioStore.size });
});

app.post('/api/upload', rawBodyLimit, async (req: Request, res: Response) => {
  try {
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve());
        req.on('error', reject);
      });
      const raw = Buffer.concat(chunks);

      const boundaryMatch = contentType.match(/boundary=([^;]+)/);
      if (!boundaryMatch) {
        return res.status(400).json({ error: 'Missing multipart boundary', code: 'INVALID_FORMAT' });
      }
      const boundary = '--' + boundaryMatch[1].trim().replace(/^["']|["']$/g, '');

      const parts = parseMultipart(raw, boundary);
      const filePart = parts.find(p => p.name === 'file');
      const typePart = parts.find(p => p.name === 'type');

      if (!filePart || !filePart.data || !filePart.filename) {
        return res.status(400).json({ error: 'Missing file field', code: 'INVALID_FORMAT' });
      }

      if (filePart.data.length > MAX_FILE_SIZE) {
        return res.status(413).json({
          error: '文件过大，最大支持10MB',
          code: 'FILE_TOO_LARGE'
        });
      }

      const type = (typePart?.text || 'standard') as 'standard' | 'recording';
      const fileId = uuidv4();
      const mimeType = filePart.contentType || 'application/octet-stream';

      const isWav = /\.(wav|wave)$/i.test(filePart.filename) || mimeType.includes('wav');
      const isMp3 = /\.(mp3|mpeg)$/i.test(filePart.filename) || mimeType.includes('mpeg') || mimeType.includes('mp3');
      const isWebm = /\.(webm)$/i.test(filePart.filename) || mimeType.includes('webm');

      if (!isWav && !isMp3 && !isWebm) {
        return res.status(400).json({
          error: '仅支持 mp3 / wav / webm 格式',
          code: 'INVALID_FORMAT'
        });
      }

      const { features } = extractFeatures(filePart.data, isWav ? 'audio/wav' : mimeType);

      const audioFile: AudioFile = {
        id: fileId,
        fileName: filePart.filename,
        type,
        buffer: filePart.data,
        mimeType,
        size: filePart.data.length,
        features,
        uploadedAt: Date.now()
      };
      audioStore.set(fileId, audioFile);

      return res.json({
        fileId,
        fileName: filePart.filename,
        duration: Number(features.duration.toFixed(3)),
        sampleRate: features.sampleRate,
        waveformData: features.waveformData,
        spectrumData: features.spectrumData,
        sizeText: formatSize(filePart.data.length),
        durationText: formatDuration(features.duration)
      });
    }

    return res.status(400).json({ error: 'Unsupported content type', code: 'INVALID_FORMAT' });
  } catch (err) {
    console.error('[Upload Error]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : '解析音频失败',
      code: 'PARSE_ERROR'
    });
  }
});

app.post('/api/compare', async (req: Request, res: Response) => {
  try {
    const { standardFileId, recordingFileId } = req.body || {} as {
      standardFileId?: string;
      recordingFileId?: string;
    };

    if (!standardFileId || !recordingFileId) {
      return res.status(400).json({ error: '缺少文件ID参数' });
    }

    const std = audioStore.get(standardFileId);
    const rec = audioStore.get(recordingFileId);

    if (!std || !rec) {
      return res.status(404).json({ error: '音频文件不存在或已过期' });
    }

    const startTime = Date.now();
    const result = compareAudioFiles(std.features, rec.features);
    const elapsed = Date.now() - startTime;

    return res.json({
      ...result,
      meta: {
        elapsedMs: elapsed,
        standardDuration: std.features.duration,
        recordingDuration: rec.features.duration
      }
    });
  } catch (err) {
    console.error('[Compare Error]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : '对比分析失败'
    });
  }
});

app.get('/api/audio/:id', (req: Request, res: Response) => {
  const file = audioStore.get(req.params.id);
  if (!file) {
    return res.status(404).json({ error: 'Audio not found' });
  }
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Length', file.size.toString());
  res.setHeader('Cache-Control', 'no-cache');
  return res.end(file.buffer);
});

interface Part {
  name: string;
  filename?: string;
  contentType?: string;
  data?: Buffer;
  text?: string;
}

function parseMultipart(buffer: Buffer, boundary: string): Part[] {
  const parts: Part[] = [];
  const boundaryBuf = Buffer.from(boundary);
  const endBuf = Buffer.from(boundary + '--');

  let idx = 0;
  while (idx < buffer.length) {
    const bi = indexOfBuffer(buffer, boundaryBuf, idx);
    if (bi === -1) break;
    const ei = indexOfBuffer(buffer, boundaryBuf, bi + boundaryBuf.length);

    const start = bi + boundaryBuf.length + 2;
    const end = ei !== -1 ? ei - 2 : indexOfBuffer(buffer, endBuf, bi + boundaryBuf.length);
    if (end === -1 || start >= end) break;

    const partBuf = buffer.subarray(start, end);
    const headerEnd = indexOfBuffer(partBuf, Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) {
      idx = ei !== -1 ? ei : buffer.length;
      continue;
    }

    const headers = partBuf.subarray(0, headerEnd).toString('utf8');
    const body = partBuf.subarray(headerEnd + 4);

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n;]+)/i);

    const part: Part = {
      name: nameMatch ? nameMatch[1] : '',
      filename: filenameMatch ? filenameMatch[1] : undefined,
      contentType: contentTypeMatch ? contentTypeMatch[1].trim() : undefined
    };

    if (part.filename !== undefined) {
      part.data = Buffer.from(body);
    } else {
      const endTrim = body[body.length - 1] === 0x0a ? body.length - 1 : body.length;
      const finalTrim = body[endTrim - 1] === 0x0d ? endTrim - 1 : endTrim;
      part.text = body.subarray(0, finalTrim).toString('utf8');
    }

    if (part.name) parts.push(part);
    idx = ei !== -1 ? ei : buffer.length;
  }

  return parts;
}

function indexOfBuffer(src: Buffer, needle: Buffer, from = 0): number {
  for (let i = from; i <= src.length - needle.length; i++) {
    let found = true;
    for (let j = 0; j < needle.length; j++) {
      if (src[i + j] !== needle[j]) {
        found = false;
        break;
      }
    }
    if (found) return i;
  }
  return -1;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

app.listen(PORT, () => {
  console.log(`\n✅ 声波矫正器后端服务启动成功`);
  console.log(`   服务地址: http://localhost:${PORT}`);
  console.log(`   健康检查: http://localhost:${PORT}/health\n`);
});

process.on('SIGINT', () => {
  console.log('\n收到退出信号，正在关闭服务...');
  audioStore.clear();
  process.exit(0);
});

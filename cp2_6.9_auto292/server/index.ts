import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Capsule {
  id: string;
  title: string;
  contentHTML: string;
  images: string[];
  unlockDate: string;
  recipientEmail: string;
  pageSnapshot: string;
  createdAt: string;
  status: 'pending' | 'sent';
  sentAt?: string;
}

interface CreateCapsuleRequest {
  title: string;
  contentHTML: string;
  images: string[];
  unlockDate: string;
  recipientEmail: string;
  pageSnapshot: string;
}

const app = express();
const PORT = 3001;
const CAPSULES_DIR = path.join(__dirname, 'capsules');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

if (!fs.existsSync(CAPSULES_DIR)) {
  fs.mkdirSync(CAPSULES_DIR, { recursive: true });
}

const readCapsule = (id: string): Capsule | null => {
  const filePath = path.join(CAPSULES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Capsule;
  } catch (err) {
    console.error(`[ERROR] Failed to read capsule ${id}:`, err);
    return null;
  }
};

const writeCapsule = (capsule: Capsule): void => {
  const filePath = path.join(CAPSULES_DIR, `${capsule.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(capsule, null, 2), 'utf-8');
};

const deleteCapsuleFile = (id: string): boolean => {
  const filePath = path.join(CAPSULES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    console.error(`[ERROR] Failed to delete capsule ${id}:`, err);
    return false;
  }
};

const getAllCapsules = (): Capsule[] => {
  if (!fs.existsSync(CAPSULES_DIR)) {
    return [];
  }
  const files = fs.readdirSync(CAPSULES_DIR).filter((f) => f.endsWith('.json'));
  const capsules: Capsule[] = [];
  for (const file of files) {
    const id = file.slice(0, -5);
    const capsule = readCapsule(id);
    if (capsule) {
      capsules.push(capsule);
    }
  }
  return capsules.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn('[WARN] SMTP environment variables are not fully configured');
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const buildEmailHTML = (capsule: Capsule): string => {
  const imagesHTML =
    capsule.images && capsule.images.length > 0
      ? `<div style="margin: 20px 0;">
          ${capsule.images
            .map(
              (img) =>
                `<img src="${img}" alt="胶囊图片" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px;" />`
            )
            .join('')}
        </div>`
      : '';

  const snapshotHTML = capsule.pageSnapshot
    ? `<div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #6366f1;">
         <h3 style="margin: 0 0 10px 0; color: #6366f1;">📸 网页快照</h3>
         <div style="max-height: 400px; overflow: auto; background: white; padding: 10px; border-radius: 4px;">
           ${capsule.pageSnapshot}
         </div>
       </div>`
    : '';

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>您的时间胶囊已开启</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px; }
        .content { padding: 30px; }
        .title { font-size: 22px; color: #1f2937; margin: 0 0 20px 0; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb; }
        .body-content { color: #374151; line-height: 1.8; font-size: 16px; }
        .body-content img { max-width: 100%; height: auto; border-radius: 8px; }
        .footer { padding: 20px 30px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💌 时间胶囊已开启</h1>
          <p>来自过去的一封信</p>
        </div>
        <div class="content">
          <h2 class="title">${capsule.title}</h2>
          <div class="body-content">
            ${capsule.contentHTML}
          </div>
          ${imagesHTML}
          ${snapshotHTML}
        </div>
        <div class="footer">
          <p>此邮件由时间胶囊递送站自动发送</p>
          <p>开启时间：${new Date(capsule.unlockDate).toLocaleString('zh-CN')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const sendCapsuleEmail = async (capsule: Capsule): Promise<boolean> => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`[WARN] Cannot send email for capsule ${capsule.id}: SMTP not configured`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"时间胶囊" <${process.env.SMTP_USER}>`,
      to: capsule.recipientEmail,
      subject: `您的时间胶囊已开启：${capsule.title}`,
      html: buildEmailHTML(capsule),
    });
    console.log(`[INFO] Email sent successfully for capsule: ${capsule.id}`);
    return true;
  } catch (err) {
    console.error(`[ERROR] Failed to send email for capsule ${capsule.id}:`, err);
    return false;
  }
};

const processDueCapsules = async (): Promise<void> => {
  console.log('[INFO] Scanning for due capsules...');
  const capsules = getAllCapsules();
  const now = new Date();

  for (const capsule of capsules) {
    if (capsule.status !== 'pending') {
      continue;
    }

    const unlockDate = new Date(capsule.unlockDate);
    if (now >= unlockDate) {
      console.log(`[INFO] Processing due capsule: ${capsule.id} (${capsule.title})`);
      const sent = await sendCapsuleEmail(capsule);
      if (sent) {
        capsule.status = 'sent';
        capsule.sentAt = new Date().toISOString();
        writeCapsule(capsule);
        console.log(`[INFO] Capsule ${capsule.id} marked as sent`);
      }
    }
  }
};

app.post('/api/capsules', async (req: Request<{}, {}, CreateCapsuleRequest>, res: Response, next: NextFunction) => {
  try {
    const { title, contentHTML, images, unlockDate, recipientEmail, pageSnapshot } = req.body;

    if (!title || !contentHTML || !unlockDate || !recipientEmail) {
      return res.status(400).json({ error: '缺少必填字段: title, contentHTML, unlockDate, recipientEmail' });
    }

    if (!recipientEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    const unlockDateObj = new Date(unlockDate);
    if (isNaN(unlockDateObj.getTime())) {
      return res.status(400).json({ error: '解锁日期格式不正确' });
    }

    const capsule: Capsule = {
      id: uuidv4(),
      title,
      contentHTML,
      images: images || [],
      unlockDate: unlockDateObj.toISOString(),
      recipientEmail,
      pageSnapshot: pageSnapshot || '',
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    writeCapsule(capsule);
    console.log(`[INFO] Capsule created: ${capsule.id} (${capsule.title}), unlock at ${capsule.unlockDate}`);
    return res.status(201).json(capsule);
  } catch (err) {
    next(err);
  }
});

app.get('/api/capsules', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const capsules = getAllCapsules();
    return res.json(capsules);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/capsules/:id', (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const capsule = readCapsule(id);
    if (!capsule) {
      return res.status(404).json({ error: '胶囊不存在' });
    }
    const deleted = deleteCapsuleFile(id);
    if (deleted) {
      console.log(`[INFO] Capsule deleted: ${id}`);
      return res.json({ message: '胶囊已删除', id });
    } else {
      return res.status(500).json({ error: '删除胶囊失败' });
    }
  } catch (err) {
    next(err);
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR] Unhandled error:', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.listen(PORT, () => {
  console.log(`[INFO] Time Capsule Server is running on http://localhost:${PORT}`);
  console.log(`[INFO] Capsules stored in: ${CAPSULES_DIR}`);
  processDueCapsules();
  setInterval(processDueCapsules, 60 * 1000);
  console.log('[INFO] Scheduler started - checking due capsules every 60 seconds');
});

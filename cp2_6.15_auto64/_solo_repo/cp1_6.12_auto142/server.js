import express from 'express';
import multer from 'multer';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = Datastore.create({
  filename: path.join(__dirname, 'data', 'students.db'),
  autoload: true,
});

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  const nameIdx = headers.findIndex(
    (h) => h.toLowerCase() === 'name' || h.toLowerCase() === '姓名'
  );
  const idIdx = headers.findIndex(
    (h) => h.toLowerCase() === 'id' || h.toLowerCase() === '学号' || h.toLowerCase() === 'studentid'
  );

  const subjectHeaders = headers.filter((_, i) => i !== nameIdx && i !== idIdx);

  const students = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length < 2) continue;

    const name = values[nameIdx] || `学生${i}`;
    const studentId = values[idIdx] || `S${String(i).padStart(4, '0')}`;

    const courses = [];
    let total = 0;
    let count = 0;

    subjectHeaders.forEach((subject, idx) => {
      const headerIdx = headers.indexOf(subject);
      const rawScore = values[headerIdx];
      const score = parseFloat(rawScore);
      if (!isNaN(score)) {
        courses.push({
          name: subject,
          score: Math.round(score * 100) / 100,
          grade: getGrade(score),
        });
        total += score;
        count++;
      }
    });

    const average = count > 0 ? Math.round((total / count) * 100) / 100 : 0;

    students.push({
      _id: uuidv4(),
      name,
      studentId,
      courses,
      totalScore: Math.round(total * 100) / 100,
      averageScore: average,
      comment: '',
      createdAt: Date.now(),
    });
  }

  return students;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function generateReportHTML(student) {
  const coursesRows = student.courses
    .map(
      (c, i) => `
      <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="padding: 12px 16px; border: 1px solid #e5e7eb; text-align: left;">${c.name}</td>
        <td style="padding: 12px 16px; border: 1px solid #e5e7eb; text-align: center;">${c.score}</td>
        <td style="padding: 12px 16px; border: 1px solid #e5e7eb; text-align: center;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; background-color: ${
            c.grade === 'A'
              ? '#dcfce7'
              : c.grade === 'B'
              ? '#dbeafe'
              : c.grade === 'C'
              ? '#fef9c3'
              : c.grade === 'D'
              ? '#fed7aa'
              : '#fecaca'
          }; color: ${
        c.grade === 'A'
          ? '#166534'
          : c.grade === 'B'
          ? '#1e40af'
          : c.grade === 'C'
          ? '#854d0e'
          : c.grade === 'D'
          ? '#9a3412'
          : '#991b1b'
      }; font-weight: 600;">${c.grade}</span>
        </td>
      </tr>
    `
    )
    .join('');

  const escapedComment = (student.comment || '暂无评语').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${student.name} - 成绩单</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; padding: 40px; margin: 0; }
    .report-card { width: 750px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
    .report-header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 40px; color: white; }
    .report-header h1 { margin: 0 0 8px 0; font-size: 24px; }
    .report-header .sub { opacity: 0.9; font-size: 14px; }
    .student-info { display: flex; align-items: center; padding: 32px 40px; gap: 24px; border-bottom: 1px solid #e5e7eb; }
    .avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #e0e7ff, #c7d2fe); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: #6366f1; }
    .info-meta .name { font-size: 22px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
    .info-meta .id { font-size: 14px; color: #6b7280; }
    .stats-row { display: flex; padding: 24px 40px; gap: 32px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
    .stat-item { flex: 1; text-align: center; }
    .stat-value { font-size: 28px; font-weight: 700; color: #6366f1; }
    .stat-label { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .courses-section { padding: 32px 40px; }
    .section-title { font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; }
    th { background: #6366f1; color: white; padding: 12px 16px; text-align: left; font-weight: 600; font-size: 14px; }
    td { font-size: 14px; color: #374151; }
    .comment-section { padding: 0 40px 32px 40px; }
    .comment-box { background: #f9fafb; border-radius: 8px; padding: 20px; border-left: 4px solid #6366f1; min-height: 80px; color: #374151; line-height: 1.7; font-size: 14px; white-space: pre-wrap; }
    .report-footer { padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="report-card">
    <div class="report-header">
      <h1>学员成绩单</h1>
      <div class="sub">ReportForge · Academic Report</div>
    </div>
    <div class="student-info">
      <div class="avatar">${student.name.charAt(0)}</div>
      <div class="info-meta">
        <div class="name">${student.name}</div>
        <div class="id">学号：${student.studentId}</div>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-value">${student.totalScore}</div>
        <div class="stat-label">总分</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${student.averageScore}</div>
        <div class="stat-label">平均分</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${student.courses.length}</div>
        <div class="stat-label">科目数</div>
      </div>
    </div>
    <div class="courses-section">
      <div class="section-title">各科成绩</div>
      <table>
        <thead>
          <tr>
            <th>科目</th>
            <th style="text-align: center;">分数</th>
            <th style="text-align: center;">等级</th>
          </tr>
        </thead>
        <tbody>
          ${coursesRows}
        </tbody>
      </table>
    </div>
    <div class="comment-section">
      <div class="section-title">教师评语</div>
      <div class="comment-box">${escapedComment}</div>
    </div>
    <div class="report-footer">
      ReportForge © 2024 · 本成绩单由系统自动生成
    </div>
  </div>
</body>
</html>`;
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const csvText = req.file.buffer.toString('utf-8');
    const students = parseCSV(csvText);

    if (students.length === 0) {
      return res.status(400).json({ error: 'CSV解析失败：未找到有效数据' });
    }

    await db.remove({}, { multi: true });
    const result = await db.insert(students);

    res.json({
      success: true,
      count: Array.isArray(result) ? result.length : 1,
      students: Array.isArray(result) ? result : [result],
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || '上传处理失败' });
  }
});

app.get('/api/students', async (req, res) => {
  try {
    const students = await db.find({}).sort({ createdAt: 1 });
    res.json(students);
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await db.findOne({ _id: req.params.id });
    if (!student) {
      return res.status(404).json({ error: '未找到该学生' });
    }
    res.json(student);
  } catch (err) {
    console.error('Get student error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students/:id/update', async (req, res) => {
  try {
    const { comment, courses } = req.body;
    const updateData = {};

    if (typeof comment !== 'undefined') {
      updateData.comment = comment;
    }

    if (Array.isArray(courses)) {
      const newCourses = courses.map((c) => ({
        name: c.name,
        score: typeof c.score === 'number' ? c.score : parseFloat(c.score) || 0,
        grade: c.grade || getGrade(parseFloat(c.score) || 0),
      }));
      updateData.courses = newCourses;
      const total = newCourses.reduce((sum, c) => sum + c.score, 0);
      updateData.totalScore = Math.round(total * 100) / 100;
      updateData.averageScore =
        newCourses.length > 0
          ? Math.round((total / newCourses.length) * 100) / 100
          : 0;
    }

    const student = await db.update(
      { _id: req.params.id },
      { $set: updateData },
      { returnUpdatedDocs: true }
    );

    res.json({ success: true, student });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '未选择学生' });
    }

    const students = await db.find({ _id: { $in: ids } });

    const zip = new JSZip();
    const reportsFolder = zip.folder('成绩单');

    students.forEach((student) => {
      const safeName = `${student.studentId}_${student.name}`.replace(
        /[\\/:*?"<>|]/g,
        '_'
      );
      const html = generateReportHTML(student);
      reportsFolder.file(`${safeName}.html`, html);
    });

    res.setHeader(
      'Content-Type',
      'application/zip'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="成绩单_${Date.now()}.zip"`
    );

    const content = await zip.generateAsync(
      { type: 'nodebuffer' },
      (metadata) => {
        // progress callback if needed
      }
    );

    res.send(content);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`ReportForge server running on http://localhost:${PORT}`);
});

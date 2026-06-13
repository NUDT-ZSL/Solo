import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/forms', async (req, res) => {
  try {
    const stats = await db.stats.getDashboardStats();
    res.json(stats.recentForms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/forms/:id', async (req, res) => {
  try {
    const form = await db.forms.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: '表单不存在' });
    }
    const submissionCount = await db.submissions.countByFormId(req.params.id);
    res.json({ ...form, submissionCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/forms', async (req, res) => {
  try {
    const formData = {
      ...req.body,
      shareId: uuidv4(),
      isPublished: false,
    };
    const form = await db.forms.create(formData);
    res.json(form);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/forms/:id', async (req, res) => {
  try {
    const result = await db.forms.update(req.params.id, req.body);
    if (!result) {
      return res.status(404).json({ error: '表单不存在' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/forms/:id', async (req, res) => {
  try {
    await db.forms.remove(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/forms/:id/publish', async (req, res) => {
  try {
    const result = await db.forms.update(req.params.id, { isPublished: true });
    if (!result) {
      return res.status(404).json({ error: '表单不存在' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/forms/share/:shareId', async (req, res) => {
  try {
    const form = await db.forms.findByShareId(req.params.shareId);
    if (!form || !form.isPublished) {
      return res.status(404).json({ error: '表单不存在或未发布' });
    }
    res.json(form);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/submissions', async (req, res) => {
  try {
    const { formId } = req.query;
    if (!formId) {
      return res.status(400).json({ error: '缺少formId参数' });
    }
    const submissions = await db.submissions.findByFormId(formId);
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/submissions', async (req, res) => {
  try {
    const submission = await db.submissions.create(req.body);
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats/:formId', async (req, res) => {
  try {
    const stats = await db.stats.getFormStats(req.params.formId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.stats.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`FormFlow server running on http://localhost:${PORT}`);
});

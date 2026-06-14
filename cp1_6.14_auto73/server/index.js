import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
const jobsFile = path.join(dataDir, 'jobs.json');
const candidatesFile = path.join(dataDir, 'candidates.json');

function readJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/jobs', (req, res) => {
  const jobs = readJSON(jobsFile);
  res.json(jobs);
});

app.get('/api/jobs/:id', (req, res) => {
  const jobs = readJSON(jobsFile);
  const job = jobs.find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

app.post('/api/jobs', (req, res) => {
  const jobs = readJSON(jobsFile);
  const newJob = {
    id: uuidv4(),
    title: req.body.title || '',
    department: req.body.department || '',
    headcount: req.body.headcount || 1,
    skills: req.body.skills || [],
    salaryRange: req.body.salaryRange || '',
    createdAt: new Date().toISOString(),
  };
  jobs.push(newJob);
  writeJSON(jobsFile, jobs);
  res.status(201).json(newJob);
});

app.put('/api/jobs/:id', (req, res) => {
  const jobs = readJSON(jobsFile);
  const idx = jobs.findIndex((j) => j.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Job not found' });
  jobs[idx] = { ...jobs[idx], ...req.body, id: jobs[idx].id, createdAt: jobs[idx].createdAt };
  writeJSON(jobsFile, jobs);
  res.json(jobs[idx]);
});

app.delete('/api/jobs/:id', (req, res) => {
  let jobs = readJSON(jobsFile);
  jobs = jobs.filter((j) => j.id !== req.params.id);
  writeJSON(jobsFile, jobs);
  res.json({ success: true });
});

app.get('/api/candidates', (req, res) => {
  const candidates = readJSON(candidatesFile);
  if (req.query.jobId) {
    return res.json(candidates.filter((c) => c.jobId === req.query.jobId));
  }
  res.json(candidates);
});

app.get('/api/candidates/:id', (req, res) => {
  const candidates = readJSON(candidatesFile);
  const candidate = candidates.find((c) => c.id === req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  res.json(candidate);
});

app.post('/api/candidates', (req, res) => {
  const candidates = readJSON(candidatesFile);
  const newCandidate = {
    id: uuidv4(),
    jobId: req.body.jobId || '',
    name: req.body.name || '',
    phone: req.body.phone || '',
    email: req.body.email || '',
    yearsOfExperience: req.body.yearsOfExperience || 0,
    skills: req.body.skills || [],
    stage: req.body.stage || 'new',
    resumeFileName: req.body.resumeFileName || '',
    interviews: req.body.interviews || [],
    offer: req.body.offer || null,
    createdAt: new Date().toISOString(),
  };
  candidates.push(newCandidate);
  writeJSON(candidatesFile, candidates);
  res.status(201).json(newCandidate);
});

app.put('/api/candidates/:id', (req, res) => {
  const candidates = readJSON(candidatesFile);
  const idx = candidates.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Candidate not found' });
  candidates[idx] = { ...candidates[idx], ...req.body, id: candidates[idx].id, createdAt: candidates[idx].createdAt };
  writeJSON(candidatesFile, candidates);
  res.json(candidates[idx]);
});

app.delete('/api/candidates/:id', (req, res) => {
  let candidates = readJSON(candidatesFile);
  candidates = candidates.filter((c) => c.id !== req.params.id);
  writeJSON(candidatesFile, candidates);
  res.json({ success: true });
});

app.post('/api/upload', (req, res) => {
  const candidates = readJSON(candidatesFile);

  const { jobId, name, phone, email, yearsOfExperience, skills, fileName } = req.body;

  const newCandidate = {
    id: uuidv4(),
    jobId: jobId || '',
    name: name || '未知候选人',
    phone: phone || '',
    email: email || '',
    yearsOfExperience: yearsOfExperience || 0,
    skills: skills || [],
    stage: 'new',
    resumeFileName: fileName || '',
    interviews: [],
    offer: null,
    createdAt: new Date().toISOString(),
  };

  candidates.push(newCandidate);
  writeJSON(candidatesFile, candidates);
  res.status(201).json(newCandidate);
});

app.listen(PORT, () => {
  console.log(`RecruitFlow API server running on http://localhost:${PORT}`);
});

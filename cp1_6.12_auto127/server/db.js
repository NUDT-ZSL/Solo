import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const file = join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter, {
  sessions: [],
  projects: [],
  samples: [
    { id: 'drum_1', name: 'Kick 基础底鼓', category: 'drum', duration: 0.5, frequency: 60 },
    { id: 'drum_2', name: 'Snare 军鼓', category: 'drum', duration: 0.3, frequency: 200 },
    { id: 'drum_3', name: 'Hi-Hat Closed 闭合踩镲', category: 'drum', duration: 0.1, frequency: 800 },
    { id: 'drum_4', name: 'Hi-Hat Open 开放踩镲', category: 'drum', duration: 0.4, frequency: 600 },
    { id: 'drum_5', name: 'Clap 拍手', category: 'drum', duration: 0.2, frequency: 1500 },
    { id: 'drum_6', name: 'Tom 通鼓', category: 'drum', duration: 0.35, frequency: 120 },
    { id: 'bass_1', name: 'Sub Bass 超低音', category: 'bass', duration: 1.0, frequency: 55 },
    { id: 'bass_2', name: 'Bass Pluck 拨弦贝斯', category: 'bass', duration: 0.8, frequency: 80 },
    { id: 'bass_3', name: 'Bass Slide 滑音贝斯', category: 'bass', duration: 1.2, frequency: 65 },
    { id: 'bass_4', name: 'Bass Growl 嘶吼贝斯', category: 'bass', duration: 0.6, frequency: 90 },
    { id: 'bass_5', name: 'Bass Stab 断奏贝斯', category: 'bass', duration: 0.3, frequency: 75 },
    { id: 'vocal_1', name: 'Vocal Chop 人声切片1', category: 'vocal', duration: 0.5, frequency: 400 },
    { id: 'vocal_2', name: 'Vocal Chop 人声切片2', category: 'vocal', duration: 0.7, frequency: 500 },
    { id: 'vocal_3', name: 'Ad-lib 即兴填充', category: 'vocal', duration: 0.3, frequency: 600 },
    { id: 'vocal_4', name: 'Vocal Pad 人声铺底', category: 'vocal', duration: 2.0, frequency: 350 },
    { id: 'vocal_5', name: 'Vocal Hit 人声打击', category: 'vocal', duration: 0.2, frequency: 800 },
    { id: 'melody_1', name: 'Piano Arp 钢琴琶音', category: 'melody', duration: 1.5, frequency: 523 },
    { id: 'melody_2', name: 'Synth Lead 合成主音', category: 'melody', duration: 1.0, frequency: 440 },
    { id: 'melody_3', name: 'Pluck Melody 拨弦旋律', category: 'melody', duration: 0.8, frequency: 659 },
    { id: 'melody_4', name: 'Pad Chord 和弦铺底', category: 'melody', duration: 2.5, frequency: 261 },
    { id: 'melody_5', name: 'Bell Melody 铃铛旋律', category: 'melody', duration: 1.2, frequency: 880 }
  ]
});

await db.read();

if (!db.data.sessions || db.data.sessions.length === 0) {
  const sessionId = uuidv4();
  db.data.sessions.push({ id: sessionId, createdAt: new Date().toISOString() });
  await db.write();
}

export const getCurrentSession = async () => {
  await db.read();
  if (db.data.sessions.length === 0) {
    const sessionId = uuidv4();
    db.data.sessions.push({ id: sessionId, createdAt: new Date().toISOString() });
    await db.write();
  }
  return db.data.sessions[0];
};

export const getSamples = async (category = null, search = '') => {
  await db.read();
  let samples = [...db.data.samples];
  if (category) {
    samples = samples.filter(s => s.category === category);
  }
  if (search) {
    const lower = search.toLowerCase();
    samples = samples.filter(s => 
      s.name.toLowerCase().includes(lower) || 
      s.id.toLowerCase().includes(lower)
    );
  }
  return samples;
};

export const getProjects = async () => {
  await db.read();
  return [...db.data.projects].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
};

export const getProjectById = async (id) => {
  await db.read();
  return db.data.projects.find(p => p.id === id) || null;
};

export const saveProject = async (projectData) => {
  await db.read();
  const nameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]{1,20}$/;
  if (!nameRegex.test(projectData.name)) {
    throw new Error('作品名称格式不正确：1-20个字符，允许中文、英文、数字、下划线');
  }
  const project = {
    id: uuidv4(),
    name: projectData.name,
    tracks: projectData.tracks || [],
    beatPads: projectData.beatPads || [],
    bpm: projectData.bpm || 120,
    masterVolume: projectData.masterVolume || 80,
    createdAt: new Date().toISOString()
  };
  db.data.projects.push(project);
  await db.write();
  return project;
};

export const deleteProject = async (id) => {
  await db.read();
  const index = db.data.projects.findIndex(p => p.id === id);
  if (index === -1) {
    throw new Error('作品不存在');
  }
  db.data.projects.splice(index, 1);
  await db.write();
  return true;
};

export default db;

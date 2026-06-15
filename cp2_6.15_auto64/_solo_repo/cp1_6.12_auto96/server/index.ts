import express from 'express';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '10mb' }));

interface Annotation {
  id: string;
  versionId: string;
  x: number;
  y: number;
  content: string;
  author: string;
  createdAt: string;
}

interface Version {
  id: string;
  name: string;
  image: string;
  createdAt: string;
}

interface Database {
  versions: Version[];
  annotations: Annotation[];
}

const dbPath = path.join(__dirname, 'db.json');
const adapter = new FileSync<Database>(dbPath);
const db = low(adapter);

db.defaults({ versions: [], annotations: [] }).write();

app.get('/api/versions', (req, res) => {
  const versions = db.get('versions').value() || [];
  res.json(
    versions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  );
});

app.post('/api/versions', (req, res) => {
  const { name, image } = req.body;
  
  if (!name || name.length > 20) {
    return res.status(400).json({ error: '版本名称必须在20字以内' });
  }
  
  if (!image) {
    return res.status(400).json({ error: '请上传设计稿图片' });
  }
  
  const newVersion: Version = {
    id: uuidv4(),
    name,
    image,
    createdAt: new Date().toISOString()
  };
  
  db.get('versions').push(newVersion).write();
  
  res.status(201).json(newVersion);
});

app.get('/api/versions/:id', (req, res) => {
  const version = db.get('versions').find({ id: req.params.id }).value();
  if (!version) {
    return res.status(404).json({ error: '版本不存在' });
  }
  res.json(version);
});

app.delete('/api/versions/:id', (req, res) => {
  const version = db.get('versions').find({ id: req.params.id }).value();
  if (!version) {
    return res.status(404).json({ error: '版本不存在' });
  }
  
  db.get('versions').remove({ id: req.params.id }).write();
  db.get('annotations').remove({ versionId: req.params.id }).write();
  
  res.json({ message: '删除成功' });
});

app.get('/api/versions/:id/annotations', (req, res) => {
  const annotations = db.get('annotations').filter({ versionId: req.params.id }).value() || [];
  res.json(
    annotations.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  );
});

app.post('/api/versions/:id/annotations', (req, res) => {
  const { x, y, content, author } = req.body;
  
  const version = db.get('versions').find({ id: req.params.id }).value();
  if (!version) {
    return res.status(404).json({ error: '版本不存在' });
  }
  
  const allAnnotations = db.get('annotations').filter({ versionId: req.params.id }).value() || [];
  if (allAnnotations.length >= 50) {
    return res.status(400).json({ error: '批注数量已达上限(50个)' });
  }
  
  const newAnnotation: Annotation = {
    id: uuidv4(),
    versionId: req.params.id,
    x,
    y,
    content,
    author: author || '匿名用户',
    createdAt: new Date().toISOString()
  };
  
  db.get('annotations').push(newAnnotation).write();
  
  res.status(201).json(newAnnotation);
});

app.put('/api/annotations/:id', (req, res) => {
  const annotation = db.get('annotations').find({ id: req.params.id }).value();
  if (!annotation) {
    return res.status(404).json({ error: '批注不存在' });
  }
  
  const { x, y, content } = req.body;
  
  db.get('annotations')
    .find({ id: req.params.id })
    .assign({
      ...(x !== undefined && { x }),
      ...(y !== undefined && { y }),
      ...(content !== undefined && { content })
    })
    .write();
  
  const updated = db.get('annotations').find({ id: req.params.id }).value();
  res.json(updated);
});

app.delete('/api/annotations/:id', (req, res) => {
  const annotation = db.get('annotations').find({ id: req.params.id }).value();
  if (!annotation) {
    return res.status(404).json({ error: '批注不存在' });
  }
  
  db.get('annotations').remove({ id: req.params.id }).write();
  
  res.json({ message: '删除成功' });
});

app.get('/api/compare/:version1Id/:version2Id', (req, res) => {
  const { version1Id, version2Id } = req.params;
  
  const v1 = db.get('versions').find({ id: version1Id }).value();
  const v2 = db.get('versions').find({ id: version2Id }).value();
  
  if (!v1 || !v2) {
    return res.status(404).json({ error: '版本不存在' });
  }
  
  const a1 = db.get('annotations').filter({ versionId: version1Id }).value() || [];
  const a2 = db.get('annotations').filter({ versionId: version2Id }).value() || [];
  
  const changedAnnotations: Array<{
    type: 'added' | 'removed' | 'modified';
    annotation: Annotation;
    original?: Annotation;
  }> = [];
  
  const a2Map = new Map(a2.map(a => [a.id, a]));
  const a1Map = new Map(a1.map(a => [a.id, a]));
  
  for (const ann of a1) {
    const match = a2Map.get(ann.id);
    if (!match) {
      changedAnnotations.push({ type: 'removed', annotation: ann });
    } else if (match.x !== ann.x || match.y !== ann.y || match.content !== ann.content) {
      changedAnnotations.push({ type: 'modified', annotation: match, original: ann });
    }
  }
  
  for (const ann of a2) {
    if (!a1Map.has(ann.id)) {
      changedAnnotations.push({ type: 'added', annotation: ann });
    }
  }
  
  res.json({
    version1: v1,
    version2: v2,
    annotations1: a1,
    annotations2: a2,
    changedAnnotations
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

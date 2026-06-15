import express from 'express';
import cors from 'cors';
import multiparty from 'multiparty';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/upload', (req, res) => {
  const form = new multiparty.Form();
  
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: '文件解析失败' });
    }
    
    const file = files.audio?.[0];
    if (!file) {
      return res.status(400).json({ error: '未找到音频文件' });
    }
    
    const filePath = file.path;
    const fileBuffer = fs.readFileSync(filePath);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(fileBuffer);
    
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) console.error('删除临时文件失败:', unlinkErr);
    });
  });
});

app.get('/api/proxy', (req, res) => {
  const url = req.query.url as string;
  
  if (!url) {
    return res.status(400).json({ error: '缺少URL参数' });
  }
  
  try {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const proxyReq = client.get(url, (proxyRes) => {
      const contentType = proxyRes.headers['content-type'] || 'audio/mpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      proxyRes.pipe(res);
      
      proxyRes.on('error', (err) => {
        console.error('代理响应错误:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '代理请求失败' });
        }
      });
    });
    
    proxyReq.on('error', (err) => {
      console.error('代理请求错误:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: '无法连接到目标服务器' });
      }
    });
    
    proxyReq.setTimeout(30000, () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: '请求超时' });
      }
    });
    
  } catch (err) {
    console.error('URL解析错误:', err);
    res.status(400).json({ error: '无效的URL' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

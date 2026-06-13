import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('\n=== Babel 加载与编译测试 ===\n');

function testIndexHtmlBabelScript() {
  console.log('1. 测试 index.html 中 Babel CDN 引用...');
  const indexHtmlPath = resolve(process.cwd(), 'index.html');
  const indexHtml = readFileSync(indexHtmlPath, 'utf-8');

  const hasReactScript = indexHtml.includes('https://unpkg.com/react@18/umd/react.development.js');
  const hasReactDomScript = indexHtml.includes('https://unpkg.com/react-dom@18/umd/react-dom.development.js');
  const hasBabelScript = indexHtml.includes('https://unpkg.com/@babel/standalone/babel.min.js');

  if (hasReactScript && hasReactDomScript && hasBabelScript) {
    console.log('   ✅ index.html 中正确引用了 React、ReactDOM 和 Babel CDN');
    return true;
  } else {
    console.log('   ❌ index.html 中缺少必要的 CDN 引用');
    if (!hasReactScript) console.log('      - 缺少 React CDN');
    if (!hasReactDomScript) console.log('      - 缺少 ReactDOM CDN');
    if (!hasBabelScript) console.log('      - 缺少 Babel standalone CDN');
    return false;
  }
}

function testBabelTypes() {
  console.log('\n2. 测试 Babel 类型定义...');
  const packageJsonPath =
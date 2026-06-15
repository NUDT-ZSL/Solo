import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n=== Babel 加载与编译测试 ===\n');

let passed = 0;
let failed = 0;

function testIndexHtmlBabelScript() {
  console.log('1. 测试 index.html 中 Babel CDN 引用...');
  const indexHtmlPath = resolve(process.cwd(), 'index.html');
  const indexHtml = readFileSync(indexHtmlPath, 'utf-8');

  const hasReactScript = indexHtml.includes('https://unpkg.com/react@18/umd/react.development.js');
  const hasReactDomScript = indexHtml.includes('https://unpkg.com/react-dom@18/umd/react-dom.development.js');
  const hasBabelScript = indexHtml.includes('https://unpkg.com/@babel/standalone/babel.min.js');

  if (hasReactScript && hasReactDomScript && hasBabelScript) {
    console.log('   ✅ index.html 中正确引用了 React、ReactDOM 和 Babel CDN');
    passed++;
    return true;
  } else {
    console.log('   ❌ index.html 中缺少必要的 CDN 引用');
    if (!hasReactScript) console.log('      - 缺少 React CDN');
    if (!hasReactDomScript) console.log('      - 缺少 ReactDOM CDN');
    if (!hasBabelScript) console.log('      - 缺少 Babel standalone CDN');
    failed++;
    return false;
  }
}

function testBabelTypes() {
  console.log('\n2. 测试 Babel 类型定义...');
  const packageJsonPath = resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  const hasBabelTypes = packageJson.devDependencies['@types/babel__standalone'];
  const hasBabelDevDep = packageJson.devDependencies['@babel/standalone'];

  if (hasBabelTypes && hasBabelDevDep) {
    console.log('   ✅ package.json 中正确配置了 Babel 类型定义和开发依赖');
    console.log(`      - @babel/standalone: ${hasBabelDevDep}`);
    console.log(`      - @types/babel__standalone: ${hasBabelTypes}`);
    passed++;
    return true;
  } else {
    console.log('   ❌ package.json 中缺少 Babel 相关依赖');
    if (!hasBabelDevDep) console.log('      - 缺少 @babel/standalone 开发依赖');
    if (!hasBabelTypes) console.log('      - 缺少 @types/babel__standalone 类型定义');
    failed++;
    return false;
  }
}

function testPreviewSandboxCode() {
  console.log('\n3. 测试 Preview 组件沙箱代码执行方式...');
  const previewPath = resolve(process.cwd(), 'src/components/Preview.tsx');
  const previewCode = readFileSync(previewPath, 'utf-8');

  const hasNewFunction = previewCode.includes('new Function');
  const hasEval = previewCode.includes('eval(');
  const hasIframeSandbox = previewCode.includes('sandbox="allow-scripts allow-same-origin"');
  const hasPostMessage = previewCode.includes('postMessage');
  const hasReactCreateElement = previewCode.includes('React.createElement');

  let allPassed = true;

  if (hasNewFunction && !hasEval) {
    console.log('   ✅ 使用 new Function 替代 eval 执行代码');
    passed++;
  } else {
    console.log('   ❌ 代码执行方式不正确');
    if (hasEval) console.log('      - 仍在使用 eval()，应改用 new Function');
    if (!hasNewFunction) console.log('      - 未使用 new Function');
    failed++;
    allPassed = false;
  }

  if (hasIframeSandbox) {
    console.log('   ✅ iframe 配置了正确的 sandbox 属性');
    passed++;
  } else {
    console.log('   ❌ iframe 缺少 sandbox 属性或配置不正确');
    failed++;
    allPassed = false;
  }

  if (hasPostMessage) {
    console.log('   ✅ 使用 postMessage 进行安全通信');
    passed++;
  } else {
    console.log('   ❌ 未使用 postMessage 通信');
    failed++;
    allPassed = false;
  }

  if (hasReactCreateElement) {
    console.log('   ✅ 正确调用 React.createElement 渲染组件');
    passed++;
  } else {
    console.log('   ❌ 未使用 React.createElement 渲染组件');
    failed++;
    allPassed = false;
  }

  return allPassed;
}

function testEditorCloseBrackets() {
  console.log('\n4. 测试 Editor 组件括号自动补全...');
  const editorPath = resolve(process.cwd(), 'src/components/Editor.tsx');
  const editorCode = readFileSync(editorPath, 'utf-8');

  const hasCloseBracketsImport = editorCode.includes('@codemirror/closebrackets');
  const hasCloseBracketsExt = editorCode.includes('closeBrackets()');
  const hasCloseBracketsKeymap = editorCode.includes('closeBracketsKeymap');

  if (hasCloseBracketsImport && hasCloseBracketsExt && hasCloseBracketsKeymap) {
    console.log('   ✅ Editor 组件正确配置了括号自动补全插件');
    console.log('      - 导入了 @codemirror/closebrackets');
    console.log('      - 配置了 closeBrackets() 扩展');
    console.log('      - 配置了 closeBracketsKeymap 键盘映射');
    passed++;
    return true;
  } else {
    console.log('   ❌ Editor 组件缺少括号自动补全配置');
    if (!hasCloseBracketsImport) console.log('      - 缺少 @codemirror/closebrackets 导入');
    if (!hasCloseBracketsExt) console.log('      - 缺少 closeBrackets() 扩展配置');
    if (!hasCloseBracketsKeymap) console.log('      - 缺少 closeBracketsKeymap 键盘映射');
    failed++;
    return false;
  }
}

function testPropsPanelStyles() {
  console.log('\n5. 测试 PropsPanel 组件样式...');
  const propsPanelCssPath = resolve(process.cwd(), 'src/components/PropsPanel.module.css');
  const propsPanelCss = readFileSync(propsPanelCssPath, 'utf-8');

  let allPassed = true;

  const hasSliderActive = propsPanelCss.includes('.sliderActive');
  const hasSlider24px = propsPanelCss.includes('width: 24px') && propsPanelCss.includes('height: 24px');
  const hasSliderShadow = propsPanelCss.includes('0 0 0 3px rgba(99, 102, 241, 0.3)');

  if (hasSliderActive && hasSlider24px && hasSliderShadow) {
    console.log('   ✅ 滑块拖拽时放大到24px并增加阴影');
    passed++;
  } else {
    console.log('   ❌ 滑块拖拽样式不完整');
    if (!hasSliderActive) console.log('      - 缺少 .sliderActive 类');
    if (!hasSlider24px) console.log('      - 缺少 24px 大小设置');
    if (!hasSliderShadow) console.log('      - 缺少阴影效果');
    failed++;
    allPassed = false;
  }

  const hasColorPickerSize = propsPanelCss.includes('width: 60px') && 
                            propsPanelCss.includes('height: 30px') && 
                            propsPanelCss.includes('border-radius: 6px');

  if (hasColorPickerSize) {
    console.log('   ✅ 颜色选择器尺寸正确（60px × 30px，圆角6px）');
    passed++;
  } else {
    console.log('   ❌ 颜色选择器尺寸不正确');
    failed++;
    allPassed = false;
  }

  const hasToggleTransition = propsPanelCss.includes('transition: all 0.2s ease') || 
                              propsPanelCss.includes('transition: background-color 0.2s ease');

  if (hasToggleTransition) {
    console.log('   ✅ 布尔开关有 0.2 秒过渡动画');
    passed++;
  } else {
    console.log('   ❌ 布尔开关缺少过渡动画');
    failed++;
    allPassed = false;
  }

  return allPassed;
}

function testDividerResponsiveStyles() {
  console.log('\n6. 测试分隔条拖拽和响应式布局...');
  const appCssPath = resolve(process.cwd(), 'src/App.module.css');
  const appCss = readFileSync(appCssPath, 'utf-8');

  let allPassed = true;

  const hasDividerCursor = appCss.includes('cursor: col-resize');
  const hasDividerTransition = appCss.includes('transition: background-color 0.1s linear') || 
                               appCss.includes('transition: width 0.1s linear');
  const hasDividerHoverColor = appCss.includes('.divider:hover');

  if (hasDividerCursor && hasDividerTransition && hasDividerHoverColor) {
    console.log('   ✅ 分隔条样式正确（col-resize光标、0.1秒过渡、悬停变色）');
    passed++;
  } else {
    console.log('   ❌ 分隔条样式不完整');
    if (!hasDividerCursor) console.log('      - 缺少 cursor: col-resize');
    if (!hasDividerTransition) console.log('      - 缺少 0.1 秒过渡动画');
    if (!hasDividerHoverColor) console.log('      - 缺少悬停变色效果');
    failed++;
    allPassed = false;
  }

  const hasPanelTransition = appCss.includes('.editorPanel') && 
                             appCss.includes('.previewPanel') &&
                             appCss.includes('transition: width 0.1s linear');

  if (hasPanelTransition) {
    console.log('   ✅ 编辑器和预览区域有同步缩放过渡');
    passed++;
  } else {
    console.log('   ❌ 编辑器和预览区域缺少同步缩放过渡');
    failed++;
    allPassed = false;
  }

  const hasMobileMediaQuery = appCss.includes('@media (max-width: 768px)');
  const hasMobileEditorButton = appCss.includes('.mobileEditorButton');
  const hasMobileEditorOverlay = appCss.includes('.mobileEditorOverlay');

  if (hasMobileMediaQuery && hasMobileEditorButton && hasMobileEditorOverlay) {
    console.log('   ✅ 响应式布局正确（<768px自动隐藏编辑器，侧边打开按钮）');
    passed++;
  } else {
    console.log('   ❌ 响应式布局不完整');
    if (!hasMobileMediaQuery) console.log('      - 缺少 768px 断点媒体查询');
    if (!hasMobileEditorButton) console.log('      - 缺少移动端编辑器打开按钮');
    if (!hasMobileEditorOverlay) console.log('      - 缺少移动端编辑器覆盖层');
    failed++;
    allPassed = false;
  }

  return allPassed;
}

function testDebounceConfiguration() {
  console.log('\n7. 测试防抖配置...');
  const appPath = resolve(process.cwd(), 'src/App.tsx');
  const appCode = readFileSync(appPath, 'utf-8');
  const debouncePath = resolve(process.cwd(), 'src/utils/debounce.ts');
  const debounceCode = readFileSync(debouncePath, 'utf-8');

  const hasDebounce300ms = appCode.includes('debounce') && appCode.includes('300');
  const hasDebounceUtil = debounceCode.includes('function debounce') && debounceCode.includes('delay');

  if (hasDebounce300ms && hasDebounceUtil) {
    console.log('   ✅ 防抖配置正确（300ms延迟）');
    passed++;
    return true;
  } else {
    console.log('   ❌ 防抖配置不正确');
    if (!hasDebounceUtil) console.log('      - 缺少防抖工具函数');
    if (!hasDebounce300ms) console.log('      - 缺少 300ms 防抖配置');
    failed++;
    return false;
  }
}

function runAllTests() {
  console.log('='.repeat(50));
  
  testIndexHtmlBabelScript();
  testBabelTypes();
  testPreviewSandboxCode();
  testEditorCloseBrackets();
  testPropsPanelStyles();
  testDividerResponsiveStyles();
  testDebounceConfiguration();

  console.log('\n' + '='.repeat(50));
  console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
  
  if (failed === 0) {
    console.log('\n✅ 所有测试通过！\n');
    process.exit(0);
  } else {
    console.log(`\n❌ 有 ${failed} 个测试失败，请修复后重试。\n`);
    process.exit(1);
  }
}

runAllTests();

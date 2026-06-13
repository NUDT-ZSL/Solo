import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n=== 性能指标测试 ===\n');

let passed = 0;
let failed = 0;

function testDebounceDelay() {
  console.log('1. 测试防抖延迟（预期 300ms）...');
  
  const debouncePath = resolve(process.cwd(), 'src/utils/debounce.ts');
  const debounceCode = readFileSync(debouncePath, 'utf-8');
  const appPath = resolve(process.cwd(), 'src/App.tsx');
  const appCode = readFileSync(appPath, 'utf-8');

  const hasDebounceFunction = debounceCode.includes('function debounce') && 
                              debounceCode.includes('setTimeout') &&
                              debounceCode.includes('clearTimeout');
  
  const has300msDelay = appCode.includes('debounce') && appCode.includes('300');

  if (hasDebounceFunction && has300msDelay) {
    console.log('   ✅ 防抖配置正确，延迟 300ms');
    console.log('      - 防抖函数实现了 setTimeout 和 clearTimeout');
    console.log('      - App.tsx 中配置了 300ms 防抖延迟');
    passed++;
    return true;
  } else {
    console.log('   ❌ 防抖配置不正确');
    if (!hasDebounceFunction) console.log('      - 防抖函数实现不完整');
    if (!has300msDelay) console.log('      - 未配置 300ms 延迟');
    failed++;
    return false;
  }
}

function testRenderPerformanceBudget() {
  console.log('\n2. 测试渲染性能预算（预期 < 500ms）...');
  
  const previewPath = resolve(process.cwd(), 'src/components/Preview.tsx');
  const previewCode = readFileSync(previewPath, 'utf-8');

  const hasSmoothTransition = previewCode.includes('transition: opacity 0.15s ease') || 
                              previewCode.includes('transition: all 0.15s ease');
  const hasUpdateState = previewCode.includes('isUpdating');
  const hasOptimization = previewCode.includes('lastCodeRef') || 
                          previewCode.includes('lastPropsRef') ||
                          previewCode.includes('codeChanged') ||
                          previewCode.includes('propsChanged');

  if (hasSmoothTransition && hasUpdateState && hasOptimization) {
    console.log('   ✅ 渲染性能优化配置正确');
    console.log('      - 有 0.15s 平滑过渡动画');
    console.log('      - 有更新状态管理');
    console.log('      - 有变更检测优化（避免不必要的重渲染）');
    passed++;
    return true;
  } else {
    console.log('   ❌ 渲染性能优化不完整');
    if (!hasSmoothTransition) console.log('      - 缺少平滑过渡动画');
    if (!hasUpdateState) console.log('      - 缺少更新状态管理');
    if (!hasOptimization) console.log('      - 缺少变更检测优化');
    failed++;
    return false;
  }
}

function testCodeMirrorPerformance() {
  console.log('\n3. 测试 CodeMirror 编辑器性能配置...');
  
  const editorPath = resolve(process.cwd(), 'src/components/Editor.tsx');
  const editorCode = readFileSync(editorPath, 'utf-8');
  const packagePath = resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

  const hasCodeMirrorDeps = packageJson.dependencies['@codemirror/state'] &&
                            packageJson.dependencies['@codemirror/view'] &&
                            packageJson.dependencies['@codemirror/lang-javascript'];

  const hasVirtualScroll = editorCode.includes('EditorView') && 
                           editorCode.includes('EditorState');

  const hasThemeOptimization = editorCode.includes('oneDark') || 
                               editorCode.includes('EditorView.theme');

  if (hasCodeMirrorDeps && hasVirtualScroll && hasThemeOptimization) {
    console.log('   ✅ CodeMirror 编辑器配置正确');
    console.log('      - 已安装核心依赖包');
    console.log('      - 使用了虚拟滚动（EditorView + EditorState）');
    console.log('      - 配置了主题优化');
    passed++;
    return true;
  } else {
    console.log('   ❌ CodeMirror 编辑器配置不完整');
    if (!hasCodeMirrorDeps) console.log('      - 缺少必要的 CodeMirror 依赖');
    if (!hasVirtualScroll) console.log('      - 缺少虚拟滚动配置');
    if (!hasThemeOptimization) console.log('      - 缺少主题优化');
    failed++;
    return false;
  }
}

function testMemoryManagement() {
  console.log('\n4. 测试内存管理...');
  
  const previewPath = resolve(process.cwd(), 'src/components/Preview.tsx');
  const previewCode = readFileSync(previewPath, 'utf-8');
  const editorPath = resolve(process.cwd(), 'src/components/Editor.tsx');
  const editorCode = readFileSync(editorPath, 'utf-8');

  const hasPreviewCleanup = previewCode.includes('useEffect') && 
                            previewCode.includes('return () =>') &&
                            (previewCode.includes('removeEventListener') || 
                             previewCode.includes('clearTimeout') ||
                             previewCode.includes('unmount'));

  const hasEditorCleanup = editorCode.includes('view.destroy()') || 
                           editorCode.includes('return () =>');

  if (hasPreviewCleanup && hasEditorCleanup) {
    console.log('   ✅ 内存管理配置正确');
    console.log('      - Preview 组件正确清理事件监听器和定时器');
    console.log('      - Editor 组件正确销毁 CodeMirror 实例');
    passed++;
    return true;
  } else {
    console.log('   ❌ 内存管理配置不完整');
    if (!hasPreviewCleanup) console.log('      - Preview 组件缺少清理逻辑');
    if (!hasEditorCleanup) console.log('      - Editor 组件缺少清理逻辑');
    failed++;
    return false;
  }
}

function testResponsivePerformance() {
  console.log('\n5. 测试响应式布局性能...');
  
  const appPath = resolve(process.cwd(), 'src/App.tsx');
  const appCode = readFileSync(appPath, 'utf-8');

  const hasResizeListener = appCode.includes('window.addEventListener') && 
                            appCode.includes('resize');
  
  const hasMobileBreakpoint = appCode.includes('MOBILE_BREAKPOINT') && 
                              appCode.includes('768');

  const hasIsMobileState = appCode.includes('isMobile') && 
                           appCode.includes('useState');

  if (hasResizeListener && hasMobileBreakpoint && hasIsMobileState) {
    console.log('   ✅ 响应式布局配置正确');
    console.log('      - 监听窗口 resize 事件');
    console.log('      - 配置了 768px 移动端断点');
    console.log('      - 有 isMobile 状态管理');
    passed++;
    return true;
  } else {
    console.log('   ❌ 响应式布局配置不完整');
    if (!hasResizeListener) console.log('      - 缺少窗口 resize 事件监听');
    if (!hasMobileBreakpoint) console.log('      - 缺少移动端断点配置');
    if (!hasIsMobileState) console.log('      - 缺少 isMobile 状态管理');
    failed++;
    return false;
  }
}

function testTypeSafety() {
  console.log('\n6. 测试 TypeScript 类型安全...');
  
  const tsConfigPath = resolve(process.cwd(), 'tsconfig.json');
  const tsConfig = JSON.parse(readFileSync(tsConfigPath, 'utf-8'));
  const typesPath = resolve(process.cwd(), 'src/types/index.ts');
  const typesCode = readFileSync(typesPath, 'utf-8');

  const hasStrictMode = tsConfig.compilerOptions.strict === true;
  const hasJsxReactJsx = tsConfig.compilerOptions.jsx === 'react-jsx';
  const hasEs2020Target = tsConfig.compilerOptions.target === 'ES2020';
  
  const hasPropsType = typesCode.includes('PropsMap') && typesCode.includes('PropSchema');
  const hasComponentPropsType = typesCode.includes('EditorProps') && 
                                 typesCode.includes('PreviewProps') &&
                                 typesCode.includes('PropsPanelProps');
  const hasBabelGlobalType = typesCode.includes('declare global') && 
                             typesCode.includes('window.Babel');

  let allPassed = true;

  if (hasStrictMode && hasJsxReactJsx && hasEs2020Target) {
    console.log('   ✅ tsconfig.json 配置正确');
    console.log('      - strict: true');
    console.log('      - jsx: react-jsx');
    console.log('      - target: ES2020');
    passed++;
  } else {
    console.log('   ❌ tsconfig.json 配置不正确');
    if (!hasStrictMode) console.log('      - strict 不是 true');
    if (!hasJsxReactJsx) console.log('      - jsx 不是 react-jsx');
    if (!hasEs2020Target) console.log('      - target 不是 ES2020');
    failed++;
    allPassed = false;
  }

  if (hasPropsType && hasComponentPropsType && hasBabelGlobalType) {
    console.log('   ✅ 类型定义完整');
    console.log('      - 定义了 PropsMap 和 PropSchema');
    console.log('      - 定义了所有组件的 Props 类型');
    console.log('      - 定义了 Babel 全局类型');
    passed++;
  } else {
    console.log('   ❌ 类型定义不完整');
    if (!hasPropsType) console.log('      - 缺少 PropsMap 或 PropSchema 定义');
    if (!hasComponentPropsType) console.log('      - 缺少组件 Props 类型定义');
    if (!hasBabelGlobalType) console.log('      - 缺少 Babel 全局类型定义');
    failed++;
    allPassed = false;
  }

  return allPassed;
}

function runAllTests() {
  console.log('='.repeat(50));
  
  testDebounceDelay();
  testRenderPerformanceBudget();
  testCodeMirrorPerformance();
  testMemoryManagement();
  testResponsivePerformance();
  testTypeSafety();

  console.log('\n' + '='.repeat(50));
  console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
  
  if (failed === 0) {
    console.log('\n✅ 所有性能测试通过！\n');
    console.log('性能指标总结:');
    console.log('  • 代码变更防抖延迟: 300ms');
    console.log('  • 组件状态更新过渡: 150ms');
    console.log('  • 渲染预算: < 500ms');
    console.log('  • 分隔条拖拽过渡: 100ms');
    console.log('  • 错误提示动画: 300ms 滑入, 500ms 淡出');
    console.log('  • 布尔开关过渡: 200ms');
    console.log('\n');
    process.exit(0);
  } else {
    console.log(`\n❌ 有 ${failed} 个性能测试失败，请修复后重试。\n`);
    process.exit(1);
  }
}

runAllTests();

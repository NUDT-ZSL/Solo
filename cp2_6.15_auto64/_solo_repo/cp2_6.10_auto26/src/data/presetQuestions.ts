import type { Question } from '@/types';
import { generateId } from '@/utils/storage';

const now = Date.now();

export const presetQuestions: Question[] = [
  {
    id: generateId(),
    type: 'single',
    stem: 'Vue 3 中，以下哪个组合式 API 用于创建响应式引用？',
    options: [
      { key: 'A', content: 'ref()' },
      { key: 'B', content: 'reactive()' },
      { key: 'C', content: 'computed()' },
      { key: 'D', content: 'watch()' }
    ],
    answer: 'A',
    analysis: '<strong>ref()</strong> 用于创建基本类型的响应式引用，返回一个包含 <code>.value</code> 属性的对象。reactive() 适合对象和数组，computed() 用于计算属性，watch() 用于监听变化。',
    createdAt: now,
    difficulty: 'easy',
    tags: ['Vue3', 'Composition API']
  },
  {
    id: generateId(),
    type: 'single',
    stem: 'TypeScript 中，用于描述对象结构关键字是？',
    options: [
      { key: 'A', content: 'class' },
      { key: 'B', content: 'interface' },
      { key: 'C', content: 'type 只能' },
      { key: 'D', content: 'struct' }
    ],
    answer: 'B',
    analysis: '<strong>interface</strong> 是 TypeScript 中描述对象结构的核心关键字。interface 支持声明合并，可多次声明同名接口自动合并。type 别名也可描述对象，但不支持声明合并。',
    createdAt: now + 1,
    difficulty: 'easy',
    tags: ['TypeScript']
  },
  {
    id: generateId(),
    type: 'judge',
    stem: 'Pinia 是 Vue 3 官方推荐的状态管理库，可以替代 Vuex。',
    options: [
      { key: 'A', content: '正确' },
      { key: 'B', content: '错误' }
    ],
    answer: 'A',
    analysis: '<strong>正确。</strong>Pinia 已成为 Vue 生态的官方状态管理方案，Vuex 5 的核心设计即基于 Pinia。Pinia 支持 Composition API、更好的 TypeScript 推断和更轻量的 API。',
    createdAt: now + 2,
    difficulty: 'easy',
    tags: ['Pinia']
  },
  {
    id: generateId(),
    type: 'multiple',
    stem: '以下哪些是 Vite 5 的核心特性？（多选）',
    options: [
      { key: 'A', content: '基于 ES Module 的极速冷启动' },
      { key: 'B', content: '原生支持 Rollup 插件 API' },
      { key: 'C', content: '内置 TypeScript 类型检查' },
      { key: 'D', content: '热模块替换（HMR）' },
      { key: 'E', content: '自动生成 HTML 文件' }
    ],
    answer: ['A', 'B', 'D'],
    analysis: '<strong>正确答案：ABD。</strong><br/>• <b>A</b>：Vite 使用原生 ESM，按需编译，冷启动极快；<br/>• <b>B</b>：Vite 5 的插件 API 全面兼容 Rollup 插件；<br/>• <b>D</b>：HMR 热更新是 Vite 核心能力之一；<br/>• <b>C</b>：TS 类型检查需 vue-tsc 单独执行，非内置；<br/>• <b>E</b>：Vite 不会自动生成 HTML，需手动提供 index.html。',
    createdAt: now + 3,
    difficulty: 'medium',
    tags: ['Vite', '构建工具']
  },
  {
    id: generateId(),
    type: 'single',
    stem: 'CSS 中 transform: scale(1.02) 的效果是？',
    options: [
      { key: 'A', content: '元素旋转 1.02 度' },
      { key: 'B', content: '元素等比放大到 102%' },
      { key: 'C', content: '元素水平位移 1.02px' },
      { key: 'D', content: '元素透明度变为 1.02' }
    ],
    answer: 'B',
    analysis: '<strong>scale()</strong> 是 CSS 2D 变换函数，用于改变元素尺寸。<code>scale(1.02)</code> 表示在 X 和 Y 方向上同时放大至原始尺寸的 102%，常用于 hover 微交互效果。',
    createdAt: now + 4,
    difficulty: 'easy',
    tags: ['CSS']
  },
  {
    id: generateId(),
    type: 'multiple',
    stem: 'LocalStorage 相比 SessionStorage 的特点包括？（多选）',
    options: [
      { key: 'A', content: '数据永久保存，除非手动清除' },
      { key: 'B', content: '数据在同源的多个标签页间共享' },
      { key: 'C', content: '浏览器关闭后数据立即丢失' },
      { key: 'D', content: '存储容量通常约为 5MB' },
      { key: 'E', content: '支持自动过期时间设置' }
    ],
    answer: ['A', 'B', 'D'],
    analysis: '<strong>正确答案：ABD。</strong><br/>• <b>A、B</b>：LocalStorage 持久保存且同源共享；<br/>• <b>C</b>：是 SessionStorage 特点；<br/>• <b>D</b>：HTML5 规范建议 5MB；<br/>• <b>E</b>：两者均不支持自动过期，需手动实现。',
    createdAt: now + 5,
    difficulty: 'medium',
    tags: ['Web API', '浏览器']
  },
  {
    id: generateId(),
    type: 'judge',
    stem: '在 Vue 3 中，template 里只能有一个根节点。',
    options: [
      { key: 'A', content: '正确' },
      { key: 'B', content: '错误' }
    ],
    answer: 'B',
    analysis: '<strong>错误。</strong>Vue 3 的模板支持多个根节点（Fragment），这是 Vue 3 相比 Vue 2 的重要改进之一，不再需要强制包裹 div。',
    createdAt: now + 6,
    difficulty: 'easy',
    tags: ['Vue3']
  },
  {
    id: generateId(),
    type: 'single',
    stem: 'Canvas 2D 中，绘制渐变柱状图需要使用哪个对象？',
    options: [
      { key: 'A', content: 'CanvasGradient' },
      { key: 'B', content: 'CanvasPattern' },
      { key: 'C', content: 'ImageData' },
      { key: 'D', content: 'Path2D' }
    ],
    answer: 'A',
    analysis: '<strong>CanvasGradient</strong> 用于创建渐变效果，通过 <code>ctx.createLinearGradient()</code> 创建，再用 <code>addColorStop()</code> 设置渐变色节点，最后赋值给 <code>ctx.fillStyle</code> 进行填充。',
    createdAt: now + 7,
    difficulty: 'medium',
    tags: ['Canvas', '前端图形']
  },
  {
    id: generateId(),
    type: 'multiple',
    stem: '以下哪些方法可以优化 Web 应用首屏加载性能？（多选）',
    options: [
      { key: 'A', content: '代码分割（Code Splitting）' },
      { key: 'B', content: '使用 CDN 加速静态资源' },
      { key: 'C', content: '启用 Gzip / Brotli 压缩' },
      { key: 'D', content: '图片懒加载（Lazy Loading）' },
      { key: 'E', content: '将所有脚本放在 &lt;head&gt; 中同步加载' }
    ],
    answer: ['A', 'B', 'C', 'D'],
    analysis: '<strong>正确答案：ABCD。</strong><br/>• <b>A</b>：代码分割按需加载，减小首包；<br/>• <b>B</b>：CDN 缩短传输距离；<br/>• <b>C</b>：压缩减少传输体积；<br/>• <b>D</b>：图片懒加载减少资源竞争；<br/>• <b>E</b>：会阻塞 DOM 渲染，严重拖慢首屏，应使用 defer 或 async。',
    createdAt: now + 8,
    difficulty: 'medium',
    tags: ['性能优化']
  },
  {
    id: generateId(),
    type: 'single',
    stem: 'Vue Router 4 中，获取动态路由参数 :id 的方式是？',
    options: [
      { key: 'A', content: 'this.$route.params.id' },
      { key: 'B', content: 'useRoute().params.id' },
      { key: 'C', content: 'useRouter().query.id' },
      { key: 'D', content: 'window.$router.getParam("id")' }
    ],
    answer: 'B',
    analysis: '<strong>Vue Router 4</strong> 在 Composition API 中通过 <code>useRoute()</code> 获取路由对象，动态路由参数在 <code>params</code> 中。A 是 Options API 写法，C 的 query 是查询参数而非路径参数。',
    createdAt: now + 9,
    difficulty: 'easy',
    tags: ['Vue Router']
  },
  {
    id: generateId(),
    type: 'judge',
    stem: 'requestAnimationFrame 的回调频率与显示器刷新率同步，通常为 60Hz。',
    options: [
      { key: 'A', content: '正确' },
      { key: 'B', content: '错误' }
    ],
    answer: 'A',
    analysis: '<strong>正确。</strong>rAF 由浏览器调度，在每一帧绘制前触发回调，与显示器刷新率（通常60fps）同步。相比 setInterval，rAF 在标签页不可见时会暂停，更节省性能。',
    createdAt: now + 10,
    difficulty: 'medium',
    tags: ['浏览器', '性能优化']
  },
  {
    id: generateId(),
    type: 'single',
    stem: 'SCSS 中 @use 和 @import 的主要区别是？',
    options: [
      { key: 'A', content: '@use 有命名空间且模块只加载一次' },
      { key: 'B', content: '@import 支持变量传递' },
      { key: 'C', content: '@use 已被废弃' },
      { key: 'D', content: '两者完全等价' }
    ],
    answer: 'A',
    analysis: '<strong>@use</strong> 是 Sass 现代模块化方案，每个模块默认只加载一次，且提供命名空间（可通过 as 重命名）避免变量冲突。@import 已被官方标记为不推荐。',
    createdAt: now + 11,
    difficulty: 'medium',
    tags: ['SCSS', '样式']
  },
  {
    id: generateId(),
    type: 'multiple',
    stem: 'Pinia Store 中支持的核心概念有？（多选）',
    options: [
      { key: 'A', content: 'State：状态数据' },
      { key: 'B', content: 'Getters：计算属性' },
      { key: 'C', content: 'Actions：同步/异步方法' },
      { key: 'D', content: 'Mutations：同步修改（必需）' },
      { key: 'E', content: 'Plugins：插件系统' }
    ],
    answer: ['A', 'B', 'C', 'E'],
    analysis: '<strong>正确答案：ABCE。</strong><br/>Pinia 核心概念为 State、Getters、Actions（可同步可异步），且支持插件扩展。<b>D</b> 是 Vuex 的概念，Pinia 中已移除 Mutations，Actions 直接修改状态。',
    createdAt: now + 12,
    difficulty: 'medium',
    tags: ['Pinia', '状态管理']
  },
  {
    id: generateId(),
    type: 'single',
    stem: 'TypeScript strict 模式不包含以下哪项配置？',
    options: [
      { key: 'A', content: 'strictNullChecks' },
      { key: 'B', content: 'noImplicitAny' },
      { key: 'C', content: 'strictPropertyInitialization' },
      { key: 'D', content: 'noEmitOnError' }
    ],
    answer: 'D',
    analysis: '<strong>strict: true</strong> 是一系列严格检查的集合，包括 strictNullChecks、noImplicitAny、strictPropertyInitialization 等。noEmitOnError 是控制出错时是否输出 JS，不属于严格模式系列。',
    createdAt: now + 13,
    difficulty: 'hard',
    tags: ['TypeScript']
  },
  {
    id: generateId(),
    type: 'judge',
    stem: '在 CSS 中，设置了 transform 的元素会自动创建新的层叠上下文。',
    options: [
      { key: 'A', content: '正确' },
      { key: 'B', content: '错误' }
    ],
    answer: 'A',
    analysis: '<strong>正确。</strong>transform 值非 none 的元素会创建新的层叠上下文（stacking context），这可能影响 z-index 的层叠表现。其他常见触发条件还有 opacity<1、filter、will-change 等。',
    createdAt: now + 14,
    difficulty: 'hard',
    tags: ['CSS', '层叠上下文']
  },
  {
    id: generateId(),
    type: 'single',
    stem: '以下哪种数据结构最适合实现 LRU 缓存淘汰算法？',
    options: [
      { key: 'A', content: '数组 + 二分查找' },
      { key: 'B', content: '哈希表 + 双向链表' },
      { key: 'C', content: '二叉搜索树' },
      { key: 'D', content: '优先队列（堆）' }
    ],
    answer: 'B',
    analysis: '<strong>哈希表 + 双向链表</strong> 是 LRU（最近最少使用）的经典实现。哈希表 O(1) 查找节点，双向链表 O(1) 完成节点移动/删除。两者结合实现 get/put 均 O(1)。',
    createdAt: now + 15,
    difficulty: 'hard',
    tags: ['数据结构', '算法']
  },
  {
    id: generateId(),
    type: 'multiple',
    stem: '关于 HTML meta viewport，以下说法正确的有？（多选）',
    options: [
      { key: 'A', content: 'width=device-width 使布局视口等于设备宽度' },
      { key: 'B', content: 'initial-scale=1.0 表示初始不缩放' },
      { key: 'C', content: 'maximum-scale=1.0 禁止用户双指缩放' },
      { key: 'D', content: 'user-scalable=no 会被浏览器强制忽略' },
      { key: 'E', content: 'viewport 对桌面浏览器同样生效' }
    ],
    answer: ['A', 'B', 'C', 'D'],
    analysis: '<strong>正确答案：ABCD。</strong><br/>• <b>E</b>：viewport meta 仅对移动端浏览器生效，桌面端忽略；<br/>• <b>D</b>：部分现代浏览器（如 Safari）会强制忽略 user-scalable=no 以保证可访问性。',
    createdAt: now + 16,
    difficulty: 'medium',
    tags: ['HTML', '移动端']
  },
  {
    id: generateId(),
    type: 'single',
    stem: 'Promise.all() 中若有一个 Promise reject，整体行为是？',
    options: [
      { key: 'A', content: '继续等待其余 Promise 完成' },
      { key: 'B', content: '立即 reject，结果为第一个 reject 的原因' },
      { key: 'C', content: '返回一个数组，包含成功结果和错误原因' },
      { key: 'D', content: '抛出运行时异常终止脚本' }
    ],
    answer: 'B',
    analysis: '<strong>Promise.all()</strong> 是失败优先（fail-fast）策略：任一 Promise reject，整体立即 reject；所有都 resolve 才 resolve 为结果数组。若需要等待所有完成，应使用 <code>Promise.allSettled()</code>。',
    createdAt: now + 17,
    difficulty: 'medium',
    tags: ['JavaScript', '异步']
  },
  {
    id: generateId(),
    type: 'judge',
    stem: 'Vue 3 defineProps 宏返回的 props 对象是只读的。',
    options: [
      { key: 'A', content: '正确' },
      { key: 'B', content: '错误' }
    ],
    answer: 'A',
    analysis: '<strong>正确。</strong>Vue 遵循单向数据流原则，子组件不能直接修改 props。defineProps 返回的代理对象上的属性被设为只读，直接赋值会在开发模式下警告，并在严格模式下静默失败。',
    createdAt: now + 18,
    difficulty: 'easy',
    tags: ['Vue3', 'Props']
  },
  {
    id: generateId(),
    type: 'single',
    stem: 'Vite 开发模式下处理 TypeScript 的方式是？',
    options: [
      { key: 'A', content: '先用 tsc 编译再执行' },
      { key: 'B', content: '用 esbuild 转译（移除类型，不检查）' },
      { key: 'C', content: '浏览器原生支持，无需处理' },
      { key: 'D', content: '用 Babel 完整编译' }
    ],
    answer: 'B',
    analysis: '<strong>Vite 开发模式</strong>下使用 esbuild 将 TS → JS（仅移除类型注解，零类型检查），速度极快。完整类型检查通过运行 <code>vue-tsc --noEmit</code> 单独执行（通常在构建脚本中）。',
    createdAt: now + 19,
    difficulty: 'medium',
    tags: ['Vite', 'TypeScript']
  }
];

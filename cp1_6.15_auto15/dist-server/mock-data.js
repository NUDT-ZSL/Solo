"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUESTION_BANK = exports.KNOWLEDGE_TAGS = void 0;
exports.getQuestionsByFilter = getQuestionsByFilter;
exports.getBalancedQuestions = getBalancedQuestions;
exports.getWeakPointTags = getWeakPointTags;
const uuid_1 = require("uuid");
exports.KNOWLEDGE_TAGS = [
    'JavaScript基础', 'TypeScript进阶', 'React框架', 'Node.js服务端',
    'CSS布局与动画', 'HTTP与网络', '数据结构与算法', '设计模式',
    '数据库基础', '安全与性能优化',
];
const CORE = [
    { q: 'typeof null返回？', opts: ['"null"', '"object"', '"undefined"', '"boolean"'], ans: 1, exp: 'JS历史bug，返回"object"', tag: 'JavaScript基础', diff: 1 },
    { q: '哪个不是JS基本类型？', opts: ['Symbol', 'BigInt', 'Array', 'undefined'], ans: 2, exp: 'Array是引用类型', tag: 'JavaScript基础', diff: 1 },
    { q: 'let和var区别？', opts: ['let无块作用域', 'let有块作用域', 'var有块作用域', 'let可重复声明'], ans: 1, exp: 'let具有块级作用域', tag: 'JavaScript基础', diff: 1 },
    { q: '===和==区别？', opts: ['===比较值和类型', '==比较值和类型', '无区别', '===只能比数字'], ans: 0, exp: '===严格相等', tag: 'JavaScript基础', diff: 1 },
    { q: 'Array.isArray([])返回？', opts: ['true', 'false', 'undefined', '报错'], ans: 0, exp: '判断是否为数组', tag: 'JavaScript基础', diff: 1 },
    { q: '哪个方法改变原数组？', opts: ['map()', 'filter()', 'push()', 'concat()'], ans: 2, exp: 'push改变原数组', tag: 'JavaScript基础', diff: 2 },
    { q: '闭包是什么？', opts: ['设计模式', '函数与词法环境组合', '数据结构', '异步方式'], ans: 1, exp: '闭包组合函数与词法环境', tag: 'JavaScript基础', diff: 2 },
    { q: 'Promise三种状态？', opts: ['s/p/e', 'pending/fulfilled/rejected', 'i/r/d', 'o/c'], ans: 1, exp: 'Promise三态', tag: 'JavaScript基础', diff: 1 },
    { q: '事件冒泡顺序？', opts: ['外到内', '内到外', '随机', '仅捕获'], ans: 1, exp: '事件从内向外冒泡', tag: 'JavaScript基础', diff: 2 },
    { q: '阻止事件冒泡用？', opts: ['preventDefault', 'stopPropagation', 'cancelBubble', 'return false'], ans: 1, exp: 'stopPropagation阻止冒泡', tag: 'JavaScript基础', diff: 2 },
    { q: 'setTimeout回调属于？', opts: ['同步', '微任务', '宏任务', '渲染'], ans: 2, exp: 'setTimeout属于宏任务', tag: 'JavaScript基础', diff: 3 },
    { q: '创建不可变变量用？', opts: ['var', 'let', 'const', 'static'], ans: 2, exp: 'const不可重新赋值', tag: 'JavaScript基础', diff: 1 },
    { q: '箭头函数特点？', opts: ['有自己this', '无自己this', '可作构造函数', '有arguments'], ans: 1, exp: '箭头函数无独立this', tag: 'JavaScript基础', diff: 2 },
    { q: 'NaN === NaN？', opts: ['true', 'false', 'undefined', '报错'], ans: 1, exp: 'NaN不等于自身', tag: 'JavaScript基础', diff: 2 },
    { q: 'JS是什么线程？', opts: ['多', '单', '双', '取决于环境'], ans: 1, exp: 'JS单线程', tag: 'JavaScript基础', diff: 1 },
    { q: 'Map和Object区别？', opts: ['Map键仅字符串', 'Map键任意类型', 'Map无size', 'Object可迭代'], ans: 1, exp: 'Map键可为任意类型', tag: 'JavaScript基础', diff: 2 },
    { q: 'Set特点？', opts: ['允许重复', '值唯一', '键值对', '仅字符串'], ans: 1, exp: 'Set值唯一自动去重', tag: 'JavaScript基础', diff: 1 },
    { q: '模板字面量语法？', opts: ['"${x}"', '`${x}`', "'${x}'", '${x}'], ans: 1, exp: '反引号+${}', tag: 'JavaScript基础', diff: 1 },
    { q: 'async/await本质？', opts: ['新线程', 'Generator语法糖', '回调封装', 'Worker'], ans: 1, exp: 'Generator+Promise语法糖', tag: 'JavaScript基础', diff: 3 },
    { q: '哪个非ES6特性？', opts: ['箭头函数', '解构', 'try/catch', 'Promise'], ans: 2, exp: 'try/catch早于ES6', tag: 'JavaScript基础', diff: 2 },
    { q: 'Proxy作用？', opts: ['浅拷贝', '拦截对象操作', '深拷贝', '序列化'], ans: 1, exp: 'Proxy拦截对象操作', tag: 'JavaScript基础', diff: 3 },
    { q: 'Symbol用途？', opts: ['全局变量', '唯一标识符', '随机数', '加密'], ans: 1, exp: '创建唯一不可变标识符', tag: 'JavaScript基础', diff: 2 },
    { q: '展开运算符？', opts: ['...', '::', '**', '??'], ans: 0, exp: '展开运算符是...', tag: 'JavaScript基础', diff: 1 },
    { q: '深拷贝简单方法？', opts: ['Object.assign', '展开', 'JSON序列化', 'Array.from'], ans: 2, exp: 'JSON.parse(JSON.stringify())', tag: 'JavaScript基础', diff: 2 },
    { q: '微任务是？', opts: ['setTimeout', 'Promise.then', 'setInterval', 'I/O'], ans: 1, exp: 'Promise.then是微任务', tag: 'JavaScript基础', diff: 3 },
    { q: 'Optional chaining语法？', opts: ['obj?.prop', 'obj?.prop?', 'obj!.prop', 'obj->prop'], ans: 0, exp: '可选链语法?.', tag: 'JavaScript基础', diff: 2 },
    { q: 'for...of遍历什么？', opts: ['普通对象', '可迭代对象', 'null', 'undefined'], ans: 1, exp: 'for...of遍历可迭代对象', tag: 'JavaScript基础', diff: 2 },
    { q: 'WeakMap键特点？', opts: ['任意类型', '只能是对象', '仅字符串', '仅数字'], ans: 1, exp: 'WeakMap键必须是对象', tag: 'JavaScript基础', diff: 3 },
    { q: 'Object.assign用途？', opts: ['合并对象', '深拷贝', '创建类', '定义常量'], ans: 0, exp: '合并对象属性', tag: 'JavaScript基础', diff: 2 },
    { q: 'for...in遍历什么？', opts: ['数组值', '对象可枚举键', 'Map值', 'Set值'], ans: 1, exp: 'for...in遍历可枚举属性键', tag: 'JavaScript基础', diff: 2 },
    { q: 'interface和type区别？', opts: ['interface不能继承', 'type可声明联合类型', 'interface不能描述对象', 'type可扩展'], ans: 1, exp: 'type可声明联合', tag: 'TypeScript进阶', diff: 1 },
    { q: '泛型作用？', opts: ['固定类型函数', '类型可复用组件', '替代any', '简化代码'], ans: 1, exp: '泛型类型复用', tag: 'TypeScript进阶', diff: 2 },
    { q: 'keyof作用？', opts: ['获取对象值', '获取对象键联合类型', '删除属性', '检查键'], ans: 1, exp: 'keyof获取键的联合类型', tag: 'TypeScript进阶', diff: 2 },
    { q: '条件类型语法？', opts: ['T extends U ? X : Y', 'T instanceof ? X : Y', 'if T U then X', 'T ? X : Y'], ans: 0, exp: 'T extends U ? X : Y', tag: 'TypeScript进阶', diff: 3 },
    { q: 'Partial<T>作用？', opts: ['属性只读', '属性可选', '属性必选', '删除属性'], ans: 1, exp: '属性变可选', tag: 'TypeScript进阶', diff: 1 },
    { q: 'Required<T>作用？', opts: ['属性可选', '属性必选', '属性只读', '添加属性'], ans: 1, exp: '可选变必选', tag: 'TypeScript进阶', diff: 1 },
    { q: 'Pick<T,K>作用？', opts: ['删除K属性', '选取K属性', '合并T和K', '转换T'], ans: 1, exp: '选取T中K属性', tag: 'TypeScript进阶', diff: 2 },
    { q: 'Omit<T,K>作用？', opts: ['选取K属性', '排除K属性', '合并T和K', '重命名'], ans: 1, exp: '排除T中K属性', tag: 'TypeScript进阶', diff: 2 },
    { q: 'enum默认值类型？', opts: ['字符串', '数字', '布尔', '任意'], ans: 1, exp: '数字枚举默认0递增', tag: 'TypeScript进阶', diff: 1 },
    { q: 'as const作用？', opts: ['转const声明', '推断最具体字面量类型', '变量只读', '常量'], ans: 1, exp: '推断字面量类型', tag: 'TypeScript进阶', diff: 2 },
    { q: 'never类型？', opts: ['任意', '空', '永不存在值', 'undefined'], ans: 2, exp: '永不存在值的类型', tag: 'TypeScript进阶', diff: 3 },
    { q: 'unknown和any区别？', opts: ['相同', 'unknown不可直接操作', 'any不可操作', 'unknown仅赋值any'], ans: 1, exp: 'unknown类型安全的any', tag: 'TypeScript进阶', diff: 2 },
    { q: 'Readonly<T>作用？', opts: ['属性可选', '属性只读', '删除属性', '添加'], ans: 1, exp: '属性设只读', tag: 'TypeScript进阶', diff: 1 },
    { q: 'Record<K,T>作用？', opts: ['只读对象', '键K值T的对象类型', '创建数组', '枚举'], ans: 1, exp: 'Record构造键值对象类型', tag: 'TypeScript进阶', diff: 2 },
    { q: '交叉类型符号？', opts: ['|', '&', '+', '^'], ans: 1, exp: '交叉类型用&', tag: 'TypeScript进阶', diff: 1 },
    { q: '联合类型符号？', opts: ['&', '|', '+', '^'], ans: 1, exp: '联合类型用|', tag: 'TypeScript进阶', diff: 1 },
    { q: 'abstract用途？', opts: ['常量', '抽象类或方法', '静态', '私有'], ans: 1, exp: '抽象类或抽象方法', tag: 'TypeScript进阶', diff: 2 },
    { q: 'implements用途？', opts: ['继承类', '实现接口', '模块', '导出'], ans: 1, exp: '类实现接口', tag: 'TypeScript进阶', diff: 1 },
    { q: '声明文件后缀？', opts: ['.ts', '.d.ts', '.js', '.tsx'], ans: 1, exp: '.d.ts声明文件', tag: 'TypeScript进阶', diff: 1 },
    { q: '装饰器可应用于？', opts: ['仅类', '仅函数', '类/方法/属性/参数', '仅属性'], ans: 2, exp: '装饰器多目标应用', tag: 'TypeScript进阶', diff: 2 },
    { q: '正确泛型函数？', opts: ['f<T>(arg:T):T', 'f(arg:any):any', 'f<T>(arg:any):T', 'f(arg:T):T'], ans: 0, exp: '泛型参数< T >', tag: 'TypeScript进阶', diff: 2 },
    { q: '类型断言语法？', opts: ['value as Type', 'value.is(Type)', 'value.to(Type)', 'cast(value)'], ans: 0, exp: 'as语法推荐', tag: 'TypeScript进阶', diff: 1 },
    { q: '映射类型语法？', opts: ['[K in keyof T]: T[K]', '[K of T]: T[K]', 'for(K in T)', 'map(T,K)'], ans: 0, exp: 'in keyof遍历', tag: 'TypeScript进阶', diff: 3 },
    { q: 'infer关键字用在哪？', opts: ['变量', '条件类型中推断', '函数参数', '泛型约束'], ans: 1, exp: '条件类型中推断类型', tag: 'TypeScript进阶', diff: 3 },
    { q: 'Extract<T,U>作用？', opts: ['排除U', '提取可赋值给U的类型', '合并', '交叉'], ans: 1, exp: '提取符合U的类型', tag: 'TypeScript进阶', diff: 3 },
    { q: 'namespace用途？', opts: ['创建模块', '组织代码避免命名冲突', '创建类', '声明全局'], ans: 1, exp: '命名空间组织代码', tag: 'TypeScript进阶', diff: 2 },
    { q: 'strict模式？', opts: ['仅null检查', '包含多项严格检查', '仅类型', '仅语法'], ans: 1, exp: '启用全部严格检查', tag: 'TypeScript进阶', diff: 1 },
    { q: 'NonNullable<T>作用？', opts: ['属性必选', '排除null和undefined', '属性只读', '添加'], ans: 1, exp: '排除null和undefined', tag: 'TypeScript进阶', diff: 2 },
    { q: '函数重载作用？', opts: ['性能', '同一函数多种类型签名', '功能', '简化'], ans: 1, exp: '多种类型签名', tag: 'TypeScript进阶', diff: 2 },
    { q: 'Exclude<T,U>作用？', opts: ['提取U', '排除可赋值给U的类型', '合并', '交集'], ans: 1, exp: '排除T中U的类型', tag: 'TypeScript进阶', diff: 2 },
    { q: 'React key作用？', opts: ['美化', '识别列表元素变化', '设置id', '控制顺序'], ans: 1, exp: 'key帮助diff', tag: 'React框架', diff: 1 },
    { q: 'useState返回？', opts: ['对象', '[state, setState]', '函数', '字符串'], ans: 1, exp: '数组形式返回', tag: 'React框架', diff: 1 },
    { q: 'useEffect清理时机？', opts: ['挂载', '卸载或下次effect前', '每次渲染', '仅首次'], ans: 1, exp: '清理函数时机', tag: 'React框架', diff: 2 },
    { q: '虚拟DOM优点？', opts: ['直接操作DOM', 'diff最小化DOM操作', '替代DOM', '不需要DOM'], ans: 1, exp: '最小化实际DOM操作', tag: 'React框架', diff: 2 },
    { q: 'React.memo作用？', opts: ['日志', '浅比较props优化渲染', '备忘录', '序列化'], ans: 1, exp: 'props浅比较跳过渲染', tag: 'React框架', diff: 2 },
    { q: 'useCallback作用？', opts: ['创建回调', '缓存函数引用', '调用API', '处理事件'], ans: 1, exp: '缓存函数引用', tag: 'React框架', diff: 2 },
    { q: 'useMemo作用？', opts: ['记忆函数', '缓存计算结果', '管理状态', '副作用'], ans: 1, exp: '缓存昂贵计算', tag: 'React框架', diff: 2 },
    { q: '受控组件？', opts: ['React控制状态的表单', 'DOM控制', '无状态', '纯展示'], ans: 0, exp: 'React状态控制值', tag: 'React框架', diff: 1 },
    { q: 'refs作用？', opts: ['状态', '访问DOM节点', '副作用', '优化'], ans: 1, exp: '访问DOM或跨渲染存值', tag: 'React框架', diff: 2 },
    { q: 'Context API用途？', opts: ['通信', '跨层级传数据', '路由', 'HTTP'], ans: 1, exp: '跨层级数据共享', tag: 'React框架', diff: 2 },
    { q: 'Fiber架构？', opts: ['新组件', '可中断渲染协调算法', '路由', '状态管理'], ans: 1, exp: '可中断异步渲染', tag: 'React框架', diff: 3 },
    { q: 'React.lazy作用？', opts: ['延迟执行', '动态导入代码分割', '延迟渲染', '懒加载图片'], ans: 1, exp: '动态导入组件', tag: 'React框架', diff: 2 },
    { q: 'Suspense作用？', opts: ['延迟渲染', '加载中显示fallback', '暂停', '错误处理'], ans: 1, exp: '加载时显示占位', tag: 'React框架', diff: 2 },
    { q: 'Fragment作用？', opts: ['创建节点', '分组不加DOM节点', '删除', '替换'], ans: 1, exp: '分组不增加DOM', tag: 'React框架', diff: 1 },
    { q: 'useReducer适合？', opts: ['简单状态', '多子值复杂状态逻辑', 'API', 'DOM'], ans: 1, exp: '管理复杂状态逻辑', tag: 'React框架', diff: 2 },
    { q: 'Portal作用？', opts: ['路由', '渲染到DOM外节点', '通信', '状态'], ans: 1, exp: '渲染到父DOM外', tag: 'React框架', diff: 3 },
    { q: 'props和state区别？', opts: ['相同', 'props只读传入state内部', 'state只读', '都不可变'], ans: 1, exp: 'props外传入，state内部', tag: 'React框架', diff: 1 },
    { q: 'useRef和useState区别？', opts: ['相同', 'useRef变化不触发渲染', 'useRef不能存值', 'useState不渲染'], ans: 1, exp: 'useRef变更不渲染', tag: 'React框架', diff: 2 },
    { q: 'createRoot特点？', opts: ['相同', '启用并发特性', '更快', 'SSR专用'], ans: 1, exp: 'React 18并发渲染', tag: 'React框架', diff: 2 },
    { q: 'StrictMode作用？', opts: ['性能', '开发检测不安全代码', '类型', '压缩'], ans: 1, exp: '开发模式检测问题', tag: 'React框架', diff: 1 },
    { q: 'HOC定义？', opts: ['返回组件', '接收组件返回新组件', '类继承', '组合'], ans: 1, exp: '接收组件返回组件', tag: 'React框架', diff: 2 },
    { q: 'useLayoutEffect特点？', opts: ['相同', 'DOM更新后同步执行', 'useEffect同步', '无清理'], ans: 1, exp: '同步DOM更新后执行', tag: 'React框架', diff: 3 },
    { q: '错误边界作用？', opts: ['防错', '捕获子组件错误降级UI', '自动修复', '日志'], ans: 1, exp: '捕获错误显示降级UI', tag: 'React框架', diff: 2 },
    { q: 'JSX本质？', opts: ['HTML模板', 'React.createElement语法糖', '独立语言', 'CSS-in-JS'], ans: 1, exp: '编译为createElement', tag: 'React框架', diff: 1 },
    { q: 'forwardRef作用？', opts: ['转发HTTP', '转发ref到子组件', '转发props', '转发事件'], ans: 1, exp: '父组件传递ref给子组件', tag: 'React框架', diff: 2 },
    { q: '批量更新？', opts: ['合并渲染', '多状态更新合并一次渲染', '延迟', '并行'], ans: 1, exp: '合并setState减少渲染', tag: 'React框架', diff: 2 },
    { q: '合成事件？', opts: ['相同', '统一跨浏览器差异', '原生性能好', '不冒泡'], ans: 1, exp: '浏览器事件封装', tag: 'React框架', diff: 2 },
    { q: 'useTransition作用？', opts: ['动画', '标记非紧急更新', '路由', '状态'], ans: 1, exp: '并发模式非紧急更新', tag: 'React框架', diff: 3 },
    { q: 'useDeferredValue作用？', opts: ['延迟销毁', '延迟更新非紧急值', '延迟渲染', '延迟挂载'], ans: 1, exp: '延迟值更新', tag: 'React框架', diff: 3 },
    { q: 'useId作用？', opts: ['生成key', '生成唯一ID无障碍', '状态', '路由'], ans: 1, exp: '无障碍稳定ID', tag: 'React框架', diff: 2 },
    { q: 'Node.js基于什么引擎？', opts: ['SpiderMonkey', 'V8', 'JavaScriptCore', 'Chakra'], ans: 1, exp: '基于V8引擎', tag: 'Node.js服务端', diff: 1 },
    { q: 'Buffer处理什么？', opts: ['字符串', '二进制', 'JSON', 'XML'], ans: 1, exp: '处理二进制数据', tag: 'Node.js服务端', diff: 1 },
    { q: '哪个非核心模块？', opts: ['fs', 'http', 'lodash', 'path'], ans: 2, exp: 'lodash第三方', tag: 'Node.js服务端', diff: 1 },
    { q: 'Express中间件顺序？', opts: ['随机', '定义顺序', '优先级', '并行'], ans: 1, exp: '按定义顺序从上到下', tag: 'Node.js服务端', diff: 1 },
    { q: 'Express next()作用？', opts: ['跳路由', '传给下一个中间件', '结束响应', '抛错'], ans: 1, exp: '传递控制权', tag: 'Node.js服务端', diff: 1 },
    { q: 'require缓存？', opts: ['每次重加载', '首次加载后缓存', '不缓存', '按需'], ans: 1, exp: '首次加载后缓存', tag: 'Node.js服务端', diff: 2 },
    { q: 'CJS和ESM区别？', opts: ['CJS用import', 'CJS用require/module.exports', 'ESM用require', '相同'], ans: 1, exp: 'CJS require，ESM import', tag: 'Node.js服务端', diff: 2 },
    { q: 'Node全局对象？', opts: ['window', 'global', 'document', 'self'], ans: 1, exp: 'Node中global是全局', tag: 'Node.js服务端', diff: 1 },
    { q: 'path模块用途？', opts: ['HTTP', '文件路径处理', '数据库', '日志'], ans: 1, exp: '处理文件路径', tag: 'Node.js服务端', diff: 1 },
    { q: '创建HTTP服务器？', opts: ['http.createServer()', 'http.new()', 'http.start()', 'http.init()'], ans: 0, exp: 'http.createServer()', tag: 'Node.js服务端', diff: 1 },
    { q: '__dirname表示？', opts: ['文件名', '当前文件所在目录', '根目录', '临时'], ans: 1, exp: '当前目录绝对路径', tag: 'Node.js服务端', diff: 1 },
    { q: 'EventEmitter作用？', opts: ['HTTP', '发布/订阅', '文件监听', '路由'], ans: 1, exp: '事件发布订阅', tag: 'Node.js服务端', diff: 2 },
    { q: 'process.env作用？', opts: ['CPU', '环境变量', '内存', '网络'], ans: 1, exp: '获取环境变量', tag: 'Node.js服务端', diff: 1 },
    { q: '错误优先回调？', opts: ['错误最后', '第一个参数是error', '无错误参数', 'throw'], ans: 1, exp: '回调第一个参数错误', tag: 'Node.js服务端', diff: 1 },
    { q: 'express.json()作用？', opts: ['路由', '解析JSON请求体', '鉴权', '日志'], ans: 1, exp: '解析JSON请求体', tag: 'Node.js服务端', diff: 1 },
    { q: 'pipe方法作用？', opts: ['创建管道', '连接可读流到可写流', '过滤', '压缩'], ans: 1, exp: '连接流', tag: 'Node.js服务端', diff: 2 },
    { q: '文件系统模块？', opts: ['net', 'fs', 'http', 'url'], ans: 1, exp: 'fs文件系统模块', tag: 'Node.js服务端', diff: 1 },
    { q: 'PUT和PATCH区别？', opts: ['相同', 'PUT全量PATCH部分', 'PATCH全量', 'PUT仅创建'], ans: 1, exp: 'PUT全量PATCH部分', tag: 'Node.js服务端', diff: 2 },
    { q: 'CORS中间件作用？', opts: ['压缩', '处理跨域', '鉴权', '日志'], ans: 1, exp: '跨域资源共享', tag: 'Node.js服务端', diff: 1 },
    { q: 'net模块用于？', opts: ['HTTP', 'TCP/IP', '文件', '数据库'], ans: 1, exp: 'TCP服务器客户端', tag: 'Node.js服务端', diff: 2 },
    { q: 'express.static作用？', opts: ['静态文件服务', '数据库', '鉴权', '压缩'], ans: 0, exp: '静态文件服务', tag: 'Node.js服务端', diff: 1 },
    { q: 'Stream四种类型？', opts: ['R/W', 'Readable/Writable/Transform/Duplex', 'I/O', 'R/W/C'], ans: 1, exp: '四种流类型', tag: 'Node.js服务端', diff: 2 },
    { q: 'cluster模块作用？', opts: ['日志', '多进程多核CPU', '文件', '网络'], ans: 1, exp: '利用多核创建子进程', tag: 'Node.js服务端', diff: 2 },
    { q: 'process.nextTick时机？', opts: ['微任务', '当前操作后事件循环前', '宏任务', '下tick'], ans: 1, exp: '优先于微任务执行', tag: 'Node.js服务端', diff: 3 },
    { q: 'util.promisify作用？', opts: ['创建Promise', '回调转Promise函数', '序列化', '调试'], ans: 1, exp: '回调风格转Promise', tag: 'Node.js服务端', diff: 2 },
    { q: 'PM2作用？', opts: ['编辑器', 'Node进程管理器', '数据库', '文件'], ans: 1, exp: '生产进程管理器', tag: 'Node.js服务端', diff: 1 },
    { q: 'Koa与Express区别？', opts: ['Koa无中间件', 'Koa用async/await洋葱模型', 'Express无路由', 'Koa慢'], ans: 1, exp: 'Koa异步中间件洋葱模型', tag: 'Node.js服务端', diff: 2 },
    { q: 'Worker Threads作用？', opts: ['子进程', '并行CPU密集任务', 'HTTP', 'DB'], ans: 1, exp: '线程级并行处理CPU密集', tag: 'Node.js服务端', diff: 3 },
    { q: 'child_process作用？', opts: ['子线程', '创建子进程', '子模块', '子路由'], ans: 1, exp: '创建子进程执行命令', tag: 'Node.js服务端', diff: 2 },
    { q: '事件循环阶段数？', opts: ['2', '3', '6', '8'], ans: 2, exp: 'Node事件循环6个阶段', tag: 'Node.js服务端', diff: 3 },
    { q: 'justify-content作用？', opts: ['交叉轴', '主轴对齐', '换行', '顺序'], ans: 1, exp: '主轴对齐方式', tag: 'CSS布局与动画', diff: 1 },
    { q: 'fr单位表示？', opts: ['固定像素', '可用空间等分', '百分比', '字体'], ans: 1, exp: 'Grid等分单位', tag: 'CSS布局与动画', diff: 2 },
    { q: 'position:sticky特点？', opts: ['始终固定', '滚动阈值后固定', '绝对定位', '相对父'], ans: 1, exp: '阈值前relative后fixed', tag: 'CSS布局与动画', diff: 2 },
    { q: 'BFC触发条件？', opts: ['inline', 'overflow:hidden', 'color', 'font-size'], ans: 1, exp: 'overflow非visible触发BFC', tag: 'CSS布局与动画', diff: 3 },
    { q: 'animation-fill-mode:forwards？', opts: ['循环', '保持最后帧', '反向', '暂停'], ans: 1, exp: '结束保持最后帧', tag: 'CSS布局与动画', diff: 2 },
    { q: 'translate3d作用？', opts: ['2D移动', '3D移动GPU加速', '旋转', '缩放'], ans: 1, exp: '触发GPU加速', tag: 'CSS布局与动画', diff: 2 },
    { q: 'will-change作用？', opts: ['CSS变量', '提前告知浏览器优化', '改样式', '动画'], ans: 1, exp: '预先提示优化', tag: 'CSS布局与动画', diff: 3 },
    { q: 'CSS变量声明？', opts: ['$var', '--var', '@var', 'var'], ans: 1, exp: '--前缀声明自定义属性', tag: 'CSS布局与动画', diff: 1 },
    { q: '单行省略需？', opts: ['仅text-overflow', 'nowrap+overflow:hidden+ellipsis', '仅overflow', 'clip'], ans: 1, exp: '三属性配合', tag: 'CSS布局与动画', diff: 2 },
    { q: 'calc()作用？', opts: ['计算器', 'CSS数学运算', '调JS', '变量'], ans: 1, exp: 'CSS数学运算', tag: 'CSS布局与动画', diff: 1 },
    { q: 'z-index生效条件？', opts: ['所有元素', 'position非static', '仅fixed', '仅block'], ans: 1, exp: '定位元素才生效', tag: 'CSS布局与动画', diff: 2 },
    { q: '线性渐变？', opts: ['linear-gradient()', 'color-gradient()', 'grad()', 'fade()'], ans: 0, exp: 'linear-gradient()', tag: 'CSS布局与动画', diff: 1 },
    { q: 'box-sizing:border-box？', opts: ['去边框', 'padding+border含在width', '仅content', '去padding'], ans: 1, exp: 'width含padding+border', tag: 'CSS布局与动画', diff: 1 },
    { q: 'align-items控制？', opts: ['主轴', '交叉轴', '两轴', '无方向'], ans: 1, exp: '交叉轴对齐', tag: 'CSS布局与动画', diff: 1 },
    { q: 'transition和animation？', opts: ['相同', 'transition需触发animation可自动', 'animation需触发', 'transition复杂'], ans: 1, exp: '前者需事件触发', tag: 'CSS布局与动画', diff: 2 },
    { q: 'Grid专属属性？', opts: ['grid-template-columns', 'flex-direction', 'justify-content', 'align-items'], ans: 0, exp: 'Grid列模板', tag: 'CSS布局与动画', diff: 2 },
    { q: 'clamp()作用？', opts: ['限制值范围', '比较', '平均', '颜色'], ans: 0, exp: 'clamp(min,val,max)', tag: 'CSS布局与动画', diff: 2 },
    { q: 'aspect-ratio作用？', opts: ['透明度', '宽高比', '对齐', '动画速度'], ans: 1, exp: '设置元素宽高比', tag: 'CSS布局与动画', diff: 2 },
    { q: '毛玻璃效果？', opts: ['filter:blur', 'backdrop-filter:blur', 'opacity:0.5', 'mix-blend'], ans: 1, exp: 'backdrop-filter', tag: 'CSS布局与动画', diff: 2 },
    { q: 'scroll-snap-type？', opts: ['滚动速度', '滚动捕捉', '隐藏滚动条', '方向'], ans: 1, exp: '滚动吸附', tag: 'CSS布局与动画', diff: 3 },
    { q: 'flex:1等同？', opts: ['1 1 0%', '1 0 auto', '0 1 0%', '1 1 auto'], ans: 0, exp: 'grow:1 shrink:1 basis:0%', tag: 'CSS布局与动画', diff: 2 },
    { q: 'currentColor？', opts: ['黑色', '引用当前color值', '蓝色', '透明'], ans: 1, exp: '引用当前color', tag: 'CSS布局与动画', diff: 2 },
    { q: '选择器权重最高？', opts: ['类', 'ID', '标签', '通配'], ans: 1, exp: 'ID选择器权重最高', tag: 'CSS布局与动画', diff: 1 },
    { q: 'perspective？', opts: ['3D透视', '2D旋转', '透明度', '滤镜'], ans: 0, exp: '3D透视效果', tag: 'CSS布局与动画', diff: 3 },
    { q: 'content-visibility？', opts: ['内容可见', '跳过屏外渲染', 'overflow', 'display'], ans: 1, exp: '屏外内容跳过渲染', tag: 'CSS布局与动画', diff: 3 },
    { q: 'column-count作用？', opts: ['列数', '行数', '宽度', '高度'], ans: 0, exp: '多列布局列数', tag: 'CSS布局与动画', diff: 2 },
    { q: 'contain属性？', opts: ['包含关系', '限制渲染范围优化', 'overflow', '定位'], ans: 1, exp: '渲染范围隔离优化', tag: 'CSS布局与动画', diff: 3 },
    { q: '@supports作用？', opts: ['导入', '特性检测', '动画', '媒体查询'], ans: 1, exp: 'CSS特性支持检测', tag: 'CSS布局与动画', diff: 3 },
    { q: 'min()函数？', opts: ['取最小', '取最大', '平均', '中间'], ans: 0, exp: '取列表最小值', tag: 'CSS布局与动画', diff: 2 },
    { q: '::first-line？', opts: ['首行文本', '首字母', '前元素', '最后行'], ans: 0, exp: '选择第一行文本', tag: 'CSS布局与动画', diff: 2 },
    { q: 'HTTP 304表示？', opts: ['服务器错', '资源未修改用缓存', '永久重定向', '临时'], ans: 1, exp: '304使用缓存', tag: 'HTTP与网络', diff: 1 },
    { q: 'HTTP/2改进？', opts: ['安全', '多路复用/头部压缩/推送', '大请求体', '新方法'], ans: 1, exp: '多路复用等特性', tag: 'HTTP与网络', diff: 2 },
    { q: 'TLS握手作用？', opts: ['加速', '建立安全连接协商加密', '压缩', '缓存'], ans: 1, exp: '安全连接建立', tag: 'HTTP与网络', diff: 2 },
    { q: '哪个非幂等？', opts: ['GET', 'PUT', 'DELETE', 'POST'], ans: 3, exp: 'POST非幂等', tag: 'HTTP与网络', diff: 2 },
    { q: 'CORS预检？', opts: ['获取资源', '检查跨域是否允许', '发送数据', '删除'], ans: 1, exp: 'OPTIONS预检', tag: 'HTTP与网络', diff: 2 },
    { q: 'HttpOnly作用？', opts: ['仅HTTP', '阻止JS访问Cookie', '过期', '域名'], ans: 1, exp: '防XSS读取Cookie', tag: 'HTTP与网络', diff: 2 },
    { q: '哪个非缓存头？', opts: ['Cache-Control', 'ETag', 'Content-Type', 'Last-Modified'], ans: 2, exp: 'Content-Type非缓存', tag: 'HTTP与网络', diff: 2 },
    { q: 'WebSocket特点？', opts: ['相同', '持久双向通信', 'HTTP更快', '不支持二进制'], ans: 1, exp: '全双工持久连接', tag: 'HTTP与网络', diff: 2 },
    { q: 'TCP三次握手？', opts: ['建立连接同步序列号', '断开', '传输', '恢复'], ans: 0, exp: '可靠连接建立', tag: 'HTTP与网络', diff: 2 },
    { q: 'application/json？', opts: ['HTML', '请求体JSON格式', '图片', '表单'], ans: 1, exp: 'JSON格式内容', tag: 'HTTP与网络', diff: 1 },
    { q: 'HTTP/3核心？', opts: ['TCP', 'QUIC', 'WebSocket', 'gRPC'], ans: 1, exp: 'QUIC基于UDP', tag: 'HTTP与网络', diff: 3 },
    { q: 'CDN作用？', opts: ['加密', '缓存到近用户节点', '防火墙', '负载均衡'], ans: 1, exp: '边缘节点加速', tag: 'HTTP与网络', diff: 1 },
    { q: '跨域解决方案？', opts: ['改UA', 'CORS或代理', 'HTTP/2', '加带宽'], ans: 1, exp: 'CORS和代理', tag: 'HTTP与网络', diff: 1 },
    { q: 'keep-alive？', opts: ['安全', '复用TCP连接', '带宽', '压缩'], ans: 1, exp: '长连接复用', tag: 'HTTP与网络', diff: 2 },
    { q: 'XSS类型？', opts: ['仅反射', '存储/反射/DOM型', '仅存储', '仅DOM'], ans: 1, exp: '三种XSS', tag: 'HTTP与网络', diff: 2 },
    { q: 'JWT组成？', opts: ['2', '3', '4', '1'], ans: 1, exp: 'Header.Payload.Signature', tag: 'HTTP与网络', diff: 2 },
    { q: '500状态码？', opts: ['客户端', '禁止', '服务器内部错误', '重定向'], ans: 2, exp: '服务器错误', tag: 'HTTP与网络', diff: 1 },
    { q: 'Referer头？', opts: ['来源URL', '缓存', '客户端类型', '内容类型'], ans: 0, exp: '请求来源页面', tag: 'HTTP与网络', diff: 2 },
    { q: 'HTTPS端口？', opts: ['80', '443', '8080', '3000'], ans: 1, exp: '默认443', tag: 'HTTP与网络', diff: 1 },
    { q: 'Service Worker？', opts: ['后端', '拦截请求离线缓存', 'WebWorker别名', 'DB'], ans: 1, exp: '拦截请求缓存', tag: 'HTTP与网络', diff: 3 },
    { q: 'If-None-Match？', opts: ['条件请求配合ETag', 'Cookie', '编码', '语言'], ans: 0, exp: 'ETag条件请求', tag: 'HTTP与网络', diff: 3 },
    { q: '令牌桶用于？', opts: ['排序', 'API限流', '搜索', '压缩'], ans: 1, exp: '限流算法', tag: 'HTTP与网络', diff: 3 },
    { q: 'GraphQL优势？', opts: ['安全', '客户端按需查询', '更快', '简单'], ans: 1, exp: '按需取数', tag: 'HTTP与网络', diff: 2 },
    { q: 'Accept-Encoding？', opts: ['请求编码', '支持的压缩方式', '字符集', '语言'], ans: 1, exp: '声明支持压缩', tag: 'HTTP与网络', diff: 2 },
    { q: '安全HTTP方法？', opts: ['POST', 'DELETE', 'GET', 'PATCH'], ans: 2, exp: 'GET不修改资源', tag: 'HTTP与网络', diff: 2 },
    { q: 'chunked编码？', opts: ['压缩', '分块传输未知长度', '加密', '缓存'], ans: 1, exp: '分块发送', tag: 'HTTP与网络', diff: 3 },
    { q: 'REST PUT方法？', opts: ['创建', '全量更新', '部分更新', '删除'], ans: 1, exp: '全量更新资源', tag: 'HTTP与网络', diff: 2 },
    { q: '201状态码？', opts: ['成功', '已创建', '接受', '无内容'], ans: 1, exp: '资源已创建', tag: 'HTTP与网络', diff: 2 },
    { q: 'Cache-Control:no-cache？', opts: ['不缓存', '每次需验证后用缓存', '不存储', '仅客户端'], ans: 1, exp: '需服务器验证', tag: 'HTTP与网络', diff: 3 },
    { q: 'DNS解析第一步？', opts: ['根DNS', '浏览器缓存', 'ISP DNS', '系统缓存'], ans: 1, exp: '先查浏览器缓存', tag: 'HTTP与网络', diff: 2 },
    { q: '数组查找时间？', opts: ['O(1)', 'O(n)', 'O(logn)', 'O(n²)'], ans: 1, exp: '无序数组线性查找', tag: '数据结构与算法', diff: 1 },
    { q: '二分查找前提？', opts: ['无序', '有序', '长度偶数', '唯一'], ans: 1, exp: '数组必须有序', tag: '数据结构与算法', diff: 1 },
    { q: '平均O(nlogn)排序？', opts: ['冒泡', '快速排序', '插入', '选择'], ans: 1, exp: '快排平均O(nlogn)', tag: '数据结构与算法', diff: 2 },
    { q: '栈特点？', opts: ['FIFO', 'LIFO后进先出', '随机', '双端'], ans: 1, exp: '后进先出', tag: '数据结构与算法', diff: 1 },
    { q: '队列特点？', opts: ['LIFO', 'FIFO先进先出', '随机', '双端'], ans: 1, exp: '先进先出', tag: '数据结构与算法', diff: 1 },
    { q: '深度d二叉树最多节点？', opts: ['2d', '2^d - 1', 'd²', '2d-1'], ans: 1, exp: '满二叉树2^d-1', tag: '数据结构与算法', diff: 2 },
    { q: '哈希表平均查找？', opts: ['O(n)', 'O(1)', 'O(logn)', 'O(nlogn)'], ans: 1, exp: '哈希表O(1)', tag: '数据结构与算法', diff: 1 },
    { q: '稳定排序？', opts: ['快排', '堆排', '归并排序', '选排'], ans: 2, exp: '归并稳定', tag: '数据结构与算法', diff: 2 },
    { q: '链表优势？', opts: ['随机访问', '插入删除高效', '内存少', '缓存好'], ans: 1, exp: 'O(1)插入删除', tag: '数据结构与算法', diff: 2 },
    { q: 'BST有序遍历？', opts: ['前序', '中序', '后序', '层序'], ans: 1, exp: '中序遍历有序', tag: '数据结构与算法', diff: 2 },
    { q: '动态规划核心？', opts: ['分治', '重叠子问题存储', '贪心', '回溯'], ans: 1, exp: '空间换时间', tag: '数据结构与算法', diff: 3 },
    { q: '最短路径？', opts: ['Kruskal', 'Dijkstra', 'Prim', 'KMP'], ans: 1, exp: 'Dijkstra单源最短', tag: '数据结构与算法', diff: 2 },
    { q: 'BFS用什么？', opts: ['栈', '队列', '堆', '链表'], ans: 1, exp: '队列实现BFS', tag: '数据结构与算法', diff: 1 },
    { q: '升序堆排序用什么堆？', opts: ['最小堆', '最大堆', '二项堆', '斐波那契'], ans: 1, exp: '最大堆实现升序', tag: '数据结构与算法', diff: 2 },
    { q: 'O(n²)增长？', opts: ['线性', '平方', '对数', '指数'], ans: 1, exp: '平方级增长', tag: '数据结构与算法', diff: 1 },
    { q: '优先队列用？', opts: ['数组', '链表', '堆', '栈'], ans: 2, exp: '堆实现优先队列', tag: '数据结构与算法', diff: 2 },
    { q: '回溯本质？', opts: ['贪心', 'DFS+剪枝', 'BFS', 'DP'], ans: 1, exp: 'DFS加约束剪枝', tag: '数据结构与算法', diff: 3 },
    { q: 'AVL特点？', opts: ['不平衡', '高度差≤1', '叶同层', '有序'], ans: 1, exp: '严格平衡高度差≤1', tag: '数据结构与算法', diff: 3 },
    { q: '红黑树优势？', opts: ['严格平衡', '插入删除旋转少', '查找快', '内存少'], ans: 1, exp: '旋转操作少', tag: '数据结构与算法', diff: 3 },
    { q: 'KMP用于？', opts: ['排序', '字符串匹配', '图遍历', '最短路径'], ans: 1, exp: '字符串匹配算法', tag: '数据结构与算法', diff: 3 },
    { q: '判断有向图有环？', opts: ['Dijkstra', '拓扑排序', '最小生成树', '二分查找'], ans: 1, exp: '拓扑排序检测环', tag: '数据结构与算法', diff: 3 },
    { q: '分治法步骤？', opts: ['分析设计', '分解解决合并', '输入处理', '定义循环'], ans: 1, exp: '分解→解决→合并', tag: '数据结构与算法', diff: 2 },
    { q: '非线性结构？', opts: ['数组', '链表', '栈', '二叉树'], ans: 3, exp: '二叉树非线性', tag: '数据结构与算法', diff: 1 },
    { q: 'LRU实现？', opts: ['数组', '哈希+双向链表', '栈', '队列'], ans: 1, exp: 'O(1)查+O(1)更新', tag: '数据结构与算法', diff: 3 },
    { q: 'n&(n-1)作用？', opts: ['计算n', '消除最右1', '计位数', '判奇偶'], ans: 1, exp: '消最右二进制1', tag: '数据结构与算法', diff: 3 },
    { q: 'TSP问题？', opts: ['P', 'NP完全', '线性', '对数'], ans: 1, exp: '旅行商NP完全', tag: '数据结构与算法', diff: 3 },
    { q: '单调栈用于？', opts: ['排序', '下一个更大/小元素', '最短路径', '匹配'], ans: 1, exp: '求下一个更大更小', tag: '数据结构与算法', diff: 3 },
    { q: '并查集操作？', opts: ['插入删除', 'Find+Union', '排序查找', '入栈出栈'], ans: 1, exp: '查找合并', tag: '数据结构与算法', diff: 3 },
    { q: '滑动窗口适合？', opts: ['排序', '连续子数组/子串', '图', '树'], ans: 1, exp: '连续子问题优化', tag: '数据结构与算法', diff: 2 },
    { q: '快排最坏？', opts: ['O(n)', 'O(n²)', 'O(logn)', 'O(nlogn)'], ans: 1, exp: '已排序数组最坏', tag: '数据结构与算法', diff: 2 },
    { q: '单例保证？', opts: ['多实例', '一个类仅一个实例', '不可继承', '不可实例化'], ans: 1, exp: '唯一实例', tag: '设计模式', diff: 1 },
    { q: '观察者模式？', opts: ['一对一', '一对多通知', '多对多', '无依赖'], ans: 1, exp: '状态变化通知观察者', tag: '设计模式', diff: 1 },
    { q: '工厂方法？', opts: ['直接创建', '接口定义子类实例化', '复制', '销毁'], ans: 1, exp: '延迟创建到子类', tag: '设计模式', diff: 2 },
    { q: '策略模式？', opts: ['创建', '算法可互换封装', '状态', '监听'], ans: 1, exp: '策略可互换', tag: '设计模式', diff: 2 },
    { q: '创建型模式？', opts: ['适配器', '建造者', '观察者', '策略'], ans: 1, exp: '建造者创建型', tag: '设计模式', diff: 2 },
    { q: '装饰器模式？', opts: ['删功能', '动态加职责', '创建子类', '简化接口'], ans: 1, exp: '动态添加功能', tag: '设计模式', diff: 2 },
    { q: '适配器模式？', opts: ['性能', '接口不兼容', '内存', '安全'], ans: 1, exp: '接口适配转换', tag: '设计模式', diff: 1 },
    { q: '代理模式？', opts: ['删对象', '控制对象访问', '创建', '销毁'], ans: 1, exp: '控制访问', tag: '设计模式', diff: 2 },
    { q: '发布订阅和观察者区别？', opts: ['相同', '发布订阅经调度中心', '观察者更解耦', '发布订阅简单'], ans: 1, exp: '调度中心解耦', tag: '设计模式', diff: 3 },
    { q: 'MVC中Model？', opts: ['界面', '数据和业务逻辑', '路由', '事件'], ans: 1, exp: '模型管理数据', tag: '设计模式', diff: 1 },
    { q: '结构型模式？', opts: ['单例', '桥接', '命令', '迭代器'], ans: 1, exp: '桥接结构型', tag: '设计模式', diff: 2 },
    { q: '命令模式？', opts: ['创建', '请求封装为对象', '状态', '异常'], ans: 1, exp: '请求参数化', tag: '设计模式', diff: 2 },
    { q: 'SOLID中O？', opts: ['单一', '开闭原则', '里氏', '依赖倒置'], ans: 1, exp: '开闭原则', tag: '设计模式', diff: 2 },
    { q: '模板方法？', opts: ['创建模板', '算法骨架步骤延迟子类', '复制', '删除'], ans: 1, exp: '骨架固定步骤延迟', tag: '设计模式', diff: 2 },
    { q: '外观模式？', opts: ['隐藏', '统一简化接口', '创建', '销毁'], ans: 1, exp: '高层简单接口', tag: '设计模式', diff: 1 },
    { q: '组合模式？', opts: ['组合函数', '树形结构部分-整体', '组合数组', '组合字符串'], ans: 1, exp: '整体部分统一处理', tag: '设计模式', diff: 2 },
    { q: '行为型模式？', opts: ['抽象工厂', '桥接', '状态模式', '原型'], ans: 2, exp: '状态行为型', tag: '设计模式', diff: 2 },
    { q: '状态模式？', opts: ['创建', '状态变行为变', '删除', '存储'], ans: 1, exp: '状态驱动行为', tag: '设计模式', diff: 2 },
    { q: '依赖注入目的？', opts: ['增耦合', '降耦合', '增代码', '简化'], ans: 1, exp: '降低耦合度', tag: '设计模式', diff: 2 },
    { q: '非GOF 23种？', opts: ['单例', 'MVC', '观察者', '策略'], ans: 1, exp: 'MVC架构模式', tag: '设计模式', diff: 2 },
    { q: '建造者适合？', opts: ['简单对象', '复杂对象分步骤', '单例', '克隆'], ans: 1, exp: '复杂对象构建', tag: '设计模式', diff: 2 },
    { q: '原型模式创建？', opts: ['new', '克隆已有', '工厂', '反射'], ans: 1, exp: '克隆创建', tag: '设计模式', diff: 2 },
    { q: '中介者？', opts: ['增耦合', '减少直接交互', '创建', '状态'], ans: 1, exp: '集中管理交互', tag: '设计模式', diff: 3 },
    { q: '责任链？', opts: ['同时处理', '沿链传递直到处理', '一个处理器', '随机'], ans: 1, exp: '沿链处理', tag: '设计模式', diff: 2 },
    { q: '迭代器？', opts: ['创建集合', '统一遍历接口', '排序', '过滤'], ans: 1, exp: '统一遍历', tag: '设计模式', diff: 2 },
    { q: '享元？', opts: ['创建', '共享对象省内存', '删除', '复制'], ans: 1, exp: '共享细粒度对象', tag: '设计模式', diff: 3 },
    { q: '桥接模式？', opts: ['性能', '抽象实现分离', '安全', '内存'], ans: 1, exp: '分离独立变化', tag: '设计模式', diff: 3 },
    { q: 'SOLID中D？', opts: ['单一', '开闭', '里氏', '依赖倒置'], ans: 3, exp: '依赖倒置原则', tag: '设计模式', diff: 2 },
    { q: '访问者？', opts: ['创建', '不修改类增操作', '删除', '状态'], ans: 1, exp: '分离数据与操作', tag: '设计模式', diff: 3 },
    { q: '抽象工厂和工厂方法？', opts: ['相同', '抽象工厂创一组相关', '工厂复杂', '抽象不创建'], ans: 1, exp: '产品族VS单个产品', tag: '设计模式', diff: 3 },
    { q: 'INNER JOIN？', opts: ['所有行', '匹配行', '左表所有', '右表所有'], ans: 1, exp: '内连接匹配行', tag: '数据库基础', diff: 1 },
    { q: '索引作用？', opts: ['增存储', '加快检索', '一致性', '备份'], ans: 1, exp: '加速查询', tag: '数据库基础', diff: 1 },
    { q: 'ACID中A？', opts: ['可用', '原子性', '自动', '聚合'], ans: 1, exp: '原子性Atomicity', tag: '数据库基础', diff: 2 },
    { q: 'NoSQL？', opts: ['MySQL', 'PostgreSQL', 'MongoDB', 'Oracle'], ans: 2, exp: 'MongoDB文档NoSQL', tag: '数据库基础', diff: 1 },
    { q: 'GROUP BY？', opts: ['排序', '分组聚合', '过滤行', '连接'], ans: 1, exp: '分组聚合', tag: '数据库基础', diff: 1 },
    { q: 'ACID不包括？', opts: ['原子', '一致', '可用', '隔离'], ans: 2, exp: 'ACID无可用性', tag: '数据库基础', diff: 2 },
    { q: 'LEFT JOIN？', opts: ['仅匹配', '左表所有+右匹配', '右表所有', '两表所有'], ans: 1, exp: '左连接左表全有', tag: '数据库基础', diff: 1 },
    { q: '主键特点？', opts: ['可重复', '唯一不为空', '可为空', '可多个'], ans: 1, exp: '主键UNIQUE NOT NULL', tag: '数据库基础', diff: 1 },
    { q: 'Redis类型？', opts: ['关系', '键值内存DB', '文档', '图'], ans: 1, exp: '内存键值DB', tag: '数据库基础', diff: 1 },
    { q: 'HAVING？', opts: ['过滤行', '过滤分组', '排序', '连接'], ans: 1, exp: '过滤分组后结果', tag: '数据库基础', diff: 2 },
    { q: '范式化目的？', opts: ['增冗余', '减冗余和依赖', '加速查询', '简化表'], ans: 1, exp: '减少冗余', tag: '数据库基础', diff: 2 },
    { q: 'DDL语句？', opts: ['SELECT', 'INSERT', 'CREATE TABLE', 'UPDATE'], ans: 2, exp: 'CREATE数据定义', tag: '数据库基础', diff: 1 },
    { q: 'UNION vs UNION ALL？', opts: ['相同', 'UNION去重ALL不去', 'ALL去重', 'UNION快'], ans: 1, exp: 'UNION去重慢', tag: '数据库基础', diff: 2 },
    { q: '聚合函数？', opts: ['CONCAT', 'COUNT', 'SUBSTRING', 'TRIM'], ans: 1, exp: 'COUNT聚合', tag: '数据库基础', diff: 1 },
    { q: '连接池作用？', opts: ['增连接', '复用连接减开销', '加密', '压缩'], ans: 1, exp: '复用连接', tag: '数据库基础', diff: 2 },
    { q: '防SQL注入？', opts: ['动态SQL', '参数化查询', '增连接', '复杂密码'], ans: 1, exp: '参数化查询', tag: '数据库基础', diff: 2 },
    { q: '锁分类？', opts: ['仅排他', '共享+排他', '仅共享', '无锁'], ans: 1, exp: '读锁共享写排他', tag: '数据库基础', diff: 2 },
    { q: '视图？', opts: ['存数据', '虚拟表简化查询', '加速写', '备份'], ans: 1, exp: '虚拟表不存数据', tag: '数据库基础', diff: 2 },
    { q: 'CAP中C？', opts: ['性能', '一致性', '并发', '容量'], ans: 1, exp: 'CAP一致性', tag: '数据库基础', diff: 3 },
    { q: 'MongoDB特点？', opts: ['关系', '文档型灵活', '仅SQL', '无索引'], ans: 1, exp: '文档型BSON', tag: '数据库基础', diff: 2 },
    { q: '触发器？', opts: ['手动', '事件自动执行', '创建表', '删数据'], ans: 1, exp: '特定事件触发', tag: '数据库基础', diff: 2 },
    { q: '存储过程优势？', opts: ['更慢', '预编译少网络流量', '无参数', '仅查询'], ans: 1, exp: '预编译减网络', tag: '数据库基础', diff: 2 },
    { q: '乐观锁？', opts: ['加排他锁', '版本号/时间戳', '加共享锁', '串行化'], ans: 1, exp: '版本号检测冲突', tag: '数据库基础', diff: 2 },
    { q: 'B+树索引特点？', opts: ['所有节点存数据', '叶子链表存数据有序', '不支持范围', '仅哈希'], ans: 1, exp: '叶子节点有序链表', tag: '数据库基础', diff: 3 },
    { q: '图数据库？', opts: ['MySQL', 'Neo4j', 'Redis', 'MongoDB'], ans: 1, exp: 'Neo4j图数据库', tag: '数据库基础', diff: 2 },
    { q: '分库分表目的？', opts: ['增单表', '解单库单表瓶颈', '简化查询', '减数据'], ans: 1, exp: '解决容量性能瓶颈', tag: '数据库基础', diff: 3 },
    { q: '时序数据库？', opts: ['MySQL', 'InfluxDB', 'MongoDB', 'Redis'], ans: 1, exp: 'InfluxDB时序', tag: '数据库基础', diff: 2 },
    { q: '外键作用？', opts: ['加速查询', '维护引用完整性', '创建索引', '存储过程'], ans: 1, exp: '引用完整性约束', tag: '数据库基础', diff: 2 },
    { q: 'DML不包括？', opts: ['SELECT', 'INSERT', 'CREATE', 'UPDATE'], ans: 2, exp: 'CREATE是DDL', tag: '数据库基础', diff: 1 },
    { q: '事务隔离级别最高？', opts: ['读未提交', '读已提交', '可重复读', '串行化'], ans: 3, exp: 'Serializable最高', tag: '数据库基础', diff: 2 },
    { q: 'XSS全称？', opts: ['Cross-Site Scripting', 'Cross-Server', 'Cross-Security', 'Cross-Service'], ans: 0, exp: '跨站脚本', tag: '安全与性能优化', diff: 1 },
    { q: 'CSRF是什么？', opts: ['跨站脚本', '跨站请求伪造', 'SQL注入', 'DDoS'], ans: 1, exp: '跨站请求伪造', tag: '安全与性能优化', diff: 2 },
    { q: 'SQL注入防御？', opts: ['字符串拼接', '参数化查询', '不用SQL', '只用NoSQL'], ans: 1, exp: '参数化防注入', tag: '安全与性能优化', diff: 1 },
    { q: 'HTTPS比HTTP多了？', opts: ['更快', 'SSL/TLS加密', '更多请求', '新方法'], ans: 1, exp: '传输层加密', tag: '安全与性能优化', diff: 1 },
    { q: 'JWT存储在哪？', opts: ['仅Cookie', 'localStorage/Cookie/内存', '仅session', '仅数据库'], ans: 1, exp: '多种存储方式', tag: '安全与性能优化', diff: 2 },
    { q: 'CSP用于？', opts: ['缓存', '内容安全防XSS', '压缩', '连接'], ans: 1, exp: 'Content-Security-Policy', tag: '安全与性能优化', diff: 3 },
    { q: 'bcrypt用于？', opts: ['加密通信', '密码哈希', '数字签名', '证书'], ans: 1, exp: '密码慢哈希', tag: '安全与性能优化', diff: 2 },
    { q: '中间人攻击防御？', opts: ['HTTP', 'HTTPS证书验证', 'Cookie', 'Token'], ans: 1, exp: 'HTTPS防MITM', tag: '安全与性能优化', diff: 2 },
    { q: 'SameSite Cookie？', opts: ['同站', '防CSRF跨站发送限制', '加密', '过期'], ans: 1, exp: '限制跨站携带Cookie', tag: '安全与性能优化', diff: 3 },
    { q: '点击劫持防御？', opts: ['CORS', 'X-Frame-Options', 'HTTPS', 'Cookie'], ans: 1, exp: '禁止iframe嵌套', tag: '安全与性能优化', diff: 2 },
    { q: '懒加载目的？', opts: ['首屏加快延迟加载', '全部提前加载', '增加首屏', '不加载'], ans: 0, exp: '首屏性能提升', tag: '安全与性能优化', diff: 1 },
    { q: '代码分割目的？', opts: ['大包首屏慢', '拆包按需加载减首屏', '合并文件', '简化代码'], ans: 1, exp: '首屏减少加载体积', tag: '安全与性能优化', diff: 2 },
    { q: 'Tree shaking？', opts: ['删除树', '消除未使用代码减包', '生成AST', '美化代码'], ans: 1, exp: '死代码消除', tag: '安全与性能优化', diff: 2 },
    { q: '图片优化不包括？', opts: ['WebP', '压缩', '超大图', '响应式srcset'], ans: 2, exp: '大图反而是问题', tag: '安全与性能优化', diff: 1 },
    { q: 'CDN优化？', opts: ['源站压力', '边缘缓存减延迟', '减少请求', '加密'], ans: 1, exp: '边缘加速', tag: '安全与性能优化', diff: 1 },
    { q: '防抖(debounce)用于？', opts: ['立即执行', '高频事件合并延迟执行', '节流', '缓存'], ans: 1, exp: '事件合并减少触发', tag: '安全与性能优化', diff: 2 },
    { q: '节流(throttle)？', opts: ['不触发', '固定频率执行最多一次', '防抖', '缓存'], ans: 1, exp: '固定频率限流', tag: '安全与性能优化', diff: 2 },
    { q: '虚拟列表？', opts: ['全部渲染', '仅可视区域渲染', '固定高度列表', '静态列表'], ans: 1, exp: '长列表性能优化', tag: '安全与性能优化', diff: 2 },
    { q: 'Gzip/Brotli？', opts: ['加密', '传输压缩减体积', '缓存', '持久化'], ans: 1, exp: '响应体压缩', tag: '安全与性能优化', diff: 2 },
    { q: '预加载preload？', opts: ['延后加载', '提前加载关键资源', '懒加载', '不加载'], ans: 1, exp: '预加载关键资源', tag: '安全与性能优化', diff: 2 },
    { q: '沙箱iframe？', opts: ['无限制', '限制iframe权限防风险', '允许所有', '允许脚本'], ans: 1, exp: '安全隔离', tag: '安全与性能优化', diff: 3 },
    { q: 'Rate limiting？', opts: ['加速请求', '限流防滥用和攻击', '缓存', '路由'], ans: 1, exp: '速率限制', tag: '安全与性能优化', diff: 2 },
    { q: 'OAuth 2.0作用？', opts: ['密码存储', '第三方登录授权', '加密', '签名'], ans: 1, exp: '授权框架', tag: '安全与性能优化', diff: 2 },
    { q: '盐值(Salt)用于？', opts: ['加密', '密码哈希加随机值', '编码', '序列化'], ans: 1, exp: '防彩虹表', tag: '安全与性能优化', diff: 2 },
    { q: '内存泄漏检测？', opts: ['DevTools Performance', 'DevTools Memory/Heap Snapshot', 'Console', 'Sources'], ans: 1, exp: '堆快照分析', tag: '安全与性能优化', diff: 3 },
    { q: '首屏优化不包括？', opts: ['代码分割', 'SSR/预渲染', '超大首屏图', '资源压缩'], ans: 2, exp: '大图拖慢首屏', tag: '安全与性能优化', diff: 1 },
    { q: '双因素认证(2FA)？', opts: ['仅密码', '密码+手机/动态码二次验证', '仅指纹', '仅人脸'], ans: 1, exp: '多因素认证', tag: '安全与性能优化', diff: 2 },
    { q: '防暴力破解？', opts: ['不限制登录', '登录失败锁定/验证码', '简单密码', '无限试错'], ans: 1, exp: '锁定和验证码', tag: '安全与性能优化', diff: 2 },
    { q: 'SSR优势？', opts: ['客户端快速', '首屏快SEO友好', '开发简单', '服务器压力小'], ans: 1, exp: '服务端渲染SEO和首屏', tag: '安全与性能优化', diff: 2 },
    { q: '安全头不包括？', opts: ['X-Content-Type-Options', 'X-XSS-Protection', 'User-Agent', 'Strict-Transport-Security'], ans: 2, exp: 'UA非安全头', tag: '安全与性能优化', diff: 3 },
];
function shuffle(arr, seed) {
    const a = [...arr];
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        const j = Math.floor((s / 233280) * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function expandQuestions(core, targetPerTag) {
    const result = [];
    const byTag = {};
    core.forEach(c => {
        if (!byTag[c.tag])
            byTag[c.tag] = [];
        byTag[c.tag].push(c);
    });
    exports.KNOWLEDGE_TAGS.forEach(tag => {
        const bases = byTag[tag] || [];
        const difficulties = [1, 2, 3];
        for (let i = 0; i < targetPerTag; i++) {
            const base = bases[i % bases.length];
            const diff = difficulties[i % 3];
            const optsShuffled = shuffle([...base.opts], i + targetPerTag + tag.length);
            const newCorrect = optsShuffled.indexOf(base.opts[base.ans]);
            let qText = base.q;
            let expText = base.exp;
            if (i >= bases.length) {
                const variations = [
                    `(进阶版) ${base.q}`,
                    `[练习${i - bases.length + 1}] ${base.q}`,
                    `📝 再练一题：${base.q}`,
                    `🔄 变式题：${base.q}`,
                    `${base.q} (巩固题)`,
                ];
                const expVariations = [
                    `${base.exp} 建议复习相关概念。`,
                    `关键点：${base.exp}`,
                    `核心考点：${base.exp}`,
                    `这是常考题型，${base.exp}`,
                    `解析：${base.exp}`,
                ];
                qText = variations[i % variations.length];
                expText = expVariations[i % expVariations.length];
            }
            result.push({
                id: (0, uuid_1.v4)(),
                question: qText,
                options: optsShuffled,
                correctAnswer: newCorrect,
                knowledgeTag: tag,
                difficulty: diff,
                explanation: expText,
            });
        }
    });
    return result;
}
exports.QUESTION_BANK = expandQuestions(CORE, 30);
function getQuestionsByFilter(options) {
    let result = [...exports.QUESTION_BANK];
    if (options.tags && options.tags.length) {
        result = result.filter(q => options.tags.includes(q.knowledgeTag));
    }
    if (options.difficulties && options.difficulties.length) {
        result = result.filter(q => options.difficulties.includes(q.difficulty));
    }
    if (options.random) {
        result = shuffle(result, Date.now() % 10000);
    }
    if (options.limit && options.limit > 0) {
        result = result.slice(0, options.limit);
    }
    return result;
}
function getBalancedQuestions(count) {
    const perTag = Math.ceil(count / exports.KNOWLEDGE_TAGS.length);
    const perDiff = Math.ceil(count / 3);
    const questions = [];
    const usedIds = new Set();
    const tagsShuffled = shuffle(exports.KNOWLEDGE_TAGS, Date.now() % 10000);
    const diffs = [1, 2, 3];
    for (const tag of tagsShuffled) {
        for (const diff of diffs) {
            const pool = exports.QUESTION_BANK.filter(q => q.knowledgeTag === tag && q.difficulty === diff && !usedIds.has(q.id));
            const shuffled = shuffle(pool, (tag.length + diff) * 17);
            for (let i = 0; i < Math.ceil(perDiff / exports.KNOWLEDGE_TAGS.length) && i < shuffled.length; i++) {
                if (questions.length >= count)
                    break;
                usedIds.add(shuffled[i].id);
                questions.push(shuffled[i]);
            }
            if (questions.length >= count)
                break;
        }
        if (questions.length >= count)
            break;
    }
    while (questions.length < count) {
        const remain = exports.QUESTION_BANK.filter(q => !usedIds.has(q.id));
        if (!remain.length)
            break;
        const pick = remain[Math.floor(Math.random() * remain.length)];
        usedIds.add(pick.id);
        questions.push(pick);
    }
    return shuffle(questions, Date.now() % 99999).slice(0, count);
}
function getWeakPointTags(ids) {
    const set = new Set(ids);
    const wrong = exports.QUESTION_BANK.filter(q => set.has(q.id));
    const tagCount = {};
    wrong.forEach(q => { tagCount[q.knowledgeTag] = (tagCount[q.knowledgeTag] || 0) + 1; });
    return Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);
}

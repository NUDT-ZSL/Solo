/**
 * 灵感看板压力测试脚本
 * 使用方法：打开浏览器控制台 (F12)，粘贴此脚本全部内容并回车执行
 *
 * 测试场景：
 * 1. 快速切换筛选（filterGroup / sortBy）
 * 2. 频繁调整窗口大小（resize）
 * 3. 连续快速提交评论（需先进入任意卡片详情页）
 * 4. 监控控制台布局抖动和性能警告
 */

(function () {
  'use strict';

  const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
  };

  const log = (color, tag, msg) => {
    const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0');
    console.log(`%c[${ts}] [${tag}]`, `color:${color}`, msg);
  };

  const stats = {
    filterSwitches: 0,
    resizeEvents: 0,
    commentsSubmitted: 0,
    layoutShifts: 0,
    warnings: 0,
    errors: 0,
    startTime: 0,
  };

  const _origWarn = console.warn;
  const _origError = console.error;
  const warningPatterns = [
    'Layout', 'layout', 'shift', 'Shift', 'jank', 'stutter',
    'Forced reflow', 'Recalculate Style', 'forced synchronous layout',
    'performance', 'Performance', 'slow', 'deprecated', 'throttled'
  ];

  console.warn = function (...args) {
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    if (warningPatterns.some(p => msg.includes(p))) {
      stats.warnings++;
      log(COLORS.yellow, 'PERF-WARN', msg.substring(0, 200));
    }
    _origWarn.apply(console, args);
  };

  console.error = function (...args) {
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    stats.errors++;
    log(COLORS.red, 'ERROR', msg.substring(0, 200));
    _origError.apply(console, args);
  };

  let _po = null;
  try {
    if ('PerformanceObserver' in window) {
      _po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && entry.value > 0.001) {
            stats.layoutShifts++;
            log(COLORS.yellow, 'LAYOUT-SHIFT', `score=${entry.value.toFixed(4)} (累计 CLS≈${stats.layoutShifts})`);
          }
        }
      });
      _po.observe({ entryTypes: ['layout-shift'] });
    }
  } catch (e) { /* ignore */ }

  function findSelects() {
    const selects = document.querySelectorAll('select');
    const result = { filter: null, sort: null };
    selects.forEach((s) => {
      const opts = Array.from(s.options).map(o => o.value);
      if (opts.includes('产品') || opts.includes('全部')) result.filter = s;
      if (opts.includes('time') || opts.includes('likes')) result.sort = s;
    });
    return result;
  }

  function triggerChange(el, value) {
    el.value = value;
    const evt = new Event('change', { bubbles: true });
    el.dispatchEvent(evt);
  }

  async function stressFilterSwitches(durationMs = 8000) {
    log(COLORS.cyan, 'FILTER-TEST', `开始快速切换筛选，持续 ${durationMs / 1000} 秒...`);
    const { filter, sort } = findSelects();
    if (!filter) { log(COLORS.red, 'FILTER-TEST', '未找到筛选下拉框'); return; }

    const filterOptions = Array.from(filter.options).map(o => o.value);
    const sortOptions = sort ? Array.from(sort.options).map(o => o.value) : [];

    const start = Date.now();
    let idx = 0;
    let sidx = 0;
    const interval = setInterval(() => {
      if (Date.now() - start > durationMs) {
        clearInterval(interval);
        log(COLORS.green, 'FILTER-TEST', `筛选切换完成，共切换 ${stats.filterSwitches} 次`);
        return;
      }
      triggerChange(filter, filterOptions[idx % filterOptions.length]);
      if (sort && Math.random() > 0.5) {
        triggerChange(sort, sortOptions[sidx % sortOptions.length]);
        sidx++;
      }
      idx++;
      stats.filterSwitches++;
    }, 120);
  }

  function stressResize(durationMs = 6000) {
    log(COLORS.cyan, 'RESIZE-TEST', `开始模拟频繁 resize，持续 ${durationMs / 1000} 秒...`);
    const start = Date.now();
    const widths = [1400, 1024, 768, 1280, 480, 768, 1920, 768, 480, 1024];
    let i = 0;

    const interval = setInterval(() => {
      if (Date.now() - start > durationMs) {
        clearInterval(interval);
        window.dispatchEvent(new Event('resize'));
        log(COLORS.green, 'RESIZE-TEST', `resize 模拟完成，共触发 ${stats.resizeEvents} 次`);
        return;
      }
      const w = widths[i % widths.length];
      const h = 600 + (i % 3) * 150;
      try {
        window.innerWidth = w;
        window.innerHeight = h;
      } catch (e) { /* some browsers block this */ }
      window.dispatchEvent(new Event('resize'));
      stats.resizeEvents++;
      i++;
    }, 180);
  }

  function findCommentInputs() {
    const inputs = document.querySelectorAll('input');
    let userInput = null;
    let contentInput = null;
    let submitBtn = null;
    inputs.forEach((inp) => {
      const ph = (inp.placeholder || '').toLowerCase();
      if (ph.includes('昵称') || ph.includes('name')) userInput = inp;
      if (ph.includes('想法') || ph.includes('评论') || ph.includes('comment')) contentInput = inp;
    });
    const buttons = document.querySelectorAll('button');
    buttons.forEach((b) => {
      const txt = (b.textContent || '').trim();
      if (txt === '发送') submitBtn = b;
    });
    return { userInput, contentInput, submitBtn };
  }

  async function stressComments(count = 15, delayMs = 80) {
    log(COLORS.cyan, 'COMMENT-TEST', `开始连续提交 ${count} 条评论，间隔 ${delayMs}ms...`);
    const { userInput, contentInput, submitBtn } = findCommentInputs();

    if (!userInput || !contentInput || !submitBtn) {
      log(COLORS.red, 'COMMENT-TEST', '未找到评论输入框，请先进入任意卡片详情页再运行此测试');
      log(COLORS.yellow, 'COMMENT-TEST', '提示：在看板页点击任意卡片进入详情，然后重新运行 stressTest.runComments()');
      return;
    }

    const userNames = ['张三', '李四', '王五', '赵六', 'TestUser', '灵感达人', 'Alice', 'Bob', 'Charlie'];
    for (let i = 0; i < count; i++) {
      const name = userNames[Math.floor(Math.random() * userNames.length)] + (i + 1);
      const content = `压力测试评论 #${i + 1} - ${Date.now()} - 这是一条自动提交的测试内容，用于验证并发评论提交的正确性和动画表现。`;

      userInput.value = name;
      userInput.dispatchEvent(new Event('input', { bubbles: true }));
      userInput.dispatchEvent(new Event('change', { bubbles: true }));

      contentInput.value = content;
      contentInput.dispatchEvent(new Event('input', { bubbles: true }));
      contentInput.dispatchEvent(new Event('change', { bubbles: true }));

      if (!submitBtn.disabled) {
        submitBtn.click();
        stats.commentsSubmitted++;
        log(COLORS.blue, 'COMMENT', `已提交第 ${i + 1}/${count} 条评论 (${name})`);
      } else {
        log(COLORS.yellow, 'COMMENT', `第 ${i + 1} 条按钮被禁用（预期：队列机制）`);
      }

      await new Promise(r => setTimeout(r, delayMs));
    }

    log(COLORS.green, 'COMMENT-TEST', `评论提交循环结束，共触发 ${stats.commentsSubmitted} 次点击`);
    log(COLORS.cyan, 'COMMENT-TEST', '请观察：评论列表顺序是否正确、是否有评论丢失、动画是否正常、按钮状态是否最终恢复');
  }

  function printStats() {
    const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
    console.log('\n');
    console.log('%c========== 压力测试统计 ==========', 'color:#7c3aed;font-weight:bold;font-size:14px');
    console.log(`%c运行时长: %c${elapsed}s`, 'color:#aaa', 'color:#fff;font-weight:bold');
    console.log(`%c筛选切换次数: %c${stats.filterSwitches}`, 'color:#aaa', 'color:#fff;font-weight:bold');
    console.log(`%cResize 触发次数: %c${stats.resizeEvents}`, 'color:#aaa', 'color:#fff;font-weight:bold');
    console.log(`%c评论提交次数: %c${stats.commentsSubmitted}`, 'color:#aaa', 'color:#fff;font-weight:bold');
    console.log(`%c检测到 Layout Shift: %c${stats.layoutShifts} 次`, 'color:#aaa', stats.layoutShifts > 5 ? 'color:#ef4444;font-weight:bold' : 'color:#10b981;font-weight:bold');
    console.log(`%c性能警告: %c${stats.warnings} 条`, 'color:#aaa', stats.warnings > 0 ? 'color:#f59e0b;font-weight:bold' : 'color:#10b981;font-weight:bold');
    console.log(`%c错误: %c${stats.errors} 条`, 'color:#aaa', stats.errors > 0 ? 'color:#ef4444;font-weight:bold' : 'color:#10b981;font-weight:bold');
    console.log('%c==================================', 'color:#7c3aed;font-weight:bold;font-size:14px');
    console.log('\n%c建议检查：%c1. 卡片是否重叠错位  2. 筛选动画顺序是否正确  3. 评论是否有丢失/重复  4. 新增卡片光晕是否消失', 'color:#f59e0b;font-weight:bold', 'color:#ccc');
  }

  async function runAll() {
    stats.startTime = Date.now();
    log(COLORS.cyan, 'STRESS-TEST', '==== 开始全量压力测试 ====');
    log(COLORS.yellow, 'STRESS-TEST', '当前页面：看板页 + 详情页测试将依次进行');

    await stressFilterSwitches(8000);
    await new Promise(r => setTimeout(r, 800));
    stressResize(6000);
    await new Promise(r => setTimeout(r, 7000));

    log(COLORS.cyan, 'STRESS-TEST', '筛选和 resize 测试完成。接下来请：');
    log(COLORS.yellow, 'STRESS-TEST', '  1. 点击任意卡片进入详情页');
    log(COLORS.yellow, 'STRESS-TEST', '  2. 进入详情页后执行: stressTest.runComments(15, 80)');
    log(COLORS.yellow, 'STRESS-TEST', '  3. 评论测试完成后执行: stressTest.stats() 查看完整报告');
  }

  function cleanup() {
    console.warn = _origWarn;
    console.error = _origError;
    if (_po) { try { _po.disconnect(); } catch (e) { /* ignore */ } }
    log(COLORS.gray, 'CLEANUP', '已还原 console 方法并断开 PerformanceObserver');
  }

  window.stressTest = {
    run: runAll,
    runFilters: (ms = 8000) => stressFilterSwitches(ms),
    runResize: (ms = 6000) => stressResize(ms),
    runComments: (n = 15, delay = 80) => stressComments(n, delay),
    stats: printStats,
    cleanup,
    _stats: stats,
  };

  console.log('\n');
  console.log('%c💡 灵感看板压力测试脚本已加载', 'color:#7c3aed;font-weight:bold;font-size:16px');
  console.log('%c可用命令:', 'color:#a78bfa;font-weight:bold');
  console.log('  %cstressTest.run()%c          - 运行全部测试（筛选+resize，然后手动进详情页跑评论）', 'color:#60a5fa', 'color:#ccc');
  console.log('  %cstressTest.runFilters(8000)%c - 只跑筛选切换压力测试 (ms)', 'color:#60a5fa', 'color:#ccc');
  console.log('  %cstressTest.runResize(6000)%c  - 只跑 resize 压力测试 (ms)', 'color:#60a5fa', 'color:#ccc');
  console.log('  %cstressTest.runComments(15,80)%c - 只跑评论并发测试 (条数, 间隔ms)', 'color:#60a5fa', 'color:#ccc');
  console.log('  %cstressTest.stats()%c          - 查看当前统计', 'color:#60a5fa', 'color:#ccc');
  console.log('  %cstressTest.cleanup()%c        - 清理还原', 'color:#60a5fa', 'color:#ccc');
  console.log('\n');
})();

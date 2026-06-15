/**
 * ============================================================
 *  App 根组件 - 全局状态管理与数据流中枢
 * ============================================================
 *
 *  调用关系:
 *    ├── 上游调用 (被谁使用):
 *    │   └── src/main.tsx -> ReactDOM.render(<App />)
 *    └── 下游依赖 (使用谁):
 *        ├── src/types.ts        (类型: Idea / FilterType / IdeaType)
 *        ├── src/api.ts          (方法: fetchIdeas() / createIdea())
 *        ├── src/components/IdeaInput.tsx  (子组件, 收集用户输入+语音)
 *        └── src/components/TeamWall.tsx   (子组件, 渲染动态墙)
 *
 *  数据流向:
 *    ┌─── 初始化:
 *    │   useEffect() -> fetchIdeas() -> 后端返回 []Idea
 *    │                             -> setIdeas(ideas) + 提取 setMembers([...])
 *    │
 *    ├── 用户提交:
 *    │   IdeaInput 输入 -> props.onSubmit(memberName, content, type, voiceBase64)
 *    │                      │
 *    │                      ▼
 *    │               createIdea(数据) -> 后端返回新Idea
 *    │                      │
 *    │                      ▼
 *    │               setIdeas([newIdea, ...prev]) + 可能追加新成员
 *    │                      │
 *    │                      ▼
 *    │               触发 TeamWall 重新渲染瀑布流 + Toast 飘出成功提示
 *    │
 *    └── 过滤切换:
 *        TeamWall 按钮 -> props.onFilterChange(filter)
 *                           │
 *                           ▼
 *                      setFilter(filter)
 *                           │
 *                           ▼
 *                      传入 TeamWall 触发过渡动画
 * ============================================================
 */

import { useState, useEffect, useCallback } from 'react';
import type { Idea, FilterType, IdeaType } from './types';
import { fetchIdeas, createIdea } from './api';
import TeamWall from './components/TeamWall';
import IdeaInput from './components/IdeaInput';

function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [members, setMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastFading, setToastFading] = useState(false);

  // 初始化: 从后端拉取所有 Idea 并提取成员列表
  const loadIdeas = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchIdeas();
      setIdeas(data);
      const uniqueMembers = Array.from(
        new Set(data.map((idea) => idea.memberName))
      );
      setMembers(uniqueMembers);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIdeas();
  }, [loadIdeas]);

  // 处理 IdeaInput 提交事件 -> 发送到后端 -> 本地更新
  const handleSubmit = useCallback(
    async (
      memberName: string,
      content: string,
      type: IdeaType,
      voiceBase64?: string
    ) => {
      try {
        const newIdea = await createIdea({
          memberName,
          content,
          type,
          voiceBase64,
        });
        setIdeas((prev) => [newIdea, ...prev]);
        setMembers((prev) =>
          prev.includes(memberName) ? prev : [...prev, memberName]
        );

        // 飘出式成功提示动画
        setShowToast(true);
        setTimeout(() => {
          setToastFading(true);
          setTimeout(() => {
            setShowToast(false);
            setToastFading(false);
          }, 300);
        }, 1500);
      } catch (error) {
        console.error('提交失败:', error);
        alert('提交失败，请重试');
      }
    },
    []
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🎙️ 声流站会</h1>
        <p className="app-subtitle">异步协作，让团队随时同步进展</p>
      </header>

      {showToast && (
        <div className={`submit-success-toast${toastFading ? ' fade-out' : ''}`}>
          ✓ 已提交成功！
        </div>
      )}

      {/* 输入组件 - members 用于姓名自动补齐, onSubmit 回调提交数据 */}
      <IdeaInput onSubmit={handleSubmit} members={members} />

      {/* 动态墙组件 - 传入 ideas 列表 + filter 状态 + 过滤回调 */}
      <TeamWall
        ideas={ideas}
        filter={filter}
        onFilterChange={setFilter}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;

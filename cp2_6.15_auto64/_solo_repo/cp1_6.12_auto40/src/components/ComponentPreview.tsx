/**
 * ComponentPreview.tsx - 组件预览面板
 *
 * 数据流向：
 *   - 输入：useComponent() 获取当前选中组件数据 + 状态标签映射
 *   - 内部状态：interactiveState 管理所有可交互组件的实时状态
 *   - 渲染：根据 variants × states 矩阵生成预览网格
 *   - 输出：渲染对应的 ui/Button, ui/Input, ui/Alert, ui/Switch 组件
 *
 * 交互事件流：
 *   用户点击/输入 → handleXxx 回调 → 更新 interactiveState →
 *   → 对应 UI 组件收到新 props → CSS 类名变化 → 样式/动画更新
 *
 * 定时器管理：
 *   - 所有 setTimeout ID 存储在 timerRef.current 数组中
 *   - 每次触发新动画前先 clearAllTimers 清理旧定时器，避免冲突
 *   - useEffect cleanup 在卸载时清理所有定时器
 *
 * 调用关系：
 *   - 消费：useComponent (from componentStore)
 *   - 被调用：App.tsx 作为中央区域引入
 *   - 调用：Button / Input / Alert / Switch (UI 组件)
 */

import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useComponent } from '@/state/componentStore';
import Button from './ui/Button';
import Input from './ui/Input';
import Alert from './ui/Alert';
import Switch from './ui/Switch';
import { type ComponentState, type ComponentType } from '@/types/component';
import './ComponentPreview.css';

interface InteractiveState {
  buttonLoading: boolean;
  buttonSuccess: boolean;
  buttonError: boolean;
  inputValue: string;
  inputFocused: boolean;
  switchChecked: boolean;
  alertVisible: boolean;
}

const ComponentPreview = () => {
  const { selectedComponent, getStateLabel } = useComponent();

  const [interactiveState, setInteractiveState] = useState<InteractiveState>({
    buttonLoading: false,
    buttonSuccess: false,
    buttonError: false,
    inputValue: '',
    inputFocused: false,
    switchChecked: true,
    alertVisible: true,
  });

  const timerRef = useRef<number[]>([]);

  const clearAllTimers = useCallback(() => {
    timerRef.current.forEach(id => clearTimeout(id));
    timerRef.current = [];
  }, []);

  const addTimer = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    timerRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const handleButtonClick = useCallback((simulateError = false) => {
    clearAllTimers();
    setInteractiveState(prev => ({
      ...prev,
      buttonLoading: true,
      buttonSuccess: false,
      buttonError: false,
    }));
    addTimer(() => {
      if (simulateError) {
        setInteractiveState(prev => ({
          ...prev,
          buttonLoading: false,
          buttonError: true,
          buttonSuccess: false,
        }));
        addTimer(() => {
          setInteractiveState(prev => ({ ...prev, buttonError: false }));
        }, 1500);
      } else {
        setInteractiveState(prev => ({
          ...prev,
          buttonLoading: false,
          buttonSuccess: true,
          buttonError: false,
        }));
        addTimer(() => {
          setInteractiveState(prev => ({ ...prev, buttonSuccess: false }));
        }, 1500);
      }
    }, 1500);
  }, [clearAllTimers, addTimer]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInteractiveState(prev => ({ ...prev, inputValue: e.target.value }));
  }, []);

  const handleInputFocus = useCallback(() => {
    setInteractiveState(prev => ({ ...prev, inputFocused: true }));
  }, []);

  const handleInputBlur = useCallback(() => {
    setInteractiveState(prev => ({ ...prev, inputFocused: false }));
  }, []);

  const handleSwitchChange = useCallback((checked: boolean) => {
    setInteractiveState(prev => ({ ...prev, switchChecked: checked }));
  }, []);

  const handleAlertClose = useCallback(() => {
    clearAllTimers();
    setInteractiveState(prev => ({ ...prev, alertVisible: false }));
    addTimer(() => {
      setInteractiveState(prev => ({ ...prev, alertVisible: true }));
    }, 2000);
  }, [clearAllTimers, addTimer]);

  const renderComponent = useCallback((
    componentId: ComponentType,
    variantProps: Record<string, unknown> | undefined,
    state: ComponentState,
    isInteractive: boolean
  ) => {
    switch (componentId) {
      case 'button':
        if (isInteractive) {
          return (
            <div className="component-preview__interactive-buttons">
              <Button
                variant={variantProps?.variant as any}
                onClick={() => handleButtonClick(false)}
                loading={interactiveState.buttonLoading}
                success={interactiveState.buttonSuccess}
                error={interactiveState.buttonError}
              >
                点击成功
              </Button>
              <Button
                variant={variantProps?.variant as any}
                onClick={() => handleButtonClick(true)}
              >
                点击失败
              </Button>
            </div>
          );
        }
        return <Button variant={variantProps?.variant as any} state={state}>按钮</Button>;

      case 'input':
        if (isInteractive) {
          return (
            <Input
              type={variantProps?.type as any}
              value={interactiveState.inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={interactiveState.inputFocused ? '正在输入...' : '请输入内容...'}
            />
          );
        }
        return <Input type={variantProps?.type as any} state={state} placeholder="请输入内容" />;

      case 'alert':
        if (isInteractive && interactiveState.alertVisible) {
          return (
            <Alert
              type={variantProps?.type as any}
              state={state}
              message="这是一条可关闭的提示信息"
              showIcon
              closable
              onClose={handleAlertClose}
            />
          );
        }
        if (isInteractive && !interactiveState.alertVisible) {
          return <span className="component-preview__empty-hint">2秒后重新显示...</span>;
        }
        return (
          <Alert
            type={variantProps?.type as any}
            state={state}
            message="这是一条提示信息"
            showIcon
          />
        );

      case 'switch':
        if (isInteractive) {
          return (
            <Switch
              checked={interactiveState.switchChecked}
              onChange={handleSwitchChange}
              label={interactiveState.switchChecked ? '已开启' : '已关闭'}
            />
          );
        }
        return (
          <Switch
            checked={variantProps?.checked as boolean}
            state={state}
            label={variantProps?.checked ? '开启' : '关闭'}
          />
        );

      default:
        return null;
    }
  }, [
    handleButtonClick,
    handleInputChange,
    handleInputFocus,
    handleInputBlur,
    handleSwitchChange,
    handleAlertClose,
    interactiveState,
  ]);

  const previewGrid = useMemo(() => {
    const { states, variants } = selectedComponent;
    const rows: { variant: typeof variants[0]; stateItems: { state: ComponentState; isInteractive: boolean }[] }[] = [];

    for (const variant of variants) {
      const stateItems = states.map((state, idx) => ({
        state,
        isInteractive: idx === 0 && variant.id === variants[0].id,
      }));
      rows.push({ variant, stateItems });
    }

    return rows;
  }, [selectedComponent]);

  return (
    <main className="component-preview">
      <div className="component-preview__header">
        <div>
          <h1 className="component-preview__title">{selectedComponent.name}</h1>
          <p className="component-preview__description">{selectedComponent.description}</p>
        </div>
        <div className="component-preview__meta">
          <span className="component-preview__badge">{selectedComponent.states.length} 种状态</span>
          <span className="component-preview__badge">{selectedComponent.variants.length} 种变体</span>
        </div>
      </div>

      <div className="component-preview__content" key={selectedComponent.id}>
        {previewGrid.map(({ variant, stateItems }) => (
          <section key={variant.id} className="component-preview__variant-section">
            <h3 className="component-preview__variant-title">{variant.name}</h3>
            <div className="component-preview__states-grid">
              {stateItems.map(({ state, isInteractive }) => (
                <div
                  key={state}
                  className={`component-preview__state-item ${
                    isInteractive ? 'component-preview__state-item--interactive' : ''
                  }`}
                >
                  <div className="component-preview__state-label">
                    {getStateLabel(state)}
                    {isInteractive && <span className="component-preview__interactive-badge">可交互</span>}
                  </div>
                  <div className="component-preview__state-content">
                    {renderComponent(selectedComponent.id, variant.props, state, isInteractive)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
};

ComponentPreview.displayName = 'ComponentPreview';

export default memo(ComponentPreview);

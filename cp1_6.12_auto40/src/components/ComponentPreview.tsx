import React, { memo, useMemo, useState, useCallback } from 'react';
import { useComponent } from '@/state/componentStore';
import { useTheme } from '@/state/themeStore';
import Button from './ui/Button';
import Input from './ui/Input';
import Alert from './ui/Alert';
import Switch from './ui/Switch';
import { ComponentState, ComponentType } from '@/types/component';
import './ComponentPreview.css';

interface InteractiveState {
  buttonLoading: boolean;
  buttonSuccess: boolean;
  buttonError: boolean;
  inputValue: string;
  switchChecked: boolean;
}

const ComponentPreview = () => {
  const { selectedComponent, getStateLabel } = useComponent();

  const [interactiveState, setInteractiveState] = useState<InteractiveState>({
    buttonLoading: false,
    buttonSuccess: false,
    buttonError: false,
    inputValue: '',
    switchChecked: true,
  });

  const handleButtonClick = useCallback(() => {
    setInteractiveState(prev => ({ ...prev, buttonLoading: true, buttonSuccess: false, buttonError: false }));
    setTimeout(() => {
      setInteractiveState(prev => ({ ...prev, buttonLoading: false, buttonSuccess: true }));
      setTimeout(() => {
        setInteractiveState(prev => ({ ...prev, buttonSuccess: false }));
      }, 1500);
    }, 1500);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInteractiveState(prev => ({ ...prev, inputValue: e.target.value }));
  }, []);

  const handleSwitchChange = useCallback((checked: boolean) => {
    setInteractiveState(prev => ({ ...prev, switchChecked: checked }));
  }, []);

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
            <Button
              variant={variantProps?.variant as any}
              onClick={handleButtonClick}
              loading={interactiveState.buttonLoading}
              success={interactiveState.buttonSuccess}
              error={interactiveState.buttonError}
            >
              点击我
            </Button>
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
              placeholder="请输入内容..."
            />
          );
        }
        return <Input type={variantProps?.type as any} state={state} placeholder="请输入内容" />;

      case 'alert':
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
              label="可交互开关"
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
  }, [handleButtonClick, handleInputChange, handleSwitchChange, interactiveState]);

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

      <div className="component-preview__content">
        {previewGrid.map(({ variant, stateItems }) => (
          <div key={variant.id} className="component-preview__variant-section">
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
          </div>
        ))}
      </div>
    </main>
  );
};

ComponentPreview.displayName = 'ComponentPreview';

export default memo(ComponentPreview);

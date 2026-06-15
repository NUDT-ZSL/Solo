/**
 * Button.tsx - 按钮组件
 *
 * 数据流向：
 *   - 输入：接收 props（variant/state/loading/success/error）
 *   - 处理：useMemo 计算状态类名 → 映射到对应的 CSS class
 *   - 输出：渲染 button 元素，应用主题 CSS 变量（--primary-color, --border-radius 等）
 *
 * 状态联动机制：
 *   - 静态展示：state prop → 添加 .ss-btn--state-{state} 类
 *   - 动态交互：success/error prop → 添加 .ss-btn--success/.ss-btn--error 类
 *   - 动画重放：useEffect 监听 success/error 从 false→true，
 *     通过 requestAnimationFrame 短暂移除再应用动画类，确保每次都重放
 *
 * 调用关系：
 *   - 被 ComponentPreview.tsx 调用
 *   - 间接消费 themeStore 的 CSS 变量（通过 var() 读取）
 *   - 不依赖任何 React Context（主题通过 CSS 变量传递，性能更好）
 */

import { memo, forwardRef, type ButtonHTMLAttributes, useMemo, useState, useEffect, useRef } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { type ComponentState, type ButtonVariant } from '@/types/component';
import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  state?: ComponentState;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      state = 'default',
      loading,
      success,
      error,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isLoading = loading || state === 'loading';
    const isSuccess = success || state === 'success';
    const isError = error || state === 'error';
    const isDisabled = disabled || state === 'disabled';

    const [animateSuccess, setAnimateSuccess] = useState(false);
    const [animateError, setAnimateError] = useState(false);
    const prevSuccessRef = useRef(isSuccess);
    const prevErrorRef = useRef(isError);

    useEffect(() => {
      if (isSuccess && !prevSuccessRef.current) {
        setAnimateSuccess(false);
        const raf1 = requestAnimationFrame(() => {
          const raf2 = requestAnimationFrame(() => {
            setAnimateSuccess(true);
          });
          return () => cancelAnimationFrame(raf2);
        });
        return () => cancelAnimationFrame(raf1);
      }
      if (!isSuccess && prevSuccessRef.current) {
        setAnimateSuccess(false);
      }
      prevSuccessRef.current = isSuccess;
    }, [isSuccess]);

    useEffect(() => {
      if (isError && !prevErrorRef.current) {
        setAnimateError(false);
        const raf1 = requestAnimationFrame(() => {
          const raf2 = requestAnimationFrame(() => {
            setAnimateError(true);
          });
          return () => cancelAnimationFrame(raf2);
        });
        return () => cancelAnimationFrame(raf1);
      }
      if (!isError && prevErrorRef.current) {
        setAnimateError(false);
      }
      prevErrorRef.current = isError;
    }, [isError]);

    const stateClass = useMemo(() => {
      return [
        `ss-btn--${variant}`,
        state !== 'default' && `ss-btn--state-${state}`,
        isLoading && 'ss-btn--loading',
        (isSuccess || animateSuccess) && 'ss-btn--success',
        (isError || animateError) && 'ss-btn--error',
        className,
      ]
        .filter(Boolean)
        .join(' ');
    }, [variant, state, isLoading, isSuccess, isError, animateSuccess, animateError, className]);

    const content = useMemo(() => {
      if (isLoading) {
        return (
          <>
            <Loader2 className="ss-btn__icon ss-btn__spinner" size={18} />
            <span className="ss-btn__text">加载中...</span>
          </>
        );
      }
      if (isSuccess) {
        return (
          <>
            <Check className="ss-btn__icon" size={18} />
            <span className="ss-btn__text">{children}</span>
          </>
        );
      }
      if (isError) {
        return (
          <>
            <X className="ss-btn__icon" size={18} />
            <span className="ss-btn__text">{children}</span>
          </>
        );
      }
      return children;
    }, [isLoading, isSuccess, isError, children]);

    return (
      <button
        ref={ref}
        className={`ss-btn ${stateClass}`}
        disabled={isDisabled || isLoading}
        data-state={state}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default memo(Button);

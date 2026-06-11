export type ComponentType = 'button' | 'input' | 'alert' | 'switch';
export type ComponentState = 'default' | 'hover' | 'focus' | 'loading' | 'disabled' | 'success' | 'error';

export type ButtonVariant = 'primary' | 'secondary' | 'text';
export type InputType = 'text' | 'password' | 'search';
export type AlertType = 'info' | 'warning' | 'error' | 'success';

export interface ComponentVariant {
  id: string;
  name: string;
  props?: Record<string, unknown>;
}

export interface ComponentItem {
  id: ComponentType;
  name: string;
  description: string;
  states: ComponentState[];
  variants: ComponentVariant[];
  defaultProps?: Record<string, unknown>;
}

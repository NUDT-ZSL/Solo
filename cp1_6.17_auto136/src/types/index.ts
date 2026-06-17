export type ComponentType = 'button' | 'input' | 'modal' | 'dropdown';

export type ComponentStatus = 'default' | 'hover' | 'focus' | 'disabled' | 'loading' | 'success' | 'error';

export interface ComponentItem {
  id: ComponentType;
  name: string;
  icon: string;
}

export interface ButtonProps {
  text: string;
  size: 'small' | 'medium' | 'large';
  themeColor: string;
  disabled: boolean;
  loading: boolean;
  status: ComponentStatus;
  icon?: string;
}

export interface InputProps {
  value: string;
  placeholder: string;
  size: 'small' | 'medium' | 'large';
  disabled: boolean;
  status: ComponentStatus;
  prefixIcon?: string;
  suffixIcon?: string;
  maxLength?: number;
}

export interface ModalProps {
  title: string;
  content: string;
  visible: boolean;
  confirmText: string;
  cancelText: string;
  status: ComponentStatus;
  showClose: boolean;
  maskClosable: boolean;
}

export interface DropdownProps {
  value: string;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  size: 'small' | 'medium' | 'large';
  disabled: boolean;
  status: ComponentStatus;
  open: boolean;
}

export type ComponentProps = ButtonProps | InputProps | ModalProps | DropdownProps;

export interface PropertyField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'color' | 'textarea';
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}

export interface ComponentConfig {
  type: ComponentType;
  defaultProps: ComponentProps;
  properties: PropertyField[];
  statusOptions: Array<{ label: string; value: ComponentStatus }>;
}

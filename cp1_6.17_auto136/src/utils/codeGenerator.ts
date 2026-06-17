import { ComponentType, ComponentProps, ButtonProps, InputProps, ModalProps, DropdownProps } from '../types';

const formatPropValue = (value: any): string => {
  if (typeof value === 'string') {
    return `'${value}'`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value, null, 2).replace(/\n/g, '\n  ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2).replace(/\n/g, '\n  ');
  }
  return String(value);
};

const generateButtonCode = (props: ButtonProps): string => {
  const parts: string[] = [];
  if (props.text !== '提交按钮') parts.push(`text=${formatPropValue(props.text)}`);
  if (props.size !== 'medium') parts.push(`size=${formatPropValue(props.size)}`);
  if (props.themeColor !== '#2563EB') parts.push(`themeColor=${formatPropValue(props.themeColor)}`);
  if (props.icon) parts.push(`icon=${formatPropValue(props.icon)}`);
  if (props.disabled) parts.push(`disabled={true}`);
  if (props.loading) parts.push(`loading={true}`);
  if (props.status !== 'default') parts.push(`status=${formatPropValue(props.status)}`);

  return `<Button${parts.length > 0 ? '\n  ' + parts.join('\n  ') + '\n' : ' '}/>`;
};

const generateInputCode = (props: InputProps): string => {
  const parts: string[] = [];
  if (props.value) parts.push(`value=${formatPropValue(props.value)}`);
  if (props.placeholder !== '请输入内容...') parts.push(`placeholder=${formatPropValue(props.placeholder)}`);
  if (props.size !== 'medium') parts.push(`size=${formatPropValue(props.size)}`);
  if (props.prefixIcon) parts.push(`prefixIcon=${formatPropValue(props.prefixIcon)}`);
  if (props.suffixIcon) parts.push(`suffixIcon=${formatPropValue(props.suffixIcon)}`);
  if (props.maxLength !== 100) parts.push(`maxLength={${props.maxLength}}`);
  if (props.disabled) parts.push(`disabled={true}`);
  if (props.status !== 'default') parts.push(`status=${formatPropValue(props.status)}`);

  return `<Input${parts.length > 0 ? '\n  ' + parts.join('\n  ') + '\n' : ' '}/>`;
};

const generateModalCode = (props: ModalProps): string => {
  const parts: string[] = [];
  if (props.title !== '提示信息') parts.push(`title=${formatPropValue(props.title)}`);
  if (props.content !== '这是弹窗的内容区域，可以放置任意信息。') parts.push(`content=${formatPropValue(props.content)}`);
  if (!props.visible) parts.push(`visible={false}`);
  if (props.confirmText !== '确定') parts.push(`confirmText=${formatPropValue(props.confirmText)}`);
  if (props.cancelText !== '取消') parts.push(`cancelText=${formatPropValue(props.cancelText)}`);
  if (!props.showClose) parts.push(`showClose={false}`);
  if (!props.maskClosable) parts.push(`maskClosable={false}`);
  if (props.status !== 'default') parts.push(`status=${formatPropValue(props.status)}`);

  return `<Modal${parts.length > 0 ? '\n  ' + parts.join('\n  ') + '\n' : ' '}/>`;
};

const generateDropdownCode = (props: DropdownProps): string => {
  const parts: string[] = [];
  if (props.value) parts.push(`value=${formatPropValue(props.value)}`);
  if (props.placeholder !== '请选择') parts.push(`placeholder=${formatPropValue(props.placeholder)}`);
  if (props.size !== 'medium') parts.push(`size=${formatPropValue(props.size)}`);
  if (props.open) parts.push(`open={true}`);
  if (props.disabled) parts.push(`disabled={true}`);
  if (props.status !== 'default') parts.push(`status=${formatPropValue(props.status)}`);

  const optionsCode = `options={[
    { label: '选项一', value: 'option1' },
    { label: '选项二', value: 'option2' },
    { label: '选项三', value: 'option3' },
    { label: '选项四', value: 'option4' },
  ]}`;

  return `<Dropdown\n  ${optionsCode}${parts.length > 0 ? '\n  ' + parts.join('\n  ') : ''}\n/>`;
};

export const generateComponentCode = (type: ComponentType, props: ComponentProps): string => {
  switch (type) {
    case 'button':
      return generateButtonCode(props as ButtonProps);
    case 'input':
      return generateInputCode(props as InputProps);
    case 'modal':
      return generateModalCode(props as ModalProps);
    case 'dropdown':
      return generateDropdownCode(props as DropdownProps);
    default:
      return '';
  }
};

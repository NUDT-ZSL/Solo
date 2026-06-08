export function Fragment(props: any, ...children: any[]): any[] {
  return children.flat();
}

export function h(
  tag: string | Function,
  props: Record<string, any> | null,
  ...children: any[]
): HTMLElement | Text | any[] {
  if (typeof tag === 'function') {
    return tag({ ...props, children });
  }

  const el = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
      } else if (key === 'checked' || key === 'disabled' || key === 'value') {
        (el as any)[key] = value;
      } else {
        el.setAttribute(key, value);
      }
    }
  }

  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof HTMLElement || child instanceof Text) {
      el.appendChild(child);
    }
  }

  return el;
}

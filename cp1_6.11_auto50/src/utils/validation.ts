import type { SankeyData, ValidationResult } from '../types';

export function validateSankeyData(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['数据必须是一个对象'] };
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.nodes)) {
    errors.push('缺少 nodes 数组');
  } else {
    const nodeIds = new Set<string>();
    obj.nodes.forEach((node: unknown, index: number) => {
      if (!node || typeof node !== 'object') {
        errors.push(`nodes[${index}] 必须是一个对象`);
        return;
      }
      const n = node as Record<string, unknown>;
      if (typeof n.id !== 'string' || n.id.trim() === '') {
        errors.push(`nodes[${index}] 缺少有效的 id 字段`);
      } else {
        if (nodeIds.has(n.id)) {
          errors.push(`nodes[${index}] 存在重复的 id: ${n.id}`);
        }
        nodeIds.add(n.id);
      }
      if (typeof n.label !== 'string' || n.label.trim() === '') {
        errors.push(`nodes[${index}] 缺少有效的 label 字段`);
      }
    });
  }

  if (!Array.isArray(obj.links)) {
    errors.push('缺少 links 数组');
  } else {
    const nodeIds = new Set<string>(
      Array.isArray(obj.nodes)
        ? obj.nodes
            .filter((n): n is { id: string } => typeof n === 'object' && n !== null && typeof (n as { id?: unknown }).id === 'string')
            .map(n => n.id)
        : []
    );

    obj.links.forEach((link: unknown, index: number) => {
      if (!link || typeof link !== 'object') {
        errors.push(`links[${index}] 必须是一个对象`);
        return;
      }
      const l = link as Record<string, unknown>;
      if (typeof l.source !== 'string' || l.source.trim() === '') {
        errors.push(`links[${index}] 缺少有效的 source 字段`);
      } else if (!nodeIds.has(l.source)) {
        errors.push(`links[${index}] 的 source "${l.source}" 不存在于 nodes 中`);
      }
      if (typeof l.target !== 'string' || l.target.trim() === '') {
        errors.push(`links[${index}] 缺少有效的 target 字段`);
      } else if (!nodeIds.has(l.target)) {
        errors.push(`links[${index}] 的 target "${l.target}" 不存在于 nodes 中`);
      }
      if (typeof l.value !== 'number' || l.value <= 0) {
        errors.push(`links[${index}] 的 value 必须是大于 0 的数字`);
      }
      if (typeof l.source === 'string' && typeof l.target === 'string' && l.source === l.target) {
        errors.push(`links[${index}] 的 source 和 target 不能相同`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function parseJsonFile(file: File): Promise<SankeyData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        resolve(data as SankeyData);
      } catch (err) {
        reject(new Error('JSON 解析失败：' + (err as Error).message));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

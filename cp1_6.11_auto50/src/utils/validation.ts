import type { SankeyData, ValidationResult } from '../types';

export function validateSankeyData(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (data === null || data === undefined) {
    return { valid: false, errors: ['数据为空：文件内容为 null 或 undefined'] };
  }

  if (typeof data !== 'object') {
    return { valid: false, errors: [`数据格式错误：根节点必须是对象，当前是 ${typeof data}`] };
  }

  const obj = data as Record<string, unknown>;

  if (!('nodes' in obj)) {
    errors.push('缺少必需字段：nodes');
  }
  if (!('links' in obj)) {
    errors.push('缺少必需字段：links');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  if (!Array.isArray(obj.nodes)) {
    errors.push(`nodes 必须是数组类型，当前是 ${Array.isArray(obj.nodes) ? '数组' : typeof obj.nodes}`);
  } else {
    const nodeIds = new Set<string>();
    const idToLabel = new Map<string, string>();

    if (obj.nodes.length === 0) {
      errors.push('nodes 数组不能为空，至少需要包含一个节点');
    }

    obj.nodes.forEach((node: unknown, index: number) => {
      if (node === null || node === undefined || typeof node !== 'object') {
        errors.push(`nodes[${index}] 格式错误：必须是对象`);
        return;
      }
      const n = node as Record<string, unknown>;

      if (!('id' in n)) {
        errors.push(`nodes[${index}] 缺少必需字段：id`);
      } else if (typeof n.id !== 'string') {
        errors.push(`nodes[${index}] 的 id 必须是字符串类型`);
      } else if (n.id.trim() === '') {
        errors.push(`nodes[${index}] 的 id 不能为空字符串`);
      } else {
        if (nodeIds.has(n.id)) {
          errors.push(`nodes[${index}] 存在重复的节点 id: "${n.id}"（首次出现在 nodes[${idToLabel.get(n.id)}]）`);
        }
        nodeIds.add(n.id);
        idToLabel.set(n.id, String(index));
      }

      if (!('label' in n)) {
        errors.push(`nodes[${index}] 缺少必需字段：label`);
      } else if (typeof n.label !== 'string') {
        errors.push(`nodes[${index}] 的 label 必须是字符串类型`);
      } else if (n.label.trim() === '') {
        errors.push(`nodes[${index}] 的 label 不能为空字符串`);
      }
    });
  }

  if (!Array.isArray(obj.links)) {
    errors.push(`links 必须是数组类型，当前是 ${Array.isArray(obj.links) ? '数组' : typeof obj.links}`);
  } else {
    const nodeIds = new Set<string>(
      Array.isArray(obj.nodes)
        ? obj.nodes
            .filter((n): n is { id: string; label: string } =>
              typeof n === 'object' &&
              n !== null &&
              typeof (n as { id?: unknown }).id === 'string' &&
              (n as { id: string }).id.trim() !== '' &&
              typeof (n as { label?: unknown }).label === 'string'
            )
            .map(n => n.id)
        : []
    );

    if (obj.links.length === 0) {
      errors.push('links 数组不能为空，至少需要包含一条连接');
    }

    const seenLinks = new Set<string>();

    obj.links.forEach((link: unknown, index: number) => {
      if (link === null || link === undefined || typeof link !== 'object') {
        errors.push(`links[${index}] 格式错误：必须是对象`);
        return;
      }
      const l = link as Record<string, unknown>;

      let sourceId = '';
      let targetId = '';

      if (!('source' in l)) {
        errors.push(`links[${index}] 缺少必需字段：source`);
      } else if (typeof l.source !== 'string') {
        errors.push(`links[${index}] 的 source 必须是字符串类型（节点 id）`);
      } else if (l.source.trim() === '') {
        errors.push(`links[${index}] 的 source 不能为空字符串`);
      } else {
        sourceId = l.source;
        if (!nodeIds.has(l.source)) {
          errors.push(`links[${index}] 的 source "${l.source}" 在 nodes 中找不到对应的节点`);
        }
      }

      if (!('target' in l)) {
        errors.push(`links[${index}] 缺少必需字段：target`);
      } else if (typeof l.target !== 'string') {
        errors.push(`links[${index}] 的 target 必须是字符串类型（节点 id）`);
      } else if (l.target.trim() === '') {
        errors.push(`links[${index}] 的 target 不能为空字符串`);
      } else {
        targetId = l.target;
        if (!nodeIds.has(l.target)) {
          errors.push(`links[${index}] 的 target "${l.target}" 在 nodes 中找不到对应的节点`);
        }
      }

      if (!('value' in l)) {
        errors.push(`links[${index}] 缺少必需字段：value`);
      } else if (typeof l.value !== 'number') {
        errors.push(`links[${index}] 的 value 必须是数字类型，当前是 ${typeof l.value}`);
      } else if (isNaN(l.value)) {
        errors.push(`links[${index}] 的 value 不能是 NaN`);
      } else if (!isFinite(l.value)) {
        errors.push(`links[${index}] 的 value 必须是有限数字`);
      } else if (l.value <= 0) {
        errors.push(`links[${index}] 的 value 必须大于 0，当前值是 ${l.value}`);
      }

      if (sourceId && targetId && sourceId === targetId) {
        errors.push(`links[${index}] 的 source 和 target 不能相同（"${sourceId}" → "${targetId}"）`);
      }

      if (sourceId && targetId) {
        const linkKey = `${sourceId}→${targetId}`;
        if (seenLinks.has(linkKey)) {
          errors.push(`links[${index}] 存在重复的连接：${linkKey}（建议将相同 source/target 的 value 合并）`);
        }
        seenLinks.add(linkKey);
      }
    });
  }

  if (errors.length > 20) {
    const summary = errors.slice(0, 20);
    summary.push(`... 以及其他 ${errors.length - 20} 条错误，请逐一检查数据格式`);
    return { valid: false, errors: summary };
  }

  return { valid: errors.length === 0, errors };
}

export function parseJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (file.size === 0) {
      reject(new Error('文件为空：上传的 JSON 文件大小为 0 字节'));
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      reject(new Error(`文件过大：当前文件大小为 ${(file.size / 1024 / 1024).toFixed(2)}MB，最大支持 ${maxSize / 1024 / 1024}MB`));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;

        if (!content || content.trim() === '') {
          reject(new Error('文件内容为空：JSON 文件没有任何数据'));
          return;
        }

        const trimmed = content.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          reject(new Error('JSON 格式错误：文件内容必须以 "{" 或 "[" 开头，请确认是合法的 JSON 格式'));
          return;
        }

        let data: unknown;
        try {
          data = JSON.parse(content);
        } catch (parseErr) {
          const err = parseErr as Error;
          const match = err.message.match(/position\s+(\d+)/i);
          let positionMsg = '';
          if (match) {
            const pos = parseInt(match[1], 10);
            const lines = content.slice(0, pos).split('\n');
            const line = lines.length;
            const col = lines[lines.length - 1].length + 1;
            positionMsg = `（第 ${line} 行，第 ${col} 列附近）`;
          }
          reject(new Error(`JSON 解析失败${positionMsg}：${err.message}`));
          return;
        }

        resolve(data);
      } catch (err) {
        reject(new Error('文件读取异常：' + (err instanceof Error ? err.message : '未知错误')));
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败：浏览器无法读取该文件，请确认文件未被占用且权限正常'));
    };

    reader.onabort = () => {
      reject(new Error('文件读取被中止'));
    };

    try {
      reader.readAsText(file, 'utf-8');
    } catch (err) {
      reject(new Error('启动文件读取失败：' + (err instanceof Error ? err.message : '未知错误')));
    }
  });
}

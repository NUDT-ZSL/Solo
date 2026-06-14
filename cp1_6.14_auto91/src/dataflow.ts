import {
  NodeData,
  Connection,
  NodeOutput,
  DataRow,
  CSVReaderConfig,
  FilterConfig,
  MergeColumnsConfig,
  ChartConfig,
  ChartDataPoint,
} from './types';

function topologicalSort(
  nodes: NodeData[],
  connections: Connection[]
): string[] {
  const inDegree: Map<string, number> = new Map();
  const adjacency: Map<string, string[]> = new Map();

  nodes.forEach((node) => {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  connections.forEach((conn) => {
    const sourceId = conn.sourceNodeId;
    const targetId = conn.targetNodeId;
    if (adjacency.has(sourceId) && inDegree.has(targetId)) {
      adjacency.get(sourceId)!.push(targetId);
      inDegree.set(targetId, inDegree.get(targetId)! + 1);
    }
  });

  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  const result: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    neighbors.forEach((neighbor) => {
      const newDegree = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    });
  }

  if (result.length !== nodes.length) {
    throw new Error('数据流存在循环依赖，无法执行');
  }

  return result;
}

function parseCSV(content: string, delimiter: string, hasHeader: boolean): { columns: string[]; data: DataRow[] } {
  const lines = content.trim().split('\n');
  if (lines.length === 0) {
    return { columns: [], data: [] };
  }

  let columns: string[] = [];
  let startIndex = 0;

  if (hasHeader) {
    columns = lines[0].split(delimiter).map((col) => col.trim().replace(/^["']|["']$/g, ''));
    startIndex = 1;
  } else {
    const firstLine = lines[0].split(delimiter);
    columns = firstLine.map((_, i) => `列${i + 1}`);
  }

  const data: DataRow[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((val) => {
      const trimmed = val.trim().replace(/^["']|["']$/g, '');
      const num = Number(trimmed);
      return isNaN(num) ? trimmed : num;
    });

    const row: DataRow = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx] ?? '';
    });
    data.push(row);
  }

  return { columns, data };
}

function executeCSVReader(node: NodeData): NodeOutput {
  const config = node.config as CSVReaderConfig;
  if (!config.fileContent) {
    return {
      data: [],
      columns: [],
    };
  }

  const { columns, data } = parseCSV(
    config.fileContent,
    config.delimiter || ',',
    config.hasHeader
  );

  return { data, columns };
}

function executeFilter(node: NodeData, input: NodeOutput): NodeOutput {
  const config = node.config as FilterConfig;
  const { field, operator, value } = config;

  if (!field || !input.data.length) {
    return input;
  }

  const filtered = input.data.filter((row) => {
    const cellValue = row[field];
    const cellStr = String(cellValue);
    const cellNum = Number(cellValue);
    const valueNum = Number(value);

    switch (operator) {
      case 'equals':
        return cellStr === value;
      case 'not_equals':
        return cellStr !== value;
      case 'greater_than':
        return !isNaN(cellNum) && !isNaN(valueNum) && cellNum > valueNum;
      case 'less_than':
        return !isNaN(cellNum) && !isNaN(valueNum) && cellNum < valueNum;
      case 'contains':
        return cellStr.includes(value);
      default:
        return true;
    }
  });

  return {
    ...input,
    data: filtered,
  };
}

function executeMergeColumns(node: NodeData, input: NodeOutput): NodeOutput {
  const config = node.config as MergeColumnsConfig;
  const { sourceColumns, targetColumn, separator } = config;

  if (sourceColumns.length === 0 || !input.data.length) {
    return input;
  }

  const mergedData = input.data.map((row) => {
    const mergedValue = sourceColumns
      .map((col) => row[col] ?? '')
      .join(separator || ' ');
    return { ...row, [targetColumn]: mergedValue };
  });

  const newColumns = [...input.columns];
  if (!newColumns.includes(targetColumn)) {
    newColumns.push(targetColumn);
  }

  return {
    data: mergedData,
    columns: newColumns,
  };
}

function executeChart(node: NodeData, input: NodeOutput): NodeOutput {
  const config = node.config as ChartConfig;
  const { xField, yField } = config;

  if (!xField || !yField || !input.data.length) {
    return {
      ...input,
      chartData: [],
    };
  }

  const chartData: ChartDataPoint[] = input.data.map((row) => ({
    x: row[xField],
    y: Number(row[yField]) || 0,
  }));

  return {
    ...input,
    chartData,
  };
}

function executeTable(node: NodeData, input: NodeOutput): NodeOutput {
  return input;
}

export function executeNode(
  node: NodeData,
  inputs: NodeOutput[]
): NodeOutput {
  switch (node.type) {
    case 'csv-reader':
      return executeCSVReader(node);
    case 'filter':
      return executeFilter(node, inputs[0] || { data: [], columns: [] });
    case 'merge-columns':
      return executeMergeColumns(node, inputs[0] || { data: [], columns: [] });
    case 'chart':
      return executeChart(node, inputs[0] || { data: [], columns: [] });
    case 'table':
      return executeTable(node, inputs[0] || { data: [], columns: [] });
    default:
      return { data: [], columns: [] };
  }
}

export function getInputNodes(
  nodeId: string,
  connections: Connection[]
): string[] {
  return connections
    .filter((conn) => conn.targetNodeId === nodeId)
    .map((conn) => conn.sourceNodeId);
}

export interface ExecutionResult {
  results: Map<string, NodeOutput>;
  nodeStatuses: Map<string, { status: NodeData['status']; error?: string }>;
}

export async function runPipeline(
  nodes: NodeData[],
  connections: Connection[],
  onNodeStart?: (nodeId: string) => void,
  onNodeComplete?: (nodeId: string, success: boolean, error?: string) => void
): Promise<ExecutionResult> {
  const results = new Map<string, NodeOutput>();
  const nodeStatuses = new Map<string, { status: NodeData['status']; error?: string }>();

  nodes.forEach((node) => {
    nodeStatuses.set(node.id, { status: 'idle' });
  });

  try {
    const executionOrder = topologicalSort(nodes, connections);

    for (const nodeId of executionOrder) {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      onNodeStart?.(nodeId);
      nodeStatuses.set(nodeId, { status: 'running' });

      try {
        const inputNodeIds = getInputNodes(nodeId, connections);
        const inputs: NodeOutput[] = inputNodeIds
          .map((id) => results.get(id))
          .filter((out): out is NodeOutput => out !== undefined);

        const output = executeNode(node, inputs);
        results.set(nodeId, output);

        nodeStatuses.set(nodeId, { status: 'success' });
        onNodeComplete?.(nodeId, true);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        nodeStatuses.set(nodeId, { status: 'error', error: errorMsg });
        onNodeComplete?.(nodeId, false, errorMsg);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '执行失败';
    nodes.forEach((node) => {
      if (nodeStatuses.get(node.id)?.status === 'idle') {
        nodeStatuses.set(node.id, { status: 'error', error: errorMsg });
      }
    });
  }

  return { results, nodeStatuses };
}

export { topologicalSort };

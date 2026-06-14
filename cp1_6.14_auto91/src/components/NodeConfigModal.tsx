import React, { useState, useRef } from 'react';
import {
  NodeData,
  NodeConfig,
  CSVReaderConfig,
  FilterConfig,
  MergeColumnsConfig,
  ChartConfig,
  TableConfig,
  TOOL_NODES,
} from '../types';

interface NodeConfigModalProps {
  node: NodeData;
  onSave: (nodeId: string, config: NodeConfig) => void;
  onClose: () => void;
}

const NodeConfigModal: React.FC<NodeConfigModalProps> = ({ node, onSave, onClose }) => {
  const [config, setConfig] = useState<NodeConfig>({ ...node.config });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nodeDef = TOOL_NODES.find((t) => t.type === node.type);
  const title = nodeDef ? `${nodeDef.icon} ${nodeDef.label} 配置` : '节点配置';

  const handleApply = () => {
    onSave(node.id, config);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setConfig((prev) => ({
        ...prev,
        fileName: file.name,
        fileContent: content,
      } as CSVReaderConfig));
    };
    reader.readAsText(file);
  };

  const renderCSVReaderConfig = () => {
    const csvConfig = config as CSVReaderConfig;
    return (
      <>
        <div className="form-group">
          <label className="form-label">CSV文件</label>
          <div
            className="file-upload"
            onClick={() => fileInputRef.current?.click()}
          >
            <p>{csvConfig.fileName ? '📂 已选择文件' : '📁 点击上传CSV文件'}</p>
            {csvConfig.fileName && (
              <p className="file-name">{csvConfig.fileName}</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>
        <div className="form-group">
          <label className="form-label">分隔符</label>
          <select
            className="form-select"
            value={csvConfig.delimiter}
            onChange={(e) => setConfig({ ...csvConfig, delimiter: e.target.value } as CSVReaderConfig)}
          >
            <option value=",">逗号 (,)</option>
            <option value="\t">制表符 (Tab)</option>
            <option value=";">分号 (;)</option>
            <option value="|">竖线 (|)</option>
          </select>
        </div>
        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="hasHeader"
              checked={csvConfig.hasHeader}
              onChange={(e) => setConfig({ ...csvConfig, hasHeader: e.target.checked } as CSVReaderConfig)}
            />
            <label htmlFor="hasHeader" className="form-label" style={{ marginBottom: 0 }}>首行包含表头</label>
          </div>
        </div>
      </>
    );
  };

  const renderFilterConfig = () => {
    const filterConfig = config as FilterConfig;
    return (
      <>
        <div className="form-group">
          <label className="form-label">筛选字段</label>
          <input
            className="form-input"
            type="text"
            placeholder="输入字段名"
            value={filterConfig.field}
            onChange={(e) => setConfig({ ...filterConfig, field: e.target.value } as FilterConfig)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">条件</label>
          <select
            className="form-select"
            value={filterConfig.operator}
            onChange={(e) => setConfig({ ...filterConfig, operator: e.target.value as FilterConfig['operator'] } as FilterConfig)}
          >
            <option value="equals">等于</option>
            <option value="not_equals">不等于</option>
            <option value="greater_than">大于</option>
            <option value="less_than">小于</option>
            <option value="contains">包含</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">值</label>
          <input
            className="form-input"
            type="text"
            placeholder="输入筛选值"
            value={filterConfig.value}
            onChange={(e) => setConfig({ ...filterConfig, value: e.target.value } as FilterConfig)}
          />
        </div>
      </>
    );
  };

  const renderMergeColumnsConfig = () => {
    const mergeConfig = config as MergeColumnsConfig;
    return (
      <>
        <div className="form-group">
          <label className="form-label">源列名（逗号分隔）</label>
          <input
            className="form-input"
            type="text"
            placeholder="例如: firstName,lastName"
            value={mergeConfig.sourceColumns.join(',')}
            onChange={(e) => setConfig({
              ...mergeConfig,
              sourceColumns: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            } as MergeColumnsConfig)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">目标列名</label>
          <input
            className="form-input"
            type="text"
            placeholder="合并后的列名"
            value={mergeConfig.targetColumn}
            onChange={(e) => setConfig({ ...mergeConfig, targetColumn: e.target.value } as MergeColumnsConfig)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">分隔符</label>
          <input
            className="form-input"
            type="text"
            placeholder="默认为空格"
            value={mergeConfig.separator}
            onChange={(e) => setConfig({ ...mergeConfig, separator: e.target.value } as MergeColumnsConfig)}
          />
        </div>
      </>
    );
  };

  const renderChartConfig = () => {
    const chartConfig = config as ChartConfig;
    return (
      <>
        <div className="form-group">
          <label className="form-label">图表类型</label>
          <select
            className="form-select"
            value={chartConfig.chartType}
            onChange={(e) => setConfig({ ...chartConfig, chartType: e.target.value as ChartConfig['chartType'] } as ChartConfig)}
          >
            <option value="bar">柱状图</option>
            <option value="line">折线图</option>
            <option value="scatter">散点图</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">X轴字段</label>
          <input
            className="form-input"
            type="text"
            placeholder="X轴数据字段名"
            value={chartConfig.xField}
            onChange={(e) => setConfig({ ...chartConfig, xField: e.target.value } as ChartConfig)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Y轴字段</label>
          <input
            className="form-input"
            type="text"
            placeholder="Y轴数据字段名"
            value={chartConfig.yField}
            onChange={(e) => setConfig({ ...chartConfig, yField: e.target.value } as ChartConfig)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">图表标题</label>
          <input
            className="form-input"
            type="text"
            placeholder="输入图表标题"
            value={chartConfig.title}
            onChange={(e) => setConfig({ ...chartConfig, title: e.target.value } as ChartConfig)}
          />
        </div>
      </>
    );
  };

  const renderTableConfig = () => {
    const tableConfig = config as TableConfig;
    return (
      <div className="form-group">
        <label className="form-label">每页行数</label>
        <input
          className="form-input"
          type="number"
          min={5}
          max={100}
          value={tableConfig.pageSize}
          onChange={(e) => setConfig({ ...tableConfig, pageSize: parseInt(e.target.value) || 20 } as TableConfig)}
        />
      </div>
    );
  };

  const renderConfigForm = () => {
    switch (node.type) {
      case 'csv-reader':
        return renderCSVReaderConfig();
      case 'filter':
        return renderFilterConfig();
      case 'merge-columns':
        return renderMergeColumnsConfig();
      case 'chart':
        return renderChartConfig();
      case 'table':
        return renderTableConfig();
      default:
        return <p>暂无配置项</p>;
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        <div className="modal-body">
          {renderConfigForm()}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleApply}>应用</button>
        </div>
      </div>
    </div>
  );
};

export default NodeConfigModal;

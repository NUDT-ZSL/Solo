import { useState, useEffect } from 'react';
import NeuralNetwork from './NeuralNetwork';
import ModelLoader from './ModelLoader';
import type { VisualizationData, NeuronData, SavedModel } from '../types';

const LAYER_COLOR_BAR: Record<string, string> = {
  input: '#3b82f6',
  hidden: '#8b5cf6',
  output: '#f97316'
};

export default function NeuronVizApp() {
  const [vizData, setVizData] = useState<VisualizationData | null>(null);
  const [selectedNeuron, setSelectedNeuron] = useState<NeuronData | null>(null);
  const [showLoader, setShowLoader] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
  const [showConnectionLabels, setShowConnectionLabels] = useState(false);
  const [showLayerLabels, setShowLayerLabels] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchSavedModels = async () => {
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        setSavedModels(data);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  useEffect(() => {
    fetchSavedModels();
  }, []);

  const handleLoadModel = async (modelId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/models/${modelId}/visualize`);
      if (!response.ok) {
        throw new Error('Failed to load model');
      }
      const data: VisualizationData = await response.json();
      setVizData(data);
      setSelectedNeuron(null);
      setShowPresets(false);
    } catch (error) {
      console.error('Failed to load model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteModel = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/models/${modelId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSavedModels(models => models.filter(m => m.id !== modelId));
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWeightRange = (weights: number[] = []) => {
    if (weights.length === 0) return 'N/A';
    const min = Math.min(...weights).toFixed(3);
    const max = Math.max(...weights).toFixed(3);
    return `[${min}, ${max}]`;
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div
        style={{
          width: isMobile ? '100%' : '60px',
          height: isMobile ? '60px' : '100%',
          backgroundColor: '#1e1e2e',
          borderRadius: isMobile ? '0 0 12px 12px' : '0 12px 12px 0',
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: isMobile ? 'space-around' : 'flex-start',
          padding: isMobile ? '0 20px' : '16px 0',
          gap: isMobile ? '0' : '12px',
          flexShrink: 0,
          zIndex: 100
        }}
      >
        <button
          onClick={() => setShowLoader(true)}
          title="Upload Model"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          📁
        </button>
        <button
          onClick={() => {
            fetchSavedModels();
            setShowPresets(true);
          }}
          title="Presets"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          📋
        </button>
        <button
          onClick={() => {
            setVizData(null);
            setSelectedNeuron(null);
            setTimeout(() => {
              if (vizData) setVizData({ ...vizData });
            }, 100);
          }}
          title="Reset View"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          🔄
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minWidth: 0
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 50,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '12px',
            padding: '12px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showConnectionLabels}
                onChange={(e) => setShowConnectionLabels(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
              />
              显示连接标签
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showLayerLabels}
                onChange={(e) => setShowLayerLabels(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
              />
              显示层标签
            </label>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {vizData ? (
            <NeuralNetwork
              data={vizData}
              showConnectionLabels={showConnectionLabels}
              showLayerLabels={showLayerLabels}
              onNeuronClick={setSelectedNeuron}
              highlightedNeuronId={selectedNeuron?.id || null}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#1a1a2e',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888'
              }}
            >
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🧠</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
                NeuronViz
              </div>
              <div style={{ fontSize: '14px', textAlign: 'center', maxWidth: '400px' }}>
                点击左侧工具栏的上传按钮，或点击右下角的加号按钮选择预设模型
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            height: '40px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '24px',
            color: '#ffffff',
            fontSize: '13px',
            flexShrink: 0
          }}
        >
          <span>📊 模型: <strong style={{ color: '#3b82f6' }}>{vizData?.name || '未加载'}</strong></span>
          <span>🔵 神经元: <strong>{vizData?.totalNeurons || 0}</strong></span>
          <span>🔗 连接: <strong>{vizData?.totalConnections || 0}</strong></span>
        </div>

        <button
          onClick={() => {
            fetchSavedModels();
            setShowPresets(true);
          }}
          title="Load Preset Model"
          style={{
            position: 'absolute',
            right: '20px',
            bottom: '60px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 50
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          +
        </button>
      </div>

      {selectedNeuron && (
        <div
          style={{
            width: '320px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            margin: isMobile ? '8px' : '16px 16px 16px 0',
            flexShrink: 0,
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: isMobile ? '40vh' : 'calc(100vh - 32px)'
          }}
        >
          <div
            style={{
              height: '2px',
              backgroundColor: LAYER_COLOR_BAR[selectedNeuron.layerType]
            }}
          />
          <div style={{ padding: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>神经元详情</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#1e1e2e' }}>
                  {selectedNeuron.layerName} #{selectedNeuron.neuronIndex + 1}
                </div>
              </div>
              <button
                onClick={() => setSelectedNeuron(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0 4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#1e1e2e';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#888';
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>层名称</span>
                <span style={{ color: '#1e1e2e', fontSize: '14px', fontWeight: 500 }}>{selectedNeuron.layerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>层类型</span>
                <span style={{ color: LAYER_COLOR_BAR[selectedNeuron.layerType], fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                  {selectedNeuron.layerType}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>神经元序号</span>
                <span style={{ color: '#1e1e2e', fontSize: '14px', fontWeight: 500 }}>#{selectedNeuron.neuronIndex + 1}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>连接数</span>
                <span style={{ color: '#1e1e2e', fontSize: '14px', fontWeight: 500 }}>
                  {(selectedNeuron.inputWeights?.length || 0) + (selectedNeuron.outputWeights?.length || 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>输入连接</span>
                <span style={{ color: '#1e1e2e', fontSize: '14px', fontWeight: 500 }}>{selectedNeuron.inputWeights?.length || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>输出连接</span>
                <span style={{ color: '#1e1e2e', fontSize: '14px', fontWeight: 500 }}>{selectedNeuron.outputWeights?.length || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>输入权重区间</span>
                <span style={{ color: '#1e1e2e', fontSize: '14px', fontWeight: 500, fontFamily: 'monospace' }}>
                  {getWeightRange(selectedNeuron.inputWeights)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>输出权重区间</span>
                <span style={{ color: '#1e1e2e', fontSize: '14px', fontWeight: 500, fontFamily: 'monospace' }}>
                  {getWeightRange(selectedNeuron.outputWeights)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLoader && (
        <ModelLoader
          onLoad={(data) => {
            setVizData(data);
            setSelectedNeuron(null);
            fetchSavedModels();
          }}
          onClose={() => setShowLoader(false)}
        />
      )}

      {showPresets && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowPresets(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#1e1e2e', fontSize: '24px', fontWeight: 600, margin: 0 }}>
                Preset Models
              </h2>
              <button
                onClick={() => setShowPresets(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#1e1e2e';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#888';
                }}
              >
                ×
              </button>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                Loading...
              </div>
            ) : savedModels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>No saved models</div>
                <div style={{ fontSize: '14px' }}>Upload and save a model first</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {savedModels.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => handleLoadModel(model.id)}
                    style={{
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e1e2e', marginBottom: '4px' }}>
                        {model.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {formatDate(model.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteModel(model.id, e)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        e.currentTarget.style.backgroundColor = '#dc2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ef4444';
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, type ChangeEvent } from 'react';
import type { ModelConfig, VisualizationData } from '../types';

interface ModelLoaderProps {
  onLoad: (data: VisualizationData) => void;
  onClose: () => void;
}

export default function ModelLoader({ onLoad, onClose }: ModelLoaderProps) {
  const [jsonText, setJsonText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateJson = (text: string): ModelConfig | null => {
    try {
      const parsed = JSON.parse(text);
      
      if (!parsed.layers || !Array.isArray(parsed.layers)) {
        throw new Error('Configuration must have a "layers" array');
      }
      
      if (parsed.layers.length < 2) {
        throw new Error('At least 2 layers are required');
      }

      parsed.layers.forEach((layer: any, index: number) => {
        if (!layer.name) throw new Error(`Layer ${index} is missing "name"`);
        if (!layer.type || !['input', 'hidden', 'output'].includes(layer.type)) {
          throw new Error(`Layer ${layer.name} has invalid type`);
        }
        if (typeof layer.neurons !== 'number' || layer.neurons < 1) {
          throw new Error(`Layer ${layer.name} has invalid neuron count`);
        }
        if (!layer.activation) {
          throw new Error(`Layer ${layer.name} is missing "activation"`);
        }
      });

      return parsed;
    } catch (e) {
      throw new Error(`JSON parsing error: ${(e as Error).message}`);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('Please upload a valid JSON file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonText(text);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const config = validateJson(jsonText);
      if (!config) return;

      const response = await fetch('/api/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to visualize model');
      }

      const data: VisualizationData = await response.json();
      onLoad(data);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndSubmit = async () => {
    if (!modelName.trim()) {
      setError('Please enter a model name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const config = validateJson(jsonText);
      if (!config) return;

      const saveResponse = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, config })
      });

      if (!saveResponse.ok) {
        const data = await saveResponse.json();
        throw new Error(data.error || 'Failed to save model');
      }

      const savedModel = await saveResponse.json();

      const vizResponse = await fetch(`/api/models/${savedModel._id}/visualize`);
      if (!vizResponse.ok) {
        const data = await vizResponse.json();
        throw new Error(data.error || 'Failed to visualize model');
      }

      const data: VisualizationData = await vizResponse.json();
      onLoad(data);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1e1e2e',
          borderRadius: '20px',
          padding: '24px',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 600, margin: 0 }}>
            Load Neural Network Model
          </h2>
          <button
            onClick={onClose}
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
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#888';
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,application/json"
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '12px 20px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            📁 Upload JSON File
          </button>
          <p style={{ color: '#888', fontSize: '12px', textAlign: 'center', margin: 0 }}>
            Maximum file size: 2MB
          </p>
        </div>

        <div style={{ color: '#666', textAlign: 'center', margin: '16px 0', fontSize: '14px' }}>
          — OR —
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#ffffff', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
            Paste JSON Configuration:
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={`{\n  "layers": [\n    {"name": "Input", "type": "input", "neurons": 10, "activation": "relu"},\n    {"name": "Hidden", "type": "hidden", "neurons": 8, "activation": "relu"},\n    {"name": "Output", "type": "output", "neurons": 2, "activation": "sigmoid"}\n  ]\n}`}
            style={{
              width: '100%',
              height: '300px',
              padding: '12px',
              backgroundColor: '#2a2a3e',
              color: '#ffffff',
              border: '2px solid #3a3a4e',
              borderRadius: '8px',
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#3a3a4e';
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#ffffff', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
            Model Name (for saving):
          </label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="Enter model name..."
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2a2a3e',
              color: '#ffffff',
              border: '2px solid #3a3a4e',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#3a3a4e';
            }}
          />
        </div>

        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '14px',
              marginBottom: '16px'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSubmit}
            disabled={!jsonText.trim() || isSubmitting}
            style={{
              flex: 1,
              padding: '12px 20px',
              backgroundColor: '#8b5cf6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: !jsonText.trim() || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: !jsonText.trim() || isSubmitting ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#7c3aed';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#8b5cf6';
              }
            }}
          >
            {isSubmitting ? 'Processing...' : 'Visualize Only'}
          </button>
          <button
            onClick={handleSaveAndSubmit}
            disabled={!jsonText.trim() || !modelName.trim() || isSubmitting}
            style={{
              flex: 1,
              padding: '12px 20px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: !jsonText.trim() || !modelName.trim() || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: !jsonText.trim() || !modelName.trim() || isSubmitting ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#10b981';
              }
            }}
          >
            {isSubmitting ? 'Processing...' : 'Save & Visualize'}
          </button>
        </div>
      </div>
    </div>
  );
}

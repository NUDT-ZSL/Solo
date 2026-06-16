import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import CurveCanvas, { type CurveCanvasHandle } from '../components/CurveCanvas';
import ShareCard from '../components/ShareCard';
import { useApi } from '../hooks/useApi';
import type { ControlPoint, FlavorTag } from '../types';

const defaultFlavorTags: FlavorTag[] = [
  { id: '1', name: '花香味', selected: false },
  { id: '2', name: '水果味', selected: false },
  { id: '3', name: '巧克力味', selected: false },
  { id: '4', name: '坚果味', selected: false },
  { id: '5', name: '焦糖味', selected: false },
  { id: '6', name: '茶感', selected: false },
  { id: '7', name: '柑橘', selected: false },
  { id: '8', name: '莓果', selected: false },
];

const defaultControlPoints: ControlPoint[] = [
  { time: 0, temperature: 150 },
  { time: 3, temperature: 175 },
  { time: 6, temperature: 195 },
  { time: 9, temperature: 210 },
  { time: 12, temperature: 220 },
  { time: 15, temperature: 225 },
];

const processOptions = ['水洗', '日晒', '蜜处理', '厌氧'];

const pageWrapStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: 'var(--color-bg)',
};

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  backgroundColor: 'var(--color-surface)',
  borderBottom: '1px solid var(--color-border)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const headerContainerStyle: React.CSSProperties = {
  maxWidth: '1280px',
  margin: '0 auto',
  padding: '0 16px',
};

const headerInnerStyle: React.CSSProperties = {
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const headerLeftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const backButtonStyle: React.CSSProperties = {
  padding: '8px',
  borderRadius: '8px',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-secondary)',
  transition: 'background-color 0.2s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: 'var(--color-text)',
  fontFamily: 'var(--font-display)',
};

const saveButtonBaseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 20px',
  borderRadius: '8px',
  fontWeight: 500,
  color: 'white',
  transition: 'all 0.2s ease',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  background: 'linear-gradient(to right
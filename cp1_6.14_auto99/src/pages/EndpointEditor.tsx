import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Save, Send } from 'lucide-react';
import { JsonEditor } from '../components/JsonEditor';
import { MethodBadge } from '../components/MethodBadge';
import { endpointApi } from '../http';
import { isValidJson, highlightJson } from '../utils';
import type { Endpoint, HttpMethod, TestResponse } from '../types';

const defaultResponseBody = JSON.stringify({
  message: 'Hello from StubBubble!',
  success: true,
  data: null,
}, null, 2);

export const EndpointEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [leftWidth, setLeftWidth] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [method, setMethod] = useState<HttpMethod>
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { templates } from '../utils/templates';
import { cardsApi } from '../utils/api';
import type { Card, Template, CardElement, EffectsConfig } from '../types';

interface CreateCardProps {
  cardId: number | null;
  onBack: () => void;
  onSaved: (cardId: number) => void;
}

interface Sparkle {
  x: number;
  y: number;
  size: number;
  baseY: number;
  phase: number;
}

interface Petal {
  x: number;
  y: number;
  size: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  swayOffset: number;
  swaySpeed: number;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;

const CreateCard: React.FC<CreateCardProps> = ({ cardId, onBack, onSaved }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const sparklesRef = useRef<Sparkle[]>([]);
  const petalsRef = useRef<Petal[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStateRef = useRef<{
    isDragging: boolean;
    elementId: string | null;
    offsetX: number;
    offsetY: number;
  }>({
    isDragging: false,
    elementId: null,
    offsetX: 0,
    offsetY: 0,
  });
  const photoImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const rotationAngleRef = useRef(0);
  const [hoveredTemplate, setHoveredTemplate] = useState<number | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [elements, setElements] = useState<CardElement[]>([]);
  const [effects, setEffects] = useState<EffectsConfig>({
    isSparkleEnabled: false,
    isPetalEnabled: false,
    isGlowEnabled: false,
    isRotateEnabled: false,
    isTextBlinkEnabled: false,
  });
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('#333333');

  const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  };

  useEffect(() => {
    initSparkles();
    initPetals();
  }, []);

  useEffect(() => {
    if (cardId) {
      loadCard();
    }
  }, [cardId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    startTimeRef.current = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTimeRef.current) / 1000;
      draw(ctx, elapsed);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [selectedTemplate, elements, effects]);

  const initSparkles = () => {
    const sparkles: Sparkle[] = [];
    for (let i = 0; i < 10; i++) {
      const y = Math.random() * CANVAS_HEIGHT;
      sparkles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: y,
        size: 2 + Math.random() * 4,
        baseY: y,
        phase: Math.random() * Math.PI * 2,
      });
    }
    sparklesRef.current = sparkles;
  };

  const initPetals = () => {
    const petals: Petal[] = [];
    for (let i = 0; i < 20; i++) {
      petals.push({
        x: Math.random() * CANVAS_WIDTH,
        y: -Math.random() * CANVAS_HEIGHT,
        size: 8 + Math.random() * 6,
        speed: 30 + Math.random() * 40,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 2,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.5 + Math.random() * 0.5,
      });
    }
    petalsRef.current = petals;
  };

  const loadCard = async () => {
    if (!cardId) return;
    try {
      const card = await cardsApi.getById(cardId) as Card;
      const template = templates.find(t => t.id === card.template_id);
      if (template) setSelectedTemplate(template);
      setElements(card.elements || []);
      setEffects(card.effects || {
        isSparkleEnabled: false,
        isPetalEnabled: false,
        isGlowEnabled: false,
        isRotateEnabled: false,
        isTextBlinkEnabled: false,
      });

      (card.elements || []).forEach((el) => {
        if (el.type === 'photo' && el.content) {
          const img = new Image();
          img.src = el.content;
          img.onload = () => {
            photoImagesRef.current.set(el.id, img);
          };
          photoImagesRef.current.set(el.id, img);
        }
      });
    } catch (err) {
      console.error('Failed to load card:', err);
    }
  };

  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    let angle = 0;
    if (effects.isRotateEnabled) {
      angle = time * 0.5 * Math.PI / 180;
      rotationAngleRef.current = time * 0.5;
    }

    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.rotate(angle);
    ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);

    drawBackground(ctx);

    if (effects.isGlowEnabled) {
      drawGlow(ctx, time);
    }

    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    sortedElements.forEach((el) => {
      drawElement(ctx, el, time);
    });

    if (effects.isSparkleEnabled) {
      drawSparkles(ctx, time);
    }

    if (effects.isPetalEnabled) {
      drawPetals(ctx, time);
    }

    ctx.restore();
  }, [selectedTemplate, elements, effects]);

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    if (selectedTemplate) {
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, selectedTemplate.colors.background);
      gradient.addColorStop(1, selectedTemplate.colors.secondary + '33');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const centerX = CANVAS_WIDTH / 2;
      const centerY = CANVAS_HEIGHT / 3;
      const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.35;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = selectedTemplate.colors.primary + '22';
      ctx.fill();

      ctx.font = '48px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const decorations = selectedTemplate.decorations;
      ctx.fillText(decorations[0] || '', centerX - 60, centerY - 20);
      ctx.fillText(decorations[1] || '', centerX + 60, centerY - 20);
      ctx.font = '36px serif';
      ctx.fillText(decorations[2] || '', centerX, centerY + 40);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  };

  const drawGlow = (ctx: CanvasRenderingContext2D, time: number) => {
    const glowIntensity = 0.3 + 0.2 * Math.sin(time * Math.PI * 2 / 3);
    const cornerSize = 150;

    const corners = [
      { x: 0, y: 0 },
      { x: CANVAS_WIDTH, y: 0 },
      { x: 0, y: CANVAS_HEIGHT },
      { x: CANVAS_WIDTH, y: CANVAS_HEIGHT },
    ];

    corners.forEach((corner) => {
      const gradient = ctx.createRadialGradient(
        corner.x, corner.y, 0,
        corner.x, corner.y, cornerSize
      );
      gradient.addColorStop(0, `rgba(255, 215, 0, ${glowIntensity})`);
      gradient.addColorStop(0.5, `rgba(255, 200, 50, ${glowIntensity * 0.5})`);
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, cornerSize, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawSparkles = (ctx: CanvasRenderingContext2D, time: number) => {
    sparklesRef.current.forEach((sparkle) => {
      const floatOffset = Math.sin(time * Math.PI * 2 + sparkle.phase) * 10;
      const y = sparkle.baseY + floatOffset;
      const opacity = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * 2 + sparkle.phase);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;

      drawStar(ctx, sparkle.x, y, 5, sparkle.size, sparkle.size / 2);

      ctx.restore();
    });
  };

  const drawStar = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ) => {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  };

  const drawPetals = (ctx: CanvasRenderingContext2D, time: number) => {
    petalsRef.current.forEach((petal) => {
      let y = petal.y + petal.speed * time;
      y = y % (CANVAS_HEIGHT + 100) - 50;

      const sway = Math.sin(time * petal.swaySpeed + petal.swayOffset) * 30;
      const x = petal.x + sway;
      const rotation = petal.rotation + time * petal.rotationSpeed;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      drawHeart(ctx, petal.size, '#ffb6c1');

      ctx.restore();
    });
  };

  const drawHeart = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
    ctx.bezierCurveTo(-size / 2, size * 0.6, 0, size * 0.8, 0, size);
    ctx.bezierCurveTo(0, size * 0.8, size / 2, size * 0.6, size / 2, topCurveHeight);
    ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
    ctx.closePath();
    ctx.fill();
  };

  const drawElement = (
    ctx: CanvasRenderingContext2D,
    element: CardElement,
    time: number
  ) => {
    if (element.type === 'photo') {
      drawPhotoElement(ctx, element);
    } else if (element.type === 'text') {
      drawTextElement(ctx, element, time);
    }
  };

  const drawPhotoElement = (ctx: CanvasRenderingContext2D, element: CardElement) => {
    const img = photoImagesRef.current.get(element.id);
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      const radius = element.borderRadius || 8;
      roundRect(ctx, element.x, element.y, element.width, element.height, radius);
      ctx.clip();
      ctx.drawImage(img, element.x, element.y, element.width, element.height);
      ctx.restore();
    } else {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(element.x, element.y, element.width, element.height);
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('加载中...', element.x + element.width / 2, element.y + element.height / 2);
    }
  };

  const drawTextElement = (
    ctx: CanvasRenderingContext2D,
    element: CardElement,
    time: number
  ) => {
    const fs = element.fontSize || 24;
    ctx.font = `${element.fontWeight || 'normal'} ${fs}px ${element.fontFamily || 'sans-serif'}`;
    ctx.fillStyle = element.color || '#333333';
    ctx.textAlign = (element.textAlign as CanvasTextAlign) || 'left';
    ctx.textBaseline = 'top';

    let alpha = element.opacity ?? 1;
    if (effects.isTextBlinkEnabled) {
      alpha = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(time * Math.PI * 2 / 1.2));
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    const lines = element.content.split('\n');
    lines.forEach((line, index) => {
      ctx.fillText(line, element.x, element.y + index * fs * 1.2);
    });

    ctx.restore();
  };

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('只支持 JPG 和 PNG 格式');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 200;
        const maxHeight = 200;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        const newElement: CardElement = {
          id: generateId(),
          type: 'photo',
          x: CANVAS_WIDTH / 2 - width / 2,
          y: CANVAS_HEIGHT / 2 - height / 2,
          width: width,
          height: height,
          zIndex: elements.length + 1,
          content: dataUrl,
          borderRadius: 8,
        };

        photoImagesRef.current.set(newElement.id, img);
        setElements([...elements, newElement]);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddText = () => {
    if (!textInput.trim()) {
      alert('请输入文字内容');
      return;
    }

    if (textInput.length > 100) {
      alert('文字不能超过100字');
      return;
    }

    const newElement: CardElement = {
      id: generateId(),
      type: 'text',
      x: CANVAS_WIDTH / 2 - 100,
      y: CANVAS_HEIGHT / 2,
      width: 200,
      height: fontSize * 1.2,
      zIndex: elements.length + 1,
      content: textInput,
      fontSize: fontSize,
      color: fontColor,
      fontFamily: 'sans-serif',
      fontWeight: 'normal',
      textAlign: 'center',
    };

    setElements([...elements, newElement]);
    setTextInput('');
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    if (effects.isRotateEnabled) {
      const centerX = CANVAS_WIDTH / 2;
      const centerY = CANVAS_HEIGHT / 2;
      const angle = -rotationAngleRef.current * Math.PI / 180;
      const x = (e.clientX - rect.left) * scaleX - centerX;
      const y = (e.clientY - rect.top) * scaleY - centerY;
      const rotatedX = x * Math.cos(angle) - y * Math.sin(angle) + centerX;
      const rotatedY = x * Math.sin(angle) + y * Math.cos(angle) + centerY;
      return { x: rotatedX, y: rotatedY };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);
    let clickedElement: CardElement | null = null;

    for (const el of sortedElements) {
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
        clickedElement = el;
        break;
      }
    }

    if (clickedElement) {
      dragStateRef.current = {
        isDragging: true,
        elementId: clickedElement.id,
        offsetX: x - clickedElement.x,
        offsetY: y - clickedElement.y,
      };

      const maxZ = Math.max(...elements.map(el => el.zIndex), 0);
      if (clickedElement.zIndex < maxZ) {
        setElements(prev => prev.map(el =>
          el.id === clickedElement!.id
            ? { ...el, zIndex: maxZ + 1 }
            : el
        ));
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current.isDragging || !dragStateRef.current.elementId) return;

    const { x, y } = getCanvasCoordinates(e);
    const elementId = dragStateRef.current.elementId;

    setElements(prev => prev.map(el => {
      if (el.id === elementId) {
        let newX = x - dragStateRef.current.offsetX;
        let newY = y - dragStateRef.current.offsetY;

        newX = Math.max(-el.width / 2, Math.min(CANVAS_WIDTH - el.width / 2, newX));
        newY = Math.max(-el.height / 2, Math.min(CANVAS_HEIGHT - el.height / 2, newY));

        return { ...el, x: newX, y: newY };
      }
      return el;
    }));
  };

  const handleCanvasMouseUp = () => {
    dragStateRef.current = {
      isDragging: false,
      elementId: null,
      offsetX: 0,
      offsetY: 0,
    };
  };

  const handleCanvasMouseLeave = () => {
    handleCanvasMouseUp();
  };

  const toggleEffect = (effectKey: keyof EffectsConfig) => {
    setEffects(prev => ({
      ...prev,
      [effectKey]: !prev[effectKey],
    }));
  };

  const handleDeleteElement = (elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
    photoImagesRef.current.delete(elementId);
  };

  const handleSave = async () => {
    if (!selectedTemplate) {
      alert('请先选择一个模板');
      return;
    }

    setLoading(true);
    try {
      let savedCard;
      if (cardId) {
        savedCard = await cardsApi.update(cardId, selectedTemplate.id, elements, effects);
      } else {
        savedCard = await cardsApi.create(selectedTemplate.id, elements, effects);
      }
      onSaved((savedCard as Card).id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const effectButtons = [
    { key: 'isSparkleEnabled' as const, label: '✨ 闪烁星光', desc: '10颗白色星星浮动' },
    { key: 'isPetalEnabled' as const, label: '🌸 飘落花瓣', desc: '20个粉色心形滑落' },
    { key: 'isGlowEnabled' as const, label: '🌟 渐变光晕', desc: '四角金色呼吸光晕' },
    { key: 'isRotateEnabled' as const, label: '🔄 慢速旋转', desc: '每秒0.5度顺时针' },
    { key: 'isTextBlinkEnabled' as const, label: '💫 文字闪烁', desc: '透明度渐变效果' },
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          ← 返回
        </button>
        <h1 style={styles.title}>
          {cardId ? '编辑贺卡' : '创建贺卡'}
        </h1>
        <button
          onClick={handleSave}
          className="btn-primary"
          style={styles.saveBtn}
          disabled={loading}
        >
          {loading ? '保存中...' : '保存'}
        </button>
      </header>

      <div style={styles.mainContent}>
        <div style={styles.leftPanel}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>选择模板</h2>
            <div style={styles.templateGrid}>
              {templates.map(template => (
                <div
                  key={template.id}
                  style={{
                    ...styles.templateCard,
                    background: template.colors.background,
                    border: selectedTemplate?.id === template.id
                      ? '3px solid #ff8c42'
                      : '3px solid transparent',
                    transform: hoveredTemplate === template.id ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: hoveredTemplate === template.id
                      ? '0 8px 25px rgba(0,0,0,0.15)'
                      : '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                  onClick={() => handleTemplateSelect(template)}
                  onMouseEnter={() => setHoveredTemplate(template.id)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                >
                  <div
                    style={{
                      ...styles.templateThumbnail,
                      background: `linear-gradient(135deg, ${template.colors.primary}44, ${template.colors.secondary}44)`,
                    }}
                  >
                    <span style={styles.templateEmoji}>
                      {template.decorations[0]}{template.decorations[1]}
                    </span>
                  </div>
                  <p style={styles.templateName}>{template.name}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>添加照片</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              style={styles.fileInput}
              onChange={handlePhotoUpload}
            />
            <button
              className="btn-secondary"
              style={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              📷 上传照片
            </button>
            <p style={styles.hintText}>支持 JPG/PNG，最大 2MB</p>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>添加文字</h2>
            <textarea
              style={styles.textInput}
              placeholder="输入祝福语（最多100字）"
              value={textInput}
              onChange={e => setTextInput(e.target.value.slice(0, 100))}
              maxLength={100}
              rows={3}
            />
            <p style={styles.charCount}>{textInput.length}/100</p>

            <div style={styles.fontControls}>
              <div style={styles.fontControlItem}>
                <label style={styles.label}>字号: {fontSize}px</label>
                <input
                  type="range"
                  min="18"
                  max="48"
                  value={fontSize}
                  onChange={e => setFontSize(Number(e.target.value))}
                  style={styles.slider}
                />
              </div>
              <div style={styles.fontControlItem}>
                <label style={styles.label}>颜色</label>
                <input
                  type="color"
                  value={fontColor}
                  onChange={e => setFontColor(e.target.value)}
                  style={styles.colorPicker}
                />
              </div>
            </div>

            <button
              className="btn-primary"
              style={styles.addTextBtn}
              onClick={handleAddText}
              disabled={!textInput.trim()}
            >
              ✏️ 添加文字
            </button>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>动态效果</h2>
            <div style={styles.effectButtons}>
              {effectButtons.map(btn => (
                <button
                  key={btn.key}
                  style={{
                    ...styles.effectBtn,
                    background: effects[btn.key]
                      ? 'linear-gradient(135deg, #ff8c42, #ff6f42)'
                      : '#f5f5f5',
                    color: effects[btn.key] ? 'white' : '#666',
                  }}
                  onClick={() => toggleEffect(btn.key)}
                >
                  <span style={styles.effectLabel}>{btn.label}</span>
                  <span style={styles.effectDesc}>{btn.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.rightPanel}>
          <h2 style={styles.sectionTitle}>贺卡预览</h2>
          <div style={styles.canvasWrapper}>
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              style={styles.canvas}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
            />
          </div>
          <p style={styles.hintText}>💡 提示：点击并拖动元素可调整位置</p>

          {elements.length > 0 && (
            <div style={styles.elementList}>
              <h3 style={styles.elementListTitle}>元素列表</h3>
              <div style={styles.elementItems}>
                {elements.map(el => (
                  <div key={el.id} style={styles.elementItem}>
                    <span style={styles.elementIcon}>
                      {el.type === 'photo' ? '🖼️' : '📝'}
                    </span>
                    <span style={styles.elementName}>
                      {el.type === 'photo' ? '照片' : (el.content.slice(0, 10) + (el.content.length > 10 ? '...' : ''))}
                    </span>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDeleteElement(el.id)}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '8px 12px',
  },
  title: {
    fontSize: '24px',
    color: '#4a4a4a',
  },
  saveBtn: {
    minWidth: '100px',
  },
  mainContent: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
  },
  leftPanel: {
    width: '480px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxHeight: 'calc(100vh - 100px)',
    overflowY: 'auto',
    paddingRight: '8px',
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  sectionTitle: {
    fontSize: '16px',
    color: '#4a4a4a',
    marginBottom: '16px',
    fontWeight: '600',
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  templateCard: {
    borderRadius: '12px',
    padding: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
    overflow: 'hidden',
  },
  templateThumbnail: {
    width: '200px',
    height: '280px',
    borderRadius: '12px',
    margin: '0 auto 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  templateEmoji: {
    fontSize: '48px',
  },
  templateName: {
    fontSize: '13px',
    color: '#333',
    fontWeight: '500',
  },
  fileInput: {
    display: 'none',
  },
  uploadBtn: {
    width: '100%',
    marginBottom: '8px',
  },
  hintText: {
    fontSize: '12px',
    color: '#999',
    marginTop: '8px',
    textAlign: 'center',
  },
  textInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    minHeight: '60px',
  },
  charCount: {
    textAlign: 'right',
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
    marginBottom: '12px',
  },
  fontControls: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
  },
  fontControlItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    color: '#666',
  },
  slider: {
    width: '100%',
    cursor: 'pointer',
  },
  colorPicker: {
    width: '100%',
    height: '32px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    cursor: 'pointer',
    padding: '2px',
  },
  addTextBtn: {
    width: '100%',
  },
  effectButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  effectBtn: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  effectLabel: {
    fontSize: '14px',
    fontWeight: '500',
  },
  effectDesc: {
    fontSize: '11px',
    opacity: 0.8,
  },
  canvasWrapper: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    display: 'inline-block',
  },
  canvas: {
    display: 'block',
    borderRadius: '8px',
    cursor: 'move',
    maxWidth: '100%',
    height: 'auto',
  },
  elementList: {
    marginTop: '16px',
    background: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: '600px',
  },
  elementListTitle: {
    fontSize: '14px',
    color: '#4a4a4a',
    marginBottom: '12px',
    fontWeight: '600',
  },
  elementItems: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  elementItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#f8f8f8',
    borderRadius: '6px',
    fontSize: '13px',
  },
  elementIcon: {
    fontSize: '16px',
  },
  elementName: {
    color: '#333',
    maxWidth: '100px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#ff6b6b',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '0',
  },
};

export default CreateCard;

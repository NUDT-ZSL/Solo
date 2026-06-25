import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, FileText, X, Star, Clock, Lightbulb } from 'lucide-react';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { StepCard } from '../components/StepCard';
import { clusterRecipes, recommendImprovements } from '../utils/recipeClustering';
import type { Recipe, RecipeStep, Recommendation, Notification } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface RecipeDetailProps {
  recipes: Recipe[];
  onUpdateRecipe: (recipe: Recipe) => Promise<Recipe | null>;
  onAddNotification: (notification: Omit<Notification, 'id'>) => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipes, onUpdateRecipe, onAddNotification }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (id) {
      const found = recipes.find(r => r.id === id);
      if (found) {
        setRecipe(found);
      } else {
        navigate('/');
      }
    }
  }, [id, recipes, navigate]);

  const updateRecipeStats = useCallback((steps: RecipeStep[]): Partial<Recipe> => {
    const totalDuration = steps.reduce((acc, s) => acc + s.duration, 0);
    const averageRating = steps.length > 0
      ? steps.reduce((acc, s) => acc + s.rating, 0) / steps.length
      : 0;
    return { totalDuration, averageRating };
  }, []);

  const saveRecipe = useCallback(async (updatedRecipe: Recipe) => {
    try {
      const result = await onUpdateRecipe(updatedRecipe);
      if (result) {
        setRecipe(result);
        return result;
      }
    } catch (err) {
      onAddNotification({
        message: '保存失败，请检查网络连接',
        type: 'error',
      });
    }
    return null;
  }, [onUpdateRecipe, onAddNotification]);

  const handleAddStep = () => {
    if (!recipe) return;

    const newStep: RecipeStep = {
      id: uuidv4(),
      photo: '',
      description: '',
      duration: 0,
      rating: 0,
      order: recipe.steps.length,
    };

    const newSteps = [...recipe.steps, newStep];
    const stats = updateRecipeStats(newSteps);
    const updatedRecipe = { ...recipe, steps: newSteps, ...stats };

    setActiveStepIndex(newSteps.length - 1);
    saveRecipe(updatedRecipe);
  };

  const handleUpdateStep = (updatedStep: RecipeStep) => {
    if (!recipe) return;

    const newSteps = recipe.steps.map(s =>
      s.id === updatedStep.id ? updatedStep : s
    );
    const stats = updateRecipeStats(newSteps);
    const updatedRecipe = { ...recipe, steps: newSteps, ...stats };

    saveRecipe(updatedRecipe);
  };

  const handleDeleteStep = (stepId: string) => {
    if (!recipe) return;

    const newSteps = recipe.steps
      .filter(s => s.id !== stepId)
      .map((s, i) => ({ ...s, order: i }));
    const stats = updateRecipeStats(newSteps);
    const updatedRecipe = { ...recipe, steps: newSteps, ...stats };

    if (activeStepIndex >= newSteps.length) {
      setActiveStepIndex(newSteps.length - 1);
    }
    saveRecipe(updatedRecipe);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    requestAnimationFrame(() => {
      if (!recipe) return;

      const newSteps = [...recipe.steps];
      const [draggedItem] = newSteps.splice(dragIndex, 1);
      newSteps.splice(index, 0, draggedItem);

      const reorderedSteps = newSteps.map((s, i) => ({ ...s, order: i }));
      const stats = updateRecipeStats(reorderedSteps);
      const updatedRecipe = { ...recipe, steps: reorderedSteps, ...stats };

      setDragIndex(index);
      setRecipe(updatedRecipe);
    });
  };

  const handleDragEnd = () => {
    if (recipe && dragIndex !== null) {
      saveRecipe(recipe);
    }
    setDragIndex(null);
  };

  const handleStepClick = (index: number) => {
    setActiveStepIndex(activeStepIndex === index ? -1 : index);
  };

  const handleGetRecommendations = () => {
    if (!recipe) return;

    const recs = clusterRecipes(recipe, recipes, 0.6);
    setRecommendations(recs);
    setImprovements(recommendImprovements(recipe, recs));
    setShowRecommendModal(true);
  };

  const handleGeneratePdf = async () => {
    if (!recipe || !contentRef.current) return;

    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      pdf.setFillColor(255, 243, 224);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      for (let i = 0; i < 10; i++) {
        const alpha = 0.08 * i;
        const y = (pageHeight / 10) * i;
        pdf.setFillColor(255, 224, 178, alpha);
        pdf.rect(0, y, pageWidth, pageHeight / 10, 'F');
      }

      pdf.setTextColor(78, 52, 46);
      pdf.setFontSize(36);
      pdf.setFont('helvetica', 'bold');
      const titleWidth = pdf.getTextWidth(recipe.name);
      pdf.text(recipe.name, (pageWidth - titleWidth) / 2, pageHeight / 2 - 20);

      pdf.setDrawColor(255, 183, 77);
      pdf.setLineWidth(1);
      const lineWidth = pageWidth * 0.6;
      pdf.line((pageWidth - lineWidth) / 2, pageHeight / 2, (pageWidth + lineWidth) / 2, pageHeight / 2);

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      const dateText = `制作日期: ${dayjs(recipe.createdAt).format('YYYY年MM月DD日')}`;
      const durationText = `总时长: ${recipe.totalDuration} 分钟`;
      const ratingText = `平均评分: ${recipe.averageRating.toFixed(1)} 分`;

      const dateWidth = pdf.getTextWidth(dateText);
      const durationWidth = pdf.getTextWidth(durationText);
      const ratingWidth = pdf.getTextWidth(ratingText);

      pdf.text(dateText, (pageWidth - dateWidth) / 2, pageHeight / 2 + 20);
      pdf.text(durationText, (pageWidth - durationWidth) / 2, pageHeight / 2 + 35);
      pdf.text(ratingText, (pageWidth - ratingWidth) / 2, pageHeight / 2 + 50);

      for (let i = 0; i < recipe.steps.length; i++) {
        const step = recipe.steps[i];
        pdf.addPage();

        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        pdf.setTextColor(78, 52, 46);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`步骤 ${i + 1}`, margin, 30);

        if (step.photo) {
          try {
            const imgData = step.photo;
            const imgWidth = pageWidth - margin * 2;
            const imgHeight = 80;
            pdf.addImage(imgData, 'JPEG', margin, 40, imgWidth, imgHeight);
          } catch (e) {
            console.error('Failed to add image to PDF', e);
          }
        }

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(66, 66, 66);

        const descriptionY = step.photo ? 135 : 50;
        const splitDescription = pdf.splitTextToSize(step.description || '(无描述)', pageWidth - margin * 2);
        pdf.text(splitDescription, margin, descriptionY);

        const infoY = descriptionY + splitDescription.length * 7 + 15;
        pdf.setTextColor(78, 52, 46);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`时长: ${step.duration} 分钟`, margin, infoY);

        const ratingY = infoY + 10;
        pdf.text('评分: ', margin, ratingY);
        for (let s = 1; s <= 5; s++) {
          if (s <= step.rating) {
            pdf.setTextColor(255, 160, 0);
          } else {
            pdf.setTextColor(189, 189, 189);
          }
          pdf.text('★', margin + 25 + (s - 1) * 8, ratingY);
        }
      }

      pdf.save(`${recipe.name}_菜谱书.pdf`);

      onAddNotification({
        message: 'PDF生成成功！',
        type: 'success',
      });
    } catch (err) {
      console.error('PDF生成失败', err);
      onAddNotification({
        message: 'PDF生成失败，请重试',
        type: 'error',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            fill={star <= Math.round(rating) ? '#ffa000' : 'none'}
            color={star <= Math.round(rating) ? '#ffa000' : '#bdbdbd'}
          />
        ))}
      </div>
    );
  };

  if (!recipe) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf0e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '18px', color: '#757575' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf0e6' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(78,52,46,0.12)',
              cursor: 'pointer',
              color: '#4e342e',
              fontSize: '14px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(78,52,46,0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(78,52,46,0.12)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
          >
            <ArrowLeft size={18} />
            返回
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#4e342e', margin: 0 }}>
              {recipe.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
              <span style={{ color: '#757575', fontSize: '14px' }}>
                {dayjs(recipe.createdAt).format('YYYY年MM月DD日 HH:mm')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {renderStars(recipe.averageRating)}
                <span style={{ color: '#757575', fontSize: '14px' }}>
                  {recipe.averageRating.toFixed(1)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#757575', fontSize: '14px' }}>
                <Clock size={14} />
                <span>{recipe.totalDuration} 分钟</span>
              </div>
            </div>
          </div>
        </div>

        <div ref={contentRef} style={{ marginBottom: '24px' }}>
          {recipe.steps.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '60px 20px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(78,52,46,0.12)',
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
              <h3 style={{ color: '#4e342e', fontSize: '20px', marginBottom: '8px' }}>
                还没有步骤
              </h3>
              <p style={{ color: '#757575', marginBottom: '24px' }}>
                点击下方"添加步骤"开始记录制作过程
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recipe.steps.map((step, index) => (
                <div
                  key={step.id}
                  onClick={() => handleStepClick(index)}
                  style={{
                    paddingTop: index > 0 ? '16px' : 0,
                    marginTop: index > 0 ? '16px' : 0,
                    borderTop: index > 0 ? '2px dashed #bdbdbd' : 'none',
                  }}
                >
                  <StepCard
                    step={step}
                    isActive={activeStepIndex === index}
                    totalSteps={recipe.steps.length}
                    onUpdate={handleUpdateStep}
                    onDelete={() => handleDeleteStep(step.id)}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    index={index}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleAddStep}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              background: '#ffffff',
              border: '2px dashed #ffb74d',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(78,52,46,0.12)',
              cursor: 'pointer',
              color: '#ffb74d',
              fontSize: '15px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(78,52,46,0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(78,52,46,0.12)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
          >
            <Plus size={20} />
            添加步骤
          </button>

          <button
            onClick={handleGetRecommendations}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #81c784, #4caf50)',
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(76,175,80,0.3)',
              cursor: 'pointer',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(76,175,80,0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(76,175,80,0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
          >
            <Sparkles size={20} />
            智能推荐改良
          </button>

          <button
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf || recipe.steps.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              background: recipe.steps.length === 0 
                ? '#bdbdbd' 
                : 'linear-gradient(135deg, #ffb74d, #ff7043)',
              border: 'none',
              borderRadius: '16px',
              boxShadow: recipe.steps.length === 0
                ? 'none'
                : '0 4px 12px rgba(255,112,67,0.3)',
              cursor: recipe.steps.length === 0 ? 'not-allowed' : 'pointer',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              opacity: isGeneratingPdf ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (recipe.steps.length > 0) {
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(255,112,67,0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (recipe.steps.length > 0) {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,112,67,0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
            onMouseDown={(e) => {
              if (recipe.steps.length > 0) {
                e.currentTarget.style.transform = 'scale(0.98)';
              }
            }}
            onMouseUp={(e) => {
              if (recipe.steps.length > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
          >
            <FileText size={20} />
            {isGeneratingPdf ? '生成中...' : '生成PDF菜谱书'}
          </button>
        </div>
      </div>

      {showRecommendModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setShowRecommendModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '600px',
              height: '80vh',
              maxHeight: '800px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid #f0f0f0',
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#4e342e', margin: 0 }}>
                智能推荐改良配方
              </h2>
              <button
                onClick={() => setShowRecommendModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#bdbdbd',
                  padding: '4px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#757575')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#bdbdbd')}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {improvements.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#4e342e',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Lightbulb size={18} color="#ffb74d" />
                    改良建议
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {improvements.map((imp, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '12px 16px',
                          background: '#fff3e0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: '#4e342e',
                          borderLeft: '3px solid #ffb74d',
                        }}
                      >
                        {imp}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h3 style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#4e342e',
                marginBottom: '12px',
              }}>
                相似菜谱 ({recommendations.length})
              </h3>

              {recommendations.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#757575',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                  <p>暂无相似度高于60%的菜谱</p>
                  <p style={{ fontSize: '13px', marginTop: '4px' }}>
                    多创建一些菜谱后会有更丰富的推荐
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recommendations.map(({ recipe: recRecipe, similarity }) => (
                    <div
                      key={recRecipe.id}
                      style={{
                        padding: '16px',
                        background: '#fafafa',
                        borderRadius: '12px',
                        border: '1px solid #f0f0f0',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f5f5f5';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fafafa';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#4e342e',
                            margin: 0,
                            marginBottom: '8px',
                          }}>
                            {recRecipe.name}
                          </h4>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#43a047',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            marginBottom: '8px',
                          }}>
                            相似度 {(similarity * 100).toFixed(1)}%
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            fontSize: '13px',
                            color: '#757575',
                          }}>
                            <span>{recRecipe.steps.length} 步骤</span>
                            <span>{recRecipe.totalDuration} 分钟</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              {renderStars(recRecipe.averageRating)}
                              <span>{recRecipe.averageRating.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigate(`/recipe/${recRecipe.id}`);
                            setShowRecommendModal(false);
                          }}
                          style={{
                            padding: '8px 16px',
                            background: '#ffb74d',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ffa726';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffb74d';
                          }}
                        >
                          查看详情
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

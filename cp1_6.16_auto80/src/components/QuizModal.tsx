import { useState, useEffect } from 'react';
import { Building } from '../data/buildings';

type TimeSlot = 'morning' | 'noon' | 'dusk' | 'night';

interface QuizModalProps {
  building: Building;
  unlockedSlots: TimeSlot[];
  onClose: () => void;
  onAnswerCorrect: (buildingId: string) => void;
}

const TIME_SLOT_NAMES: Record<TimeSlot, string> = {
  morning: '清晨',
  noon: '正午',
  dusk: '黄昏',
  night: '夜晚'
};

const TIME_SLOT_COLORS: Record<TimeSlot, string> = {
  morning: '#FFD700',
  noon: '#FFFFFF',
  dusk: '#FF6347',
  night: '#4169E1'
};

const TIME_SLOTS: TimeSlot[] = ['morning', 'noon', 'dusk', 'night'];

function QuizModal({ building, unlockedSlots, onClose, onAnswerCorrect }: QuizModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [localUnlockedCount, setLocalUnlockedCount] = useState(unlockedSlots.length);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleOptionClick = (optionIndex: number) => {
    if (showResult) return;
    
    setSelectedOption(optionIndex);
    const correct = optionIndex === building.questions[currentQuestionIndex].correctIndex;
    setIsCorrect(correct);
    setShowResult(true);

    if (correct && localUnlockedCount < 4) {
      onAnswerCorrect(building.id);
      setLocalUnlockedCount((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < building.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const currentQuestion = building.questions[currentQuestionIndex];
  const nextSlot = TIME_SLOTS[localUnlockedCount];

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'fadeSlideUp 0.4s ease-out forwards'
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '500px',
        backgroundColor: '#2C3E50',
        borderRadius: '24px 24px 0 0',
        padding: '32px',
        position: 'relative',
        animation: 'fadeSlideUp 0.4s ease-out forwards'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
        >
          ×
        </button>

        <div style={{
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'white',
            marginBottom: '8px'
          }}>
            {building.name}
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#8888AA',
            marginBottom: '16px'
          }}>
            问题 {currentQuestionIndex + 1} / {building.questions.length}
          </p>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: unlockedSlots.includes(slot) || (TIME_SLOTS.indexOf(slot) < localUnlockedCount) 
                    ? TIME_SLOT_COLORS[slot] 
                    : '#444',
                  transition: 'all 0.4s ease-out',
                  boxShadow: (unlockedSlots.includes(slot) || (TIME_SLOTS.indexOf(slot) < localUnlockedCount))
                    ? `0 0 8px ${TIME_SLOT_COLORS[slot]}` 
                    : 'none',
                  opacity: (unlockedSlots.includes(slot) || (TIME_SLOTS.indexOf(slot) < localUnlockedCount)) ? 1 : 0.3
                }}
              />
            ))}
          </div>

          {showResult && isCorrect && nextSlot && localUnlockedCount <= 4 && (
            <div style={{
              padding: '12px 20px',
              backgroundColor: 'rgba(46, 204, 113, 0.2)',
              border: '1px solid #2ECC71',
              borderRadius: '12px',
              color: '#2ECC71',
              fontSize: '14px',
              fontWeight: 500,
              animation: 'fadeSlideUp 0.3s ease-out'
            }}>
              🎉 恭喜！已解锁「{TIME_SLOT_NAMES[nextSlot]}」时段光影效果！
            </div>
          )}

          {showResult && !isCorrect && (
            <div style={{
              padding: '12px 20px',
              backgroundColor: 'rgba(231, 76, 60, 0.2)',
              border: '1px solid #E74C3C',
              borderRadius: '12px',
              color: '#E74C3C',
              fontSize: '14px',
              fontWeight: 500,
              animation: 'fadeSlideUp 0.3s ease-out'
            }}>
              😅 答错了，正确答案是：{currentQuestion.options[currentQuestion.correctIndex]}
            </div>
          )}
        </div>

        <div style={{
          marginBottom: '24px'
        }}>
          <p style={{
            fontSize: '18px',
            fontWeight: 500,
            color: 'white',
            marginBottom: '20px',
            lineHeight: 1.5
          }}>
            {currentQuestion.question}
          </p>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === index;
              const isCorrectAnswer = index === currentQuestion.correctIndex;
              
              let bgColor = 'rgba(255,255,255,0.05)';
              let borderColor = 'rgba(255,255,255,0.1)';
              let textColor = 'white';
              
              if (showResult) {
                if (isCorrectAnswer) {
                  bgColor = 'rgba(46, 204, 113, 0.2)';
                  borderColor = '#2ECC71';
                  textColor = '#2ECC71';
                } else if (isSelected && !isCorrect) {
                  bgColor = 'rgba(231, 76, 60, 0.2)';
                  borderColor = '#E74C3C';
                  textColor = '#E74C3C';
                }
              } else if (isSelected) {
                bgColor = 'rgba(255, 107, 107, 0.2)';
                borderColor = '#FF6B6B';
              }
              
              return (
                <button
                  key={index}
                  onClick={() => handleOptionClick(index)}
                  disabled={showResult}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: bgColor,
                    color: textColor,
                    fontSize: '15px',
                    textAlign: 'left',
                    cursor: showResult ? 'default' : 'pointer',
                    transition: 'all 0.3s ease-out',
                    transform: isSelected && !showResult ? 'scale(1.02)' : 'scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    if (!showResult) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showResult && !isSelected) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '12px',
                    fontSize: '13px'
                  }}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {showResult && (
          <button
            onClick={handleNext}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#FF6B6B',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.backgroundColor = '#FF8080';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = '#FF6B6B';
            }}
          >
            {currentQuestionIndex < building.questions.length - 1 ? '下一题' : '完成'}
          </button>
        )}
      </div>
    </div>
  );
}

export default QuizModal;

import { useState, useEffect, useCallback, useRef } from 'react';
import StatusBar from './components/StatusBar';
import RecipePanel from './components/RecipePanel';
import Workbench from './components/Workbench';
import {
  Material,
  Recipe,
  PotionState,
  createInitialPotionState,
  validateAndAddMaterial,
  isRecipeSuccessful,
  generateRandomRecipe,
  MATERIALS
} from './logic/potionEngine';

const TASK_TIME = 60;

function App() {
  const [materials] = useState<Material[]>(MATERIALS);
  const [recipe, setRecipe] = useState<Recipe>(() => generateRandomRecipe());
  const [potionState, setPotionState] = useState<PotionState>(createInitialPotionState());
  const [currentHeat, setCurrentHeat] = useState<number>(5);
  const [timeLeft, setTimeLeft] = useState<number>(TASK_TIME);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [failureCount, setFailureCount] = useState<number>(0);
  const [showStepGlow, setShowStepGlow] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const startNewRecipe = useCallback(() => {
    const newRecipe = generateRandomRecipe();
    setRecipe(newRecipe);
    setPotionState(createInitialPotionState());
    setCurrentHeat(5);
    setTimeLeft(TASK_TIME);
    startTimeRef.current = Date.now();

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !potionState.isComplete && !potionState.isFailed) {
      handleFailure('时间耗尽!');
    }
  }, [timeLeft, potionState.isComplete, potionState.isFailed]);

  useEffect(() => {
    if (potionState.isComplete) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      const isSuccess = isRecipeSuccessful(potionState, recipe);
      if (isSuccess) {
        setSuccessCount(prev => prev + 1);
        recordResult(true);
      } else {
        setFailureCount(prev => prev + 1);
        recordResult(false);
      }
    }

    if (potionState.isFailed && !potionState.isComplete) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setFailureCount(prev => prev + 1);
      recordResult(false);
    }
  }, [potionState.isComplete, potionState.isFailed]);

  const recordResult = (success: boolean) => {
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipeId: recipe.id,
        recipeName: recipe.name,
        success,
        duration,
        materialsUsed: potionState.addedMaterials.map(m => m.materialName)
      })
    }).catch(() => {});
  };

  const handleAddMaterial = (materialId: string) => {
    if (potionState.isFailed || potionState.isComplete) return;

    const newState = validateAndAddMaterial(potionState, recipe, materialId, currentHeat);

    if (newState.currentStepIndex > potionState.currentStepIndex && !newState.isFailed) {
      setShowStepGlow(true);
      setTimeout(() => setShowStepGlow(false), 500);
    }

    setPotionState(newState);
  };

  const handleFailure = (reason: string) => {
    setPotionState(prev => ({
      ...prev,
      isFailed: true,
      failureReason: reason,
      currentColor: { r: 128, g: 128, b: 128 }
    }));
  };

  const handleHeatChange = (heat: number) => {
    setCurrentHeat(heat);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#1B1B2F',
      overflow: 'hidden'
    }}>
      <div style={{ height: 'auto', minHeight: '80px' }}>
        <StatusBar
          timeLeft={timeLeft}
          potionState={potionState}
          successCount={successCount}
          failureCount={failureCount}
          onNewRecipe={startNewRecipe}
        />
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        gap: '20px',
        padding: '20px',
        minHeight: 0
      }}>
        <div style={{
          flex: '0 0 55%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Workbench
            materials={materials}
            potionState={potionState}
            currentHeat={currentHeat}
            onHeatChange={handleHeatChange}
            onAddMaterial={handleAddMaterial}
            showStepGlow={showStepGlow}
          />
        </div>

        <div style={{
          flex: '0 0 30%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <RecipePanel
            recipe={recipe}
            potionState={potionState}
          />
        </div>

        <div style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div
            className="hover-lift"
            style={{
              background: 'linear-gradient(145deg, #2C3E50 0%, #1B1B2F 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '2px solid #8E44AD',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            <h3 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '16px',
              color: '#8E44AD',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              🧙 学徒指南
            </h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              fontSize: '13px',
              color: '#BDC3C7',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span>📖</span>
                <span>按照配方顺序依次投入材料</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span>🔥</span>
                <span>控制火候达到配方要求的等级</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span>⏱</span>
                <span>在60秒内完成药剂制作</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span>⚠️</span>
                <span>投入错误材料或超量将导致失败</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span>✅</span>
                <span>颜色接近目标且步骤正确即为成功</span>
              </li>
            </ul>
          </div>

          <div
            className="hover-lift"
            style={{
              background: 'linear-gradient(145deg, #2C3E50 0%, #1B1B2F 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '2px solid #8E44AD',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              flex: 1
            }}
          >
            <h3 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '16px',
              color: '#8E44AD',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              📊 当前状态
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '13px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(142, 68, 173, 0.15)',
                borderRadius: '6px'
              }}>
                <span style={{ color: '#BDC3C7' }}>已投入材料</span>
                <span style={{ color: '#F5F5DC', fontWeight: 600 }}>
                  {potionState.addedMaterials.length} / {recipe.steps.length}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(142, 68, 173, 0.15)',
                borderRadius: '6px'
              }}>
                <span style={{ color: '#BDC3C7' }}>当前火候</span>
                <span style={{ color: '#FFD700', fontWeight: 600 }}>
                  {currentHeat} 级
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(142, 68, 173, 0.15)',
                borderRadius: '6px'
              }}>
                <span style={{ color: '#BDC3C7' }}>药剂状态</span>
                <span style={{
                  color: potionState.isFailed ? '#E74C3C' : potionState.isComplete ? '#2ECC71' : '#F39C12',
                  fontWeight: 600
                }}>
                  {potionState.isFailed ? '失败' : potionState.isComplete ? '完成' : '制作中'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

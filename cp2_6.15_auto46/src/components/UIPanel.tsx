import { useState, useEffect, useRef } from 'react';
import { useMeteoStore } from '@/store/useMeteoStore';
import { CITIES, METRIC_CONFIG } from '@/data/mockData';
import type { CityName, MetricType } from '@/data/mockData';

export default function UIPanel() {
  const {
    selectedCity,
    selectedMetric,
    currentDay,
    compareMode,
    opacity,
    popupData,
    setSelectedCity,
    setSelectedMetric,
    setCurrentDay,
    setCompareMode,
    setOpacity,
    resetView,
    hidePopup,
  } = useMeteoStore();

  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const cityOptions = Object.entries(CITIES) as [CityName, string][];
  const metricOptions = Object.entries(METRIC_CONFIG) as [MetricType, typeof METRIC_CONFIG[MetricType]][];

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value as CityName);
  };

  const handleMetricClick = (metric: MetricType) => {
    setSelectedMetric(metric);
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpacity(parseFloat(e.target.value));
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentDay(parseInt(e.target.value));
  };

  const handleCompareToggle = () => {
    setCompareMode(!compareMode);
  };

  const getPopupPosition = () => {
    if (!popupData || !popupRef.current) return { left: 0, top: 0 };

    const popupWidth = 200;
    const popupHeight = 120;
    const padding = 16;

    let left = popupData.position.x + padding;
    let top = popupData.position.y + padding;

    if (left + popupWidth > window.innerWidth) {
      left = popupData.position.x - popupWidth - padding;
    }
    if (top + popupHeight > window.innerHeight) {
      top = popupData.position.y - popupHeight - padding;
    }
    if (left < padding) left = padding;
    if (top < padding) top = padding;

    return { left, top };
  };

  const popupPosition = getPopupPosition();
  const metricConfig = popupData ? METRIC_CONFIG[selectedMetric] : null;
  const cityName = popupData ? CITIES[popupData.city] : '';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 1000,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#e0e0e0',
    }}>
      {/* 左上角 - 城市选择下拉框 */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        pointerEvents: 'auto',
      }}>
        <select
          value={selectedCity}
          onChange={handleCityChange}
          style={{
            padding: '10px 16px',
            backgroundColor: 'rgba(17, 17, 34, 0.85)',
            border: '2px solid #00bcd4',
            borderRadius: '8px',
            color: '#e0e0e0',
            fontSize: '14px',
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 0 10px rgba(0, 188, 212, 0.3)',
          }}
        >
          {cityOptions.map(([key, name]) => (
            <option key={key} value={key} style={{ backgroundColor: '#1a1a2e', color: '#e0e0e0' }}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* 右上角 - 对比模式切换按钮 */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: isMobile ? 20 : 280,
        pointerEvents: 'auto',
      }}>
        <button
          onClick={handleCompareToggle}
          style={{
            padding: '10px 20px',
            backgroundColor: compareMode ? '#4db6ac' : 'rgba(17, 17, 34, 0.85)',
            border: `2px solid ${compareMode ? '#4db6ac' : '#00bcd4'}`,
            borderRadius: '8px',
            color: compareMode ? '#ffffff' : '#e0e0e0',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
            boxShadow: compareMode ? '0 0 15px rgba(77, 182, 172, 0.5)' : '0 0 10px rgba(0, 188, 212, 0.2)',
          }}
          onMouseEnter={(e) => {
            if (!compareMode) {
              e.currentTarget.style.backgroundColor = 'rgba(0, 188, 212, 0.2)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 188, 212, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!compareMode) {
              e.currentTarget.style.backgroundColor = 'rgba(17, 17, 34, 0.85)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 188, 212, 0.2)';
            }
          }}
        >
          {compareMode ? '对比模式' : '对比模式'}
        </button>
      </div>

      {/* 右侧设置面板 - 桌面端 */}
      {!isMobile && (
        <div style={{
          position: 'absolute',
          top: 80,
          right: 20,
          width: 240,
          backgroundColor: 'rgba(26, 26, 46, 0.85)',
          borderRadius: '12px',
          padding: '20px',
          pointerEvents: 'auto',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 188, 212, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: '#00bcd4',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            气象指标
          </h3>

          {/* 气象指标切换按钮 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            justifyContent: 'center',
          }}>
            {metricOptions.map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleMetricClick(key)}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  backgroundColor: selectedMetric === key ? config.colors[0] : 'rgba(17, 17, 34, 0.8)',
                  color: selectedMetric === key ? '#ffffff' : '#e0e0e0',
                  boxShadow: selectedMetric === key
                    ? `0 0 20px ${config.colors[0]}80`
                    : 'none',
                  transform: selectedMetric === key ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  if (selectedMetric !== key) {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 188, 212, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMetric !== key) {
                    e.currentTarget.style.backgroundColor = 'rgba(17, 17, 34, 0.8)';
                  }
                }}
              >
                <span style={{ fontSize: '18px', marginBottom: '2px' }}>
                  {key === 'temperature' ? '🌡️' : key === 'humidity' ? '💧' : '💨'}
                </span>
                <span>{config.name}</span>
              </button>
            ))}
          </div>

          {/* 柱体不透明度滑块 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '13px', color: '#a0a0a0' }}>柱体不透明度</span>
              <span style={{ fontSize: '13px', color: '#00bcd4', fontWeight: 500 }}>
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={handleOpacityChange}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, #00bcd4 0%, #4db6ac ${(opacity - 0.3) / 0.7 * 100}%, rgba(255,255,255,0.1) ${(opacity - 0.3) / 0.7 * 100}%, rgba(255,255,255,0.1) 100%)`,
                appearance: 'none',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <style>{`
              input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #4db6ac;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(77, 182, 172, 0.6);
                transition: all 0.2s ease;
              }
              input[type="range"]::-webkit-slider-thumb:hover {
                transform: scale(1.2);
                box-shadow: 0 0 15px rgba(77, 182, 172, 0.8);
              }
              input[type="range"]::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #4db6ac;
                cursor: pointer;
                border: none;
                box-shadow: 0 0 10px rgba(77, 182, 172, 0.6);
              }
            `}</style>
          </div>

          {/* 重置视角按钮 */}
          <button
            onClick={resetView}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'rgba(17, 17, 34, 0.8)',
              border: '1px solid rgba(0, 188, 212, 0.3)',
              borderRadius: '8px',
              color: '#e0e0e0',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 188, 212, 0.15)';
              e.currentTarget.style.borderColor = '#00bcd4';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 188, 212, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(17, 17, 34, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.3)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🔄 重置视角
          </button>
        </div>
      )}

      {/* 移动端 - 底部抽屉切换按钮 */}
      {isMobile && (
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          style={{
            position: 'absolute',
            bottom: 100,
            right: 20,
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: 'rgba(26, 26, 46, 0.9)',
            border: '2px solid #00bcd4',
            color: '#00bcd4',
            fontSize: '20px',
            cursor: 'pointer',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0, 188, 212, 0.4)',
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
        >
          ⚙️
        </button>
      )}

      {/* 移动端 - 底部抽屉 */}
      {isMobile && drawerOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            borderRadius: '16px 16px 0 0',
            padding: '20px',
            pointerEvents: 'auto',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(0, 188, 212, 0.3)',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
            transform: 'translateY(0)',
            transition: 'transform 0.3s ease',
          }}
        >
          <div style={{
            width: 40,
            height: 4,
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
            margin: '0 auto 16px auto',
          }} />

          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: '#00bcd4',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            设置
          </h3>

          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            justifyContent: 'center',
          }}>
            {metricOptions.map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleMetricClick(key)}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  backgroundColor: selectedMetric === key ? config.colors[0] : 'rgba(17, 17, 34, 0.8)',
                  color: selectedMetric === key ? '#ffffff' : '#e0e0e0',
                  boxShadow: selectedMetric === key
                    ? `0 0 20px ${config.colors[0]}80`
                    : 'none',
                }}
              >
                <span style={{ fontSize: '20px', marginBottom: '2px' }}>
                  {key === 'temperature' ? '🌡️' : key === 'humidity' ? '💧' : '💨'}
                </span>
                <span>{config.name}</span>
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '13px', color: '#a0a0a0' }}>柱体不透明度</span>
              <span style={{ fontSize: '13px', color: '#00bcd4', fontWeight: 500 }}>
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={handleOpacityChange}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, #00bcd4 0%, #4db6ac ${(opacity - 0.3) / 0.7 * 100}%, rgba(255,255,255,0.1) ${(opacity - 0.3) / 0.7 * 100}%, rgba(255,255,255,0.1) 100%)`,
                appearance: 'none',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          <button
            onClick={resetView}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: 'rgba(17, 17, 34, 0.8)',
              border: '1px solid rgba(0, 188, 212, 0.3)',
              borderRadius: '8px',
              color: '#e0e0e0',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
          >
            🔄 重置视角
          </button>
        </div>
      )}

      {/* 底部时间轴滑块 */}
      <div style={{
        position: 'absolute',
        bottom: isMobile ? 30 : 40,
        left: '50%',
        transform: 'translateX(-50%)',
        width: isMobile ? '85%' : '80%',
        maxWidth: '800px',
        pointerEvents: 'auto',
        backgroundColor: 'rgba(17, 17, 34, 0.75)',
        borderRadius: '12px',
        padding: isMobile ? '16px 20px' : '20px 28px',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0, 188, 212, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <span style={{ fontSize: '12px', color: '#a0a0a0' }}>时间轴</span>
          <span style={{
            fontSize: '14px',
            color: '#00bcd4',
            fontWeight: 600,
          }}>
            第 {currentDay + 1} 天
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <input
            type="range"
            min="0"
            max="6"
            step="1"
            value={currentDay}
            onChange={handleDayChange}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: `linear-gradient(to right, #00bcd4 0%, #4db6ac ${currentDay / 6 * 100}%, rgba(255,255,255,0.1) ${currentDay / 6 * 100}%, rgba(255,255,255,0.1) 100%)`,
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer',
            }}
          />

          {/* 刻度标记 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
            padding: '0 6px',
          }}>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <div
                key={day}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <div style={{
                  width: '2px',
                  height: '6px',
                  backgroundColor: currentDay >= day ? '#4db6ac' : 'rgba(255,255,255,0.2)',
                  borderRadius: '1px',
                }} />
                <span style={{
                  fontSize: '10px',
                  color: currentDay === day ? '#00bcd4' : '#606060',
                  fontWeight: currentDay === day ? 600 : 400,
                }}>
                  第{day + 1}天
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 数据标签弹窗 */}
      {popupData && metricConfig && (
        <div
          ref={popupRef}
          onClick={hidePopup}
          style={{
            position: 'absolute',
            left: popupPosition.left,
            top: popupPosition.top,
            backgroundColor: 'rgba(17, 17, 34, 0.92)',
            borderRadius: '8px',
            padding: '16px',
            pointerEvents: 'auto',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${METRIC_CONFIG[selectedMetric].colors[0]}60`,
            boxShadow: `0 4px 20px ${METRIC_CONFIG[selectedMetric].colors[0]}30`,
            minWidth: '180px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#ffffff',
            marginBottom: '8px',
          }}>
            {cityName}
          </div>

          <div style={{
            fontSize: '12px',
            color: '#a0a0a0',
            marginBottom: '12px',
          }}>
            {popupData.data.date}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            marginBottom: '4px',
          }}>
            <span style={{
              fontSize: '13px',
              color: '#a0a0a0',
            }}>
              {metricConfig.name}
            </span>
            <span style={{
              fontSize: '24px',
              fontWeight: 700,
              color: metricConfig.colors[0],
            }}>
              {popupData.data[selectedMetric]}
            </span>
            <span style={{
              fontSize: '14px',
              color: metricConfig.colors[0],
            }}>
              {metricConfig.unit}
            </span>
          </div>

          <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: '11px',
            color: '#606060',
            textAlign: 'center',
          }}>
            点击关闭
          </div>
        </div>
      )}
    </div>
  );
}

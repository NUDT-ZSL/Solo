import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Shuffle, Download, Sparkles } from 'lucide-react';
import AvatarPreview from './components/AvatarPreview';
import ElementPanel from './components/ElementPanel';
import ColorThemePicker from './components/ColorThemePicker';
import { AvatarConfig, ColorTheme } from './types';
import { colorThemes, hairOptions, eyesOptions, accessoryOptions } from './data';

function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    hair: 'lotus',
    eyes: 'big',
    accessory: 'headphone',
  });
  
  const [selectedThemeId, setSelectedThemeId] = useState<string>('neon-purple');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);

  const currentTheme: ColorTheme = colorThemes.find(t => t.id === selectedThemeId) || colorThemes[0];

  const updateHair = useCallback((id: string) => {
    setAvatarConfig(prev => ({ ...prev, hair: id }));
  }, []);

  const updateEyes = useCallback((id: string) => {
    setAvatarConfig(prev => ({ ...prev, eyes: id }));
  }, []);

  const updateAccessory = useCallback((id: string) => {
    setAvatarConfig(prev => ({ ...prev, accessory: id }));
  }, []);

  const updateTheme = useCallback((id: string) => {
    setSelectedThemeId(id);
  }, []);

  const getRandomElement = <T,>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const handleRandomize = useCallback(() => {
    if (isRandomizing) return;
    
    setIsRandomizing(true);
    setIsAnimating(true);
    
    let count = 0;
    const maxCount = 3;
    
    const interval = setInterval(() => {
      count++;
      
      setAvatarConfig({
        hair: getRandomElement(hairOptions).id,
        eyes: getRandomElement(eyesOptions).id,
        accessory: getRandomElement(accessoryOptions).id,
      });
      setSelectedThemeId(getRandomElement(colorThemes).id);
      
      if (count >= maxCount) {
        clearInterval(interval);
        setIsRandomizing(false);
        setTimeout(() => {
          setIsAnimating(false);
        }, 800);
      }
    }, 800);
  }, [isRandomizing]);

  const handleExportSVG = useCallback(() => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);
    
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
    
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `avatar-badge-${uuidv4().slice(0, 8)}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    document.body.style.background = `linear-gradient(135deg, #1a1a2e 0%, ${currentTheme.background} 100%)`;
    document.body.style.transition = 'background 0.5s ease';
  }, [currentTheme.background]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center animate-float"
              style={{ 
                backgroundColor: currentTheme.primary,
                boxShadow: `0 0 40px ${currentTheme.primary}60`,
              }}
            >
              <Sparkles size={28} className="text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
              个人IP形象徽章生成器
            </h1>
          </div>
          <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto">
            选择发型、眼睛和配饰，打造属于你的专属卡通头像徽章
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-center">
          <div className="w-full lg:w-auto flex flex-col items-center gap-6 lg:sticky lg:top-8">
            <AvatarPreview 
              ref={svgRef}
              config={avatarConfig} 
              theme={currentTheme}
              isAnimating={isAnimating}
            />
            
            <div className="w-full max-w-xs space-y-3">
              <ColorThemePicker 
                themes={colorThemes}
                selectedId={selectedThemeId}
                onSelect={updateTheme}
              />
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={handleRandomize}
                disabled={isRandomizing}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white
                  transition-all duration-300 ease-out
                  ${isRandomizing 
                    ? 'cursor-not-allowed opacity-70' 
                    : 'hover:scale-105 hover:shadow-lg active:scale-95'
                  }
                `}
                style={{ 
                  backgroundColor: currentTheme.primary,
                  boxShadow: isRandomizing ? 'none' : `0 0 30px ${currentTheme.primary}50`,
                }}
              >
                <Shuffle size={20} className={isRandomizing ? 'animate-spin' : ''} />
                {isRandomizing ? '生成中...' : '随机生成'}
              </button>
              
              <button
                onClick={handleExportSVG}
                className="
                  flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white
                  bg-white/10 backdrop-blur-sm border border-white/20
                  transition-all duration-300 ease-out
                  hover:bg-white/20 hover:scale-105 hover:shadow-lg active:scale-95
                "
              >
                <Download size={20} />
                导出 SVG
              </button>
            </div>
          </div>

          <div className="w-full lg:flex-1 max-w-2xl space-y-5">
            <ElementPanel
              category="hair"
              options={hairOptions}
              selectedId={avatarConfig.hair}
              theme={currentTheme}
              onSelect={updateHair}
            />
            
            <ElementPanel
              category="eyes"
              options={eyesOptions}
              selectedId={avatarConfig.eyes}
              theme={currentTheme}
              onSelect={updateEyes}
            />
            
            <ElementPanel
              category="accessory"
              options={accessoryOptions}
              selectedId={avatarConfig.accessory}
              theme={currentTheme}
              onSelect={updateAccessory}
            />
          </div>
        </div>

        <footer className="mt-16 text-center">
          <p className="text-white/40 text-sm">
            ✨ 点击元素卡片切换样式 · 支持移动端自适应 · SVG矢量格式导出
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;

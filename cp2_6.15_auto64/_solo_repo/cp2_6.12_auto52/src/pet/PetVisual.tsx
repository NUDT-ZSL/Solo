import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type PetSpecies = 'cat' | 'dog' | 'rabbit';
export type PetAction = 'idle' | 'feed' | 'bath' | 'play' | 'hatch' | 'bounce';

interface PetVisualProps {
  species: PetSpecies;
  happiness: number;
  action?: PetAction;
  onHatchComplete?: () => void;
  showHatchAnimation?: boolean;
}

const speciesPalette = {
  cat: { body: '#D6D3CE', stripe: '#8C8C8C', belly: '#F5F3F0', nose: '#FF9EB5', ear: '#B5B2AD', eye: '#3B3B3B' },
  dog: { body: '#F0C67A', spot: '#A97135', belly: '#FBE7C1', nose: '#4B3221', ear: '#C99751', eye: '#2E1F14' },
  rabbit: { body: '#FFFFFF', belly: '#FFF6F2', ear: '#FFD9E0', earInner: '#FF9EB5', nose: '#FF8FB3', eye: '#2E2420' },
};

const moodScale = (happy: number) => {
  if (happy >= 70) return { eye: 'happy', mouth: 'smile' };
  if (happy >= 40) return { eye: 'normal', mouth: 'flat' };
  if (happy >= 20) return { eye: 'sad', mouth: 'frown' };
  return { eye: 'sad', mouth: 'cry' };
};

const CatPet: React.FC<{ palette: typeof speciesPalette.cat; mood: { eye: string; mouth: string }; action: PetAction }> = ({ palette, mood, action }) => (
  <svg viewBox="0 0 300 400" width="100%" height="100%" style={{ overflow: 'visible' }}>
    {/* 尾巴 */}
    <motion.path
      d="M80 330 Q40 300 60 240 Q70 210 95 220"
      stroke={palette.stripe}
      strokeWidth="18"
      strokeLinecap="round"
      fill="none"
      animate={{ rotate: action === 'play' ? [-5, 15, -5, 10, -5] : [0, 3, -3, 0], transformOrigin: '80px 330px' }}
      transition={{ duration: action === 'play' ? 0.5 : 2, repeat: Infinity, ease: 'easeInOut' }}
    />
    {/* 身体 */}
    <ellipse cx="150" cy="300" rx="85" ry="75" fill={palette.body} />
    <ellipse cx="150" cy="320" rx="60" ry="45" fill={palette.belly} />
    {/* 条纹 */}
    <path d="M90 260 Q95 240 105 260" stroke={palette.stripe} strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M195 260 Q205 240 210 260" stroke={palette.stripe} strokeWidth="5" fill="none" strokeLinecap="round" />
    {/* 腿 */}
    <motion.ellipse cx="105" cy="365" rx="22" ry="28" fill={palette.body} animate={action === 'play' ? { y: [0, -20, 0, -15, 0] } : {}} transition={{ duration: 0.4, repeat: action === 'play' ? Infinity : 0 }} />
    <motion.ellipse cx="195" cy="365" rx="22" ry="28" fill={palette.body} animate={action === 'play' ? { y: [0, -25, 0, -10, 0] } : {}} transition={{ duration: 0.4, repeat: action === 'play' ? Infinity : 0, delay: 0.1 }} />
    {/* 头 */}
    <g>
      {/* 耳朵 */}
      <polygon points="90,170 75,105 130,150" fill={palette.ear} />
      <polygon points="210,170 225,105 170,150" fill={palette.ear} />
      <polygon points="100,155 90,120 120,150" fill={palette.earInner ?? '#FF9EB5'} opacity="0.6" />
      <polygon points="200,155 210,120 180,150" fill={palette.earInner ?? '#FF9EB5'} opacity="0.6" />
      {/* 头 */}
      <circle cx="150" cy="180" r="72" fill={palette.body} />
      {/* 脸条纹 */}
      <path d="M90 185 L70 175 M92 200 L72 205 M210 185 L230 175 M208 200 L228 205" stroke={palette.stripe} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M150 118 Q145 145 140 155 M150 118 Q155 145 160 155" stroke={palette.stripe} strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* 眼睛 */}
      {mood.eye === 'happy' && (
        <>
          <path d="M115 175 Q122 165 132 175" stroke={palette.eye} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M168 175 Q178 165 185 175" stroke={palette.eye} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </>
      )}
      {mood.eye === 'normal' && (
        <>
          <ellipse cx="123" cy="178" rx="9" ry="11" fill={palette.eye} />
          <ellipse cx="177" cy="178" rx="9" ry="11" fill={palette.eye} />
          <circle cx="126" cy="175" r="3.5" fill="white" />
          <circle cx="180" cy="175" r="3.5" fill="white" />
        </>
      )}
      {mood.eye === 'sad' && (
        <>
          <path d="M115 182 L133 178" stroke={palette.eye} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M167 178 L185 182" stroke={palette.eye} strokeWidth="4.5" strokeLinecap="round" />
          <ellipse cx="123" cy="183" rx="7" ry="8" fill={palette.eye} />
          <ellipse cx="177" cy="183" rx="7" ry="8" fill={palette.eye} />
        </>
      )}
      {/* 鼻子嘴巴 */}
      <path d="M144 200 L150 206 L156 200" stroke={palette.nose} strokeWidth="3.5" fill={palette.nose} strokeLinejoin="round" />
      <motion.path
        d={action === 'feed' ? (['M140 208 Q150 225 160 208', 'M135 208 Q150 232 165 208', 'M140 208 Q150 225 160 208'] as any) : (
          mood.mouth === 'smile' ? 'M138 208 Q150 220 162 208' :
            mood.mouth === 'frown' ? 'M138 220 Q150 210 162 220' :
              mood.mouth === 'cry' ? 'M138 220 Q150 210 162 220' : 'M140 214 L160 214'
        )}
        stroke={palette.eye}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        animate={action === 'feed' ? { d: ['M140 208 Q150 225 160 208', 'M135 208 Q150 232 165 208', 'M140 208 Q150 225 160 208'] } : {}}
        transition={{ duration: 0.25, repeat: action === 'feed' ? Infinity : 0 }}
      />
      {/* 胡须 */}
      <g stroke={palette.stripe} strokeWidth="1.5" strokeLinecap="round" opacity="0.8">
        <line x1="85" y1="195" x2="112" y2="198" />
        <line x1="88" y1="208" x2="113" y2="206" />
        <line x1="215" y1="195" x2="188" y2="198" />
        <line x1="212" y1="208" x2="187" y2="206" />
      </g>
    </g>
  </svg>
);

const DogPet: React.FC<{ palette: typeof speciesPalette.dog; mood: { eye: string; mouth: string }; action: PetAction }> = ({ palette, mood, action }) => (
  <svg viewBox="0 0 300 400" width="100%" height="100%" style={{ overflow: 'visible' }}>
    {/* 尾巴 */}
    <motion.path
      d="M225 310 Q260 270 255 230 Q250 205 225 215"
      stroke={palette.body}
      strokeWidth="20"
      strokeLinecap="round"
      fill="none"
      animate={{ rotate: action === 'play' ? [-10, 25, -10, 20, -5] : [0, 8, -8, 0], transformOrigin: '225px 310px' }}
      transition={{ duration: action === 'play' ? 0.35 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
    {/* 身体 */}
    <ellipse cx="150" cy="305" rx="90" ry="72" fill={palette.body} />
    <ellipse cx="150" cy="325" rx="60" ry="40" fill={palette.belly} />
    {/* 斑点 */}
    <circle cx="110" cy="270" r="14" fill={palette.spot} opacity="0.8" />
    <circle cx="190" cy="290" r="11" fill={palette.spot} opacity="0.8" />
    <circle cx="150" cy="260" r="8" fill={palette.spot} opacity="0.8" />
    {/* 腿 */}
    <motion.ellipse cx="100" cy="370" rx="24" ry="26" fill={palette.body} animate={action === 'play' ? { y: [0, -22, 0, -18, 0] } : {}} transition={{ duration: 0.4, repeat: action === 'play' ? Infinity : 0 }} />
    <motion.ellipse cx="200" cy="370" rx="24" ry="26" fill={palette.body} animate={action === 'play' ? { y: [0, -20, 0, -22, 0] } : {}} transition={{ duration: 0.4, repeat: action === 'play' ? Infinity : 0, delay: 0.1 }} />
    {/* 头 */}
    <g>
      {/* 垂耳 */}
      <ellipse cx="85" cy="185" rx="28" ry="48" fill={palette.ear} transform="rotate(-15 85 185)" />
      <ellipse cx="215" cy="185" rx="28" ry="48" fill={palette.ear} transform="rotate(15 215 185)" />
      <circle cx="150" cy="190" r="75" fill={palette.body} />
      {/* 斑点 */}
      <circle cx="95" cy="175" r="9" fill={palette.spot} opacity="0.7" />
      <circle cx="212" cy="210" r="7" fill={palette.spot} opacity="0.7" />
      {/* 嘴部 */}
      <ellipse cx="150" cy="220" rx="45" ry="35" fill={palette.belly} />
      {/* 眼睛 */}
      {mood.eye === 'happy' && (
        <>
          <path d="M110 178 Q120 168 130 178" stroke={palette.eye} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M170 178 Q180 168 190 178" stroke={palette.eye} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </>
      )}
      {mood.eye === 'normal' && (
        <>
          <ellipse cx="120" cy="182" rx="9" ry="10" fill={palette.eye} />
          <ellipse cx="180" cy="182" rx="9" ry="10" fill={palette.eye} />
          <circle cx="123" cy="179" r="3" fill="white" />
          <circle cx="183" cy="179" r="3" fill="white" />
        </>
      )}
      {mood.eye === 'sad' && (
        <>
          <path d="M110 186 L128 182" stroke={palette.eye} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M172 182 L190 186" stroke={palette.eye} strokeWidth="4.5" strokeLinecap="round" />
          <ellipse cx="120" cy="188" rx="7" ry="8" fill={palette.eye} />
          <ellipse cx="180" cy="188" rx="7" ry="8" fill={palette.eye} />
        </>
      )}
      {/* 鼻子 */}
      <ellipse cx="150" cy="208" rx="13" ry="10" fill={palette.nose} />
      <ellipse cx="146" cy="206" rx="3" ry="2.5" fill="#FFF" opacity="0.6" />
      {/* 嘴 */}
      <motion.path
        d={action === 'feed' ? (['M130 225 Q150 245 170 225', 'M125 225 Q150 255 175 225', 'M130 225 Q150 245 170 225'] as any) : (
          mood.mouth === 'smile' ? 'M132 225 Q150 240 168 225' :
            mood.mouth === 'frown' ? 'M132 240 Q150 230 168 240' :
              mood.mouth === 'cry' ? 'M132 240 Q150 230 168 240' : 'M135 230 L165 230'
        )}
        stroke={palette.eye}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        animate={action === 'feed' ? { d: ['M130 225 Q150 245 170 225', 'M125 225 Q150 255 175 225', 'M130 225 Q150 245 170 225'] } : {}}
        transition={{ duration: 0.25, repeat: action === 'feed' ? Infinity : 0 }}
      />
      <line x1="150" y1="218" x2="150" y2="228" stroke={palette.eye} strokeWidth="2.5" />
    </g>
  </svg>
);

const RabbitPet: React.FC<{ palette: typeof speciesPalette.rabbit; mood: { eye: string; mouth: string }; action: PetAction }> = ({ palette, mood, action }) => (
  <svg viewBox="0 0 300 400" width="100%" height="100%" style={{ overflow: 'visible' }}>
    {/* 短尾 */}
    <circle cx="75" cy="290" r="18" fill={palette.body} />
    {/* 身体 */}
    <ellipse cx="150" cy="300" rx="82" ry="75" fill={palette.body} />
    <ellipse cx="150" cy="320" rx="58" ry="42" fill={palette.belly} />
    {/* 腿 */}
    <motion.ellipse cx="108" cy="368" rx="25" ry="25" fill={palette.body} animate={action === 'play' ? { y: [0, -24, 0, -14, 0] } : {}} transition={{ duration: 0.4, repeat: action === 'play' ? Infinity : 0 }} />
    <motion.ellipse cx="192" cy="368" rx="25" ry="25" fill={palette.body} animate={action === 'play' ? { y: [0, -18, 0, -26, 0] } : {}} transition={{ duration: 0.4, repeat: action === 'play' ? Infinity : 0, delay: 0.1 }} />
    {/* 头 */}
    <g>
      {/* 长耳 */}
      <motion.ellipse cx="112" cy="90" rx="22" ry="62" fill={palette.ear} animate={action === 'play' ? { rotate: [-4, 8, -2, 6, 0], transformOrigin: '112px 150px' } : { rotate: [0, 2, -2, 0], transformOrigin: '112px 150px' }} transition={{ duration: 0.6, repeat: Infinity }}>
      </motion.ellipse>
      <ellipse cx="112" cy="95" rx="12" ry="48" fill={palette.earInner} />
      <motion.ellipse cx="188" cy="90" rx="22" ry="62" fill={palette.ear} animate={action === 'play' ? { rotate: [4, -8, 2, -6, 0], transformOrigin: '188px 150px' } : { rotate: [0, -2, 2, 0], transformOrigin: '188px 150px' }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}>
      </motion.ellipse>
      <ellipse cx="188" cy="95" rx="12" ry="48" fill={palette.earInner} />
      {/* 头 */}
      <circle cx="150" cy="195" r="70" fill={palette.body} />
      {/* 眼睛 */}
      {mood.eye === 'happy' && (
        <>
          <path d="M110 190 Q120 180 130 190" stroke={palette.eye} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M170 190 Q180 180 190 190" stroke={palette.eye} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </>
      )}
      {mood.eye === 'normal' && (
        <>
          <ellipse cx="120" cy="192" rx="9" ry="11" fill={palette.eye} />
          <ellipse cx="180" cy="192" rx="9" ry="11" fill={palette.eye} />
          <circle cx="123" cy="189" r="3.2" fill="white" />
          <circle cx="183" cy="189" r="3.2" fill="white" />
        </>
      )}
      {mood.eye === 'sad' && (
        <>
          <path d="M110 198 L128 194" stroke={palette.eye} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M172 194 L190 198" stroke={palette.eye} strokeWidth="4.5" strokeLinecap="round" />
          <ellipse cx="120" cy="200" rx="7" ry="8" fill={palette.eye} />
          <ellipse cx="180" cy="200" rx="7" ry="8" fill={palette.eye} />
        </>
      )}
      {/* 鼻子 */}
      <path d="M142 218 Q150 222 158 218 L150 226 Z" fill={palette.nose} />
      {/* 嘴 */}
      <motion.path
        d={action === 'feed' ? (['M140 230 Q150 248 160 230', 'M135 230 Q150 258 165 230', 'M140 230 Q150 248 160 230'] as any) : (
          mood.mouth === 'smile' ? 'M142 230 Q150 240 158 230' :
            mood.mouth === 'frown' ? 'M142 244 Q150 236 158 244' :
              mood.mouth === 'cry' ? 'M142 244 Q150 236 158 244' : 'M145 236 L155 236'
        )}
        stroke={palette.eye}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        animate={action === 'feed' ? { d: ['M140 230 Q150 248 160 230', 'M135 230 Q150 258 165 230', 'M140 230 Q150 248 160 230'] } : {}}
        transition={{ duration: 0.25, repeat: action === 'feed' ? Infinity : 0 }}
      />
      <line x1="150" y1="226" x2="150" y2="232" stroke={palette.eye} strokeWidth="2.5" />
      {/* 腮红 */}
      <circle cx="95" cy="215" r="10" fill="#FFB3C6" opacity="0.55" />
      <circle cx="205" cy="215" r="10" fill="#FFB3C6" opacity="0.55" />
    </g>
  </svg>
);

const EggShell: React.FC<{ side: 'left' | 'right'; palette: typeof speciesPalette.cat }> = ({ side }) => {
  const color = '#FFF5E1';
  const edge = side === 'left'
    ? 'M150 200 Q120 215 90 205 Q70 195 80 160 L150 160 Z'
    : 'M150 200 Q180 215 210 205 Q230 195 220 160 L150 160 Z';
  return (
    <g>
      <path d={side === 'left' ? 'M0 200 Q50 50 150 30 Q250 50 300 200 L300 280 Q260 300 200 295 L150 300 L100 295 Q40 300 0 280 Z' : ''} fill={color} stroke="#E8D4A8" strokeWidth="3" style={{ display: side === 'left' ? 'block' : 'none' }} />
      <path d={edge} fill="#FFFBF0" />
    </g>
  );
};

const WaterSplash: React.FC = () => (
  <g style={{ pointerEvents: 'none' }}>
    {Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const r = 70;
      const x = 150 + Math.cos(angle) * r;
      const y = 80 + Math.sin(angle) * r * 0.5;
      return (
        <motion.circle
          key={i}
          cx={150}
          cy={140}
          r={6}
          fill="#4FC3F7"
          initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
          animate={{
            scale: [0, 1.2, 0.5],
            opacity: [0, 1, 0],
            x: x - 150,
            y: y - 140,
          }}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeOut', delay: i * 0.08 }}
        />
      );
    })}
    {Array.from({ length: 5 }).map((_, i) => (
      <motion.path
        key={`drop-${i}`}
        d={`M${130 + i * 10} 100 q5 -20 10 0`}
        stroke="#29B6F6"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: [0, 1, 0], y: [-5, -30, -5] }}
        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
      />
    ))}
  </g>
);

const PetVisual: React.FC<PetVisualProps> = ({ species, happiness, action = 'idle', onHatchComplete, showHatchAnimation = false }) => {
  const palette = speciesPalette[species];
  const mood = moodScale(happiness);

  const PetComp = species === 'cat' ? CatPet : species === 'dog' ? DogPet : RabbitPet;

  // 碎片配置
  const fragments = React.useMemo(() => Array.from({ length: 10 }).map((_, i) => ({
    id: i,
    x: (i % 2 === 0 ? -1 : 1) * (30 + Math.random() * 80),
    y: -60 - Math.random() * 80,
    rotate: (Math.random() - 0.5) * 360,
    scale: 0.4 + Math.random() * 0.6,
    shape: i % 3,
  })), []);

  // 弹跳完成回调
  const onBounceComplete = React.useCallback((definition: any) => {
    if (definition?.label === 'land' && onHatchComplete) {
      onHatchComplete();
    }
  }, [onHatchComplete]);

  const renderPet = () => (
    <motion.div
      className="absolute inset-0 flex items-end justify-center pb-2"
      variants={{
        hatch: { y: -800, opacity: 0, scale: 0.6 },
        fall: {
          y: [-800, 0],
          opacity: [0, 1],
          scale: 0.6,
          transition: { duration: 0.4, ease: 'easeIn' }
        },
        squash: {
          scaleY: [1, 0.68, 1.08, 1],
          scaleX: [1, 1.22, 0.92, 1],
          y: [0, 18, -10, 0],
          transition: { duration: 0.3, ease: 'easeOut', times: [0, 0.4, 0.75, 1] }
        },
        idle: {},
        play: { y: [0, -35, 0, -25, 0], transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } },
      }}
      initial={showHatchAnimation ? 'hatch' : 'idle'}
      animate={
        showHatchAnimation
          ? (['fall', 'squash', 'idle'] as any)
          : action === 'play' ? 'play' : 'idle'
      }
      transition={{
        staggerChildren: 0.05,
        default: { duration: 0.3 },
      }}
      onAnimationComplete={onBounceComplete}
    >
      <div className="relative w-full h-full flex items-end justify-center">
        <div className="w-full h-full">
          <PetComp palette={palette as any} mood={mood} action={action} />
        </div>
        {action === 'bath' && (
          <div className="absolute top-0 left-0 w-full h-1/2 pointer-events-none">
            <svg viewBox="0 0 300 400" width="100%" height="100%">
              <WaterSplash />
            </svg>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="pet-container">
      {showHatchAnimation ? (
        <AnimatePresence mode="wait">
          <motion.div
            key="egg"
            className="absolute inset-0"
            initial={{ opacity: 1, scale: 0.9 }}
            animate={{ scale: [0.9, 1.02, 1] }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{
                rotate: [0, -4, 4, -3, 3, 0],
                y: [0, -8, 0],
              }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            >
              <svg viewBox="0 0 300 400" width="92%" height="92%">
                {/* 完整蛋壳 */}
                <motion.defs>
                  <linearGradient id="eggGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFF8E7" />
                    <stop offset="100%" stopColor="#FFE9BF" />
                  </linearGradient>
                </motion.defs>

                {/* 下半蛋壳（始终存在） */}
                <motion.g
                  animate={{ y: [0, 0, 0], opacity: 1 }}
                  transition={{ duration: 1 }}
                >
                  <path d="M0 205 Q50 350 150 360 Q250 350 300 205 L300 285 Q260 305 200 300 L150 305 L100 300 Q40 305 0 285 Z" fill="url(#eggGrad)" stroke="#E8D4A8" strokeWidth="3" />
                </motion.g>

                {/* 上半左蛋壳 */}
                <motion.g
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={{
                    x: [0, 0, -120, -220],
                    y: [0, 0, -40, -150],
                    rotate: [0, 0, -25, -80],
                    opacity: [1, 1, 1, 0],
                  }}
                  transition={{ duration: 1, times: [0, 0.3, 0.7, 1], ease: 'easeInOut' }}
                  style={{ transformOrigin: '80px 180px' }}
                >
                  <path d="M0 200 Q50 50 150 30 Q250 50 240 198 L200 195 Q160 180 120 190 Q80 200 0 200 Z" fill="url(#eggGrad)" stroke="#E8D4A8" strokeWidth="3" />
                  <path d="M30 150 L55 165" stroke="#E8D4A8" strokeWidth="2" strokeLinecap="round" />
                  <path d="M180 110 L195 135" stroke="#E8D4A8" strokeWidth="2" strokeLinecap="round" />
                </motion.g>

                {/* 上半右蛋壳 */}
                <motion.g
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={{
                    x: [0, 0, 120, 210],
                    y: [0, 0, -50, -160],
                    rotate: [0, 0, 22, 75],
                    opacity: [1, 1, 1, 0],
                  }}
                  transition={{ duration: 1, times: [0, 0.3, 0.7, 1], ease: 'easeInOut' }}
                  style={{ transformOrigin: '220px 180px' }}
                >
                  <path d="M60 198 Q100 178 150 170 Q200 178 240 198 Q260 100 210 45 Q160 25 150 30 Q250 50 300 200 L240 198 Z" fill="url(#eggGrad)" stroke="#E8D4A8" strokeWidth="3" />
                  <path d="M260 150 L235 165" stroke="#E8D4A8" strokeWidth="2" strokeLinecap="round" />
                </motion.g>

                {/* 飘散碎片 */}
                {fragments.map((f) => (
                  <motion.path
                    key={f.id}
                    d={f.shape === 0 ? 'M0 0 L18 -4 L14 16 L-4 12 Z' : f.shape === 1 ? 'M0 0 L22 0 L18 14 L4 20 Z' : 'M10 0 L20 10 L10 20 L0 10 Z'}
                    fill={f.id % 2 === 0 ? '#FFE9BF' : '#FFF8E7'}
                    stroke="#E8D4A8"
                    strokeWidth="2"
                    style={{ transformOrigin: 'center' }}
                    initial={{ x: 150, y: 170, opacity: 1, scale: f.scale, rotate: 0 }}
                    animate={{
                      x: 150 + f.x + (f.id % 2 === 0 ? -30 : 30),
                      y: 170 + f.y - 50,
                      opacity: [1, 1, 0],
                      rotate: f.rotate,
                      scale: [f.scale, f.scale * 1.1, f.scale * 0.3],
                    }}
                    transition={{
                      duration: 1,
                      times: [0, 0.55, 1],
                      ease: 'easeOut',
                      delay: 0.35 + f.id * 0.03,
                    }}
                  />
                ))}

                {/* 裂纹（动画前半段出现） */}
                <motion.path
                  d="M130 80 L140 120 L120 150 L145 175 L155 195"
                  stroke="#C9A968"
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: [0, 1, 1],
                    opacity: [0, 1, 0],
                  }}
                  transition={{ duration: 0.9, times: [0, 0.35, 0.7] }}
                />
                <motion.path
                  d="M170 90 L165 130 L185 160 L160 188"
                  stroke="#C9A968"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: [0, 1, 1],
                    opacity: [0, 1, 0],
                  }}
                  transition={{ duration: 0.9, times: [0, 0.4, 0.75] }}
                />
              </svg>
            </motion.div>
          </motion.div>

          {/* 宠物弹跳落地阶段 */}
          <motion.div
            key="pet"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0, 1],
            }}
            transition={{ duration: 1.1, times: [0, 0.7, 0.85] }}
          >
            {renderPet()}
          </motion.div>
        </AnimatePresence>
      ) : (
        renderPet()
      )}

      {/* 地面阴影 */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 bottom-0 h-4 rounded-full bg-black/15"
        style={{ width: '70%' }}
        animate={{
          opacity: showHatchAnimation ? [0, 0, 0.4, 1] : 0.6,
          scale: showHatchAnimation ? (['fall', 'squash'] as any) : [1, 0.98, 1],
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
};

export default PetVisual;

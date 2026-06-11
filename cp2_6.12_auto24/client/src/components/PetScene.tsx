import { useEffect, useRef, useState } from 'react';
import { PetState } from '../types';
import InteractionPanel from './InteractionPanel';

interface PetSceneProps {
  pet: PetState;
  activeAnimation: 'feed' | 'play' | 'train' | null;
  onAction: (type: 'feed' | 'play' | 'train') => void;
}

const BG_COLORS: Record<string, string> = {
  cat: 'linear-gradient(135deg, #FFECD2 0%, #FCB69F 100%)',
  dog: 'linear-gradient(135deg, #A1C4FD 0%, #C2E9FB 100%)',
  dragon: 'linear-gradient(135deg, #D4A5FF 0%, #E8CEFF 100%)',
};

function StatusBars({ pet }: { pet: PetState }) {
  const [displayHealth, setDisplayHealth] = useState(pet.health);
  const [displayHappiness, setDisplayHappiness] = useState(pet.happiness);
  const [displayHunger, setDisplayHunger] = useState(pet.hunger);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setDisplayHealth(pet.health);
    setDisplayHappiness(pet.happiness);
    setDisplayHunger(pet.hunger);
    setAnimKey((k) => k + 1);
  }, [pet.health, pet.happiness, pet.hunger]);

  return (
    <div className="status-bars">
      <div className="status-row">
        <span className="status-icon">❤️</span>
        <div className="status-bar-container">
          <div className="status-bar-bg">
            <div
              className="status-bar-fill health-bar"
              style={{ width: `${displayHealth}%` }}
            />
            <div className="status-bar-wave health-wave" key={`hw-${animKey}`} />
          </div>
        </div>
        <span className="status-value health-value" key={`hv-${pet.health}`}>
          {Math.round(displayHealth)}
        </span>
      </div>
      <div className="status-row">
        <span className="status-icon">😊</span>
        <div className="status-bar-container">
          <div className="status-bar-bg">
            <div
              className="status-bar-fill happiness-bar"
              style={{ width: `${displayHappiness}%` }}
            />
            <div className="status-bar-wave happiness-wave" key={`hpw-${animKey}`} />
          </div>
        </div>
        <span className="status-value happiness-value" key={`hpv-${pet.happiness}`}>
          {Math.round(displayHappiness)}
        </span>
      </div>
      <div className="status-row">
        <span className="status-icon">🍖</span>
        <div className="status-bar-container">
          <div className="status-bar-bg">
            <div
              className="status-bar-fill hunger-bar"
              style={{ width: `${displayHunger}%` }}
            />
            <div className="status-bar-wave hunger-wave" key={`hgw-${animKey}`} />
          </div>
        </div>
        <span className="status-value hunger-value" key={`hgv-${pet.hunger}`}>
          {Math.round(displayHunger)}
        </span>
      </div>
    </div>
  );
}

function PetDisplay({ pet, activeAnimation }: { pet: PetState; activeAnimation: 'feed' | 'play' | 'train' | null }) {
  const petRef = useRef<HTMLDivElement>(null);

  const petSVG: Record<string, JSX.Element> = {
    cat: (
      <svg viewBox="0 0 200 200" className="pet-svg">
        <ellipse cx="100" cy="130" rx="50" ry="45" fill="#FF8C42" />
        <ellipse cx="100" cy="85" rx="38" ry="35" fill="#FF8C42" />
        <polygon points="68,60 55,25 85,55" fill="#FF8C42" />
        <polygon points="132,60 145,25 115,55" fill="#FF8C42" />
        <polygon points="70,57 60,30 83,53" fill="#FFB380" />
        <polygon points="130,57 140,30 117,53" fill="#FFB380" />
        <ellipse cx="87" cy="82" rx="6" ry="7" fill="#2D2D2D" />
        <ellipse cx="113" cy="82" rx="6" ry="7" fill="#2D2D2D" />
        <ellipse cx="89" cy="80" rx="2.5" ry="3" fill="white" />
        <ellipse cx="115" cy="80" rx="2.5" ry="3" fill="white" />
        <ellipse cx="100" cy="93" rx="5" ry="3.5" fill="#FF6B8A" />
        <line x1="60" y1="88" x2="78" y2="90" stroke="#2D2D2D" strokeWidth="1.5" />
        <line x1="60" y1="93" x2="78" y2="93" stroke="#2D2D2D" strokeWidth="1.5" />
        <line x1="122" y1="90" x2="140" y2="88" stroke="#2D2D2D" strokeWidth="1.5" />
        <line x1="122" y1="93" x2="140" y2="93" stroke="#2D2D2D" strokeWidth="1.5" />
        <path d="M150,135 Q165,125 160,145" stroke="#FF8C42" strokeWidth="8" fill="none" strokeLinecap="round" />
        {activeAnimation === 'feed' && (
          <>
            <ellipse cx="100" cy="97" rx="12" ry="8" fill="#2D2D2D" className="mouth-open" />
            <circle cx="80" cy="70" r="4" fill="#FFE0E0" opacity="0.7" className="blush" />
            <circle cx="120" cy="70" r="4" fill="#FFE0E0" opacity="0.7" className="blush" />
          </>
        )}
        {activeAnimation === 'play' && (
          <>
            <text x="70" y="40" fontSize="20" className="float-note note-1">♪</text>
            <text x="120" y="35" fontSize="16" className="float-note note-2">♫</text>
            <text x="95" y="25" fontSize="18" className="float-note note-3">♪</text>
          </>
        )}
        {activeAnimation === 'train' && (
          <>
            <text x="75" y="55" fontSize="14" className="sweat-drop sweat-1">💦</text>
            <text x="120" y="50" fontSize="12" className="sweat-drop sweat-2">💧</text>
          </>
        )}
      </svg>
    ),
    dog: (
      <svg viewBox="0 0 200 200" className="pet-svg">
        <ellipse cx="100" cy="130" rx="50" ry="45" fill="#8B6914" />
        <ellipse cx="100" cy="85" rx="38" ry="35" fill="#C4956A" />
        <ellipse cx="62" cy="75" rx="18" ry="28" fill="#8B6914" transform="rotate(-15,62,75)" />
        <ellipse cx="138" cy="75" rx="18" ry="28" fill="#8B6914" transform="rotate(15,138,75)" />
        <ellipse cx="87" cy="82" rx="7" ry="8" fill="#2D2D2D" />
        <ellipse cx="113" cy="82" rx="7" ry="8" fill="#2D2D2D" />
        <ellipse cx="89" cy="80" rx="3" ry="3.5" fill="white" />
        <ellipse cx="115" cy="80" rx="3" ry="3.5" fill="white" />
        <ellipse cx="100" cy="95" rx="8" ry="6" fill="#2D2D2D" />
        <ellipse cx="100" cy="110" rx="12" ry="8" fill="#E88B8B" className="tongue" />
        <path d="M85,170 Q90,190 95,185" stroke="#8B6914" strokeWidth="8" fill="none" strokeLinecap="round" className="wag-tail" />
        {activeAnimation === 'feed' && (
          <>
            <ellipse cx="100" cy="99" rx="14" ry="10" fill="#2D2D2D" className="mouth-open" />
          </>
        )}
        {activeAnimation === 'play' && (
          <>
            <text x="65" y="40" fontSize="20" className="float-note note-1">♪</text>
            <text x="125" y="35" fontSize="16" className="float-note note-2">♫</text>
            <text x="90" y="25" fontSize="18" className="float-note note-3">♪</text>
          </>
        )}
        {activeAnimation === 'train' && (
          <>
            <text x="70" y="55" fontSize="14" className="sweat-drop sweat-1">💦</text>
            <text x="125" y="50" fontSize="12" className="sweat-drop sweat-2">💧</text>
          </>
        )}
      </svg>
    ),
    dragon: (
      <svg viewBox="0 0 200 200" className="pet-svg">
        <ellipse cx="100" cy="130" rx="48" ry="42" fill="#9B5DE5" />
        <ellipse cx="100" cy="85" rx="36" ry="33" fill="#B07DE8" />
        <polygon points="75,60 65,20 85,55" fill="#7B2FBF" />
        <polygon points="125,60 135,20 115,55" fill="#7B2FBF" />
        <polygon points="78,55 72,28 84,50" fill="#C49EFF" />
        <polygon points="122,55 128,28 116,50" fill="#C49EFF" />
        <ellipse cx="87" cy="80" rx="7" ry="8" fill="#FFD700" />
        <ellipse cx="113" cy="80" rx="7" ry="8" fill="#FFD700" />
        <ellipse cx="87" cy="80" rx="4" ry="6" fill="#2D2D2D" />
        <ellipse cx="113" cy="80" rx="4" ry="6" fill="#2D2D2D" />
        <ellipse cx="100" cy="95" rx="6" ry="4" fill="#FF6B6B" />
        <path d="M40,120 Q25,100 30,130" fill="#9B5DE5" />
        <path d="M40,120 Q25,100 30,130" fill="#7B2FBF" opacity="0.5" />
        <path d="M160,120 Q175,100 170,130" fill="#9B5DE5" />
        <path d="M160,120 Q175,100 170,130" fill="#7B2FBF" opacity="0.5" />
        <ellipse cx="100" cy="170" rx="30" ry="8" fill="#9B5DE5" />
        {activeAnimation === 'feed' && (
          <>
            <ellipse cx="100" cy="98" rx="14" ry="10" fill="#2D2D2D" className="mouth-open" />
            <path d="M115,92 Q130,75 120,88" fill="#FF6B6B" opacity="0.8" className="fire-small" />
          </>
        )}
        {activeAnimation === 'play' && (
          <>
            <text x="65" y="40" fontSize="20" className="float-note note-1">♪</text>
            <text x="125" y="35" fontSize="16" className="float-note note-2">♫</text>
            <text x="90" y="22" fontSize="18" className="float-note note-3">♪</text>
          </>
        )}
        {activeAnimation === 'train' && (
          <>
            <text x="70" y="55" fontSize="14" className="sweat-drop sweat-1">💦</text>
            <text x="125" y="50" fontSize="12" className="sweat-drop sweat-2">💧</text>
          </>
        )}
        {!activeAnimation && (
          <path d="M120,95 Q140,80 130,95" fill="#FF6B6B" opacity="0.6" className="fire-idle" />
        )}
      </svg>
    ),
  };

  const animClass = activeAnimation
    ? `pet-anim-${activeAnimation}`
    : 'pet-anim-idle';

  return (
    <div className="pet-display-area" style={{ background: BG_COLORS[pet.type] }}>
      <div className={`pet-character ${animClass}`} ref={petRef}>
        {petSVG[pet.type]}
      </div>
      <h2 className="pet-name-label">{pet.name}</h2>
      {activeAnimation === 'feed' && (
        <div className="food-particle">🍖</div>
      )}
    </div>
  );
}

export default function PetScene({ pet, activeAnimation, onAction }: PetSceneProps) {
  return (
    <div className="pet-scene">
      <StatusBars pet={pet} />
      <PetDisplay pet={pet} activeAnimation={activeAnimation} />
      <InteractionPanel pet={pet} onAction={onAction} />
    </div>
  );
}

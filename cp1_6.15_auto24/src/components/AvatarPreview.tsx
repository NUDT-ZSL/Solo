import React, { forwardRef } from 'react';
import { AvatarConfig, ColorTheme } from '../types';

interface AvatarPreviewProps {
  config: AvatarConfig;
  theme: ColorTheme;
  isAnimating: boolean;
}

const HairSVG: React.FC<{ type: string; color: string; secondary: string }> = ({ type, color, secondary }) => {
  switch (type) {
    case 'lotus':
      return (
        <g className="element-transition" key="hair-lotus">
          <ellipse cx="120" cy="75" rx="58" ry="42" fill={color} />
          <ellipse cx="85" cy="65" rx="28" ry="22" fill={secondary} opacity="0.8" />
          <ellipse cx="155" cy="65" rx="28" ry="22" fill={secondary} opacity="0.8" />
          <path d="M62 85 Q60 55 90 50 Q120 35 150 50 Q180 55 178 85" fill={color} />
          <path d="M70 78 Q68 60 92 58 Q110 50 128 58 Q152 60 150 78" fill={secondary} opacity="0.6" />
        </g>
      );
    case 'spiky':
      return (
        <g className="element-transition" key="hair-spiky">
          <polygon points="70,80 65,45 80,60 85,35 100,55 110,28 120,52 130,28 140,55 155,35 160,60 175,45 170,80" fill={color} />
          <polygon points="78,75 74,50 88,62 94,42 106,58 114,38 124,54 134,38 144,58 156,42 162,62 166,50 162,75" fill={secondary} opacity="0.7" />
        </g>
      );
    case 'bob':
      return (
        <g className="element-transition" key="hair-bob">
          <path d="M60 70 Q55 40 120 35 Q185 40 180 70 L180 115 Q175 125 165 120 L160 100 Q150 130 120 132 Q90 130 80 100 L75 120 Q65 125 60 115 Z" fill={color} />
          <path d="M70 75 Q68 50 120 48 Q172 50 170 75" stroke={secondary} strokeWidth="3" fill="none" opacity="0.6" />
        </g>
      );
    case 'curly':
      return (
        <g className="element-transition" key="hair-curly">
          <circle cx="75" cy="70" r="22" fill={color} />
          <circle cx="100" cy="55" r="24" fill={color} />
          <circle cx="130" cy="55" r="24" fill={color} />
          <circle cx="155" cy="70" r="22" fill={color} />
          <circle cx="65" cy="95" r="18" fill={color} />
          <circle cx="175" cy="95" r="18" fill={color} />
          <circle cx="85" cy="58" r="10" fill={secondary} opacity="0.6" />
          <circle cx="135" cy="58" r="10" fill={secondary} opacity="0.6" />
        </g>
      );
    case 'bald':
    default:
      return null;
  }
};

const EyesSVG: React.FC<{ type: string; color: string; accent: string }> = ({ type, color, accent }) => {
  switch (type) {
    case 'big':
      return (
        <g className="element-transition" key="eyes-big">
          <ellipse cx="95" cy="110" rx="14" ry="16" fill="#ffffff" />
          <ellipse cx="145" cy="110" rx="14" ry="16" fill="#ffffff" />
          <circle cx="97" cy="112" r="8" fill={color} />
          <circle cx="147" cy="112" r="8" fill={color} />
          <circle cx="99" cy="109" r="3" fill="#ffffff" />
          <circle cx="149" cy="109" r="3" fill="#ffffff" />
        </g>
      );
    case 'squint':
      return (
        <g className="element-transition" key="eyes-squint">
          <path d="M82 110 Q95 118 108 110" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M132 110 Q145 118 158 110" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'star':
      return (
        <g className="element-transition" key="eyes-star">
          <ellipse cx="95" cy="110" rx="14" ry="16" fill="#ffffff" />
          <ellipse cx="145" cy="110" rx="14" ry="16" fill="#ffffff" />
          <polygon points="95,100 98,108 106,108 99,114 102,122 95,117 88,122 91,114 84,108 92,108" fill={color} />
          <polygon points="145,100 148,108 156,108 149,114 152,122 145,117 138,122 141,114 134,108 142,108" fill={color} />
          <circle cx="95" cy="110" r="2" fill={accent} />
          <circle cx="145" cy="110" r="2" fill={accent} />
        </g>
      );
    case 'sunglasses':
      return (
        <g className="element-transition" key="eyes-sunglasses">
          <rect x="70" y="98" width="50" height="28" rx="8" fill="#1f2937" stroke={color} strokeWidth="2" />
          <rect x="120" y="98" width="50" height="28" rx="8" fill="#1f2937" stroke={color} strokeWidth="2" />
          <rect x="118" y="108" width="4" height="8" fill={color} />
          <rect x="78" y="104" width="15" height="6" rx="3" fill={accent} opacity="0.4" />
          <rect x="128" y="104" width="15" height="6" rx="3" fill={accent} opacity="0.4" />
        </g>
      );
    default:
      return null;
  }
};

const AccessorySVG: React.FC<{ type: string; color: string; secondary: string; accent: string }> = ({ type, color, secondary, accent }) => {
  switch (type) {
    case 'headphone':
      return (
        <g className="element-transition" key="acc-headphone">
          <path d="M55 100 Q55 40 120 35 Q185 40 185 100" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
          <ellipse cx="50" cy="105" rx="14" ry="22" fill={color} />
          <ellipse cx="190" cy="105" rx="14" ry="22" fill={color} />
          <ellipse cx="52" cy="107" rx="8" ry="14" fill={secondary} />
          <ellipse cx="188" cy="107" rx="8" ry="14" fill={secondary} />
          <circle cx="52" cy="107" r="4" fill={accent} />
          <circle cx="188" cy="107" r="4" fill={accent} />
        </g>
      );
    case 'hat':
      return (
        <g className="element-transition" key="acc-hat">
          <ellipse cx="120" cy="58" rx="75" ry="10" fill={color} />
          <path d="M75 58 Q70 20 120 18 Q170 20 165 58" fill={color} />
          <rect x="75" y="50" width="90" height="10" fill={secondary} rx="2" />
          <circle cx="120" cy="32" r="6" fill={accent} />
        </g>
      );
    case 'bow':
      return (
        <g className="element-transition" key="acc-bow">
          <ellipse cx="165" cy="55" rx="22" ry="14" fill={color} transform="rotate(-20 165 55)" />
          <ellipse cx="185" cy="70" rx="22" ry="14" fill={color} transform="rotate(20 185 70)" />
          <circle cx="173" cy="62" r="8" fill={secondary} />
          <ellipse cx="165" cy="55" rx="10" ry="5" fill={accent} opacity="0.5" transform="rotate(-20 165 55)" />
          <ellipse cx="185" cy="70" rx="10" ry="5" fill={accent} opacity="0.5" transform="rotate(20 185 70)" />
        </g>
      );
    case 'mask':
      return (
        <g className="element-transition" key="acc-mask">
          <path d="M65 105 Q60 90 95 88 Q120 85 145 88 Q180 90 175 105 L170 130 Q145 145 120 142 Q95 145 70 130 Z" fill={color} opacity="0.9" />
          <ellipse cx="95" cy="110" rx="12" ry="10" fill={accent} />
          <ellipse cx="145" cy="110" rx="12" ry="10" fill={accent} />
          <path d="M65 105 Q60 90 95 88 Q120 85 145 88 Q180 90 175 105" stroke={secondary} strokeWidth="2" fill="none" />
        </g>
      );
    case 'glasses':
      return (
        <g className="element-transition" key="acc-glasses">
          <circle cx="95" cy="110" r="20" fill="none" stroke={color} strokeWidth="4" />
          <circle cx="145" cy="110" r="20" fill="none" stroke={color} strokeWidth="4" />
          <line x1="115" y1="110" x2="125" y2="110" stroke={color} strokeWidth="4" />
          <line x1="75" y1="108" x2="58" y2="100" stroke={color} strokeWidth="4" strokeLinecap="round" />
          <line x1="165" y1="108" x2="182" y2="100" stroke={color} strokeWidth="4" strokeLinecap="round" />
          <circle cx="88" cy="104" r="4" fill={accent} opacity="0.5" />
          <circle cx="138" cy="104" r="4" fill={accent} opacity="0.5" />
        </g>
      );
    default:
      return null;
  }
};

const AvatarPreview = forwardRef<SVGSVGElement, AvatarPreviewProps>(({ config, theme, isAnimating }, ref) => {
  return (
    <div 
      className="relative bg-transition rounded-full p-1"
      style={{ backgroundColor: theme.background }}
    >
      <div 
        className="absolute inset-0 rounded-full animate-pulse-glow"
        style={{
          background: `radial-gradient(circle, ${theme.primary}40 0%, transparent 70%)`,
          filter: 'blur(12px)',
        }}
      />
      <div 
        className="relative rounded-full overflow-hidden"
        style={{
          width: 240,
          height: 240,
          border: `4px solid ${theme.border}`,
          background: `linear-gradient(180deg, ${theme.background} 0%, ${theme.background}cc 100%)`,
        }}
      >
        <svg
          ref={ref}
          viewBox="0 0 240 240"
          width="240"
          height="240"
          xmlns="http://www.w3.org/2000/svg"
          className={isAnimating ? 'animate-spin-scale' : ''}
        >
          <defs>
            <radialGradient id={`face-gradient-${theme.id}`} cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor={theme.accent} />
              <stop offset="100%" stopColor={theme.secondary} />
            </radialGradient>
          </defs>
          
          <ellipse cx="120" cy="130" rx="62" ry="68" fill={`url(#face-gradient-${theme.id})`} />
          
          <path d="M88 155 Q95 168 120 170 Q145 168 152 155" stroke={theme.border} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
          
          <ellipse cx="80" cy="140" rx="8" ry="5" fill={theme.primary} opacity="0.4" />
          <ellipse cx="160" cy="140" rx="8" ry="5" fill={theme.primary} opacity="0.4" />
          
          <HairSVG type={config.hair} color={theme.primary} secondary={theme.secondary} />
          
          <EyesSVG type={config.eyes} color={theme.border} accent={theme.accent} />
          
          <AccessorySVG type={config.accessory} color={theme.primary} secondary={theme.secondary} accent={theme.accent} />
        </svg>
      </div>
    </div>
  );
});

AvatarPreview.displayName = 'AvatarPreview';

export default AvatarPreview;

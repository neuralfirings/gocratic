
import React from 'react';
import { StoneColor, MarkerType } from '../types';

interface StoneProps {
  color?: StoneColor;
  isLastMove?: boolean;
  markerType?: MarkerType;
  label?: string;
  markerColor?: string;
  face?: string; // "SAD" (Atari) or "ANGRY" (Attacker)
}

export const StoneComponent: React.FC<StoneProps> = ({ color, isLastMove, markerType, label, markerColor, face }) => {
  
  const isBlack = color === 'BLACK';
  const contrastColor = isBlack ? '#ffffff' : '#0f172a';

  // Helper to render marker shape
  const renderMarker = () => {
    if (!markerType) return null;

    const defaultColor = color === 'BLACK' ? '#ffffff' : color === 'WHITE' ? '#0f172a' : '#ef4444'; 
    const finalColor = markerColor || defaultColor;
    
    const commonProps = {
      stroke: finalColor,
      strokeWidth: "2.5",
      fill: "none",
      className: "w-[60%] h-[60%] absolute inset-0 m-auto z-20 pointer-events-none drop-shadow-md"
    };

    switch (markerType) {
      case 'TRIANGLE':
        return (
          <svg viewBox="0 0 24 24" {...commonProps}>
            <path d="M12 4L22 20H2L12 4Z" />
          </svg>
        );
      case 'CIRCLE':
        return (
          <svg viewBox="0 0 24 24" {...commonProps}>
            <circle cx="12" cy="12" r="9" />
          </svg>
        );
      case 'SQUARE':
        return (
          <svg viewBox="0 0 24 24" {...commonProps}>
            <rect x="4" y="4" width="16" height="16" />
          </svg>
        );
      case 'X':
        return (
          <svg viewBox="0 0 24 24" {...commonProps}>
            <path d="M4 4L20 20M20 4L4 20" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderFaceGraphic = () => {
    if (!face) return null;

    const commonProps = {
      className: "w-[70%] h-[70%] absolute inset-0 m-auto z-20 pointer-events-none drop-shadow-sm opacity-90",
      viewBox: "0 0 100 100"
    };

    if (face === 'SAD') {
      // Atari status: Sad/Worried
      return (
        <svg {...commonProps}>
          {/* Eyes */}
          <circle cx="35" cy="40" r="6" fill={contrastColor} />
          <circle cx="65" cy="40" r="6" fill={contrastColor} />
          {/* Frown */}
          <path d="M 30 75 Q 50 55 70 75" fill="none" stroke={contrastColor} strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    }

    if (face === 'ANGRY') {
      // Attacker status: Focused/Angry
      return (
        <svg {...commonProps}>
          {/* Slanted Eyebrows */}
          <path d="M 25 35 L 45 42" stroke={contrastColor} strokeWidth="6" strokeLinecap="round" />
          <path d="M 55 42 L 75 35" stroke={contrastColor} strokeWidth="6" strokeLinecap="round" />
          {/* Eyes */}
          <circle cx="35" cy="50" r="5" fill={contrastColor} />
          <circle cx="65" cy="50" r="5" fill={contrastColor} />
          {/* Straight mouth */}
          <line x1="35" y1="75" x2="65" y2="75" stroke={contrastColor} strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    }

    return null;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
      {color && (
        <div 
          className="rounded-full shadow-lg relative z-10"
          style={{
            width: '92%',
            height: '92%',
            backgroundColor: isBlack ? '#0f172a' : '#ffffff',
            background: isBlack 
              ? 'radial-gradient(circle at 35% 35%, #475569 0%, #0f172a 80%)' 
              : 'radial-gradient(circle at 35% 35%, #ffffff 0%, #cbd5e1 100%)',
            boxShadow: isBlack 
              ? '2px 2px 4px rgba(15, 23, 42, 0.5)' 
              : '1px 1px 3px rgba(148, 163, 184, 0.5), inset 0 0 0 1px rgba(203, 213, 225, 1)'
          }}
        >
          {/* Stone Status Graphic */}
          {renderFaceGraphic()}

          {/* Last Move Marker (Subtle dot if no other marker or face) */}
          {isLastMove && !markerType && !face && (
            <div 
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 ${isBlack ? 'border-white' : 'border-black'}`} 
            />
          )}
        </div>
      )}
      
      {/* Semantic Marker (Triangle, etc) */}
      {renderMarker()}

      {/* Text Label */}
      {label && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <span className="text-[10px] font-bold text-white bg-slate-800/80 px-1 rounded shadow-sm leading-none backdrop-blur-sm -mt-[1px]">
                {label}
            </span>
        </div>
      )}
    </div>
  );
};

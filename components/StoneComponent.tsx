
import React from 'react';
import { StoneColor, MarkerType } from '../types';

interface StoneProps {
  color?: StoneColor; // color is optional now (marker can be on empty spot)
  isLastMove?: boolean;
  markerType?: MarkerType;
  label?: string;
}

export const StoneComponent: React.FC<StoneProps> = ({ color, isLastMove, markerType, label }) => {
  
  // Helper to render marker shape
  const renderMarker = () => {
    if (!markerType) return null;

    // Contrast color: If stone is black, marker is white. If stone is white, marker is black. 
    // If no stone (empty), marker is Red/Blue for visibility.
    const markerColor = color === 'BLACK' ? '#ffffff' : color === 'WHITE' ? '#0f172a' : '#ef4444'; 
    
    // Uses inset-0 + m-auto for robust centering instead of transforms
    const commonProps = {
      stroke: markerColor,
      strokeWidth: "2.5",
      fill: "none",
      className: "w-[60%] h-[60%] absolute inset-0 m-auto z-20 pointer-events-none"
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

  const isBlack = color === 'BLACK';

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
          {/* Last Move Marker (Subtle dot if no other marker) */}
          {isLastMove && !markerType && (
            <div 
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 ${isBlack ? 'border-white' : 'border-black'}`} 
            />
          )}
        </div>
      )}
      
      {/* Semantic Marker (Triangle, etc) - Renders directly in the center */}
      {renderMarker()}

      {/* Text Label (e.g. Points Score) - Rendered centered, small font */}
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

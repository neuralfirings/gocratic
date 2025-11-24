
import React from 'react';
import { StoneColor, MarkerType } from '../types';

interface StoneProps {
  color?: StoneColor; // color is optional now (marker can be on empty spot)
  isLastMove?: boolean;
  markerType?: MarkerType;
}

export const StoneComponent: React.FC<StoneProps> = ({ color, isLastMove, markerType }) => {
  
  // Helper to render marker shape
  const renderMarker = () => {
    if (!markerType) return null;

    // Contrast color: If stone is black, marker is white. If stone is white, marker is black. 
    // If no stone (empty), marker is Red/Blue for visibility.
    const markerColor = color === 'BLACK' ? '#ffffff' : color === 'WHITE' ? '#0f172a' : '#ef4444'; // Red for empty spots
    
    const commonProps = {
      stroke: markerColor,
      strokeWidth: "2.5",
      fill: "none",
      className: "w-[60%] h-[60%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
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

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
      {color && (
        <div 
          className={`
            w-[90%] h-[90%] rounded-full shadow-lg relative
            ${color === 'BLACK' 
              ? 'bg-slate-900 shadow-slate-900/50' 
              : 'bg-slate-100 border border-slate-300 shadow-slate-400/50'}
          `}
          style={{
            background: color === 'BLACK' 
              ? 'radial-gradient(circle at 30% 30%, #475569, #0f172a)' 
              : 'radial-gradient(circle at 30% 30%, #ffffff, #cbd5e1)'
          }}
        >
          {/* Last Move Marker (Subtle dot if no other marker) */}
          {isLastMove && !markerType && (
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 ${color === 'BLACK' ? 'border-white' : 'border-black'}`} />
          )}
        </div>
      )}
      
      {/* Semantic Marker (Triangle, etc) - Renders on top of stone or empty space */}
      {markerType && (
        <div className="absolute inset-0 z-20">
          {renderMarker()}
        </div>
      )}
    </div>
  );
};


import React from 'react';
import { BoardState, Coordinate, Marker, StoneColor } from '../types';
import { StoneComponent } from './StoneComponent';
import { getColLabel, getRowLabel } from '../services/gtpUtils';

interface GoBoardProps {
  board: BoardState;
  onPlay: (c: Coordinate) => void;
  interactive: boolean;
  markers?: Marker[];
  ghostColor?: StoneColor | 'ERASER';
}

export const GoBoard: React.FC<GoBoardProps> = ({ 
  board, 
  onPlay, 
  interactive, 
  markers = [], 
  ghostColor = 'BLACK' 
}) => {
  const { size, stones, lastMove } = board;
  
  // Calculate star points (hoshi)
  const starPoints = size === 9 ? [2, 6, 4] : size === 13 ? [3, 9, 6] : [3, 9, 15];
  // Helper to check if a point is a star point
  const isStarPoint = (x: number, y: number) => {
    if (size === 9) return (x === 2 || x === 6 || x === 4) && (y === 2 || y === 6 || y === 4);
    if (size === 13) return (x === 3 || x === 9 || x === 6) && (y === 3 || y === 9 || y === 6);
    return false; // Simplified for 19x19
  };

  // Determine hover styling based on ghost color
  const getHoverClass = () => {
      if (!interactive) return '';
      if (ghostColor === 'WHITE') return 'hover:bg-white/60'; // Lighter, ghostly white
      if (ghostColor === 'BLACK') return 'hover:bg-slate-900/40'; // Semi-transparent black
      if (ghostColor === 'ERASER') return 'hover:bg-red-500/30'; // Red tint for removal
      return 'hover:bg-slate-900/10'; // Fallback
  };

  const hoverClass = getHoverClass();

  return (
    <div className="grid grid-cols-[24px_1fr] grid-rows-[24px_1fr] w-full mx-auto select-none">
      
      {/* Top Left Corner (Empty) */}
      <div />

      {/* Top Labels */}
      <div className="flex items-end justify-between px-4 pb-1">
           {Array.from({ length: size }).map((_, i) => (
             <div key={`top-${i}`} className="flex-1 text-center text-xs font-bold text-slate-500">
               {getColLabel(i)}
             </div>
           ))}
      </div>

      {/* Left Labels */}
      <div className="flex flex-col justify-between py-4 pr-1">
           {Array.from({ length: size }).map((_, i) => (
             <div key={`left-${i}`} className="flex-1 flex items-center justify-center text-xs font-bold text-slate-500">
               {getRowLabel(i, size)}
             </div>
           ))}
      </div>

      {/* The Board */}
      <div className="relative p-4 rounded-lg bg-[#e3c078] shadow-2xl wood-texture aspect-square max-w-[600px]">
        <div className="relative w-full h-full">
          
          {/* SVG Grid Layer - Background */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-0" 
            viewBox={`0 0 ${size} ${size}`}
          >
            {/* Horizontal Lines */}
            {Array.from({length: size}).map((_, i) => (
              <line 
                key={`h-${i}`} 
                x1="0.5" y1={i + 0.5} 
                x2={size - 0.5} y2={i + 0.5} 
                stroke="#0f172a" 
                strokeWidth="0.05" 
              />
            ))}
            {/* Vertical Lines */}
            {Array.from({length: size}).map((_, i) => (
              <line 
                key={`v-${i}`} 
                x1={i + 0.5} y1="0.5" 
                x2={i + 0.5} y2={size - 0.5} 
                stroke="#0f172a" 
                strokeWidth="0.05" 
              />
            ))}
            
            {/* Star Points */}
            {Array.from({length: size * size}).map((_, i) => {
               const x = i % size;
               const y = Math.floor(i / size);
               if (isStarPoint(x, y)) {
                 return <circle key={`star-${i}`} cx={x + 0.5} cy={y + 0.5} r="0.1" fill="#0f172a" />;
               }
               return null;
            })}
          </svg>

          {/* Interactive Layer (Stones and Click Targets) */}
          <div 
            className="relative z-10 grid w-full h-full"
            style={{ 
                gridTemplateColumns: `repeat(${size}, 1fr)`,
                gridTemplateRows: `repeat(${size}, 1fr)` 
            }}
          >
            {Array.from({ length: size * size }).map((_, i) => {
              const x = i % size;
              const y = Math.floor(i / size);
              const key = `${x},${y}`;
              const stoneColor = stones.get(key);
              const isLast = lastMove?.x === x && lastMove?.y === y;
              
              // Check for marker at this coordinate
              const marker = markers.find(m => m.x === x && m.y === y);

              return (
                <div 
                  key={key}
                  onClick={() => interactive && onPlay({ x, y })}
                  className={`
                    relative flex items-center justify-center cursor-pointer
                    rounded-full transition-colors duration-200
                    ${hoverClass}
                  `}
                >
                  {/* Render Stone if exists, or just marker if empty spot has marker */}
                  {(stoneColor || marker) ? (
                    <StoneComponent 
                      color={stoneColor} 
                      isLastMove={isLast} 
                      markerType={marker?.type}
                    />
                  ) : (
                     /* Invisible click target that highlights on hover */
                     <div className="w-1/2 h-1/2 rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

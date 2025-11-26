
import React, { useState } from 'react';
import { BoardState, Coordinate, Marker, StoneColor } from '../types';
import { StoneComponent } from './StoneComponent';
import { getColLabel, getRowLabel, toGtpCoordinate } from '../services/gtpUtils';

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
  const [hoverCoord, setHoverCoord] = useState<Coordinate | null>(null);
  
  // Calculate star points (hoshi)
  const getStarPoints = () => {
      if (size === 9) return [[2,2], [6,2], [4,4], [2,6], [6,6]];
      if (size === 13) return [[3,3], [9,3], [6,6], [3,9], [9,9]];
      if (size === 19) return [[3,3], [9,3], [15,3], [3,9], [9,9], [15,9], [3,15], [9,15], [15,15]];
      return [];
  };
  const starPoints = getStarPoints();

  const handleMouseEnter = (x: number, y: number) => {
      if (interactive) {
          setHoverCoord({ x, y });
      }
  };

  const handleMouseLeave = () => {
      setHoverCoord(null);
  };

  const getLabel = (c: Coordinate) => toGtpCoordinate(c, size);

  return (
    <div className="flex flex-col items-center">
        <div className="relative inline-block bg-[#F2B06D] rounded-[4px] shadow-xl select-none p-1 sm:p-2 lg:p-3">
        {/* Hover Coordinate Indicator */}
        <div className="absolute -top-8 left-0 right-0 h-6 flex justify-center items-center pointer-events-none">
             <span className={`
                text-sm font-bold text-slate-600 bg-white/90 px-3 py-0.5 rounded-full shadow-sm transition-opacity duration-200
                ${hoverCoord ? 'opacity-100' : 'opacity-0'}
             `}>
                 {hoverCoord ? getLabel(hoverCoord) : '...'}
             </span>
        </div>

        <div className="grid grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
            {/* Top Labels */}
            <div className="col-start-2 flex pb-1">
                {Array.from({ length: size }).map((_, i) => (
                    <div key={`col-${i}`} className="flex-1 flex justify-center text-[10px] sm:text-xs font-semibold text-[#5E4024]">
                        {getColLabel(i)}
                    </div>
                ))}
            </div>

            {/* Left Labels */}
            <div className="row-start-2 flex flex-col pr-1">
                {Array.from({ length: size }).map((_, i) => (
                    <div key={`row-${i}`} className="flex-1 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-[#5E4024] w-4 sm:w-6">
                        {getRowLabel(i, size)}
                    </div>
                ))}
            </div>

            {/* Board Grid */}
            <div className="relative aspect-square w-[85vw] max-w-[600px] bg-[#E8C086]"
                onMouseLeave={handleMouseLeave}
            >
                {/* Lines Layer */}
                <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none z-0" 
                    viewBox={`0 0 ${size} ${size}`}
                >
                    {/* Background fill to ensure no gaps */}
                    <rect x="0" y="0" width={size} height={size} fill="#E3B574" />
                    
                    {/* Grid Lines */}
                    {Array.from({length: size}).map((_, i) => (
                    <g key={`lines-${i}`}>
                        <line 
                            x1="0.5" y1={i + 0.5} 
                            x2={size - 0.5} y2={i + 0.5} 
                            stroke="#5E4024" 
                            strokeWidth="0.04" 
                        />
                        <line 
                            x1={i + 0.5} y1="0.5" 
                            x2={i + 0.5} y2={size - 0.5} 
                            stroke="#5E4024" 
                            strokeWidth="0.04" 
                        />
                    </g>
                    ))}
                    
                    {/* Star Points */}
                    {starPoints.map(([x, y], idx) => (
                        <circle key={`star-${idx}`} cx={x + 0.5} cy={y + 0.5} r="0.08" fill="#5E4024" />
                    ))}
                </svg>

                {/* Interaction Layer */}
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
                        const marker = markers.find(m => m.x === x && m.y === y);
                        const isHovered = hoverCoord?.x === x && hoverCoord?.y === y;

                        return (
                            <div 
                                key={key}
                                onMouseEnter={() => handleMouseEnter(x, y)}
                                onClick={() => interactive && onPlay({ x, y })}
                                className="relative flex items-center justify-center cursor-pointer"
                            >
                                {/* Ghost Stone */}
                                {interactive && isHovered && !stoneColor && ghostColor !== 'ERASER' && (
                                    <div className={`
                                        w-[80%] h-[80%] rounded-full opacity-40
                                        ${ghostColor === 'BLACK' ? 'bg-black' : 'bg-white'}
                                    `}/>
                                )}
                                
                                {/* Eraser Ghost */}
                                {interactive && isHovered && stoneColor && ghostColor === 'ERASER' && (
                                    <div className="absolute inset-0 flex items-center justify-center z-30">
                                         <div className="w-[80%] h-[80%] rounded-full bg-red-500/40 border-2 border-red-500/60" />
                                    </div>
                                )}

                                {/* Actual Stone / Marker */}
                                {(stoneColor || marker) && (
                                    <div className="absolute inset-0 w-full h-full p-[2%]">
                                        <StoneComponent 
                                            color={stoneColor} 
                                            isLastMove={isLast} 
                                            markerType={marker?.type}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
        </div>
        
        {/* Mobile/Compact Coordinate Footer */}
        <div className="mt-2 text-xs text-slate-400 font-mono h-4">
             {hoverCoord ? `Cursor: ${getLabel(hoverCoord)}` : ''}
        </div>
    </div>
  );
};

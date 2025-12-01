import React, { useState, useRef, useEffect } from 'react';
import { BoardState, Coordinate, Marker, StoneColor } from '../types';
import { StoneComponent } from './StoneComponent';
import { getColLabel, getRowLabel, toGtpCoordinate } from '../services/gtpUtils';

interface GoBoardProps {
  board: BoardState;
  onPlay: (c: Coordinate) => void;
  interactive: boolean;
  markers?: Marker[];
  ghostColor?: StoneColor | 'ERASER';
  isWaitingForCorrection?: boolean;
  onContinue?: () => void;
}

export const GoBoard: React.FC<GoBoardProps> = ({ 
  board, 
  onPlay, 
  interactive, 
  markers = [], 
  ghostColor = 'BLACK',
  isWaitingForCorrection = false,
  onContinue
}) => {
  const { size, stones, lastMove } = board;
  const [hoverCoord, setHoverCoord] = useState<Coordinate | null>(null);
  
  // The main wrapper ref
  const boardRef = useRef<HTMLDivElement>(null);
  
  // --- DEBUG STATE ---
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  // Visual debug markers removed for production cleanliness
  
  // Ref to track pointer down location for distinguishing Taps from Scrolls
  const pointerDownPos = useRef<{ x: number, y: number } | null>(null);
  const activePointerId = useRef<number | null>(null);
  
  const addLog = (msg: string) => {
      // Keep logging but reduce noise
      // const time = new Date().toISOString().split('T')[1].slice(0, 8); 
      // setDebugLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 30));
  };

  useEffect(() => {
    // console.log(`Board Updated. Stones: ${stones.size}`);
  }, [stones, lastMove]);

  // Calculate star points (hoshi)
  const getStarPoints = () => {
      if (size === 9) return [[2,2], [6,2], [4,4], [2,6], [6,6]];
      if (size === 13) return [[3,3], [9,3], [6,6], [3,9], [9,9]];
      if (size === 19) return [[3,3], [9,3], [15,3], [3,9], [9,9], [15,9], [3,15], [9,15], [15,15]];
      return [];
  };
  const starPoints = getStarPoints();

  // --- UNIFIED GRID EVENT HANDLERS (ON WRAPPER) ---
  
  const getGridCoord = (e: React.PointerEvent<HTMLDivElement> | PointerEvent): Coordinate | null => {
      if (!boardRef.current) return null;
      const rect = boardRef.current.getBoundingClientRect();
      
      // Use clientX/Y directly
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;

      const x = Math.floor((relativeX / rect.width) * size);
      const y = Math.floor((relativeY / rect.height) * size);
      
      if (x >= 0 && x < size && y >= 0 && y < size) {
          return { x, y };
      }
      return null;
  };

  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      
      const coord = getGridCoord(e);
      if (!coord) return;

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
        activePointerId.current = e.pointerId;
      } catch (err) {
          console.error(err);
      }

      pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      // Hover logic - only for mouse/pen, not touch
      if (e.pointerType === 'touch') return;
      
      if (interactive) {
          const coord = getGridCoord(e);
          setHoverCoord(coord);
      }
  };

  const handleBoardPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      
      try {
        if (activePointerId.current) {
            e.currentTarget.releasePointerCapture(activePointerId.current);
        }
      } catch (err) { /* ignore */ }
      
      activePointerId.current = null;

      if (!pointerDownPos.current) return;

      // Calculate distance moved
      const dx = Math.abs(e.clientX - pointerDownPos.current.x);
      const dy = Math.abs(e.clientY - pointerDownPos.current.y);
      const dist = Math.sqrt(dx*dx + dy*dy);

      pointerDownPos.current = null;

      // Tap detection threshold (increased slightly for fat fingers)
      if (dist < 40) {
          const coord = getGridCoord(e);
          if (coord) {
              if (navigator.vibrate) navigator.vibrate(10);
              onPlay(coord);
              setHoverCoord(null);
          }
      }
  };

  const handleBoardPointerLeave = () => {
      setHoverCoord(null);
  };
  
  const handleBoardPointerCancel = () => {
      pointerDownPos.current = null;
      activePointerId.current = null;
      setHoverCoord(null);
  };

  const getLabel = (c: Coordinate) => toGtpCoordinate(c, size);

  // Pre-calculate cells to render (Purely based on Loop 0..N)
  const renderCells = () => {
    return Array.from({ length: size * size }).map((_, i) => {
        const x = i % size;
        const y = Math.floor(i / size);
        const key = `${x},${y}`;
        const stoneColor = stones.get(key);
        const isLast = lastMove?.x === x && lastMove?.y === y;
        const marker = markers.find(m => m.x === x && m.y === y);
        const isHovered = hoverCoord?.x === x && hoverCoord?.y === y;

        // Calculate Position %
        const style = {
            left: `${(x / size) * 100}%`,
            top: `${(y / size) * 100}%`,
            width: `${100 / size}%`,
            height: `${100 / size}%`
        };

        if (!stoneColor && !marker && !isHovered) return null;

        return (
            <div 
                key={key}
                className="absolute flex items-center justify-center pointer-events-none"
                style={style}
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
                            label={marker?.label}
                        />
                    </div>
                )}
            </div>
        );
    });
  };

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
            <div className="col-start-2 flex pb-1 touch-none">
                {Array.from({ length: size }).map((_, i) => (
                    <div 
                        key={`col-${i}`} 
                        className="flex-1 flex justify-center text-[10px] sm:text-xs font-semibold text-[#5E4024] cursor-pointer"
                    >
                        {getColLabel(i)}
                    </div>
                ))}
            </div>

            {/* Left Labels */}
            <div className="row-start-2 flex flex-col pr-1 touch-none">
                {Array.from({ length: size }).map((_, i) => (
                    <div 
                        key={`row-${i}`} 
                        className="flex-1 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-[#5E4024] w-4 sm:w-6 cursor-pointer"
                    >
                        {getRowLabel(i, size)}
                    </div>
                ))}
            </div>

            {/* Board Grid Wrapper - NOW THE MAIN INTERACTION TARGET */}
            <div 
                ref={boardRef}
                className="relative aspect-square w-[85vw] max-w-[600px] bg-[#E8C086] cursor-pointer touch-none"
                style={{ touchAction: 'none' }} // Critical for mobile to prevent scroll
                onPointerDown={handleBoardPointerDown}
                onPointerUp={handleBoardPointerUp}
                onPointerMove={handleBoardPointerMove}
                onPointerLeave={handleBoardPointerLeave}
                onPointerCancel={handleBoardPointerCancel}
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* Lines Layer - purely visual, ignore events, z-0 */}
                <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none z-0" 
                    viewBox={`0 0 ${size} ${size}`}
                >
                    {/* Background fill */}
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

                {/* STONES LAYER - Z-30 - ABSOLUTE POSITIONING */}
                <div className="absolute inset-0 z-30 pointer-events-none">
                    {renderCells()}
                </div>

                {/* Darkening Overlay (No Blur) */}
                {isWaitingForCorrection && (
                    <div className="absolute inset-0 z-40 bg-black/20 pointer-events-auto" />
                )}

            </div>
        </div>
        </div>
        
        {/* Mobile/Compact Coordinate Footer */}
        {/* <div className="mt-2 text-xs text-slate-400 font-mono h-4">
             {hoverCoord ? `Cursor: ${getLabel(hoverCoord)}` : ''}
        </div>  */}

    </div>
  );
};

import React, { useState, useRef, useMemo } from 'react';
import { BoardState, Coordinate, Marker, StoneColor, InfluenceMap } from '../types';
import { StoneComponent } from './StoneComponent';
import { getColLabel, getRowLabel } from '../services/gtpUtils';

interface GoBoardProps {
  board: BoardState;
  onPlay: (c: Coordinate) => void;
  interactive: boolean;
  markers?: Marker[];
  ghostColor?: StoneColor | 'ERASER';
  isWaitingForCorrection?: boolean;
  onContinue?: () => void;
  highlightedMoveIndex?: number | null;
  influenceMap?: InfluenceMap | null;
}

export const GoBoard: React.FC<GoBoardProps> = ({ 
  board, 
  onPlay, 
  interactive, 
  markers = [], 
  ghostColor = 'BLACK',
  isWaitingForCorrection = false,
  highlightedMoveIndex = null,
  influenceMap = null
}) => {
  const { size, stones, lastMove, history } = board;
  const [hoverCoord, setHoverCoord] = useState<Coordinate | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  
  const pointerDownPos = useRef<{ x: number, y: number } | null>(null);
  const activePointerId = useRef<number | null>(null);
  
  const stoneMoveIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    history.forEach((h, index) => {
        const key = `${h.coordinate.x},${h.coordinate.y}`;
        if (board.stones.has(key) && board.stones.get(key) === h.color) {
             map.set(key, index + 1);
        }
    });
    return map;
  }, [stones, history, board]);

  const getStarPoints = () => {
      if (size === 9) return [[2,2], [6,2], [4,4], [2,6], [6,6]];
      if (size === 13) return [[3,3], [9,3], [6,6], [3,9], [9,9]];
      if (size === 19) return [[3,3], [9,3], [15,3], [3,9], [9,9], [15,9], [3,15], [9,15], [15,15]];
      return [];
  };
  const starPoints = getStarPoints();

  const getGridCoord = (e: React.PointerEvent<HTMLDivElement> | PointerEvent): Coordinate | null => {
      if (!boardRef.current) return null;
      const rect = boardRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      const x = Math.floor((relativeX / rect.width) * size);
      const y = Math.floor((relativeY / rect.height) * size);
      if (x >= 0 && x < size && y >= 0 && y < size) return { x, y };
      return null;
  };

  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const coord = getGridCoord(e);
      if (!coord) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
        activePointerId.current = e.pointerId;
      } catch (err) {}
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'touch') return;
      if (interactive) {
          const coord = getGridCoord(e);
          setHoverCoord(coord);
      }
  };

  const handleBoardPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      try { if (activePointerId.current) e.currentTarget.releasePointerCapture(activePointerId.current); } catch (err) {}
      activePointerId.current = null;
      if (!pointerDownPos.current) return;
      const dx = Math.abs(e.clientX - pointerDownPos.current.x);
      const dy = Math.abs(e.clientY - pointerDownPos.current.y);
      const dist = Math.sqrt(dx*dx + dy*dy);
      pointerDownPos.current = null;
      if (dist < 40) {
          const coord = getGridCoord(e);
          if (coord) {
              if (navigator.vibrate) navigator.vibrate(10);
              onPlay(coord);
              setHoverCoord(null);
          }
      }
  };

  const renderCells = () => {
    return Array.from({ length: size * size }).map((_, i) => {
        const x = i % size;
        const y = Math.floor(i / size);
        const key = `${x},${y}`;
        const stoneColor = stones.get(key);
        const isLast = lastMove?.x === x && lastMove?.y === y;
        const marker = markers.find(m => m.x === x && m.y === y);
        const isHovered = hoverCoord?.x === x && hoverCoord?.y === y;

        let opacity = 1;
        let isHighlightedMove = false;
        
        if (highlightedMoveIndex !== null && stoneColor) {
            const moveIdx = stoneMoveIndexMap.get(key);
            if (moveIdx !== undefined) {
                if (moveIdx > highlightedMoveIndex) opacity = 0.3;
                else if (moveIdx === highlightedMoveIndex) isHighlightedMove = true;
            }
        }

        const style = {
            left: `${(x / size) * 100}%`,
            top: `${(y / size) * 100}%`,
            width: `${100 / size}%`,
            height: `${100 / size}%`,
            opacity: opacity,
            transition: 'opacity 0.3s ease'
        };

        return (
            <div key={key} className="absolute flex items-center justify-center pointer-events-none" style={style}>
                {interactive && isHovered && !stoneColor && ghostColor !== 'ERASER' && (
                    <div className={`w-[80%] h-[80%] rounded-full opacity-40 ${ghostColor === 'BLACK' ? 'bg-black' : 'bg-white'}`}/>
                )}
                {isHighlightedMove && (
                    <div className="absolute inset-0 z-0 flex items-center justify-center animate-pulse">
                         <div className="w-full h-full rounded-full border-4 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)]" />
                    </div>
                )}
                {(stoneColor || marker) && (
                    <div className="absolute inset-0 w-full h-full p-[2%]">
                        <StoneComponent color={stoneColor} isLastMove={isLast} markerType={marker?.type} label={marker?.label} markerColor={marker?.color} />
                    </div>
                )}
            </div>
        );
    });
  };

  const renderInfluence = () => {
    if (!influenceMap) return null;
    return Array.from({ length: size * size }).map((_, i) => {
        const x = i % size;
        const y = Math.floor(i / size);
        const key = `${x},${y}`;
        const value = influenceMap[key] || 0;
        if (Math.abs(value) < 0.1) return null;

        const isBlack = value > 0;
        const opacity = Math.abs(value) * 0.4;
        
        return (
            <div 
                key={`inf-${key}`}
                className="absolute pointer-events-none transition-all duration-500"
                style={{
                    left: `${(x / size) * 100}%`,
                    top: `${(y / size) * 100}%`,
                    width: `${100 / size}%`,
                    height: `${100 / size}%`,
                    backgroundColor: isBlack ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)',
                    opacity: opacity,
                    borderRadius: '0'
                }}
            />
        );
    });
  };

  return (
    <div className="flex flex-col items-center">
        <div className="relative inline-block bg-[#F2B06D] rounded-[4px] shadow-xl select-none p-1 sm:p-2 lg:p-3">
        <div className="grid grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
            <div className="col-start-2 flex pb-1 touch-none">
                {Array.from({ length: size }).map((_, i) => (
                    <div key={`col-${i}`} className="flex-1 flex justify-center text-[10px] sm:text-xs font-semibold text-[#5E4024]">{getColLabel(i)}</div>
                ))}
            </div>
            <div className="row-start-2 flex flex-col pr-1 touch-none">
                {Array.from({ length: size }).map((_, i) => (
                    <div key={`row-${i}`} className="flex-1 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-[#5E4024] w-4 sm:w-6">{getRowLabel(i, size)}</div>
                ))}
            </div>
            <div 
                ref={boardRef}
                className="relative aspect-square w-[85vw] max-w-[600px] bg-[#E8C086] cursor-pointer touch-none overflow-hidden"
                style={{ touchAction: 'none' }}
                onPointerDown={handleBoardPointerDown}
                onPointerUp={handleBoardPointerUp}
                onPointerMove={handleBoardPointerMove}
                onPointerLeave={() => setHoverCoord(null)}
                onPointerCancel={() => setHoverCoord(null)}
                onContextMenu={(e) => e.preventDefault()}
            >
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox={`0 0 ${size} ${size}`}>
                    <rect x="0" y="0" width={size} height={size} fill="#E3B574" />
                    {Array.from({length: size}).map((_, i) => (
                    <g key={`lines-${i}`}>
                        <line x1="0.5" y1={i + 0.5} x2={size - 0.5} y2={i + 0.5} stroke="#5E4024" strokeWidth="0.04" />
                        <line x1={i + 0.5} y1="0.5" x2={i + 0.5} y2={size - 0.5} stroke="#5E4024" strokeWidth="0.04" />
                    </g>
                    ))}
                    {starPoints.map(([x, y], idx) => (
                        <circle key={`star-${idx}`} cx={x + 0.5} cy={y + 0.5} r="0.08" fill="#5E4024" />
                    ))}
                </svg>

                <div className="absolute inset-0 z-10">{renderInfluence()}</div>
                <div className="absolute inset-0 z-30 pointer-events-none">{renderCells()}</div>
                {isWaitingForCorrection && (
                    <div className="absolute inset-0 z-40 bg-black/20 pointer-events-auto" />
                )}
            </div>
        </div>
        </div>
    </div>
  );
};

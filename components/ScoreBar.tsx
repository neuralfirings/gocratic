
import React from 'react';
import { BoardState, GameResult } from '../types';

interface ScoreBarProps {
    board: BoardState;
    gameResult: GameResult | null;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({ board, gameResult }) => {
    return (
        <div className="w-full text-sm items-center justify-between flex"> 
            <div className="text-sm font-bold text-slate-500">
                    {board.gameOver ? (
                    <span>
                        {gameResult?.winner === 'BLACK' ? 'Black wins ' : 'White wins '}
                        by {gameResult.score.diff} points!
                    </span>
                ) : (
                    <span>
                        {board.turn === 'BLACK' ? "Your Turn" : "AI Turn"}
                    </span>
                )}
            </div>
            <div className="gap-4 flex">
                <div className="font-bold text-slate-500">
                    Black captured {board.captures.BLACK} pieces
                </div>

                <div className="font-bold text-slate-500">
                    White captured {board.captures.WHITE} pieces
                </div>
            </div>

        </div>
    );
};

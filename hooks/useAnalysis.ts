
import { useState, useEffect } from 'react';
import { BoardState, AnalysisMove, GamePhase } from '../types';
import { fetchGnuGoHints } from '../services/gnugoService';

export const useAnalysis = (board: BoardState, gamePhase: GamePhase) => {
    const [analysisData, setAnalysisData] = useState<AnalysisMove[]>([]);

    useEffect(() => {
        let ignore = false;

        // Clear analysis on new moves, game over, or if we enter SETUP mode
        if (board.gameOver || gamePhase === 'SETUP') {
            setAnalysisData([]);
            return;
        }

        const fetchHints = async () => {
            const hints = await fetchGnuGoHints(board);
            if (!ignore) {
                setAnalysisData(hints);
            }
        };

        fetchHints();

        return () => {
            ignore = true;
        };
    }, [board.history.length, board.gameOver, board.turn, board, gamePhase]);

    return { analysisData, setAnalysisData };
};

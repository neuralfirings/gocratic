
import { useState, useEffect } from 'react';
import { BoardState, AnalysisMove } from '../types';
import { fetchGnuGoHints } from '../services/gnugoService';

export const useAnalysis = (board: BoardState) => {
    const [analysisData, setAnalysisData] = useState<AnalysisMove[]>([]);

    useEffect(() => {
        let ignore = false;

        // Clear analysis on new moves or game over
        // We do this eagerly to ensure UI doesn't show stale hints while fetching
        if (board.gameOver) {
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
    }, [board.history.length, board.gameOver, board.turn, board]);

    return { analysisData, setAnalysisData };
};

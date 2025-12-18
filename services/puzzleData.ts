
import { Puzzle } from '../types';

export const BEGINNER_PUZZLES: Puzzle[] = [
  {
    id: 'atari-1',
    title: 'Atari Escape',
    description: 'Black is in danger! One of your stones is down to its last liberty. Can you save it?',
    category: 'Capture',
    difficulty: 'Beginner',
    initialStones: [
      { x: 3, y: 3, color: 'BLACK' },
      { x: 3, y: 2, color: 'WHITE' },
      { x: 2, y: 3, color: 'WHITE' },
      { x: 4, y: 3, color: 'WHITE' },
    ],
    solutions: [{ x: 3, y: 4 }],
    failureMessages: {
      'default': "That move doesn't increase your liberties! Look for the empty spot next to your stone."
    }
  },
  {
    id: 'capture-1',
    title: 'First Capture',
    description: 'The white stone is surrounded. Can you find the final point to capture it?',
    category: 'Capture',
    difficulty: 'Beginner',
    initialStones: [
      { x: 5, y: 5, color: 'WHITE' },
      { x: 5, y: 4, color: 'BLACK' },
      { x: 4, y: 5, color: 'BLACK' },
      { x: 6, y: 5, color: 'BLACK' },
    ],
    solutions: [{ x: 5, y: 6 }],
    failureMessages: {
      'default': "Almost! Look at where the white stone still has a line connecting to an empty spot."
    }
  },
  {
    id: 'eye-1',
    title: 'Make an Eye',
    description: 'Protect your group by making a safe home (an eye) at the edge of the board.',
    category: 'Life & Death',
    difficulty: 'Beginner',
    initialStones: [
      { x: 0, y: 1, color: 'BLACK' },
      { x: 1, y: 1, color: 'BLACK' },
      { x: 2, y: 1, color: 'BLACK' },
      { x: 2, y: 0, color: 'BLACK' },
      { x: 1, y: 2, color: 'WHITE' },
      { x: 0, y: 2, color: 'WHITE' },
    ],
    solutions: [{ x: 1, y: 0 }],
    failureMessages: {
      'default': "Try to close the gap to create a space White cannot enter!"
    }
  }
];

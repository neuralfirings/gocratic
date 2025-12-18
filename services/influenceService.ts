
import { BoardState, InfluenceMap, Coordinate } from '../types';

/**
 * Simplified Influence Calculation:
 * For each stone, it radiates "influence" that decays with distance.
 * Black = positive, White = negative.
 */
export const calculateInfluence = (board: BoardState): InfluenceMap => {
  const map: InfluenceMap = {};
  const { size, stones } = board;

  // Initialize
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      map[`${x},${y}`] = 0;
    }
  }

  // Radiate from each stone
  stones.forEach((color, key) => {
    const [sx, sy] = key.split(',').map(Number);
    const weight = color === 'BLACK' ? 1 : -1;

    // Influence radiates up to 4 points away
    const radius = 4;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = sx + dx;
        const ty = sy + dy;
        if (tx >= 0 && tx < size && ty >= 0 && ty < size) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance === 0) {
             map[`${tx},${ty}`] += weight * 2; // Strongest at stone
          } else if (distance <= radius) {
             // Linear decay
             const factor = (radius - distance) / radius;
             map[`${tx},${ty}`] += weight * factor;
          }
        }
      }
    }
  });

  // Clamp values between -1 and 1
  Object.keys(map).forEach(key => {
    map[key] = Math.max(-1, Math.min(1, map[key]));
  });

  return map;
};

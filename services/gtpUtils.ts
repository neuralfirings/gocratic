
import { Coordinate } from '../types';

export const COLS = "ABCDEFGHJKLMNOPQRSTUVWXYZ"; // Skips 'I'

// Convert Board Coordinate (0,0 is Top-Left) to GTP (A19 is Top-Left)
export const toGtpCoordinate = (c: Coordinate, size: number): string => {
  if (c.x < 0 || c.y < 0) return "PASS";
  
  const col = COLS[c.x];
  const row = size - c.y; // SVG/Board y=0 is top, GTP y=1 is bottom
  return `${col}${row}`;
};

// Convert GTP (D4) to Board Coordinate
export const fromGtpCoordinate = (gtp: string, size: number): Coordinate | null => {
  if (!gtp || gtp.toLowerCase() === 'pass') return null;
  
  const colChar = gtp.charAt(0).toUpperCase();
  const rowNum = parseInt(gtp.substring(1), 10);
  
  const x = COLS.indexOf(colChar);
  const y = size - rowNum;
  
  if (x === -1 || isNaN(y)) return null;
  
  return { x, y };
};

export const getColLabel = (x: number): string => {
  return COLS[x] || '';
};

export const getRowLabel = (y: number, size: number): string => {
  return (size - y).toString();
};

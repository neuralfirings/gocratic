
import { Coordinate, DifficultyLevel } from '../types';
import { toGtpCoordinate, fromGtpCoordinate } from './gtpUtils';

// We inline the worker script to ensure we can load it from a blob.
// In a real env, this would import 'gnugo.js' which loads 'gnugo.wasm'
// Since we don't have the files locally, we try to fetch from a CDN.
const WORKER_SCRIPT = `
importScripts('https://unpkg.com/js-gnugo@1.0.0/gnugo.js');

let engine = null;

self.onmessage = function(e) {
  const { id, command, args } = e.data;
  
  if (command === 'init') {
    try {
      if (typeof gnugo !== 'undefined') {
          engine = gnugo();
          self.postMessage({ id, result: 'ready' });
      } else {
          throw new Error('GnuGo failed to load');
      }
    } catch(err) {
      self.postMessage({ id, error: err.message });
    }
  } else if (engine) {
    const fullCmd = command + ' ' + (args || []).join(' ');
    // engine.query is the standard js-gnugo interface
    const response = engine.query(fullCmd);
    self.postMessage({ id, result: response });
  }
};
`;

class GnugoService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, (val: any) => void>();
  private isReady = false;

  async init(size: number, level: DifficultyLevel): Promise<void> {
    if (this.worker) this.worker.terminate();

    // Create worker from Blob
    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));

    this.worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const resolver = this.pendingRequests.get(id);
      if (resolver) {
        if (error) {
            console.warn("GTP Worker Error:", error);
            // Don't reject, just resolve null/error state so app doesn't crash
            resolver(null);
        } else {
            resolver(result);
        }
        this.pendingRequests.delete(id);
      }
    };

    // Initialize engine
    await this.command('init');
    await this.command('boardsize', [size.toString()]);
    await this.command('clear_board');
    await this.command('level', [level.toString()]);
    
    this.isReady = true;
  }

  async play(color: 'BLACK' | 'WHITE', coord: Coordinate, size: number): Promise<void> {
    if (!this.isReady) return;
    const gtpCoord = toGtpCoordinate(coord, size);
    await this.command('play', [color, gtpCoord]);
  }

  async genMove(color: 'BLACK' | 'WHITE', size: number): Promise<Coordinate | null> {
    if (!this.isReady) return null;
    
    const result = await this.command('genmove', [color]);
    
    // Parse GTP response: "= C3" or "= PASS"
    if (result && typeof result === 'string') {
        const match = result.match(/=\s*([A-Za-z][0-9]+|PASS)/i);
        if (match) {
            const moveStr = match[1];
            if (moveStr.toUpperCase() === 'PASS') return null;
            return fromGtpCoordinate(moveStr, size);
        }
    }
    return null;
  }

  private command(cmd: string, args: string[] = []): Promise<any> {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substring(7);
      this.pendingRequests.set(id, resolve);
      this.worker?.postMessage({ id, command: cmd, args });
      
      // Timeout safety
      setTimeout(() => {
          if (this.pendingRequests.has(id)) {
              this.pendingRequests.delete(id);
              resolve(null);
          }
      }, 10000);
    });
  }
}

export const gnugo = new GnugoService();

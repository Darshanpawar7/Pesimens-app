// Stockfish WASM Web Worker
// Loads Stockfish via CDN and communicates via UCI protocol

let stockfish: Worker | null = null;

function initStockfish() {
  stockfish = new Worker(
    'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16.js'
  );
  stockfish.postMessage('uci');
  stockfish.postMessage('isready');
}

self.onmessage = (e: MessageEvent) => {
  const { type, fen, depth } = e.data;

  if (type === 'init') {
    initStockfish();
    return;
  }

  if (type === 'getMove' && stockfish) {
    let bestMove: string | null = null;

    stockfish.onmessage = (event: MessageEvent) => {
      const line: string = event.data;

      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        bestMove = parts[1] ?? null;
        if (bestMove && bestMove !== '(none)') {
          self.postMessage({ type: 'move', move: bestMove });
        } else {
          self.postMessage({ type: 'error', reason: 'no move' });
        }
      }
    };

    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage(`go depth ${depth}`);
    return;
  }

  if (type === 'terminate' && stockfish) {
    stockfish.terminate();
    stockfish = null;
    return;
  }
};

import React, { useState, useEffect, useRef } from 'react';
import { CHARACTERS } from '../constants';

// Simple heuristic AI
function getBestMove(squares: (string | null)[]): number {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  // 1. Win
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] === 'O' && squares[b] === 'O' && !squares[c]) return c;
    if (squares[a] === 'O' && squares[c] === 'O' && !squares[b]) return b;
    if (squares[b] === 'O' && squares[c] === 'O' && !squares[a]) return a;
  }

  // 2. Block
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] === 'X' && squares[b] === 'X' && !squares[c]) return c;
    if (squares[a] === 'X' && squares[c] === 'X' && !squares[b]) return b;
    if (squares[b] === 'X' && squares[c] === 'X' && !squares[a]) return a;
  }

  // 3. Center
  if (!squares[4]) return 4;

  // 4. Random
  const available = squares.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
  if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
  }
  
  return -1;
}

// Helper to match colors
function getTailwindColorHex(classes: string): string {
    if (classes.includes('blue')) return '#2563EB';
    if (classes.includes('purple')) return '#9333EA';
    if (classes.includes('emerald')) return '#059669';
    if (classes.includes('orange')) return '#EA580C';
    if (classes.includes('yellow')) return '#CA8A04';
    return '#4B5563';
}

export const TicTacToe: React.FC = () => {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Fake Cursor State
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false, charId: 'rich' });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const winner = calculateWinner(board);
  const isDraw = !winner && board.every(Boolean);

  const handleUserClick = (i: number) => {
    if (winner || board[i] || !xIsNext || isProcessing) return;
    
    const newBoard = [...board];
    newBoard[i] = 'X';
    setBoard(newBoard);
    setXIsNext(false);
  };

  // AI Turn Effect
  useEffect(() => {
    if (!xIsNext && !winner && !isDraw) {
        const timeout = setTimeout(() => {
            playComputerTurn();
        }, 500); // Small pause before cursor appears
        return () => clearTimeout(timeout);
    }
  }, [xIsNext, winner, isDraw]);

  const playComputerTurn = async () => {
    setIsProcessing(true);

    // 1. Pick Move
    const moveIndex = getBestMove(board);
    if (moveIndex === -1) {
        setIsProcessing(false);
        return;
    }

    // 2. Pick Random Character
    const chars = Object.values(CHARACTERS).filter(c => c.id !== 'system' && c.id !== 'kevin'); // Kevin is boring? Let's exclude system
    const randomChar = chars[Math.floor(Math.random() * chars.length)];
    
    // 3. Setup Cursor Start Position (Random edge)
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Start somewhere off-center
    const startX = Math.random() > 0.5 ? 20 : containerRect.width - 20;
    const startY = containerRect.height + 20;

    setCursor({ x: startX, y: startY, visible: true, charId: randomChar.id });

    // 4. Animate to Target
    await new Promise(r => setTimeout(r, 100)); // Render frame
    
    const targetBtn = buttonsRef.current[moveIndex];
    if (targetBtn) {
        const btnRect = targetBtn.getBoundingClientRect();
        // Calculate relative position inside container
        const targetX = (btnRect.left - containerRect.left) + (btnRect.width / 2);
        const targetY = (btnRect.top - containerRect.top) + (btnRect.height / 2);

        setCursor(prev => ({ ...prev, x: targetX, y: targetY }));
    }

    // 5. Wait for "Movement" and "Click"
    await new Promise(r => setTimeout(r, 800)); // Travel time
    
    // Execute Move
    const newBoard = [...board];
    newBoard[moveIndex] = 'O';
    setBoard(newBoard);
    setXIsNext(true);

    // 6. Cleanup
    await new Promise(r => setTimeout(r, 200)); // Click linger
    setCursor(prev => ({ ...prev, visible: false }));
    setIsProcessing(false);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    setIsProcessing(false);
    setCursor(c => ({...c, visible: false}));
  };

  const activeChar = CHARACTERS[cursor.charId];

  return (
    <div ref={containerRef} className="w-full h-full bg-[#F5F5F7] flex flex-col items-center justify-center p-6 select-none font-sans relative overflow-hidden">
      
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">Tic-Tac-Toe</h2>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-widest h-4">
            {winner ? (
                <span className="text-green-600 animate-pulse">Winner: {winner === 'X' ? 'You' : activeChar?.name || 'AI'}</span>
            ) : isDraw ? (
                <span className="text-orange-500">Draw Game</span>
            ) : (
                <span>{xIsNext ? 'Your Turn (X)' : `Waiting for ${activeChar?.name || 'Opponent'}...`}</span>
            )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 relative z-10">
        {board.map((square, i) => (
          <button
            key={i}
            ref={el => buttonsRef.current[i] = el}
            className={`w-16 h-16 rounded-xl text-3xl font-black flex items-center justify-center transition-all duration-200 
                ${!square && !winner && xIsNext ? 'hover:bg-gray-50 active:scale-95 cursor-pointer' : 'cursor-default'}
                ${square === 'X' ? 'bg-blue-50 text-blue-600' : square === 'O' ? 'bg-red-50 text-red-500' : 'bg-gray-100/50'}
            `}
            onClick={() => handleUserClick(i)}
            disabled={!!winner || !!square || !xIsNext || isProcessing}
          >
            {square}
          </button>
        ))}
      </div>

      <button
        onClick={resetGame}
        className="mt-8 px-6 py-2.5 bg-black text-white text-xs font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl z-20 relative"
      >
        NEW GAME
      </button>

      {/* Simulated Cursor Overlay */}
      {cursor.visible && activeChar && (
          <div 
            className="absolute z-50 pointer-events-none transition-all duration-700 ease-in-out"
            style={{ 
                left: 0, 
                top: 0,
                transform: `translate(${cursor.x}px, ${cursor.y}px)` 
            }}
          >
            <div className="relative">
                <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="drop-shadow-md"
                    style={{ color: getTailwindColorHex(activeChar.color) }}
                >
                    <path 
                        d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19177L17.9169 12.3673H5.65376Z" 
                        fill="currentColor" 
                        stroke="white" 
                        strokeWidth="1"
                    />
                </svg>
                <div 
                    className="ml-4 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm whitespace-nowrap absolute top-3"
                    style={{ backgroundColor: getTailwindColorHex(activeChar.color) }}
                >
                    {activeChar.name}
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

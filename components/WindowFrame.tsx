
import React, { useRef, useState, useEffect } from 'react';
import { WindowState } from '../types';

interface WindowFrameProps {
  windowState: WindowState;
  isActive: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onScale: (factor: number) => void;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ 
    windowState, 
    isActive, 
    onFocus, 
    onClose, 
    onMove,
    onScale,
    children 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const windowStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocus(); // Bring to front
    
    // Only drag from header
    const target = e.target as HTMLElement;
    if (target.closest('.window-content') || target.closest('.no-drag')) return;

    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    windowStart.current = { x: windowState.x, y: windowState.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      
      onMove(
          windowState.id, 
          Math.max(0, windowStart.current.x + dx), 
          Math.max(24, windowStart.current.y + dy) // Keep below header
      );
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, windowState.id, onMove]);

  if (!windowState.isOpen) return null;

  return (
    <div
      onMouseDown={() => onFocus()}
      className={`absolute flex flex-col rounded-xl overflow-hidden shadow-2xl transition-all duration-300 border
        ${isActive ? 'shadow-2xl border-gray-300 ring-1 ring-black/5' : 'shadow-lg border-gray-200 opacity-90 hover:opacity-100'}
      `}
      style={{
        left: windowState.x,
        top: windowState.y,
        width: windowState.width,
        height: windowState.height,
        zIndex: windowState.zIndex,
        backgroundColor: '#fff',
      }}
    >
      {/* Title Bar */}
      <div 
        onMouseDown={handleMouseDown}
        className={`h-9 flex items-center px-3 justify-between shrink-0 select-none cursor-default
            ${isActive ? 'bg-[#F1F3F5] text-gray-800' : 'bg-[#F8F9FA] text-gray-500'}
            border-b border-gray-200
        `}
      >
        <div className="flex gap-2 group">
            <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }} 
                className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 cursor-pointer shadow-sm flex items-center justify-center text-[8px] text-black/0 hover:text-black/50 transition-colors"
            >✕</button>
            <button 
                onClick={(e) => { e.stopPropagation(); onScale(1); }} 
                className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 shadow-sm flex items-center justify-center text-[8px] text-black/0 hover:text-black/50 transition-colors cursor-pointer"
                title="Reset Size (1x)"
            >-</button>
            <button 
                onClick={(e) => { e.stopPropagation(); onScale(2); }} 
                className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 shadow-sm flex items-center justify-center text-[8px] text-black/0 hover:text-black/50 transition-colors cursor-pointer"
                title="Double Size (2x)"
            >+</button>
        </div>
        <div className="text-xs font-semibold tracking-wide font-sans">{windowState.title}</div>
        <div className="w-12"></div> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden window-content bg-white">
        {children}
        {/* Click blocker for inactive windows to ensure focus happens first */}
        {!isActive && (
            <div className="absolute inset-0 bg-transparent z-50 cursor-default" onMouseDown={() => onFocus()}></div>
        )}
      </div>
    </div>
  );
};

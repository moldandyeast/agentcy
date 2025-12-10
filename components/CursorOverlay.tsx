
import React, { useEffect, useState, useRef } from 'react';
import { CHARACTERS } from '../constants';
import { CharacterId } from '../types';

interface CursorPos {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

interface CursorOverlayProps {
  typingCharacter: CharacterId | null;
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({ typingCharacter }) => {
  const [cursors, setCursors] = useState<Record<string, CursorPos>>({});
  const requestRef = useRef<number>(0);

  // Initialize random positions
  useEffect(() => {
    const initial: Record<string, CursorPos> = {};
    Object.keys(CHARACTERS).forEach(key => {
        if (key === 'system') return;
        initial[key] = {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            targetX: Math.random() * window.innerWidth,
            targetY: Math.random() * window.innerHeight
        };
    });
    setCursors(initial);
  }, []);

  // Animation Loop
  const animate = () => {
    setCursors(prev => {
      // Create a shallow copy to avoid mutating previous state directly
      const next: Record<string, CursorPos> = { ...prev };
      
      // Determine where the typing target is (Input Box)
      let targetBox = { x: window.innerWidth * 0.85, y: window.innerHeight * 0.9, w: 200, h: 50 };
      const inputEl = document.getElementById('chat-input-section');
      if (inputEl) {
          const rect = inputEl.getBoundingClientRect();
          targetBox = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      }

      Object.keys(next).forEach(key => {
        const existing = next[key];
        // Defensive check to ensure we have a valid object and satisfy TS
        if (!existing) return;

        const cursor = { ...existing };
        
        // If this character is typing, target the chat input area
        if (typingCharacter === key) {
            cursor.targetX = targetBox.x + (Math.random() * targetBox.w); 
            cursor.targetY = targetBox.y + (Math.random() * targetBox.h);
        } 
        // Otherwise, wander randomly (Brownian motion)
        else {
             // 1% chance to pick a new random target
            if (Math.random() < 0.01) {
                cursor.targetX = Math.random() * window.innerWidth;
                cursor.targetY = Math.random() * window.innerHeight;
            }
        }

        // Lerp towards target
        const speed = typingCharacter === key ? 0.15 : 0.02; // Move faster if typing
        cursor.x += (cursor.targetX - cursor.x) * speed;
        cursor.y += (cursor.targetY - cursor.y) * speed;
        
        next[key] = cursor;
      });
      
      return next;
    });
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [typingCharacter]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[50000] overflow-hidden">
      {Object.entries(cursors).map(([id, pos]) => {
        const cursor = pos as CursorPos;
        const char = CHARACTERS[id];
        if (!char) return null;

        return (
          <div
            key={id}
            className="absolute flex flex-col items-start transition-opacity duration-500"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
              opacity: 1
            }}
          >
            {/* Cursor SVG */}
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              className="drop-shadow-md"
              style={{ color: char.color.split(' ')[1]?.replace('text-', '') || '#000' }}
            >
              <path 
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19177L17.9169 12.3673H5.65376Z" 
                fill="currentColor" 
                stroke="white" 
                strokeWidth="1"
              />
            </svg>
            
            {/* Name Tag */}
            <div 
              className="ml-4 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
              style={{ backgroundColor: getTailwindColorHex(char.color) }}
            >
              {char.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Helper to extract hex from tailwind classes (simplified approx)
function getTailwindColorHex(classes: string): string {
    if (classes.includes('blue')) return '#2563EB';
    if (classes.includes('purple')) return '#9333EA';
    if (classes.includes('emerald')) return '#059669';
    if (classes.includes('orange')) return '#EA580C';
    if (classes.includes('yellow')) return '#CA8A04';
    return '#4B5563';
}

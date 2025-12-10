
import React, { useRef, useState } from 'react';
import { MoodboardItem } from '../types';
import { CHARACTERS } from '../constants';

interface MoodboardProps {
  items: MoodboardItem[];
  onItemMove: (id: string, x: number, y: number) => void;
}

export const Moodboard: React.FC<MoodboardProps> = ({ items, onItemMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent, id: string, currentX: number, currentY: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current) return;
    
    setDraggingId(id);
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const containerRect = containerRef.current.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dxPx = moveEvent.clientX - startMouseX;
      const dyPx = moveEvent.clientY - startMouseY;
      
      // Convert pixel delta to percentage delta
      const dxPercent = (dxPx / containerRect.width) * 100;
      const dyPercent = (dyPx / containerRect.height) * 100;
      
      const newX = Math.max(0, Math.min(100, currentX + dxPercent));
      const newY = Math.max(0, Math.min(100, currentY + dyPercent));
      
      onItemMove(id, newX, newY);
    };

    const handleMouseUp = () => {
      setDraggingId(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
        ref={containerRef}
        className="w-full h-full bg-[#F3F4F6] relative overflow-hidden select-none" 
        style={{ 
             backgroundImage: 'radial-gradient(#E5E7EB 1px, transparent 1px)', 
             backgroundSize: '24px 24px' 
         }}
    >
      
      {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center opacity-30">
                  <h3 className="text-2xl font-bold text-gray-400">Moodboard</h3>
                  <p className="text-gray-500">Waiting for assets...</p>
              </div>
          </div>
      )}

      {items.map((item) => {
        // Safe defaults
        const rotation = item.rotation || 0;
        const x = item.x || 50;
        const y = item.y || 50;
        
        const ownerName = item.owner && CHARACTERS[item.owner] ? CHARACTERS[item.owner].name : '';
        const isMockup = item.owner === 'marc' && item.type === 'image';
        const isDragging = draggingId === item.id;
        
        return (
            <div
            key={item.id}
            onMouseDown={(e) => handleMouseDown(e, item.id, x, y)}
            className={`absolute shadow-xl transition-shadow duration-200 cursor-move bg-white flex flex-col group`}
            style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${isDragging ? 1.05 : 1})`,
                maxWidth: item.type === 'image' ? '300px' : '220px',
                padding: item.type === 'image' ? '12px 12px 40px 12px' : '24px',
                borderRadius: '2px',
                zIndex: isDragging ? 100 : (item.type === 'image' ? 10 : 5),
                backgroundColor: item.type === 'note' ? '#FEF3C7' : '#FFFFFF',
                border: isMockup ? '2px solid #FCD34D' : 'none',
                boxShadow: isDragging ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
            >
            {item.type === 'image' && (
                <>
                    <img 
                        src={item.content} 
                        alt="Asset" 
                        className="w-full h-auto pointer-events-none bg-gray-100 block" 
                        draggable={false}
                    />
                    <div className="absolute bottom-3 left-0 right-0 text-center flex flex-col pointer-events-none">
                        <span className="font-handwriting text-gray-400 text-[10px] font-mono">fig_{item.id.slice(-4)}</span>
                        {ownerName && (
                            <span className={`text-[10px] font-bold ${isMockup ? 'text-yellow-600 uppercase tracking-wider' : 'text-gray-500'}`}>
                                {isMockup ? '★ MOCKUP' : 'INSPIRATION'} BY {ownerName.toUpperCase()}
                            </span>
                        )}
                    </div>
                </>
            )}
            
            {item.type === 'note' && (
                <>
                <div className="font-handwriting text-gray-800 text-sm leading-6 font-medium whitespace-pre-wrap font-serif mb-4 pointer-events-none">
                    {item.content}
                </div>
                {ownerName && (
                    <div className="absolute bottom-2 right-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider opacity-50 pointer-events-none">
                        - {ownerName}
                    </div>
                )}
                </>
            )}
            
            {item.type === 'color' && (
                <div className="w-32 h-32 flex flex-col items-center justify-center p-4 pointer-events-none">
                    <div className="w-full h-full rounded-full shadow-inner" style={{ backgroundColor: item.content }}></div>
                    <span className="mt-4 font-mono text-xs text-gray-500 uppercase">{item.content}</span>
                </div>
            )}
            
            {/* Hover overlay to hint draggable */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none rounded-[inherit]" />
            </div>
        );
      })}
    </div>
  );
};

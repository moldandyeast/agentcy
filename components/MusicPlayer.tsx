
import React, { useEffect, useRef } from 'react';
import { LoFiAudioEngine } from '../utils/music';

interface MusicPlayerProps {
  engine: React.MutableRefObject<LoFiAudioEngine | null>;
  isMuted: boolean;
  toggleMute: () => void;
  isSfxMuted: boolean;
  toggleSfxMute: () => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ 
    engine, 
    isMuted, 
    toggleMute,
    isSfxMuted,
    toggleSfxMute
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const draw = () => {
        if (!canvasRef.current || !engine.current) return;
        const analyser = engine.current.getAnalyserNode();
        if (!analyser) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const w = canvasRef.current.width;
        const h = canvasRef.current.height;

        ctx.fillStyle = '#111827'; // Dark bg
        ctx.fillRect(0, 0, w, h);
        
        // Draw Retro Grid
        ctx.strokeStyle = '#1F2937';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let x=0; x<w; x+=20) { ctx.moveTo(x,0); ctx.lineTo(x, h); }
        for(let y=0; y<h; y+=20) { ctx.moveTo(0,y); ctx.lineTo(w, y); }
        ctx.stroke();

        const barWidth = (w / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * h * 0.8;
            
            // Gradient Color
            const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
            gradient.addColorStop(0, '#F59E0B'); // Amber
            gradient.addColorStop(1, '#EF4444'); // Red
            
            ctx.fillStyle = gradient;
            
            // Draw rounded bar top
            if (barHeight > 0) {
                ctx.fillRect(x, h - barHeight, barWidth - 2, barHeight);
                // Highlight top
                ctx.fillStyle = '#FEF3C7';
                ctx.fillRect(x, h - barHeight - 2, barWidth - 2, 2);
            }

            x += barWidth;
        }

        rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [engine, isMuted]);

  return (
    <div className="w-full h-full bg-gray-900 flex flex-col text-white font-mono overflow-hidden">
        {/* Visualizer Area */}
        <div className="relative flex-1 bg-black border-b border-gray-800">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${!isMuted ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></div>
                <div className="text-[10px] text-gray-400 tracking-widest font-bold">LO-FI ENGINE</div>
            </div>
            <canvas ref={canvasRef} width={320} height={120} className="w-full h-full" />
        </div>

        {/* Controls Area */}
        <div className="p-4 bg-gray-900 grid grid-cols-2 gap-3">
             {/* Music Toggle */}
             <button 
                onClick={toggleMute}
                className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 p-2 rounded border border-gray-700 group transition-colors"
             >
                <div className="flex flex-col items-start">
                    <span className="text-[9px] text-gray-500 font-bold tracking-wider">BEATS</span>
                    <span className={`text-xs font-bold ${!isMuted ? 'text-amber-400' : 'text-gray-400'}`}>
                        {isMuted ? 'MUTED' : 'CHILL'}
                    </span>
                </div>
                <div className={`w-6 h-6 rounded flex items-center justify-center bg-gray-900 border border-gray-600 ${!isMuted ? 'text-amber-400' : 'text-gray-600'}`}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
                </div>
             </button>

             {/* SFX Toggle */}
             <button 
                onClick={toggleSfxMute}
                className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 p-2 rounded border border-gray-700 group transition-colors"
             >
                <div className="flex flex-col items-start">
                    <span className="text-[9px] text-gray-500 font-bold tracking-wider">CLACK</span>
                    <span className={`text-xs font-bold ${!isSfxMuted ? 'text-blue-400' : 'text-gray-400'}`}>
                        {isSfxMuted ? 'OFF' : 'ON'}
                    </span>
                </div>
                 <div className={`w-6 h-6 rounded flex items-center justify-center bg-gray-900 border border-gray-600 ${!isSfxMuted ? 'text-blue-400' : 'text-gray-600'}`}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                </div>
             </button>
        </div>
        
        <div className="px-4 pb-2 text-[9px] text-gray-600 text-center uppercase tracking-widest font-bold">
            0xNonSense Audio Engine v3.0
        </div>
    </div>
  );
};

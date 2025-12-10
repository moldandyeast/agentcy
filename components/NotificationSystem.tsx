
import React from 'react';
import { AppNotification } from '../types';

interface NotificationSystemProps {
  notifications: AppNotification[];
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ notifications }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-12 right-4 z-[30000] flex flex-col gap-3 pointer-events-none">
      {notifications.map((note) => (
        <div 
            key={note.id} 
            className="pointer-events-auto w-80 bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl p-4 flex gap-3 animate-slide-up transform transition-all duration-300 hover:scale-[1.02]"
        >
            <div className={`w-1.5 h-auto rounded-full shrink-0 ${
                note.type === 'error' ? 'bg-red-500' : 
                note.type === 'warning' ? 'bg-yellow-500' : 
                note.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
            }`}></div>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                    <h4 className="text-sm font-semibold text-gray-900 leading-tight">{note.title}</h4>
                    <span className="text-[10px] text-gray-400 font-medium">Now</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-medium opacity-90">{note.message}</p>
            </div>
        </div>
      ))}
    </div>
  );
};

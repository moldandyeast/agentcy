
import React from 'react';
import { Task } from '../types';
import { CHARACTERS } from '../constants';

interface KanbanBoardProps {
  tasks: Task[];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks }) => {
  const columns: { id: Task['status']; title: string; color: string; headerColor: string }[] = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-50/50', headerColor: 'border-l-4 border-gray-300' },
    { id: 'doing', title: 'In Progress', color: 'bg-blue-50/30', headerColor: 'border-l-4 border-blue-400' },
    { id: 'done', title: 'Done', color: 'bg-green-50/30', headerColor: 'border-l-4 border-green-400' }
  ];

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>, name: string) => {
      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
  };

  return (
    <div className="flex h-full w-full overflow-x-auto bg-[#F8F9FA] p-4 gap-4">
      {columns.map(col => (
        <div key={col.id} className={`flex-1 min-w-[250px] flex flex-col h-full rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden`}>
          {/* Column Header */}
          <div className={`p-4 border-b border-gray-100 flex justify-between items-center bg-white ${col.headerColor}`}>
            <h3 className="font-bold text-gray-800 text-sm tracking-tight uppercase">{col.title}</h3>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {tasks.filter(t => t.status === col.id).length}
            </span>
          </div>
          
          {/* Tasks Container */}
          <div className={`flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar ${col.color}`}>
            {tasks.filter(t => t.status === col.id).map(task => {
                const assignee = task.assignee ? CHARACTERS[task.assignee] : null;
                return (
                  <div key={task.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all cursor-default group">
                    <div className="text-sm font-medium text-gray-700 mb-3 leading-snug group-hover:text-blue-700 transition-colors">{task.title}</div>
                    
                    <div className="flex justify-between items-end">
                        <div className="text-[10px] text-gray-300 font-mono">#{task.id}</div>
                        {assignee && (
                            <div className="flex items-center gap-1.5 bg-gray-50 pl-1 pr-2 py-0.5 rounded-full border border-gray-100">
                                <img 
                                    src={assignee.avatar} 
                                    alt={assignee.name} 
                                    onError={(e) => handleImgError(e, assignee.name)}
                                    className="w-4 h-4 rounded-full" 
                                />
                                <span className="text-[9px] font-bold text-gray-500 uppercase">{assignee.name}</span>
                            </div>
                        )}
                    </div>
                  </div>
                );
            })}
            
            {tasks.filter(t => t.status === col.id).length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-lg">
                    <span className="text-xs text-gray-300 font-medium">Empty</span>
                </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

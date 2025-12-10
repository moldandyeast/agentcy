
import React from 'react';
import { AgencyState, TabId } from '../types';
import { LivePreview } from './LivePreview';
import { CodeEditor } from './CodeEditor';
import { KanbanBoard } from './KanbanBoard';
import { BriefDoc } from './BriefDoc';
import { Moodboard } from './Moodboard';

interface WorkspaceProps {
  state: AgencyState;
  onTabChange: (tab: TabId) => void;
  onMoodboardItemMove: (id: string, x: number, y: number) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({ state, onTabChange, onMoodboardItemMove }) => {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'brief', label: 'Brief' },
    { id: 'moodboard', label: 'Moodboard' },
    { id: 'board', label: 'Plan' },
    { id: 'code', label: 'Code' },
    { id: 'live', label: 'Preview' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] relative font-sans">
      {/* Tab Bar */}
      <div className="h-14 border-b border-gray-200 bg-white flex items-center px-6 justify-between shrink-0">
        <div className="flex space-x-1 p-1 bg-gray-100/50 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                state.currentTab === tab.id 
                  ? 'bg-white text-gray-900 shadow-sm text-black' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
            {state.isThinking ? (
                <div className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
                    Thinking
                </div>
            ) : (
                <div className="text-xs font-medium text-gray-400 px-2">
                    Turn {state.turnCount}
                </div>
            )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-6 shadow-sm rounded-2xl overflow-hidden bg-white border border-gray-100 ring-1 ring-black/5">
            {state.currentTab === 'live' && <LivePreview htmlContent={state.htmlContent} />}
            {state.currentTab === 'code' && <CodeEditor code={state.htmlContent} />}
            {state.currentTab === 'board' && <KanbanBoard tasks={state.tasks} />}
            {state.currentTab === 'brief' && <BriefDoc content={state.brief} />}
            {state.currentTab === 'moodboard' && (
                <Moodboard 
                    items={state.moodboard} 
                    onItemMove={onMoodboardItemMove}
                />
            )}
        </div>
      </div>
      
      {/* Paused Overlay */}
      {state.isPaused && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-50 flex items-center justify-center">
             <div className="bg-black text-white px-6 py-2 rounded-full text-sm font-medium tracking-wide shadow-xl">
                 SIMULATION PAUSED
             </div>
        </div>
      )}
    </div>
  );
};

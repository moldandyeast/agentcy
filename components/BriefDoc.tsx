
import React from 'react';

interface BriefDocProps {
  content: string;
}

export const BriefDoc: React.FC<BriefDocProps> = ({ content }) => {
  // Ensure we are working with a string
  const textContent = typeof content === 'string' ? content : "Loading document...";

  return (
    <div className="w-full h-full bg-white overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto py-16 px-12">
        <div className="mb-8 pb-6 border-b border-gray-100">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Internal Document</div>
            <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">Product Spec</h1>
        </div>
        
        {textContent ? (
            <div className="prose prose-lg prose-slate max-w-none font-serif text-gray-600 leading-relaxed whitespace-pre-wrap">
              {textContent}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p>No specification available yet.</p>
            </div>
        )}
      </div>
    </div>
  );
};

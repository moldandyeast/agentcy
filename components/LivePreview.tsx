
import React from 'react';

interface LivePreviewProps {
  htmlContent: string;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ htmlContent }) => {
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      {/* Browser Toolbar - Integrated into the top of the content area */}
      <div className="h-12 bg-[#F3F4F6] border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
        <div className="flex gap-2 text-gray-400">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/><line x1="21" y1="2" x2="9" y2="14"/><polyline points="21 7 21 2 16 2"/></svg>
        </div>
        
        {/* Address Bar */}
        <div className="flex-1 flex justify-center">
            <div className="bg-white border border-gray-200 shadow-sm w-full max-w-xl h-8 rounded-md flex items-center px-3 gap-2 text-xs text-gray-500 font-mono overflow-hidden">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span className="truncate">localhost:3000/preview</span>
            </div>
        </div>
        
        <div className="w-16"></div> 
      </div>
      
      {/* Iframe Content */}
      <div className="flex-1 w-full bg-white relative">
          <iframe 
            title="Live Preview"
            srcDoc={htmlContent}
            className="w-full h-full border-0 block"
            sandbox="allow-scripts"
          />
      </div>
    </div>
  );
};

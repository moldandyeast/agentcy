
import React from 'react';

interface CodeEditorProps {
  code: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code }) => {
  return (
    <div className="w-full h-full bg-[#1E1E1E] overflow-auto custom-scrollbar">
      <div className="flex text-xs font-mono text-gray-500 border-b border-white/10 p-3 bg-[#252526] sticky top-0">
        index.html
      </div>
      <pre className="p-6 text-sm font-mono leading-relaxed text-[#D4D4D4]">
        <code>{code || "<!-- No code yet -->"}</code>
      </pre>
    </div>
  );
};

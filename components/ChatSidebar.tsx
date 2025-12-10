
import React, { useEffect, useRef } from 'react';
import { Message, CharacterId } from '../types';
import { CHARACTERS, GIF_LIBRARY } from '../constants';

interface ChatSidebarProps {
  messages: Message[];
  typingCharacter: CharacterId | null;
  typingText: string;
  scale?: number;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
    messages, 
    typingCharacter,
    typingText,
    scale = 1
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isScaled = scale > 1;

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, typingCharacter]);

  const SystemChar = CHARACTERS['system'];

  const getGif = (emotion: string | undefined, id: string) => {
      if (!emotion || !GIF_LIBRARY[emotion]) return null;
      const list = GIF_LIBRARY[emotion];
      const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return list[hash % list.length];
  }

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>, name: string) => {
      // Fallback to UI Avatars if DiceBear fails
      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
  };

  return (
    <div className={`flex flex-col h-full w-full bg-white relative overflow-hidden font-sans transition-all`}>
      
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 custom-scrollbar scroll-smooth"
      >
        {messages.map((msg, index) => {
          const char = CHARACTERS[msg.characterId] || SystemChar;
          const isSystem = msg.characterId === 'system';
          const gifUrl = getGif(msg.emotion, msg.id);
          const isLast = index === messages.length - 1;
          
          if (isSystem) {
              return (
                  <div key={msg.id} className="flex justify-center w-full my-4 opacity-70">
                      <span className={`text-[10px] font-mono font-medium text-gray-500 bg-gray-100/80 px-3 py-1 rounded-full border border-gray-200 uppercase tracking-wide text-center backdrop-blur-sm ${isScaled ? 'text-sm px-4 py-2' : ''}`}>
                        {msg.content}
                      </span>
                  </div>
              )
          }

          return (
            <div key={msg.id} className={`flex gap-3 group items-start ${isLast ? 'animate-fade-in' : ''}`}>
              <div className="relative shrink-0 mt-0.5">
                <img 
                    src={char.avatar} 
                    alt={char.name} 
                    onError={(e) => handleImgError(e, char.name)}
                    className={`${isScaled ? 'w-12 h-12' : 'w-9 h-9'} rounded-full bg-gray-50 shadow-sm object-cover border border-gray-100`} 
                />
                <div className={`absolute -bottom-1 -right-1 rounded-full border-2 border-white ${msg.characterId === 'rich' ? 'bg-green-500' : 'bg-gray-300'} ${isScaled ? 'w-4 h-4' : 'w-2.5 h-2.5'}`}></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={`font-bold ${char.color ? char.color.split(' ')[1] : 'text-gray-900'} ${isScaled ? 'text-base' : 'text-xs'}`}>
                    {char.name}
                  </span>
                  <span className={`text-gray-400 font-medium ${isScaled ? 'text-xs' : 'text-[10px]'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                
                <div className={`leading-relaxed text-gray-700 font-normal break-words whitespace-pre-wrap tracking-wide ${isScaled ? 'text-lg' : 'text-[14px]'}`}>
                  {msg.content}
                </div>
                
                {gifUrl && (
                    <div className={`mt-2 rounded-lg overflow-hidden shadow-sm ring-1 ring-black/5 bg-gray-50 ${isScaled ? 'max-w-[360px]' : 'max-w-[240px]'}`}>
                        <img 
                            src={gifUrl} 
                            alt={msg.emotion} 
                            className="w-full h-auto block" 
                            loading="lazy"
                            onLoad={scrollToBottom} 
                            referrerPolicy="no-referrer"
                        />
                    </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      <div 
        id="chat-input-section" 
        className={`flex-none bg-white/90 backdrop-blur-xl border-t border-gray-100 z-20 ${isScaled ? 'p-5' : 'p-3'}`}
      >
        <div className={`
            relative w-full flex items-center rounded-xl transition-all duration-300
            border shadow-sm font-medium tracking-tight
            ${typingCharacter 
                ? 'bg-white border-blue-400/50 ring-2 ring-blue-50 text-gray-900' 
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }
            ${isScaled ? 'min-h-[60px] px-4 py-3 text-lg' : 'min-h-[44px] px-3 py-2 text-sm'}
        `}>
            {typingCharacter ? (
                <div className="flex items-center w-full gap-2">
                    <div className={`shrink-0 flex items-center justify-center rounded bg-gray-100 border border-gray-200 ${isScaled ? 'w-10 h-10' : 'w-6 h-6'}`}>
                         <img 
                             src={CHARACTERS[typingCharacter]?.avatar} 
                             onError={(e) => handleImgError(e, CHARACTERS[typingCharacter]?.name)}
                             className={`rounded-sm opacity-80 ${isScaled ? 'w-8 h-8' : 'w-5 h-5'}`} 
                             alt="" 
                         />
                    </div>
                    
                    <div className={`flex-1 overflow-hidden relative flex items-center ${isScaled ? 'h-8' : 'h-6'}`}>
                        <span className="font-mono text-gray-900 whitespace-pre overflow-hidden text-ellipsis block max-w-full">
                            {typingText}
                            <span className="animate-pulse text-blue-600 inline-block ml-[1px] font-bold">▍</span>
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 select-none opacity-50 px-1">
                    <div className={`rounded-full bg-gray-400 animate-pulse ${isScaled ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'}`}></div>
                    <span>Agency is thinking...</span>
                </div>
            )}
        </div>
        
        <div className={`flex justify-between items-center px-1 ${isScaled ? 'mt-3' : 'mt-2'}`}>
            <div className={`text-gray-300 font-medium uppercase tracking-widest flex items-center gap-1 ${isScaled ? 'text-xs' : 'text-[10px]'}`}>
                {typingCharacter ? (
                    <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        {CHARACTERS[typingCharacter]?.name} IS TYPING...
                    </>
                ) : (
                    'CHANNEL ACTIVE'
                )}
            </div>
            <div className={`text-gray-300 ${isScaled ? 'text-xs' : 'text-[10px]'}`}>
                ⌘+K
            </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgencyState, Message, Task, MoodboardItem, DirectorAction, WindowId, WindowState, AppNotification } from './types';
import { INITIAL_HTML, DEFAULT_PROMPTS, PRESET_EVENTS, INITIAL_WINDOWS, CHARACTERS } from './constants';
import { ChatSidebar } from './components/ChatSidebar'; 
import { CursorOverlay } from './components/CursorOverlay';
import { generateNextTurn, generateImage } from './services/gemini';
import { playSound } from './utils/sound';
import { LoFiAudioEngine } from './utils/music';
import { WindowFrame } from './components/WindowFrame';
import { LivePreview } from './components/LivePreview';
import { CodeEditor } from './components/CodeEditor';
import { KanbanBoard } from './components/KanbanBoard';
import { BriefDoc } from './components/BriefDoc';
import { Moodboard } from './components/Moodboard';
import { MusicPlayer } from './components/MusicPlayer';
import { NotificationSystem } from './components/NotificationSystem';

const App: React.FC = () => {
  // Modal States
  const [showStart, setShowStart] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'inject' | 'cast' | 'display'>('inject');
  
  // Input States
  const [prompt, setPrompt] = useState('');
  const [customEvent, setCustomEvent] = useState('');

  // Audio State
  const [isMuted, setIsMuted] = useState(false);
  const musicEngine = useRef<LoFiAudioEngine | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Main Simulation State
  const [state, setState] = useState<AgencyState>({
    isActive: false,
    isPaused: false,
    isSfxMuted: false,
    brief: '',
    htmlContent: INITIAL_HTML,
    tasks: [],
    messages: [],
    moodboard: [],
    
    // Desktop OS State
    windows: INITIAL_WINDOWS,
    activeWindowId: 'chat',
    
    turnCount: 0,
    consecutiveChatTurns: 0,
    isThinking: false,
    typingCharacter: null,
    typingText: '',
    lastSpeaker: null,
    pendingEvent: null
  });

  // Refs for loop safety
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedRef = useRef(state.isPaused);
  const isActiveRef = useRef(state.isActive);
  const lastActivityRef = useRef<number>(Date.now());
  const startThinkingRef = useRef<number>(0);

  // Sync refs with state
  useEffect(() => {
    isPausedRef.current = state.isPaused;
    isActiveRef.current = state.isActive;
  }, [state.isPaused, state.isActive]);

  // Track thinking time for Watchdog
  useEffect(() => {
      if (state.isThinking) {
          startThinkingRef.current = Date.now();
      } else {
          startThinkingRef.current = 0;
      }
  }, [state.isThinking]);

  // Initialize Music Engine
  useEffect(() => {
    if (!musicEngine.current) {
         musicEngine.current = new LoFiAudioEngine();
    }
    return () => musicEngine.current?.stop();
  }, []);

  // Handle Audio Toggles
  const toggleMute = () => {
      setIsMuted(prev => {
          const next = !prev;
          musicEngine.current?.setMute(next);
          return next;
      });
  };

  const toggleSfxMute = () => {
      setState(prev => ({ ...prev, isSfxMuted: !prev.isSfxMuted }));
  };

  // --- NOTIFICATION HELPERS ---
  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const id = Date.now().toString() + Math.random();
      setNotifications(prev => [...prev, { id, title, message, type, timestamp: Date.now() }]);
      setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
  };

  // --- WINDOW MANAGEMENT ---
  const focusWindow = (id: WindowId) => {
    setState(prev => {
        const maxZ = Math.max(...Object.values(prev.windows).map((w: WindowState) => w.zIndex));
        if (prev.windows[id].zIndex === maxZ) return prev; // Already on top
        
        return {
            ...prev,
            activeWindowId: id,
            windows: {
                ...prev.windows,
                [id]: { ...prev.windows[id], zIndex: maxZ + 1, isOpen: true }
            }
        };
    });
  };

  const closeWindow = (id: WindowId) => {
    setState(prev => ({
        ...prev,
        windows: {
            ...prev.windows,
            [id]: { ...prev.windows[id], isOpen: false }
        }
    }));
  };

  const moveWindow = (id: string, x: number, y: number) => {
      setState(prev => ({
          ...prev,
          windows: {
              ...prev.windows,
              [id]: { ...prev.windows[id], x, y }
          }
      }));
  };
  
  const openWindow = (id: WindowId) => {
      focusWindow(id); 
  };

  const handleWindowScale = (id: WindowId, factor: number) => {
      const initial = INITIAL_WINDOWS[id];
      if (!initial) return;

      setState(prev => {
          const current = prev.windows[id];
          const newW = initial.width * factor;
          const newH = initial.height * factor;
          
          const maxZ = Math.max(...Object.values(prev.windows).map((w: WindowState) => w.zIndex));

          return {
              ...prev,
              activeWindowId: id,
              windows: {
                  ...prev.windows,
                  [id]: {
                      ...current,
                      width: newW,
                      height: newH,
                      zIndex: maxZ + 1,
                      scale: factor 
                  }
              }
          };
      });
  };

  // --- DOWNLOAD CODE ---
  const handleDownloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([state.htmlContent], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = "index.html";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
    addNotification('Download Started', 'Source code saved to downloads.', 'success');
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>, name: string) => {
      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
  };

  // --- THE GAME LOOP ---
  const runTurn = useCallback(async () => {
    if (!isActiveRef.current || isPausedRef.current || state.isThinking || state.typingCharacter) return;

    setState(prev => ({ ...prev, isThinking: true }));
    lastActivityRef.current = Date.now();

    try {
      let audioVibe = "Silence";
      if (musicEngine.current) {
          const energy = musicEngine.current.getEnergy();
          if (energy < 0.2) audioVibe = "Chill / Quiet";
          else if (energy < 0.5) audioVibe = "Groovy / Mid-Tempo";
          else audioVibe = "High Energy / Intense";
      }

      const action: DirectorAction = await generateNextTurn(state, audioVibe);
      
      setState(prev => ({ ...prev, isThinking: false }));
      lastActivityRef.current = Date.now();

      // Typing Simulation
      const textToType = action.message;
      if (textToType && action.speaker !== 'system') {
          setState(prev => ({ 
              ...prev, 
              typingCharacter: action.speaker,
              typingText: ''
          }));
          
          focusWindow('chat');

          let currentIndex = 0;
          const typingSpeed = 30;

          await new Promise<void>(resolve => {
              const typeChar = () => {
                   if (!isActiveRef.current || isPausedRef.current) {
                       resolve(); 
                       return;
                   }

                   if (currentIndex < textToType.length) {
                       setState(s => ({ ...s, typingText: s.typingText + textToType[currentIndex] }));
                       if (currentIndex % 3 === 0 && !state.isSfxMuted) playSound('keyboard'); 
                       currentIndex++;
                       setTimeout(typeChar, typingSpeed);
                   } else {
                       resolve();
                   }
              };
              setTimeout(typeChar, 500); 
          });
      }

      if (isPausedRef.current) {
          setState(prev => ({ ...prev, typingCharacter: null, typingText: '' }));
          return;
      }

      if (!state.isSfxMuted) playSound('pop'); 
      
      setState(prev => {
        const next = { ...prev };
        next.typingCharacter = null;
        next.typingText = '';
        next.turnCount += 1;
        next.lastSpeaker = action.speaker;
        next.pendingEvent = null; // Clear pending events as they are processed

        if (action.action === 'wait') {
            next.consecutiveChatTurns += 1;
        } else {
            next.consecutiveChatTurns = 0;
        }

        const newMessage: Message = {
            id: Date.now().toString(),
            characterId: action.speaker,
            content: action.message,
            emotion: action.emotion,
            timestamp: Date.now()
        };
        next.messages = [...next.messages, newMessage];

        const payload = action.actionPayload || {};
        const maxZ = Math.max(...Object.values(next.windows).map((w: WindowState) => w.zIndex));

        if (action.action === 'update_brief' && payload.content) {
            next.brief = payload.content;
            if (!state.isSfxMuted) playSound('success');
            next.windows.brief.isOpen = true;
            next.windows.brief.zIndex = maxZ + 1;
        }

        if (action.action === 'update_code' && payload.content) {
            next.htmlContent = payload.content;
            if (!state.isSfxMuted) playSound('success');
            next.windows.live.isOpen = true;
            next.windows.live.zIndex = maxZ + 1;
        }

        if (action.action === 'add_task' && payload.title) {
            const newTask: Task = {
                id: Date.now().toString().slice(-4),
                title: payload.title,
                status: (payload.column as any) || 'todo',
                assignee: action.speaker === 'kevin' ? undefined : action.speaker
            };
            next.tasks = [...next.tasks, newTask];
            next.windows.board.isOpen = true;
            next.windows.board.zIndex = maxZ + 1;
        }

        if (action.action === 'move_task' && payload.taskId && payload.column) {
            next.tasks = next.tasks.map(t => 
                t.id === payload.taskId ? { ...t, status: payload.column as any } : t
            );
        }

        if (action.action === 'add_moodboard' && payload.content) {
            const item: MoodboardItem = {
                id: Date.now().toString(),
                type: (payload.type as any) || 'note',
                content: payload.content,
                x: 50, y: 50, rotation: 0,
                owner: action.speaker 
            };
            next.moodboard = [...next.moodboard, item];
            next.windows.moodboard.isOpen = true;
            next.windows.moodboard.zIndex = maxZ + 1;
        }

        if (action.action === 'switch_tab' && payload.tabId) {
            const targetWin = payload.tabId as WindowId;
            if (next.windows[targetWin]) {
                next.windows[targetWin].isOpen = true;
                next.windows[targetWin].zIndex = maxZ + 1;
            }
        }

        return next;
      });

      lastActivityRef.current = Date.now();

      // Side Effects
      if (action.action === 'generate_image' && action.actionPayload?.prompt) {
          const imgPrompt = action.actionPayload.prompt;
          const requester = action.speaker;

          generateImage(imgPrompt).then(base64 => {
              if (base64) {
                  if (!state.isSfxMuted) playSound('success');
                  addNotification('Asset Created', `New image generated by ${requester}`, 'success');
                  
                  setState(curr => {
                      const maxZ = Math.max(...Object.values(curr.windows).map((w: WindowState) => w.zIndex));
                      return {
                        ...curr,
                        moodboard: [
                            ...curr.moodboard,
                            {
                                id: Date.now().toString(),
                                type: 'image',
                                content: base64,
                                x: Math.random() * 60 + 20,
                                y: Math.random() * 60 + 20,
                                rotation: (Math.random() * 20) - 10,
                                owner: requester
                            }
                        ],
                        windows: {
                            ...curr.windows,
                            moodboard: { ...curr.windows.moodboard, isOpen: true, zIndex: maxZ + 1 }
                        },
                        messages: [
                            ...curr.messages,
                            {
                                id: Date.now().toString() + 'sys',
                                characterId: 'system',
                                content: `generated image for "${imgPrompt}"`,
                                timestamp: Date.now()
                            }
                        ]
                    };
                  });
              } else {
                  addNotification('Generation Failed', 'Image generation service returned no data', 'error');
              }
          });
      }

    } catch (e) {
      console.error("Critical Loop Error:", e);
      addNotification('System Error', 'Simulation loop encountered a critical error.', 'error');
      setState(prev => ({ ...prev, isThinking: false, typingCharacter: null }));
    }
  }, [state]);

  // --- MAIN LOOP TIMER ---
  useEffect(() => {
    if (state.isActive && !state.isPaused && !state.isThinking && !state.typingCharacter) {
        const delay = state.turnCount === 0 ? 500 : 3500; 
        timerRef.current = setTimeout(runTurn, delay);
    }
    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [state.isActive, state.isPaused, state.isThinking, state.typingCharacter, state.turnCount, runTurn]);


  // --- WATCHDOG TIMER (HANGOVER FIX) ---
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
        if (!state.isActive || state.isPaused) return;

        const now = Date.now();
        
        // 1. Check for Stuck Thinking (API Timeout/Hang)
        // Extended to 60s for complex code generation
        if (startThinkingRef.current > 0 && now - startThinkingRef.current > 60000) {
            console.warn("Watchdog: Detected stuck thinking state. Forcing reset.");
            addNotification("System", "Agent computation timed out. Resetting...", "warning");
            setState(s => ({ ...s, isThinking: false }));
            startThinkingRef.current = 0;
        }

        // 2. Check for Idle (Timer Died)
        const timeSinceActivity = now - lastActivityRef.current;
        if (!state.isThinking && !state.typingCharacter && timeSinceActivity > 30000) {
            console.warn("Watchdog: Detected idle state. Forcing turn.");
            runTurn();
        }

    }, 5000); // Check every 5s

    return () => clearInterval(watchdogInterval);
  }, [state.isActive, state.isPaused, state.isThinking, state.typingCharacter, runTurn]);


  // --- HANDLERS ---
  const handleStart = () => {
      if (!prompt.trim()) return;
      if (!state.isSfxMuted) playSound('success');
      if (musicEngine.current) musicEngine.current.start();
      addNotification('System Online', 'The Agency OS is initialized and running.', 'success');

      setState(prev => ({
          ...prev,
          isActive: true,
          brief: prompt,
          messages: [{
              id: 'init',
              characterId: 'system',
              content: 'OS Booted. Project Initialized.',
              timestamp: Date.now()
          }]
      }));
      setShowStart(false);
  };

  const handleInject = (evt: string) => {
      addNotification('Director Note', 'Injecting new event parameters...', 'warning');
      setState(prev => ({
          ...prev,
          pendingEvent: evt,
          messages: [...prev.messages, { id: 'evt-'+Date.now(), characterId: 'system', content: `DIRECTOR NOTE: ${evt}`, timestamp: Date.now() }]
      }));
      setShowSettings(false);
  };
  
  const handleMoodboardMove = (id: string, x: number, y: number) => {
    setState(prev => ({
        ...prev,
        moodboard: prev.moodboard.map(item => 
            item.id === id ? { ...item, x, y } : item
        )
    }));
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-white font-sans overflow-hidden select-none relative">
        
        {/* DESKTOP BACKGROUND */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 rounded-full blur-[100px] animate-blob"></div>
            <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[50vw] bg-blue-500/10 rounded-full blur-[100px] animate-blob animation-delay-2000" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] bg-purple-500/10 rounded-full blur-[100px] animate-blob animation-delay-4000" style={{ animationDelay: '4s' }}></div>
            <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'}}></div>
        </div>
        
        {/* NOTIFICATION LAYER */}
        <NotificationSystem notifications={notifications} />

        {/* PAUSE OVERLAY */}
        {state.isPaused && (
            <div className="absolute inset-0 z-[20000] bg-black/40 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                 <h2 className="text-4xl font-bold text-white tracking-widest mb-6 drop-shadow-lg">SIMULATION PAUSED</h2>
                 <button 
                    onClick={() => setState(s => ({...s, isPaused: false}))}
                    className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform shadow-xl"
                 >
                     RESUME
                 </button>
            </div>
        )}

        {/* --- GLOBAL HEADER BAR --- */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-black/20 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 z-[9999] text-xs font-medium text-white/90">
            <div className="flex items-center gap-4">
                <span className="font-bold tracking-tight"> The Agency OS</span>
                <span className="w-px h-3 bg-white/20"></span>
                <span className="opacity-70">Project: {state.brief ? state.brief.slice(0, 20) + '...' : 'Untitled'}</span>
            </div>
            
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/60">
                <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                {state.isThinking && <span className="text-blue-400 animate-pulse">● Processing</span>}
            </div>

            <div className="flex items-center gap-3">
                 <button onClick={() => setState(s => ({...s, isPaused: !s.isPaused}))} className="hover:text-white text-white/70 transition-colors">
                    {state.isPaused ? 'Resume' : 'Pause'}
                 </button>
                 <button onClick={() => setShowSettings(true)} className="hover:text-white text-white/70 flex items-center gap-1 transition-colors">
                    Director Mode
                 </button>
                 <button onClick={() => { setShowSettings(true); setSettingsTab('display'); }} className="hover:text-white text-white/70 flex items-center gap-1 transition-colors">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                 </button>
            </div>
        </div>

        {/* --- DESKTOP AREA --- */}
        <div 
            className="absolute inset-0 top-8 overflow-hidden transition-transform duration-500 origin-center"
            style={{
                transform: state.viewportMode === '4k' ? 'scale(0.5)' : 
                           state.viewportMode === '1440p' ? 'scale(0.75)' : 
                           state.viewportMode === '1080p' ? 'scale(1)' : 'scale(1)',
                width: state.viewportMode === '4k' ? '200%' : 
                       state.viewportMode === '1440p' ? '133%' : '100%',
                height: state.viewportMode === '4k' ? '200%' : 
                        state.viewportMode === '1440p' ? '133%' : '100%',
                left: state.viewportMode === '4k' ? '-50%' : 
                      state.viewportMode === '1440p' ? '-16.5%' : '0',
                top: state.viewportMode === '4k' ? '-46%' : 
                     state.viewportMode === '1440p' ? '-12%' : '0',
            }}
        >
            <WindowFrame 
                windowState={state.windows.chat} 
                isActive={state.activeWindowId === 'chat'}
                onFocus={() => focusWindow('chat')}
                onClose={() => closeWindow('chat')}
                onMove={moveWindow}
                onScale={(f) => handleWindowScale('chat', f)}
            >
                <ChatSidebar 
                    messages={state.messages} 
                    typingCharacter={state.typingCharacter}
                    typingText={state.typingText}
                    scale={state.windows.chat.scale}
                />
            </WindowFrame>

            <WindowFrame 
                windowState={state.windows.live} 
                isActive={state.activeWindowId === 'live'}
                onFocus={() => focusWindow('live')}
                onClose={() => closeWindow('live')}
                onMove={moveWindow}
                onScale={(f) => handleWindowScale('live', f)}
            >
                <LivePreview htmlContent={state.htmlContent} />
            </WindowFrame>

            <WindowFrame 
                windowState={state.windows.code} 
                isActive={state.activeWindowId === 'code'}
                onFocus={() => focusWindow('code')}
                onClose={() => closeWindow('code')}
                onMove={moveWindow}
                onScale={(f) => handleWindowScale('code', f)}
            >
                <CodeEditor code={state.htmlContent} />
            </WindowFrame>

            <WindowFrame 
                windowState={state.windows.board} 
                isActive={state.activeWindowId === 'board'}
                onFocus={() => focusWindow('board')}
                onClose={() => closeWindow('board')}
                onMove={moveWindow}
                onScale={(f) => handleWindowScale('board', f)}
            >
                <KanbanBoard tasks={state.tasks} />
            </WindowFrame>

            <WindowFrame 
                windowState={state.windows.brief} 
                isActive={state.activeWindowId === 'brief'}
                onFocus={() => focusWindow('brief')}
                onClose={() => closeWindow('brief')}
                onMove={moveWindow}
                onScale={(f) => handleWindowScale('brief', f)}
            >
                <BriefDoc content={state.brief} />
            </WindowFrame>

            <WindowFrame 
                windowState={state.windows.moodboard} 
                isActive={state.activeWindowId === 'moodboard'}
                onFocus={() => focusWindow('moodboard')}
                onClose={() => closeWindow('moodboard')}
                onMove={moveWindow}
                onScale={(f) => handleWindowScale('moodboard', f)}
            >
                <Moodboard items={state.moodboard} onItemMove={handleMoodboardMove} />
            </WindowFrame>

            <WindowFrame 
                windowState={state.windows.music} 
                isActive={state.activeWindowId === 'music'}
                onFocus={() => focusWindow('music')}
                onClose={() => closeWindow('music')}
                onMove={moveWindow}
                onScale={(f) => handleWindowScale('music', f)}
            >
                <MusicPlayer 
                    engine={musicEngine} 
                    isMuted={isMuted} 
                    toggleMute={toggleMute} 
                    isSfxMuted={state.isSfxMuted}
                    toggleSfxMute={toggleSfxMute}
                />
            </WindowFrame>
        </div>

        {/* CURSOR LAYER */}
        {state.isActive && <CursorOverlay typingCharacter={state.typingCharacter} />}

        {/* --- DOCK (Bottom) --- */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-4 shadow-2xl z-[10000]">
             {(Object.entries(state.windows) as [string, WindowState][]).map(([id, win]) => (
                 <button 
                    key={id}
                    onClick={() => openWindow(id as WindowId)}
                    className="relative group flex flex-col items-center transition-transform active:scale-95"
                 >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 
                        ${win.isOpen ? 'bg-blue-600/80 text-white shadow-lg scale-110' : 'bg-white/5 text-white/70 hover:bg-white/20'}
                    `}>
                        {id === 'chat' && <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>}
                        {id === 'live' && <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>}
                        {id === 'code' && <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>}
                        {id === 'brief' && <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
                        {id === 'board' && <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
                        {id === 'moodboard' && <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
                        {id === 'music' && <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>}
                    </div>
                    {win.isOpen && <div className="absolute -bottom-2 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>}
                 </button>
             ))}
             
             {/* SEPARATOR */}
             <div className="w-px h-8 bg-white/10 mx-2"></div>

             {/* DOWNLOAD BUTTON */}
             <button 
                onClick={handleDownloadCode}
                className="relative group flex flex-col items-center transition-transform active:scale-95"
                title="Download Source Code"
             >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 bg-white/5 text-white/70 hover:bg-white/20 hover:text-white border border-white/5">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                </div>
             </button>

        </div>

        {/* START MODAL */}
        {showStart && (
            <div className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl border border-white/20">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">The Agency OS</h1>
                    <p className="text-gray-500 mb-8">Booting up Simulation #8291...</p>
                    
                    <textarea 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32 mb-4"
                        placeholder="Describe the website you want the team to build..."
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                    />
                    
                    <div className="flex flex-wrap gap-2 mb-8">
                        {DEFAULT_PROMPTS.slice(0, 3).map((p, i) => (
                            <button key={i} onClick={() => setPrompt(p)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors">
                                {p.slice(0, 30)}...
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={handleStart}
                        disabled={!prompt}
                        className="w-full bg-black text-white font-medium py-4 rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
                    >
                        Initialize Agency
                    </button>
                </div>
            </div>
        )}

        {/* SETTINGS MODAL */}
        {showSettings && (
             <div className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowSettings(false)}>
                <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] animate-slide-up" onClick={e => e.stopPropagation()}>
                    
                    <div className="bg-gray-100 border-b border-gray-200 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                             <div className="w-3 h-3 rounded-full bg-red-400"></div>
                             <h2 className="font-bold text-gray-800">Director Controls</h2>
                        </div>
                        <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                             <button onClick={() => setSettingsTab('inject')} className={`px-4 py-1 text-xs font-medium rounded-md transition-all ${settingsTab === 'inject' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Events</button>
                             <button onClick={() => setSettingsTab('cast')} className={`px-4 py-1 text-xs font-medium rounded-md transition-all ${settingsTab === 'cast' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Cast & Crew</button>
                             <button onClick={() => setSettingsTab('display')} className={`px-4 py-1 text-xs font-medium rounded-md transition-all ${settingsTab === 'display' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Display</button>
                        </div>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        
                        {settingsTab === 'inject' && (
                            <>
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Custom Injection</label>
                                    <div className="flex gap-2">
                                        <input 
                                            className="flex-1 border border-gray-300 rounded-lg p-2 text-sm text-gray-900"
                                            placeholder="E.g. 'Client hates blue, make it red!'"
                                            value={customEvent}
                                            onChange={e => setCustomEvent(e.target.value)}
                                        />
                                        <button onClick={() => handleInject(customEvent)} disabled={!customEvent} className="bg-blue-600 text-white px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Inject</button>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Preset Scenarios</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {PRESET_EVENTS.map((evt, i) => (
                                            <button key={i} onClick={() => handleInject(evt.value)} className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 group transition-all">
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="font-bold text-gray-900 text-sm group-hover:text-blue-600">{evt.label}</div>
                                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                </div>
                                                <div className="text-gray-500 text-xs">{evt.value}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {settingsTab === 'cast' && (
                            <div className="space-y-4">
                                {Object.values(CHARACTERS).filter(c => c.id !== 'system').map(char => (
                                    <div key={char.id} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 items-start">
                                         <img 
                                            src={char.avatar} 
                                            onError={(e) => handleImgError(e, char.name)}
                                            className="w-16 h-16 rounded-full bg-white border border-gray-200 shadow-sm shrink-0" 
                                            alt={char.name} 
                                         />
                                         <div>
                                             <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-gray-900 text-lg">{char.name}</h3>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${char.color.replace('bg-', 'bg-opacity-20 bg-')}`}>{char.role}</span>
                                             </div>
                                             <p className="text-sm text-gray-700 leading-relaxed mb-3">{char.bio}</p>
                                         </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {settingsTab === 'display' && (
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setState(s => ({...s, viewportMode: 'responsive'}))} className={`p-4 rounded-xl border text-center transition-all ${!state.viewportMode || state.viewportMode === 'responsive' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-200'}`}>
                                    <div className="font-bold mb-1">Responsive</div>
                                    <div className="text-xs opacity-70">Fit to Window</div>
                                </button>
                                <button onClick={() => setState(s => ({...s, viewportMode: '1080p'}))} className={`p-4 rounded-xl border text-center transition-all ${state.viewportMode === '1080p' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-200'}`}>
                                    <div className="font-bold mb-1">1080p</div>
                                    <div className="text-xs opacity-70">1920 x 1080</div>
                                </button>
                                <button onClick={() => setState(s => ({...s, viewportMode: '1440p'}))} className={`p-4 rounded-xl border text-center transition-all ${state.viewportMode === '1440p' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-200'}`}>
                                    <div className="font-bold mb-1">1440p</div>
                                    <div className="text-xs opacity-70">2560 x 1440</div>
                                </button>
                                <button onClick={() => setState(s => ({...s, viewportMode: '4k'}))} className={`p-4 rounded-xl border text-center transition-all ${state.viewportMode === '4k' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-200'}`}>
                                    <div className="font-bold mb-1">4K</div>
                                    <div className="text-xs opacity-70">3840 x 2160</div>
                                </button>
                            </div>
                        )}

                    </div>
                    
                    <div className="bg-gray-50 p-4 border-t border-gray-200 text-center text-xs text-gray-400">
                        Agency OS v4.1 • Simulation Active
                    </div>
                </div>
             </div>
        )}

    </div>
  );
};

export default App;

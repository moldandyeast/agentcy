
export type CharacterId = 'kevin' | 'ramona' | 'rich' | 'nonsense' | 'marc' | 'system';

export interface Character {
  id: CharacterId;
  name: string;
  role: string;
  avatar: string;
  color: string;
  bio: string;
}

export type WindowId = 'chat' | 'live' | 'code' | 'board' | 'brief' | 'moodboard' | 'music';
export type TabId = 'brief' | 'moodboard' | 'board' | 'code' | 'live';
export type ViewportMode = 'responsive' | '1080p' | '1440p' | '4k';

export interface WindowState {
  id: WindowId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isOpen: boolean;
  scale?: number; // 1 or 2
}

export interface Message {
  id: string;
  characterId: CharacterId;
  content: string; 
  emotion?: string; // For GIFs
  timestamp: number;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  assignee?: CharacterId;
}

export interface MoodboardItem {
  id: string;
  type: 'image' | 'note' | 'color';
  content: string; 
  x: number;
  y: number;
  rotation: number;
  owner?: CharacterId; // Track who created the item (e.g. Marc = Mockup)
}

export interface AgencyState {
  isActive: boolean;
  isPaused: boolean;
  isSfxMuted: boolean; // New state for typing sounds
  brief: string;
  htmlContent: string;
  tasks: Task[];
  messages: Message[];
  moodboard: MoodboardItem[];
  
  // Desktop OS State
  windows: Record<WindowId, WindowState>;
  activeWindowId: WindowId | null;
  viewportMode?: ViewportMode;
  
  currentTab?: TabId;

  turnCount: number;
  consecutiveChatTurns: number; // Tracking for forcing mechanism
  isThinking: boolean;
  
  // Immersion State
  typingCharacter: CharacterId | null;
  typingText: string;
  
  lastSpeaker: CharacterId | null;
  pendingEvent?: string | null; 
}

export type ActionType = 
  | 'update_brief' 
  | 'add_task' 
  | 'move_task' 
  | 'update_code' 
  | 'add_moodboard' 
  | 'generate_image' 
  | 'switch_tab' 
  | 'wait';

export interface DirectorAction {
  speaker: CharacterId;
  message: string;
  thinking: string;
  emotion?: string;
  action: ActionType;
  actionPayload?: {
    content?: string;
    title?: string;
    column?: string;
    taskId?: string;
    type?: string;
    prompt?: string;
    tabId?: string;
  }; 
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

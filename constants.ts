



import { Character, WindowState, WindowId } from './types';

export const CHARACTERS: Record<string, Character> = {
  kevin: {
    id: 'kevin',
    name: 'Kevin',
    role: 'Head of Product',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin&backgroundColor=b6e3f4&eyebrows=worried&mouth=serious',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    bio: 'Deeply anxious about "scope creep". Speaks in corporate metaphors. Obsessed with the Kanban board. His superpower is turning a 1-sentence prompt into a detailed PRD. Always prioritizes "MVP" but secretly wants to be cool.'
  },
  ramona: {
    id: 'ramona',
    name: 'Ramona',
    role: 'Art Director',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ramona&backgroundColor=ffdfbf&style=circle&topType=LongHairBob&accessories=glasses',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    bio: 'Avant-garde visionary. Hates "user friendly" if it means "ugly". Finds inspiration in brutalism, print design, and 90s anime. Will not let Rich code until the vibe is correct. Demands at least 3 mockups before a single div is rendered.'
  },
  rich: {
    id: 'rich',
    name: 'Rich',
    role: 'Design Engineer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rich&backgroundColor=c0aede&facialHair=beardMajestic&topType=ShortHairDreads01',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bio: 'A God-Tier Creative Developer. 10x Engineer. Obsessed with WebGL, shaders, and frame rates. Writes code that looks like poetry. Thinks React is "too heavy" but uses it anyway. Believes a website is never finished, only abandoned. Constantly iterating.'
  },
  nonsense: {
    id: 'nonsense',
    name: '0xNonSense',
    role: 'Growth Hacker',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nonsense&backgroundColor=ffdfbf&topType=WinterHat4&accessories=sunglasses',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    bio: 'Terminally online. Obsessed with "dopamine loops" and "narrative". Speaks entirely in internet slang and crypto-bro dialiect. Writes copy that converts.'
  },
  marc: {
    id: 'marc',
    name: 'Marc',
    role: 'Intern',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marc&backgroundColor=d1d4f9&clothing=hoodie',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    bio: 'Trying his best. Uses AI for everything. Generates weird images. Just happy to be here. The designated "Mockup Generator".'
  },
  system: {
    id: 'system',
    name: 'System',
    role: 'OS',
    avatar: 'https://ui-avatars.com/api/?name=System&background=000&color=fff',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    bio: 'The Agency Operating System'
  }
};

export const INITIAL_WINDOWS: Record<WindowId, WindowState> = {
  chat: {
    id: 'chat', title: 'Agency Chat',
    x: 40, y: 60, width: 380, height: 650, zIndex: 10, isOpen: true, scale: 1
  },
  brief: {
    id: 'brief', title: 'Brief.md',
    x: 440, y: 60, width: 500, height: 400, zIndex: 5, isOpen: true, scale: 1
  },
  live: {
    id: 'live', title: 'Localhost:3000',
    x: 550, y: 100, width: 850, height: 650, zIndex: 8, isOpen: true, scale: 1
  },
  code: {
    id: 'code', title: 'VS Code - index.html',
    x: 150, y: 150, width: 700, height: 500, zIndex: 4, isOpen: false, scale: 1
  },
  board: {
    id: 'board', title: 'Jira Board',
    x: 200, y: 120, width: 700, height: 500, zIndex: 3, isOpen: false, scale: 1
  },
  moodboard: {
    id: 'moodboard', title: 'Figma - Moodboard',
    x: 500, y: 180, width: 700, height: 600, zIndex: 6, isOpen: false, scale: 1
  },
  music: {
    id: 'music', title: 'Winamp',
    x: 60, y: 500, width: 320, height: 320, zIndex: 20, isOpen: true, scale: 1
  },
  tictactoe: {
    id: 'tictactoe', title: 'Tic-Tac-Toe',
    x: 150, y: 200, width: 340, height: 460, zIndex: 30, isOpen: false, scale: 1
  }
};

export const INITIAL_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Agency Workspace</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        body { 
            font-family: 'Space Grotesk', sans-serif; 
            background-color: #050505;
            color: #e5e5e5;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
        }
        .loader {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 2px solid rgba(255,255,255,0.1);
            border-left-color: #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .status {
            margin-top: 20px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            opacity: 0.4;
            animation: pulse 2s infinite;
        }
        @keyframes pulse { 50% { opacity: 0.2; } }
    </style>
</head>
<body>
    <div class="loader">
        <div class="spinner"></div>
        <div class="status">Waiting for Rich to cook...</div>
    </div>
</body>
</html>
`;

export const DEFAULT_PROMPTS = [
  "A brutalist, monochromatic portfolio for a fashion house called 'VOID' that uses large typography and scroll-triggered reveals.",
  "A retro-futuristic dashboard for a space mining corp called 'HELION'. Neon oranges, grid lines, and data visualization.",
  "An ethereal, calming landing page for a meditation app called 'OOM'. Soft gradients, blur effects, and floating elements.",
  "A high-energy, glitch-art promotional site for a cyberpunk rave called 'NEURO-DANCE'. Strobe effects and aggressive typography.",
  "A clean, swiss-style layout for an architectural firm. Grid-based, heavy use of whitespace, and smooth page transitions."
];

export const PRESET_EVENTS = [
  { label: "Client Rage", value: "CLIENT EMAIL: 'This looks too boring! Make it POP! I want animations everywhere!'" },
  { label: "Viral Trend", value: "TREND ALERT: Neumorphism is back? The team needs to debate this." },
  { label: "Server Crash", value: "CRITICAL: The dev server just crashed. Rich needs to fix the config." },
  { label: "Pivot", value: "STRATEGY CHANGE: The client wants to pivot from B2B to D2C immediately." }
];

export const GIF_LIBRARY: Record<string, string[]> = {
  happy: [
    "https://media.giphy.com/media/l0amJbWGZhQXgz900/giphy.gif",
    "https://media.giphy.com/media/Is1O1TWV0LEJi/giphy.gif",
    "https://media.giphy.com/media/chzz1FQgqhVQA/giphy.gif"
  ],
  angry: [
    "https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif",
    "https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif",
    "https://media.giphy.com/media/9u1J84ZtCSl9K/giphy.gif"
  ],
  celebrate: [
    "https://media.giphy.com/media/s2qXK8wAvkHTO/giphy.gif",
    "https://media.giphy.com/media/kyLYXonQYYfwYDIeZl/giphy.gif",
    "https://media.giphy.com/media/nVVVMDEXW90szFjhKi/giphy.gif"
  ],
  confused: [
    "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
    "https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif",
    "https://media.giphy.com/media/xT0xeuOy2Fcl9vDGiA/giphy.gif"
  ],
  tired: [
    "https://media.giphy.com/media/l2JhtKtDWYNKdRpoA/giphy.gif",
    "https://media.giphy.com/media/26ufcVAp3AiJJsrmw/giphy.gif",
    "https://media.giphy.com/media/l41lPVMmb30JO72WA/giphy.gif"
  ],
  working: [
    "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif",
    "https://media.giphy.com/media/unQ3IJU2RG7XMlEVd6/giphy.gif",
    "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif"
  ]
};
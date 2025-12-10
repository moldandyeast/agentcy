
import { GoogleGenAI, Type } from "@google/genai";
import { AgencyState, DirectorAction, CharacterId } from "../types";
import { CHARACTERS, INITIAL_HTML } from "../constants";

// --- Helpers ---

const safeParseJSON = (text: string | undefined): any => {
    if (!text) return null;
    
    // Strategy 1: Clean parse
    try {
        return JSON.parse(text);
    } catch (e) {
        // Continue
    }

    // Strategy 2: Remove Markdown Code Blocks
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        // Continue
    }

    // Strategy 3: Regex Extraction (The "Leet" Fix)
    // Extracts the outermost JSON object if surrounded by text/thoughts
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        // Continue
    }

    console.error("JSON Parse Failed completely on:", text.slice(0, 100) + "...");
    return null;
};

// --- Services ---

export const generateImage = async (prompt: string): Promise<string | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (error) {
        console.error("Image Gen Error:", error);
        return null;
    }
};

// --- PROMPTS ---

const BANTER_SYSTEM_INSTRUCTION = `
You are the scriptwriter for "THE AGENCY", a workplace sitcom about a chaotic design studio.
Your goal: Generate snappy, funny, character-driven dialogue.

CHARACTERS:
- **KEVIN (Product)**: Anxious corporate shill. Loves "alignment".
- **RAMONA (Design)**: Pretentious artist. Hates everything.
- **RICH (Dev)**: Arrogant genius. Condescending.
- **MARC (Intern)**: Clueless but eager.
- **0xNonSense**: Crypto bro.

CONTEXT:
The team is building a website. They should be discussing the brief, the design, or the code.
Keep it short. ONE sentence per turn usually.
`;

const WORK_SYSTEM_INSTRUCTION = `
You are the WORLD'S BEST CREATIVE DIRECTOR AND ENGINEER.
Your goal is to output high-quality JSON actions to build a website.

ROLES:
1. **KEVIN**: Writes the BRIEF (Markdown) or manages TASKS (Kanban).
2. **RICH**: Writes the CODE (HTML/CSS/JS). He is a Creative Developer. He uses Tailwind, GSAP, Three.js, and advanced CSS.
3. **RAMONA/MARC**: Generate IMAGES.
4. **0xNonSense**: Writes "Growth Hacking" copy.

RICH'S CODING STYLE:
- **Single File**: All CSS/JS in index.html.
- **Visuals**: Awwwards winning quality. Large type, smooth gradients, glassmorphism.
- **Motion**: CSS Animations or GSAP are MANDATORY. Nothing static.
- **Layout**: Perfect Flexbox/Grid. Responsive.
- **Navigation**: SINGLE PAGE APP (SPA). Use anchor links (#about, #contact) for navigation. DO NOT use external links.
- **Interactivity**: Buttons must have hover states and active JS effects (e.g. smooth scroll, modals, toggles).

CRITICAL:
- You MUST ADHERE to the BRIEF provided in the context.
- If writing code, it must match the Moodboard and Brief requirements.
- If writing the Brief, make it detailed, professional, and clear.
- **ITERATION**: When asked to update, ADD NEW SECTIONS (e.g., Testimonials, Pricing, FAQ) or IMPROVE VISUALS. Do not just output the same code.

OUTPUT: Return valid JSON matching the schema.
`;

// --- ORCHESTRATOR ---

const decideNextMove = (state: AgencyState): { type: 'banter' | 'work', forcedSpeaker?: CharacterId, context?: string } => {
    // 1. Event Override
    if (state.pendingEvent) {
        return { type: 'work', context: `URGENT EVENT: ${state.pendingEvent}. Team must react.` };
    }

    // 2. Initial Setup (Brief Expansion)
    // If the brief is short (likely just the user prompt), Kevin needs to expand it.
    if (state.brief.length < 200) {
        return { type: 'work', forcedSpeaker: 'kevin', context: "The current brief is just a rough idea. Kevin needs to write a full, detailed PRD/Brief in Markdown format. This is the TOP PRIORITY." };
    }

    // 3. Board Setup
    if (state.tasks.length === 0) {
        return { type: 'work', forcedSpeaker: 'kevin', context: "Kevin needs to populate the Kanban board with tasks based on the Brief." };
    }

    // 4. Design Phase (The Vibe Check)
    // Rule: Rich refuses to code if there are fewer than 3 moodboard items.
    const imageCount = state.moodboard.filter(i => i.type === 'image').length;
    if (imageCount < 3) {
        // If we've been chatting too long, force work.
        if (state.consecutiveChatTurns > 1) {
            const speaker = Math.random() > 0.5 ? 'ramona' : 'marc';
            return { type: 'work', forcedSpeaker: speaker, context: "We need more visual assets before coding. Generate a moodboard image (mockup or inspiration) that matches the Brief." };
        }
        return { type: 'banter', context: "Team discusses visual direction. Ramona complains about lack of soul. They need more ideas before coding." };
    }

    // 5. Build Phase (Rich's Domain)
    if (state.htmlContent === INITIAL_HTML) {
        // First code pass
        return { type: 'work', forcedSpeaker: 'rich', context: "Rich starts the project. Writes the initial skeleton code (Hero + Nav + Basic Layout) based on the Brief and Moodboard." };
    }

    // 6. Continuous Iteration (The Engine)
    
    // Check if there is active work to be done
    const todoTasks = state.tasks.filter(t => t.status === 'todo');
    const inProgressTasks = state.tasks.filter(t => t.status === 'doing');

    // If there is work in progress, Rich needs to finish it.
    if (inProgressTasks.length > 0) {
         // 70% chance to code if something is in progress
         if (Math.random() > 0.3) {
             return { type: 'work', forcedSpeaker: 'rich', context: `Rich needs to finish the task: "${inProgressTasks[0].title}". Update the code to implement this feature fully.` };
         }
    }

    // If we have been chatting for a bit (lowered threshold to 2 to keep momentum), 
    // or randomly if code is still relatively small
    if (state.consecutiveChatTurns >= 2 || (state.htmlContent.length < 5000 && Math.random() > 0.6)) {
        const roll = Math.random();
        
        // 50% Chance: Rich adds a NEW section or feature (Continuous Iteration)
        if (roll < 0.5) {
            const nextFeature = todoTasks.length > 0 ? todoTasks[0].title : "New Section (Pricing or Testimonials)";
            return { type: 'work', forcedSpeaker: 'rich', context: `The website needs more content. Rich adds a new section: "${nextFeature}" or improves the interactivity. Make sure it navigates smoothly.` };
        }
        // 30% Chance: Kevin manages the project
        if (roll < 0.8) {
             if (todoTasks.length === 0) {
                 return { type: 'work', forcedSpeaker: 'kevin', context: "We ran out of tasks. Kevin analyzes the brief/code and adds new tickets for missing sections (e.g. Footer, Contact Form, About Us, Animations)." };
             }
             return { type: 'work', forcedSpeaker: 'kevin', context: "Kevin updates the board. Moves completed items to Done and selects the next Todo item." };
        }
        // 20% Chance: Design Polish
        return { type: 'work', forcedSpeaker: 'ramona', context: "Ramona critiques the spacing and typography. She might generate a new texture or simply demand Rich fix the kerning." };
    }

    // Default: Banter
    return { type: 'banter' };
};

// --- GENERATORS ---

const runBanterTurn = async (state: AgencyState, context?: string): Promise<DirectorAction> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chatHistory = state.messages.slice(-6).map(m => `${m.characterId}: ${m.content}`).join('\n');
    
    const prompt = `
        HISTORY:
        ${chatHistory}
        
        CONTEXT: ${context || "Casual workspace banter about the project."}
        
        Who speaks next? (Speaker must be one of: kevin, ramona, rich, nonsense, marc).
        What do they say?
        Return JSON.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Cheap & Fast
        contents: prompt,
        config: {
            systemInstruction: BANTER_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING },
                    message: { type: Type.STRING },
                    emotion: { type: Type.STRING, enum: ["happy", "angry", "celebrate", "confused", "tired", "working"] },
                },
                required: ["speaker", "message"]
            }
        }
    });

    const result = safeParseJSON(response.text);
    return {
        speaker: (result?.speaker?.toLowerCase() as CharacterId) || 'system',
        message: result?.message || "...",
        thinking: "Bantering...",
        emotion: result?.emotion,
        action: 'wait'
    };
};

const runWorkTurn = async (state: AgencyState, forcedSpeaker?: CharacterId, context?: string): Promise<DirectorAction> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Use Pro model for heavy lifting (coding/reasoning)
    const model = 'gemini-3-pro-preview'; 
    const isCoding = forcedSpeaker === 'rich';
    const isBriefing = forcedSpeaker === 'kevin' && context?.includes("PRD");

    const prompt = `
        CURRENT STATE:
        - Brief: ${state.brief}
        - Tasks: ${state.tasks.map(t => `[${t.status.toUpperCase()}] ${t.title}`).join(', ')}
        - Moodboard Items: ${state.moodboard.length}
        - Code Length: ${state.htmlContent.length}
        
        CONTEXT: ${context || "Progress the project."}
        REQUIRED SPEAKER: ${forcedSpeaker || "Any"}
        
        GENERATE A VALID JSON ACTION.
        If action is 'update_code', provide FULL HTML string in actionPayload.content.
        If action is 'generate_image', provide a descriptive prompt in actionPayload.prompt.
        If action is 'update_brief', provide the full detailed text in actionPayload.content.
    `;

    // High thinking budget for coding, medium for briefing
    // Note: If model is failing to return JSON, budget might be consuming tokens.
    // Adjusted budget to ensure room for output.
    const thinkingBudget = isCoding ? 4096 : (isBriefing ? 2048 : 1024);

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            systemInstruction: WORK_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingBudget }, 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING },
                    thinking: { type: Type.STRING },
                    message: { type: Type.STRING },
                    emotion: { type: Type.STRING },
                    action: { type: Type.STRING, enum: ["update_brief", "add_task", "move_task", "update_code", "add_moodboard", "generate_image", "switch_tab", "wait"] },
                    actionPayload: { 
                        type: Type.OBJECT,
                        properties: {
                            content: { type: Type.STRING }, 
                            title: { type: Type.STRING }, 
                            column: { type: Type.STRING }, 
                            taskId: { type: Type.STRING }, 
                            type: { type: Type.STRING }, 
                            prompt: { type: Type.STRING }, 
                            tabId: { type: Type.STRING }, 
                        } 
                    }
                },
                required: ["speaker", "message", "action"]
            }
        }
    });

    const result = safeParseJSON(response.text);
    if (!result) throw new Error("Work generation produced invalid JSON");

    // Enforce logic
    if (forcedSpeaker && result.speaker.toLowerCase() !== forcedSpeaker) {
        result.speaker = forcedSpeaker;
    }

    return {
        speaker: (result.speaker?.toLowerCase() as CharacterId),
        message: result.message,
        thinking: result.thinking || "Working...",
        emotion: result.emotion,
        action: result.action,
        actionPayload: result.actionPayload
    };
};

const runSafeFallback = async (context: string): Promise<DirectorAction> => {
    // A reliable fallback using the Flash model with strict constraints
    // This ensures that even if the Pro model crashes (timeout/bad json), the app doesn't die.
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Context: ${context}. The main simulation loop crashed. Recover gracefully. 
                       Speak as 'system' or 'kevin'. acknowledge the glitch briefly or just continue work.
                       Return simple JSON: { "speaker": "system", "message": "...", "action": "wait" }`,
            config: {
                responseMimeType: "application/json"
            }
        });
        const result = safeParseJSON(response.text);
        if (result) {
            return {
                speaker: result.speaker || 'system',
                message: result.message || "Recovering from neural glitch...",
                thinking: "Fallback active",
                action: 'wait',
                emotion: 'tired'
            };
        }
    } catch(e) {
        // Absolute last resort
    }
    return {
        speaker: 'system',
        message: "Network jitter detected. Re-calibrating...",
        thinking: "System recovery",
        action: 'wait'
    };
};

export const generateNextTurn = async (
  state: AgencyState,
  audioVibe: string = "Silent"
): Promise<DirectorAction> => {
  
  // 1. The Director decides the strategy
  const strategy = decideNextMove(state);

  try {
      if (strategy.type === 'banter') {
          return await runBanterTurn(state, strategy.context);
      } else {
          return await runWorkTurn(state, strategy.forcedSpeaker, strategy.context);
      }
  } catch (e) {
      console.warn("Primary Turn Generation Failed. Initiating Fallback.", e);
      // Graceful degradation: If the complex "Work" turn failed (likely due to code generation issues),
      // fallback to a simple "Banter" or system message to keep the UI alive.
      return await runSafeFallback(strategy.context || "General error");
  }
};

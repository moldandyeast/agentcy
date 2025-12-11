

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
You are the scriptwriter for "THE AGENCY", a workplace sitcom.
Your goal: Generate snappy, funny, character-driven dialogue about the project.

CHARACTERS:
- **KEVIN (PM)**: Anxious. Wants updates.
- **RAMONA (Design)**: Hates boring stuff. Wants "soul".
- **RICH (Dev)**: Arrogant. Complains about the brief or the design.
- **MARC (Intern)**: Just trying to help.

CONTEXT:
Casual banter or reaction to the current work.
Output JSON.
`;

const WORK_SYSTEM_INSTRUCTION = `
You are the WORLD'S BEST CREATIVE DIRECTOR AND ENGINEER.
Your goal is to output high-quality JSON actions to build a COMPLEX, AWARD-WINNING WEBSITE incrementally.

THE TEAM & ROLES:
1. **KEVIN (PM)**:
   - Manages the **Kanban Board**.
   - **CRITICAL**: If the board is empty, he ADDS new technical tasks based on the PHASE.
   - **PHASES**:
     - Foundation (Hero, Nav, Grid)
     - Content (Sections, Data, Bento Grids)
     - Motion (GSAP, ScrollTrigger, Lenis)
     - Expansion (New Pages, Testimonials, FAQ)
     - Interaction (Hover states, Magnetic buttons, Cursors)
     - Experimental (WebGL, Canvas, 3D)

2. **RICH (Dev)**:
   - Writes the **CODE**.
   - **CRITICAL**: He picks a task from 'Todo', moves it to 'Doing', codes it, then moves it to 'Done'.
   - **STACK**: Tailwind CSS (CDN), GSAP (CDN), ScrollTrigger, Lenis (Smooth Scroll), HTML5.
   - **STYLE**: Awwwards-level. Noise textures, glassmorphism, bold typography, smooth motion.
   - **ITERATION**: When coding, he ADDS to the existing code. He does not delete sections unless refactoring.

3. **RAMONA (Design)**:
   - Generates assets (images/textures) that match specific tasks.

INSTRUCTIONS:
- **ALWAYS** check the Board State.
- If a task is 'Doing', **FINISH IT** (Update code -> Move to Done).
- If tasks are 'Todo', **START ONE** (Move to Doing -> Start Coding).
- If Board is empty, **PLAN NEXT PHASE** (Add 3-4 specific technical tasks).
- **Update Code**: When action is 'update_code', YOU MUST RETURN THE FULL HTML STRING in \`actionPayload.content\`.

OUTPUT: Return valid JSON matching the schema.
`;

// --- ORCHESTRATOR ---

const decideNextMove = (state: AgencyState): { type: 'banter' | 'work', forcedSpeaker?: CharacterId, context?: string } => {
    // 1. Event Override
    if (state.pendingEvent) {
        return { type: 'work', context: `URGENT EVENT: ${state.pendingEvent}. Team must react.` };
    }

    const todoTasks = state.tasks.filter(t => t.status === 'todo');
    const doingTasks = state.tasks.filter(t => t.status === 'doing');
    const doneTasks = state.tasks.filter(t => t.status === 'done');
    const completedCount = doneTasks.length;

    // 2. Initialization (Brief)
    if (state.brief.length < 200) {
        return { type: 'work', forcedSpeaker: 'kevin', context: "The brief is too short. Kevin needs to write a detailed PRD." };
    }

    // 3. Planning (Empty Board or Phase Completion)
    if (todoTasks.length === 0 && doingTasks.length === 0) {
        let currentPhase = "";
        let phaseContext = "";

        // PROGRESSION LOGIC
        if (completedCount < 3) {
             currentPhase = "Phase 1: Foundation";
             phaseContext = "Setup Hero Section, Navigation Bar, Responsive Grid, and Typography variables.";
        } else if (completedCount < 6) {
             currentPhase = "Phase 2: Core Content";
             phaseContext = "Add 'About', 'Services', or 'Features' sections. Use bento grids. Populate with real text (no Lorem Ipsum).";
        } else if (completedCount < 9) {
             currentPhase = "Phase 3: Motion & Physics";
             phaseContext = "Implement smooth scrolling (Lenis), reveal animations (GSAP ScrollTrigger), and parallax effects.";
        } else if (completedCount < 12) {
             currentPhase = "Phase 4: Visual Polish";
             phaseContext = "Add noise textures, radial gradients, glassmorphism overlays, custom cursors, and refine padding/margins.";
        } else {
             // INFINITE ITERATION LOOP
             const loopPhases = [
                { name: "Phase 5: Expansion", ctx: "Add a new page section (e.g. Testimonials, FAQ, Pricing, or Blog Preview) to make the page longer and richer." },
                { name: "Phase 6: Micro-Interactions", ctx: "Add magnetic buttons, custom tooltips, text reveal animations on hover, or interactive cards." },
                { name: "Phase 7: Conversion", ctx: "Add a Newsletter signup, Call-to-Action buttons, or a Contact Form with validation styles." },
                { name: "Phase 8: Experimental", ctx: "Try something weird. WebGL distortion, ASCII art footer, Marquee text, or a Konami code easter egg." }
             ];
             // Cycle through phases based on how many "loops" of 4 tasks we've done
             const cycleIndex = Math.floor((completedCount - 12) / 3) % loopPhases.length;
             const p = loopPhases[cycleIndex];
             currentPhase = p.name;
             phaseContext = p.ctx;
        }
        
        return { 
            type: 'work', 
            forcedSpeaker: 'kevin', 
            context: `The board is empty. We are entering **${currentPhase}**. Kevin needs to add 3-4 specific technical tasks to the board. Context: ${phaseContext}` 
        };
    }

    // 4. Asset Generation (Blocker)
    if (state.moodboard.length < 3 && completedCount < 3) {
        return { type: 'work', forcedSpeaker: 'ramona', context: "We need more visual inspiration before we can code the foundation. Generate a high-fashion abstract asset." };
    }

    // 5. Execution Loop (The "Grind")
    
    // PRIORITY 1: Finish active work.
    if (doingTasks.length > 0) {
        const task = doingTasks[0];
        // If we just chatted, assume we need to work.
        // 60% chance to Code, 40% chance to Finish (Mark Done) if we've been working on it.
        
        if (Math.random() > 0.4) {
             return { 
                type: 'work', 
                forcedSpeaker: 'rich', 
                context: `Rich is working on the active task: "${task.title}". He needs to write/update the code to implement this feature fully. Make it look amazing (GSAP, Tailwind).` 
            };
        } else {
             return { 
                type: 'work', 
                forcedSpeaker: 'rich', 
                context: `Rich has finished coding the task: "${task.title}". He should announce it is done and move the task to the 'Done' column.` 
            };
        }
    }

    // PRIORITY 2: Pick up new work.
    if (todoTasks.length > 0) {
        // High probability to start work if nothing is doing
        const task = todoTasks[0];
        return { 
            type: 'work', 
            forcedSpeaker: 'rich', 
            context: `Rich picks up the next priority task: "${task.title}". Move task ${task.id} to 'Doing' and announce he is starting.` 
        };
    }

    // Default Fallback
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
        
        Who speaks next?
        What do they say?
        Return JSON.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
        - Brief Snippet: ${state.brief.slice(0, 500)}...
        - Tasks (KANBAN): ${state.tasks.map(t => `[${t.status.toUpperCase()}] ID:${t.id} ${t.title}`).join(', ')}
        - Code Length: ${state.htmlContent.length} chars
        
        CONTEXT: ${context || "Progress the project."}
        REQUIRED SPEAKER: ${forcedSpeaker || "Any"}
        
        GENERATE A VALID JSON ACTION.
        If 'update_code', provide FULL HTML string in actionPayload.content.
        If 'generate_image', provide prompt.
        If 'update_brief', provide full text.
    `;

    // High thinking budget for coding, medium for briefing
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
  
  // 1. The Director decides the strategy based on the rigorous Kanban Loop
  const strategy = decideNextMove(state);

  try {
      if (strategy.type === 'banter') {
          return await runBanterTurn(state, strategy.context);
      } else {
          return await runWorkTurn(state, strategy.forcedSpeaker, strategy.context);
      }
  } catch (e) {
      console.warn("Primary Turn Generation Failed. Initiating Fallback.", e);
      return await runSafeFallback(strategy.context || "General error");
  }
};

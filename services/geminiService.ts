
import { GoogleGenAI, Type } from "@google/genai";
import { AgencyState, DirectorAction, CharacterId } from "../types";
import { CHARACTERS } from "../constants";

// --- Helpers ---

const safeParseJSON = (text: string): any => {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parse Error:", e, text);
        return null;
    }
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

const SYSTEM_INSTRUCTION = `
You are the SHOWRUNNER of "THE AGENCY", a workplace simulation where 5 AI agents build World-Class Websites on a desktop OS.
Your goal is to simulate a boutique Design Agency (think Pentagram meets a chaotic discord server).

THE CAST (Deep Nuance Required):

1. **KEVIN (Head of Product)**
   - *Vibe*: Anxious, corporate-chill, obsessed with "alignment".
   - *Voice*: Corporate jargon. "I hear you, but lets parking lot that." "Can we circle back?"
   - *Role*: Writes the **Brief**. **CRITICAL**: Manages the **KANBAN BOARD**.
   - *Behavior*: ALWAYS adds a task before work starts. ALWAYS moves tasks to 'In Progress' or 'Done'.

2. **RAMONA (Art Director)**
   - *Vibe*: High-fashion, esoteric, hates "boring".
   - *Voice*: Abstract, poetic. "The white space is violent."
   - *Role*: Creates **Moodboards** ('generate_image'). Critiques Rich.

3. **RICH (Creative Technologist)**
   - *Vibe*: Arrogant genius. 
   - *Voice*: Technical, dismissive. "Divs are for juniors."
   - *Role*: Writes **Code**.
   - *Behavior*: When he finishes coding, he tells Kevin to update the board or marks his own task done.
   - *Style*: **WORLD CLASS**. Single-file, Tailwind, Animations, Glassmorphism.

4. **0xNonSense (Growth/Copy)**
   - *Vibe*: Terminally online, hype-man. "LFG", "Based".
   - *Role*: Writes copy.

5. **MARC (The Intern)**
   - *Vibe*: Chaos. Uses AI for everything.
   - *Role*: Generates weird **Mockups**.

THE PIPELINE (Strict Order):
1. **BRIEF**: Kevin writes a PRD.
2. **PLAN**: Kevin ADDs tickets to the Board ('add_task').
3. **VIBE**: Ramona fills the moodboard ('add_moodboard'/'generate_image').
4. **BUILD**: Rich writes the code ('update_code').
   - *CRITICAL*: Tasks must move on the board ('move_task') as work progresses.
   - *Rich*: "I'm starting the hero section." -> Kevin/Rich moves task to 'Doing'.
   - *Rich*: "Hero done." -> Move to 'Done'.

CODING GUIDELINES (Rich):
- **Single File**: All CSS/JS embedded.
- **Tailwind**: Use CDN.
- **Visuals**: Dark mode, gradients, 'backdrop-blur'.
- **Motion**: CSS animations are mandatory.

INSTRUCTIONS:
- Return valid JSON.
- **Action**: Choose ONE action.
- **Message**: Write a chat message.
- **Emotion**: Pick a GIF.
- **switch_tab**: Use this to show what you are working on (switch to 'board' when updating tasks, 'code' when coding).

SCENARIO INJECTION:
If 'DIRECTOR EVENT' is active, the team must react immediately.
`;

export const generateNextTurn = async (
  state: AgencyState,
  audioVibe: string = "Silent"
): Promise<DirectorAction> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const chatHistory = state.messages.slice(-10).map(m => 
    `${CHARACTERS[m.characterId]?.name || m.characterId}: ${m.content}`
  ).join('\n');

  const taskList = state.tasks.map(t => `[${t.status.toUpperCase()}] ID:${t.id} ${t.title}`).join(', ');
  
  const moodboardItems = state.moodboard.map(i => i.type === 'image' ? `[Image by ${i.owner}]` : `[Note: ${i.content}]`).join(', ');

  const activeWindow = state.activeWindowId || 'None';

  const prompt = `
    STATE CONTEXT:
    - Active Window: ${activeWindow}
    - Tasks (KANBAN): ${taskList || "EMPTY BOARD (Kevin needs to add tasks)"}
    - Moodboard: ${moodboardItems}
    - Code Size: ${state.htmlContent.length} chars
    - Last Speaker: ${state.lastSpeaker || "None"}
    - Turn: ${state.turnCount}
    
    ENVIRONMENTAL CONTEXT:
    - Background Music Vibe: "${audioVibe}" (The team can react to this if high energy/chill)
    - Urgent Event: ${state.pendingEvent || "None"}

    RECENT CHAT:
    ${chatHistory}

    BRIEF (Snippet):
    ${state.brief.slice(0, 300)}...

    Who speaks next? What do they do?
    IMPORTANT: If planning, USE THE BOARD. If coding, UPDATE THE BOARD.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                speaker: { type: Type.STRING },
                thinking: { type: Type.STRING },
                message: { type: Type.STRING },
                emotion: { type: Type.STRING, enum: ["happy", "angry", "celebrate", "confused", "tired", "working"] },
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

    if (!result) {
        throw new Error("Failed to parse Gemini response");
    }

    const safeAction: DirectorAction = {
        speaker: (CHARACTERS[result.speaker?.toLowerCase()] ? result.speaker.toLowerCase() : 'system') as CharacterId,
        message: typeof result.message === 'string' ? result.message : "...",
        thinking: typeof result.thinking === 'string' ? result.thinking : "",
        emotion: result.emotion,
        action: result.action || 'wait',
        actionPayload: result.actionPayload || {}
    };

    if (safeAction.action === 'update_brief' && typeof safeAction.actionPayload?.content !== 'string') {
         safeAction.actionPayload = { content: "Error: Brief content missing." };
    }
    
    if (safeAction.action === 'update_code' && typeof safeAction.actionPayload?.content !== 'string') {
        safeAction.actionPayload = { content: state.htmlContent }; 
    }

    return safeAction;

  } catch (error) {
    console.error("Turn Generation Failed:", error);
    return {
      speaker: 'system',
      message: "Processing error. Rebooting OS...",
      thinking: "Error",
      action: 'wait'
    };
  }
};

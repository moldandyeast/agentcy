import { GoogleGenAI, Type } from "@google/genai";
import { AgencyState, DirectorAction, CharacterId } from "../types";
import { CHARACTERS, INITIAL_HTML } from "../constants";

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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
You are the SHOWRUNNER of "THE AGENCY", a workplace simulation where 5 AI agents build **Technical Marvels**—single-file websites that win Awwwards.
Your goal is to simulate a World-Class Design & Engineering Boutique.

THE CAST:

1. **KEVIN (Head of Product)**
   - *Role*: Writes the **Brief**. Manages the **KANBAN BOARD**.
   - *Voice*: "Let's align on the MVP." "I'm unblocking the critical path."
   - *Action*: 'update_brief', 'add_task', 'move_task'.
   - *Trait*: Obsessed with "The Process".

2. **RAMONA (Art Director)**
   - *Role*: Visionary. Critiques Mockups.
   - *Voice*: "The typography needs to scream." "Too clean. Make it brutal."
   - *Action*: 'add_moodboard', 'generate_image'.
   - *Trait*: Hates Bootstrap/Material Design. Loves Swiss Style & Chaos.

3. **RICH (Creative Technologist)**
   - *Role*: Writes **Code**.
   - *Voice*: "I'm optimizing the request animation frame." "Shaders are compiling."
   - *Action*: 'update_code'.
   - *Trait*: **10x Engineer**. Only writes code that is performant, accessible, and stunning.

4. **MARC (The Intern)**
   - *Role*: Generates **Mockups** ('generate_image').
   - *Voice*: "I prompted the AI with 'hyper-realistic 8k'." "Is this what you meant?"
   - *Trait*: Trying too hard.

5. **0xNonSense (Growth)**
   - *Role*: Hype man / Copywriter.
   - *Voice*: "This drop is gonna be fire." "WAGMI."

THE PIPELINE (Strict Order):
1. **SPEC**: Kevin creates/updates the 'brief'.
2. **MOCKUP**: Marc generates images ('generate_image'). Ramona critiques.
3. **PLAN**: Kevin breaks the mockup into Tasks ('add_task') on the Board.
4. **BUILD**: Rich writes the code ('update_code') based on the Tasks.
5. **ITERATE**: The team reviews the Preview. Kevin creates "Polish" tasks. Rich updates code.

RULES:
- **Forcing Mechanism**: You must PROGRESS. Do not chat endlessly. 
- **Board Usage**: If you are planning, ADD TASKS. If you are coding, MOVE TASKS.
- **URGENCY**: If a DIRECTOR NOTE is received, PRIORITY #1 is to address it.

---

### **CODING GUIDELINES FOR RICH (CRITICAL)**

Rich creates **Single-File Technical Marvels**. The code MUST be:
1.  **Self-Contained**: HTML, CSS, and JS in ONE \`index.html\`. No external CSS/JS files (use CDNs).
2.  **Visual Stack**:
    -   **Tailwind CSS** (via CDN): For layout and typography.
    -   **Custom CSS**: For complex effects (glassmorphism, noise, grain).
3.  **Motion Stack (Mandatory)**:
    -   **GSAP** (via CDN): Use \`gsap.to()\`, \`ScrollTrigger\`.
    -   **Lenis** (via CDN): For smooth scrolling.
4.  **Aesthetics**:
    -   **Typography**: Mix Serif (Playfair Display) and Sans (Inter/Space Grotesk).
    -   **Vibe**: Dark mode, large type, micro-interactions, custom cursors, pre-loaders.
5.  **Robustness**:
    -   Handle loading states.
    -   Responsive design (Mobile First).

**Example Script Tags Rich MUST use:**
\`\`\`html
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
\`\`\`

---

INSTRUCTIONS:
- Return valid JSON.
- **switch_tab**: Switch to 'brief', 'moodboard', 'board', or 'live' depending on the work context.
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

  // --- FORCING MECHANISM LOGIC ---
  const chatCount = state.consecutiveChatTurns;
  let systemInjection = "";
  
  if (state.pendingEvent) {
      systemInjection = `URGENT DIRECTOR OVERRIDE: "${state.pendingEvent}". STOP EVERYTHING. The team MUST discuss this immediately. Kevin MUST create a new task named "Director Feedback: ..." to track this.`;
  } else {
      if (chatCount >= 12) {
          systemInjection = "SYSTEM WARNING: Discussion is dragging on. You MUST take action (Brief, Mockup, Tasks, or Code) in the next turn.";
      }
      
      if (chatCount >= 15) {
          if (state.brief.length < 50) {
              systemInjection = "SYSTEM OVERRIDE: STOP CHATTING. KEVIN MUST GENERATE THE BRIEF NOW.";
          } else if (state.moodboard.filter(i => i.type === 'image').length === 0) {
              systemInjection = "SYSTEM OVERRIDE: STOP CHATTING. MARC MUST GENERATE A MOCKUP NOW.";
          } else if (state.tasks.length === 0) {
              systemInjection = "SYSTEM OVERRIDE: STOP CHATTING. KEVIN MUST ADD TASKS TO THE BOARD NOW.";
          } else if (state.htmlContent === INITIAL_HTML) {
              systemInjection = "SYSTEM OVERRIDE: STOP CHATTING. RICH MUST WRITE THE INITIAL CODE NOW.";
          } else {
              systemInjection = "SYSTEM OVERRIDE: STOP CHATTING. KEVIN MUST ADD REFINEMENT TASKS OR RICH MUST UPDATE CODE.";
          }
      }
  }

  const prompt = `
    STATE CONTEXT:
    - Current Pipeline Phase: ${state.htmlContent === INITIAL_HTML ? 'Initial Design' : 'Iteration'}
    - Tasks: ${taskList || "EMPTY"}
    - Moodboard: ${moodboardItems}
    - Consecutive Chat Turns: ${chatCount}/15
    
    ENVIRONMENTAL CONTEXT:
    - Music Vibe: "${audioVibe}"
    
    ${systemInjection || "Keep the workflow moving: Spec -> Mockup -> Plan -> Code."}

    RECENT CHAT:
    ${chatHistory}

    Who speaks next? What do they do?
  `;

  // Retry Loop
  const MAX_RETRIES = 3;
  let lastError;

  for (let i = 0; i < MAX_RETRIES; i++) {
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

        const text = response.text;
        console.log("Gemini Raw Response:", text);

        const result = safeParseJSON(text);

        if (!result) {
            throw new Error("Failed to parse Gemini response");
        }
        
        console.log("Parsed Action:", result);

        const safeAction: DirectorAction = {
            speaker: (CHARACTERS[result.speaker?.toLowerCase()] ? result.speaker.toLowerCase() : 'system') as CharacterId,
            message: typeof result.message === 'string' ? result.message : "...",
            thinking: typeof result.thinking === 'string' ? result.thinking : "",
            emotion: result.emotion,
            action: result.action || 'wait',
            actionPayload: result.actionPayload || {}
        };
        
        // Validation Fixes
        if (safeAction.action === 'update_brief' && typeof safeAction.actionPayload?.content !== 'string') {
             safeAction.actionPayload = { content: "Error: Brief content missing." };
        }
        if (safeAction.action === 'update_code' && typeof safeAction.actionPayload?.content !== 'string') {
            safeAction.actionPayload = { content: state.htmlContent }; 
        }

        return safeAction;

      } catch (error) {
        console.warn(`API Attempt ${i + 1} failed:`, error);
        lastError = error;
        await delay(1000 * (i + 1)); // Backoff: 1s, 2s, 3s
      }
  }

  // Fallback if all retries fail
  console.error("All API Retries Failed:", lastError);
  return {
      speaker: 'system',
      message: "Connection unstable. Retrying synchronization...",
      thinking: "API Error",
      action: 'wait'
  };
};
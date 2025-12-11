import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AgencyState, DirectorAction, CharacterId, Task } from "../types";
import { CHARACTERS } from "../constants";

// --- Types ---

type AgencyPhase = 'BRIEFING' | 'IDEATION' | 'PLANNING' | 'EXECUTION' | 'REVIEW' | 'IDLE';

interface Strategy {
    phase: AgencyPhase;
    speaker: CharacterId;
    forcedAction: string;
    context: string;
    model: string;
    schema: Schema;
}

// --- Helpers ---

const safeParseJSON = (text: string | undefined): any => {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (e) {
        try {
            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e2) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        }
    }
    return null;
};

// --- Services ---

export const generateImage = async (prompt: string): Promise<string | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        return null;
    } catch (error) {
        console.error("Image Gen Error:", error);
        return null;
    }
};

// --- STRATEGY ENGINE ---

const determineStrategy = (state: AgencyState): Strategy => {
    const todoTasks = state.tasks.filter(t => t.status === 'todo');
    const doingTasks = state.tasks.filter(t => t.status === 'doing');
    const doneTasks = state.tasks.filter(t => t.status === 'done');
    
    const isBriefShort = state.brief.length < 400; // Expanded briefs are usually long
    const hasInspiration = state.moodboard.length >= 2;
    const hasTasks = state.tasks.length > 0;
    const isWorking = doingTasks.length > 0;

    // 1. BRIEFING PHASE: Kevin expands the user prompt into a PRD
    if (isBriefShort) {
        return {
            phase: 'BRIEFING',
            speaker: 'kevin',
            forcedAction: 'update_brief',
            model: 'gemini-2.5-flash',
            context: `The user provided a short prompt: "${state.brief}". 
                      Your job is to expand this into a detailed Product Requirement Doc (PRD).
                      Include: Target Audience, Core Features, Vibe/Aesthetics, and Tech Constraints.
                      Write it in Markdown. Make it professional but actionable.`,
            schema: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING, enum: ['kevin'] },
                    message: { type: Type.STRING },
                    action: { type: Type.STRING, enum: ['update_brief'] },
                    actionPayload: { 
                        type: Type.OBJECT, 
                        properties: { content: { type: Type.STRING } },
                        required: ['content'] 
                    }
                },
                required: ['speaker', 'message', 'action', 'actionPayload']
            }
        };
    }

    // 2. IDEATION PHASE: Ramona generates assets based on the new Brief
    if (!hasInspiration) {
        return {
            phase: 'IDEATION',
            speaker: 'ramona',
            forcedAction: 'generate_image',
            model: 'gemini-2.5-flash',
            context: `We have a brief but no visuals. Generate a prompt for an abstract, high-fashion, or tech-focused image that captures the VIBE of this project.
                      Brief snippet: ${state.brief.slice(0, 200)}...`,
            schema: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING, enum: ['ramona'] },
                    message: { type: Type.STRING },
                    action: { type: Type.STRING, enum: ['generate_image'] },
                    actionPayload: { 
                        type: Type.OBJECT, 
                        properties: { prompt: { type: Type.STRING } },
                        required: ['prompt'] 
                    }
                },
                required: ['speaker', 'message', 'action', 'actionPayload']
            }
        };
    }

    // 3. PLANNING PHASE: Kevin populates the board
    if (!hasTasks || (todoTasks.length === 0 && !isWorking)) {
        const completedCount = doneTasks.length;
        let phaseName = "Foundation";
        let suggestions = "Hero Section, Navigation, Responsive Grid, Typography Setup";

        if (completedCount > 3) { phaseName = "Content"; suggestions = "Feature Section, Bento Grid, About Text"; }
        if (completedCount > 6) { phaseName = "Motion"; suggestions = "GSAP Animations, Hover Effects, Smooth Scroll"; }

        return {
            phase: 'PLANNING',
            speaker: 'kevin',
            forcedAction: 'add_task',
            model: 'gemini-2.5-flash',
            context: `We are in the **${phaseName}** phase. The Kanban board is empty. 
                      Create a technical task to move the project forward. 
                      Suggestions: ${suggestions}. 
                      Make the title specific (e.g., 'Implement Hero GSAP Animation').`,
            schema: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING, enum: ['kevin'] },
                    message: { type: Type.STRING },
                    action: { type: Type.STRING, enum: ['add_task'] },
                    actionPayload: { 
                        type: Type.OBJECT, 
                        properties: { 
                            title: { type: Type.STRING }, 
                            column: { type: Type.STRING, enum: ['todo'] } 
                        },
                        required: ['title', 'column']
                    }
                },
                required: ['speaker', 'message', 'action', 'actionPayload']
            }
        };
    }

    // 4. EXECUTION PHASE: Rich codes the active task
    if (isWorking) {
        const currentTask = doingTasks[0];
        const isFirstBuild = state.htmlContent.includes("Waiting for Rich");
        
        return {
            phase: 'EXECUTION',
            speaker: 'rich',
            forcedAction: 'update_code',
            model: 'gemini-3-pro-preview', // Use Pro for coding
            context: isFirstBuild 
                ? `URGENT: INITIAL SCAFFOLDING. Replace the spinner with a full HTML5 landing page.
                   Task: ${currentTask.title}.
                   Requirements: Tailwind CSS, Inter Font, Dark Mode, Hero Section, Navigation.
                   Output the FULL content.`
                : `You are working on task: "${currentTask.title}".
                   Update the existing HTML to implement this feature.
                   Do not delete other sections. Iterate on the design.
                   Make it Awwwards-level quality.`,
            schema: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING, enum: ['rich'] },
                    message: { type: Type.STRING },
                    thinking: { type: Type.STRING }, // Rich needs to think
                    action: { type: Type.STRING, enum: ['update_code'] },
                    actionPayload: { 
                        type: Type.OBJECT, 
                        properties: { content: { type: Type.STRING } },
                        required: ['content'] 
                    }
                },
                required: ['speaker', 'message', 'action', 'actionPayload']
            }
        };
    }

    // 5. REVIEW/PICK PHASE: Rich picks up the next task
    // If we have ToDos but nothing Doing, Rich picks one up.
    if (todoTasks.length > 0) {
        const nextTask = todoTasks[0];
        return {
            phase: 'REVIEW',
            speaker: 'rich',
            forcedAction: 'move_task',
            model: 'gemini-2.5-flash',
            context: `You are ready for the next task: "${nextTask.title}".
                      Move it from 'todo' to 'doing'. 
                      Tell the team you are starting.`,
            schema: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING, enum: ['rich'] },
                    message: { type: Type.STRING },
                    action: { type: Type.STRING, enum: ['move_task'] },
                    actionPayload: { 
                        type: Type.OBJECT, 
                        properties: { 
                            taskId: { type: Type.STRING }, 
                            column: { type: Type.STRING, enum: ['doing'] } 
                        },
                        required: ['taskId', 'column']
                    }
                },
                required: ['speaker', 'message', 'action', 'actionPayload']
            }
        };
    }

    // Fallback: Just banter (rarely hit if logic works)
    return {
        phase: 'IDLE',
        speaker: 'nonsense',
        forcedAction: 'wait',
        model: 'gemini-2.5-flash',
        context: "The team is idle. Make a joke about AI taking over.",
        schema: {
            type: Type.OBJECT,
            properties: {
                speaker: { type: Type.STRING },
                message: { type: Type.STRING },
                action: { type: Type.STRING, enum: ['wait'] }
            }
        }
    };
};

// --- ORCHESTRATOR ---

export const generateNextTurn = async (
  state: AgencyState,
  audioVibe: string = "Silent"
): Promise<DirectorAction> => {
  
  // 1. Event Injection Override
  if (state.pendingEvent) {
       // ... (Keep existing logic for event injection if needed, simplified here for robustness)
  }

  // 2. Determine Strict Strategy
  const strategy = determineStrategy(state);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 3. Construct Prompt
  const systemInstruction = `
    You are ${CHARACTERS[strategy.speaker].name} (${CHARACTERS[strategy.speaker].role}).
    Role Bio: ${CHARACTERS[strategy.speaker].bio}
    
    CURRENT GOAL: ${strategy.phase}
    CONTEXT: ${strategy.context}
    
    You MUST execute the action: "${strategy.forcedAction}".
    Return valid JSON.
  `;

  const inputPrompt = `
    Project Brief: ${state.brief.slice(0, 500)}...
    Tasks: ${state.tasks.map(t => `${t.id}:${t.title} [${t.status}]`).join(', ')}
    Current HTML Length: ${state.htmlContent.length} chars.
    
    GENERATE TURN.
  `;

  // 4. Execution with Retries
  let attempts = 0;
  while (attempts < 2) {
      try {
          const response = await ai.models.generateContent({
              model: strategy.model,
              contents: inputPrompt,
              config: {
                  systemInstruction: systemInstruction,
                  responseMimeType: "application/json",
                  responseSchema: strategy.schema,
                  // Only give thinking budget to Rich during execution to save latency
                  thinkingConfig: strategy.phase === 'EXECUTION' ? { thinkingBudget: 2048 } : undefined
              }
          });

          let result = safeParseJSON(response.text);

          // HTML Recovery Fallback
          if (!result && strategy.forcedAction === 'update_code' && response.text.includes("<!DOCTYPE html>")) {
               const htmlMatch = response.text.match(/<!DOCTYPE html>[\s\S]*<\/html>/);
               if (htmlMatch) {
                   result = {
                       speaker: 'rich',
                       message: "Compiling code...",
                       action: 'update_code',
                       actionPayload: { content: htmlMatch[0] }
                   };
               }
          }

          if (result) {
              // Forced Logic Fixes
              if (strategy.phase === 'REVIEW' && strategy.forcedAction === 'move_task') {
                  // Ensure we actually move the correct task
                  const todo = state.tasks.find(t => t.status === 'todo');
                  if (todo) {
                      result.actionPayload.taskId = todo.id;
                      result.actionPayload.column = 'doing';
                  }
              }

              return {
                  speaker: strategy.speaker,
                  message: result.message || "Working...",
                  thinking: result.thinking || "Processing...",
                  emotion: 'working',
                  action: result.action,
                  actionPayload: result.actionPayload
              };
          }
      } catch (e) {
          console.error(`Turn Attempt ${attempts} failed:`, e);
      }
      attempts++;
  }

  return {
      speaker: 'system',
      message: "Connection interrupted. Retrying packet...",
      thinking: "Error",
      action: 'wait'
  };
};
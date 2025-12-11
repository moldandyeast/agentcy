
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
    
    const isBriefShort = state.brief.length < 200; 
    const hasInspiration = state.moodboard.length >= 2;
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

    // 3. EXECUTION PHASE: Multi-Agent Work Loop
    if (isWorking) {
        const currentTask = doingTasks[0];
        const title = currentTask.title.toLowerCase();
        const isFirstBuild = state.htmlContent.includes("Waiting for Rich");

        // --- SUB-AGENT: 0xNonSense (Copywriting) ---
        if (title.includes('copy') || title.includes('text') || title.includes('write') || title.includes('content')) {
             return {
                phase: 'EXECUTION',
                speaker: 'nonsense',
                forcedAction: 'update_code',
                model: 'gemini-2.5-flash', // Flash is fine for copy
                context: `You are 0xNonSense (Growth Hacker). You are working on the task: "${currentTask.title}".
                          Your job is to inject "viral", "hype", or "narrative-driven" copy into the HTML.
                          Replace boring lorem ipsum with something that sounds like a Gen-Z innovative startup.
                          Use slang like "based", "locked in", "shipping".
                          Update the HTML content with your new text.`,
                schema: {
                    type: Type.OBJECT,
                    properties: {
                        speaker: { type: Type.STRING, enum: ['nonsense'] },
                        message: { type: Type.STRING },
                        thinking: { type: Type.STRING },
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

        // --- SUB-AGENT: Marc (Visuals/Mockups) ---
        if (title.includes('mockup') || title.includes('image') || title.includes('visual') || title.includes('icon') || title.includes('asset')) {
            return {
                phase: 'EXECUTION',
                speaker: 'marc',
                forcedAction: 'generate_image',
                model: 'gemini-2.5-flash',
                context: `You are Marc (The Intern). You are working on: "${currentTask.title}".
                          Generate a prompt for an image/asset that fits this task.
                          You use AI for everything. Make the prompt weird but cool.
                          Tell the team you "cooked this up".`,
                schema: {
                    type: Type.OBJECT,
                    properties: {
                        speaker: { type: Type.STRING, enum: ['marc'] },
                        message: { type: Type.STRING },
                        thinking: { type: Type.STRING },
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

        // --- SUB-AGENT: Rich (Engineering) ---
        // Default handler for code, fix, build, feature
        return {
            phase: 'EXECUTION',
            speaker: 'rich',
            forcedAction: 'update_code',
            model: 'gemini-3-pro-preview', // Pro for code
            context: isFirstBuild 
                ? `URGENT: INITIAL SCAFFOLDING. Replace the spinner with a full HTML5 landing page.
                   Task: ${currentTask.title}.
                   Requirements: Tailwind CSS, Inter Font, Dark Mode, Hero Section, Navigation.
                   Output the FULL content.`
                : `You are working on task: "${currentTask.title}".
                   Update the existing HTML to implement this feature.
                   Do not delete other sections unless necessary. Iterate on the design.
                   Make it Awwwards-level quality.`,
            schema: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING, enum: ['rich'] },
                    message: { type: Type.STRING },
                    thinking: { type: Type.STRING },
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

    // 4. PLANNING PHASE: Kevin populates the board
    if (todoTasks.length < 3) {
        const completedCount = doneTasks.length;
        
        // Context for what kind of tasks needed
        let suggestion = "";
        if (completedCount === 0) {
            suggestion = "Create the initial 'Feat: Hero Section' task for Rich.";
        } else {
            // Randomly suggest a specialized task to keep the whole team involved
            const roll = Math.random();
            if (roll < 0.33) {
                suggestion = "Create a 'Copy: [Section Name]' task for 0xNonSense to write viral text.";
            } else if (roll < 0.66) {
                suggestion = "Create a 'Visual: [Asset Name]' task for Marc to generate a mockup/image.";
            } else {
                suggestion = "Create a 'Feat: [Component]' or 'Fix: [Issue]' task for Rich.";
            }
        }

        return {
            phase: 'PLANNING',
            speaker: 'kevin',
            forcedAction: 'add_task',
            model: 'gemini-2.5-flash',
            context: `The backlog is low. You are the PM.
                      ${suggestion}
                      IMPORTANT: Use prefixes 'Feat:', 'Fix:', 'Copy:', or 'Visual:' so the team knows who does what.
                      Keep the team busy.`,
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

    // 5. REVIEW/PICK PHASE: Assigning work
    if (todoTasks.length > 0) {
        // Find a task and the right person for it
        const task = todoTasks[0];
        const title = task.title.toLowerCase();
        
        let targetSpeaker: CharacterId = 'rich';
        if (title.includes('copy') || title.includes('text')) targetSpeaker = 'nonsense';
        else if (title.includes('visual') || title.includes('mockup') || title.includes('image')) targetSpeaker = 'marc';

        return {
            phase: 'REVIEW',
            speaker: targetSpeaker,
            forcedAction: 'move_task',
            model: 'gemini-2.5-flash',
            context: `You see the task "${task.title}" in TODO.
                      This looks like a job for YOU.
                      Move it to 'Doing'.
                      Make a witty comment about why you are the best person for this specific task.`,
            schema: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING, enum: [targetSpeaker] },
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

    // Fallback
    return {
        phase: 'IDLE',
        speaker: 'nonsense',
        forcedAction: 'wait',
        model: 'gemini-2.5-flash',
        context: "The team is idle. Roast Kevin for not adding tasks.",
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
  
  // 1. Determine Strict Strategy
  const strategy = determineStrategy(state);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 2. Chat Vibe Instructions (Sitcom Mode)
  const BANTER_INSTRUCTION = `
    TONE & STYLE:
    - This is a workplace sitcom. 
    - 0xNonSense uses internet slang (fr, ong, based, lfg).
    - Ramona is pretentiously artistic and critical.
    - Rich is arrogant and hates "spaghetti code".
    - Marc is a confused intern trying his best with AI prompts.
    - Kevin speaks in corporate buzzwords (circle back, synergy).
    - INTERACT: Reference previous messages. Roast each other playfully.
  `;

  // 3. Construct Prompt
  const systemInstruction = `
    You are ${CHARACTERS[strategy.speaker].name} (${CHARACTERS[strategy.speaker].role}).
    Role Bio: ${CHARACTERS[strategy.speaker].bio}
    
    ${BANTER_INSTRUCTION}

    CURRENT GOAL: ${strategy.phase}
    CONTEXT: ${strategy.context}
    
    You MUST execute the action: "${strategy.forcedAction}".
    Return valid JSON.
  `;

  const inputPrompt = `
    Project Brief: ${state.brief.slice(0, 500)}...
    Tasks: ${state.tasks.map(t => `${t.id}:${t.title} [${t.status}]`).join(', ')}
    Current HTML Length: ${state.htmlContent.length} chars.
    Last Speaker: ${state.lastSpeaker}
    Audio Vibe: ${audioVibe}
    
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
                  // Only give thinking budget to Rich during coding execution to save latency/cost
                  thinkingConfig: strategy.speaker === 'rich' && strategy.forcedAction === 'update_code' ? { thinkingBudget: 2048 } : undefined
              }
          });

          let result = safeParseJSON(response.text);

          // HTML Recovery Fallback
          if (!result && strategy.forcedAction === 'update_code' && response.text.includes("<!DOCTYPE html>")) {
               const htmlMatch = response.text.match(/<!DOCTYPE html>[\s\S]*<\/html>/);
               if (htmlMatch) {
                   result = {
                       speaker: strategy.speaker,
                       message: "Deploying update...",
                       action: 'update_code',
                       actionPayload: { content: htmlMatch[0] }
                   };
               }
          }

          if (result) {
              // Forced Logic Fixes for Task IDs
              if (strategy.phase === 'REVIEW' && strategy.forcedAction === 'move_task') {
                  const targetId = result.actionPayload.taskId;
                  const validTask = state.tasks.find(t => t.id === targetId && t.status === 'todo');
                  
                  if (!validTask) {
                      const firstTodo = state.tasks.find(t => t.status === 'todo');
                      if (firstTodo) {
                           result.actionPayload.taskId = firstTodo.id;
                           result.actionPayload.column = 'doing';
                      }
                  } else {
                      result.actionPayload.column = 'doing';
                  }
              }

              return {
                  speaker: strategy.speaker,
                  message: result.message || "...",
                  thinking: result.thinking || "",
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
      message: "Packet loss detected. Reconnecting...",
      thinking: "Error",
      action: 'wait'
  };
};

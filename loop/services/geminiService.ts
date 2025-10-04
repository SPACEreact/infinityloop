import { MASTER_PROMPT } from '../constants';
import { knowledgeBase } from './knowledgeService';

const ENV_GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY ?? '').trim();
const GEMINI_API_KEY = ENV_GEMINI_API_KEY;
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_API_URL = `${GEMINI_API_BASE_URL}/models/gemini-2.5-flash:generateContent`;
export const isMockMode = !GEMINI_API_KEY;

export interface GeminiResult<T> {
  data: T | null;
  error: string | null;
  isMock: boolean;
}

const createResult = <T>(data: T | null, error: string | null, isMock: boolean): GeminiResult<T> => ({
  data,
  error,
  isMock
});

const KNOWLEDGE_CONTEXT = `

# Your Knowledge Base (Film Production & Storytelling)

${knowledgeBase.fullContext}

Use this knowledge base to inform your responses, provide expert cinematography advice, suggest story structures, and help with all aspects of film production.
`;

const LOOP_SIGNATURE = 'Loop Studio Mock Feed';
const MOCK_IMAGE_PLACEHOLDER = 'iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAHElEQVR42mNgGAWjYBSMglEwCkbBqNgUjIJRMAAAUwABnVh6hAAAAABJRU5ErkJggg==';

const TAG_WEIGHT_THRESHOLD = 0;

const prominentTags = (tagWeights: Record<string, number>) =>
  Object.entries(tagWeights || {})
    .filter(([, weight]) => weight > TAG_WEIGHT_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, weight]) => `${tag} (${Math.round(weight * 100)}%)`)
    .join(', ');

const createMockChatResponse = (
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  tagWeights: Record<string, number>,
  styleRigidity: number
): string => {
  const lastAssistantBeat = [...conversationHistory].reverse().find(msg => msg.role === 'assistant');
  const tagSummary = prominentTags(tagWeights);
  const tone = styleRigidity > 50 ? 'precise and director-level exacting' : 'playful and exploratory';

  return [
    '🎬 **Loop Sandbox (Mock Mode)**',
    'The Gemini API key is missing, so you are exploring a simulated conversation trail.',
    lastAssistantBeat
      ? `Last note I dropped: _"${lastAssistantBeat.content.slice(0, 120)}${lastAssistantBeat.content.length > 120 ? '…' : ''}"_`
      : 'This is our first beat together in the sandbox.',
    `Your latest cue: “${userMessage}”`,
    tagSummary ? `Creative gravity is orbiting **${tagSummary}**.` : 'No weighted tags yet, so I am freestyling within Loop’s cinematic instincts.',
    `I will keep the vibe ${tone}.`,
    '',
    'Here’s a Loop-flavored sketch you can riff on:',
    '• Snapshot the emotional tone in one sentence.',
    '• Suggest a cinematography move that matches the beat.',
    '• Offer a micro-task the director could try next.',
    '',
    '_This answer is synthesized offline by Loop for quick iteration._'
  ].join('\n');
};

const summarizeAssets = (project: {
  assets: Array<{ id: string; type: string; name: string; content: string; tags: string[] }>;
}) => {
  if (!project.assets?.length) return 'No assets pinned yet—this build starts from a clean slate.';
  return project.assets
    .slice(0, 4)
    .map(asset => `• **${asset.name}** (${asset.type}) — tags: ${asset.tags.join(', ') || 'none'}`)
    .join('\n');
};

const createMockWorkspaceResponse = (
  project: {
    assets: Array<{ id: string; type: string; name: string; content: string; tags: string[] }>;
  },
  outputType: string,
  tagWeights: Record<string, number>,
  styleRigidity: number
): string => {
  const tagSummary = prominentTags(tagWeights);
  const controlNote = styleRigidity > 50 ? 'tight blocking and continuity-first pacing.' : 'improvised beats and texture-forward imagery.';

  return [
    `🎞️ **${LOOP_SIGNATURE} — ${outputType.toUpperCase()} Mock Output**`,
    'Gemini is offline, so Loop is sketching a placeholder deliverable.',
    '',
    'Project Snapshot:',
    summarizeAssets(project),
    tagSummary ? `Weighted focus: ${tagSummary}.` : 'No weighted tags supplied.',
    `Style dial suggests ${controlNote}`,
    '',
    'What you get in this mock:',
    '1. A logline-style framing of the current material.',
    '2. A visual or narrative flourish inspired by Loop’s knowledge base.',
    '3. A next-step action so you can move the story or design forward.',
    '',
    '_Swap in a Gemini API key to replace this with live generations._'
  ].join('\n');
};

const createMockBuildResponse = (
  buildType: string,
  answers: Record<string, string>,
  sandboxContext: Record<string, string>
): string => {
  const answeredKeys = Object.keys(answers || {});
  const contextKeys = Object.keys(sandboxContext || {});

  return [
    `🧪 **${LOOP_SIGNATURE} — ${buildType.toUpperCase()} Mock Build**`,
    'The build system is in rehearsal mode because Gemini credentials are offline.',
    answeredKeys.length
      ? `Captured answers: ${answeredKeys.slice(0, 5).join(', ')}${answeredKeys.length > 5 ? ', …' : ''}`
      : 'No structured answers recorded for this build yet.',
    contextKeys.length
      ? `Sandbox context cues: ${contextKeys.slice(0, 5).join(', ')}${contextKeys.length > 5 ? ', …' : ''}`
      : 'Sandbox context is empty—perfect for quick sketching.',
    '',
    'Mock deliverable outline:',
    '• Reiterate the core intent of this build.',
    '• Offer a cinematic or storytelling beat to explore.',
    '• Suggest how to translate the idea into the next tangible asset.',
    '',
    '_Enable Gemini to replace this with real-time builds._'
  ].join('\n');
};

const friendlyErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return `${fallback} (${error.message})`;
  }
  if (typeof error === 'string') {
    return `${fallback} (${error})`;
  }
  return fallback;
};

// Retry utility function
async function retryApiCall<T>(fn: () => Promise<T>, retries = 3, baseDelay = 1000): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      if (i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`API call failed, retrying in ${delay}ms... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError!;
}

// Types
export interface GenerationRequest {
  contents: Array<{
    parts: Array<{ text: string }>;
  }>;
}

export interface GenerationResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

// Mock function for sandbox chat responses
export const listModels = async (): Promise<any> => {
  try {
    const response = await fetch(`${GEMINI_API_BASE_URL}/models?key=${GEMINI_API_KEY}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ListModels API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: unknown) {
    console.error('ListModels API Error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to list models from AI service: ${error.message}`);
    } else {
      throw new Error('Failed to list models from AI service: Unknown error');
    }
  }
};

export const generateSandboxResponse = async (
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  tagWeights: Record<string, number>,
  styleRigidity: number
): Promise<GeminiResult<string>> => {
  const historyText = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const systemPromptBase = `${MASTER_PROMPT}${KNOWLEDGE_CONTEXT}`;

  let systemPrompt = `${systemPromptBase}\n\n`;
  const weightedTags = Object.entries(tagWeights || {})
    .filter(([, weight]) => weight > TAG_WEIGHT_THRESHOLD)
    .map(([tag, weight]) => `${tag} (importance: ${Math.round(weight * 100)}%)`)
    .join(', ');
  if (weightedTags) {
    systemPrompt += `Focus on these elements: ${weightedTags}. `;
  }
  systemPrompt += styleRigidity > 50
    ? 'Be precise and adhere strictly to guidelines. Use knowledge base extensively. '
    : 'Be creative and flexible in your responses. Draw inspiration from knowledge base. ';

  const fullPrompt = `${systemPrompt}\n\nConversation History:\n${historyText}\n\nUser: ${userMessage}\nAssistant:`;

  if (isMockMode) {
    return createResult(createMockChatResponse(userMessage, conversationHistory, tagWeights, styleRigidity), null, true);
  }

  try {
    const data = await retryApiCall(async () => {
      const request: GenerationRequest = {
        contents: [{
          parts: [{ text: fullPrompt }]
        }]
      };

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const json: GenerationResponse = await response.json();
      return json.candidates[0]?.content.parts[0]?.text?.trim() ?? '';
    });

    if (!data) {
      return createResult(null, 'Gemini returned an empty response. Try adjusting your prompt and running it again.', false);
    }

    return createResult(data, null, false);
  } catch (error: unknown) {
    const message = friendlyErrorMessage(error, 'We hit a snag connecting to Gemini. Please verify your API key and try again.');
    return createResult(null, message, false);
  }
};

export const generateFromWorkspace = async (
  project: {
    assets: Array<{ id: string; type: string; name: string; content: string; tags: string[] }>;
    canvas: {
      nodes: Array<{ id: string; assetId: string; position: { x: number; y: number }; size: number }>;
      connections: Array<{ from: string; to: string; type: 'harmony' | 'tension'; harmonyLevel: number }>;
    };
  },
  tagWeights: Record<string, number>,
  styleRigidity: number,
  outputType: string
): Promise<GeminiResult<string>> => {
  if (isMockMode) {
    return createResult(createMockWorkspaceResponse(project, outputType, tagWeights, styleRigidity), null, true);
  }

  let systemPrompt = `${MASTER_PROMPT}${KNOWLEDGE_CONTEXT}\n\nGenerate ${outputType} content based on the provided project workspace. `;
  const weightedTags = Object.entries(tagWeights || {})
    .filter(([, weight]) => weight > TAG_WEIGHT_THRESHOLD)
    .map(([tag, weight]) => `${tag} (importance: ${Math.round(weight * 100)}%)`)
    .join(', ');
  if (weightedTags) {
    systemPrompt += `Focus on these elements: ${weightedTags}. `;
  }
  systemPrompt += styleRigidity > 50
    ? 'Be precise and adhere strictly to guidelines. Use knowledge base extensively. '
    : 'Be creative and flexible in your responses. Draw inspiration from knowledge base. ';

  const assetsText = project.assets
    .map(asset => `${asset.type}: ${asset.name} - ${asset.content} (tags: ${asset.tags.join(', ')})`)
    .join('\n');

  const canvasText = project.canvas.connections.length
    ? `Canvas connections: ${project.canvas.connections
        .map(conn => {
          const from = project.canvas.nodes.find(n => n.id === conn.from)?.assetId ?? 'unknown';
          const to = project.canvas.nodes.find(n => n.id === conn.to)?.assetId ?? 'unknown';
          return `${conn.type} connection from ${from} to ${to} (harmony: ${conn.harmonyLevel}%)`;
        })
        .join('; ')}`
    : 'Canvas connections: none recorded yet.';

  const fullPrompt = `${systemPrompt}\n\nProject Assets:\n${assetsText}\n\nCanvas Structure:\n${canvasText}\n\nGenerate ${outputType} output:`;

  try {
    const data = await retryApiCall(async () => {
      const request: GenerationRequest = {
        contents: [{
          parts: [{ text: fullPrompt }]
        }]
      };

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const json: GenerationResponse = await response.json();
      return json.candidates[0]?.content.parts[0]?.text?.trim() ?? '';
    });

    if (!data) {
      return createResult(null, 'Gemini returned an empty workspace response. Please try again with refreshed inputs.', false);
    }

    return createResult(data, null, false);
  } catch (error: unknown) {
    const message = friendlyErrorMessage(error, 'Unable to generate from the workspace right now. Double-check your Gemini setup and retry.');
    return createResult(null, message, false);
  }
};

export const runBuild = async (
  buildType: string,
  answers: Record<string, string>,
  sandboxContext: Record<string, string>,
  tagWeights: Record<string, number>,
  styleRigidity: number
): Promise<GeminiResult<string>> => {
  if (isMockMode) {
    return createResult(createMockBuildResponse(buildType, answers, sandboxContext), null, true);
  }

  let systemPrompt = `${MASTER_PROMPT}${KNOWLEDGE_CONTEXT}\n\nProcess the ${buildType} build with the provided answers. Use knowledge base to inform your output. `;
  const weightedTags = Object.entries(tagWeights || {})
    .filter(([, weight]) => weight > TAG_WEIGHT_THRESHOLD)
    .map(([tag, weight]) => `${tag} (importance: ${Math.round(weight * 100)}%)`)
    .join(', ');
  if (weightedTags) {
    systemPrompt += `Focus on these elements: ${weightedTags}. `;
  }
  systemPrompt += styleRigidity > 50
    ? 'Be precise and adhere strictly to guidelines. '
    : 'Be creative and flexible in your responses. ';

  const answersText = Object.entries(answers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  const sandboxText = Object.entries(sandboxContext)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const fullPrompt = `${systemPrompt}\n\nAnswers:\n${answersText}\n\nSandbox Context:\n${sandboxText}\n\nGenerate ${buildType} output:`;

  try {
    const data = await retryApiCall(async () => {
      const request: GenerationRequest = {
        contents: [{
          parts: [{ text: fullPrompt }]
        }]
      };

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const json: GenerationResponse = await response.json();
      return json.candidates[0]?.content.parts[0]?.text?.trim() ?? '';
    });

    if (!data) {
      return createResult(null, `Gemini returned an empty ${buildType} build response. Try again in a moment.`, false);
    }

    return createResult(data, null, false);
  } catch (error: unknown) {
    const message = friendlyErrorMessage(error, `We couldn't finish the ${buildType} build. Check your Gemini credentials and retry.`);
    return createResult(null, message, false);
  }
};

export const generateImageFromPrompt = async (prompt: string): Promise<GeminiResult<string>> => {
  const IMAGEN_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict';

  if (isMockMode) {
    const mockCaption = [
      `🖼️ **${LOOP_SIGNATURE} — Mock Image Placeholder**`,
      'Gemini image generation is offline, so here’s a placeholder tile for quick comps.',
      `Prompt captured: ${prompt}`,
      '',
      'Swap in a valid API key to stream real renders.'
    ].join('\n');
    return createResult(JSON.stringify({ prompt, notes: mockCaption, placeholder: true, image: MOCK_IMAGE_PLACEHOLDER }), null, true);
  }

  const enhancedPrompt = `${prompt}\n\nDraw from cinematography and visual storytelling expertise when generating this image.`;

  try {
    const base64Image = await retryApiCall(async () => {
      const request = {
        prompt: {
          text: enhancedPrompt
        },
        sampleCount: 1,
        outputOptions: {
          mimeType: 'image/png'
        }
      };

      const response = await fetch(`${IMAGEN_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (data.predictions && data.predictions.length > 0) {
        return data.predictions[0].bytesBase64Encoded as string;
      }
      throw new Error('No image returned from model');
    });

    if (!base64Image) {
      return createResult(null, 'Gemini returned an empty image payload. Try again with a tweaked prompt.', false);
    }

    return createResult(base64Image, null, false);
  } catch (error: unknown) {
    const message = friendlyErrorMessage(error, 'Image generation is unavailable right now. Confirm your Gemini configuration and retry.');
    return createResult(null, message, false);
  }
};

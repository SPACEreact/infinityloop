import { MASTER_PROMPT } from '../constants';
import { apiConfig, DEFAULT_GEMINI_BASE_URL } from './config';
import { knowledgeBase } from './knowledgeService';

const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
const FALLBACK_TEXT_MODEL = 'gemini-1.5-flash-latest';
const DEFAULT_IMAGE_MODEL = 'imagen-4.5-ultra';
const FALLBACK_IMAGE_MODEL = 'imagen-3.0-latest';

export const isMockMode = !apiConfig.isConfigured('gemini');

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

type GeminiCredentials = {
  baseUrl: string;
  apiKey: string;
};

const getGeminiCredentials = (): GeminiCredentials | null => {
  const config = apiConfig.getConfigByName('gemini');
  const apiKey = config?.apiKey?.trim();

  if (!apiKey) {
    return null;
  }

  const baseUrl = (config?.baseUrl?.trim() || DEFAULT_GEMINI_BASE_URL).replace(/\/$/, '');

  return {
    baseUrl: baseUrl || DEFAULT_GEMINI_BASE_URL,
    apiKey
  };
};

const parseResponseJson = async (response: Response, requestDescription: string): Promise<any> => {
  const rawText = await response.text();
  let parsed: any;

  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      parsed = undefined;
    }
  }

  if (!response.ok) {
    const message = `${requestDescription} failed: ${response.status} ${response.statusText}${rawText ? ` - ${rawText}` : ''}`;
    const error = new Error(message);
    (error as { status?: number }).status = response.status;
    if (parsed && typeof parsed === 'object') {
      (error as { error?: unknown }).error = parsed;
    }
    throw error;
  }

  if (parsed === undefined) {
    if (!rawText.trim()) {
      return {};
    }
    throw new Error(`${requestDescription} returned an unexpected response format.`);
  }

  return parsed;
};

const shouldUseFallbackModel = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : '';

  if (message.includes('quota') && (message.includes('exceeded') || message.includes('exhausted'))) {
    return true;
  }

  if (message.includes('permission denied') || message.includes('not found')) {
    return true;
  }

  const status = typeof error === 'object' && error ? (error as { status?: number }).status : undefined;
  if (status === 429 || status === 403 || status === 404) {
    return true;
  }

  const payload = typeof error === 'object' && error ? (error as { error?: { status?: string; code?: number } }).error : undefined;
  if (payload) {
    const payloadStatus = payload.status?.toLowerCase();
    if (payloadStatus && (payloadStatus.includes('resource_exhausted') || payloadStatus.includes('permission_denied') || payloadStatus.includes('not_found'))) {
      return true;
    }

    if (typeof payload.code === 'number' && (payload.code === 429 || payload.code === 403 || payload.code === 404)) {
      return true;
    }
  }

  return false;
};

const normalizeModelName = (model: string): string => (model.startsWith('models/') ? model : `models/${model}`);

const extractTextFromResponse = (data: any): string => {
  const candidates = data?.candidates;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts;
      if (Array.isArray(parts)) {
        const combined = parts
          .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
          .filter(Boolean)
          .join('\n')
          .trim();
        if (combined) {
          return combined;
        }
      }
      const text = typeof candidate?.content?.text === 'string' ? candidate.content.text.trim() : '';
      if (text) {
        return text;
      }
    }
  }

  if (typeof data?.text === 'string' && data.text.trim()) {
    return data.text.trim();
  }

  throw new Error('No text content returned from model');
};

const extractImageDataFromResponse = (data: any): string => {
  const candidates = data?.candidates;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          const inline = part?.inlineData || part?.inline_data;
          const base64 = inline?.data || inline?.base64Data || inline?.imageBytes;
          if (typeof base64 === 'string' && base64.trim()) {
            return base64;
          }
        }
      }
    }
  }

  const images = data?.images;
  if (Array.isArray(images)) {
    for (const image of images) {
      const base64 = image?.imageBytes || image?.imageData || image?.base64Data;
      if (typeof base64 === 'string' && base64.trim()) {
        return base64;
      }
    }
  }

  const image = data?.image;
  if (image) {
    const base64 = image?.imageBytes || image?.imageData || image?.base64Data;
    if (typeof base64 === 'string' && base64.trim()) {
      return base64;
    }
  }

  const dataArray = data?.data;
  if (Array.isArray(dataArray)) {
    for (const item of dataArray) {
      const base64 = item?.b64_json || item?.imageBytes || item?.base64Data;
      if (typeof base64 === 'string' && base64.trim()) {
        return base64;
      }
    }
  }

  throw new Error('No image data returned from model');
};

const requestGeminiContent = async (credentials: GeminiCredentials, prompt: string, model: string): Promise<string> => {
  const normalizedBase = credentials.baseUrl.replace(/\/$/, '');
  const normalizedModel = normalizeModelName(model);
  const url = `${normalizedBase}/${normalizedModel}:generateContent?key=${encodeURIComponent(credentials.apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  const data = await parseResponseJson(response, 'Gemini text request');
  return extractTextFromResponse(data);
};

const requestGeminiImage = async (credentials: GeminiCredentials, prompt: string, model: string): Promise<string> => {
  const normalizedBase = credentials.baseUrl.replace(/\/$/, '');
  const normalizedModel = normalizeModelName(model);
  const url = `${normalizedBase}/${normalizedModel}:generateImage?key=${encodeURIComponent(credentials.apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: {
        text: prompt
      },
      imageGenerationConfig: {
        numberOfImages: 1
      }
    })
  });

  const data = await parseResponseJson(response, 'Gemini image request');
  return extractImageDataFromResponse(data);
};

const requestTextWithFallback = async (
  prompt: string,
  preferredModel: string = DEFAULT_TEXT_MODEL
): Promise<{ text: string; modelUsed: string; usedFallback: boolean }> => {
  const credentials = getGeminiCredentials();
  if (!credentials) {
    throw new Error('Gemini API key is not configured');
  }

  try {
    const text = await requestGeminiContent(credentials, prompt, preferredModel);
    return { text, modelUsed: preferredModel, usedFallback: false };
  } catch (error) {
    if (!shouldUseFallbackModel(error) || preferredModel === FALLBACK_TEXT_MODEL) {
      throw error;
    }

    const fallbackText = await requestGeminiContent(credentials, prompt, FALLBACK_TEXT_MODEL);
    return { text: fallbackText, modelUsed: FALLBACK_TEXT_MODEL, usedFallback: true };
  }
};

const requestImageWithFallback = async (
  prompt: string,
  preferredModel: string = DEFAULT_IMAGE_MODEL
): Promise<{ image: string; modelUsed: string; usedFallback: boolean }> => {
  const credentials = getGeminiCredentials();
  if (!credentials) {
    throw new Error('Gemini API key is not configured');
  }

  try {
    const image = await requestGeminiImage(credentials, prompt, preferredModel);
    return { image, modelUsed: preferredModel, usedFallback: false };
  } catch (error) {
    if (!shouldUseFallbackModel(error) || preferredModel === FALLBACK_IMAGE_MODEL) {
      throw error;
    }

    const fallbackImage = await requestGeminiImage(credentials, prompt, FALLBACK_IMAGE_MODEL);
    return { image: fallbackImage, modelUsed: FALLBACK_IMAGE_MODEL, usedFallback: true };
  }
};

const ADDITIONAL_MODELS = [
  {
    name: 'models/gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    description: 'High-performance model with increased quota for text generation',
    supportedGenerationMethods: ['generateContent'],
    maxTokens: 2097152,
    capabilities: ['text']
  },
  {
    name: 'models/gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Fast model with high quota for quick responses',
    supportedGenerationMethods: ['generateContent'],
    maxTokens: 1048576,
    capabilities: ['text']
  },
  {
    name: 'models/imagen-4.5-ultra',
    displayName: 'Imagen 4.5 Ultra',
    description: 'Ultra-high quality image generation model',
    supportedGenerationMethods: ['generateContent'],
    capabilities: ['image']
  },
  {
    name: 'models/imagen-4.5-pro',
    displayName: 'Imagen 4.5 Pro',
    description: 'Professional image generation with high quota',
    supportedGenerationMethods: ['generateContent'],
    capabilities: ['image']
  },
  {
    name: 'models/imagen-4.5-flash',
    displayName: 'Imagen 4.5 Flash',
    description: 'Fast image generation with good quota',
    supportedGenerationMethods: ['generateContent'],
    capabilities: ['image']
  },
  {
    name: 'models/gemini-1.5-flash-latest',
    displayName: 'Gemini 1.5 Flash (Free Tier - Latest)',
    description: 'Latest free tier text generation model for quota fallbacks',
    supportedGenerationMethods: ['generateContent'],
    capabilities: ['text']
  },
  {
    name: 'models/claude-3.5-sonnet-free',
    displayName: 'Claude 3.5 Sonnet - Free Tier',
    description: 'Free tier for text generation with limited quota',
    supportedGenerationMethods: ['generateContent'],
    capabilities: ['text']
  },
  {
    name: 'models/imagen-3.0-latest',
    displayName: 'Imagen 3.0 (Free Tier - Latest)',
    description: 'Latest free tier image generation model for quota fallbacks',
    supportedGenerationMethods: ['generateContent'],
    capabilities: ['image']
  },
  {
    name: 'models/stable-diffusion-3-free',
    displayName: 'Stable Diffusion 3 - Free Tier',
    description: 'Free tier for image generation with limited quota',
    supportedGenerationMethods: ['generateContent'],
    capabilities: ['image']
  },
  {
    name: 'models/dall-e-3-free',
    displayName: 'DALL-E 3 - Free Tier',
    description: 'Free tier for image generation with limited quota',
    supportedGenerationMethods: ['generateContent'],
    capabilities: ['image']
  }
];

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

// Mock function for sandbox chat responses
export const listModels = async (): Promise<any> => {
  const credentials = getGeminiCredentials();
  if (!credentials) {
    throw new Error('Gemini API key is not configured');
  }

  try {
    const baseUrl = credentials.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/models?key=${encodeURIComponent(credentials.apiKey)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await parseResponseJson(response, 'Gemini models request');
    const models = Array.isArray(data?.models) ? data.models : [];

    return {
      models: [...models, ...ADDITIONAL_MODELS]
    };
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

  try {
    const { text } = await requestTextWithFallback(fullPrompt);
    return createResult(text, null, false);
  } catch (error: unknown) {
    console.warn('Gemini chat generation failed, falling back to mock mode:', error);
    return createResult(createMockChatResponse(userMessage, conversationHistory, tagWeights, styleRigidity), null, true);
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
  let systemPrompt = `${MASTER_PROMPT}${KNOWLEDGE_CONTEXT}\n\nGenerate ${outputType} content based on the provided project workspace. `;
  if (outputType === 'Master Story') {
    systemPrompt += `
      The output should be a comprehensive story document that includes the following sections:
      1.  **Logline:** A one-sentence summary of the story.
      2.  **Synopsis:** A short paragraph (3-5 sentences) summarizing the plot.
      3.  **Key Scene:** A short script or screenplay for a pivotal scene (1-2 pages).
    `;
  }
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
    const { text } = await requestTextWithFallback(fullPrompt);
    return createResult(text, null, false);
  } catch (error: unknown) {
    console.warn('Gemini workspace generation failed, falling back to mock mode:', error);
    return createResult(createMockWorkspaceResponse(project, outputType, tagWeights, styleRigidity), null, true);
  }
};

export const runBuild = async (
  buildType: string,
  answers: Record<string, string>,
  sandboxContext: Record<string, string>,
  tagWeights: Record<string, number>,
  styleRigidity: number
): Promise<GeminiResult<string>> => {
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
    const { text } = await requestTextWithFallback(fullPrompt);
    return createResult(text, null, false);
  } catch (error: unknown) {
    console.warn('Gemini build generation failed, falling back to mock mode:', error);
    return createResult(createMockBuildResponse(buildType, answers, sandboxContext), null, true);
  }
};

export const generateImageFromPrompt = async (prompt: string, model: string = 'imagen-4.5-ultra'): Promise<GeminiResult<string>> => {
  const enhancedPrompt = `${prompt}\n\nDraw from cinematography and visual storytelling expertise when generating this image.`;

  try {
    const { image } = await requestImageWithFallback(enhancedPrompt, model);
    return createResult(image, null, false);
  } catch (error: unknown) {
    console.warn('Gemini image generation failed, falling back to mock mode:', error);
    const mockCaption = [
      `🖼️ **${LOOP_SIGNATURE} — Mock Image Placeholder**`,
      'Gemini image generation is offline, so here is a placeholder tile for quick comps.',
      `Prompt captured: ${prompt}`,
      `Model: ${model}`,
      '',
      'Swap in a valid API key to stream real renders.'
    ].join('\n');
    return createResult(
      JSON.stringify({ prompt, model, notes: mockCaption, placeholder: true, image: MOCK_IMAGE_PLACEHOLDER }),
      null,
      true
    );
  }
};

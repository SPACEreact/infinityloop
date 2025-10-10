export type PromptConversionConfig = {
  id: string;
  displayName: string;
  summary: string;
  promptFormat: string;
  notes?: string;
};

const createConversion = (
  id: string,
  displayName: string,
  summary: string,
  promptFormat: string,
  notes?: string
): PromptConversionConfig => ({ id, displayName, summary, promptFormat, notes });

export const PROMPT_CONVERSIONS: Record<string, PromptConversionConfig> = {
  midjourney: createConversion(
    'midjourney',
    'MidJourney',
    'Optimized for cinematic still images with strong composition cues.',
    'subject: [Character or object], setting: [Environment], mood: [Emotion and lighting], camera: [Camera type and lens], lighting: [Style], color: [Palette or hex codes], props: [Key props or motifs], seed: [Seed ID or continuity note]',
    'Emphasize cinematic composition rules (rule of thirds, symmetry, negative space) and texture or atmosphere when relevant.'
  ),
  sora: createConversion(
    'sora',
    'Sora',
    'Generates motion clips; needs action, duration, and camera movement.',
    'action: [Primary action], camera_movement: [Pan/Track/Dolly/etc.], perspective: [POV, wide, close-up], duration: [Clip length], lighting: [Mood + technique], environment: [Backdrop and texture], continuity: [Seed ID or carryover note]',
    'Include beats for motion continuity and mention whether to keep or mutate seeds from previous shots.'
  ),
  'veo-3': createConversion(
    'veo-3',
    'Veo 3 / Seedance',
    'Video diffusion focused on sequential shots and transitions.',
    'shot_type: [Framing], lens: [Camera + focal length], sequence_id: [Seed or continuity ID], transition: [Cut, dissolve, etc.], lighting: [Style + key ratios], color: [Grading or hex codes], continuity: [Carryover instructions]',
    'Reference previous shot IDs for continuity and highlight any mutations or new beats to introduce.'
  ),
};

export const PROMPT_CONVERSION_OPTIONS = Object.values(PROMPT_CONVERSIONS).map(config => ({
  value: config.id,
  label: config.displayName,
  description: config.summary,
}));

export const getPromptConversion = (modelId?: string | null): PromptConversionConfig | null => {
  if (!modelId) {
    return null;
  }

  const normalized = modelId.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return PROMPT_CONVERSIONS[normalized] ?? null;
};

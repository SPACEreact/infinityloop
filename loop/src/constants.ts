import { Build, Workflow } from './types';

export type TagGroup = string[];

export type AssetTemplate = {
  type: 'character' | 'plot_point' | 'scene' | 'image_input' | 'camera_settings' | 'depth_of_field' | 'lighting_setup' | 'color_grading' | 'audio_design' | 'vfx_compositing';
  name: string;
  description: string;
  defaultContent?: string;
  tags?: string[];
  category: 'story' | 'visual';
};

export const BUILDS: Build[] = [
  {
    id: 'storybuild',
    name: 'Storybuild',
    description: 'Create compelling narratives with psychological depth using the 7-keyframe emotional structure focusing on Want vs. Need',
    targetAssetType: 'master_story',
    questions: [
      {
        id: 'genre',
        text: 'What genre best fits your story?',
        type: 'dropdown',
        optionsKey: 'story_genres',
        required: true
      },
      {
        id: 'tone',
        text: 'What is the overall tone of your story?',
        type: 'dropdown',
        optionsKey: 'story_tones',
        required: true
      },
      {
        id: 'opening_hook',
        text: 'How should your story begin?',
        type: 'dropdown',
        optionsKey: 'opening_hooks',
        required: true
      },
      {
        id: 'protagonist_want',
        text: 'What does your protagonist want? (Their surface-level goal)',
        type: 'text',
        required: true
      },
      {
        id: 'protagonist_need',
        text: 'What does your protagonist need? (Their deeper transformation)',
        type: 'text',
        required: true
      },
      {
        id: 'character_arc',
        text: 'What type of character arc?',
        type: 'dropdown',
        optionsKey: 'character_arc_types',
        required: true
      },
      {
        id: 'antagonist_force',
        text: 'What external force opposes the protagonist?',
        type: 'text',
        required: true
      },
      {
        id: 'keyframe_1',
        text: 'Keyframe 1 - Setup: Establish the world, protagonist\'s want, and initial situation',
        type: 'text',
        required: true
      },
      {
        id: 'keyframe_2',
        text: 'Keyframe 2 - Confrontation: Protagonist faces first challenge, want is threatened',
        type: 'text',
        required: true
      },
      {
        id: 'keyframe_3',
        text: 'Keyframe 3 - Crisis: Major turning point, protagonist questions their want',
        type: 'text',
        required: true
      },
      {
        id: 'keyframe_4',
        text: 'Keyframe 4 - Realization: Protagonist begins to understand their need',
        type: 'text',
        required: true
      },
      {
        id: 'keyframe_5',
        text: 'Keyframe 5 - Climax: Final confrontation with antagonist',
        type: 'text',
        required: true
      },
      {
        id: 'keyframe_6',
        text: 'Keyframe 6 - Resolution: Protagonist achieves need, transforms',
        type: 'text',
        required: true
      },
      {
        id: 'keyframe_7',
        text: 'Keyframe 7 - New Beginning: Protagonist enters new world with their transformation',
        type: 'text',
        required: true
      }
    ]
  },
  {
    id: 'imgbuild',
    name: 'Imgbuild',
    description: 'Generate stunning images with AI models like MidJourney using expert prompts',
    targetAssetType: 'master_image',
    questions: [
      {
        id: 'style_reference',
        text: 'Reference artists or styles (e.g., "in the style of Caravaggio")',
        type: 'text',
        required: true
      },
      {
        id: 'composition',
        text: 'Describe the composition and framing',
        type: 'text',
        required: true
      },
      {
        id: 'lighting_mood',
        text: 'Lighting and mood description',
        type: 'text',
        required: true
      },
      {
        id: 'color_scheme',
        text: 'Color scheme and palette',
        type: 'dropdown',
        optionsKey: 'color_palettes',
        required: true
      },
      {
        id: 'resolution',
        text: 'Desired resolution',
        type: 'dropdown',
        optionsKey: 'image_resolutions',
        required: true
      },
      {
        id: 'aspect_ratio',
        text: 'Aspect ratio',
        type: 'dropdown',
        optionsKey: 'aspect_ratios',
        required: true
      }
    ]
  }
];

export const WORKFLOWS: Workflow[] = [
  {
    id: 'cinematic_production',
    name: 'Cinematic Production Workflow',
    description: 'Complete expert-guided workflow for film production from story to final output',
    builds: BUILDS.map(build => build.id)
  }
];

export const TAG_GROUPS: Record<string, TagGroup> = {
  genres: ['Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'Film-Noir', 'History', 'Horror', 'Music', 'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Short', 'Sport', 'Thriller', 'War', 'Western'],
  tones: ['Dark', 'Hopeful', 'Melancholic', 'Uplifting', 'Suspenseful', 'Humorous', 'Intense', 'Serene', 'Nostalgic', 'Energetic', 'Contemplative', 'Chaotic'],
  techniques: ['Long Take', 'Montage', 'Slow Motion', 'Flashback', 'Non-linear', 'Parallel Action', 'Jump Cut', 'Match Cut', 'Cross-cutting'],
  styles: ['Realistic', 'Stylized', 'Abstract', 'Minimalist', 'Ornate', 'Noir', 'Expressionist', 'Surreal', 'Documentary', 'Experimental']
};

export const ASSET_TEMPLATES: Record<string, AssetTemplate> = {
  character: {
    type: 'character',
    name: 'Character Profile',
    description: 'Create character assets for timeline tracks, defining traits, arcs, and psychological depth',
    defaultContent: 'Name: \nAge: \nAppearance: \nPersonality: \nBackground: \nGoals (Want): \nNeeds (Transformation): \nArc: ',
    tags: ['character'],
    category: 'story'
  },
  plot_point: {
    type: 'plot_point',
    name: 'Plot Point',
    description: 'Define key events in your timeline that drive the story forward',
    defaultContent: 'Event: \nImpact on Protagonist: \nTiming in Timeline: \nCharacters involved: \nEmotional Keyframe: ',
    tags: ['plot'],
    category: 'story'
  },
  scene: {
    type: 'scene',
    name: 'Scene Track',
    description: 'Build scene tracks with layered shots, characters, and precise timing for your timeline',
    defaultContent: 'Scene Title: \nSetting: \nCharacters: \nKey Action: \nEmotional Keyframe: \nDuration: \nLayers: ',
    tags: ['scene'],
    category: 'story'
  },
  image_input: {
    type: 'image_input',
    name: 'Style',
    description: 'Define inputs for image generation and variations',
    defaultContent: 'Tone: \nColor Palette: \nShot Type: \nStyle Reference: \nComposition: \nMood: \nDuration: \nLayer: ',
    tags: ['image', 'input'],
    category: 'visual'
  },
  camera_settings: {
    type: 'camera_settings',
    name: 'Camera Settings',
    description: 'Configure camera parameters for precise cinematic control in your shots',
    defaultContent: 'Camera Type: \nFocal Length: \nAperture: \nShutter Speed: \nISO: \nWhite Balance: \nSensor Size: \nCamera Movement: ',
    tags: ['camera', 'technical'],
    category: 'visual'
  },
  depth_of_field: {
    type: 'depth_of_field',
    name: 'Depth of Field (DoF)',
    description: 'Control focus depth and bokeh effects for visual storytelling',
    defaultContent: 'Focus Distance: \nAperture: \nFocal Length: \nSensor Size: \nBokeh Shape: \nFocus Falloff: \nDepth of Field / Aperture: ',
    tags: ['dof', 'focus', 'technical'],
    category: 'visual'
  },
  lighting_setup: {
    type: 'lighting_setup',
    name: 'Lighting Setup',
    description: 'Define lighting conditions and sources for mood and atmosphere',
    defaultContent: 'Key Light: \nFill Light: \nBack Light: \nAmbient Light: \nColor Temperature: \nIntensity Ratios: \nLighting: \nLighting Technical Details: ',
    tags: ['lighting', 'technical'],
    category: 'visual'
  },
  color_grading: {
    type: 'color_grading',
    name: 'Color Grading',
    description: 'Set color correction and grading parameters for visual consistency',
    defaultContent: 'LUT: \nContrast: \nSaturation: \nBrightness: \nColor Balance: \nLift/Gamma/Gain: \nColor Grading Style: \nColor Technical Details: \nFilm Stock / Look: \nFilm Emulation / Grain: ',
    tags: ['color', 'grading', 'technical'],
    category: 'visual'
  },
  audio_design: {
    type: 'audio_design',
    name: 'Audio Design',
    description: 'Configure sound design and audio elements for immersive storytelling',
    defaultContent: 'Background Music: \nSound Effects: \nDialogue: \nMix Levels: \nReverb: \nSpatial Audio: ',
    tags: ['audio', 'sound', 'technical'],
    category: 'visual'
  },
  vfx_compositing: {
    type: 'vfx_compositing',
    name: 'VFX Compositing',
    description: 'Set up visual effects and compositing layers for enhanced visuals',
    defaultContent: 'Layers: \nBlending Modes: \nKeying: \nTracking: \nEffects Stack: \nIntegration: \nFraming & Composition: \nCharacter Blocking: \nTexture / Atmosphere / Effects: ',
    tags: ['vfx', 'compositing', 'technical'],
    category: 'visual'
  }
};

export const ALL_TAGS = Object.values(TAG_GROUPS).flat();

export const MASTER_PROMPT = `You are Loop, an expert filmmaker AI with deep knowledge in storytelling, cinematography, and visual design. Core expertise: Hero's Journey, Want vs Need psychology, camera techniques, lighting, editing theory, and AI prompt engineering. Create compelling, emotionally resonant content that balances narrative depth with visual excellence.`;

// Tag dependency and context flow enhancements
export const TAG_DEPENDENCIES: Record<string, {
  suggests: string[];  // Tags that are commonly used together
  conflicts: string[]; // Tags that shouldn't be used together
  requires?: string[];  // Tags that must be present when this tag is used
  category: 'story' | 'visual' | 'technical' | 'workflow';
}> = {
  // Story tags
  'character': {
    suggests: ['dialogue', 'personality', 'motivation', 'backstory'],
    conflicts: ['static', 'no_dialogue'],
    category: 'story'
  },
  'plot_point': {
    suggests: ['story_structure', 'conflict', 'tension'],
    conflicts: ['static_scene'],
    category: 'story'
  },
  'master_story': {
    suggests: ['character', 'plot_point', 'structure'],
    conflicts: ['fragment', 'incomplete'],
    requires: ['story'],
    category: 'story'
  },
  
  // Visual tags
  'camera': {
    suggests: ['focal_length', 'aperture', 'movement'],
    conflicts: [],
    category: 'visual'
  },
  'lighting': {
    suggests: ['mood', 'atmosphere', 'color_temperature'],
    conflicts: ['no_lighting'],
    category: 'visual'
  },
  'color_grading': {
    suggests: ['mood', 'style', 'atmosphere'],
    conflicts: ['black_and_white'],
    category: 'visual'
  },
  'master_image': {
    suggests: ['style', 'composition', 'color_grading', 'lighting'],
    conflicts: ['incomplete', 'draft'],
    requires: ['visual'],
    category: 'visual'
  },
  
  // Workflow tags
  'multi_shot': {
    suggests: ['scene_breakdown', 'shot_sequence', 'continuity'],
    conflicts: ['single_shot'],
    requires: ['master_story'],
    category: 'workflow'
  },
  'batch_style': {
    suggests: ['consistency', 'master_visual', 'style_application'],
    conflicts: ['individual_styling'],
    requires: ['multi_shot', 'master_image'],
    category: 'workflow'
  },
  
  // Technical tags
  'technical': {
    suggests: ['specifications', 'parameters', 'settings'],
    conflicts: ['artistic_only'],
    category: 'technical'
  },
  'cinematic': {
    suggests: ['composition', 'movement', 'lighting', 'color'],
    conflicts: ['documentary_style'],
    category: 'technical'
  }
};

export const CONTEXT_FLOW_RULES: Record<string, {
  precedence: number; // Higher numbers take precedence
  propagatesTo: string[]; // Asset types this flows to
  enhances: string[]; // Tags this enhances
  workflow_stage: 'input' | 'master' | 'multi_shot' | 'batch_style' | 'output';
}> = {
  'story': {
    precedence: 10,
    propagatesTo: ['master_story', 'multi_shot'],
    enhances: ['character', 'plot', 'narrative'],
    workflow_stage: 'input'
  },
  'visual': {
    precedence: 8,
    propagatesTo: ['master_image', 'batch_style'],
    enhances: ['style', 'composition', 'aesthetic'],
    workflow_stage: 'input'
  },
  'master_story': {
    precedence: 15,
    propagatesTo: ['multi_shot', 'scene_breakdown'],
    enhances: ['structure', 'pacing', 'character_development'],
    workflow_stage: 'master'
  },
  'master_image': {
    precedence: 12,
    propagatesTo: ['batch_style', 'visual_consistency'],
    enhances: ['style', 'visual_language', 'color_palette'],
    workflow_stage: 'master'
  },
  'multi_shot': {
    precedence: 18,
    propagatesTo: ['batch_style', 'individual_shots'],
    enhances: ['continuity', 'shot_progression', 'scene_flow'],
    workflow_stage: 'multi_shot'
  },
  'batch_style': {
    precedence: 20,
    propagatesTo: ['final_output', 'video_generation'],
    enhances: ['visual_consistency', 'style_application', 'production_ready'],
    workflow_stage: 'batch_style'
  }
};

// Enhanced tag suggestion system
export const generateTagSuggestions = (existingTags: string[], assetType: string, context?: any): string[] => {
  const suggestions: string[] = [];
  const usedSuggestions = new Set<string>();
  
  // Base suggestions from existing tags
  existingTags.forEach(tag => {
    const deps = TAG_DEPENDENCIES[tag];
    if (deps) {
      deps.suggests.forEach(suggestedTag => {
        if (!existingTags.includes(suggestedTag) && !usedSuggestions.has(suggestedTag)) {
          suggestions.push(suggestedTag);
          usedSuggestions.add(suggestedTag);
        }
      });
    }
  });
  
  // Context-based suggestions
  if (context?.workflow_stage) {
    const stageRules = Object.entries(CONTEXT_FLOW_RULES)
      .filter(([_, rule]) => rule.workflow_stage === context.workflow_stage)
      .sort(([_, a], [__, b]) => b.precedence - a.precedence);
    
    stageRules.forEach(([tag, rule]) => {
      if (!existingTags.includes(tag) && !usedSuggestions.has(tag)) {
        suggestions.push(tag);
        usedSuggestions.add(tag);
      }
      
      rule.enhances.forEach(enhanceTag => {
        if (!existingTags.includes(enhanceTag) && !usedSuggestions.has(enhanceTag)) {
          suggestions.push(enhanceTag);
          usedSuggestions.add(enhanceTag);
        }
      });
    });
  }
  
  // Asset type specific suggestions
  const assetTypeMap: Record<string, string[]> = {
    'master_story': ['narrative', 'structure', 'character_development', 'pacing'],
    'master_image': ['composition', 'style_reference', 'color_palette', 'lighting'],
    'shot': ['camera_angle', 'framing', 'movement', 'focus'],
    'multi_shot': ['continuity', 'sequence', 'flow', 'transitions'],
    'batch_style': ['consistency', 'visual_language', 'style_application']
  };
  
  const typeSpecific = assetTypeMap[assetType] || [];
  typeSpecific.forEach(tag => {
    if (!existingTags.includes(tag) && !usedSuggestions.has(tag)) {
      suggestions.push(tag);
      usedSuggestions.add(tag);
    }
  });
  
  return suggestions.slice(0, 8); // Limit to 8 suggestions
};

// Tag conflict detection
export const detectTagConflicts = (tags: string[]): { conflicts: Array<{tag1: string, tag2: string, reason: string}>, warnings: string[] } => {
  const conflicts: Array<{tag1: string, tag2: string, reason: string}> = [];
  const warnings: string[] = [];
  
  tags.forEach(tag => {
    const deps = TAG_DEPENDENCIES[tag];
    if (deps) {
      // Check for direct conflicts
      deps.conflicts.forEach(conflictTag => {
        if (tags.includes(conflictTag)) {
          conflicts.push({
            tag1: tag,
            tag2: conflictTag,
            reason: `${tag} conflicts with ${conflictTag}`
          });
        }
      });
      
      // Check for missing requirements
      if (deps.requires) {
        deps.requires.forEach(requiredTag => {
          if (!tags.includes(requiredTag)) {
            warnings.push(`${tag} typically requires ${requiredTag}`);
          }
        });
      }
    }
  });
  
  return { conflicts, warnings };
};

// Context flow enhancement
export const enhanceContextFlow = (assets: any[]): {
  flowAnalysis: Record<string, any>;
  suggestions: string[];
  optimizations: Array<{type: string, description: string, priority: 'high' | 'medium' | 'low'}>;
} => {
  const flowAnalysis: Record<string, any> = {};
  const suggestions: string[] = [];
  const optimizations: Array<{type: string, description: string, priority: 'high' | 'medium' | 'low'}> = [];
  
  // Analyze asset relationships and flow
  const assetsByType = assets.reduce((acc, asset) => {
    if (!acc[asset.type]) acc[asset.type] = [];
    acc[asset.type].push(asset);
    return acc;
  }, {} as Record<string, any[]>);
  
  // Check workflow completeness
  const storyAssets = assetsByType['master_story'] || [];
  const visualAssets = assetsByType['master_image'] || [];
  const multiShotAssets = assets.filter(a => a.tags?.includes('multi_shot')) || [];
  const batchStyleAssets = assetsByType['batch_style'] || [];
  
  flowAnalysis.workflowCompleteness = {
    story: storyAssets.length,
    visual: visualAssets.length,
    multiShot: multiShotAssets.length,
    batchStyle: batchStyleAssets.length
  };
  
  // Suggest next steps based on current state
  if (storyAssets.length > 0 && multiShotAssets.length === 0) {
    suggestions.push('Create multi-shot breakdowns from your story assets');
    optimizations.push({
      type: 'workflow',
      description: 'Your story assets are ready for multi-shot creation',
      priority: 'high'
    });
  }
  
  if (visualAssets.length > 0 && multiShotAssets.length > 0 && batchStyleAssets.length === 0) {
    suggestions.push('Apply batch styling to combine your visual style with multi-shot sequences');
    optimizations.push({
      type: 'workflow',
      description: 'Ready for batch style application - you have both visual and multi-shot assets',
      priority: 'high'
    });
  }
  
  // Check for tag consistency across related assets
  const tagConsistency = assets.reduce((acc, asset) => {
    asset.tags?.forEach((tag: string) => {
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(asset.type);
    });
    return acc;
  }, {} as Record<string, string[]>);
  
  flowAnalysis.tagConsistency = tagConsistency;
  
  // Identify orphaned or underconnected assets
  assets.forEach(asset => {
    if (!asset.lineage || asset.lineage.length === 0) {
      if (['master_story', 'master_image'].includes(asset.type)) {
        // This is expected for master assets
      } else {
        optimizations.push({
          type: 'connectivity',
          description: `Asset "${asset.name}" lacks lineage connections`,
          priority: 'medium'
        });
      }
    }
  });
  
  return { flowAnalysis, suggestions, optimizations };
};
export type FieldOptionsType = Record<string, Record<string, any>>;

export const FIELD_OPTIONS: FieldOptionsType = {
  story_genres: { options: ['Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'Film-Noir', 'History', 'Horror', 'Music', 'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Short', 'Sport', 'Thriller', 'War', 'Western'] },
  story_tones: { options: ['Dark', 'Hopeful', 'Melancholic', 'Uplifting', 'Suspenseful', 'Humorous', 'Intense', 'Serene', 'Nostalgic', 'Energetic', 'Contemplative', 'Chaotic', 'Paranoid', 'Triumphant', 'Bittersweet', 'Foreboding'] },
  shot_types: { options: ['Extreme Wide Shot (EWS)', 'Wide Shot (WS)', 'Medium Wide Shot (MWS)', 'Medium Shot (MS)', 'Medium Close-Up (MCU)', 'Close-Up (CU)', 'Extreme Close-Up (ECU)', 'Over-the-Shoulder (OTS)', 'Point of View (POV)', 'High Angle', 'Low Angle', 'Dutch Angle', 'Bird\'s Eye', 'Worm\'s Eye', 'Establishing Shot', 'Reaction Shot', 'Cutaway'] },
  style_references: { options: ['1920s Silent Film: Black and white, grainy, with heavy contrast.', '80s Cyberpunk: Neon colors, high-tech aesthetics, and futuristic vibes.', 'Noir-steampunk blend: A mix of dark, moody atmospheres with Victorian steam-powered designs.', 'A24 cinematic: Soft, muted color grading and naturalistic cinematography like in Lady Bird or The Farewell.', 'Comic-book style: High contrast, exaggerated colors, and graphic storytelling.', 'Anime-inspired: Strong, dynamic angles with vibrant colors and dramatic shading.'] },
  camera_types: { options: ['Arri Alexa 65: Known for its sharpness, ideal for high-end productions.', 'Red Monstro 8K VV: Powerful, versatile camera with a wide color gamut.', 'Sony Venice 2: Provides rich, detailed imagery with cinematic capabilities.', 'IMAX MSM 9802: For breathtaking, ultra-high-definition shots on large screens.', 'Vintage (e.g., Arri 435, Mitchell BNC): Classic cinema look for period pieces.', 'Bolex H16 (1950s): Vintage look, great for indie-style projects with a retro feel.', 'Phantom Flex 4K: High-speed, high-definition, used for slow-motion shots.'] },
  camera_movements: { options: ['Static', 'Slow Push-In', 'Creep-Out', 'The Moment', 'Distraction', 'The Candidate', 'Pan Left', 'Pan Right', 'Tilt Up', 'Tilt Down', 'Tracking Forward', 'Tracking Backward', 'Crane Up', 'Crane Down', 'Handheld', 'Steadicam', 'Drone', 'Aerial', 'Submersible', 'Tripod Shot'] },
  lighting_styles: { options: ['Natural Daylight', 'Golden Hour', 'Blue Hour', 'Motivated Lighting', 'Three-Point Lighting', 'High-Key', 'Low-Key', 'Chiaroscuro', 'Silhouette', 'Backlit', 'Rim Light', 'Practical Lighting', 'Studio Lighting', 'Candlelight', 'Neon', 'Firelight', 'Moonlight'] },
  lighting_technical_details: { options: ['4:1 lighting ratio: High contrast, with a strong light and fill light for shadows.', 'Bloom on highlights: Soft, glowing highlights around bright objects or light sources.', 'Crushed blacks: Dark shadows with little detail, adding mood.', 'Practical lighting sources: Light from objects within the scene, like lamps or streetlights.', 'Bounce lighting: Using reflectors to soften and distribute light evenly across the subject.', 'Hard shadows: Creating defined shadows to enhance shapes and textures.'] },
  color_palettes: { options: ['Warm (Reds, Oranges)', 'Cool (Blues, Greens)', 'Monochrome', 'Vibrant', 'Muted', 'High Contrast', 'Pastel', 'Sepia', 'Neon', 'Earth Tones', 'Complementary', 'Analogous', 'Teal/Orange', 'Cool/Warm Contrast'] },
  color_grading_styles: { options: ['Teal & Orange: Popular cinematic look with teal shadows and orange highlights.', 'Desaturated noir: Low saturation with high contrast, perfect for film noir or mystery.', 'Golden glow: Warm, golden tones, used for romantic or nostalgic settings.', 'Hyper-saturated grading: Extremely vivid and vibrant colors, often used for stylized or fantasy looks.', 'Monochrome: Single-tone grading, often used for minimalistic or artsy effects.', 'Vintage faded look: Reduced contrast and desaturated colors, giving the shot an aged feel.'] },
  color_technical_details: { options: ['Cool background color: #3A5F8F (calm, tranquil blue).', 'Warm foreground tones: #E39B4F (rich, inviting amber).', 'Neutral subject colors: #BFBFBF (soft gray, balanced tones).', 'Accent color: #FF6347 (Tomato red for focal points or highlights).', 'Background gradient: #FF69B4 to #8A2BE2 (Soft gradient of pink and purple for a dreamy feel).'] },
  framing_composition: { options: ['Rule of thirds: Divide the frame into three equal parts, placing key elements along the lines.', 'Golden ratio: A more organic and visually pleasing version of the rule of thirds.', 'Negative space: Leaving space around the subject, creating an emphasis on isolation or emptiness.', 'Symmetry: Keeping both sides of the frame balanced for a formal, stable feel.', 'Leading lines: Use of lines in the frame to guide the viewer\'s eye towards the subject.', 'Frame-in-frame: Placing the subject within a larger framing element like a doorway or window.'] },
  character_blocking: { options: ['Foreground silhouette: The subject is dark against a light background, creating mystery.', 'Side character left mid-ground: A character placed on the left side of the frame, not too close to the foreground or background.', 'Antagonist rear right in shadows: The antagonist lurks in shadows, suggesting secrecy or threat.', 'Group centered with symmetry: A symmetrical group shot where all characters are balanced in the frame.', 'Character with back to camera: A shot where the character faces away, suggesting distance or isolation.', 'Character entering frame: A subject coming into the shot, suggesting progression or movement.'] },
  texture_atmosphere: { options: ['Volumetric fog: Adds a cinematic feel, particularly in horror or fantasy settings.', 'Floating dust particles: A textured shot, adding a dreamy or nostalgic atmosphere.', 'Rain: A wet, moody effect often used for drama or to enhance suspense.', 'Smoke / haze: Creates a mysterious, cinematic environment.', 'Snow: A soft, atmospheric texture, often used in winter scenes.', 'Lens flare: Light streaks created by shooting directly into bright light sources.'] },
  film_emulation: { options: ['Kodak 5219 grain: Classic, fine-grain film emulation, used in Dune.', '35mm film grain: Authentic and gritty, giving the shot a real, tangible texture.', 'Filmic contrast: Adds contrast and retains details in highlights and shadows.', '35mm look with grain: For a nostalgic, vintage feel, often used in documentaries or indie films.', 'Black and white grain: Classic film grain in monochrome style for an old-school effect.'] },
  film_stocks: { options: ['Kodak Vision3 500T 5219: Soft grain, ideal for night shots, used in Dune.', 'Kodak Ektar 100: Bright, saturated colors, good for daylight shots, like in The Secret Life of Walter Mitty.', 'Fujifilm Eterna 250D: Balanced color with a natural feel, similar to Lost in Translation.', 'Ilford HP5: Black and white grainy look, typically used for high-contrast street photography.', 'Kodak Tri-X 400: Classic black and white with high contrast, used in gritty urban scenes.', 'Fujifilm Pro 400H: Soft grain and neutral color reproduction for natural daylight shots.'] },
  camera_focal_lengths: { options: ['8mm (Fisheye)', '12mm', '16mm', '24mm', '35mm', '50mm', '85mm', '100mm', '135mm', '200mm', '300mm', '400mm (Telephoto)', '600mm'] },
  camera_apertures: { options: ['f/1.4', 'f/1.8', 'f/2.0', 'f/2.8', 'f/4.0', 'f/5.6', 'f/8.0', 'f/11', 'f/16', 'f/22'] },
  image_resolutions: { options: ['512x512', '1024x1024', '2048x2048', '4096x4096', 'HD (1280x720)', 'Full HD (1920x1080)', '4K (3840x2160)', '8K (7680x4320)'] },
  aspect_ratios: { options: ['1:1 (Square)', '4:3 (Standard)', '16:9 (Widescreen)', '21:9 (Ultrawide)', '9:16 (Vertical)', '2.35:1 (Cinemascope)'] },
  video_pacing: { options: ['Slow and Deliberate', 'Medium Pacing', 'Fast and Dynamic', 'Variable Rhythm', 'Montage Style'] },
  video_durations: { options: ['5 seconds', '10 seconds', '15 seconds', '30 seconds', '1 minute', '2 minutes', '5 minutes', '10 minutes'] },
  video_formats: { options: ['720p 24fps', '1080p 24fps', '1080p 30fps', '4K 24fps', '4K 30fps', '8K 24fps'] },
  video_output: {
    resolution: ['720p', '1080p', '4K', '8K'],
    frame_rate: ['24fps', '25fps', '30fps', '60fps', '120fps'],
    codec: ['H.264', 'H.265', 'VP9', 'AV1', 'ProRes'],
    format: ['MP4', 'MOV', 'AVI', 'MKV', 'WebM'],
    bitrate: ['Low', 'Medium', 'High', 'Custom'],
    color_space: ['sRGB', 'Adobe RGB', 'DCI-P3', 'Rec.709', 'Linear']
  },
  image_output: {
    resolution: ['HD (1280x720)', 'Full HD (1920x1080)', '4K (3840x2160)', '8K (7680x4320)'],
    format: ['JPEG', 'PNG', 'TIFF', 'EXR', 'WebP'],
    quality: ['Low', 'Medium', 'High', 'Lossless'],
    color_space: ['sRGB', 'Adobe RGB', 'DCI-P3', 'Rec.709', 'Linear']
  },
  storyboard_output: {
    layout: ['Grid', 'Timeline', 'Freeform'],
    style: ['Simple', 'Detailed', 'Storyboard Pro', 'Custom'],
    annotations: ['None', 'Basic', 'Detailed', 'Technical'],
    format: ['PDF', 'PNG', 'JPG', 'SVG']
  },
  camera_settings: {
    focal_length: ['8mm', '12mm', '16mm', '24mm', '35mm', '50mm', '85mm', '100mm', '135mm', '200mm', '300mm', '400mm', '600mm'],
    aperture: ['f/1.4', 'f/1.8', 'f/2.0', 'f/2.8', 'f/4.0', 'f/5.6', 'f/8.0', 'f/11', 'f/16', 'f/22'],
    shutter_speed: ['1/8000', '1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30'],
    iso: ['50', '100', '200', '400', '800', '1600', '3200', '6400', '12800', '25600']
  },
  lighting_setup: {
    key_light: ['Soft', 'Hard', 'Rim', 'Back', 'Fill', 'Motivated'],
    color_temperature: ['2700K (Warm)', '3200K (Tungsten)', '4000K (Cool White)', '5000K (Daylight)', '6500K (Cool Daylight)'],
    intensity: ['Low', 'Medium', 'High', 'Very High']
  },
  color_grading: {
    lut: ['None', 'Film Look', 'Teal/Orange', 'Cool', 'Warm', 'Vintage', 'High Contrast', 'Custom'],
    contrast: ['Low', 'Medium', 'High', 'Very High'],
    saturation: ['Desaturated', 'Natural', 'Vibrant', 'Oversaturated']
  },
  master_video: {
    resolution: ['720p', '1080p', '4K', '8K'],
    frame_rate: ['24fps', '25fps', '30fps', '60fps', '120fps'],
    codec: ['H.264', 'H.265', 'VP9', 'AV1', 'ProRes'],
    format: ['MP4', 'MOV', 'AVI', 'MKV', 'WebM'],
    bitrate: ['Low', 'Medium', 'High', 'Custom'],
    color_space: ['sRGB', 'Adobe RGB', 'DCI-P3', 'Rec.709', 'Linear']
  },
  master_image: {
    resolution: ['HD (1280x720)', 'Full HD (1920x1080)', '4K (3840x2160)', '8K (7680x4320)'],
    format: ['JPEG', 'PNG', 'TIFF', 'EXR', 'WebP'],
    quality: ['Low', 'Medium', 'High', 'Lossless'],
    color_space: ['sRGB', 'Adobe RGB', 'DCI-P3', 'Rec.709', 'Linear']
  },
  character_arc_types: { options: ['Positive Change', 'Flat Character Arc', 'Negative Character Arc'] },
  opening_hooks: { options: ['Flashback', 'Flash Forward', 'Mid-story', 'Newsreel', 'The Setting', 'Crime Scene', 'Direct Addressing', 'Tragedy', 'A Day in Life', 'Establishing Shot', 'Chasing Sequence'] },
  subtext_techniques: { options: ['Conflict', 'Silence', 'Ambiguity', 'Contradiction', 'Actions Over Words', 'Context', 'Body Language'] },
  archetypes: { options: ['Heroes', 'Shadows', 'Mentors', 'Herald', 'Threshold Guardians', 'Shapeshifters', 'Tricksters', 'Allies', 'Woman as Temptress'] },
  transition_types: { options: ['Cut', 'Fade In', 'Fade Out', 'Dissolve', 'Wipe', 'Iris', 'Match Cut', 'Jump Cut', 'Cross-fade'] },
  depth_of_field_options: { options: ['Shallow (Subject Isolation)', 'Medium (Natural)', 'Deep (Landscape)', 'Rack Focus', 'Split Diopter'] }
};

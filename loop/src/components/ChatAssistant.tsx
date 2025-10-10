import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Message } from '../types';
import { ChatRole } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { SendIcon, LoopSparkIcon, LoopPersonaIcon, LoopCatalystIcon, LoopConstructIcon } from './IconComponents';
import { knowledgeBase } from '../services/knowledgeService';

interface ChatAssistantProps {
  messages: Message[];
  isLoading: boolean;
  generatedOutput: string;
  onSendMessage: (message: string) => void | Promise<unknown>;
  project?: any;
  onCreateAsset?: (asset: any) => void;
  onUpdateAsset?: (assetId: string, updates: any) => void;
  showMockNotice?: boolean;
  onDismissMockNotice?: () => void;
}

// Helper to escape HTML to prevent XSS from user input being reflected in prompt
const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
};

const escapeHtml = (unsafe: string) =>
  unsafe.replace(/[&<>"']/g, (char) => htmlEscapes[char as keyof typeof htmlEscapes] ?? char);

const formatPlainText = (content: string) =>
  escapeHtml(content).replace(/\n/g, '<br />');

const formatGeneratedOutput = (content: string): string => {
    try {
        const data = JSON.parse(content);
        if (data.prompt && data.explanation) {
            return `
                <div class="prose max-w-none chat-output">
                    <h3 class="!mb-2 chat-output-heading">Generated Content</h3>
                    <pre class="chat-output-block p-4 whitespace-pre-wrap break-words font-mono text-sm"><code>${escapeHtml(data.prompt)}</code></pre>
                    <h3 class="!mt-6 !mb-2 chat-output-heading">AI Commentary</h3>
                    <p class="!mt-0 chat-meta">${escapeHtml(data.explanation)}</p>
                </div>
            `.trim();
        }
    } catch (e) {
        // Not a JSON object, or not a format we recognize, so just display as plain text
        return `<p>${formatPlainText(content)}</p>`;
    }
    return `<p>${formatPlainText(content)}</p>`;
};

const featurePalettes: Record<string, { accent: string; surface: string; highlight: string; edge: string }> = {
  story: {
    accent: '--timeline-story',
    surface: '--timeline-story-surface',
    highlight: '--timeline-story-highlight',
    edge: '--timeline-story-edge'
  },
  shot: {
    accent: '--timeline-image',
    surface: '--timeline-image-surface',
    highlight: '--timeline-image-highlight',
    edge: '--timeline-image-edge'
  },
  img: {
    accent: '--timeline-style',
    surface: '--timeline-style-surface',
    highlight: '--timeline-style-highlight',
    edge: '--timeline-style-edge'
  },
  vid: {
    accent: '--timeline-director',
    surface: '--timeline-director-surface',
    highlight: '--timeline-director-highlight',
    edge: '--timeline-director-edge'
  },
  edit: {
    accent: '--timeline-master',
    surface: '--timeline-master-surface',
    highlight: '--timeline-master-highlight',
    edge: '--timeline-master-edge'
  },
  iteration: {
    accent: '--timeline-master',
    surface: '--timeline-master-surface',
    highlight: '--timeline-master-highlight',
    edge: '--timeline-master-edge'
  },
  shots: {
    accent: '--timeline-image',
    surface: '--timeline-image-surface',
    highlight: '--timeline-image-highlight',
    edge: '--timeline-image-edge'
  },
  menu: {
    accent: '--primary',
    surface: '--card',
    highlight: '--muted',
    edge: '--ring'
  },
  default: {
    accent: '--primary',
    surface: '--card',
    highlight: '--muted',
    edge: '--ring'
  }
};

const getFeatureStyles = (feature: string) => {
  const palette = featurePalettes[feature] ?? featurePalettes.default;
  return {
    '--chat-accent': `var(${palette.accent})`,
    '--chat-surface': `var(${palette.surface})`,
    '--chat-highlight': `var(${palette.highlight})`,
    '--chat-edge': `var(${palette.edge})`
  } as React.CSSProperties;
};

const ChatAssistant: React.FC<ChatAssistantProps> = ({
  messages,
  isLoading,
  generatedOutput,
  onSendMessage,
  project,
  onCreateAsset,
  onUpdateAsset,
  showMockNotice = false,
  onDismissMockNotice
}) => {
  const [prompt, setPrompt] = useState('');
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestionPool = useMemo(() => {
    const combined = [
      ...knowledgeBase.storyStructures,
      ...knowledgeBase.filmTechniques,
      ...knowledgeBase.cameraMovements,
      ...knowledgeBase.sceneWritingTechniques,
      ...knowledgeBase.screenplayArchetypes
    ].filter(Boolean);

    return Array.from(new Set(combined)).sort((a, b) => a.localeCompare(b));
  }, [knowledgeBase]);

  const filteredSuggestions = useMemo(() => {
    const query = prompt.trim().toLowerCase();

    if (!query) {
      return suggestionPool.slice(0, 8);
    }

    return suggestionPool
      .filter((item) => item.toLowerCase().includes(query))
      .slice(0, 8);
  }, [prompt, suggestionPool]);

  // Build system state
  const [isBuildMode, setIsBuildMode] = useState(false);
  const [currentBuild, setCurrentBuild] = useState<string | null>(null);
  const [buildAnswers, setBuildAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showBuildMenu, setShowBuildMenu] = useState(false);

  // Master asset iteration state
  const [selectedMasterAsset, setSelectedMasterAsset] = useState<string | null>(null);
  const [showMasterIteration, setShowMasterIteration] = useState(false);
  const [iterationPrompt, setIterationPrompt] = useState('');

  // Enhanced shot creation and multi-shot state
  const [showShotCreation, setShowShotCreation] = useState(false);
  const [shotCreationPrompt, setShotCreationPrompt] = useState('');
  const [targetMasterAsset, setTargetMasterAsset] = useState<string | null>(null);
  const [showMultiShotCreation, setShowMultiShotCreation] = useState(false);
  const [multiShotConfig, setMultiShotConfig] = useState({
    numberOfShots: 3,
    shotType: 'mixed',
    duration: '3-5 seconds',
    cameraMovement: 'static'
  });

  // Asset propagation flow state
  const [showAssetPropagation, setShowAssetPropagation] = useState(false);
  const [propagationStep, setPropagationStep] = useState<'story' | 'visual' | 'multi_shot' | 'batch_style' | 'complete'>('story');
  const [propagatedAssets, setPropagatedAssets] = useState<{
    storyAssets: string[];
    visualAssets: string[];
    multiShotAssets: string[];
    batchStyleAssets: string[];
  }>({
    storyAssets: [],
    visualAssets: [],
    multiShotAssets: [],
    batchStyleAssets: []
  });

  // Master Visual and Story creation context
  const [showMasterCreation, setShowMasterCreation] = useState(false);
  const [masterCreationStep, setMasterCreationStep] = useState<'story' | 'visual'>('story');
  const [storyIterationPrompt, setStoryIterationPrompt] = useState('');
  const [visualIterationPrompt, setVisualIterationPrompt] = useState('');

  // Build types and their questions
  const buildTypes: Record<string, { name: string; description: string; questions: { key: string; question: string; section: string; }[] }> = {
    story: {
      name: 'StoryBuild',
      description: 'Create a comprehensive story with character arcs, world-building, and thematic depth',
      questions: [
        // Part 1 - Character & World
        { key: 'character_name', question: 'What is the character\'s full name? Any nicknames or titles?', section: 'Character Foundation' },
        { key: 'character_age', question: 'Exact age or approximate age range?', section: 'Character Foundation' },
        { key: 'character_gender', question: 'How does the character identify?', section: 'Character Foundation' },
        { key: 'character_physical', question: 'Height, build, notable features, hair/eye color, scars/tattoos?', section: 'Character Foundation' },
        { key: 'character_personality', question: 'Main personality traits (e.g., bold, insecure, cunning, empathetic)?', section: 'Character Foundation' },
        { key: 'character_backstory', question: 'What events shaped them? Childhood, trauma, achievements?', section: 'Character Foundation' },
        { key: 'character_wants', question: 'What does the character actively strive for?', section: 'Character Foundation' },
        { key: 'character_needs', question: 'What do they actually need to learn or overcome internally?', section: 'Character Foundation' },
        { key: 'character_flaws', question: 'What are their limitations, fears, or contradictions?', section: 'Character Foundation' },
        { key: 'character_wound', question: 'What unresolved past pain or secret drives them?', section: 'Character Foundation' },
        { key: 'world_tone', question: 'Urban, rural, fantastical, dystopian, sci-fi? Day/night, era, climate?', section: 'World & Opposition' },
        { key: 'external_conflict', question: 'What forces outside the character oppose them? Physical, social, political?', section: 'World & Opposition' },
        { key: 'conscious_forces', question: 'Who consciously helps or hinders them?', section: 'World & Opposition' },
        { key: 'unconscious_forces', question: 'Hidden societal pressures, norms, or invisible antagonists?', section: 'World & Opposition' },
        { key: 'story_linearity', question: 'Should events be chronological, fragmented, flashback-heavy?', section: 'World & Opposition' },
        { key: 'core_theme', question: 'What is the story\'s central message or question?', section: 'Thematic Suture' },
        { key: 'opposing_values', question: 'What conflicts with the character\'s beliefs?', section: 'Thematic Suture' },
        { key: 'antagonist_goal', question: 'What does the antagonist want, and what do they need internally?', section: 'Thematic Suture' },
        { key: 'character_mirror', question: 'How does the antagonist mirror or contrast the protagonist?', section: 'Thematic Suture' },
        { key: 'first_line', question: 'How should the story open?', section: 'Dialogue & Contrast' },
        { key: 'character_voice', question: 'Casual, formal, poetic, sarcastic, jargon-heavy?', section: 'Dialogue & Contrast' },
        { key: 'stereotype_subversion', question: 'Does this character break or fulfill a cliché?', section: 'Dialogue & Contrast' },
        { key: 'contradictions', question: 'Any internal vs external contradictions to highlight?', section: 'Dialogue & Contrast' },
        // Part 2 - Plot & Resonance
        { key: 'surface_conflict', question: 'What triggers the story?', section: 'Plot & Arc' },
        { key: 'internal_contradiction', question: 'Where does the character struggle internally?', section: 'Plot & Arc' },
        { key: 'inciting_incident', question: 'What event disrupts the normal world?', section: 'Plot & Arc' },
        { key: 'midpoint', question: 'What shifts the story\'s stakes or understanding?', section: 'Plot & Arc' },
        { key: 'climax', question: 'How does the character confront the ultimate challenge?', section: 'Plot & Arc' },
        { key: 'resolution', question: 'How does the character end the story? Success, failure, ambiguous?', section: 'Plot & Arc' },
        { key: 'ordinary_traits', question: 'What human, relatable qualities do they have?', section: 'Relatability & Transcendence' },
        { key: 'mythic_resonance', question: 'What timeless or universal traits emerge?', section: 'Relatability & Transcendence' },
        { key: 'key_recognition', question: 'When does the audience empathize, reflect, or recognize themselves?', section: 'Relatability & Transcendence' },
        { key: 'symbolic_objects', question: 'Items that symbolize character traits, theme, or conflict?', section: 'Symbolic Objects & Motivated Cuts' },
        { key: 'object_symbolism', question: 'What deeper meaning do they carry?', section: 'Symbolic Objects & Motivated Cuts' },
        { key: 'motivated_cuts', question: 'Scenes where objects or visual cues signal change? (Match cut, smash cut, echo cut, jump cut, etc.)', section: 'Symbolic Objects & Motivated Cuts' }
      ]
    },
    shot: {
      name: 'ShotBuild',
      description: 'Define cinematic shots with camera work, lighting, and composition',
      questions: [
        { key: 'shot_name', question: 'What do you want to call this shot? (For reference and seed tracking)', section: 'Shot Identification' },
        { key: 'shot_purpose', question: 'Is this establishing, dialogue, emotional, payoff, or action?', section: 'Shot Identification' },
        { key: 'scene_context', question: 'Which part of the story does this shot belong to?', section: 'Shot Identification' },
        { key: 'shot_type', question: 'Shot type: High-angle, Dutch angle, Extreme wide, POV, Over-the-shoulder, Silhouette, etc.', section: 'Shot Core & Camera' },
        { key: 'framing_rule', question: 'Rule of thirds, Golden ratio, Negative space, Symmetry, Frame-in-frame?', section: 'Shot Core & Camera' },
        { key: 'character_blocking', question: 'Subject foreground, antagonist rear, group center, left midground, etc.', section: 'Shot Core & Camera' },
        { key: 'camera_type', question: 'Arri Alexa 65, Red Monstro 8K, Sony Venice 2, etc.', section: 'Shot Core & Camera' },
        { key: 'focal_length', question: '10mm (ultra-wide), 35mm (standard), 50mm (natural), 100mm (portrait), 200mm (telephoto)', section: 'Shot Core & Camera' },
        { key: 'depth_field', question: 'f/1.2 (dreamy), f/2.8 (cinematic), f/5.6 (balanced), f/11 (deep focus), f/22 (everything sharp)', section: 'Shot Core & Camera' },
        { key: 'camera_movement', question: 'Pan, Tilt, Dolly, Track, Crane, Handheld, Steadicam, Zoom, Static', section: 'Movement & Dynamics' },
        { key: 'character_movement', question: 'Walking, running, entering frame, reaction, gesture, POV interaction', section: 'Movement & Dynamics' },
        { key: 'temporal_notes', question: 'Slow motion, real-time, long take, cut-heavy', section: 'Movement & Dynamics' },
        { key: 'lighting_style', question: 'High-key, Low-key, Ambient, Golden hour, etc.', section: 'Lighting, Color & Atmosphere' },
        { key: 'lighting_technical', question: 'Ratios, bloom, flare, practical sources, shadow emphasis', section: 'Lighting, Color & Atmosphere' },
        { key: 'color_palette', question: 'Teal & Orange, Golden glow, Black & White, etc.', section: 'Lighting, Color & Atmosphere' },
        { key: 'hex_codes', question: 'Specific hex codes for background, foreground, costume, props', section: 'Lighting, Color & Atmosphere' },
        { key: 'film_stock', question: 'Kodak Vision3 5219, Fujifilm Eterna 250D, etc.', section: 'Lighting, Color & Atmosphere' },
        { key: 'environmental_effects', question: 'Rain, Snow, Fog, Dust, Smoke, Haze, Light Shafts', section: 'Texture & Atmosphere' },
        { key: 'lens_effects', question: 'Bloom, Lens flare, Vignette, Grain, Motion blur', section: 'Texture & Atmosphere' },
        { key: 'important_props', question: 'Any symbolic or plot-driven objects?', section: 'Props & Visual Foreshadowing' }
      ]
    },
    img: {
      name: 'ImgBuild',
      description: 'Generate AI image prompts with cinematic parameters',
      questions: [
        { key: 'shot_type', question: 'Shot type: High-angle, Dutch angle, Extreme wide, POV, etc.', section: 'Shot Parameters' },
        { key: 'style_guide', question: 'Style reference: 1920s silent film, 80s cyberpunk, etc.', section: 'Style & Reference' },
        { key: 'camera_type', question: 'Camera type for this image generation', section: 'Camera Settings' },
        { key: 'focal_length', question: 'Focal length for composition', section: 'Camera Settings' },
        { key: 'aperture', question: 'Depth of field / aperture setting', section: 'Camera Settings' },
        { key: 'film_stock', question: 'Film stock / look emulation', section: 'Film & Lighting' },
        { key: 'lighting_style', question: 'Overall lighting approach', section: 'Film & Lighting' },
        { key: 'lighting_details', question: 'Technical lighting details', section: 'Film & Lighting' },
        { key: 'color_grading', question: 'Color grading style', section: 'Color & Look' },
        { key: 'hex_codes', question: 'Specific color hex codes', section: 'Color & Look' },
        { key: 'framing', question: 'Framing and composition rules', section: 'Composition' },
        { key: 'character_blocking', question: 'Character positioning', section: 'Composition' },
        { key: 'texture_atmosphere', question: 'Environmental effects and atmosphere', section: 'Effects' },
        { key: 'ai_model', question: 'Which AI model: MidJourney, Sora, Veo 3, etc.', section: 'AI Generation' }
      ]
    },
    vid: {
      name: 'VidBuild',
      description: 'Create video sequences with motion and continuity',
      questions: [
        { key: 'subject_action', question: 'What is the main subject and their action?', section: 'Scene Parameters' },
        { key: 'camera_movement', question: 'Camera movement for this sequence', section: 'Camera & Motion' },
        { key: 'setting', question: 'Location and environment details', section: 'Environment' },
        { key: 'lighting_mood', question: 'Lighting setup and emotional tone', section: 'Lighting & Mood' },
        { key: 'style_reference', question: 'Visual style and film reference', section: 'Style & Continuity' },
        { key: 'continuity_flags', question: 'Continuity requirements from previous shots', section: 'Continuity' }
      ]
    },
    edit: {
      name: 'EditBuild',
      description: 'Plan video editing with cuts, transitions, and audio',
      questions: [
        { key: 'review_context', question: 'Import context from previous builds? (All, Selected, None)', section: 'Context Review' },
        { key: 'selected_seeds', question: 'Which seeds/IDs should be included?', section: 'Context Review' },
        { key: 'seed_mutations', question: 'For each seed: Keep as-is, Mutate, or Discard?', section: 'Context Review' },
        { key: 'prompt_review', question: 'Review prompts in execution order? (Yes/No)', section: 'Sequential Review' },
        { key: 'prompt_adjustments', question: 'For each prompt: Keep, adjust, or remove?', section: 'Sequential Review' },
        { key: 'visual_suggestions', question: 'Additional B-roll, angles, or lighting variations?', section: 'Visual Suggestions' },
        { key: 'cinematic_guidance', question: 'Framing, lighting, texture, or atmosphere improvements?', section: 'Cinematic Guidance' },
        { key: 'editing_recommendations', question: 'Cut points, pacing, transitions, motion effects?', section: 'Video Editing' },
        { key: 'audio_sfx', question: 'Background music, sound effects, audio timing?', section: 'Audio & Effects' },
        { key: 'output_format', question: 'Copy-paste prompts, editing notes, or combined document?', section: 'Output Options' }
      ]
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (filteredSuggestions.length === 0) {
      setHighlightedIndex(-1);
      return;
    }

    setHighlightedIndex((prev) => {
      if (prev < 0 || prev >= filteredSuggestions.length) {
        return 0;
      }
      return prev;
    });
  }, [filteredSuggestions]);

  useEffect(() => {
    return () => {
      if (blurTimeout.current) {
        clearTimeout(blurTimeout.current);
      }
    };
  }, []);

  const insertSuggestion = (text: string) => {
    setPrompt((prev) => {
      if (!prev) {
        return `${text} `;
      }

      const needsSpace = /\s$/.test(prev);
      const base = needsSpace ? prev : `${prev} `;
      return `${base}${text} `;
    });
    setIsSuggestionOpen(false);
    setHighlightedIndex(-1);
  };

  const handlePromptKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredSuggestions.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsSuggestionOpen(true);
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        if (next >= filteredSuggestions.length) {
          return 0;
        }
        return next;
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsSuggestionOpen(true);
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        if (next < 0) {
          return filteredSuggestions.length - 1;
        }
        return next;
      });
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      if (highlightedIndex >= 0) {
        event.preventDefault();
        insertSuggestion(filteredSuggestions[highlightedIndex]);
      }
    } else if (event.key === 'Escape') {
      setIsSuggestionOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Helper functions for asset management
  const getAssetsByType = (type: string) => {
    if (!project?.assets) return [];
    const typeMap: Record<string, string[]> = {
      'story': ['master_story'],
      'visual': ['master_image', 'master_video'],
      'multi_shot': ['multi_shot'],
      'batch_style': ['batch_style'],
      'shot': ['shot']
    };
    const targetTypes = typeMap[type] || [type];
    return project.assets.filter((asset: any) => targetTypes.includes(asset.type));
  };

  const getMasterAssets = () => {
    if (!project?.assets) return [];
    return project.assets.filter((asset: any) => asset.isMaster);
  };

  const suggestionListId = 'prompt-suggestion-list';

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, generatedOutput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSendMessage(prompt);
      setPrompt('');
    }
  };

  // Master asset iteration functions
  const handleIterateMasterAsset = async () => {
    if (!selectedMasterAsset || !iterationPrompt.trim() || !project || !onUpdateAsset) return;

    const asset = project.assets.find((a: any) => a.id === selectedMasterAsset);
    if (!asset) return;

    const iterationMessage = `Iterate on this ${asset.type} asset:\n\nCurrent content:\n${asset.content}\n\nIteration request: ${iterationPrompt}\n\nPlease provide an improved version with the requested changes.`;

    try {
      onSendMessage(iterationMessage);
      setShowMasterIteration(false);
      setIterationPrompt('');
      setSelectedMasterAsset(null);
    } catch (error) {
      console.error('Error iterating master asset:', error);
    }
  };

  // Shot creation functions
  const handleCreateShots = async () => {
    if (!shotCreationPrompt.trim() || !targetMasterAsset || !project || !onCreateAsset) return;

    const masterAsset = project.assets.find((a: any) => a.id === targetMasterAsset);
    if (!masterAsset) return;

    const shotCreationMessage = `Create multiple shot cards based on this master asset:\n\nMaster Asset (${masterAsset.type}):\n${masterAsset.content}\n\nShot creation request: ${shotCreationPrompt}\n\nPlease create 3-5 detailed shot cards that break down this master asset into individual cinematic shots. Each shot should include: Shot Type, Style Reference, Camera Type, Focal Length, Depth of Field/Aperture, Film Stock/Look, Camera Movement, Lighting, Framing & Composition, Character Blocking, Texture/Atmosphere/Effects, and Duration.`;

    try {
      onSendMessage(shotCreationMessage);
      setShowShotCreation(false);
      setShotCreationPrompt('');
      setTargetMasterAsset(null);
    } catch (error) {
      console.error('Error creating shots:', error);
    }
  };

  // Enhanced functions for timeline-aware asset creation
  const handleTimelineAwareGeneration = async () => {
    if (!project) return;
    
    const timelineContext = {
      primaryAssets: project.primaryTimeline?.folders || {},
      secondaryAssets: project.secondaryTimeline?.masterAssets || [],
      thirdAssets: project.thirdTimeline?.styledShots || [],
      currentStep: propagationStep
    };
    
    const contextMessage = `Timeline Context for Generation:\n\n` +
      `Current Step: ${propagationStep}\n` +
      `Story Assets: ${timelineContext.primaryAssets.story?.length || 0}\n` +
      `Visual Assets: ${timelineContext.primaryAssets.image?.length || 0}\n` +
      `Master Assets: ${timelineContext.secondaryAssets.length}\n` +
      `Styled Shots: ${timelineContext.thirdAssets.length}\n\n` +
      `Generate the next logical step in the Loop workflow based on current timeline state.`;
    
    try {
      await onSendMessage(contextMessage);
    } catch (error) {
      console.error('Timeline-aware generation failed:', error);
    }
  };
  
  const handleAssetPropagationFlow = () => {
    setShowAssetPropagation(true);
    setPropagationStep('story');
  };
  
  const proceedToPropagationStep = (step: typeof propagationStep) => {
    setPropagationStep(step);
    
    const stepMessages = {
      story: "Let's create master story assets. These will serve as the foundation for your multi-shot sequences.",
      visual: "Now let's create master visual assets that will define the look and style of your project.", 
      multi_shot: "Time to break down your story into multi-shot sequences with specific shot types and timing.",
      batch_style: "Let's apply your master visual style to all multi-shot sequences in one batch operation.",
      complete: "Asset propagation complete! Your timeline now has a complete flow from story to final styled shots."
    };
    
    const contextPrompt = `TIMELINE WORKFLOW - ${step.toUpperCase()} STEP\n\n${stepMessages[step]}\n\nCurrent assets available:\n- Story assets: ${propagatedAssets.storyAssets.length}\n- Visual assets: ${propagatedAssets.visualAssets.length}\n- Multi-shot assets: ${propagatedAssets.multiShotAssets.length}\n- Batch style assets: ${propagatedAssets.batchStyleAssets.length}\n\nGuide me through creating assets for the ${step} step.`;
    
    onSendMessage(contextPrompt);
  };

  const renderMessageContent = (message: Message) => {
    if (message.role === ChatRole.MODEL) {
      const formattedContent = formatGeneratedOutput(message.content);
      return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />;
    }

    const contentWithBreaks = formatPlainText(message.content);
    return <div dangerouslySetInnerHTML={{ __html: contentWithBreaks }} />;
  };

  return (
    <div className="flex flex-col h-full chat-pane">
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="flex flex-col gap-6">
          {showMockNotice && (
            <div className="flex items-start gap-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-4 text-indigo-100">
              <div className="w-8 h-8 rounded-full bg-indigo-500/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                <LoopSparkIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-indigo-100">Mock mode active</p>
                <p className="text-sm text-indigo-100/80">
                  Gemini responses are simulated because the API key isn&apos;t configured yet. Add your key to unlock live Loop generations.
                </p>
              </div>
              {onDismissMockNotice && (
                <button
                  type="button"
                  onClick={onDismissMockNotice}
                  className="ml-2 text-indigo-200/80 hover:text-indigo-100"
                  aria-label="Dismiss mock mode notice"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-4 items-start ${msg.role === ChatRole.USER ? 'justify-end' : ''}`}>
              {msg.role !== ChatRole.USER && (
                <div
                  className="w-8 h-8 rounded-full chat-avatar flex items-center justify-center flex-shrink-0"
                  style={getFeatureStyles(currentBuild || 'menu')}
                >
                  <LoopSparkIcon className="w-5 h-5" />
                </div>
              )}

              <div
                className={`${
                  msg.role === ChatRole.MODEL ? 'w-full max-w-none' : 'max-w-xl'
                } p-4 chat-bubble ${
                  msg.role === ChatRole.USER
                    ? 'chat-bubble--user'
                    : msg.role === ChatRole.MODEL
                    ? 'chat-bubble--model'
                    : 'chat-bubble--meta'
                }`}
                style={msg.role === ChatRole.MODEL ? getFeatureStyles(currentBuild || 'menu') : undefined}
              >
                {renderMessageContent(msg)}
              </div>

              {msg.role === ChatRole.USER && (
                <div className="w-8 h-8 rounded-full chat-avatar chat-avatar--user flex items-center justify-center flex-shrink-0">
                  <LoopPersonaIcon className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}

          {generatedOutput && (
            <div className="flex gap-4 items-start">
              <div
                className="w-8 h-8 rounded-full chat-avatar flex items-center justify-center flex-shrink-0"
                style={getFeatureStyles(currentBuild || 'menu')}
              >
                <LoopSparkIcon className="w-5 h-5" />
              </div>
              <div
                className="max-w-none w-full p-4 chat-bubble chat-bubble--model chat-bubble--generated"
                style={getFeatureStyles(currentBuild || 'menu')}
              >
                <div dangerouslySetInnerHTML={{ __html: formatGeneratedOutput(generatedOutput) }} />
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex gap-4 items-start">
              <div
                className="w-8 h-8 rounded-full chat-avatar flex items-center justify-center flex-shrink-0"
                style={getFeatureStyles(currentBuild || 'menu')}
              >
                  <LoopSparkIcon className="w-5 h-5 animate-pulse" />
              </div>
              <div className="max-w-xl p-4 chat-bubble chat-bubble--model">
                <LoadingSpinner />
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 chat-footer">
        {/* Asset Propagation Workflow */}
        {showAssetPropagation && (
          <div className="mb-4 p-4 chat-feature-surface" style={getFeatureStyles(propagationStep)}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold chat-feature-header">
                Timeline Workflow - {propagationStep.replace('_', ' ').toUpperCase()} Step
              </h3>
              <button
                type="button"
                onClick={() => setShowAssetPropagation(false)}
                className="chat-close-button"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex gap-2 mb-3">
                {['story', 'visual', 'multi_shot', 'batch_style', 'complete'].map((step) => (
                  <div
                    key={step}
                    className={`px-3 py-1 text-xs rounded-full font-medium ${
                      step === propagationStep
                        ? 'bg-blue-500 text-white'
                        : propagationStep === 'complete' || 
                          (['story', 'visual', 'multi_shot', 'batch_style'].indexOf(step) < 
                           ['story', 'visual', 'multi_shot', 'batch_style'].indexOf(propagationStep))
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {step.replace('_', ' ')}
                  </div>
                ))}
              </div>
              
              <div className="text-sm ink-subtle">
                Current Assets Available:
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>Story: {getAssetsByType('story').length}</div>
                  <div>Visual: {getAssetsByType('visual').length}</div>
                  <div>Multi-shot: {getAssetsByType('multi_shot').length}</div>
                  <div>Batch Style: {getAssetsByType('batch_style').length}</div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {propagationStep !== 'complete' && (
                <button
                  onClick={() => proceedToPropagationStep(
                    propagationStep === 'story' ? 'visual' :
                    propagationStep === 'visual' ? 'multi_shot' :
                    propagationStep === 'multi_shot' ? 'batch_style' : 'complete'
                  )}
                  className="px-4 py-2 chat-feature-action"
                >
                  Next: {
                    propagationStep === 'story' ? 'Visual Assets' :
                    propagationStep === 'visual' ? 'Multi-Shot' :
                    propagationStep === 'multi_shot' ? 'Batch Style' : 'Complete'
                  }
                </button>
              )}
              
              <button
                onClick={() => proceedToPropagationStep(propagationStep)}
                className="px-4 py-2 chat-feature-action"
              >
                Get Guidance for {propagationStep.replace('_', ' ')}
              </button>
            </div>
          </div>
        )}

        {/* Master Asset Iteration Panel */}
        {showMasterIteration && (
          <div className="mb-4 p-4 chat-feature-surface" style={getFeatureStyles('iteration')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold chat-feature-header">Iterate Master Asset</h3>
              <button
                type="button"
                onClick={() => {
                  setShowMasterIteration(false);
                  setSelectedMasterAsset(null);
                  setIterationPrompt('');
                }}
                className="chat-close-button"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium chat-label mb-2">Select Master Asset</label>
                <select
                  value={selectedMasterAsset || ''}
                  onChange={(e) => setSelectedMasterAsset(e.target.value)}
                  className="w-full chat-input"
                >
                  <option value="">Choose a master asset...</option>
                  {getMasterAssets().map((asset: any) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium chat-label mb-2">Iteration Request</label>
                <textarea
                  value={iterationPrompt}
                  onChange={(e) => setIterationPrompt(e.target.value)}
                  placeholder="Describe what changes you'd like to make..."
                  className="w-full chat-input resize-none"
                  rows={4}
                />
              </div>
              <button
                onClick={handleIterateMasterAsset}
                disabled={!selectedMasterAsset || !iterationPrompt.trim()}
                className="w-full px-4 py-2 chat-feature-action"
              >
                Iterate Asset
              </button>
            </div>
          </div>
        )}

        {/* Shot Creation Panel */}
        {showShotCreation && (
          <div className="mb-4 p-4 chat-feature-surface" style={getFeatureStyles('shots')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold chat-feature-header">Create Shots from Master Asset</h3>
              <button
                type="button"
                onClick={() => {
                  setShowShotCreation(false);
                  setTargetMasterAsset(null);
                  setShotCreationPrompt('');
                }}
                className="chat-close-button"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium chat-label mb-2">Select Master Asset</label>
                <select
                  value={targetMasterAsset || ''}
                  onChange={(e) => setTargetMasterAsset(e.target.value)}
                  className="w-full chat-input"
                >
                  <option value="">Choose a master asset...</option>
                  {getMasterAssets().map((asset: any) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium chat-label mb-2">Shot Creation Request</label>
                <textarea
                  value={shotCreationPrompt}
                  onChange={(e) => setShotCreationPrompt(e.target.value)}
                  placeholder="Describe the shots you want to create (e.g., key moments, emotional beats, visual style)..."
                  className="w-full chat-input resize-none"
                  rows={4}
                />
              </div>
              <button
                onClick={handleCreateShots}
                disabled={!targetMasterAsset || !shotCreationPrompt.trim()}
                className="w-full px-4 py-2 chat-feature-action"
              >
                Create Shots
              </button>
            </div>
          </div>
        )}

        {/* Build Menu */}
        {showBuildMenu && (
          <div className="mb-4 p-4 chat-feature-surface" style={getFeatureStyles('menu')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold chat-feature-header">Build System</h3>
              <button
                type="button"
                onClick={() => setShowBuildMenu(false)}
                className="chat-close-button"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(buildTypes).map(([key, buildType]) => (
                <button
                  key={key}
                  onClick={() => {
                    setCurrentBuild(key);
                    setIsBuildMode(true);
                    setCurrentQuestionIndex(0);
                    setBuildAnswers({});
                    setShowBuildMenu(false);
                  }}
                  className="p-3 chat-feature-button text-left"
                  style={getFeatureStyles(key)}
                >
                  <div className="font-medium chat-feature-header">{buildType.name}</div>
                  <div className="text-sm chat-feature-description mt-1">{buildType.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Build Mode Interface */}
        {isBuildMode && currentBuild && (
          <div className="mb-4 p-4 chat-feature-surface" style={getFeatureStyles(currentBuild)}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold chat-feature-header">
                {buildTypes[currentBuild].name} - Question {currentQuestionIndex + 1} of {buildTypes[currentBuild].questions.length}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsBuildMode(false);
                  setCurrentBuild(null);
                  setCurrentQuestionIndex(0);
                  setBuildAnswers({});
                }}
                className="chat-close-button"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-medium chat-section-label">
                {buildTypes[currentBuild].questions[currentQuestionIndex].section}
              </div>
              <div className="chat-question">
                {buildTypes[currentBuild].questions[currentQuestionIndex].question}
              </div>
              <textarea
                value={buildAnswers[buildTypes[currentBuild].questions[currentQuestionIndex].key] || ''}
                onChange={(e) => {
                  const key = buildTypes[currentBuild].questions[currentQuestionIndex].key;
                  setBuildAnswers(prev => ({ ...prev, [key]: e.target.value }));
                }}
                placeholder="Your answer..."
                className="w-full chat-input resize-none"
                rows={3}
              />
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (currentQuestionIndex > 0) {
                      setCurrentQuestionIndex(currentQuestionIndex - 1);
                    }
                  }}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 chat-feature-secondary"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentQuestionIndex < buildTypes[currentBuild].questions.length - 1) {
                      setCurrentQuestionIndex(currentQuestionIndex + 1);
                    } else {
                      // Build complete - generate prompt
                      const buildData = {
                        type: currentBuild,
                        answers: buildAnswers,
                        timestamp: new Date().toISOString()
                      };
                      onSendMessage(`Build complete: ${JSON.stringify(buildData)}`);
                      setIsBuildMode(false);
                      setCurrentBuild(null);
                      setCurrentQuestionIndex(0);
                      setBuildAnswers({});
                    }
                  }}
                  className="px-4 py-2 chat-feature-action"
                >
                  {currentQuestionIndex < buildTypes[currentBuild].questions.length - 1 ? 'Next' : 'Complete Build'}
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setIsSuggestionOpen(true);
            }}
            placeholder="Ask the AI assistant..."
            disabled={isLoading}
            className="w-full chat-input py-3 pl-4 pr-20"
            aria-label="Chat input"
            role="combobox"
            aria-expanded={isSuggestionOpen && filteredSuggestions.length > 0}
            aria-autocomplete="list"
            aria-controls={suggestionListId}
            aria-activedescendant={highlightedIndex >= 0 ? `${suggestionListId}-${highlightedIndex}` : undefined}
            aria-haspopup="listbox"
            onKeyDown={handlePromptKeyDown}
            onFocus={() => {
              if (blurTimeout.current) {
                clearTimeout(blurTimeout.current);
              }
              setIsSuggestionOpen(true);
            }}
            onBlur={() => {
              blurTimeout.current = setTimeout(() => {
                setIsSuggestionOpen(false);
                setHighlightedIndex(-1);
              }, 100);
            }}
          />
          {isSuggestionOpen && filteredSuggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 z-20 mt-2 glass-card border border-indigo-500/30 shadow-pastel-md bg-slate-950/70 backdrop-blur"
              id={suggestionListId}
            >
              <ul className="max-h-60 overflow-y-auto custom-scrollbar py-1" role="listbox">
                {filteredSuggestions.map((suggestion, index) => (
                  <li
                    key={`${suggestion}-${index}`}
                    id={`${suggestionListId}-${index}`}
                    role="option"
                    aria-selected={highlightedIndex === index}
                    className={`mx-1 my-0.5 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                      highlightedIndex === index
                        ? 'bg-indigo-500/20 text-indigo-50 shadow-pastel-sm'
                        : 'text-indigo-200 hover:bg-indigo-500/10'
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertSuggestion(suggestion);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
            <button
              type="button"
              onClick={handleAssetPropagationFlow}
              className="p-2 chat-icon-button"
              style={getFeatureStyles('story')}
              aria-label="Timeline workflow"
              title="Start timeline asset propagation workflow"
            >
              <LoopCatalystIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleTimelineAwareGeneration}
              className="p-2 chat-icon-button"
              style={getFeatureStyles('menu')}
              aria-label="Smart generation"
              title="Generate based on current timeline context"
            >
              <LoopSparkIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setShowMasterIteration(!showMasterIteration)}
              className="p-2 chat-icon-button"
              style={getFeatureStyles('iteration')}
              aria-label="Iterate master asset"
              title="Iterate Master Story & Visual Assets"
            >
              <LoopConstructIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setShowShotCreation(!showShotCreation)}
              className="p-2 chat-icon-button"
              style={getFeatureStyles('shots')}
              aria-label="Create Multi-Shot"
              title="Create Multi-Shot from Master Assets"
            >
              <LoopPersonaIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setShowBuildMenu(!showBuildMenu)}
              className="p-2 chat-icon-button"
              style={getFeatureStyles('menu')}
              aria-label="Build menu"
            >
              <LoopPersonaIcon className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="p-2 chat-icon-button"
              style={getFeatureStyles(currentBuild || 'story')}
              aria-label="Send message"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatAssistant;

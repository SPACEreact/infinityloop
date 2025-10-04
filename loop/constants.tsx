

import type { Build, Workflow, Question } from './types';
import { FilmIcon, DocumentTextIcon, PhotoIcon, VideoCameraIcon, ScissorsIcon } from './components/IconComponents';

// --- V2 Constants (Classic Build System) ---

// FIX: Explicitly type `storyQuestions` as `Question[]` to prevent overly specific type inference, which was causing errors when accessing properties like `options`.
const storyQuestions: Question[] = [
    { id: 'characterName', text: "Let's start with your protagonist. What is their name, including any nicknames?", type: 'text' as const },
    { id: 'characterAge', text: "How old are they?", type: 'text' as const },
    { id: 'characterBackstory', text: "What is their backstory? What key life events, traumas, or achievements have shaped them?", type: 'text' as const },
    { id: 'characterWant', text: "What is their primary, external goal in this story? (e.g., to win a competition, to find a hidden treasure)", type: 'text' as const },
    { id: 'characterNeed', text: "What do they truly need internally? What lesson must they learn to become whole? (e.g., to learn to trust, to forgive themselves)", type: 'text' as const },
    { id: 'characterFlaw', text: "What is their major character flaw that prevents them from achieving their need? (e.g., arrogance, insecurity, stubbornness)", type: 'text' as const },
    { id: 'worldSetting', text: "Briefly describe the world. What is the tone and setting? (e.g., a gritty, neon-lit cyberpunk city; a whimsical, magical forest)", type: 'text' as const },
    { id: 'externalConflict', text: "What is the primary external conflict? What stands in the protagonist's way? (e.g., a rival corporation, a corrupt government, a monster)", type: 'text' as const },
    { id: 'theme', text: "What is the central theme of the story? (e.g., love conquers all, the corrupting nature of power)", type: 'text' as const },
    { id: 'sceneDescription', text: "Describe the specific action or events of the scene.", type: 'text' as const },
];

// FIX: Explicitly type `shotQuestions` as `Question[]` for type consistency and to prevent potential errors.
const shotQuestions: Question[] = [
    { id: 'shotName', text: 'What is a descriptive name for this shot? (e.g., "Hero\'s Introduction", "Final Confrontation Close-up")', type: 'text' as const },
    { id: 'shotType', text: 'What is the shot type or composition?', type: 'option' as const, options: ['Extreme Wide Shot', 'Wide Shot', 'Full Shot', 'Medium Shot', 'Close-up', 'Extreme Close-up', 'Over-the-shoulder', 'POV', 'Dutch Angle'] },
    { id: 'cameraType', text: 'What camera type are you envisioning?', type: 'option' as const, options: ['Arri Alexa 65', 'RED Monstro 8K VV', 'Sony Venice 2', 'IMAX MSM 9802', '1940s Mitchell BNC', '1990s Arri 435'] },
    { id: 'focalLength', text: 'What is the focal length of the lens?', type: 'option' as const, options: ['15mm (wide, immersive)', '35mm (cinematic standard)', '50mm (natural human-eye)', '100mm (portrait compression)', '200mm (extreme telephoto)'] },
    { id: 'dof', text: 'Describe the desired depth of field / aperture.', type: 'option' as const, options: ['f/1.2 (dreamy shallow, creamy bokeh)', 'f/2.8 (cinematic shallow)', 'f/5.6 (balanced sharpness)', 'f/11 (deep focus)'] },
    { id: 'cameraMovement', text: 'Describe the camera movement.', type: 'text' as const },
    { id: 'filmStock', text: 'What film stock or look are you going for?', type: 'option' as const, options: ['Kodak Vision3 500T 5219 (Dune)', 'Kodak Ektar 100 (Walter Mitty)', 'Fujifilm Eterna 250D (Lost in Translation)', 'Ilford HP5 (Roma)', 'Technicolor 3-strip (Wizard of Oz)'] },
    { id: 'lightingStyle', text: 'Describe the lighting style.', type: 'option' as const, options: ['High-key', 'Low-key with dramatic shadows', 'Golden hour', 'Moonlit', 'Window backlighting', 'Tungsten'] },
    { id: 'colorGrading', text: 'What is the color grading style?', type: 'option' as const, options: ['Teal & Orange', 'Golden glow', 'Desaturated noir', 'Muted earth tones', 'Hyper-saturated'] },
    { id: 'framing', text: 'Describe the framing and composition rules.', type: 'text' as const },
    { id: 'characterBlocking', text: 'How are the characters placed or "blocked" in the scene?', type: 'text' as const },
];

const imageQuestions: any[] = []; // This build is special and doesn't have linear questions.

// FIX: Explicitly type `videoQuestions` as `Question[]` to resolve errors where TypeScript could not guarantee the existence of the `options` property on all elements of the array.
const videoQuestions: Question[] = [
    { id: 'sceneName', text: 'What do you want to call this video scene for tracking purposes?', type: 'text' as const },
    { id: 'editingPace', text: 'What is the desired editing pace?', type: 'option' as const, options: ['Fast-paced with quick cuts', 'A slow long take', 'Rhythmic match cuts'] },
];

// FIX: Explicitly type `editQuestions` as `Question[]` for type consistency and to prevent potential errors.
const editQuestions: Question[] = [
    { id: 'feedbackFocus', text: 'What is the primary focus for this editing session?', type: 'text' as const },
];

export const BUILDS: Build[] = [
    { id: 'story', name: 'Storybuild', description: 'Develop characters, plot, and themes for your narrative.', targetAssetType: 'primary', icon: <FilmIcon className="w-6 h-6" title="Storybuild" />, questions: storyQuestions },
    { id: 'shot', name: 'Shotbuild', description: 'Design the cinematography and visual language for a specific shot.', targetAssetType: 'primary', icon: <DocumentTextIcon className="w-6 h-6" title="Shotbuild" />, questions: shotQuestions },
    { id: 'image', name: 'Imgbuild', description: 'Generate AI image prompts from your Shotbuild seeds.', targetAssetType: 'secondary', icon: <PhotoIcon className="w-6 h-6" title="Imgbuild" />, questions: imageQuestions },
    { id: 'video', name: 'Videobuild', description: 'Create a plan for a video sequence, including editing and audio.', targetAssetType: 'secondary', icon: <VideoCameraIcon className="w-6 h-6" title="Videobuild" />, questions: videoQuestions },
    { id: 'edit', name: 'Edit Report', description: 'Get AI feedback on pacing, visuals, and audio for an edit.', targetAssetType: 'secondary', icon: <ScissorsIcon className="w-6 h-6" title="Edit report" />, questions: editQuestions },
];

export const WORKFLOWS: Workflow[] = [
    { id: 'full-production', name: 'Full Production', description: 'Go from concept to final edit plan, step-by-step.', builds: ['story', 'shot', 'image', 'video', 'edit'] },
    { id: 'visual-concept', name: 'Visual Concept', description: 'Focus on developing a single, powerful visual moment.', builds: ['shot', 'image'] },
    { id: 'narrative-short', name: 'Narrative Short', description: 'Flesh out a story and its key shots.', builds: ['story', 'shot'] },
];

export const ALL_TAGS = {
    story: storyQuestions,
    shot: shotQuestions,
    video: videoQuestions,
    edit: editQuestions,
    image: [], // Image build uses tags from shot build
};

export const TAG_GROUPS: Record<string, string[]> = {
    'Story Layer': [...storyQuestions.map(q => q.id), 'concept'],
    'Visual Layer': [
        'shotName',
        'shotType',
        'focalLength',
        'dof',
        'cameraMovement',
        'lightingStyle',
        'colorGrading',
        'framing',
        'characterBlocking',
        'imageRef',
        'masterStyle',
        'variantShot',
    ],
    'Technical Layer': [
        'cameraType',
        'filmStock',
    ],
    'Post-Production': [
        'sceneName',
        'editingPace',
        'feedbackFocus',
    ],
};

// --- V3 Constants (Quantum Box) ---

export interface NodeTemplate {
    type: string;
    name: string;
    description: string;
    category: string;
    nodeType: 'input' | 'option' | 'text' | 'output';
    options?: { value: string; label: string; }[];
}

const idToName = (id: string) => id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

const questionsToNodeTemplates = (questions: Question[], category: string): Record<string, NodeTemplate> => {
    return Object.fromEntries(questions.map(q => {
        const name = idToName(q.id);
        return [q.id, {
            type: q.id,
            name: name,
            description: `Defines the '${name}' aspect.`,
            category,
            nodeType: q.type === 'option' ? 'option' : 'text',
            options: q.options?.map(o => ({ value: o, label: o }))
        }];
    }));
};


export const NODE_TEMPLATES: Record<string, NodeTemplate> = {
    // Core
    promptOutput: { 
        type: 'promptOutput', 
        name: 'AI Prompt Output', 
        description: 'The final destination. Connect planets here and select an output type to generate a result.', 
        category: 'Core', 
        nodeType: 'option',
        options: [
            { value: 'image', label: 'Image Prompt' },
            { value: 'video', label: 'Video Scene Plan' },
            { value: 'story', label: 'Story Summary' },
            { value: 'batch', label: 'Batch Image Prompts' },
        ],
    },
    concept: { type: 'concept', name: 'Concept / Word', description: 'A generic node for any core concept, word, or idea.', category: 'Core', nodeType: 'text' },
    imageRef: { type: 'imageRef', name: 'Image Reference', description: 'Describe a visual reference, style, or existing artwork.', category: 'Shot', nodeType: 'text' },
    masterStyle: { type: 'masterStyle', name: 'Master Style', description: 'Define the master aesthetic (lighting, color, lens) for a batch of shots.', category: 'Shot', nodeType: 'text' },
    variantShot: { type: 'variantShot', name: 'Variant Shot', description: 'Describe the subject/action of a single shot in a batch. Connect to a Master Style node.', category: 'Shot', nodeType: 'text' },

    // Story
    ...questionsToNodeTemplates(storyQuestions, 'Story'),
    
    // Shot
    ...questionsToNodeTemplates(shotQuestions, 'Shot'),

    // Video
    ...questionsToNodeTemplates(videoQuestions, 'Video'),
    
    // Edit
    ...questionsToNodeTemplates(editQuestions, 'Edit'),
};

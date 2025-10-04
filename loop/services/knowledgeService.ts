import cameraMovementNotes from '../knowledge/camera_movement_notes.md?raw';
import filmTechniquesNotes from '../knowledge/film_techniques_notes.md?raw';
import fracturedLoopNotes from '../knowledge/fractured_loop_build_system_notes.md?raw';
import sceneWritingNotes from '../knowledge/scene_writing_and_opening_hooks.md?raw';
import screenplayConventions from '../knowledge/screenplay_conventions_and_archetypes.md?raw';
import screenwritingDay6 from '../knowledge/screenwriting_day6_notes.md?raw';
import screenwritingLogline from '../knowledge/screenwriting_logline_plot_exposure_notes.md?raw';
import storyIdeaGeneration from '../knowledge/story_idea_generation_notes.md?raw';
import storyStructuresNotes from '../knowledge/story_structures_notes.md?raw';
import subtextNotes from '../knowledge/subtext_notes.md?raw';

export interface KnowledgeBase {
  cameraMovements: string[];
  filmTechniques: string[];
  storyStructures: string[];
  sceneWritingTechniques: string[];
  screenplayArchetypes: string[];
  fullContext: string;
}

const extractListItems = (text: string): string[] => {
  const items: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const item = trimmed.substring(2).split(':')[0].trim();
      if (item && item.length > 0 && item.length < 50) {
        items.push(item);
      }
    } else if (trimmed.startsWith('## ')) {
      const item = trimmed.substring(3).trim();
      if (item && item.length > 0 && item.length < 50) {
        items.push(item);
      }
    }
  }
  
  return [...new Set(items)];
};

export const loadKnowledgeBase = (): KnowledgeBase => {
  const cameraMovements = extractListItems(cameraMovementNotes);
  const filmTechniques = extractListItems(filmTechniquesNotes);
  const storyStructures = extractListItems(storyStructuresNotes);
  const sceneWritingTechniques = extractListItems(sceneWritingNotes);
  const screenplayArchetypes = extractListItems(screenplayConventions);

  const fullContext = `
# Film Production Knowledge Base

## Camera Movements and Techniques
${cameraMovementNotes}

## Film Techniques
${filmTechniquesNotes}

## Story Structures
${storyStructuresNotes}

## Scene Writing and Opening Hooks
${sceneWritingNotes}

## Screenplay Conventions and Archetypes
${screenplayConventions}

## Screenwriting Day 6 Notes
${screenwritingDay6}

## Logline and Plot Exposure
${screenwritingLogline}

## Story Idea Generation
${storyIdeaGeneration}

## Subtext Notes
${subtextNotes}

## Fractured Loop Build System
${fracturedLoopNotes}
`;

  return {
    cameraMovements,
    filmTechniques,
    storyStructures,
    sceneWritingTechniques,
    screenplayArchetypes,
    fullContext
  };
};

export const knowledgeBase = loadKnowledgeBase();

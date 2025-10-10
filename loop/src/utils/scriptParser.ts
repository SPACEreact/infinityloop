export interface ParsedScene {
  slugline: string;
  content: string;
  summary: string;
  characters: string[];
  order: number;
}

const SLUGLINE_PREFIXES = [
  'INT',
  'EXT',
  'INT/EXT',
  'EXT/INT',
  'INT-EXT',
  'EXT-INT',
  'I/E',
  'EST'
];

const sluglinePattern = new RegExp(
  `^(?:${SLUGLINE_PREFIXES.map(prefix => prefix.replace(/[\\/]/g, '\\$&')).join('|')})(?:\\.|\\s|$)`
);

const isLikelySlugline = (line: string): boolean => {
  if (!line) {
    return false;
  }

  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  const normalized = trimmed.toUpperCase();
  if (!sluglinePattern.test(normalized)) {
    return false;
  }

  const alphaCharacters = normalized.replace(/[^A-Z]/g, '');
  return alphaCharacters.length >= 3;
};

const CHARACTER_MAX_WORDS = 6;
const CHARACTER_MAX_LENGTH = 40;

const isLikelyCharacterLine = (line: string): boolean => {
  if (!line) {
    return false;
  }

  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.includes(':')) {
    return false;
  }

  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount === 0 || wordCount > CHARACTER_MAX_WORDS) {
    return false;
  }

  if (trimmed.length > CHARACTER_MAX_LENGTH) {
    return false;
  }

  const lettersOnly = trimmed.replace(/[^A-Z\s'()\-]/gi, '');
  if (!/[A-Z]/.test(lettersOnly)) {
    return false;
  }

  return lettersOnly === lettersOnly.toUpperCase();
};

const buildSceneSummary = (slugline: string, lines: string[]): string => {
  const firstMeaningful = lines.find(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      return false;
    }
    if (isLikelyCharacterLine(trimmed)) {
      return false;
    }
    return true;
  });

  const source = firstMeaningful?.trim() || slugline.trim();
  return source.length > 240 ? `${source.slice(0, 237).trimEnd()}…` : source;
};

const extractCharactersFromLine = (line: string, accumulator: Set<string>): void => {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  if (isLikelyCharacterLine(trimmed)) {
    const normalizedName = trimmed.replace(/\s+\([^)]*\)$/, '').trim();
    if (normalizedName) {
      accumulator.add(normalizedName);
    }
    return;
  }

  const colonMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9'().\-\s]{0,39})\s*:/);
  if (colonMatch) {
    const name = colonMatch[1]?.trim();
    if (name) {
      accumulator.add(name.toUpperCase());
    }
  }
};

type WorkingScene = {
  slugline: string;
  lines: string[];
  characters: Set<string>;
};

const buildStructuredScenes = (lines: string[]): WorkingScene[] => {
  const scenes: WorkingScene[] = [];
  let currentScene: WorkingScene | null = null;

  lines.forEach(rawLine => {
    const line = rawLine.replace(/\r$/, '');
    if (isLikelySlugline(line)) {
      if (currentScene) {
        scenes.push(currentScene);
      }

      currentScene = {
        slugline: line.trim(),
        lines: [],
        characters: new Set(),
      };
      return;
    }

    if (!currentScene) {
      return;
    }

    currentScene.lines.push(line);
    extractCharactersFromLine(line, currentScene.characters);
  });

  if (currentScene) {
    scenes.push(currentScene);
  }

  return scenes;
};

const buildFallbackScenes = (input: string): ParsedScene[] => {
  const blocks = input
    .split(/\n{3,}/)
    .map(block => block.trim())
    .filter(Boolean);

  const meaningfulBlocks = blocks.length > 0 ? blocks : [input.trim()].filter(Boolean);
  if (meaningfulBlocks.length === 0) {
    return [];
  }

  return meaningfulBlocks.map((block, index) => {
    const lines = block.split('\n');
    const firstMeaningful = lines.find(line => line.trim())?.trim();
    const snippet = firstMeaningful ? firstMeaningful.replace(/\s+/g, ' ').trim() : '';
    const slugline = snippet
      ? `SCENE ${index + 1} - ${snippet.length > 80 ? `${snippet.slice(0, 77).trimEnd()}…` : snippet}`
      : `SCENE ${index + 1}`;

    const characters = new Set<string>();
    lines.forEach(line => extractCharactersFromLine(line, characters));

    const content = block.trim();

    return {
      slugline,
      content,
      summary: buildSceneSummary(snippet || slugline, lines),
      characters: Array.from(characters),
      order: index,
    } satisfies ParsedScene;
  });
};

export const parseScriptScenes = (input: string): ParsedScene[] => {
  if (!input || !input.trim()) {
    return [];
  }

  const normalized = input.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const structuredScenes = buildStructuredScenes(lines);
  if (structuredScenes.length > 0) {
    return structuredScenes.map((scene, index) => {
      const contentLines = [scene.slugline, ...scene.lines];
      const content = contentLines.join('\n').replace(/\s+$/, '').replace(/^\s+/, '');

      return {
        slugline: scene.slugline,
        content,
        summary: buildSceneSummary(scene.slugline, scene.lines),
        characters: Array.from(scene.characters),
        order: index,
      } satisfies ParsedScene;
    });
  }

  return buildFallbackScenes(normalized);
};

export const hasImportableScript = (input: string): boolean => {
  const scenes = parseScriptScenes(input);
  return scenes.length > 0;
};

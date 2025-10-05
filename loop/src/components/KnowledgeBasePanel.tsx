import React, { useMemo, useState } from 'react';
import { knowledgeBase } from '../services/knowledgeService';
import { DocumentTextIcon, FilmIcon, SparklesIcon, VideoCameraIcon } from './IconComponents';

const SearchIcon: React.FC<{ className?: string; title?: string }> = ({ className, title }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    focusable="false"
    role={title ? 'img' : 'img'}
    aria-hidden={title ? undefined : true}
  >
    {title ? <title>{title}</title> : null}
    <circle
      cx="11"
      cy="11"
      r="6"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
    />
    <line
      x1="15.5"
      y1="15.5"
      x2="20"
      y2="20"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

interface KnowledgeCategory {
  id: keyof typeof knowledgeBase;
  label: string;
  description: string;
  icon: React.ReactNode;
  items: string[];
}

const KnowledgeBasePanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const categories: KnowledgeCategory[] = useMemo(
    () => [
      {
        id: 'cameraMovements',
        label: 'Camera Movements',
        description: 'Signature moves and techniques for dynamic shots.',
        icon: <VideoCameraIcon className="w-5 h-5 text-indigo-300" title="Camera" />,
        items: knowledgeBase.cameraMovements,
      },
      {
        id: 'filmTechniques',
        label: 'Film Techniques',
        description: 'Cinematic devices to shape tone, pacing, and emotion.',
        icon: <FilmIcon className="w-5 h-5 text-indigo-300" title="Film" />,
        items: knowledgeBase.filmTechniques,
      },
      {
        id: 'storyStructures',
        label: 'Story Structures',
        description: 'Narrative frameworks to organize your story arc.',
        icon: <DocumentTextIcon className="w-5 h-5 text-indigo-300" title="Story" />,
        items: knowledgeBase.storyStructures,
      },
      {
        id: 'sceneWritingTechniques',
        label: 'Scene Writing',
        description: 'Hooks, beats, and tactics for compelling scenes.',
        icon: <SparklesIcon className="w-5 h-5 text-indigo-300" title="Scene" />,
        items: knowledgeBase.sceneWritingTechniques,
      },
      {
        id: 'screenplayArchetypes',
        label: 'Screenplay Archetypes',
        description: 'Archetypal roles and conventions from screenwriting.',
        icon: <DocumentTextIcon className="w-5 h-5 text-indigo-300" title="Archetype" />,
        items: knowledgeBase.screenplayArchetypes,
      },
    ],
    []
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) {
      return categories;
    }

    return categories
      .map((category) => {
        const matchingItems = category.items.filter((item) =>
          item.toLowerCase().includes(normalizedSearch)
        );
        return { ...category, items: matchingItems };
      })
      .filter((category) => category.items.length > 0);
  }, [categories, normalizedSearch]);

  const hasResults = filteredCategories.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="panel-section px-3 py-2 flex items-center gap-2">
        <SearchIcon className="w-5 h-5 ink-subtle" title="Search knowledge base" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search camera moves, story structures, and more..."
          className="flex-1 bg-transparent text-sm ink-strong placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none"
          aria-label="Search knowledge base"
        />
      </div>

      {!hasResults ? (
        <div className="panel-section flex-1 flex items-center justify-center px-6 py-8 text-center text-sm ink-subtle">
          <p>No results. Try a different term like “arc” or “dolly”.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {filteredCategories.map((category) => (
                <section key={category.id} className="panel-section overflow-hidden">
                  <header className="flex items-start gap-3 p-4 border-b border-[hsl(var(--border))]">
                    <div className="mt-1">{category.icon}</div>
                    <div>
                      <h3 className="text-base font-semibold ink-strong">{category.label}</h3>
                      <p className="text-xs ink-subtle">{category.description}</p>
                    </div>
                  </header>
                  <ul className="p-4 grid gap-2 text-sm ink-strong">
                    {category.items.map((item) => (
                      <li key={item} className="panel-surface rounded-lg px-3 py-2 text-sm">
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBasePanel;

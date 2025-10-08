import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { knowledgeBase } from '../services/knowledgeService';
import {
  DocumentTextIcon,
  FilmIcon,
  SparklesIcon,
  VideoCameraIcon,
  XMarkIcon,
} from './IconComponents';

interface ReferenceViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

type KnowledgeCategoryId =
  | 'cameraMovements'
  | 'filmTechniques'
  | 'storyStructures'
  | 'sceneWritingTechniques'
  | 'screenplayArchetypes';

interface KnowledgeCategory {
  id: KnowledgeCategoryId;
  label: string;
  description: string;
  icon: React.ReactNode;
  items: string[];
}

interface ContextSection {
  title: string;
  content: string;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ReferenceViewer: React.FC<ReferenceViewerProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | KnowledgeCategoryId>('all');
  const [selectedTopic, setSelectedTopic] = useState<{topic: string; category: string; content: string} | null>(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dialogTitleId = React.useId();
  const dialogDescriptionId = React.useId();

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setActiveCategory('all');
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const timeout = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 120);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  const categories = useMemo<KnowledgeCategory[]>(
    () => [
      {
        id: 'cameraMovements',
        label: 'Camera Movements',
        description: 'Signature moves and techniques for dynamic shots.',
        icon: <VideoCameraIcon className="w-5 h-5 text-primary" title="Camera" />,
        items: knowledgeBase.cameraMovements,
      },
      {
        id: 'filmTechniques',
        label: 'Film Techniques',
        description: 'Cinematic devices to shape tone, pacing, and emotion.',
        icon: <FilmIcon className="w-5 h-5 text-primary" title="Film" />,
        items: knowledgeBase.filmTechniques,
      },
      {
        id: 'storyStructures',
        label: 'Story Structures',
        description: 'Narrative frameworks to organize your story arc.',
        icon: <DocumentTextIcon className="w-5 h-5 text-primary" title="Story" />,
        items: knowledgeBase.storyStructures,
      },
      {
        id: 'sceneWritingTechniques',
        label: 'Scene Writing',
        description: 'Hooks, beats, and tactics for compelling scenes.',
        icon: <SparklesIcon className="w-5 h-5 text-primary" title="Scene" />,
        items: knowledgeBase.sceneWritingTechniques,
      },
      {
        id: 'screenplayArchetypes',
        label: 'Screenplay Archetypes',
        description: 'Archetypal roles and conventions from screenwriting.',
        icon: <DocumentTextIcon className="w-5 h-5 text-primary" title="Archetypes" />,
        items: knowledgeBase.screenplayArchetypes,
      },
    ],
    []
  );

  const structuredContext = useMemo<ContextSection[]>(() => {
    const rawSections = knowledgeBase.fullContext.split('\n## ');
    const sections: ContextSection[] = [];

    rawSections.forEach((section, index) => {
      const trimmed = section.trim();
      if (!trimmed) return;

      const lines = trimmed.split('\n');
      if (!lines.length) return;

      if (index === 0) {
        const titleLine = lines[0].replace(/^#\s*/, '').trim();
        const content = lines.slice(1).join('\n').trim();
        if (titleLine) {
          sections.push({ title: titleLine, content });
        }
        return;
      }

      const titleLine = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();
      if (titleLine) {
        sections.push({ title: titleLine, content });
      }
    });

    return sections;
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const searchPattern = useMemo(() => {
    if (!normalizedSearch) return null;
    return new RegExp(`(${escapeRegExp(normalizedSearch)})`, 'ig');
  }, [normalizedSearch]);

  const visibleCategories = useMemo(() => {
    if (activeCategory === 'all') return categories;
    return categories.filter((category) => category.id === activeCategory);
  }, [activeCategory, categories]);

  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) {
      return visibleCategories;
    }

    return visibleCategories
      .map((category) => {
        const filteredItems = category.items.filter((item) =>
          item.toLowerCase().includes(normalizedSearch)
        );
        return { ...category, items: filteredItems };
      })
      .filter((category) => category.items.length > 0);
  }, [normalizedSearch, visibleCategories]);

  const hasResults = filteredCategories.length > 0;

  const totalItems = useMemo(
    () => categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories]
  );

  const activeTotal = useMemo(() => {
    if (activeCategory === 'all') return totalItems;
    const category = categories.find((entry) => entry.id === activeCategory);
    return category ? category.items.length : 0;
  }, [activeCategory, categories, totalItems]);

  const highlightMatches = useCallback(
    (text: string) => {
      if (!searchPattern) return text;
      const segments = text.split(searchPattern);
      return segments.map((segment, index) =>
        index % 2 === 1 ? (
          <mark
            key={`${segment}-${index}`}
            className="rounded-sm bg-primary/30 px-1 text-primary-foreground"
          >
            {segment}
          </mark>
        ) : (
          <React.Fragment key={`${segment}-${index}`}>{segment}</React.Fragment>
        )
      );
    },
    [searchPattern]
  );

  const contextMatches = useMemo(() => {
    if (!normalizedSearch) return [] as ContextSection[];

    return structuredContext.filter((section) => {
      const haystack = `${section.title}\n${section.content}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, structuredContext]);

  const renderContextSnippet = useCallback(
    (content: string) => {
      if (!normalizedSearch) {
        return content;
      }

      const lowerContent = content.toLowerCase();
      const matchIndex = lowerContent.indexOf(normalizedSearch);
      if (matchIndex === -1) {
        return content;
      }

      const start = Math.max(0, matchIndex - 80);
      const end = Math.min(content.length, matchIndex + normalizedSearch.length + 120);
      const snippet = `${start > 0 ? '…' : ''}${content.slice(start, end)}${end < content.length ? '…' : ''}`;

      if (!searchPattern) {
        return snippet;
      }

      const segments = snippet.split(searchPattern);
      return segments.map((segment, index) =>
        index % 2 === 1 ? (
          <mark
            key={`context-${segment}-${index}`}
            className="rounded-sm bg-primary/30 px-1 text-primary-foreground"
          >
            {segment}
          </mark>
        ) : (
          <React.Fragment key={`context-${segment}-${index}`}>{segment}</React.Fragment>
        )
      );
    },
    [normalizedSearch, searchPattern]
  );

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  const handleTopicClick = (topic: string, categoryId: string) => {
    // Find detailed content about the topic from the knowledge base
    const detailedContent = findTopicDetails(topic, categoryId);
    setSelectedTopic({
      topic,
      category: categoryId,
      content: detailedContent
    });
    setIsTopicModalOpen(true);
  };

  const findTopicDetails = (topic: string, categoryId: string): string => {
    // Search through structured context for relevant information
    const relevantSections = structuredContext.filter(section => 
      section.content.toLowerCase().includes(topic.toLowerCase()) ||
      section.title.toLowerCase().includes(topic.toLowerCase())
    );
    
    if (relevantSections.length > 0) {
      return relevantSections.map(section => 
        `**${section.title}**\n\n${section.content}`
      ).join('\n\n---\n\n');
    }
    
    // Fallback to basic description from knowledge base
    const categories = {
      cameraMovements: knowledgeBase.cameraMovements,
      filmTechniques: knowledgeBase.filmTechniques,
      storyStructures: knowledgeBase.storyStructures,
      sceneWritingTechniques: knowledgeBase.sceneWritingTechniques,
      screenplayArchetypes: knowledgeBase.screenplayArchetypes
    };
    
    const categoryItems = categories[categoryId as keyof typeof categories] || [];
    const itemIndex = categoryItems.indexOf(topic);
    
    if (itemIndex !== -1) {
      return `This is a ${categoryId.replace(/([A-Z])/g, ' $1').toLowerCase()} technique: **${topic}**\n\nFor detailed information about this technique, please refer to the full knowledge base or ask the AI assistant for specific guidance on how to apply this in your project.`;
    }
    
    return `**${topic}**\n\nThis ${categoryId.replace(/([A-Z])/g, ' $1').toLowerCase()} technique is part of our curated knowledge base. For specific guidance on implementation and usage, please consult with the AI assistant or reference additional filmmaking resources.`;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOverlayClick}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/70 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
    >
      <div className="relative mx-4 w-full max-w-5xl rounded-3xl border-2 border-border bg-card/95 shadow-[0_45px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 opacity-50"></div>
        <div className="relative">
          <div className="flex items-start justify-between gap-4 border-b-2 border-border px-6 py-5">
            <div className="space-y-1">
              <h2 id={dialogTitleId} className="text-xl font-semibold text-foreground">
                Creative Reference Library
              </h2>
              <p id={dialogDescriptionId} className="text-sm text-muted-foreground">
                Browse curated notes from the knowledge base without leaving your workspace flow.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border-2 border-border bg-card/5 p-2 text-muted-foreground transition hover:bg-card/10 cta-button shadow-lg transform hover:scale-110"
              style={{
                background: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
                border: '2px solid #ccc'
              }}
              aria-label="Close reference viewer"
            >
              <XMarkIcon className="h-5 w-5" title="Close" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-4 rounded-2xl border-2 border-border bg-card/80 p-4 shadow-inner backdrop-blur-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-xs uppercase tracking-[0.35em] text-primary/80">
                Reference Filters
              </div>
              <div className="text-xs text-muted-foreground">
                Showing <span className="text-primary">{hasResults ? filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0) : 0}</span> of{' '}
                <span className="text-primary">{activeTotal}</span> entries
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-xs font-semibold transition cta-button shadow-lg transform hover:scale-105 ${
                  activeCategory === 'all'
                    ? 'border-primary/60 bg-primary/20 text-primary-foreground'
                    : 'border-border bg-card/5 text-muted-foreground hover:border-primary/40 hover:text-primary-foreground'
                }`}
                style={{
                  background: activeCategory === 'all' ? 'linear-gradient(145deg, hsl(var(--primary) / 0.9), hsl(var(--accent) / 0.8))' : 'linear-gradient(145deg, #ffffff, #e6e6e6)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
                  border: '2px solid #ccc'
                }}
              >
                All
                <span className="rounded-full bg-card/40 px-2 py-0.5 text-[0.65rem] font-medium">
                  {totalItems}
                </span>
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-xs font-semibold transition cta-button shadow-lg transform hover:scale-105 ${
                    activeCategory === category.id
                      ? 'border-primary/60 bg-primary/20 text-primary-foreground'
                      : 'border-border bg-card/5 text-muted-foreground hover:border-primary/40 hover:text-primary-foreground'
                  }`}
                  style={{
                    background: activeCategory === category.id ? 'linear-gradient(145deg, hsl(var(--primary) / 0.9), hsl(var(--accent) / 0.8))' : 'linear-gradient(145deg, #ffffff, #e6e6e6)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
                    border: '2px solid #ccc'
                  }}
                >
                  {category.label}
                  <span className="rounded-full bg-card/40 px-2 py-0.5 text-[0.65rem] font-medium">
                    {category.items.length}
                  </span>
                </button>
              ))}
            </div>

            <label className="relative flex items-center gap-2 rounded-xl border border-border bg-card/40 px-4 py-2 text-sm text-foreground focus-within:border-primary/60">
              <span className="text-muted-foreground">🔍</span>
              <input
                ref={searchInputRef}
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search camera moves, archetypes, structures..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Filter reference library"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="rounded-full bg-card/10 px-2 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-foreground transition hover:bg-card/20"
                >
                  Clear
                </button>
              )}
            </label>
          </div>

          {normalizedSearch && contextMatches.length > 0 && (
            <div className="rounded-2xl border border-primary/40 bg-primary/30 p-4">
              <h3 className="text-sm font-semibold text-primary-foreground">
                In-depth notes matching "{searchTerm}"
              </h3>
              <div className="mt-3 space-y-3">
                {contextMatches.map((section) => (
                  <div
                    key={section.title}
                    className="rounded-xl border border-border bg-card/40 p-3 text-sm text-foreground"
                  >
                    <div className="text-xs uppercase tracking-[0.3em] text-primary/80">
                      {section.title}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                      {renderContextSnippet(section.content)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {!hasResults ? (
              <div className="col-span-full rounded-2xl border border-border bg-card/80 p-10 text-center text-sm text-muted-foreground">
                No quick-reference results. Try a different term or view the full notes below.
              </div>
            ) : (
              filteredCategories.map((category) => (
                category.items.length > 0 && (
                  <section
                    key={category.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-card/80 p-4"
                  >
                    <header className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">{category.icon}</div>
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-foreground">{category.label}</h3>
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </div>
                    </header>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {category.items.map((item) => (
                        <li
                          key={item}
                          className="rounded-xl border border-border bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 px-3 py-2 cursor-pointer transition-all duration-200 transform hover:scale-105 hover:shadow-md"
                          onClick={() => handleTopicClick(item, category.id)}
                        >
                          <div className="font-medium text-white">
                            {highlightMatches(item)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              ))
            )}
          </div>

          <details className="group rounded-2xl border border-border bg-card/80 p-4 text-sm text-foreground">
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-foreground">
              <span>View full knowledge notes</span>
              <span className="text-xs uppercase tracking-[0.3em] text-primary/70 transition group-open:text-primary-foreground">
                Expand
              </span>
            </summary>
            <div className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-2 text-sm text-foreground">
              {structuredContext.map((section) => (
                <article key={section.title} className="space-y-2 rounded-xl border border-border bg-card/40 p-3">
                  <h4 className="text-xs uppercase tracking-[0.3em] text-primary/80">
                    {section.title}
                  </h4>
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {section.content}
                  </div>
                </article>
              ))}
            </div>
          </details>
        </div>
      </div>
      
      {/* Topic Detail Modal */}
      {isTopicModalOpen && selectedTopic && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsTopicModalOpen(false);
            }
          }}
        >
          <div className="relative mx-4 w-full max-w-3xl rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-gray-900/95 to-gray-800/95 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-50"></div>
            <div className="relative">
              <div className="flex items-start justify-between gap-4 border-b-2 border-primary/20 px-6 py-5">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-white">
                    {selectedTopic.topic}
                  </h3>
                  <p className="text-sm text-blue-300">
                    {selectedTopic.category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Technique
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTopicModalOpen(false)}
                  className="rounded-full border-2 border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 transform hover:scale-110"
                  style={{
                    background: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
                    border: '2px solid #ccc'
                  }}
                  aria-label="Close topic detail"
                >
                  <XMarkIcon className="h-5 w-5" title="Close" />
                </button>
              </div>
              
              <div className="px-6 py-6">
                <div className="prose prose-lg prose-invert max-w-none">
                  <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {selectedTopic.content.split('\n').map((line, index) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <h4 key={index} className="text-xl font-bold text-blue-300 mt-6 mb-3">
                            {line.replace(/\*\*/g, '')}
                          </h4>
                        );
                      }
                      if (line === '---') {
                        return <hr key={index} className="my-6 border-gray-600" />;
                      }
                      if (line.trim() === '') {
                        return <br key={index} />;
                      }
                      return (
                        <p key={index} className="mb-4 text-gray-300">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
                
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setIsTopicModalOpen(false)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Apply to Project
                  </button>
                  <button
                    onClick={() => setIsTopicModalOpen(false)}
                    className="px-6 py-3 bg-gray-700 text-gray-300 font-medium rounded-xl hover:bg-gray-600 transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferenceViewer;

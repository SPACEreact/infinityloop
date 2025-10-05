

import React, { Suspense, lazy, useState } from 'react';
import type { BuildContext, Seed, Question } from '../types';
import { ALL_TAGS, TAG_GROUPS, NODE_TEMPLATES } from '../constants.tsx';
import { DocumentTextIcon, FilmIcon, PhotoIcon, ScissorsIcon, VideoCameraIcon, SparklesIcon, QuestionMarkCircleIcon } from './IconComponents';
import { OPEN_KNOWLEDGE_EVENT } from '../services/uiEvents';

interface ContextPanelProps {
  mode: 'build' | 'sandbox';
  buildContext?: BuildContext;
  sandboxContext?: Record<string, string>;
  isWeightingEnabled?: boolean;
  onWeightingToggle?: (enabled: boolean) => void;
  styleRigidity?: number;
  onStyleRigidityChange?: (value: number) => void;
  tagWeights?: Record<string, number>;
  onTagWeightChange?: (tagId: string, weight: number) => void;
}

const buildTypeToIcon: Record<string, React.ReactNode> = {
    story: <FilmIcon className="w-5 h-5" title="Story timeline" />,
    shot: <DocumentTextIcon className="w-5 h-5" title="Shot timeline" />,
    image: <PhotoIcon className="w-5 h-5" title="Image timeline" />,
    video: <VideoCameraIcon className="w-5 h-5" title="Video timeline" />,
    edit: <ScissorsIcon className="w-5 h-5" title="Edit timeline" />,
};

const SeedCard: React.FC<{ seed: Seed }> = ({ seed }) => {
    return (
        <div className="panel-section p-3">
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                    {buildTypeToIcon[seed.sourceBuild] || <DocumentTextIcon className="w-5 h-5" title="Timeline" />}
                </div>
                <div>
                    <p className="font-semibold text-sm ink-strong">{seed.id}</p>
                    <p className="text-xs ink-subtle">{seed.summary}</p>
                </div>
            </div>
        </div>
    )
}

const SeedsView: React.FC<{ buildContext: BuildContext }> = ({ buildContext }) => {
    const allSeeds = Object.keys(buildContext).flatMap(key => buildContext[key]?.seeds || []);

    return (
        <div className="flex flex-col gap-4 pb-6 pr-1">
            {allSeeds.length === 0 ? (
                <div className="panel-section p-6 text-center text-sm ink-subtle">
                    <p className="font-semibold ink-strong">No seeds generated yet.</p>
                    <p className="mt-1">Complete a build to create a seed.</p>
                </div>
            ) : (
                <div className="space-y-4">
                {Object.keys(buildContext).map((buildType) => {
                    const buildData = buildContext[buildType];
                    if (!buildData || buildData.seeds.length === 0) return null;
                    const buildTypeTitle = buildType.charAt(0).toUpperCase() + buildType.slice(1);
                    return (
                        <div key={buildType}>
                            <h3 className="text-xs font-semibold uppercase ink-subtle mb-2 px-2">{buildTypeTitle} Seeds</h3>
                            <div className="space-y-2">
                               {buildData.seeds.map((seed: Seed) => <SeedCard key={seed.id} seed={seed} />)}
                            </div>
                        </div>
                    )
                })}
                </div>
            )}
        </div>
    );
};

const TagsView: React.FC<{ sandboxContext: Record<string, string> }> = ({ sandboxContext }) => {
    const filledTags = Object.keys(sandboxContext);
    
    return (
         <div className="flex flex-col gap-4 pb-6 pr-1">
            {filledTags.length === 0 ? (
                <div className="panel-section p-6 text-center text-sm ink-subtle">
                    <SparklesIcon className="w-8 h-8 mx-auto mb-2" title="Awaiting context" />
                    <p className="font-semibold ink-strong">Your context will appear here.</p>
                    <p className="mt-1">Start chatting to build your project.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.keys(ALL_TAGS).map(buildType => {
                        const tagsForBuild = ALL_TAGS[buildType as keyof typeof ALL_TAGS];
                        const filledTagsForBuild = (tagsForBuild as Question[]).filter(tag => filledTags.includes(tag.id));
                        
                        if (filledTagsForBuild.length === 0) return null;

                        const buildTypeTitle = buildType.charAt(0).toUpperCase() + buildType.slice(1);

                        return (
                            <div key={buildType}>
                                <h3 className="text-xs font-semibold uppercase ink-subtle mb-2 px-2">{buildTypeTitle} Tags</h3>
                                <div className="space-y-2">
                                    {filledTagsForBuild.map((tag: Question) => (
                                        <div key={tag.id} className="panel-section p-3">
                                            <p className="font-semibold ink-strong truncate">{tag.text}</p>
                                            <p className="mt-1 pl-2 border-l-2 border-[hsl(var(--ring))] ink-subtle text-sm">
                                                {sandboxContext[tag.id]}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const WeightsView: React.FC<Omit<ContextPanelProps, 'mode' | 'buildContext' | 'sandboxContext'>> = ({
    isWeightingEnabled, onWeightingToggle, styleRigidity, onStyleRigidityChange, tagWeights, onTagWeightChange
}) => {
    return (
        <div className="flex flex-col gap-4 pb-6 pr-1">
            <div className="panel-section p-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <label htmlFor="enable-weighting" className="font-bold ink-strong">Enable Tag Weighting</label>
                        <QuestionMarkCircleIcon className="w-4 h-4 opacity-70" title="Weighting help" />
                    </div>
                    <button
                        role="switch"
                        aria-checked={isWeightingEnabled}
                        onClick={() => onWeightingToggle?.(!isWeightingEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full toggle-track ${
                            isWeightingEnabled ? 'switch-on' : ''
                        }`}
                        id="enable-weighting"
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full toggle-thumb ${
                            isWeightingEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                </div>
            </div>

            <div className={`transition-opacity duration-300 ${isWeightingEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                 <div className="panel-section p-3 mb-4">
                    <label htmlFor="style-rigidity" className="block font-bold ink-strong mb-2">Style Rigidity</label>
                    <input
                        id="style-rigidity"
                        type="range"
                        min="0"
                        max="100"
                        value={styleRigidity}
                        onChange={(e) => onStyleRigidityChange?.(parseInt(e.target.value, 10))}
                        className="w-full"
                        disabled={!isWeightingEnabled}
                    />
                     <div className="text-xs ink-subtle flex justify-between">
                        <span>More AI Freedom</span>
                        <span>Strict Adherence</span>
                    </div>
                </div>

                {Object.entries(TAG_GROUPS).map(([groupName, tagIds]) => (
                    <details key={groupName} className="panel-section mb-2 overflow-hidden" open>
                        <summary className="font-bold ink-strong p-3 cursor-pointer">{groupName}</summary>
                        <div className="p-3 border-t border-[hsl(var(--border))] space-y-3">
                            {tagIds.map((tagId: string) => {
                                const tag = NODE_TEMPLATES[tagId];
                                if (!tag) return null;
                                return (
                                    <div key={tagId}>
                                        <label className="block text-sm ink-strong mb-1 line-clamp-1" title={tag.name}>{tag.name}</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="200"
                                            value={Math.round((tagWeights?.[tagId] ?? 1.0) * 100)}
                                            onChange={(e) => onTagWeightChange?.(tagId, parseInt(e.target.value, 10) / 100)}
                                            className="w-full"
                                            disabled={!isWeightingEnabled}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </details>
                ))}
            </div>
        </div>
    );
};


const KnowledgeBasePanel = lazy(() => import('./KnowledgeBasePanel'));

const ContextPanel: React.FC<ContextPanelProps> = (props) => {
  const { mode, buildContext, sandboxContext } = props;
  const initialTab = mode === 'build' ? 'seeds' : 'tags';
  const [activeTab, setActiveTab] = useState(initialTab);

  const TABS = {
      build: [
          {id: 'seeds', label: 'Project Seeds'},
          {id: 'weights', label: 'Tag Weights'},
          {id: 'knowledge', label: 'Knowledge'}
      ],
      sandbox: [
          {id: 'tags', label: 'Sandbox Context'},
          {id: 'weights', label: 'Tag Weights'},
          {id: 'knowledge', label: 'Knowledge'}
      ]
  };

  const currentTabs = TABS[mode];

  // If the active tab is not in the current mode's tabs, reset it.
  React.useEffect(() => {
      if (!currentTabs.find(t => t.id === activeTab)) {
          setActiveTab(initialTab);
      }
  }, [mode, activeTab, initialTab, currentTabs]);

  React.useEffect(() => {
      const openKnowledgeTab = () => setActiveTab('knowledge');
      window.addEventListener(OPEN_KNOWLEDGE_EVENT, openKnowledgeTab);
      return () => {
          window.removeEventListener(OPEN_KNOWLEDGE_EVENT, openKnowledgeTab);
      };
  }, []);

  return (
    <aside className="glass-card w-full max-h-full flex flex-col p-4">
        <div className="flex-shrink-0 mb-3 border-b border-[hsl(var(--border))] pb-2">
            <nav className="flex -mb-px">
                {currentTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                            activeTab === tab.id
                            ? 'border-[hsl(var(--ring))] ink-strong'
                            : 'border-transparent ink-subtle hover:ink-strong hover:border-[hsl(var(--border))]'}`
                        }
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
       <div className="flex-1 min-h-0">
            {activeTab === 'seeds' && (
                <div className="h-full overflow-y-auto custom-scrollbar pr-1">
                    <SeedsView buildContext={buildContext || {}} />
                </div>
            )}
            {activeTab === 'tags' && (
                <div className="h-full overflow-y-auto custom-scrollbar pr-1">
                    <TagsView sandboxContext={sandboxContext || {}} />
                </div>
            )}
            {activeTab === 'weights' && (
                <div className="h-full overflow-y-auto custom-scrollbar pr-1">
                    <WeightsView {...props} />
                </div>
            )}
            {activeTab === 'knowledge' && (
                <Suspense fallback={<div className="panel-section p-4 text-sm ink-subtle">Loading knowledge base…</div>}>
                    <div className="h-full">
                        <KnowledgeBasePanel />
                    </div>
                </Suspense>
            )}
       </div>
    </aside>
  );
};

export default ContextPanel;
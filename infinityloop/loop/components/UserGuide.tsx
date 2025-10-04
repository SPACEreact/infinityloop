import React, { useState } from 'react';
import {
  QuestionMarkCircleIcon,
  XMarkIcon,
  RocketLaunchIcon,
  StoryboardIcon,
  TimelinePanelsIcon,
  AssetCrateIcon,
  RobotAssistantIcon,
  MagicWandIcon,
  DramaMasksIcon,
  FilmIcon,
  PalettePanelIcon,
} from './IconComponents';

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserGuide: React.FC<UserGuideProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('getting-started');

  if (!isOpen) return null;

  const tabs = [
    { id: 'getting-started', label: 'Meet Loop', icon: '🌈' },
    { id: 'builds', label: 'Guided Modes', icon: '🪄' },
    { id: 'timeline', label: 'Timelines', icon: '🧵' },
    { id: 'assets', label: 'Sidebars & Assets', icon: '🗂️' },
    { id: 'ai-chat', label: 'AI Studio', icon: '🤖' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'getting-started':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-bold ink-strong">Welcome to Loop</h3>
              <p className="ink-subtle leading-relaxed">
                Loop is the pastel glass workspace for cinematic builders. Glide between timelines, curated sidebars, and an adaptive AI studio to spin ideas into master assets while the brand keeps everything feeling light, luminous, and precise.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="badge-accent px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em]">Pastel Glass UI</span>
                <span className="badge-accent px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em]">Dual Timelines</span>
                <span className="badge-accent px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em]">AI Knowledge Chips</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="panel-section p-4 space-y-2">
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span role="img" aria-label="workspace">🪟</span>
                  Workspace Layout
                </h4>
                <ul className="space-y-1 text-sm ink-subtle leading-relaxed list-disc list-inside">
                  <li><strong className="ink-strong">Left sidebar:</strong> drag pastel asset chips onto the Primary Timeline.</li>
                  <li><strong className="ink-strong">Center canvas:</strong> swap between Timelines and Chat with the glass toggles.</li>
                  <li><strong className="ink-strong">Right sidebar:</strong> dial in controls, knowledge weights, and detail panels.</li>
                </ul>
              </div>
              <div className="panel-section p-4 space-y-2">
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span role="img" aria-label="themes">🎨</span>
                  Chat Themes & Knowledge
                </h4>
                <p className="text-sm ink-subtle leading-relaxed">
                  Choose a chat theme that matches your creative vibe and tap the shimmering knowledge suggestions under the composer to instantly load context-rich prompts.
                </p>
              </div>
            </div>
          </div>
        );

      case 'builds':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-bold ink-strong">Guided Modes</h3>
              <p className="ink-subtle leading-relaxed">
                Loop’s guided modes weave AI expertise into every step. Each mode mirrors the redesigned controls—sidebar assets, timeline handles, and chat suggestions—so your answers become ready-to-drop blocks.
              </p>
            </div>

            <div className="panel-section p-4 space-y-3">
              <h4 className="text-lg font-semibold ink-strong">Launch a Mode</h4>
              <ol className="list-decimal list-inside space-y-2 ink-subtle leading-relaxed text-sm">
                <li>Open the <strong className="ink-strong">Chat</strong> panel and tap the <span className="badge-accent px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.18em]">🪄 Magic Wand</span> beside the composer.</li>
                <li>Select a mode card—each mirrors a column in the workspace.</li>
                <li>Answer the prompts; progress chips light up as you move through sections.</li>
                <li>Choose <strong className="ink-strong">Complete Mode</strong> to send the results straight into the timeline or asset list.</li>
              </ol>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="panel-section p-4 space-y-2">
                <h5 className="font-semibold ink-strong text-base flex items-center gap-2">
                  <span role="img" aria-label="narrative">📖</span>
                  Narrative Mode
                </h5>
                <p className="text-sm ink-subtle leading-relaxed">
                  Plot your characters, arcs, and thematic beats. Answers land as story seeds on the <strong className="ink-strong">Primary Timeline</strong> with lineage IDs ready for promotion.
                </p>
              </div>
              <div className="panel-section p-4 space-y-2">
                <h5 className="font-semibold ink-strong text-base flex items-center gap-2">
                  <span role="img" aria-label="frame">🎬</span>
                  Frame Mode
                </h5>
                <p className="text-sm ink-subtle leading-relaxed">
                  Define camera language, lenses, and motion. Generated shot blocks snap into the Secondary Timeline when a master story is active.
                </p>
              </div>
              <div className="panel-section p-4 space-y-2">
                <h5 className="font-semibold ink-strong text-base flex items-center gap-2">
                  <span role="img" aria-label="style">🖌️</span>
                  Style Mode
                </h5>
                <p className="text-sm ink-subtle leading-relaxed">
                  Craft AI-ready image prompts, sync palettes, and apply pastel style chips across selected shots using the styling timeline controls.
                </p>
              </div>
            </div>
          </div>
        );

      case 'timeline':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-bold ink-strong">Timelines</h3>
              <p className="ink-subtle leading-relaxed">
                Every project flows through layered timelines. Use the pastel tabs above the canvas to hop between Primary seeds, Master assemblies, Styling sweeps, and Director suggestions.
              </p>
            </div>

            <div className="panel-section p-4 space-y-3">
              <h4 className="text-lg font-semibold ink-strong">Primary Timeline (Seed Loop)</h4>
              <ul className="space-y-2 ink-subtle leading-relaxed text-sm list-disc list-inside">
                <li><strong className="ink-strong">Drop:</strong> drag chips from the Asset Library or complete a guided mode.</li>
                <li><strong className="ink-strong">Expand:</strong> click a block to open the chat editor with contextual suggestions.</li>
                <li><strong className="ink-strong">Promote:</strong> use the floating action to lock in a Master asset when it feels right.</li>
              </ul>
            </div>

            <div className="panel-section p-4 space-y-3">
              <h4 className="text-lg font-semibold ink-strong">Secondary Timeline (Master Loop)</h4>
              <ul className="space-y-2 ink-subtle leading-relaxed text-sm list-disc list-inside">
                <li>Generated Masters appear as frosted blocks—non-destructive and lineage-aware.</li>
                <li>Trigger <strong className="ink-strong">Frame Mode</strong> continuations to spawn shot stacks under each story beat.</li>
                <li>Use the end-cap <span className="badge-accent px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.18em]">✂️ Edit</span> button for transition and B-roll suggestions.</li>
              </ul>
            </div>

            <div className="panel-section p-4 space-y-3">
              <h4 className="text-lg font-semibold ink-strong">Styling & Director Timelines</h4>
              <p className="ink-subtle leading-relaxed text-sm">
                Apply global looks via pastel style chips, then review director notes for pacing, texture, and sound. Each adjustment respects seed IDs, so continuity stays intact across loops.
              </p>
            </div>
          </div>
        );

      case 'assets':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-bold ink-strong">Sidebars & Assets</h3>
              <p className="ink-subtle leading-relaxed">
                Loop’s sidebars carry the brand glow—frosted folders on the left, precision controls on the right. Everything you drop into a timeline flows from these panels.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="panel-section p-4 space-y-2">
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span role="img" aria-label="library">🗂️</span>
                  Asset Library
                </h4>
                <p className="text-sm ink-subtle leading-relaxed">
                  Expand folders to reveal draggable chips for Story, Image, and Video inputs. Hover to see pastel halos, then drag directly to any timeline lane.
                </p>
                <ul className="text-sm ink-subtle space-y-1 list-disc list-inside">
                  <li>Primary: characters, arcs, story beats.</li>
                  <li>Secondary: locations, props, sonic cues.</li>
                  <li>Tertiary: transitions, textures, technical specs.</li>
                </ul>
              </div>
              <div className="panel-section p-4 space-y-2">
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span role="img" aria-label="inspector">🧪</span>
                  Inspector & Controls
                </h4>
                <p className="text-sm ink-subtle leading-relaxed">
                  Select any block to open the frosted inspector on the right. Adjust fields with dropdowns, fine-tune weights, or add tags without losing seed lineage.
                </p>
                <p className="text-sm ink-subtle leading-relaxed">
                  The Control deck beneath lets you toggle Tag Weighting, tweak Style Rigidity, and trigger Generate for rapid iterations.
                </p>
              </div>
            </div>

            <div className="panel-section p-4 space-y-2">
              <h4 className="text-lg font-semibold ink-strong">Knowledge Suggestions</h4>
              <p className="text-sm ink-subtle leading-relaxed">
                Keep an eye on the contextual knowledge chips appearing below chat prompts and inside expanded blocks. Apply them to auto-fill fields with studio-grade references sourced from Loop’s knowledge base.
              </p>
            </div>
          </div>
        );

      case 'ai-chat':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-bold ink-strong">AI Studio</h3>
              <p className="ink-subtle leading-relaxed">
                The chat is Loop’s studio brain. Swap themes, stack knowledge suggestions, and let the assistant translate your direction into timeline-ready outputs.
              </p>
            </div>

            <div className="panel-section p-4 space-y-2">
              <h4 className="text-lg font-semibold ink-strong">Studio Features</h4>
              <ul className="space-y-2 ink-subtle leading-relaxed text-sm list-disc list-inside">
                <li><strong className="ink-strong">Theme selector:</strong> shift the interface palette and tone for brainstorming, technical breakdowns, or director notes.</li>
                <li><strong className="ink-strong">Knowledge suggestions:</strong> tap chips to instantly cite references, lighting setups, or narrative frameworks.</li>
                <li><strong className="ink-strong">Mode shortcuts:</strong> Magic Wand toggles Narrative, Frame, and Style modes without leaving the chat.</li>
                <li><strong className="ink-strong">Master iteration:</strong> use the cube icon to remix promoted assets while preserving their seed lineage.</li>
              </ul>
            </div>

            <div className="panel-section p-4 space-y-2">
              <h4 className="text-lg font-semibold ink-strong">Tips for Best Results</h4>
              <ul className="space-y-2 ink-subtle leading-relaxed text-sm list-disc list-inside">
                <li>Reference the timeline block ID you’re refining for precise callbacks.</li>
                <li>Pair cinematic references (directors, lenses, palettes) with knowledge chips for high-fidelity prompts.</li>
                <li>Ask for remix paths—Loop can suggest alternate shots, tones, or edit passes while honoring your master assets.</li>
                <li>Use chat themes to set the tone: playful for ideation, technical for production planning.</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <QuestionMarkCircleIcon className="w-8 h-8" title="User guide" />
            <h2 className="text-2xl font-bold ink-strong">User Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--ink))] transition-colors"
            aria-label="Close user guide"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          <div className="w-64 border-r border-[hsl(var(--border))] p-4 bg-[hsl(var(--card)/0.6)]">
            <nav className="space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all border ${
                    activeTab === tab.id
                      ? 'bg-card ink-strong border-[hsl(var(--ring))] shadow-[0_12px_24px_hsl(var(--primary)/0.25)]'
                      : 'text-[hsl(var(--muted-foreground))] border-transparent hover:bg-[hsl(var(--card)/0.45)] hover:text-[hsl(var(--ink))]'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[hsl(var(--card)/0.35)]">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;

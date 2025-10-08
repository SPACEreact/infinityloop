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
    { id: 'workflow', label: 'Workflow', icon: '🎬' },
    { id: 'timeline', label: 'Timeline System', icon: '🧵' },
    { id: 'assets', label: 'Assets & Tools', icon: '🗂️' },
    { id: 'ai-chat', label: 'AI Assistant', icon: '🤖' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'getting-started':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-bold ink-strong">Welcome to Loop</h3>
              <p className="ink-subtle leading-relaxed">
                Loop is an advanced filmmaking workflow platform that guides you from story conception to final styled outputs. Create, organize, and enhance your cinematic projects with AI-powered assistance and intelligent asset propagation.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="badge-accent px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em]">Multi-Shot Creation</span>
                <span className="badge-accent px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em]">Batch Styling</span>
                <span className="badge-accent px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em]">Timeline Workflow</span>
                <span className="badge-accent px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em]">Smart Asset Flow</span>
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

      case 'workflow':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-bold ink-strong">Complete Filmmaking Workflow</h3>
              <p className="ink-subtle leading-relaxed">
                Loop guides you through a complete filmmaking workflow from initial story concepts to final styled outputs ready for video generation.
              </p>
            </div>

            <div className="space-y-4">
              <div className="panel-section p-4 space-y-2">
                <h5 className="font-semibold ink-strong text-base flex items-center gap-2">
                  <span className="w-6 h-6 bg-yellow-400 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  Scene Creation
                </h5>
                <p className="text-sm ink-subtle leading-relaxed">
                  Drag story and visual assets from the library to build your scene foundation. Create characters, plot points, and visual elements.
                </p>
              </div>

              <div className="panel-section p-4 space-y-2">
                <h5 className="font-semibold ink-strong text-base flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-400 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  Master Asset Generation
                </h5>
                <p className="text-sm ink-subtle leading-relaxed">
                  Generate master story and master visual assets from your scene inputs. These serve as the foundation for multi-shot creation.
                </p>
              </div>

              <div className="panel-section p-4 space-y-2">
                <h5 className="font-semibold ink-strong text-base flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-400 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  Multi-Shot Creation
                </h5>
                <p className="text-sm ink-subtle leading-relaxed">
                  Break down your master story into multiple shots with specific camera angles, movements, and timing. Configure shot types, duration, and cinematographic details.
                </p>
              </div>

              <div className="panel-section p-4 space-y-2">
                <h5 className="font-semibold ink-strong text-base flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-400 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  Batch Style Application
                </h5>
                <p className="text-sm ink-subtle leading-relaxed">
                  Apply your master visual style to all multi-shot sequences in one operation. Create consistent visual styling across all shots.
                </p>
              </div>

              <div className="panel-section p-4 space-y-2">
                <h5 className="font-semibold ink-strong text-base flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-400 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  Final Output
                </h5>
                <p className="text-sm ink-subtle leading-relaxed">
                  Access all final styled outputs through the elegant Output button. Export and manage your production-ready assets.
                </p>
              </div>
            </div>

            <div className="panel-section p-4 space-y-2 bg-gradient-to-r from-blue-50/30 to-purple-50/30">
              <h4 className="font-semibold ink-strong">🎯 Pro Tip</h4>
              <p className="text-sm ink-subtle leading-relaxed">
                Use the AI Assistant's Timeline Workflow feature to get guided help at each step. Click the magic wand icon in the chat to access smart suggestions based on your current progress.
              </p>
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
              <h3 className="text-xl font-bold ink-strong">Four-Timeline System</h3>
              <p className="ink-subtle leading-relaxed">
                Loop uses a sophisticated four-timeline system to organize your filmmaking workflow from initial concepts to final outputs.
              </p>
            </div>

            <div className="space-y-4">
              <div className="panel-section p-4 space-y-3" style={{ backgroundColor: 'rgba(255, 182, 193, 0.1)' }}>
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span className="w-6 h-6 bg-pink-400 text-white rounded-full flex items-center justify-center text-xs">1</span>
                  Scene Timeline
                </h4>
                <p className="text-sm ink-subtle leading-relaxed">
                  The foundation timeline where you build your scenes by dragging story and visual assets from the library. Organize characters, plot points, and visual elements.
                </p>
                <ul className="space-y-1 ink-subtle text-sm list-disc list-inside ml-4">
                  <li>Drag assets from the Asset Library</li>
                  <li>Combine story and visual elements</li>
                  <li>Generate master assets using the Generate buttons</li>
                </ul>
              </div>

              <div className="panel-section p-4 space-y-3" style={{ backgroundColor: 'rgba(230, 230, 250, 0.1)' }}>
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-400 text-white rounded-full flex items-center justify-center text-xs">2</span>
                  Multi-Shot Timeline
                </h4>
                <p className="text-sm ink-subtle leading-relaxed">
                  Break down your master story assets into detailed multi-shot sequences with specific cinematographic parameters.
                </p>
                <ul className="space-y-1 ink-subtle text-sm list-disc list-inside ml-4">
                  <li>Create multi-shot assets from master stories</li>
                  <li>Configure shot types, duration, and camera movement</li>
                  <li>Set lighting styles and cinematographic details</li>
                </ul>
              </div>

              <div className="panel-section p-4 space-y-3" style={{ backgroundColor: 'rgba(152, 251, 152, 0.1)' }}>
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-400 text-white rounded-full flex items-center justify-center text-xs">3</span>
                  Batch Style Timeline
                </h4>
                <p className="text-sm ink-subtle leading-relaxed">
                  Apply consistent visual styling by combining multi-shot sequences with master visual assets in batch operations.
                </p>
                <ul className="space-y-1 ink-subtle text-sm list-disc list-inside ml-4">
                  <li>Select multiple multi-shot assets</li>
                  <li>Choose a master visual style</li>
                  <li>Apply styling to all shots at once</li>
                </ul>
              </div>

              <div className="panel-section p-4 space-y-3" style={{ backgroundColor: 'rgba(255, 218, 185, 0.1)' }}>
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span className="w-6 h-6 bg-orange-400 text-white rounded-full flex items-center justify-center text-xs">4</span>
                  Director's Advice Timeline
                </h4>
                <p className="text-sm ink-subtle leading-relaxed">
                  Receive intelligent suggestions for editing, pacing, transitions, and other directorial decisions.
                </p>
                <ul className="space-y-1 ink-subtle text-sm list-disc list-inside ml-4">
                  <li>Get AI-powered directorial suggestions</li>
                  <li>Review editing and pacing recommendations</li>
                  <li>Accept or dismiss individual suggestions</li>
                </ul>
              </div>
            </div>

            <div className="panel-section p-4 space-y-2 bg-gradient-to-r from-purple-50/30 to-pink-50/30">
              <h4 className="font-semibold ink-strong">🎬 Timeline Navigation</h4>
              <p className="text-sm ink-subtle leading-relaxed">
                Use the colorful timeline tabs to switch between different stages of your workflow. Each timeline builds upon the previous one, creating a natural progression from concept to completion.
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
                  The Control deck beneath lets you toggle Style Weighting, tweak Style Rigidity, and trigger Generate for rapid iterations.
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
              <h3 className="text-xl font-bold ink-strong">AI Assistant & Smart Features</h3>
              <p className="ink-subtle leading-relaxed">
                Loop's AI assistant provides intelligent guidance throughout your filmmaking workflow with specialized tools and contextual awareness.
              </p>
            </div>

            <div className="space-y-4">
              <div className="panel-section p-4 space-y-2">
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span role="img" aria-label="workflow">🌊</span>
                  Timeline Workflow Assistant
                </h4>
                <p className="text-sm ink-subtle leading-relaxed">
                  Get step-by-step guidance through the complete filmmaking workflow. The assistant tracks your progress and provides contextual suggestions.
                </p>
                <ul className="space-y-1 ink-subtle text-sm list-disc list-inside ml-4">
                  <li>Click the magic wand icon to start timeline workflow</li>
                  <li>Progress tracking through story → visual → multi-shot → batch style</li>
                  <li>Smart suggestions based on current assets</li>
                </ul>
              </div>

              <div className="panel-section p-4 space-y-2">
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span role="img" aria-label="iterate">🔄</span>
                  Master Asset Iteration
                </h4>
                <p className="text-sm ink-subtle leading-relaxed">
                  Refine and improve your master story and visual assets with guided iteration prompts.
                </p>
                <ul className="space-y-1 ink-subtle text-sm list-disc list-inside ml-4">
                  <li>Select master assets to iterate on</li>
                  <li>Provide specific improvement requests</li>
                  <li>Maintain asset lineage and connections</li>
                </ul>
              </div>

              <div className="panel-section p-4 space-y-2">
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span role="img" aria-label="shots">🎬</span>
                  Shot Creation & Multi-Shot Tools
                </h4>
                <p className="text-sm ink-subtle leading-relaxed">
                  Create detailed cinematographic breakdowns from your story assets with intelligent shot planning.
                </p>
                <ul className="space-y-1 ink-subtle text-sm list-disc list-inside ml-4">
                  <li>Generate multiple shots from master stories</li>
                  <li>Configure camera angles, movements, and timing</li>
                  <li>Apply cinematographic expertise automatically</li>
                </ul>
              </div>

              <div className="panel-section p-4 space-y-2">
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span role="img" aria-label="knowledge">🧠</span>
                  Knowledge Base Integration
                </h4>
                <p className="text-sm ink-subtle leading-relaxed">
                  Access built-in filmmaking knowledge including story structures, camera techniques, and industry best practices.
                </p>
                <ul className="space-y-1 ink-subtle text-sm list-disc list-inside ml-4">
                  <li>Filmmaking terminology and techniques</li>
                  <li>Story structure and character development</li>
                  <li>Cinematography and visual storytelling</li>
                </ul>
              </div>

              <div className="panel-section p-4 space-y-2">
                <h4 className="text-lg font-semibold ink-strong flex items-center gap-2">
                  <span role="img" aria-label="build">🏗️</span>
                  Guided Build Modes
                </h4>
                <p className="text-sm ink-subtle leading-relaxed">
                  Use structured questionnaires to build comprehensive story and visual assets with professional depth.
                </p>
                <ul className="space-y-1 ink-subtle text-sm list-disc list-inside ml-4">
                  <li>StoryBuild: Complete narrative development</li>
                  <li>ShotBuild: Detailed cinematography planning</li>
                  <li>Step-by-step guided creation process</li>
                </ul>
              </div>
            </div>

            <div className="panel-section p-4 space-y-2 bg-gradient-to-r from-blue-50/30 to-green-50/30">
              <h4 className="font-semibold ink-strong">💡 Smart Features</h4>
              <ul className="space-y-1 ink-subtle text-sm list-disc list-inside">
                <li>Context-aware suggestions based on your current workflow stage</li>
                <li>Automatic tag suggestions and conflict detection</li>
                <li>Asset relationship tracking and lineage management</li>
                <li>Smart content formatting for different AI models</li>
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

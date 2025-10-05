import React, { useState } from 'react';
import { ASSET_TEMPLATES } from '../constants';

export function AssetLibraryPanel({ 
  onAddAsset
}: { 
  onAddAsset: (templateType: string, folder?: string) => void;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    story: true,
    visual: true
  });

  const handleMouseEnter = (folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: true }));
  };

  const handleMouseLeave = (folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: false }));
  };

  const groupedTemplates = Object.values(ASSET_TEMPLATES).reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, typeof ASSET_TEMPLATES[keyof typeof ASSET_TEMPLATES][]>);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, templateType: string) => {
    e.dataTransfer.setData('text/plain', templateType);
  };

  const getAssetCardColor = (templateType: string) => {
    const template = ASSET_TEMPLATES[templateType];
    if (template?.category === 'story') {
      return '#FFFACD'; // muted warm yellow
    } else if (template?.category === 'visual') {
      return '#E0F6FF'; // muted cool blue
    }
    return undefined;
  };

  return (
    <aside className="glass-card h-full w-full p-4 flex flex-col overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between px-2 mb-4">
        <h1 className="text-xl font-bold ink-strong">Library</h1>
      </div>
      <div className="space-y-4">
        {Object.keys(groupedTemplates).map(folder => (
          <div key={folder} className="space-y-2">
            <div
              onClick={() => setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }))}
              className="w-full text-left font-medium folder-toggle cursor-pointer"
            >
              {folder.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              <span className="float-right transition-transform duration-200">
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${expandedFolders[folder] ? 'rotate-0' : '-rotate-90'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
            {expandedFolders[folder] && (
              <div className="space-y-1 ml-4">
                {groupedTemplates[folder].map(template => (
                  <div
                    key={template.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, template.type)}
                    className="p-2 asset-card cursor-move group"
                    style={{ backgroundColor: getAssetCardColor(template.type) }}
                  >
                    <div className="font-medium ink-strong">{template.name}</div>
                    <div className="overflow-hidden max-h-0 group-hover:max-h-96 opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs">
                      <div className="mt-2">
                        <div className="mb-1">{template.description}</div>
                        <div className="flex flex-wrap gap-1">
                          {template.tags?.map((tag) => (
                            <span key={tag} className="badge-accent px-1 py-0.5 text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

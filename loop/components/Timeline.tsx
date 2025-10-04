import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Project, Track, Layer, TimelineItem } from '../types';

interface TimelineProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  selectedNodeId: string | null;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedConnectionId: string | null;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  onAssetDrop: (assetId: string, trackId: string, startTime: number, layerId?: string) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  project,
  setProject,
  selectedNodeId,
  setSelectedNodeId,
  selectedConnectionId,
  setSelectedConnectionId,
  onAssetDrop
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ itemId: string; startX: number; startTime: number; startDuration: number; trackId: string; layerId?: string } | null>(null);

  // Extract data from project
  const tracks = project.tracks || [];
  const timelineItems = project.timelineItems || [];
  const assets = project.assets;

  const handleItemMove = (itemId: string, newStartTime: number, newTrackId: string, newLayerId?: string) => {
    setProject(prev => ({
      ...prev,
      timelineItems: prev.timelineItems ? prev.timelineItems.map((item: TimelineItem) =>
        item.id === itemId
          ? { ...item, startTime: newStartTime, trackId: newTrackId, layerId: newLayerId }
          : item
      ) : [],
      updatedAt: new Date()
    }));
  };

  const handleItemResize = (itemId: string, newDuration: number) => {
    setProject(prev => ({
      ...prev,
      timelineItems: prev.timelineItems ? prev.timelineItems.map((item: TimelineItem) =>
        item.id === itemId ? { ...item, duration: newDuration } : item
      ) : [],
      updatedAt: new Date()
    }));
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
  };

  // Handle drop on timeline layer
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, trackId: string, layerId?: string) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('text/plain');
    if (!assetId) return;

    // Calculate start time based on drop position
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const startTime = Math.max(0, x / 10); // 10px per second

    onAssetDrop(assetId, trackId, startTime, layerId);
  }, [onAssetDrop]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Allow drop
  }, []);

  // Helper to get asset by id
  const getAssetById = (id: string) => assets.find(a => a.id === id);

  // Global mouse event handlers for drag and resize
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) {
        e.preventDefault();
        const deltaX = e.clientX - dragRef.current.startX;
        const deltaSeconds = deltaX / 10; // 10px per second
        const newStartTime = Math.max(0, dragRef.current.startTime + deltaSeconds);
        handleItemMove(dragRef.current.itemId, newStartTime, dragRef.current.trackId, dragRef.current.layerId);
      } else if (isResizing && dragRef.current) {
        e.preventDefault();
        const deltaX = e.clientX - dragRef.current.startX;
        const deltaSeconds = deltaX / 10; // 10px per second
        const newDuration = Math.max(0.1, dragRef.current.startDuration + deltaSeconds);
        handleItemResize(dragRef.current.itemId, newDuration);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      dragRef.current = null;
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, handleItemMove, handleItemResize]);

  // Render timeline items for a track or layer
  const renderItems = (trackId: string, layerId?: string) => {
    return timelineItems
      .filter(item => item.trackId === trackId && item.layerId === layerId)
      .map(item => {
        const asset = getAssetById(item.assetId);
        if (!asset) return null;

        // Calculate item style based on startTime and duration (assuming 1 second = 10px for example)
        const left = item.startTime * 10;
        const width = item.duration * 10;

        const isSelected = selectedItemId === item.id;

        const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
          e.stopPropagation();
          setSelectedItemId(item.id);
          setSelectedNodeId(null);
          setSelectedConnectionId(null);
          setIsDragging(true);
          dragRef.current = { itemId: item.id, startX: e.clientX, startTime: item.startTime, startDuration: item.duration, trackId, layerId };
        };

        const onResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
          e.stopPropagation();
          setIsResizing(true);
          dragRef.current = { itemId: item.id, startX: e.clientX, startTime: item.startTime, startDuration: item.duration, trackId, layerId };
        };

        return (
          <div
            key={item.id}
            className={`timeline-item ${isSelected ? 'selected' : ''}`}
            style={{
              position: 'absolute',
              left,
              width,
              top: 2,
              height: 'calc(100% - 4px)',
              backgroundColor: isSelected ? '#6366f1' : '#4b5563',
              borderRadius: 4,
              cursor: 'pointer',
              color: 'white',
              padding: '2px 6px',
              boxSizing: 'border-box',
              userSelect: 'none',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
            onClick={() => handleItemSelect(item.id)}
            onMouseDown={onMouseDown}
            title={asset.name}
          >
            <span>{asset.name}</span>
            <div
              style={{
                width: 8,
                height: '100%',
                cursor: 'ew-resize',
                backgroundColor: isSelected ? '#4f46e5' : '#6b7280',
                borderRadius: '0 4px 4px 0'
              }}
              onMouseDown={onResizeMouseDown}
            />
          </div>
        );
      });
  };

  return (
    <div className="timeline-container" style={{ overflowX: 'auto', whiteSpace: 'nowrap', position: 'relative', height: '300px', backgroundColor: '#1f2937', padding: '10px' }}>
      {tracks.map((track: Track) => (
        <div key={track.id} className="timeline-track" style={{ position: 'relative', height: track.layers ? track.layers.length * 40 : 40, marginBottom: 10, borderBottom: '1px solid #374151' }}>
          <div className="track-name" style={{ color: '#9ca3af', fontWeight: 'bold', marginBottom: 4 }}>
            {track.name}
          </div>
          {track.layers ? (
            track.layers.map((layer: Layer) => (
              <div
                key={layer.id}
                className="timeline-layer"
                style={{ position: 'relative', height: 36, marginBottom: 4, backgroundColor: '#374151', borderRadius: 4 }}
                onDrop={(e) => handleDrop(e, track.id, layer.id)}
                onDragOver={handleDragOver}
              >
                <div className="layer-name" style={{ position: 'absolute', left: 4, top: 8, color: '#d1d5db', fontSize: 12, fontWeight: '600' }}>
                  {layer.name}
                </div>
                {renderItems(track.id, layer.id)}
              </div>
            ))
          ) : (
            <div
              className="timeline-layer"
              style={{ position: 'relative', height: 36, backgroundColor: '#374151', borderRadius: 4 }}
              onDrop={(e) => handleDrop(e, track.id)}
              onDragOver={handleDragOver}
            >
              {renderItems(track.id)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Timeline;

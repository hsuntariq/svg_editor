import React from 'react';
import { MousePointer2, Square, Circle, Pen, Type, ZoomIn, ZoomOut, Upload, Download, Undo2, Redo2, Ruler, Scissors, WineIcon as LineIcon, PenTool } from 'lucide-react';
import type { Tool } from '../types';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUpload: () => void;
  onExport: (format: 'svg' | 'dxf' | 'pdf' | 'png') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  showMeasurements: boolean;
  onToggleMeasurements: () => void;
}

const tools = [
  { id: 'select' as Tool, icon: MousePointer2, label: 'Select' },
  { id: 'rect' as Tool, icon: Square, label: 'Rectangle' },
  { id: 'ellipse' as Tool, icon: Circle, label: 'Ellipse' },
  { id: 'line' as Tool, icon: LineIcon, label: 'Line' },
  { id: 'curve' as Tool, icon: PenTool, label: 'Curve' },
  { id: 'pen' as Tool, icon: Pen, label: 'Pen' },
  { id: 'cut' as Tool, icon: Scissors, label: 'Cut' },
  { id: 'text' as Tool, icon: Type, label: 'Text' },
];

export function Toolbar({ 
  activeTool, 
  onToolChange,
  onZoomIn,
  onZoomOut,
  onUpload,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showMeasurements,
  onToggleMeasurements
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-2 overflow-y-scroll bg-gray-800 p-2">
      <div className="flex flex-col gap-2 border-b border-gray-700 pb-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              className={`p-2 rounded hover:bg-gray-700 ${
                activeTool === tool.id ? 'bg-gray-700' : ''
              }`}
              onClick={() => onToolChange(tool.id)}
              title={tool.label}
            >
              <Icon className="w-6 h-6 text-white" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-b border-gray-700 py-2">
        <button
          className="p-2 rounded hover:bg-gray-700"
          onClick={onZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="w-6 h-6 text-white" />
        </button>
        <button
          className="p-2 rounded hover:bg-gray-700"
          onClick={onZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="flex flex-col gap-2 border-b border-gray-700 py-2">
        <button
          className="p-2 rounded hover:bg-gray-700"
          onClick={onUpload}
          title="Upload SVG"
        >
          <Upload className="w-6 h-6 text-white" />
        </button>
        <button
          className="p-2 rounded hover:bg-gray-700"
          onClick={() => onExport('svg')}
          title="Export SVG"
        >
          <Download className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="flex flex-col gap-2 border-b border-gray-700 py-2">
        <button
          className={`p-2 rounded hover:bg-gray-700 ${!canUndo && 'opacity-50 cursor-not-allowed'}`}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <Undo2 className="w-6 h-6 text-white" />
        </button>
        <button
          className={`p-2 rounded hover:bg-gray-700 ${!canRedo && 'opacity-50 cursor-not-allowed'}`}
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo2 className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <button
          className={`p-2 rounded hover:bg-gray-700 ${showMeasurements ? 'bg-gray-700' : ''}`}
          onClick={onToggleMeasurements}
          title="Toggle Measurements"
        >
          <Ruler className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}
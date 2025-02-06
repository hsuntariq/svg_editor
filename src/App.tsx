import React, { useState, useRef } from 'react';
import { Toolbar } from './components/Toolbar';
import { Properties } from './components/Properties';
import { Canvas } from './components/Canvas';
import { FileConverter } from './utils/FileConverter';
import { SplitDialog } from './components/SplitDialog';
import { splitShape } from './utils/shapeOperations';
import type { Tool, Element, HistoryState } from './types';

function App() {
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [history, setHistory] = useState<HistoryState[]>([{ elements: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // History management
  const addToHistory = (newElements: Element[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ elements: newElements });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1].elements);
      setSelectedElement(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1].elements);
      setSelectedElement(null);
    }
  };

  // Element management
  const handleElementsChange = (newElements: Element[]) => {
    setElements(newElements);
    addToHistory(newElements);
  };

  const handleElementUpdate = (updatedElement: Element) => {
    const newElements = elements.map(el =>
      el.id === updatedElement.id ? updatedElement : el
    );
    handleElementsChange(newElements);
    setSelectedElement(updatedElement); // Keep the element selected after update
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.1));

  // File operations
  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(e.target?.result as string, 'image/svg+xml');
          const svgElements = svgDoc.querySelectorAll('rect, ellipse, path, text');
          
          const newElements: Element[] = Array.from(svgElements).map((el) => {
            const attributes: { [key: string]: string } = {};
            Array.from(el.attributes).forEach((attr) => {
              attributes[attr.name] = attr.value;
            });

            return {
              id: Date.now().toString() + Math.random(),
              type: el.tagName.toLowerCase() as 'rect' | 'ellipse' | 'path' | 'text',
              attributes: {
                ...attributes,
                fill: attributes.fill || 'none',
                stroke: attributes.stroke || '#000',
                strokeWidth: attributes.strokeWidth || '2'
              }
            };
          });

          handleElementsChange([...elements, ...newElements]);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExport = async (format: 'svg' | 'dxf' | 'pdf' | 'png') => {
    if (!svgRef.current) return;

    switch (format) {
      case 'svg': {
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drawing.svg';
        a.click();
        URL.revokeObjectURL(url);
        break;
      }
      case 'png': {
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          const a = document.createElement('a');
          a.href = canvas.toDataURL('image/png');
          a.download = 'drawing.png';
          a.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        break;
      }
      // DXF and PDF export to be implemented
    }
  };

  // Shape splitting
  const handleSplitShape = () => {
    setShowSplitDialog(true);
  };

  const handleSplitConfirm = (splitPoint: number, isVertical: boolean) => {
    if (!selectedElement) return;

    const newShapes = splitShape(selectedElement, splitPoint, isVertical);
    const newElements = elements.filter(el => el.id !== selectedElement.id).concat(newShapes);
    
    handleElementsChange(newElements);
    setSelectedElement(null);
    setShowSplitDialog(false);
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white ">
      <div className="p-5 flex flex-col items-center bg-[#0f0f0f]">
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onUpload={handleUpload}
        onExport={handleExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        showMeasurements={showMeasurements}
        onToggleMeasurements={() => setShowMeasurements(!showMeasurements)}
        />
        <div className="grid my-3 grid-cols-3 gap-2">
          <div className="size bg-gray-800 text-center rounded-md" data-size="HS">HS</div>
                <div className="size bg-gray-800 text-center rounded-md" data-size="S">S</div>
                <div className="size bg-gray-800 text-center rounded-md" data-size="L">L</div>
                <div className="size bg-gray-800 text-center rounded-md" data-size="HL">HL</div>
                <div className="size bg-gray-800 text-center rounded-md" data-size="2XL">2XL</div>
                <div className="size bg-gray-800 text-center rounded-md" data-size="3XL">3XL</div>
        </div>
        </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-gray-800 flex justify-between items-center">
          <h1 className="text-xl font-bold">SVG Editor</h1>
          <FileConverter onExport={handleExport} />
        </div>

        <div className="flex-1 flex bg-gray-900 p-5">
          <Canvas
            ref={svgRef}
            activeTool={activeTool}
            elements={elements}
            onElementsChange={handleElementsChange}
            onElementSelect={setSelectedElement}
            selectedElement={selectedElement}
            zoom={zoom}
            showMeasurements={showMeasurements}
          />

          <Properties
            selectedElement={selectedElement}
            onElementUpdate={handleElementUpdate}
            onSplitShape={handleSplitShape}
          />
        </div>
      </div>

      {showSplitDialog && (
        <SplitDialog
          onSplit={handleSplitConfirm}
          onClose={() => setShowSplitDialog(false)}
        />
      )}
    </div>
  );
}

export default App;
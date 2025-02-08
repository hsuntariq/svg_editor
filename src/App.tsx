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
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Size classification based on dimensions
  const getSizeCategory = (element: Element): string => {
    if (element.type === 'rect' || element.type === 'path') {
      const width = parseFloat(element.attributes.width || '0');
      const height = parseFloat(element.attributes.height || '0');
      const area = width * height;

      if (area < 1000) return 'HS';
      if (area < 5000) return 'S';
      if (area < 10000) return 'L';
      if (area < 20000) return 'HL';
      if (area < 30000) return '2XL';
      return '3XL';
    } else if (element.type === 'ellipse') {
      const rx = parseFloat(element.attributes.rx || '0');
      const ry = parseFloat(element.attributes.ry || '0');
      const area = Math.PI * rx * ry;

      if (area < 1000) return 'HS';
      if (area < 5000) return 'S';
      if (area < 10000) return 'L';
      if (area < 20000) return 'HL';
      if (area < 30000) return '2XL';
      return '3XL';
    }
    return 'S'; // Default size for other shapes
  };

  // Filter elements based on selected size
  const filteredElements = activeSize
    ? elements.filter(element => getSizeCategory(element) === activeSize)
    : elements;

  // Handle size button click
  const handleSizeClick = (size: string) => {
    setActiveSize(activeSize === size ? null : size);
  };

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
    setSelectedElement(updatedElement);
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

  const sizes = ['All', 'HS', 'S', 'L', 'HL', '2XL', '3XL'];

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white">
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
          {sizes.map(size => (
            <button
              key={size}
              className={`size p-2 text-center rounded-md transition-colors ${
                activeSize === size 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              onClick={() => handleSizeClick(size === 'All' ? null : size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex h-screen">
          <div className="flex-1 flex bg-[#0f0f0f] p-5">
            <Canvas
              ref={svgRef}
              activeTool={activeTool}
              elements={filteredElements}
              onElementsChange={handleElementsChange}
              onElementSelect={setSelectedElement}
              selectedElement={selectedElement}
              zoom={zoom}
              showMeasurements={showMeasurements}
            />
          </div>
          <div className="h-screen bg-[#0f0f0f]">
          <Properties
            selectedElement={selectedElement}
            onElementUpdate={handleElementUpdate}
            onSplitShape={handleSplitShape}
          />
          </div>
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